from django.db import models
from farmers.models import Farmer

class Plot(models.Model):
    farmer = models.ForeignKey(Farmer, on_delete=models.CASCADE, related_name="f1_plots")
    plot_code = models.CharField(max_length=50, unique=True)
    sector = models.CharField(max_length=100)
    washing_station = models.CharField(max_length=100)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    area_hectares = models.DecimalField(max_digits=6, decimal_places=2)