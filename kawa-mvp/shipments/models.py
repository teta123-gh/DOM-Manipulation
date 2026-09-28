from django.db import models
from plots.models import Plot

class Delivery(models.Model):
    plot = models.ForeignKey(Plot, on_delete=models.CASCADE, related_name="f1_deliveries")
    washing_station = models.CharField(max_length=100)
    weight_kg = models.DecimalField(max_digits=7, decimal_places=2)
    grade = models.CharField(max_length=5)
    delivered_on = models.DateField()