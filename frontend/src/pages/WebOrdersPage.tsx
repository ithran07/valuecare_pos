import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
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

export default function WebOrdersPage() {
  const { showToast } = useToast();

  const [orders, setOrders] = useState<WebOrder[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);

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

  return (
    <div className="web-orders-page">
      <div className="web-orders-header">
        <div>
          <h1>Web Orders</h1>

          <p>
            Manage orders submitted through the ValueCare
            website.
          </p>
        </div>
      </div>

      {/* STATUS SUMMARY */}
      <div className="web-orders-stats">
        <button
          type="button"
          className={`web-order-stat ${
            statusFilter === "ALL"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("ALL")}
        >
          <div className="web-order-stat-icon">
            <ShoppingCart size={19} />
          </div>

          <div>
            <span>All Orders</span>
            <strong>{counts.all}</strong>
          </div>
        </button>

        <button
          type="button"
          className={`web-order-stat ${
            statusFilter === "PENDING"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("PENDING")}
        >
          <div className="web-order-stat-icon">
            <Clock3 size={19} />
          </div>

          <div>
            <span>Pending</span>
            <strong>{counts.pending}</strong>
          </div>
        </button>

        <button
          type="button"
          className={`web-order-stat ${
            statusFilter === "CONTACTED"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("CONTACTED")}
        >
          <div className="web-order-stat-icon">
            <Phone size={19} />
          </div>

          <div>
            <span>Contacted</span>
            <strong>{counts.contacted}</strong>
          </div>
        </button>

        <button
          type="button"
          className={`web-order-stat ${
            statusFilter === "CONFIRMED"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("CONFIRMED")}
        >
          <div className="web-order-stat-icon">
            <Check size={19} />
          </div>

          <div>
            <span>Confirmed</span>
            <strong>{counts.confirmed}</strong>
          </div>
        </button>

        <button
          type="button"
          className={`web-order-stat ${
            statusFilter === "CANCELLED"
              ? "selected"
              : ""
          }`}
          onClick={() => setStatusFilter("CANCELLED")}
        >
          <div className="web-order-stat-icon">
            <X size={19} />
          </div>

          <div>
            <span>Cancelled</span>
            <strong>{counts.cancelled}</strong>
          </div>
        </button>
      </div>

      {/* LIST */}
      <section className="web-orders-panel">
        <div className="web-orders-toolbar">
          <div className="web-orders-search">
            <Search size={17} />

            <input
              type="text"
              placeholder="Search orders, customers..."
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

          <span className="web-orders-count">
            {visibleOrders.length}{" "}
            {visibleOrders.length === 1
              ? "order"
              : "orders"}
          </span>
        </div>

        {loading ? (
          <div className="web-orders-loading">
            <div className="web-orders-loading-spinner" />

            <div>
              <strong>Loading web orders</strong>
              <span>
                Please wait a moment...
              </span>
            </div>
          </div>
        ) : visibleOrders.length === 0 ? (
          <div className="web-orders-empty">
            <div className="web-orders-empty-icon">
              <ShoppingCart size={24} />
            </div>

            <h3>
              {search
                ? "No orders found"
                : "No web orders"}
            </h3>

            <p>
              {search
                ? "Try changing your search."
                : "Website orders will appear here when customers place them."}
            </p>
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
                      <span className="web-order-number">
                        {order.order_number}
                      </span>
                    </td>

                    <td>
                      <div className="web-order-customer">
                        <strong>
                          {order.business_name ||
                            order.contact_name}
                        </strong>

                        <span>
                          {order.contact_name}
                        </span>
                      </div>
                    </td>

                    <td>
                      {order.items.length}{" "}
                      {order.items.length === 1
                        ? "item"
                        : "items"}
                    </td>

                    <td>
                      <strong>
                        {formatCurrency(order.total)}
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`web-order-status ${order.status.toLowerCase()}`}
                      >
                        {statusLabels[order.status]}
                      </span>
                    </td>

                    <td>
                      {formatDate(order.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ORDER DETAIL */}
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
            <div className="web-order-modal-header">
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

              <button
                type="button"
                className="web-order-modal-close"
                onClick={closeOrder}
                disabled={saving}
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            <div className="web-order-modal-body">
              {/* CUSTOMER */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <UserRound size={17} />
                  <h3>Customer Information</h3>
                </div>

                <div className="web-order-customer-grid">
                  <div>
                    <span>Business / Customer</span>
                    <strong>
                      {selectedOrder.business_name ||
                        "Individual Customer"}
                    </strong>
                  </div>

                  <div>
                    <span>Customer Type</span>
                    <strong>
                      {getCustomerTypeLabel(
                        selectedOrder.customer_type,
                      )}
                    </strong>
                  </div>

                  <div>
                    <span>Contact Person</span>
                    <strong>
                      {selectedOrder.contact_name ||
                        "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Phone</span>
                    <strong>
                      {selectedOrder.phone ||
                        "Not provided"}
                    </strong>
                  </div>

                  <div>
                    <span>Email</span>
                    <strong>
                      {selectedOrder.email ||
                        "Not provided"}
                    </strong>
                  </div>

                  <div className="web-order-address-field">
                    <span>
                      <MapPin size={14} />
                      Delivery Address
                    </span>

                    <strong>
                      {selectedOrder.delivery_address ||
                        "Not provided"}
                    </strong>
                  </div>
                </div>
              </section>

              {/* ITEMS */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <Package size={17} />
                  <h3>Order Items</h3>
                </div>

                <div className="web-order-items">
                  {selectedOrder.items.map(
                    (item) => (
                      <div
                        className="web-order-item"
                        key={item.product_id}
                      >
                        <div>
                          <strong>
                            {item.product_name}
                          </strong>

                          <span>
                            SKU: {item.product_sku}
                          </span>
                        </div>

                        <span>
                          {item.quantity} ×{" "}
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
                    ),
                  )}
                </div>

                <div className="web-order-total">
                  <span>Total</span>
                  <strong>
                    {formatCurrency(
                      selectedOrder.total,
                    )}
                  </strong>
                </div>
              </section>

              {/* NOTES */}
              {selectedOrder.notes && (
                <section className="web-order-detail-section">
                  <div className="web-order-section-title">
                    <Mail size={17} />
                    <h3>Customer Notes</h3>
                  </div>

                  <div className="web-order-notes">
                    {selectedOrder.notes}
                  </div>
                </section>
              )}

              {/* MATCH POS CUSTOMER */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <UserRound size={17} />
                  <h3>POS Customer</h3>
                </div>

                <p className="web-order-section-description">
                  Match this website customer to an
                  existing customer record in the POS.
                </p>

                <div className="web-order-customer-match">
                  <select
                    value={selectedCustomerCode}
                    onChange={(event) =>
                      setSelectedCustomerCode(
                        event.target.value,
                      )
                    }
                    disabled={customersLoading || saving}
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

                  <button
                    type="button"
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
                    Save Customer
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
                        (
                        {getCustomerName(
                          selectedOrder.matched_pos_customer_code,
                        )}
                        )
                      </span>
                    )}
                  </div>
                )}
              </section>

              {/* STATUS */}
              <section className="web-order-detail-section">
                <div className="web-order-section-title">
                  <Clock3 size={17} />
                  <h3>Order Status</h3>
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