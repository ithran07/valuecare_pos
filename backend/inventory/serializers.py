from rest_framework import serializers
from .models import ProductBatch, InventoryMovement, Warehouse

class WarehouseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Warehouse
        fields = "__all__"

class ProductBatchSerializer(serializers.ModelSerializer):
    is_expired = serializers.BooleanField(read_only=True)
    days_to_expiry = serializers.SerializerMethodField()
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)

    class Meta:
        model = ProductBatch
        fields = "__all__"

    def get_days_to_expiry(self, obj):
        if not obj.expiration_date:
            return None
        from django.utils import timezone
        return (obj.expiration_date - timezone.localdate()).days

class InventoryMovementSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    performed_by_name = serializers.SerializerMethodField()

    class Meta:
        model = InventoryMovement
        fields = [
            "id", "product", "product_name", "batch", "warehouse", "warehouse_name",
            "movement_type", "quantity", "reference_number", "notes", "performed_by",
            "performed_by_name", "created_at",
        ]
        read_only_fields = ["performed_by"]

    def get_performed_by_name(self, obj):
        if not obj.performed_by:
            return None
        return obj.performed_by.get_full_name() or obj.performed_by.username