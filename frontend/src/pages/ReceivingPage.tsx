import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  ClipboardList,
  Package,
  PackageCheck,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import { api } from "../api";
import {
  GoodsReceipt,
  Product,
  PurchaseOrder,
  Supplier,
  Warehouse,
} from "../types";
import { useToast } from "../ToastContext";
import ManagementSelect from "../components/ManagementSelect";

import "../style/receiving.css";
import "../style/management.css";

type Line = {
  key: string;
  productId: number;
  productName: string;
  sku: string;
  poItemId: number | null;
  outstandingQuantity: string;
  batchNumber: string;
  manufacturingDate: string;
  expirationDate: string;
  quantity: string;
  unitCost: string;
};

export default function ReceivingPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [poId, setPoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [lines, setLines] = useState<Line[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadingReceipts, setLoadingReceipts] = useState(true);
  const [error, setError] = useState("");

  const { showToast } = useToast();

  /* =========================================================
     LOAD RECEIVING HISTORY
     ========================================================= */

  async function loadReceipts() {
    try {
      setLoadingReceipts(true);
      setError("");

      const res = await api.get("/purchasing/goods-receipts/");
      setReceipts(res.data);
    } catch (e) {
      console.error("Failed to load receiving history:", e);
      setError("Unable to load receiving history.");
    } finally {
      setLoadingReceipts(false);
    }
  }

  /* =========================================================
     INITIAL DATA
     ========================================================= */

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        setLoading(true);
        setError("");

        const [
          suppliersRes,
          warehousesRes,
          productsRes,
          purchaseOrdersRes,
          receiptsRes,
        ] = await Promise.all([
          api.get("/purchasing/suppliers/?active=true"),
          api.get("/inventory/warehouses/"),
          api.get("/products/?active=true"),
          api.get("/purchasing/purchase-orders/"),
          api.get("/purchasing/goods-receipts/"),
        ]);

        if (!mounted) return;

        setSuppliers(suppliersRes.data);
        setWarehouses(warehousesRes.data);
        setProducts(productsRes.data);
        setPurchaseOrders(purchaseOrdersRes.data);
        setReceipts(receiptsRes.data);
      } catch (e) {
        console.error("Failed to load receiving data:", e);

        if (mounted) {
          setError("Unable to load receiving data.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setLoadingReceipts(false);
        }
      }
    }

    loadData();

    return () => {
      mounted = false;
    };
  }, []);

  /* =========================================================
     OPEN PURCHASE ORDERS
     ========================================================= */

  const openOrders = useMemo(
    () =>
      purchaseOrders.filter(
        (order) =>
          String(order.supplier) === supplierId &&
          (order.status === "SUBMITTED" ||
            order.status === "PARTIALLY_RECEIVED"),
      ),
    [purchaseOrders, supplierId],
  );

  /* =========================================================
     SELECTED PURCHASE ORDER
     ========================================================= */

  const selectedPurchaseOrder = useMemo(
    () => purchaseOrders.find((order) => String(order.id) === poId),
    [purchaseOrders, poId],
  );

  /* =========================================================
     PRODUCT SEARCH
     ========================================================= */

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase().trim();

    if (!q) {
      return products.slice(0, 15);
    }

    return products
      .filter((product) =>
        `${product.name} ${product.sku}`.toLowerCase().includes(q),
      )
      .slice(0, 15);
  }, [products, productSearch]);

  /* =========================================================
     RECEIVING HISTORY SEARCH
     ========================================================= */

  const filteredReceipts = useMemo(() => {
    const q = search.toLowerCase().trim();

    if (!q) return receipts;

    return receipts.filter((receipt) => {
      const searchableText = [
        receipt.receipt_number,
        receipt.supplier_name,
        receipt.po_number,
        receipt.warehouse_name,
        receipt.supplier_invoice_number,
        receipt.reference_number,
        receipt.received_by_name,
        receipt.received_by,
        receipt.received_date,
        ...receipt.items.flatMap((item) => [
          item.product_name,
          item.sku,
          item.batch_number,
        ]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(q);
    });
  }, [receipts, search]);

  /* =========================================================
     LOAD OUTSTANDING PO ITEMS
     ========================================================= */

  function loadOutstandingFromPO() {
    const po = purchaseOrders.find((order) => String(order.id) === poId);

    if (!po) return;

    const outstanding = po.items
      .filter((item) => Number(item.quantity_outstanding) > 0)
      .map((item) => ({
        key: `po-${item.id}`,
        productId: item.product,
        productName: item.product_name,
        sku: item.sku,
        poItemId: item.id,
        outstandingQuantity: item.quantity_outstanding,
        batchNumber: "",
        manufacturingDate: "",
        expirationDate: "",
        quantity: item.quantity_outstanding,
        unitCost: item.unit_cost,
      }));

    setLines((current) => {
      const existingPoItems = new Set(
        current
          .filter((line) => line.poItemId !== null)
          .map((line) => line.poItemId),
      );

      const newLines = outstanding.filter(
        (line) => !existingPoItems.has(line.poItemId),
      );

      return [...current, ...newLines];
    });

    showToast(
      `${outstanding.length} outstanding item${
        outstanding.length === 1 ? "" : "s"
      } loaded.`,
      "success",
    );
  }

  /* =========================================================
     ADD MANUAL PRODUCT
     ========================================================= */

  function addManualLine(product: Product) {
    setLines((current) => [
      ...current,
      {
        key: `manual-${product.id}-${Date.now()}-${Math.random()}`,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        poItemId: null,
        outstandingQuantity: "",
        batchNumber: "",
        manufacturingDate: "",
        expirationDate: "",
        quantity: "1",
        unitCost: "0",
      },
    ]);
  }

  /* =========================================================
     UPDATE LINE
     ========================================================= */

  function updateLine(key: string, patch: Partial<Line>) {
    setLines((current) =>
      current.map((line) =>
        line.key === key ? { ...line, ...patch } : line,
      ),
    );
  }

  /* =========================================================
     REMOVE LINE
     ========================================================= */

  function removeLine(key: string) {
    setLines((current) => current.filter((line) => line.key !== key));
  }

  /* =========================================================
     TOTAL
     ========================================================= */

  const total = lines.reduce(
    (sum, line) =>
      sum +
      Number(line.quantity || 0) * Number(line.unitCost || 0),
    0,
  );

  const totalQuantity = lines.reduce(
    (sum, line) => sum + Number(line.quantity || 0),
    0,
  );

  /* =========================================================
     RESET FORM
     ========================================================= */

  function resetForm() {
    setSupplierId("");
    setPoId("");
    setWarehouseId("");
    setInvoiceNumber("");
    setReferenceNumber("");
    setProductSearch("");
    setLines([]);
  }

  /* =========================================================
     CLOSE CREATE FORM
     ========================================================= */

  function closeCreateForm() {
    setShowCreateForm(false);
    resetForm();
  }

  /* =========================================================
     SUBMIT RECEIPT
     ========================================================= */

  async function submitReceipt() {
    if (!supplierId) {
      return showToast("Choose a supplier.", "error");
    }

    if (!lines.length) {
      return showToast("Add at least one item to receive.", "error");
    }

    if (lines.some((line) => !line.batchNumber.trim())) {
      return showToast(
        "Every line needs a batch number.",
        "error",
      );
    }

    if (
      lines.some(
        (line) =>
          !line.quantity ||
          Number(line.quantity) <= 0,
      )
    ) {
      return showToast(
        "Every item must have a quantity greater than zero.",
        "error",
      );
    }

    if (
      lines.some(
        (line) =>
          !line.unitCost ||
          Number(line.unitCost) < 0,
      )
    ) {
      return showToast(
        "Every item must have a valid unit cost.",
        "error",
      );
    }

    try {
      const res = await api.post(
        "/purchasing/goods-receipts/receive/",
        {
          supplier_id: supplierId,
          purchase_order_id: poId || null,
          warehouse_id: warehouseId || null,
          supplier_invoice_number: invoiceNumber,
          reference_number: referenceNumber,
          items: lines.map((line) => ({
            product_id: line.productId,
            po_item_id: line.poItemId,
            batch_number: line.batchNumber,
            manufacturing_date: line.manufacturingDate || null,
            expiration_date: line.expirationDate || null,
            quantity: line.quantity,
            unit_cost: line.unitCost,
          })),
        },
      );

      showToast(
        `Goods receipt ${res.data.receipt_number} recorded. Batches and a supplier bill were created automatically.`,
        "success",
      );

      closeCreateForm();

      await loadReceipts();

      const poResponse = await api.get(
        "/purchasing/purchase-orders/",
      );

      setPurchaseOrders(poResponse.data);
    } catch (e: any) {
      showToast(
        e?.response?.data?.detail ||
          "Could not record the goods receipt.",
        "error",
      );
    }
  }

  /* =========================================================
     OPEN FORM
     ========================================================= */

  function openCreateForm() {
    resetForm();
    setShowCreateForm(true);
  }

  /* =========================================================
     KEYBOARD CLOSE
     ========================================================= */

  useEffect(() => {
    if (!showCreateForm) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeCreateForm();
      }
    }

    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("keydown", handleEscape);
    };
  }, [showCreateForm]);

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <div className="receiving-page">
      {/* =====================================================
          PAGE HEADER
          ===================================================== */}

      <div className="page-head">
        <div>
          <div className="receiving-eyebrow">
            <PackageCheck size={14} />
            INVENTORY MANAGEMENT
          </div>

          <h1>Stock Receiving</h1>

          <p>
            Receive stock against a purchase order or record
            standalone supplier deliveries.
          </p>
        </div>
      </div>

      {/* =====================================================
          TOOLBAR
          ===================================================== */}

      <div className="management-toolbar">
        <div className="search">
          <Search size={17} />

          <input
            placeholder="Search receiving history..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

          {search && (
            <button
              type="button"
              className="receiving-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="management-toolbar-right">
          <span className="management-count">
            {loadingReceipts
              ? "Loading..."
              : `${filteredReceipts.length} ${
                  filteredReceipts.length === 1
                    ? "receipt"
                    : "receipts"
                }`}
          </span>

          <button
            type="button"
            className="management-action"
            onClick={openCreateForm}
            disabled={loading}
          >
            <Plus size={16} />
            New Goods Receipt
          </button>
        </div>
      </div>

      {/* =====================================================
          CREATE MODAL
          ===================================================== */}

      {showCreateForm && (
        <div
          className="management-modal-backdrop receiving-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeCreateForm();
            }
          }}
        >
          <div
            className="management-modal management-modal-wide receiving-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="receiving-modal-title"
          >
            {/* MODAL HEADER */}

            <div className="management-modal-header receiving-modal-header">
              <div className="receiving-modal-title">
                <div className="receiving-modal-title-icon">
                  <PackageCheck size={19} />
                </div>

                <div>
                  <h2 id="receiving-modal-title">
                    New Goods Receipt
                  </h2>

                  <p>
                    Add incoming products, assign batches, and
                    record the stock into inventory.
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="management-modal-close"
                onClick={closeCreateForm}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* MODAL BODY */}

            <div className="management-modal-body receiving-modal-body">
              {/* =================================================
                  RECEIPT DETAILS
                  ================================================= */}

              <section className="receiving-details-card">
                <div className="receiving-card-heading">
                  <div>
                    <span className="receiving-step">01</span>

                    <div>
                      <h3>Receipt Details</h3>
                      <p>
                        Identify the supplier and destination
                        before adding products.
                      </p>
                    </div>
                  </div>

                  {poId && (
                    <span className="receiving-context-badge">
                      PO LINKED
                    </span>
                  )}
                </div>

                <div className="receiving-details-grid">
                  {/* SUPPLIER */}

                  <div className="supplier-field">
                    <label>
                      Supplier <span>*</span>
                    </label>

                    <ManagementSelect
                      value={supplierId}
                      onChange={(value) => {
                        setSupplierId(value);
                        setPoId("");
                        setLines([]);
                      }}
                      ariaLabel="Select supplier"
                      options={[
                        {
                          value: "",
                          label: "Select supplier...",
                        },
                        ...suppliers.map((supplier) => ({
                          value: String(supplier.id),
                          label: `${supplier.code} — ${supplier.name}`,
                        })),
                      ]}
                    />
                  </div>

                  {/* PURCHASE ORDER */}

                  <div className="supplier-field">
                    <label>Purchase Order</label>

                    <ManagementSelect
                      value={poId}
                      onChange={(value) => {
                        setPoId(value);
                        setLines([]);
                      }}
                      ariaLabel="Select purchase order"
                      options={[
                        {
                          value: "",
                          label:
                            "No purchase order — standalone",
                        },
                        ...openOrders.map((order) => ({
                          value: String(order.id),
                          label: order.po_number,
                        })),
                      ]}
                    />

                    {supplierId && !openOrders.length && (
                      <span className="receiving-field-hint">
                        No open purchase orders for this supplier.
                      </span>
                    )}
                  </div>

                  {/* WAREHOUSE */}

                  <div className="supplier-field">
                    <label>Receiving Warehouse</label>

                    <ManagementSelect
                      value={warehouseId}
                      onChange={setWarehouseId}
                      ariaLabel="Select receiving warehouse"
                      options={[
                        {
                          value: "",
                          label:
                            "Select warehouse / location...",
                        },
                        ...warehouses.map((warehouse) => ({
                          value: String(warehouse.id),
                          label: `${warehouse.code} — ${warehouse.name}`,
                        })),
                      ]}
                    />
                  </div>

                  {/* INVOICE */}

                  <div className="supplier-field">
                    <label>Supplier Invoice</label>

                    <input
                      value={invoiceNumber}
                      onChange={(event) =>
                        setInvoiceNumber(event.target.value)
                      }
                      placeholder="Enter invoice number"
                    />
                  </div>

                  {/* INTERNAL REFERENCE */}

                  <div className="supplier-field">
                    <label>Internal Reference</label>

                    <input
                      value={referenceNumber}
                      onChange={(event) =>
                        setReferenceNumber(event.target.value)
                      }
                      placeholder="Optional internal reference"
                    />
                  </div>

                  {/* PO LOAD */}

                  {poId && (
                    <div className="receiving-po-action-wrap">
                      <button
                        type="button"
                        className="management-secondary-action receiving-load-po"
                        onClick={loadOutstandingFromPO}
                      >
                        <PackageCheck size={15} />
                        Load outstanding PO items
                      </button>

                      {selectedPurchaseOrder && (
                        <span className="receiving-po-number">
                          {selectedPurchaseOrder.po_number}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* =================================================
                  WORKFLOW
                  ================================================= */}

              <div className="receiving-workflow">
                {/* =================================================
                    PRODUCTS
                    ================================================= */}

                <section className="receiving-products-card">
                  <div className="receiving-card-heading">
                    <div>
                      <span className="receiving-step">02</span>

                      <div>
                        <h3>Products</h3>
                        <p>
                          Select products to add to the receipt.
                        </p>
                      </div>
                    </div>

                    <span className="receiving-card-count">
                      {filteredProducts.length}
                    </span>
                  </div>

                  <div className="receiving-product-search">
                    <Search size={15} />

                    <input
                      value={productSearch}
                      onChange={(event) =>
                        setProductSearch(event.target.value)
                      }
                      placeholder="Search product or SKU..."
                    />

                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch("")}
                        aria-label="Clear product search"
                      >
                        <X size={13} />
                      </button>
                    )}
                  </div>

                  <div className="receiving-product-list">
                    {filteredProducts.map((product) => {
                      const selectedCount = lines.filter(
                        (line) =>
                          line.productId === product.id,
                      ).length;

                      return (
                        <button
                          type="button"
                          className={`receiving-product-card ${
                            selectedCount
                              ? "is-selected"
                              : ""
                          }`}
                          key={product.id}
                          onClick={() =>
                            addManualLine(product)
                          }
                        >
                          <div className="receiving-product-icon">
                            <Package size={16} />
                          </div>

                          <div className="receiving-product-info">
                            <strong>{product.name}</strong>

                            <span>{product.sku}</span>
                          </div>

                          {selectedCount > 0 && (
                            <span className="receiving-selected-count">
                              {selectedCount}
                            </span>
                          )}

                          <span className="receiving-product-add">
                            <Plus size={15} />
                          </span>
                        </button>
                      );
                    })}

                    {!filteredProducts.length && (
                      <div className="receiving-product-empty">
                        <div className="receiving-empty-small-icon">
                          <Search size={18} />
                        </div>

                        <strong>No products found</strong>

                        <span>
                          Try another product name or SKU.
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="receiving-products-footer">
                    <span>
                      Showing up to 15 active products
                    </span>
                  </div>
                </section>

                {/* =================================================
                    CONNECTOR
                    ================================================= */}

                <div className="receiving-flow-arrow">
                  <ArrowRight size={17} />
                </div>

                {/* =================================================
                    ITEMS TO RECEIVE
                    ================================================= */}

                <section className="receiving-items-card">
                  <div className="receiving-card-heading">
                    <div>
                      <span className="receiving-step">03</span>

                      <div>
                        <h3>Items to Receive</h3>
                        <p>
                          Complete the stock and batch details
                          for every selected product.
                        </p>
                      </div>
                    </div>

                    <span className="receiving-card-count">
                      {lines.length}
                    </span>
                  </div>

                  <div className="receiving-items-list">
                    {lines.map((line, index) => (
                      <article
                        key={line.key}
                        className="receiving-item-card"
                      >
                        <div className="receiving-item-top">
                          <div className="receiving-item-number">
                            {String(index + 1).padStart(2, "0")}
                          </div>

                          <div className="receiving-item-product">
                            <strong>
                              {line.productName}
                            </strong>

                            <span>
                              {line.sku}
                            </span>
                          </div>

                          <div className="receiving-item-meta">
                            {line.poItemId ? (
                              <>
                                <span className="receiving-po-badge">
                                  FROM PO
                                </span>

                                <span>
                                  Outstanding:{" "}
                                  <strong>
                                    {line.outstandingQuantity}
                                  </strong>
                                </span>
                              </>
                            ) : (
                              <span className="receiving-manual-badge">
                                MANUAL
                              </span>
                            )}
                          </div>

                          <button
                            type="button"
                            className="receiving-remove-item"
                            onClick={() =>
                              removeLine(line.key)
                            }
                            aria-label={`Remove ${line.productName}`}
                          >
                            <X size={15} />
                          </button>
                        </div>

                        <div className="receiving-item-fields">
                          {/* BATCH */}

                          <div className="receiving-input-group receiving-input-batch">
                            <label>
                              Batch Number <span>*</span>
                            </label>

                            <input
                              value={line.batchNumber}
                              onChange={(event) =>
                                updateLine(line.key, {
                                  batchNumber:
                                    event.target.value,
                                })
                              }
                              placeholder="e.g. BATCH-2026-001"
                            />
                          </div>

                          {/* QUANTITY */}

                          <div className="receiving-input-group receiving-input-quantity">
                            <label>
                              Quantity Received{" "}
                              <span>*</span>
                            </label>

                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.key, {
                                  quantity:
                                    event.target.value,
                                })
                              }
                              placeholder="0"
                            />
                          </div>

                          {/* UNIT COST */}

                          <div className="receiving-input-group receiving-input-cost">
                            <label>
                              Unit Cost <span>*</span>
                            </label>

                            <div className="receiving-currency-input">
                              <span>₱</span>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={line.unitCost}
                                onChange={(event) =>
                                  updateLine(line.key, {
                                    unitCost:
                                      event.target.value,
                                  })
                                }
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* MANUFACTURING */}

                          <div className="receiving-input-group">
                            <label>Manufacturing Date</label>

                            <input
                              type="date"
                              value={
                                line.manufacturingDate
                              }
                              onChange={(event) =>
                                updateLine(line.key, {
                                  manufacturingDate:
                                    event.target.value,
                                })
                              }
                            />
                          </div>

                          {/* EXPIRATION */}

                          <div className="receiving-input-group">
                            <label>
                              Expiration Date
                            </label>

                            <input
                              type="date"
                              value={
                                line.expirationDate
                              }
                              onChange={(event) =>
                                updateLine(line.key, {
                                  expirationDate:
                                    event.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </article>
                    ))}

                    {!lines.length && (
                      <div className="receiving-items-empty">
                        <div className="receiving-empty-box-icon">
                          <ClipboardList size={21} />
                        </div>

                        <strong>
                          No items selected
                        </strong>

                        <span>
                          Select products from the left to
                          start building this receipt.
                        </span>
                      </div>
                    )}
                  </div>

                  {/* TOTAL */}

                  <div className="receiving-summary">
                    <div className="receiving-summary-stat">
                      <span>Items</span>
                      <strong>{lines.length}</strong>
                    </div>

                    <div className="receiving-summary-divider" />

                    <div className="receiving-summary-stat">
                      <span>Total Quantity</span>
                      <strong>{totalQuantity}</strong>
                    </div>

                    <div className="receiving-summary-divider" />

                    <div className="receiving-total">
                      <span>Total Received Value</span>
                      <strong>
                        ₱{total.toFixed(2)}
                      </strong>
                    </div>
                  </div>

                  {/* VALIDATION NOTICE */}

                  {lines.some(
                    (line) =>
                      !line.batchNumber.trim(),
                  ) && lines.length > 0 && (
                    <div className="receiving-validation-notice">
                      <AlertCircle size={15} />

                      <span>
                        Complete the required batch numbers
                        before recording this receipt.
                      </span>
                    </div>
                  )}

                  {/* SUBMIT */}

                  <button
                    type="button"
                    className="receiving-submit"
                    onClick={submitReceipt}
                    disabled={!lines.length}
                  >
                    <PackageCheck size={17} />
                    Record Goods Receipt
                  </button>

                  <p className="receiving-submit-note">
                    Recording this receipt will create the
                    inventory batches and supplier bill
                    automatically.
                  </p>
                </section>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          RECEIVING HISTORY
          ===================================================== */}

      <section className="receiving-orders-history">
        <div className="receiving-orders-history-head">
          <div>
            <h2>Receiving History</h2>
            <p>
              Previously recorded supplier deliveries and
              inventory receipts.
            </p>
          </div>

          <button
            type="button"
            className="receiving-history-refresh"
            onClick={loadReceipts}
            disabled={loadingReceipts}
            aria-label="Refresh receiving history"
          >
            <RefreshCw
              size={15}
              className={
                loadingReceipts
                  ? "receiving-spin"
                  : ""
              }
            />
          </button>
        </div>

        {error && (
          <div className="receiving-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {loading
          ? (
            <div className="receiving-loading">
              <div className="receiving-loading-spinner" />

              <div>
                <strong>
                  Loading receiving orders
                </strong>

                <span>
                  Please wait a moment...
                </span>
              </div>
            </div>
          )
          : filteredReceipts.length === 0
            ? (
              <div className="receiving-empty">
                <div className="receiving-empty-icon">
                  <PackageCheck size={22} />
                </div>

                <h3>
                  {search
                    ? "No receiving orders found"
                    : "No receiving orders yet"}
                </h3>

                <p>
                  {search
                    ? "Try changing your search."
                    : "Completed receiving orders will appear here."}
                </p>

                {!search && (
                  <button
                    type="button"
                    className="receiving-empty-action"
                    onClick={openCreateForm}
                  >
                    <Plus size={15} />
                    Create first receipt
                  </button>
                )}
              </div>
            )
            : (
              <div className="receiving-orders-table-wrap">
                <table className="receiving-orders-table">
                  <thead>
                    <tr>
                      <th>Receipt #</th>
                      <th>Supplier</th>
                      <th>PO</th>
                      <th>Warehouse</th>
                      <th>Invoice #</th>
                      <th>Received By</th>
                      <th>Items</th>
                      <th>Date</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredReceipts.map((receipt) => (
                      <tr key={receipt.id}>
                        <td>
                          <div className="receiving-receipt-number">
                            <div className="receiving-receipt-icon">
                              <PackageCheck size={14} />
                            </div>

                            <strong>
                              {receipt.receipt_number}
                            </strong>
                          </div>
                        </td>

                        <td>
                          <span className="receiving-table-primary">
                            {receipt.supplier_name}
                          </span>
                        </td>

                        <td>
                          {receipt.po_number ? (
                            <span className="receiving-table-po">
                              {receipt.po_number}
                            </span>
                          ) : (
                            <span className="receiving-muted">
                              Standalone
                            </span>
                          )}
                        </td>

                        <td>
                          {receipt.warehouse_name || (
                            <span className="receiving-muted">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          {receipt.supplier_invoice_number || (
                            <span className="receiving-muted">
                              —
                            </span>
                          )}
                        </td>

                        <td>
                          {receipt.received_by_name ||
                            receipt.received_by || (
                              <span className="receiving-muted">
                                —
                              </span>
                            )}
                        </td>

                        <td>
                          <div className="receiving-table-items">
                            {receipt.items
                              .map(
                                (item) =>
                                  `${item.product_name} ×${item.quantity}`,
                              )
                              .join(", ")}
                          </div>
                        </td>

                        <td>
                          <span className="receiving-date">
                            {receipt.received_date}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
      </section>
    </div>
  );
}