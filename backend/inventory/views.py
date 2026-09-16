from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import ProductBatch, InventoryMovement, Warehouse
from .serializers import ProductBatchSerializer, InventoryMovementSerializer, WarehouseSerializer

class WarehouseViewSet(viewsets.ModelViewSet):
    queryset = Warehouse.objects.all().order_by("name")
    serializer_class = WarehouseSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["name", "code"]

class ProductBatchViewSet(viewsets.ModelViewSet):
    queryset = ProductBatch.objects.select_related("product", "warehouse").all()
    serializer_class = ProductBatchSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["batch_number", "product__sku", "product__name", "supplier_name"]

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        today = timezone.localdate()
        if status_filter == "expired":
            qs = qs.filter(expiration_date__lt=today)
        elif status_filter == "expiring":
            qs = qs.filter(expiration_date__gte=today, expiration_date__lte=today + timedelta(days=90))
        elif status_filter == "available":
            qs = qs.filter(is_active=True, quantity__gt=0).exclude(expiration_date__lt=today)
        return qs

    @action(detail=False, methods=["get"])
    def expiring(self, request):
        qs = self.get_queryset().filter(
            expiration_date__gte=timezone.localdate(),
            expiration_date__lte=timezone.localdate() + timedelta(days=90),
            quantity__gt=0,
            is_active=True,
        )
        return Response(self.get_serializer(qs, many=True).data)

    @transaction.atomic
    def perform_create(self, serializer):
        batch = serializer.save()
        if batch.quantity > 0:
            InventoryMovement.objects.create(
                product=batch.product,
                batch=batch,
                movement_type=InventoryMovement.MovementType.RECEIPT,
                quantity=batch.quantity,
                reference_number=batch.reference_number,
                performed_by=self.request.user,
            )

class InventoryMovementViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = InventoryMovement.objects.select_related("product", "batch", "performed_by").all()
    serializer_class = InventoryMovementSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ["product__sku", "product__name", "reference_number", "notes"]