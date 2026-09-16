from decimal import Decimal, InvalidOperation
from django.db.models import Prefetch
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from customers.models import Customer
from .models import Sale, SaleItem
from .serializers import SaleSerializer
from .services import checkout

class SaleViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Sale.objects.select_related("customer", "sold_by").prefetch_related(
        "items__product", "items__allocations__batch", "payments"
    ).all().order_by("-created_at")
    serializer_class = SaleSerializer

    @action(detail=False, methods=["post"])
    def checkout(self, request):
        data = request.data
        try:
            customer = None
            customer_id = data.get("customer_id")
            if customer_id:
                customer = Customer.objects.get(pk=customer_id)

            sale = checkout(
                user=request.user,
                customer=customer,
                items=data.get("items", []),
                discount=Decimal(str(data.get("discount", "0"))),
                tax=Decimal(str(data.get("tax", "0"))),
                payment_method=data.get("payment_method", "CASH"),
                amount_paid=Decimal(str(data.get("amount_paid", "0"))),
                payment_reference=data.get("payment_reference", ""),
                notes=data.get("notes", ""),
            )
            return Response(
                SaleSerializer(sale).data,
                status=status.HTTP_201_CREATED
            )
        except Customer.DoesNotExist:
            return Response({"detail": "Customer not found."}, status=400)
        except (ValueError, InvalidOperation) as exc:
            return Response({"detail": str(exc)}, status=400)
