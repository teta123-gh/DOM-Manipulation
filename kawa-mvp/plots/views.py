from rest_framework import generics
from .models import Plot
from .serializers import PlotSerializer
from .tasks import check_deforestation_risk

class PlotListCreateView(generics.ListCreateAPIView):
    queryset = Plot.objects.all()
    serializer_class = PlotSerializer

    def perform_create(self, serializer):
        plot = serializer.save()
        check_deforestation_risk.delay(plot.id)