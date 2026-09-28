from django.urls import path
from .views import FarmerListCreateView

urlpatterns = [
    path("farmers/", FarmerListCreateView.as_view(), name="f1-farmer-list-create"),
]