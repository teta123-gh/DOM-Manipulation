from decimal import Decimal
from typing import Any

from django.utils import timezone
from rest_framework import serializers

from .models import Delivery, ExportLot, Farmer, Plot, PriceSchedule, Station


class PriceScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriceSchedule
        fields = ["id", "effective_date", "price_per_kg"]


class FarmerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Farmer
        fields = ["id", "full_name", "phone", "cooperative", "status", "created_at"]
        read_only_fields = ["id", "created_at"]


class PlotSerializer(serializers.ModelSerializer):
    class Meta:
        model = Plot
        fields = [
            "id", "farmer", "sector", "station", "latitude", "longitude",
            "area_hectares", "verification_status", "risk_status",
            "risk_checked_at", "created_at",
        ]
        read_only_fields = [
            "id", "verification_status", "risk_status", "risk_checked_at",
            "created_at",
        ]

    def validate_farmer(self, farmer: Farmer) -> Farmer:
        if farmer.status != Farmer.Status.ACTIVE:
            raise serializers.ValidationError(
                "Cannot register a plot for an inactive farmer.",
                code="farmer_inactive",
            )
        return farmer

    def validate_latitude(self, value: Decimal) -> Decimal:
        if not (-90 <= value <= 90):
            raise serializers.ValidationError("Latitude must be between -90 and 90.")
        return value

    def validate_longitude(self, value: Decimal) -> Decimal:
        if not (-180 <= value <= 180):
            raise serializers.ValidationError(
                "Longitude must be between -180 and 180."
            )
        return value


class DeliverySerializer(serializers.ModelSerializer):
    class Meta:
        model = Delivery
        fields = [
            "id", "farmer", "plot", "station", "quantity_kg", "price_schedule",
            "price_per_kg", "total_amount", "payment_status", "idempotency_key",
            "recorded_by", "created_at",
        ]
        read_only_fields = [
            "id", "price_schedule", "price_per_kg", "total_amount",
            "payment_status", "created_at",
        ]

    def validate_quantity_kg(self, value: Decimal) -> Decimal:
        if value <= 0:
            raise serializers.ValidationError(
                "quantity_kg must be strictly greater than 0.",
                code="invalid_quantity",
            )
        return value

    def validate(self, attrs: dict[str, Any]) -> dict[str, Any]:
        farmer = attrs.get("farmer")
        plot = attrs.get("plot")

        # Business rule: the plot must actually belong to the delivering farmer.
        if plot and farmer and plot.farmer_id != farmer.id:
            raise serializers.ValidationError(
                {
                    "error": {
                        "code": "INVALID_PLOT",
                        "message": "The plot does not belong to this farmer.",
                    }
                }
            )

        # Business rule (regulatory/commercial): a flagged plot cannot deliver.
        if plot and plot.risk_status == Plot.RiskStatus.FLAGGED:
            raise serializers.ValidationError(
                {
                    "error": {
                        "code": "PLOT_FLAGGED",
                        "message": (
                            "This plot is flagged by the risk registry and "
                            "cannot record new deliveries."
                        ),
                    }
                }
            )

        # Business rule: farmer must be active.
        if farmer and farmer.status != Farmer.Status.ACTIVE:
            raise serializers.ValidationError(
                {
                    "error": {
                        "code": "FARMER_INACTIVE",
                        "message": "Inactive farmers cannot make deliveries.",
                    }
                }
            )

        return attrs

    def create(self, validated_data: dict[str, Any]) -> Delivery:
        # Idempotency: if a delivery with this key already exists, return it
        # instead of creating a duplicate. Handled in the view (needs a
        # pre-save lookup) — see DeliveryCreateView.
        schedule = (
            PriceSchedule.objects.filter(
                effective_date__lte=timezone.now().date()
            )
            .order_by("-effective_date")
            .first()
        )
        if schedule is None:
            raise serializers.ValidationError(
                {
                    "error": {
                        "code": "NO_PRICE_SCHEDULE",
                        "message": "No active price schedule for today's date.",
                    }
                }
            )

        quantity = validated_data["quantity_kg"]
        validated_data["price_schedule"] = schedule
        validated_data["price_per_kg"] = schedule.price_per_kg
        validated_data["total_amount"] = quantity * schedule.price_per_kg
        return super().create(validated_data)


class ExportLotSerializer(serializers.ModelSerializer):
    class Meta:
        model = ExportLot
        fields = ["id", "lot_number", "deliveries", "status", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_deliveries(self, deliveries: list[Delivery]) -> list[Delivery]:
        for delivery in deliveries:
            if delivery.plot.risk_status == Plot.RiskStatus.FLAGGED:
                raise serializers.ValidationError(
                    {
                        "error": {
                            "code": "PLOT_FLAGGED",
                            "message": (
                                f"Delivery {delivery.id} is from a flagged "
                                "plot and cannot be added to an export lot."
                            ),
                        }
                    }
                )
            if delivery.plot.verification_status != Plot.VerificationStatus.VERIFIED:
                raise serializers.ValidationError(
                    {
                        "error": {
                            "code": "PLOT_NOT_VERIFIED",
                            "message": (
                                f"Delivery {delivery.id} is from an unverified "
                                "plot and cannot be added to an export lot."
                            ),
                        }
                    }
                )
        return deliveries


class TraceabilitySerializer(serializers.ModelSerializer):
    """Read-only view: export lot -> deliveries -> plots -> farmers.
    This answers Task 2's traceability requirement directly."""

    deliveries = serializers.SerializerMethodField()

    class Meta:
        model = ExportLot
        fields = ["id", "lot_number", "status", "deliveries"]

    def get_deliveries(self, obj: ExportLot) -> list[dict[str, Any]]:
        return [
            {
                "delivery_id": d.id,
                "quantity_kg": d.quantity_kg,
                "farmer_id": d.farmer_id,
                "farmer_name": d.farmer.full_name,
                "plot_id": d.plot_id,
                "plot_sector": d.plot.sector,
                "plot_risk_status": d.plot.risk_status,
                "plot_verification_status": d.plot.verification_status,
            }
            for d in obj.deliveries.select_related("farmer", "plot").all()
        ]
