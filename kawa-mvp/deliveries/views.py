from datetime import timedelta
from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import CursorPagination
from rest_framework.response import Response
from rest_framework.serializers import BaseSerializer

from .models import Delivery, ExportLot, Farmer, Plot, PriceSchedule
from .serializers import (
    DeliverySerializer,
    ExportLotSerializer,
    FarmerSerializer,
    PlotSerializer,
    PriceScheduleSerializer,
    TraceabilitySerializer,
)
from .tasks import check_plot_risk

# A plot still "pending" after this long is surfaced for manual follow-up
# (see ADR-001: unresolved checks do not block deliveries, they get flagged
# to a human instead).
STALE_PENDING_HOURS = 4


# ---------- Farmers ----------

class FarmerListCreateView(generics.ListCreateAPIView):
    queryset = Farmer.objects.all()
    serializer_class = FarmerSerializer


class FarmerDetailView(generics.RetrieveAPIView):
    queryset = Farmer.objects.all()
    serializer_class = FarmerSerializer


# ---------- Plots ----------

class PlotListCreateView(generics.ListCreateAPIView):
    """
    GET/POST /api/v1/plots
    GET/POST /api/v1/farmers/{farmer_id}/plots

    On the nested route, farmer_id comes from the URL: it scopes the listing
    and is injected into the payload on create.

    Supported filters on GET:
      ?risk_status=pending|clear|flagged
      ?stale=true   (risk_status still pending after STALE_PENDING_HOURS)
    """
    serializer_class = PlotSerializer

    def get_queryset(self) -> QuerySet[Plot]:
        qs = Plot.objects.select_related("farmer", "station").all()

        farmer_id = self.kwargs.get("pk")
        if farmer_id:
            qs = qs.filter(farmer_id=farmer_id)

        risk_status = self.request.query_params.get("risk_status")
        if risk_status:
            qs = qs.filter(risk_status=risk_status)

        if self.request.query_params.get("stale", "").lower() == "true":
            cutoff = timezone.now() - timedelta(hours=STALE_PENDING_HOURS)
            qs = qs.filter(risk_status=Plot.RiskStatus.PENDING, created_at__lt=cutoff)

        return qs

    def perform_create(self, serializer: BaseSerializer) -> None:
        plot = serializer.save()
        # Queue the async risk check (ADR-001): non-blocking, the request
        # returns immediately while the worker calls the slow registry.
        check_plot_risk.delay(str(plot.id))

    def create(self, request: HttpRequest, *args: Any, **kwargs: Any) -> Response:
        # Nested route /farmers/{id}/plots: inject the farmer id before
        # validation, since the serializer requires `farmer`.
        farmer_id = self.kwargs.get("pk")
        data = request.data.copy()
        if farmer_id:
            data["farmer"] = str(farmer_id)

        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class PlotDetailView(generics.RetrieveAPIView):
    queryset = Plot.objects.select_related("farmer", "station").all()
    serializer_class = PlotSerializer


# ---------- Deliveries ----------

class DeliveryCreateView(generics.CreateAPIView):
    """
    POST /api/v1/deliveries

    Idempotent: the client sends an `idempotency_key` (a UUID it generates
    once per logical submission). If a delivery with that key already
    exists, the existing delivery is returned (200) instead of creating a
    duplicate. This protects a farmer from being double-recorded when a 2G
    retry resends the same request.
    """
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer

    def create(self, request: HttpRequest, *args: Any, **kwargs: Any) -> Response:
        key = request.data.get("idempotency_key")
        if key:
            existing = Delivery.objects.filter(idempotency_key=key).first()
            if existing:
                serializer = self.get_serializer(existing)
                return Response(serializer.data, status=status.HTTP_200_OK)

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data, status=status.HTTP_201_CREATED, headers=headers
        )


class DeliveryDetailView(generics.RetrieveAPIView):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer


class DeliveryFeedPagination(CursorPagination):
    """
    Cursor pagination, not offset pagination: a deliberate choice for the
    station feed. Offset pagination re-scans skipped rows on every page,
    which gets slower as the day's delivery count grows. Cursor pagination
    stays fast page after page, and it stays consistent while new deliveries
    keep arriving, which matters at harvest peak on a slow connection.
    """
    page_size = 25
    ordering = "-created_at"


class StationDeliveryFeedView(generics.ListAPIView):
    """
    GET /api/v1/stations/{station_id}/deliveries

    The station-facing feed: what the field agent sees at the washing
    station. Small pages, newest first, so a just-recorded delivery is at
    the top without paging through the whole day.
    """
    serializer_class = DeliverySerializer
    pagination_class = DeliveryFeedPagination

    def get_queryset(self) -> QuerySet[Delivery]:
        return Delivery.objects.filter(
            station_id=self.kwargs["station_id"]
        ).select_related("farmer", "plot")


# ---------- Price schedule ----------

class PriceScheduleListView(generics.ListAPIView):
    """GET /api/price-schedule/ (required by the F1 contract).

    Left uncached on purpose: the assessed performance feature for this
    MVP is the paginated station feed (see ADR-001)."""
    queryset = PriceSchedule.objects.all()
    serializer_class = PriceScheduleSerializer


# ---------- Export lots & traceability ----------

class ExportLotListCreateView(generics.ListCreateAPIView):
    queryset = ExportLot.objects.all()
    serializer_class = ExportLotSerializer


class ExportLotTraceabilityView(generics.RetrieveAPIView):
    """GET /api/v1/export-lots/{id}/traceability

    lot -> deliveries -> plots -> farmers, without exposing plot
    coordinates (sector only)."""
    queryset = ExportLot.objects.all()
    serializer_class = TraceabilitySerializer