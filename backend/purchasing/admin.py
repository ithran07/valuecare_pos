from django.contrib import admin
from .models import (
    Supplier, PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem,
    SupplierBill, SupplierPayment, PurchaseReturn, PurchaseReturnItem,
)

admin.site.register(Supplier)
admin.site.register(PurchaseOrder)
admin.site.register(PurchaseOrderItem)
admin.site.register(GoodsReceipt)
admin.site.register(GoodsReceiptItem)
admin.site.register(SupplierBill)
admin.site.register(SupplierPayment)
admin.site.register(PurchaseReturn)
admin.site.register(PurchaseReturnItem)