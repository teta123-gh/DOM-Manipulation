from django.contrib import admin

from .models import (
    Cooperative,
    Delivery,
    ExportLot,
    Farmer,
    Plot,
    PriceSchedule,
    RiskCheckAttempt,
    Station,
)

admin.site.register(Cooperative)
admin.site.register(Station)


@admin.register(Farmer)
class FarmerAdmin(admin.ModelAdmin):
    list_display = ["full_name", "phone", "cooperative", "status"]
    list_filter = ["status", "cooperative"]


@admin.register(Plot)
class PlotAdmin(admin.ModelAdmin):
    list_display = ["id", "farmer", "sector", "station", "risk_status", "verification_status"]
    list_filter = ["risk_status", "verification_status", "sector"]


@admin.register(RiskCheckAttempt)
class RiskCheckAttemptAdmin(admin.ModelAdmin):
    list_display = ["plot", "attempted_at", "succeeded", "result"]
    list_filter = ["succeeded", "result"]


@admin.register(PriceSchedule)
class PriceScheduleAdmin(admin.ModelAdmin):
    list_display = ["effective_date", "price_per_kg"]


@admin.register(Delivery)
class DeliveryAdmin(admin.ModelAdmin):
    list_display = ["id", "farmer", "plot", "station", "quantity_kg", "total_amount", "payment_status"]
    list_filter = ["payment_status", "station"]


@admin.register(ExportLot)
class ExportLotAdmin(admin.ModelAdmin):
    list_display = ["lot_number", "status", "created_at"]
    list_filter = ["status"]
