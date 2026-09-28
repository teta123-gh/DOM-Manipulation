from django.urls import path
from .views import PlotListCreateView

urlpatterns = [
    path("plots/", PlotListCreateView.as_view(), name="f1-plot-list-create"),
]