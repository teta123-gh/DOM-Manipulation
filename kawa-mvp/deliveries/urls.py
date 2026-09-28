from django.urls import path

from . import views

urlpatterns = [
    # Farmers
    path("v1/farmers", views.FarmerListCreateView.as_view(), name="farmer-list-create"),
    path("v1/farmers/<uuid:pk>", views.FarmerDetailView.as_view(), name="farmer-detail"),

    # Plots
    path(
        "v1/farmers/<uuid:pk>/plots",
        views.PlotListCreateView.as_view(),
        name="plot-list-create-for-farmer",
    ),
    path("v1/plots", views.PlotListCreateView.as_view(), name="plot-list"),
    path("v1/plots/<uuid:pk>", views.PlotDetailView.as_view(), name="plot-detail"),

    # Deliveries
    path("v1/deliveries", views.DeliveryCreateView.as_view(), name="delivery-create"),
    path(
        "v1/deliveries/<uuid:pk>",
        views.DeliveryDetailView.as_view(),
        name="delivery-detail",
    ),
    path(
        "v1/stations/<uuid:station_id>/deliveries",
        views.StationDeliveryFeedView.as_view(),
        name="station-delivery-feed",
    ),

    # Price schedule — required regardless of performance feature chosen.
    path(
        "price-schedule/",
        views.PriceScheduleListView.as_view(),
        name="price-schedule-list",
    ),

    # Export lots
    path(
        "v1/export-lots",
        views.ExportLotListCreateView.as_view(),
        name="export-lot-list-create",
    ),
    path(
        "v1/export-lots/<uuid:pk>/traceability",
        views.ExportLotTraceabilityView.as_view(),
        name="export-lot-traceability",
    ),
]
