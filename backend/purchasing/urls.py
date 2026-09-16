# medical-supplier-pos-part-3/backend/purchasing/urls.py
from rest_framework.routers import DefaultRouter
from .views import (
    SupplierViewSet, PurchaseOrderViewSet, GoodsReceiptViewSet,
    SupplierBillViewSet, PurchaseReturnViewSet,
)

router = DefaultRouter()
router.register("suppliers", SupplierViewSet)
router.register("purchase-orders", PurchaseOrderViewSet)
router.register("goods-receipts", GoodsReceiptViewSet)
router.register("bills", SupplierBillViewSet)
router.register("returns", PurchaseReturnViewSet)

urlpatterns = router.urls