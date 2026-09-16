from django.contrib import admin
from .models import ProductBatch, InventoryMovement, Warehouse
admin.site.register(ProductBatch)
admin.site.register(InventoryMovement)
admin.site.register(Warehouse)