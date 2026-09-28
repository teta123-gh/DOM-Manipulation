from django.urls import path
from .views import StatusView, PriceScheduleView

urlpatterns = [
    path("status/", StatusView.as_view(), name="f1-status"),
    path("f1-price-schedule/", PriceScheduleView.as_view(), name="f1-price-schedule"),
]