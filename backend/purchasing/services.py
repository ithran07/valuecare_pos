from decimal import Decimal
from django.db import transaction
from django.utils import timezone

from inventory.models import ProductBatch, InventoryMovement
from .models import (
    PurchaseOrder, PurchaseOrderItem, GoodsReceipt, GoodsReceiptItem,
    SupplierBill, SupplierPayment, PurchaseReturn, PurchaseReturnItem,
)


def _next_number(model, field, prefix):
    today_prefix = timezone.localdate().strftime(f"{prefix}-%Y%m%d")
    lookup = {f"{field}__startswith": today_prefix}
    last = model.objects.filter(**lookup).order_by("-id").first()
    sequence = 1
    if last:
        try:
            sequence = int(getattr(last, field).rsplit("-", 1)[1]) + 1
        except (ValueError, IndexError):
            sequence = model.objects.filter(**lookup).count() + 1
    return f"{today_prefix}-{sequence:04d}"


def next_po_number():
    return _next_number(PurchaseOrder, "po_number", "PO")


def next_receipt_number():
    return _next_number(GoodsReceipt, "receipt_number", "GR")


def next_return_number():
    return _next_number(PurchaseReturn, "return_number", "PR")


@transaction.atomic
def create_purchase_order(*, user, supplier, items, expected_date=None, notes=""):
    if not items:
        raise ValueError("A purchase order needs at least one item.")

    po = PurchaseOrder.objects.create(
        po_number=next_po_number(),
        supplier=supplier,
        expected_date=expected_date,
        notes=notes,
        created_by=user,
    )

    subtotal = Decimal("0")
    for item in items:
        quantity = Decimal(str(item["quantity_ordered"]))
        unit_cost = Decimal(str(item.get("unit_cost", "0")))
        if quantity <= 0:
            raise ValueError("Ordered quantity must be greater than zero.")
        line_total = quantity * unit_cost
        PurchaseOrderItem.objects.create(
            purchase_order=po,
            product_id=item["product_id"],
            quantity_ordered=quantity,
            unit_cost=unit_cost,
            line_total=line_total,
        )
        subtotal += line_total

    po.subtotal = subtotal
    po.total = subtotal
    po.save(update_fields=["subtotal", "total"])
    return po


@transaction.atomic
def submit_purchase_order(purchase_order):
    if purchase_order.status != PurchaseOrder.Status.DRAFT:
        raise ValueError("Only draft purchase orders can be submitted.")
    purchase_order.status = PurchaseOrder.Status.SUBMITTED
    purchase_order.save(update_fields=["status"])
    return purchase_order


@transaction.atomic
def receive_goods(*, user, supplier, purchase_order=None, warehouse=None,
                   supplier_invoice_number="", reference_number="",
                   received_date=None, notes="", items=None,
                   create_bill=True, bill_due_date=None):
    """Receive stock, creating/topping-up batches and inventory movements.

    Each item dict: {product_id, po_item_id (optional), batch_number,
    manufacturing_date, expiration_date, quantity, unit_cost}
    """
    if not items:
        raise ValueError("A goods receipt needs at least one item.")

    receipt = GoodsReceipt.objects.create(
        receipt_number=next_receipt_number(),
        purchase_order=purchase_order,
        supplier=supplier,
        warehouse=warehouse,
        supplier_invoice_number=supplier_invoice_number,
        reference_number=reference_number,
        received_by=user,
        received_date=received_date or timezone.localdate(),
        notes=notes,
    )

    total_cost = Decimal("0")

    for item in items:
        product_id = item["product_id"]
        quantity = Decimal(str(item["quantity"]))
        unit_cost = Decimal(str(item.get("unit_cost", "0")))
        batch_number = item["batch_number"]

        if quantity <= 0:
            raise ValueError("Received quantity must be greater than zero.")

        po_item = None
        po_item_id = item.get("po_item_id")
        if po_item_id:
            po_item = PurchaseOrderItem.objects.select_for_update().get(pk=po_item_id)

        batch, created = ProductBatch.objects.select_for_update().get_or_create(
            product_id=product_id,
            batch_number=batch_number,
            defaults={
                "manufacturing_date": item.get("manufacturing_date"),
                "expiration_date": item.get("expiration_date"),
                "quantity": Decimal("0"),
                "received_quantity": Decimal("0"),
                "unit_cost": unit_cost,
                "supplier_name": supplier.name,
                "reference_number": receipt.receipt_number,
                "warehouse": warehouse,
            },
        )
        if not created:
            batch.unit_cost = unit_cost
            if item.get("expiration_date"):
                batch.expiration_date = item["expiration_date"]
            if warehouse:
                batch.warehouse = warehouse
        batch.quantity += quantity
        batch.received_quantity += quantity
        batch.save(update_fields=[
            "quantity", "received_quantity", "unit_cost", "expiration_date",
            "warehouse", "updated_at",
        ])

        GoodsReceiptItem.objects.create(
            goods_receipt=receipt,
            purchase_order_item=po_item,
            product_id=product_id,
            batch=batch,
            batch_number=batch_number,
            manufacturing_date=item.get("manufacturing_date"),
            expiration_date=item.get("expiration_date"),
            quantity=quantity,
            unit_cost=unit_cost,
        )

        InventoryMovement.objects.create(
            product_id=product_id,
            batch=batch,
            warehouse=warehouse,
            movement_type=InventoryMovement.MovementType.RECEIPT,
            quantity=quantity,
            reference_number=receipt.receipt_number,
            notes=f"Goods receipt {receipt.receipt_number}",
            performed_by=user,
        )

        if po_item:
            po_item.quantity_received += quantity
            po_item.save(update_fields=["quantity_received"])

        total_cost += quantity * unit_cost

    if purchase_order:
        items_qs = purchase_order.items.all()
        if all(i.quantity_received >= i.quantity_ordered for i in items_qs):
            purchase_order.status = PurchaseOrder.Status.RECEIVED
        elif any(i.quantity_received > 0 for i in items_qs):
            purchase_order.status = PurchaseOrder.Status.PARTIALLY_RECEIVED
        purchase_order.save(update_fields=["status"])

    if create_bill and total_cost > 0:
        SupplierBill.objects.create(
            bill_number=supplier_invoice_number,
            supplier=supplier,
            goods_receipt=receipt,
            purchase_order=purchase_order,
            amount=total_cost,
            bill_date=receipt.received_date,
            due_date=bill_due_date,
        )

    return receipt


@transaction.atomic
def record_supplier_payment(*, user, bill, amount, method="CASH", reference_number="", paid_date=None):
    amount = Decimal(str(amount))
    if amount <= 0:
        raise ValueError("Payment amount must be greater than zero.")
    if amount > bill.balance:
        raise ValueError("Payment amount exceeds the outstanding balance.")

    SupplierPayment.objects.create(
        bill=bill,
        amount=amount,
        method=method,
        reference_number=reference_number,
        paid_date=paid_date or timezone.localdate(),
        recorded_by=user,
    )

    bill.amount_paid += amount
    if bill.amount_paid >= bill.amount:
        bill.status = SupplierBill.Status.PAID
    elif bill.amount_paid > 0:
        bill.status = SupplierBill.Status.PARTIAL
    bill.save(update_fields=["amount_paid", "status"])
    return bill


@transaction.atomic
def record_purchase_return(*, user, supplier, goods_receipt=None, reason="", items=None):
    """items: list of {batch_id, quantity, reason_code}."""
    if not items:
        raise ValueError("A purchase return needs at least one item.")

    purchase_return = PurchaseReturn.objects.create(
        return_number=next_return_number(),
        supplier=supplier,
        goods_receipt=goods_receipt,
        reason=reason,
        created_by=user,
    )

    for item in items:
        quantity = Decimal(str(item["quantity"]))
        if quantity <= 0:
            raise ValueError("Return quantity must be greater than zero.")

        batch = ProductBatch.objects.select_for_update().get(pk=item["batch_id"])
        if batch.quantity < quantity:
            raise ValueError(f"Cannot return more than the batch's current stock ({batch.batch_number}).")

        reason_code = item.get("reason_code", PurchaseReturnItem.ReasonCode.DAMAGED)

        batch.quantity -= quantity
        batch.save(update_fields=["quantity", "updated_at"])

        PurchaseReturnItem.objects.create(
            purchase_return=purchase_return,
            batch=batch,
            quantity=quantity,
            reason_code=reason_code,
            unit_cost=batch.unit_cost,
        )

        movement_type = (
            InventoryMovement.MovementType.DAMAGE
            if reason_code == PurchaseReturnItem.ReasonCode.DAMAGED
            else InventoryMovement.MovementType.RETURN
        )
        InventoryMovement.objects.create(
            product=batch.product,
            batch=batch,
            warehouse=batch.warehouse,
            movement_type=movement_type,
            quantity=-quantity,
            reference_number=purchase_return.return_number,
            notes=f"Purchase return {purchase_return.return_number}: {reason_code}",
            performed_by=user,
        )

    return purchase_return