from rest_framework import serializers
from .models import (
    Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem,
    SupplierBill, SupplierPayment, PurchaseReturn, PurchaseReturnItem,
)


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model = Supplier
        fields = "__all__"


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)
    quantity_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = PurchaseOrderItem
        fields = [
            "id", "product", "product_name", "sku", "quantity_ordered",
            "quantity_received", "quantity_outstanding", "unit_cost", "line_total",
        ]


class PurchaseOrderSerializer(serializers.ModelSerializer):
    items = PurchaseOrderItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = PurchaseOrder
        fields = [
            "id", "po_number", "supplier", "supplier_name", "status", "order_date",
            "expected_date", "notes", "subtotal", "total", "items", "created_at",
        ]


class GoodsReceiptItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="product.name", read_only=True)
    sku = serializers.CharField(source="product.sku", read_only=True)

    class Meta:
        model = GoodsReceiptItem
        fields = [
            "id", "purchase_order_item", "product", "product_name", "sku", "batch",
            "batch_number", "manufacturing_date", "expiration_date", "quantity", "unit_cost",
        ]


class GoodsReceiptSerializer(serializers.ModelSerializer):
    items = GoodsReceiptItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    po_number = serializers.CharField(source="purchase_order.po_number", read_only=True)
    warehouse_name = serializers.CharField(source="warehouse.name", read_only=True)
    received_by_name = serializers.SerializerMethodField()

    class Meta:
        model = GoodsReceipt
        fields = [
            "id", "receipt_number", "purchase_order", "po_number", "supplier", "supplier_name",
            "warehouse", "warehouse_name", "supplier_invoice_number", "reference_number",
            "received_by", "received_by_name", "received_date", "notes", "items", "created_at",
        ]

    def get_received_by_name(self, obj):
        if not obj.received_by:
            return None
        return obj.received_by.get_full_name() or obj.received_by.username


class SupplierPaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierPayment
        fields = ["id", "amount", "method", "reference_number", "paid_date", "created_at"]


class SupplierBillSerializer(serializers.ModelSerializer):
    payments = SupplierPaymentSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)
    balance = serializers.DecimalField(max_digits=14, decimal_places=2, read_only=True)
    receipt_number = serializers.CharField(source="goods_receipt.receipt_number", read_only=True)

    class Meta:
        model = SupplierBill
        fields = [
            "id", "bill_number", "supplier", "supplier_name", "goods_receipt", "receipt_number",
            "purchase_order", "amount", "amount_paid", "balance", "status", "bill_date",
            "due_date", "notes", "payments", "created_at",
        ]


class PurchaseReturnItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source="batch.product.name", read_only=True)
    batch_number = serializers.CharField(source="batch.batch_number", read_only=True)

    class Meta:
        model = PurchaseReturnItem
        fields = [
            "id", "batch", "product_name", "batch_number", "quantity", "reason_code", "unit_cost",
        ]


class PurchaseReturnSerializer(serializers.ModelSerializer):
    items = PurchaseReturnItemSerializer(many=True, read_only=True)
    supplier_name = serializers.CharField(source="supplier.name", read_only=True)

    class Meta:
        model = PurchaseReturn
        fields = [
            "id", "return_number", "supplier", "supplier_name", "goods_receipt", "status",
            "reason", "items", "created_at",
        ]