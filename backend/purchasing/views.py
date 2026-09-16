from decimal import Decimal, InvalidOperation
from rest_framework import status, viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from inventory.models import Warehouse
from .models import (
    Supplier, PurchaseOrder, GoodsReceipt, SupplierBill, PurchaseReturn,
)
from .serializers import (
    SupplierSerializer, PurchaseOrderSerializer, GoodsReceiptSerializer,
    SupplierBillSerializer, PurchaseReturnSerializer,
)
from .services import (
    create_purchase_order, submit_purchase_order, receive_goods,
    record_supplier_payment, record_purchase_return,
)


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all().order_by("name")
    serializer_class = SupplierSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["code", "name", "contact_person", "phone", "email"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("active") == "true":
            qs = qs.filter(is_active=True)
        return qs


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    queryset = PurchaseOrder.objects.select_related("supplier").prefetch_related("items__product").all().order_by("-created_at")
    serializer_class = PurchaseOrderSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["po_number", "supplier__name", "supplier__code"]
    http_method_names = ["get", "post", "head", "options"]

    def create(self, request):
        data = request.data
        try:
            supplier = Supplier.objects.get(pk=data["supplier_id"])
            po = create_purchase_order(
                user=request.user,
                supplier=supplier,
                items=data.get("items", []),
                expected_date=data.get("expected_date") or None,
                notes=data.get("notes", ""),
            )
            return Response(PurchaseOrderSerializer(po).data, status=status.HTTP_201_CREATED)
        except Supplier.DoesNotExist:
            return Response({"detail": "Supplier not found."}, status=400)
        except (KeyError, ValueError, InvalidOperation) as exc:
            return Response({"detail": str(exc)}, status=400)

    @action(detail=True, methods=["post"])
    def submit(self, request, pk=None):
        po = self.get_object()
        try:
            submit_purchase_order(po)
            return Response(PurchaseOrderSerializer(po).data)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)


class GoodsReceiptViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = GoodsReceipt.objects.select_related("supplier", "purchase_order", "warehouse", "received_by").prefetch_related("items__product").all().order_by("-created_at")
    serializer_class = GoodsReceiptSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["receipt_number", "supplier__name", "supplier_invoice_number", "reference_number"]

    @action(detail=False, methods=["post"])
    def receive(self, request):
        data = request.data
        try:
            supplier = Supplier.objects.get(pk=data["supplier_id"])
            purchase_order = None
            if data.get("purchase_order_id"):
                purchase_order = PurchaseOrder.objects.get(pk=data["purchase_order_id"])
            warehouse = None
            if data.get("warehouse_id"):
                warehouse = Warehouse.objects.get(pk=data["warehouse_id"])

            receipt = receive_goods(
                user=request.user,
                supplier=supplier,
                purchase_order=purchase_order,
                warehouse=warehouse,
                supplier_invoice_number=data.get("supplier_invoice_number", ""),
                reference_number=data.get("reference_number", ""),
                received_date=data.get("received_date") or None,
                notes=data.get("notes", ""),
                items=data.get("items", []),
                create_bill=data.get("create_bill", True),
                bill_due_date=data.get("bill_due_date") or None,
            )
            return Response(GoodsReceiptSerializer(receipt).data, status=status.HTTP_201_CREATED)
        except Supplier.DoesNotExist:
            return Response({"detail": "Supplier not found."}, status=400)
        except PurchaseOrder.DoesNotExist:
            return Response({"detail": "Purchase order not found."}, status=400)
        except Warehouse.DoesNotExist:
            return Response({"detail": "Warehouse not found."}, status=400)
        except (KeyError, ValueError, InvalidOperation) as exc:
            return Response({"detail": str(exc)}, status=400)


class SupplierBillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SupplierBill.objects.select_related("supplier", "goods_receipt", "purchase_order").prefetch_related("payments").all().order_by("-created_at")
    serializer_class = SupplierBillSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["bill_number", "supplier__name"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["post"])
    def pay(self, request, pk=None):
        bill = self.get_object()
        data = request.data
        try:
            record_supplier_payment(
                user=request.user,
                bill=bill,
                amount=data["amount"],
                method=data.get("method", "CASH"),
                reference_number=data.get("reference_number", ""),
                paid_date=data.get("paid_date") or None,
            )
            return Response(SupplierBillSerializer(bill).data)
        except (KeyError, ValueError, InvalidOperation) as exc:
            return Response({"detail": str(exc)}, status=400)


class PurchaseReturnViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PurchaseReturn.objects.select_related("supplier", "goods_receipt").prefetch_related("items__batch__product").all().order_by("-created_at")
    serializer_class = PurchaseReturnSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["return_number", "supplier__name"]

    @action(detail=False, methods=["post"])
    def create_return(self, request):
        data = request.data
        try:
            supplier = Supplier.objects.get(pk=data["supplier_id"])
            goods_receipt = None
            if data.get("goods_receipt_id"):
                goods_receipt = GoodsReceipt.objects.get(pk=data["goods_receipt_id"])

            purchase_return = record_purchase_return(
                user=request.user,
                supplier=supplier,
                goods_receipt=goods_receipt,
                reason=data.get("reason", ""),
                items=data.get("items", []),
            )
            return Response(PurchaseReturnSerializer(purchase_return).data, status=status.HTTP_201_CREATED)
        except Supplier.DoesNotExist:
            return Response({"detail": "Supplier not found."}, status=400)
        except GoodsReceipt.DoesNotExist:
            return Response({"detail": "Goods receipt not found."}, status=400)
        except (KeyError, ValueError, InvalidOperation) as exc:
            return Response({"detail": str(exc)}, status=400)