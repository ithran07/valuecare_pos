from decimal import Decimal
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from inventory.models import ProductBatch, InventoryMovement
from .models import Sale, SaleItem, SaleBatchAllocation, Payment

def next_invoice_number():
    prefix = timezone.localdate().strftime("INV-%Y%m%d")
    last = Sale.objects.filter(invoice_number__startswith=prefix).order_by("-id").first()
    sequence = 1
    if last:
        try:
            sequence = int(last.invoice_number.rsplit("-", 1)[1]) + 1
        except (ValueError, IndexError):
            sequence = Sale.objects.filter(invoice_number__startswith=prefix).count() + 1
    return f"{prefix}-{sequence:04d}"

@transaction.atomic
def checkout(*, user, customer, items, discount=Decimal("0"), tax=Decimal("0"),
             payment_method="CASH", amount_paid=Decimal("0"), payment_reference="", notes=""):
    if not items:
        raise ValueError("Cart is empty.")

    sale = Sale.objects.create(
        invoice_number=next_invoice_number(),
        customer=customer,
        sold_by=user,
        discount=Decimal(discount),
        tax=Decimal(tax),
        notes=notes,
    )

    subtotal = Decimal("0")

    for item in items:
        product_id = item["product_id"]
        requested_qty = Decimal(str(item["quantity"]))
        unit_price = Decimal(str(item.get("unit_price", "0")))
        item_discount = Decimal(str(item.get("discount", "0")))

        if requested_qty <= 0:
            raise ValueError("Quantity must be greater than zero.")

        # Lock candidate batches and apply FEFO: earliest expiration first.
        today = timezone.localdate()
        batches = list(
            ProductBatch.objects.select_for_update()
            .filter(product_id=product_id, is_active=True, quantity__gt=0)
            .filter(
                # NULL expiration is allowed after dated batches.
                Q(expiration_date__isnull=True) |
                Q(expiration_date__gte=today)
            )
            .order_by("expiration_date", "id")
        )

        available = sum((b.quantity for b in batches), Decimal("0"))
        if available < requested_qty:
            raise ValueError(f"Insufficient non-expired stock for product {product_id}.")

        line_total = (requested_qty * unit_price) - item_discount
        if line_total < 0:
            raise ValueError("Line total cannot be negative.")

        sale_item = SaleItem.objects.create(
            sale=sale,
            product_id=product_id,
            quantity=requested_qty,
            unit_price=unit_price,
            discount=item_discount,
            line_total=line_total,
        )

        remaining = requested_qty
        for batch in batches:
            if remaining <= 0:
                break
            allocated = min(batch.quantity, remaining)
            batch.quantity -= allocated
            batch.save(update_fields=["quantity", "updated_at"])

            SaleBatchAllocation.objects.create(
                sale_item=sale_item,
                batch=batch,
                quantity=allocated,
                unit_cost=batch.unit_cost,
            )
            InventoryMovement.objects.create(
                product_id=product_id,
                batch=batch,
                movement_type=InventoryMovement.MovementType.SALE,
                quantity=-allocated,
                reference_number=sale.invoice_number,
                performed_by=user,
            )
            remaining -= allocated

        subtotal += line_total

    total = subtotal - Decimal(discount) + Decimal(tax)
    if total < 0:
        raise ValueError("Sale total cannot be negative.")

    amount_paid = Decimal(amount_paid)
    if amount_paid < 0:
        raise ValueError("Amount paid cannot be negative.")

    if amount_paid >= total:
        payment_status = Sale.PaymentStatus.PAID
        change = amount_paid - total
    elif amount_paid > 0:
        payment_status = Sale.PaymentStatus.PARTIAL
        change = Decimal("0")
    else:
        payment_status = Sale.PaymentStatus.CREDIT
        change = Decimal("0")

    sale.subtotal = subtotal
    sale.total = total
    sale.amount_paid = amount_paid
    sale.change_amount = change
    sale.payment_status = payment_status
    sale.save(update_fields=[
        "subtotal", "total", "amount_paid", "change_amount",
        "payment_status"
    ])

    if amount_paid > 0:
        Payment.objects.create(
            sale=sale,
            method=payment_method,
            amount=amount_paid if amount_paid <= total else total,
            reference_number=payment_reference,
        )

    return sale
