from rest_framework.permissions import BasePermission


class RolePermission(BasePermission):
    """Enforce application access by the account role, not by the sidebar."""

    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False

        if user.role in {"SUPER_ADMIN", "ADMIN"}:
            return True

        resource = {
            "ProductViewSet": "products",
            "CustomerViewSet": "customers",
            "SaleViewSet": "sales",
            "SupplierViewSet": "suppliers",
            "PurchaseOrderViewSet": "purchase-orders",
            "GoodsReceiptViewSet": "goods-receipts",
            "SupplierBillViewSet": "bills",
            "PurchaseReturnViewSet": "returns",
            "ProductBatchViewSet": "batches",
            "InventoryMovementViewSet": "movements",
            "WarehouseViewSet": "warehouses",
        }.get(view.__class__.__name__, getattr(view, "basename", ""))
        action = getattr(view, "action", "")
        allowed_actions = {
            "MANAGER": {
                "products": {"list", "retrieve"},
                "customers": {"list", "retrieve", "create", "update", "partial_update"},
                "sales": {"list", "retrieve"},
                "suppliers": {"list", "retrieve"},
                "purchase-orders": {"list", "retrieve", "create", "submit"},
                "goods-receipts": {"list", "retrieve", "receive"},
                "warehouses": {"list", "retrieve"},
                "batches": {"list", "retrieve", "expiring"},
                "movements": {"list", "retrieve"},
            },
            "SALES": {
                "products": {"list", "retrieve"},
                "customers": {"list", "retrieve", "create", "update", "partial_update"},
                "sales": {"list", "retrieve", "checkout"},
            },
            "WAREHOUSE": {
                "products": {"list", "retrieve"},
                "suppliers": {"list", "retrieve"},
                "purchase-orders": {"list", "retrieve"},
                "goods-receipts": {"list", "retrieve", "receive"},
                "warehouses": {"list", "retrieve", "create", "update", "partial_update"},
                "batches": {"list", "retrieve", "create", "update", "partial_update", "expiring"},
                "movements": {"list", "retrieve"},
            },
            "ACCOUNTING": {
                "sales": {"list", "retrieve"},
                "customers": {"list", "retrieve"},
                "suppliers": {"list", "retrieve"},
                "purchase-orders": {"list", "retrieve"},
                "bills": {"list", "retrieve", "pay"},
            },
        }
        return action in allowed_actions.get(user.role, {}).get(resource, set())
