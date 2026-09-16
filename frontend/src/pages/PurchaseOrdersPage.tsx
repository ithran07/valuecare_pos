import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Package,
  Plus,
  Search,
  ShoppingCart,
  X,
} from "lucide-react";
import { api } from "../api";
import type { Product, PurchaseOrder, Supplier } from "../types";
import { useToast } from "../ToastContext";
import ManagementSelect from "../components/ManagementSelect";
import "../style/purchase-orders.css";

interface PurchaseOrderLine {
  product_id: number;
  quantity: number;
  unit_cost: number;
}

export default function PurchaseOrdersPage() {
  const { showToast } = useToast();

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);

  const [supplierId, setSupplierId] = useState("");
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");

  const [search, setSearch] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const [lines, setLines] = useState<PurchaseOrderLine[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [submittingId, setSubmittingId] = useState<number | null>(null);

  async function loadOrders() {
    try {
      setLoading(true);

      const response = await api.get("/purchasing/purchase-orders/");
      setOrders(response.data);
    } catch {
      showToast("Failed to load purchase orders.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function loadData() {
    try {
      const [supplierResponse, productResponse] = await Promise.all([
        api.get("/purchasing/suppliers/?active=true"),
        api.get("/products/?active=true"),
      ]);

      setSuppliers(supplierResponse.data);
      setProducts(productResponse.data);
    } catch {
      showToast("Failed to load suppliers or products.", "error");
    }
  }

  useEffect(() => {
    loadOrders();
    loadData();
  }, []);

  const filteredOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return orders;

    return orders.filter((order) => {
      return (
        String(order.id).includes(value) ||
        order.supplier_name?.toLowerCase().includes(value) ||
        order.status?.toLowerCase().includes(value)
      );
    });
  }, [orders, search]);

  const filteredProducts = useMemo(() => {
    const value = productSearch.trim().toLowerCase();

    if (!value) return products;

    return products.filter((product) => {
      return (
        product.name?.toLowerCase().includes(value) ||
        product.sku?.toLowerCase().includes(value)
      );
    });
  }, [products, productSearch]);

  function addLine(product: Product) {
    const existing = lines.find(
      (line) => line.product_id === product.id,
    );

    if (existing) {
      setLines((current) =>
        current.map((line) =>
          line.product_id === product.id
            ? {
                ...line,
                quantity: line.quantity + 1,
              }
            : line,
        ),
      );

      return;
    }

    setLines((current) => [
      ...current,
      {
        product_id: product.id,
        quantity: 1,
        unit_cost: Number(product.cost_price ?? 0),
      },
    ]);
  }

  function updateLine(
    productId: number,
    field: "quantity" | "unit_cost",
    value: number,
  ) {
    setLines((current) =>
      current.map((line) =>
        line.product_id === productId
          ? {
              ...line,
              [field]: value,
            }
          : line,
      ),
    );
  }

  function removeLine(productId: number) {
    setLines((current) =>
      current.filter((line) => line.product_id !== productId),
    );
  }

  function clearLines() {
    setLines([]);
  }

  const total = useMemo(() => {
    return lines.reduce(
      (sum, line) => sum + line.quantity * line.unit_cost,
      0,
    );
  }, [lines]);

  const totalQuantity = useMemo(() => {
    return lines.reduce((sum, line) => sum + line.quantity, 0);
  }, [lines]);

  function getProduct(productId: number) {
    return products.find((product) => product.id === productId);
  }

  function resetCreateForm() {
    setSupplierId("");
    setExpectedDate("");
    setNotes("");
    setProductSearch("");
    setLines([]);
  }

  function closeCreateForm() {
    if (creating) return;

    setShowCreateForm(false);
    resetCreateForm();
  }

  async function createOrder(e: FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      showToast("Please select a supplier.", "error");
      return;
    }

    if (lines.length === 0) {
      showToast("Please add at least one product.", "error");
      return;
    }

    try {
      setCreating(true);

      const response = await api.post(
        "/purchasing/purchase-orders/",
        {
          supplier_id: Number(supplierId),
          expected_date: expectedDate || null,
          notes,
          items: lines.map((line) => ({
            product_id: line.product_id,
            quantity_ordered: line.quantity,
            unit_cost: line.unit_cost,
          })),
        },
      );

      setOrders((current) => [response.data, ...current]);

      showToast(
        "Purchase order created successfully.",
        "success",
      );

      setShowCreateForm(false);
      resetCreateForm();
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        "Failed to create purchase order.";

      showToast(message, "error");
    } finally {
      setCreating(false);
    }
  }

  async function submitOrder(orderId: number) {
    try {
      setSubmittingId(orderId);

      const response = await api.post(
        `/purchasing/purchase-orders/${orderId}/submit/`,
      );

      setOrders((current) =>
        current.map((order) =>
          order.id === orderId ? response.data : order,
        ),
      );

      showToast(
        "Purchase order submitted successfully.",
        "success",
      );
    } catch (error: any) {
      const message =
        error?.response?.data?.detail ||
        "Failed to submit purchase order.";

      showToast(message, "error");
    } finally {
      setSubmittingId(null);
    }
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency: "PHP",
    }).format(value);
  }

  function formatDate(date?: string | null) {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return date;
    }

    return parsed.toLocaleDateString("en-PH", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getStatusClass(status?: string) {
    switch (status?.toLowerCase()) {
      case "draft":
        return "draft";
      case "submitted":
        return "submitted";
      case "approved":
        return "approved";
      case "received":
        return "received";
      case "cancelled":
        return "cancelled";
      default:
        return "";
    }
  }

  return (
    <div className="purchase-orders-page">
      {/* PAGE HEADER */}
      <div className="purchase-orders-page-head">
        <div>
          <span className="purchase-orders-eyebrow">
            PROCUREMENT
          </span>

          <h1>Purchase Orders</h1>

          <p>
            Create and manage supplier orders before stock
            arrives at your warehouse.
          </p>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="purchase-orders-toolbar">
        <div className="purchase-orders-search">
          <Search size={17} />

          <input
            type="text"
            placeholder="Search purchase orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={15} />
            </button>
          )}
        </div>

        <div className="purchase-orders-toolbar-right">
          <span className="purchase-orders-count">
            {filteredOrders.length}{" "}
            {filteredOrders.length === 1 ? "order" : "orders"}
          </span>

          <button
            type="button"
            className="purchase-orders-new-button"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={17} />
            New Purchase Order
          </button>
        </div>
      </div>

      {/* HISTORY */}
      <section className="purchase-orders-history">
        <div className="purchase-orders-history-head">
          <div>
            <h2>Purchase Order History</h2>
            <p>
              Track supplier orders and their current status.
            </p>
          </div>

          <ClipboardList size={19} />
        </div>

        {loading ? (
          <div className="purchase-loading">
            <div className="purchase-loading-spinner" />

            <div>
              <strong>Loading purchase orders</strong>
              <span>Please wait a moment...</span>
            </div>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="purchase-empty">
            <div className="purchase-empty-icon">
              <ClipboardList size={22} />
            </div>

            <h3>
              {search
                ? "No purchase orders found"
                : "No purchase orders yet"}
            </h3>

            <p>
              {search
                ? "Try changing your search."
                : "Create your first purchase order to get started."}
            </p>

            {!search && (
              <button
                type="button"
                className="purchase-empty-action"
                onClick={() => setShowCreateForm(true)}
              >
                <Plus size={15} />
                Create Purchase Order
              </button>
            )}
          </div>
        ) : (
          <div className="purchase-orders-table-wrap">
            <table className="purchase-orders-table">
              <thead>
                <tr>
                  <th>PO Number</th>
                  <th>Supplier</th>
                  <th>Expected Date</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="purchase-orders-number">
                        PO-{String(order.id).padStart(5, "0")}
                      </span>
                    </td>

                    <td>
                      <div className="purchase-supplier-cell">
                        <span className="purchase-supplier-avatar">
                          {(order.supplier_name || "S")
                            .charAt(0)
                            .toUpperCase()}
                        </span>

                        <span>
                          {order.supplier_name ||
                            "Unknown supplier"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span className="purchase-date-cell">
                        <CalendarDays size={14} />
                        {formatDate(order.expected_date)}
                      </span>
                    </td>

                    <td>
                      <strong className="purchase-total-cell">
                        {formatCurrency(
                          Number(order.total ?? 0),
                        )}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`purchase-orders-status ${getStatusClass(
                          order.status,
                        )}`}
                      >
                        <span className="purchase-status-dot" />
                        {order.status || "Unknown"}
                      </span>
                    </td>

                    <td>
                      {formatDate(order.created_at)}
                    </td>

                    <td>
                      {order.status?.toLowerCase() ===
                        "draft" && (
                        <button
                          type="button"
                          className="purchase-orders-submit-button"
                          disabled={
                            submittingId === order.id
                          }
                          onClick={() =>
                            submitOrder(order.id)
                          }
                        >
                          {submittingId === order.id
                            ? "Submitting..."
                            : "Submit"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* CREATE MODAL */}
      {showCreateForm && (
        <div
          className="purchase-orders-modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              closeCreateForm();
            }
          }}
        >
          <div className="purchase-orders-modal">
            {/* MODAL HEADER */}
            <div className="purchase-orders-modal-header">
              <div>
                <span className="purchase-modal-eyebrow">
                  NEW PROCUREMENT
                </span>

                <h2>Create Purchase Order</h2>

                <p>
                  Select a supplier, choose products, and define
                  the quantities you need.
                </p>
              </div>

              <button
                type="button"
                className="purchase-orders-modal-close"
                onClick={closeCreateForm}
                disabled={creating}
                aria-label="Close"
              >
                <X size={19} />
              </button>
            </div>

            <form
              className="purchase-orders-modal-body"
              onSubmit={createOrder}
            >
              {/* TOP DETAILS */}
              <section className="purchase-order-details">
                <div className="purchase-section-title">
                  <div className="purchase-section-icon">
                    <ClipboardList size={16} />
                  </div>

                  <div>
                    <h3>Order Details</h3>
                    <p>Basic information for this purchase.</p>
                  </div>
                </div>

                <div className="purchase-orders-form-grid">
                  <div className="purchase-orders-field">
                    <label htmlFor="purchase-order-supplier">
                      Supplier <span>*</span>
                    </label>

                    <ManagementSelect
                      value={supplierId}
                      onChange={setSupplierId}
                      options={suppliers.map((supplier) => ({
                        value: String(supplier.id),
                        label: supplier.name,
                      }))}
                      placeholder="Select supplier"
                    />
                  </div>

                  <div className="purchase-orders-field">
                    <label htmlFor="purchase-order-date">
                      Expected Date
                    </label>

                    <div className="purchase-input-icon">
                      <CalendarDays size={15} />

                      <input
                        id="purchase-order-date"
                        type="date"
                        value={expectedDate}
                        onChange={(e) =>
                          setExpectedDate(e.target.value)
                        }
                      />
                    </div>
                  </div>

                  <div className="purchase-orders-field purchase-orders-field-wide">
                    <label htmlFor="purchase-order-notes">
                      Notes
                    </label>

                    <textarea
                      id="purchase-order-notes"
                      placeholder="Add notes for this supplier order..."
                      value={notes}
                      onChange={(e) =>
                        setNotes(e.target.value)
                      }
                      rows={2}
                    />
                  </div>
                </div>
              </section>

              {/* PRODUCT WORKSPACE */}
              <section className="purchase-workspace">
                {/* PRODUCTS */}
                <div className="purchase-products-panel">
                  <div className="purchase-panel-header">
                    <div>
                      <span className="purchase-panel-kicker">
                        STEP 01
                      </span>

                      <h3>Select Products</h3>

                      <p>
                        Add the products you want to order.
                      </p>
                    </div>

                    <div className="purchase-panel-count">
                      {filteredProducts.length}
                    </div>
                  </div>

                  <div className="purchase-orders-product-search">
                    <Search size={16} />

                    <input
                      type="text"
                      placeholder="Search by product or SKU..."
                      value={productSearch}
                      onChange={(e) =>
                        setProductSearch(e.target.value)
                      }
                    />

                    {productSearch && (
                      <button
                        type="button"
                        onClick={() => setProductSearch("")}
                        aria-label="Clear product search"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  <div className="purchase-orders-product-grid">
                    {filteredProducts.length === 0 ? (
                      <div className="purchase-products-empty">
                        <Package size={22} />
                        <strong>No products found</strong>
                        <span>
                          Try a different product name or SKU.
                        </span>
                      </div>
                    ) : (
                      filteredProducts.map((product) => {
                        const selected = lines.some(
                          (line) =>
                            line.product_id === product.id,
                        );

                        return (
                          <button
                            type="button"
                            key={product.id}
                            className={`purchase-orders-product ${
                              selected ? "selected" : ""
                            }`}
                            onClick={() => addLine(product)}
                          >
                            <div className="purchase-product-icon">
                              <Package size={16} />
                            </div>

                            <div className="purchase-product-content">
                              <strong>{product.name}</strong>

                              <span>
                                {product.sku || "No SKU"}
                              </span>
                            </div>

                            <div className="purchase-product-action">
                              {selected ? (
                                <span className="purchase-product-added">
                                  Added
                                </span>
                              ) : (
                                <Plus size={15} />
                              )}
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* SELECTED ITEMS */}
                <div className="purchase-selected-panel">
                  <div className="purchase-panel-header">
                    <div>
                      <span className="purchase-panel-kicker">
                        STEP 02
                      </span>

                      <h3>Order Items</h3>

                      <p>
                        Review quantities and unit costs.
                      </p>
                    </div>

                    <div className="purchase-selected-summary">
                      <strong>{lines.length}</strong>
                      <span>
                        {lines.length === 1
                          ? "item"
                          : "items"}
                      </span>
                    </div>
                  </div>

                  {lines.length > 0 && (
                    <div className="purchase-items-columns">
                      <span>PRODUCT</span>
                      <span>QTY</span>
                      <span>UNIT COST</span>
                      <span>TOTAL</span>
                      <span />
                    </div>
                  )}

                  <div className="purchase-orders-cart-list">
                    {lines.length === 0 ? (
                      <div className="purchase-orders-cart-empty">
                        <div className="purchase-cart-empty-icon">
                          <ShoppingCart size={21} />
                        </div>

                        <strong>No products selected</strong>

                        <span>
                          Choose products from the left to build
                          this purchase order.
                        </span>
                      </div>
                    ) : (
                      lines.map((line) => {
                        const product = getProduct(
                          line.product_id,
                        );

                        if (!product) return null;

                        return (
                          <div
                            className="purchase-orders-cart-row"
                            key={line.product_id}
                          >
                            <div className="purchase-orders-cart-info">
                              <div className="purchase-cart-product-icon">
                                <Package size={15} />
                              </div>

                              <div>
                                <strong>
                                  {product.name}
                                </strong>

                                <span>
                                  {product.sku || "No SKU"}
                                </span>
                              </div>
                            </div>

                            <div className="purchase-cart-input-group">
                              <label>Qty</label>

                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={line.quantity}
                                onChange={(e) =>
                                  updateLine(
                                    line.product_id,
                                    "quantity",
                                    Math.max(
                                      1,
                                      Number(
                                        e.target.value,
                                      ) || 1,
                                    ),
                                  )
                                }
                              />
                            </div>

                            <div className="purchase-cart-input-group">
                              <label>Unit Cost</label>

                              <div className="purchase-cost-input">
                                <span>₱</span>

                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  value={line.unit_cost}
                                  onChange={(e) =>
                                    updateLine(
                                      line.product_id,
                                      "unit_cost",
                                      Math.max(
                                        0,
                                        Number(
                                          e.target.value,
                                        ) || 0,
                                      ),
                                    )
                                  }
                                />
                              </div>
                            </div>

                            <div className="purchase-line-total">
                              <span>Total</span>

                              <strong>
                                {formatCurrency(
                                  line.quantity *
                                    line.unit_cost,
                                )}
                              </strong>
                            </div>

                            <button
                              type="button"
                              className="purchase-orders-remove-line"
                              onClick={() =>
                                removeLine(
                                  line.product_id,
                                )
                              }
                              aria-label={`Remove ${product.name}`}
                            >
                              <X size={15} />
                            </button>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {lines.length > 0 && (
                    <button
                      type="button"
                      className="purchase-orders-clear-button"
                      onClick={clearLines}
                    >
                      Clear all items
                    </button>
                  )}
                </div>
              </section>

              {/* FOOTER SUMMARY */}
              <div className="purchase-order-footer">
                <div className="purchase-footer-stat">
                  <span>Products</span>
                  <strong>{lines.length}</strong>
                </div>

                <div className="purchase-footer-stat">
                  <span>Total quantity</span>
                  <strong>{totalQuantity}</strong>
                </div>

                <div className="purchase-footer-total">
                  <span>Total order value</span>
                  <strong>{formatCurrency(total)}</strong>
                </div>

                <button
                  type="submit"
                  className="purchase-orders-create-button"
                  disabled={creating}
                >
                  {creating ? (
                    <>
                      <span className="purchase-button-spinner" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <ClipboardList size={16} />
                      Create Purchase Order
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}