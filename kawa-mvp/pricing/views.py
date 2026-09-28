from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework.response import Response

class StatusView(APIView):
    def get(self, request):
        return Response({"status": "ok"})

class PriceScheduleView(APIView):
    def get(self, request):
        data = cache.get("f1_price_schedule")
        if data is None:
            data = {"season": "2026A", "prices": {"A": 350, "B": 300, "C": 250}}
            cache.set("f1_price_schedule", data, timeout=3600)
        return Response(data)