from rest_framework import serializers
from .models import Sale, SaleItem, SaleBatchAllocation, Payment

class SaleBatchAllocationSerializer(serializers.ModelSerializer):
    batch_number = serializers.CharField(source="batch.batch_number", read_only=True)
    expiration_date = serializers.DateField(source="batch.expiration_date", read_only=True)
    class Meta:
        model = SaleBatchAllocation
        fields = ["id", "batch", "batch_number", "expiration_date", "quantity", "unit_cost"]

class SaleItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)
    allocations = SaleBatchAllocationSerializer(many=True, read_only=True)
    class Meta:
        model = SaleItem
        fields = ["id", "product", "product_name", "sku", "quantity", "unit_price", "discount", "line_total", "allocations"]

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ["id", "method", "amount", "reference_number", "created_at"]

class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source="customer.business_name", read_only=True)
    sold_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            "id","invoice_number","customer","customer_name","sold_by","sold_by_name",
            "status","payment_status","subtotal","discount","tax","total","amount_paid",
            "change_amount","notes","items","payments","created_at"
        ]

    def get_sold_by_name(self, obj):
        if not obj.sold_by:
            return None
        return obj.sold_by.get_full_name() or obj.sold_by.username
