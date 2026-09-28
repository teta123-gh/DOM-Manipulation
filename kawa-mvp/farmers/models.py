from django.db import models

class Farmer(models.Model):
    full_name = models.CharField(max_length=255)
    member_number = models.CharField(max_length=50, unique=True)
    cooperative = models.CharField(max_length=100)
    national_id = models.CharField(max_length=20)
    phone = models.CharField(max_length=20)