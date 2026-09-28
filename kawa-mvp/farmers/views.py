from rest_framework import generics
from .models import Farmer
from .serializers import FarmerSerializer

class FarmerListCreateView(generics.ListCreateAPIView):
    queryset = Farmer.objects.all()
    serializer_class = FarmerSerializer