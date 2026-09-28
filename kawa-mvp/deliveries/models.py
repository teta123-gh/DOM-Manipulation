import uuid
from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models


class Cooperative(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)

    def __str__(self) -> str:
        return self.name


class Farmer(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        INACTIVE = "inactive", "Inactive"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    cooperative = models.ForeignKey(
        Cooperative, on_delete=models.PROTECT, related_name="farmers"
    )
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.ACTIVE
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.full_name


class Plot(models.Model):
    class RiskStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        CLEAR = "clear", "Clear"
        FLAGGED = "flagged", "Flagged"

    class VerificationStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        VERIFIED = "verified", "Verified"
        REJECTED = "rejected", "Rejected"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    farmer = models.ForeignKey(Farmer, on_delete=models.PROTECT, related_name="plots")

    # Administrative sector the plot sits in — required by F1, used for
    # access scoping in Formative 2.
    sector = models.CharField(max_length=100)

    # Washing station this plot delivers to — required by F1, also used for
    # access scoping in Formative 2, and for the station-facing feed.
    station = models.ForeignKey(
        "Station", on_delete=models.PROTECT, related_name="plots"
    )

    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    area_hectares = models.DecimalField(max_digits=6, decimal_places=2)

    verification_status = models.CharField(
        max_length=10,
        choices=VerificationStatus.choices,
        default=VerificationStatus.PENDING,
    )

    # Populated by the async risk-check worker (see ADR-001).
    risk_status = models.CharField(
        max_length=10, choices=RiskStatus.choices, default=RiskStatus.PENDING
    )
    risk_checked_at = models.DateTimeField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return f"Plot {self.id} ({self.farmer.full_name})"


class RiskCheckAttempt(models.Model):
    """Log of every call made to the external risk registry for a plot,
    successful or not. Exists so a stuck/failing check is debuggable
    rather than silent (see ADR-001)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    plot = models.ForeignKey(
        Plot, on_delete=models.CASCADE, related_name="risk_check_attempts"
    )
    attempted_at = models.DateTimeField(auto_now_add=True)
    succeeded = models.BooleanField()
    result = models.CharField(max_length=10, blank=True)  # clear / flagged
    error_detail = models.TextField(blank=True)

    class Meta:
        ordering = ["-attempted_at"]


class Station(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=200)
    sector = models.CharField(max_length=100)

    def __str__(self) -> str:
        return self.name


class PriceSchedule(models.Model):
    """The national reference price schedule. Deliveries must price against
    the schedule entry valid on the delivery date."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    effective_date = models.DateField()
    price_per_kg = models.DecimalField(max_digits=8, decimal_places=2)

    class Meta:
        ordering = ["-effective_date"]

    def __str__(self) -> str:
        return f"{self.effective_date}: {self.price_per_kg}/kg"


class Delivery(models.Model):
    class PaymentStatus(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Redundant with plot.farmer by design — cheap reads on the station feed
    # without a join. Enforced equal to plot.farmer at the serializer layer.
    farmer = models.ForeignKey(
        Farmer, on_delete=models.PROTECT, related_name="deliveries"
    )
    plot = models.ForeignKey(Plot, on_delete=models.PROTECT, related_name="deliveries")
    station = models.ForeignKey(
        Station, on_delete=models.PROTECT, related_name="deliveries"
    )

    quantity_kg = models.DecimalField(
        max_digits=8, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))]
    )
    price_schedule = models.ForeignKey(
        PriceSchedule, on_delete=models.PROTECT, related_name="deliveries"
    )
    price_per_kg = models.DecimalField(max_digits=8, decimal_places=2)
    total_amount = models.DecimalField(max_digits=10, decimal_places=2)

    payment_status = models.CharField(
        max_length=10, choices=PaymentStatus.choices, default=PaymentStatus.PENDING
    )

    # Enables safe client retry on flaky 2G connections without creating
    # duplicate deliveries. Client generates a UUID per logical submission
    # and resends the same key on retry.
    idempotency_key = models.UUIDField(unique=True)

    recorded_by = models.CharField(max_length=200, blank=True)  # field agent name
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"Delivery {self.id} — {self.quantity_kg}kg"


class ExportLot(models.Model):
    class Status(models.TextChoices):
        DRAFT = "draft", "Draft"
        APPROVED = "approved", "Approved"
        EXPORTED = "exported", "Exported"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lot_number = models.CharField(max_length=50, unique=True)
    deliveries = models.ManyToManyField(Delivery, related_name="export_lots")
    status = models.CharField(
        max_length=10, choices=Status.choices, default=Status.DRAFT
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self) -> str:
        return self.lot_number