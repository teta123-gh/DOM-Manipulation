from django.urls import path
from .views import DeliveryListCreateView

urlpatterns = [
    path("deliveries/", DeliveryListCreateView.as_view(), name="f1-delivery-list-create"),
]