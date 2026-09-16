from decimal import Decimal
from django.db import models

class Category(models.Model):
    name = models.CharField(max_length=120, unique=True)
    is_active = models.BooleanField(default=True)
    def __str__(self):
        return self.name

class Unit(models.Model):
    name = models.CharField(max_length=50, unique=True)
    abbreviation = models.CharField(max_length=20, blank=True)
    def __str__(self):
        return self.name

class Product(models.Model):
    sku = models.CharField(max_length=80, unique=True)
    barcode = models.CharField(max_length=80, unique=True, null=True, blank=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    unit = models.ForeignKey(Unit, null=True, blank=True, on_delete=models.SET_NULL, related_name="products")
    brand = models.CharField(max_length=120, blank=True)
    manufacturer = models.CharField(max_length=160, blank=True)
    cost_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    selling_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    wholesale_price = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    minimum_stock = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    reorder_level = models.DecimalField(max_digits=12, decimal_places=2, default=Decimal("0"))
    is_prescription = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    @property
    def current_stock(self):
        return sum((b.quantity for b in self.batches.filter(is_active=True)), Decimal("0"))

    def __str__(self):
        return f"{self.sku} - {self.name}"
