import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Users, X } from "lucide-react";
import { api } from "../api";
import { PurchaseReturn, Supplier } from "../types";
import { useToast } from "../ToastContext";
import ManagementSelect from "../components/ManagementSelect";
import "../style/returns.css";
import "../style/management.css";

type Batch = {
  id: number;
  batch_number: string;
  product_name: string;
  sku: string;
  quantity: string;
  supplier_name: string;
};

type Line = { batch: Batch; quantity: string; reasonCode: string };

export default function ReturnsPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [returns, setReturns] = useState<PurchaseReturn[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [reason, setReason] = useState("");
  const [search, setSearch] = useState("");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  const loadReturns = async () => {
    try {
      setLoading(true);

      const res = await api.get("/purchasing/returns/");

      setReturns(res.data);
    } catch (error) {
      console.error(error);

      showToast?.(
        "Failed to load returns.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      loadReturns();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    api.get("/purchasing/suppliers/?active=true").then((r) =>
      setSuppliers(r.data)
    );
    loadReturns();
  }, []);

  useEffect(() => {
    const handle = setTimeout(() => {
      api.get(
        `/inventory/batches/?status=available&search=${
          encodeURIComponent(search)
        }`,
      )
        .then((r) => setBatches(r.data));
    }, 250);
    return () => clearTimeout(handle);
  }, [search]);

  const visibleBatches = useMemo(() => batches.slice(0, 15), [batches]);

  function addLine(batch: Batch) {
    setLines((current) => {
      if (current.find((l) => l.batch.id === batch.id)) return current;
      return [...current, { batch, quantity: "1", reasonCode: "DAMAGED" }];
    });
  }

  function updateLine(id: number, patch: Partial<Line>) {
    setLines((current) =>
      current.map((l) => l.batch.id === id ? { ...l, ...patch } : l)
    );
  }

  function removeLine(id: number) {
    setLines((current) => current.filter((l) => l.batch.id !== id));
  }

  async function submitReturn() {
    if (!supplierId) {
      return showToast("Choose the supplier this stock came from.", "error");
    }
    if (!lines.length) {
      return showToast("Add at least one batch to return.", "error");
    }
    try {
      const res = await api.post("/purchasing/returns/create_return/", {
        supplier_id: supplierId,
        reason,
        items: lines.map((l) => ({
          batch_id: l.batch.id,
          quantity: l.quantity,
          reason_code: l.reasonCode,
        })),
      });
      showToast(
        `Return ${res.data.return_number} recorded. Stock and inventory movements were adjusted.`,
        "success",
      );
      setLines([]);
      setReason("");
      setShowCreateForm(false);
      loadReturns();
    } catch (e: any) {
      showToast(
        e?.response?.data?.detail || "Could not record the return.",
        "error",
      );
    }
  }

  return (
    <div className="management-page">
      <div className="page-head">
        <div>
          <h1>Returns & Damaged Stock</h1>
          <p>Send damaged, expired or incorrect stock back to the supplier.</p>
        </div>
      </div>

      <div className="management-toolbar">
        <div className="search">
          <Search size={17} />
          <input
            placeholder="Search batches by product, SKU or batch #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="management-toolbar-right">
          <span className="management-count">
            {returns.length} {returns.length === 1 ? "return" : "returns"}
          </span>
          <button
            type="button"
            className="management-action"
            onClick={() => setShowCreateForm(true)}
          >
            <Plus size={16} /> New Return
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div
          className="management-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreateForm(false);
            }
          }}
        >
          <div
            className="management-modal management-modal-wide"
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-modal-title"
          >
            <div className="management-modal-header">
              <div>
                <h2 id="return-modal-title">New Return</h2>
                <p>
                  Send damaged, expired, or incorrect stock back to a supplier.
                </p>
              </div>
              <button
                type="button"
                className="management-modal-close"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="management-modal-body">
              <div className="panel">
                <h2>New Return</h2>
                <div className="supplier-form-grid management-form-grid">
                  <div className="supplier-field">
                    <label>
                      Supplier <span>*</span>
                    </label>
                    <ManagementSelect
                      value={supplierId}
                      onChange={setSupplierId}
                      ariaLabel="Select supplier"
                      options={[
                        { value: "", label: "Select supplier..." },
                        ...suppliers.map((s) => ({
                          value: String(s.id),
                          label: `${s.code} — ${s.name}`,
                        })),
                      ]}
                    />
                  </div>
                  <div className="supplier-field supplier-field-wide">
                    <label>Reason / notes</label>
                    <input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                    />
                  </div>
                </div>
                <div className="product-grid">
                  {visibleBatches.map((b) => (
                    <button
                      className="product"
                      key={b.id}
                      onClick={() => addLine(b)}
                    >
                      <strong>{b.product_name}</strong>
                      <span>{b.sku} · Batch {b.batch_number}</span>
                      <span>On hand: {b.quantity}</span>
                    </button>
                  ))}
                </div>

                <div className="cart-list">
                  {lines.map((l) => (
                    <div className="cart-row" key={l.batch.id}>
                      <div>
                        <strong>{l.batch.product_name}</strong>
                        <small>Batch {l.batch.batch_number}</small>
                      </div>
                      <input
                        type="number"
                        min="1"
                        max={l.batch.quantity}
                        value={l.quantity}
                        onChange={(e) =>
                          updateLine(l.batch.id, { quantity: e.target.value })}
                      />
                      <ManagementSelect
                        value={l.reasonCode}
                        onChange={(value) =>
                          updateLine(l.batch.id, { reasonCode: value })}
                        ariaLabel="Return reason"
                        options={[
                          { value: "DAMAGED", label: "Damaged" },
                          { value: "EXPIRED", label: "Expired" },
                          { value: "WRONG_ITEM", label: "Wrong item" },
                          { value: "QUALITY", label: "Quality issue" },
                          { value: "OTHER", label: "Other" },
                        ]}
                      />
                      <button onClick={() => removeLine(l.batch.id)}>✕</button>
                    </div>
                  ))}
                  {!lines.length && (
                    <div className="empty">No batches selected yet.</div>
                  )}
                </div>
                <button className="checkout" onClick={submitReturn}>
                  Record Return
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="panel">
        {loading
          ? (
            <div className="customer-loading">
              <div className="customer-loading-spinner" />

              <div>
                <strong>Loading returns</strong>
                <span>Please wait a moment...</span>
              </div>
            </div>
          )
          : returns.length === 0
          ? (
            <div className="customer-empty">
              <div className="customer-empty-icon">
                <Users size={23} />
              </div>

              <h3>
                {search ? "No returns found" : "No returns yet"}
              </h3>

              <p>
                {search
                  ? "Try changing your search."
                  : "Add your first return to get started."}
              </p>
            </div>
          )
          : (
            <table>
              <thead>
                <tr>
                  <th>Return #</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Reason</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <strong>{r.return_number}</strong>
                    </td>
                    <td>{r.supplier_name}</td>
                    <td>{r.status}</td>
                    <td>{r.reason}</td>
                    <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
