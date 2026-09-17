import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock3,
  Mail,
  MapPin,
  Package,
  Phone,
  Search,
  ShoppingCart,
  UserRound,
  X,
} from "lucide-react";

import { api } from "../api";
import { Customer, WebOrder } from "../types";
import { useToast } from "../ToastContext";
import "../style/web-orders.css";

type OrderStatus =
  | "PENDING"
  | "CONTACTED"
  | "CONFIRMED"
  | "CANCELLED";

const statusLabels: Record<OrderStatus, string> = {
  PENDING: "Pending",
  CONTACTED: "Contacted",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
};

const statusOptions: OrderStatus[] = [
  "PENDING",
  "CONTACTED",
  "CONFIRMED",
  "CANCELLED",
];

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-PH", {
    style: "currency",
    currency: "PHP",
  }).format(Number(value) || 0);
}

function formatDate(value: string) {
  if (!value) return "—";

  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getCustomerTypeLabel(type: string) {
  return type
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDeliveryAddress(
  value: string | null | undefined,
) {
  if (!value?.trim()) {
    return [];
  }

  const lines = value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line) =>
    line.replace(
      /,\s*([^,\n]+),\s*\1(?=\s+\d{4}\b)/i,
      ", $1",
    ),
  );
}

function getInitials(
  businessName?: string | null,
  contactName?: string | null,
) {
  const name = businessName || contactName || "Customer";

  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

export default function WebOrdersPage() {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] =
    useState(true);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<OrderStatus | "ALL">("ALL");

  const [selectedOrder, setSelectedOrder] =
    useState<WebOrder | null>(null);

  const [selectedCustomerCode, setSelectedCustomerCode] =
    useState("");

  const [saving, setSaving] = useState(false);

  async function loadOrders() {
    try {
      setLoading(true);

      const response = await api.get<WebOrder[]>(
        "/web-orders/?status=PENDING,CONTACTED,CONFIRMED,CANCELLED",
      );

      setOrders(response.data);
    } catch (error: any) {
      console.error(error);

      showToast?.(
        error?.response?.data?.detail ||
          "Failed to load website orders.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      setCustomersLoading(true);

      const response = await api.get<Customer[]>(
        "/customers/?active=true",
      );

      setCustomers(response.data);
    } catch (error) {
      console.error(error);

      showToast?.(
        "Failed to load POS customers.",
        "error",
      );
    } finally {
      setCustomersLoading(false);
    }
  }

  useEffect(() => {
    loadOrders();
    loadCustomers();
  }, []);

  function openOrder(order: WebOrder) {
    setSelectedOrder(order);

    setSelectedCustomerCode(
      order.matched_pos_customer_code || "",
    );
  }

  function closeOrder() {
    if (saving) return;

    setSelectedOrder(null);
    setSelectedCustomerCode("");
  }

  async function updateOrder(
    changes: {
      status?: OrderStatus;
      matched_pos_customer_code?: string | null;
    },
  ) {
    if (!selectedOrder) return;

    try {
      setSaving(true);

      const response = await api.patch<WebOrder>(
        `/web-orders/${selectedOrder.id}/`,
        changes,
      );

      setSelectedOrder(response.data);

      setOrders((current) =>
        current.map((order) =>
          order.id === response.data.id
            ? response.data
            : order,
        ),
      );

      if (
        changes.matched_pos_customer_code !== undefined
      ) {
        setSelectedCustomerCode(
          changes.matched_pos_customer_code || "",
        );
      }

      showToast?.(
        "Web order updated successfully.",
        "success",
      );
    } catch (error: any) {
      console.error(error);

      showToast?.(
        error?.response?.data?.detail ||
          "Failed to update web order.",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  const visibleOrders = useMemo(() => {
    const value = search.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        order.status === statusFilter;

      if (!matchesStatus) return false;

      if (!value) return true;

      return [
        order.order_number,
        order.business_name,
        order.contact_name,
        order.email,
        order.phone,
      ]
        .join(" ")
        .toLowerCase()
        .includes(value);
    });
  }, [orders, search, statusFilter]);

  const counts = useMemo(() => {
    return {
      all: orders.length,

      pending: orders.filter(
        (order) => order.status === "PENDING",
      ).length,

      contacted: orders.filter(
        (order) => order.status === "CONTACTED",
      ).length,

      confirmed: orders.filter(
        (order) => order.status === "CONFIRMED",
      ).length,

      cancelled: orders.filter(
        (order) => order.status === "CANCELLED",
      ).length,
    };
  }, [orders]);

  function getCustomerName(code: string | null) {
    if (!code) return "";

    return (
      customers.find(
        (customer) => customer.code === code,
      )?.business_name || ""
    );
  }

  const selectedAddress = selectedOrder
    ? formatDeliveryAddress(
        selectedOrder.delivery_address,
      )
    : [];

  return (
    <div className="web-orders-page">
      {/* =====================================================
          PAGE HEADER
      ====================================================== */}
      <header className="web-orders-header">
        <div>
          <div className="web-orders-header-label">
            <span className="web-orders-header-dot" />
            Website Management
          </div>

          <h1>Web Orders</h1>

          <p>
            Review, manage, and process orders submitted
            through the ValueCare website.
          </p>
        </div>
      </header>

      {/* =====================================================
          ORDER OVERVIEW
      ====================================================== */}
      <section className="web-orders-overview">
        <button
          type="button"
          className={`web-order-overview-card ${
            statusFilter === "ALL" ? "selected" : ""
          }`}
          onClick={() => setStatusFilter("ALL")}
        >
          <div className="web-order-overview-icon all">
            <ShoppingCart size={19} />
          </div>

          <div className="web-order-overview-content">
            <span>Total Orders</span>
            <strong>{counts.all}</strong>
          </div>

          <span className="web-order-overview-arrow">
            →
          </span>
        </button>

        <button
          type="button"
          className={`web-order-overview-card ${
            statusFilter === "PENDING" ? "selected" : ""
          }`}
          onClick={() => setStatusFilter("PENDING")}
        >
          <div className="web-order-overview-icon pending">
            <Clock3 size={19} />
          </div>

          <div className="web-order-overview-content">
            <span>Pending</span>
            <strong>{counts.pending}</strong>
          </div>

          <span className="web-order-overview-arrow">
            →
          </span>
        </button>

        <button
          type="button"
          className={`web-order-overview-card ${
            statusFilter === "CONTACTED"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("CONTACTED")}
        >
          <div className="web-order-overview-icon contacted">
            <Phone size={19} />
          </div>

          <div className="web-order-overview-content">
            <span>Contacted</span>
            <strong>{counts.contacted}</strong>
          </div>

          <span className="web-order-overview-arrow">
            →
          </span>
        </button>

        <button
          type="button"
          className={`web-order-overview-card ${
            statusFilter === "CONFIRMED"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("CONFIRMED")}
        >
          <div className="web-order-overview-icon confirmed">
            <Check size={19} />
          </div>

          <div className="web-order-overview-content">
            <span>Confirmed</span>
            <strong>{counts.confirmed}</strong>
          </div>

          <span className="web-order-overview-arrow">
            →
          </span>
        </button>

        <button
          type="button"
          className={`web-order-overview-card ${
            statusFilter === "CANCELLED"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("CANCELLED")}
        >
          <div className="web-order-overview-icon cancelled">
            <X size={19} />
          </div>

          <div className="web-order-overview-content">
            <span>Cancelled</span>
            <strong>{counts.cancelled}</strong>
          </div>

          <span className="web-order-overview-arrow">
            →
          </span>
        </button>
      </section>

      {/* =====================================================
          ORDERS
      ====================================================== */}
      <section className="web-orders-panel">
        <div className="web-orders-panel-header">
          <div>
            <h2>Website Orders</h2>

            <p>
              Select an order to view its details and
              update its status.
            </p>
          </div>

          <span className="web-orders-result-count">
            {visibleOrders.length}{" "}
            {visibleOrders.length === 1
              ? "order"
              : "orders"}
          </span>
        </div>

        <div className="web-orders-toolbar">
          <div className="web-orders-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search order number, customer, email..."
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
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
        </div>

        {loading ? (
          <div className="web-orders-loading">
            <div className="web-orders-loading-spinner" />

            <div>
              <strong>Loading web orders</strong>

              <span>
                Fetching the latest website orders...
              </span>
            </div>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="web-orders-empty">
            <div className="web-orders-empty-icon">
              <ShoppingCart size={25} />
            </div>

            <h3>
              {search
                ? "No orders found"
                : statusFilter !== "ALL"
                  ? `No ${statusLabels[statusFilter].toLowerCase()} orders`
                  : "No web orders yet"}
            </h3>

            <p>
              {search
                ? "Try searching with a different order number or customer."
                : "Orders submitted through the ValueCare website will appear here."}
            </p>

            {search && (
              <button
                type="button"
                className="web-orders-empty-action"
                onClick={() => setSearch("")}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="web-orders-table-wrap">
            <table className="web-orders-table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Submitted</th>
                </tr>
              </thead>

              <tbody>
                {visibleOrders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => openOrder(order)}
                    className="web-order-row"
                  >
                    <td>
                      <div className="web-order-id-cell">
                        <span className="web-order-id-icon">
                          <ShoppingCart size={14} />
                        </span>

                        <div>
                          <strong>
                            {order.order_number}
                          </strong>

                          <span>
                            View details
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <div className="web-order-customer">
                        <div className="web-order-avatar">
                          {getInitials(
                            order.business_name,
                            order.contact_name,
                          )}
                        </div>

                        <div>
                          <strong>
                            {order.business_name ||
                              "Individual Customer"}
                          </strong>

                          <span>
                            {order.contact_name ||
                              "No contact name"}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="web-order-item-count">
                        {order.items.length}

                        <span>
                          {order.items.length === 1
                            ? "item"
                            : "items"}
                        </span>
                      </span>
                    </td>

                    <td>
                      <strong className="web-order-total-value">
                        {formatCurrency(order.total)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`web-order-status ${order.status.toLowerCase()}`}
                      >
                        <span className="web-order-status-dot" />
                        {statusLabels[order.status]}
                      </span>
                    </td>

                    <td>
                      <span className="web-order-date">
                        {formatDate(order.created_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* =====================================================
          ORDER DETAIL MODAL
      ====================================================== */}
      {selectedOrder && (
        <div
          className="web-order-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !saving
            ) {
              closeOrder();
            }
          }}
        >
          <div
            className="web-order-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="web-order-modal-title"
          >
            {/* MODAL HEADER */}
            <div className="web-order-modal-header">
              <div className="web-order-modal-heading">
                <div className="web-order-modal-order-icon">
                  <ShoppingCart size={20} />
                </div>

                <div>
                  <span className="web-order-modal-eyebrow">
                    Website Order
                  </span>

                  <h2 id="web-order-modal-title">
                    {selectedOrder.order_number}
                  </h2>

                  <span className="web-order-modal-date">
                    Submitted{" "}
                    {formatDate(
                      selectedOrder.created_at,
                    )}
                  </span>
                </div>
              </div>

              <div className="web-order-modal-header-actions">
                <span
                  className={`web-order-status ${selectedOrder.status.toLowerCase()}`}
                >
                  <span className="web-order-status-dot" />
                  {statusLabels[
                    selectedOrder.status
                  ]}
                </span>

                <button
                  type="button"
                  className="web-order-modal-close"
                  onClick={closeOrder}
                  disabled={saving}
                  aria-label="Close order details"
                >
                  <X size={19} />
                </button>
              </div>
            </div>

            {/* MODAL BODY */}
            <div className="web-order-modal-body">
              {/* CUSTOMER INFORMATION */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <div className="web-order-section-icon">
                    <UserRound size={16} />
                  </div>

                  <div>
                    <h3>Customer Information</h3>

                    <p>
                      Contact and customer details
                    </p>
                  </div>
                </div>

                <div className="web-order-customer-card">
                  <div className="web-order-large-avatar">
                    {getInitials(
                      selectedOrder.business_name,
                      selectedOrder.contact_name,
                    )}
                  </div>

                  <div className="web-order-customer-main">
                    <strong>
                      {selectedOrder.business_name ||
                        "Individual Customer"}
                    </strong>

                    <span>
                      {selectedOrder.contact_name ||
                        "No contact person"}
                    </span>
                  </div>

                  <div className="web-order-customer-type">
                    {getCustomerTypeLabel(
                      selectedOrder.customer_type,
                    )}
                  </div>
                </div>

                <div className="web-order-info-grid">
                  <div className="web-order-info-item">
                    <span>Contact Person</span>

                    <strong>
                      {selectedOrder.contact_name ||
                        "Not provided"}
                    </strong>
                  </div>

                  <div className="web-order-info-item">
                    <span>Phone Number</span>

                    <strong>
                      {selectedOrder.phone ||
                        "Not provided"}
                    </strong>
                  </div>

                  <div className="web-order-info-item">
                    <span>Email Address</span>

                    <strong>
                      {selectedOrder.email ||
                        "Not provided"}
                    </strong>
                  </div>
                </div>

                {/* DELIVERY ADDRESS */}
                <div className="web-order-address-card">
                  <div className="web-order-address-heading">
                    <div className="web-order-address-icon">
                      <MapPin size={16} />
                    </div>

                    <div>
                      <strong>Delivery Address</strong>

                      <span>
                        Shipping destination provided
                        by the customer
                      </span>
                    </div>
                  </div>

                  {selectedAddress.length > 0 ? (
                    <div className="web-order-address">
                      {selectedAddress.map(
                        (line, index) => (
                          <div
                            key={`${line}-${index}`}
                          >
                            {line}
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="web-order-address-empty">
                      Not provided
                    </div>
                  )}
                </div>
              </section>

              {/* ORDER ITEMS */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <div className="web-order-section-icon">
                    <Package size={16} />
                  </div>

                  <div>
                    <h3>Order Items</h3>

                    <p>
                      Products included in this order
                    </p>
                  </div>
                </div>

                <div className="web-order-items">
                  {selectedOrder.items.map(
                    (item, index) => (
                      <div
                        className="web-order-item"
                        key={`${item.product_id}-${index}`}
                      >
                        <div className="web-order-item-number">
                          {String(index + 1).padStart(
                            2,
                            "0",
                          )}
                        </div>

                        <div className="web-order-item-details">
                          <strong>
                            {item.product_name}
                          </strong>

                          <span>
                            SKU: {item.product_sku}
                          </span>
                        </div>

                        <div className="web-order-item-quantity">
                          <span>
                            {item.quantity}
                          </span>

                          <small>qty</small>
                        </div>

                        <div className="web-order-item-price">
                          <span>
                            {formatCurrency(
                              item.unit_price,
                            )}
                          </span>

                          <strong>
                            {formatCurrency(
                              item.line_total,
                            )}
                          </strong>
                        </div>
                      </div>
                    ),
                  )}
                </div>

                <div className="web-order-summary">
                  <span>Order Total</span>

                  <strong>
                    {formatCurrency(
                      selectedOrder.total,
                    )}
                  </strong>
                </div>
              </section>

              {/* CUSTOMER NOTES */}
              {selectedOrder.notes && (
                <section className="web-order-detail-section">
                  <div className="web-order-section-title">
                    <div className="web-order-section-icon">
                      <Mail size={16} />
                    </div>

                    <div>
                      <h3>Customer Notes</h3>

                      <p>
                        Additional information from
                        the customer
                      </p>
                    </div>
                  </div>

                  <div className="web-order-notes">
                    {selectedOrder.notes}
                  </div>
                </section>
              )}

              {/* POS CUSTOMER MATCH */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <div className="web-order-section-icon">
                    <UserRound size={16} />
                  </div>

                  <div>
                    <h3>POS Customer</h3>

                    <p>
                      Link this website order to an
                      existing POS customer
                    </p>
                  </div>
                </div>

                <div className="web-order-match-card">
                  <div className="web-order-match-icon">
                    <UserRound size={18} />
                  </div>

                  <div className="web-order-match-content">
                    <span>Customer Record</span>

                    <select
                      value={selectedCustomerCode}
                      onChange={(event) =>
                        setSelectedCustomerCode(
                          event.target.value,
                        )
                      }
                      disabled={
                        customersLoading || saving
                      }
                    >
                      <option value="">
                        Select POS customer...
                      </option>

                      {customers.map((customer) => (
                        <option
                          key={customer.code}
                          value={customer.code}
                        >
                          {customer.business_name} —{" "}
                          {customer.code}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    className="web-order-match-button"
                    onClick={() =>
                      updateOrder({
                        matched_pos_customer_code:
                          selectedCustomerCode ||
                          null,
                      })
                    }
                    disabled={
                      saving ||
                      customersLoading
                    }
                  >
                    <Check size={16} />

                    Save
                  </button>
                </div>

                {selectedOrder.matched_pos_customer_code && (
                  <div className="web-order-current-match">
                    <span>Currently matched to</span>

                    <strong>
                      {
                        selectedOrder.matched_pos_customer_code
                      }
                    </strong>

                    {getCustomerName(
                      selectedOrder.matched_pos_customer_code,
                    ) && (
                      <span>
                        {getCustomerName(
                          selectedOrder.matched_pos_customer_code,
                        )}
                      </span>
                    )}
                  </div>
                )}
              </section>

              {/* STATUS */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <div className="web-order-section-icon">
                    <Clock3 size={16} />
                  </div>

                  <div>
                    <h3>Order Status</h3>

                    <p>
                      Update the current processing
                      status
                    </p>
                  </div>
                </div>

                <div className="web-order-status-actions">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      type="button"
                      className={`web-order-status-button ${
                        selectedOrder.status ===
                        status
                          ? `active ${status.toLowerCase()}`
                          : ""
                      }`}
                      disabled={
                        saving ||
                        selectedOrder.status ===
                          status
                      }
                      onClick={() =>
                        updateOrder({ status })
                      }
                    >
                      {selectedOrder.status ===
                        status && (
                        <Check size={15} />
                      )}

                      {statusLabels[status]}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* FOOTER */}
            <div className="web-order-modal-footer">
              <button
                type="button"
                className="web-order-close-button"
                onClick={closeOrder}
                disabled={saving}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}