import { useEffect, useState } from "react";
import { Search, Users, X } from "lucide-react";
import { api } from "../api";
import { SupplierBill } from "../types";
import { useToast } from "../ToastContext";
import ManagementSelect from "../components/ManagementSelect";
import "../style/payables.css";
import "../style/management.css";

export default function PayablesPage() {
  const [bills, setBills] = useState<SupplierBill[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [payAmount, setPayAmount] = useState<Record<number, string>>({});
  const [payMethod, setPayMethod] = useState<Record<number, string>>({});
  const [search, setSearch] = useState("");
  const [activeBill, setActiveBill] = useState<SupplierBill | null>(null);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setLoading(true);
      const q = statusFilter ? `?status=${statusFilter}` : "";
      const res = await api.get(`/purchasing/bills/${q}`);

      setBills(res.data);
    } catch (error) {
      console.error(error);

      showToast?.(
        "Failed to load bills.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [statusFilter]);

  async function pay(bill: SupplierBill) {
    const amount = payAmount[bill.id] || bill.balance;
    try {
      await api.post(`/purchasing/bills/${bill.id}/pay/`, {
        amount,
        method: payMethod[bill.id] || "CASH",
      });
      setPayAmount({ ...payAmount, [bill.id]: "" });
      setActiveBill(null);
      showToast("Payment recorded successfully.", "success");
      load();
    } catch (e: any) {
      showToast(
        e?.response?.data?.detail || "Could not record payment.",
        "error",
      );
    }
  }
  
  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  const totalOutstanding = bills.reduce((sum, b) => sum + Number(b.balance), 0);
  const visibleBills = bills.filter((bill) =>
    `${bill.bill_number} ${bill.supplier_name}`.toLowerCase().includes(
      search.toLowerCase().trim(),
    )
  );

  return (
    <div className="management-page">
      <div className="page-head">
        <div>
          <h1>Accounts Payable</h1>
          <p>What's owed to suppliers, and payments recorded against it.</p>
        </div>
      </div>
      <div className="cards">
        <div className="card">
          <span>Outstanding Balance</span>
          <strong>₱{totalOutstanding.toFixed(2)}</strong>
        </div>
        <div className="card">
          <span>Open Bills</span>
          <strong>{bills.filter((b) => b.status !== "PAID").length}</strong>
        </div>
      </div>
      <div className="management-toolbar">
        <div className="search">
          <Search size={17} />
          <input
            placeholder="Search bills or suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="management-toolbar-right">
          <ManagementSelect
            value={statusFilter}
            onChange={setStatusFilter}
            ariaLabel="Filter bills by status"
            options={[
              { value: "", label: "All bills" },
              { value: "UNPAID", label: "Unpaid" },
              { value: "PARTIAL", label: "Partial" },
              { value: "PAID", label: "Paid" },
            ]}
          />
          <span className="management-count">{visibleBills.length} bills</span>
        </div>
      </div>

      <div className="panel table-wrap">
        {loading
          ? (
            <div className="customer-loading">
              <div className="customer-loading-spinner" />

              <div>
                <strong>Loading bills</strong>
                <span>Please wait a moment...</span>
              </div>
            </div>
          )
          : visibleBills.length === 0
          ? (
            <div className="customer-empty">
              <div className="customer-empty-icon">
                <Users size={23} />
              </div>

              <h3>
                {search ? "No bills found" : "No bills yet"}
              </h3>

              <p>
                {search
                  ? "Try changing your search."
                  : "Add your first bill to get started."}
              </p>
            </div>
          )
          : (
            <table>
              <thead>
                <tr>
                  <th>Bill #</th>
                  <th>Supplier</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Due</th>
                  <th>Record Payment</th>
                </tr>
              </thead>
              <tbody>
                {visibleBills.map((b) => (
                  <tr key={b.id}>
                    <td>{b.bill_number || "—"}</td>
                    <td>{b.supplier_name}</td>
                    <td>₱{Number(b.amount).toFixed(2)}</td>
                    <td>₱{Number(b.amount_paid).toFixed(2)}</td>
                    <td>₱{Number(b.balance).toFixed(2)}</td>
                    <td>{b.status}</td>
                    <td>{b.due_date || "—"}</td>
                    <td>
                      {b.status !== "PAID" && (
                        <button
                          className="management-action"
                          onClick={() => setActiveBill(b)}
                        >
                          Record Payment
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    
      {activeBill && (
        <div
          className="management-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveBill(null);
          }}
        >
          <div
            className="management-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="payment-modal-title"
          >
            <div className="management-modal-header">
              <div>
                <h2 id="payment-modal-title">Record Payment</h2>
                <p>
                  {activeBill.bill_number || "Supplier bill"} ·{" "}
                  {activeBill.supplier_name}
                </p>
              </div>
              <button
                type="button"
                className="management-modal-close"
                onClick={() => setActiveBill(null)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>
            <div className="management-modal-body">
              <div className="supplier-form-grid management-form-grid">
                <div className="supplier-field">
                  <label>
                    Payment amount <span>*</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={activeBill.balance}
                    placeholder={`up to ${
                      Number(activeBill.balance).toFixed(2)
                    }`}
                    value={payAmount[activeBill.id] || ""}
                    onChange={(e) =>
                      setPayAmount({
                        ...payAmount,
                        [activeBill.id]: e.target.value,
                      })}
                  />
                </div>
                <div className="supplier-field">
                  <label>Payment method</label>
                  <ManagementSelect
                    value={payMethod[activeBill.id] || "CASH"}
                    onChange={(value) =>
                      setPayMethod({ ...payMethod, [activeBill.id]: value })}
                    ariaLabel="Select payment method"
                    options={[
                      { value: "CASH", label: "Cash" },
                      { value: "BANK", label: "Bank" },
                      { value: "CHECK", label: "Check" },
                      { value: "GCASH", label: "GCash" },
                    ]}
                  />
                </div>
              </div>
            </div>
            <div className="management-modal-footer">
              <button
                type="button"
                className="management-cancel"
                onClick={() => setActiveBill(null)}
              >
                Cancel
              </button>
              <button
                className="management-action"
                onClick={() => pay(activeBill)}
              >
                Record Payment
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
