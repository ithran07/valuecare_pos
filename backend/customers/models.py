from decimal import Decimal
from django.db import models

class Customer(models.Model):
    class CustomerType(models.TextChoices):
        WALK_IN = "WALK_IN", "Walk-in"
        CLINIC = "CLINIC", "Clinic"
        HOSPITAL = "HOSPITAL", "Hospital"
        PHARMACY = "PHARMACY", "Pharmacy"
        DISTRIBUTOR = "DISTRIBUTOR", "Distributor"
        OTHER = "OTHER", "Other"

    code = models.CharField(max_length=40, primary_key=True)
    business_name = models.CharField(max_length=200)
    contact_person = models.CharField(max_length=160, blank=True)
    customer_type = models.CharField(max_length=30, choices=CustomerType.choices, default=CustomerType.WALK_IN)
    phone = models.CharField(max_length=50, blank=True)
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    credit_terms_days = models.PositiveIntegerField(default=0)
    credit_limit = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} - {self.business_name}"
