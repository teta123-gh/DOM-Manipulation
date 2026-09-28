from rest_framework import generics
from .models import Delivery
from .serializers import DeliverySerializer

class DeliveryListCreateView(generics.ListCreateAPIView):
    queryset = Delivery.objects.all()
    serializer_class = DeliverySerializer