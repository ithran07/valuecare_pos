import { FormEvent, useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useToast } from "../ToastContext";
import { api } from "../api";
import "../style/employees.css";
import {
  Check,
  ChevronDown,
  Lock,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";

type Role =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "MANAGER"
  | "SALES"
  | "WAREHOUSE"
  | "ACCOUNTING";

type Employee = {
  employee_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: Role;
  is_active: boolean;
};

const roles: Role[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "MANAGER",
  "SALES",
  "WAREHOUSE",
  "ACCOUNTING",
];

const roleLabels: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  MANAGER: "Manager",
  SALES: "Sales",
  WAREHOUSE: "Warehouse",
  ACCOUNTING: "Accounting",
};

type EmployeeDropdownProps = {
  value: Role;
  options: Role[];
  onChange: (value: Role) => void;
  disabled?: boolean;
  compact?: boolean;
};

function fetchEmployees() {
  return api.get<Employee[]>("/auth/users/");
}

function updateEmployeeRequest(employeeId: string, data: Partial<Employee> & { password?: string }) {
  return api.patch(`/auth/users/${employeeId}/`, data);
}

function EmployeeDropdown({
  value,
  options,
  onChange,
  disabled = false,
  compact = false,
}: EmployeeDropdownProps) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, []);

  return (
    <div
      className={compact
        ? "employee-dropdown employee-dropdown-compact"
        : "employee-dropdown"}
      ref={dropdownRef}
    >
      <button
        aria-expanded={open}
        aria-haspopup="listbox"
        className="employee-dropdown-trigger"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span>{roleLabels[value]}</span>
        <ChevronDown
          aria-hidden="true"
          className={open ? "rotated" : ""}
          size={compact ? 15 : 17}
        />
      </button>

      {open && (
        <div
          aria-label="Employee role options"
          className="employee-dropdown-menu"
          role="listbox"
        >
          {options.map((role) => (
            <button
              aria-selected={role === value}
              className={role === value
                ? "employee-dropdown-option active"
                : "employee-dropdown-option"}
              key={role}
              onClick={() => {
                onChange(role);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              <span>{roleLabels[role]}</span>
              {role === value && (
                <Check aria-hidden="true" size={compact ? 14 : 16} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const blankForm = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "0",
  role: "SALES" as Role,
  password: "",
};

type DetailFormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: Role;
  password: string;
};

function toDetailForm(employee: Employee): DetailFormState {
  return {
    first_name: employee.first_name,
    last_name: employee.last_name,
    email: employee.email,
    phone: employee.phone,
    role: employee.role,
    password: "",
  };
}

type EmployeeDetailModalProps = {
  employee: Employee;
  currentUserRole?: Role;
  onClose: () => void;
  onSave: (employeeId: string, changes: Partial<Employee> & { password?: string }) => Promise<void>;
  onToggleActive: (employee: Employee) => Promise<void>;
};

function EmployeeDetailModal({
  employee,
  currentUserRole,
  onClose,
  onSave,
  onToggleActive,
}: EmployeeDetailModalProps) {
  // Admins can manage everyone except Super Admin accounts; only a Super
  const canEdit =
    currentUserRole === "SUPER_ADMIN" ||
    (currentUserRole === "ADMIN" && employee.role !== "SUPER_ADMIN");

  const [form, setForm] = useState<DetailFormState>(toDetailForm(employee));
  const [saving, setSaving] = useState(false);

  function updateField(field: keyof DetailFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!canEdit) return;

    setSaving(true);
    try {
      const changes: Partial<Employee> & { password?: string } = {
        first_name: form.first_name,
        last_name: form.last_name,
        email: form.email,
        phone: form.phone,
        role: form.role,
      };

      if (form.password.trim().length > 0) {
        changes.password = form.password;
      }

      await onSave(employee.employee_id, changes);
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="employee-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="employee-modal">
        <div className="employee-modal-header">
          <div>
            <span className="employee-section-label">Employee Management</span>
            <h2>
              {employee.first_name} {employee.last_name}
            </h2>
            <p>
              {employee.employee_id} · {roleLabels[employee.role]}
            </p>
          </div>

          <button
            type="button"
            className="employee-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {!canEdit && (
          <div className="employee-readonly-notice">
            <ShieldAlert size={16} />
            <span>
              Only a Super Admin can edit, deactivate a Super Admin account.
              You're viewing this account in read-only mode.
            </span>
          </div>
        )}

        <form className="employee-create-form" onSubmit={handleSubmit}>
          <div className="employee-form-grid">
            <div className="employee-field">
              <label>Employee ID</label>
              <input value={employee.employee_id} disabled />
            </div>

            <div className="employee-field">
              <label>Status</label>
              <input
                value={employee.is_active ? "Active" : "Inactive"}
                disabled
              />
            </div>

            <div className="employee-field">
              <label>First name</label>
              <input
                required
                disabled={!canEdit}
                value={form.first_name}
                onChange={(event) => updateField("first_name", event.target.value)}
              />
            </div>

            <div className="employee-field">
              <label>Last name</label>
              <input
                required
                disabled={!canEdit}
                value={form.last_name}
                onChange={(event) => updateField("last_name", event.target.value)}
              />
            </div>

            <div className="employee-field">
              <label>Email</label>
              <input
                required
                type="email"
                disabled={!canEdit}
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
              />
            </div>

            <div className="employee-field">
              <label>Phone number</label>
              <input
                required
                type="tel"
                disabled={!canEdit}
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
              />
            </div>

            <div className="employee-field">
              <label>Role</label>
              <EmployeeDropdown
                disabled={!canEdit}
                options={roles.filter(
                  (role) => currentUserRole === "SUPER_ADMIN" || role !== "SUPER_ADMIN",
                )}
                onChange={(role) => updateField("role", role)}
                value={form.role}
              />
            </div>

            <div className="employee-field employee-field-full">
              <label>
                <Lock size={12} style={{ marginRight: 4, verticalAlign: -1 }} />
                Reset password
              </label>
              <input
                type="password"
                minLength={8}
                disabled={!canEdit}
                placeholder="Leave blank to keep current password"
                value={form.password}
                onChange={(event) => updateField("password", event.target.value)}
              />
              <small>Only fill this in if you want to set a new password.</small>
            </div>
          </div>

          <div className="employee-detail-actions">
            <div className="employee-detail-actions-left">
              {canEdit && (
                <>
                  <button
                    type="button"
                    className={`employee-activation-button ${employee.is_active ? "active" : "inactive"}`}
                    onClick={() => onToggleActive(employee)}
                  >
                    {employee.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </>
              )}
            </div>

            <div className="employee-detail-actions-right">
              <button type="button" className="employee-cancel-button" onClick={onClose}>
                Close
              </button>

              {canEdit && (
                <button type="submit" className="employee-add-submit" disabled={saving}>
                  {saving ? "Saving..." : "Save changes"}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function EmployeesPage() {
  const { user } = useAuth();
  const canManage = user?.role === "SUPER_ADMIN" || user?.role === "ADMIN";
  const { showToast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [form, setForm] = useState(blankForm);
  const [search, setSearch] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);

  const load = async () => {
    try {
      setLoading(true);

      const response = await api.get<Employee[]>(
        `/auth/users/?search=${encodeURIComponent(search)}`,
      );

      setEmployees(response.data);
    } catch (error) {
      console.error(error);
      showToast?.("Failed to load employees.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      load();
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [search]);

  async function loadEmployees() {
    try {
      const response = await fetchEmployees();
      setEmployees(response.data);
    } catch (requestError: any) {
      showToast(
        requestError?.response?.data?.detail || "Could not load employee accounts.",
        "error",
      );
    }
  }

  useEffect(() => {
    if (canManage) loadEmployees();
  }, [canManage]);

  if (!canManage) return <Navigate to="/" replace />;

  const visibleEmployees = employees
    .filter((employee) =>
      `${employee.employee_id} ${employee.first_name} ${employee.last_name} ${employee.email} ${employee.phone} ${
        roleLabels[employee.role]
      }`
        .toLowerCase().includes(search.toLowerCase().trim())
    )
    .sort((left, right) => {
      const leftNumber = Number(left.employee_id.replace("EMP-", ""));
      const rightNumber = Number(right.employee_id.replace("EMP-", ""));
      if (leftNumber !== rightNumber) return leftNumber - rightNumber;

      return `${left.last_name} ${left.first_name}`.localeCompare(
        `${right.last_name} ${right.first_name}`,
        undefined,
        { sensitivity: "base" },
      );
    });

  function updateForm(field: keyof typeof blankForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function createEmployee(event: FormEvent) {
    event.preventDefault();
    try {
      await api.post("/auth/users/", form);
      setForm(blankForm);
      showToast("Employee account created successfully.", "success");
      loadEmployees();
    } catch (requestError: any) {
      showToast(
        requestError?.response?.data?.detail || "Could not create employee account.",
        "error",
      );
    }
  }

  // Whether the current user is allowed to edit/deactivate this
  // particular employee. Page access already requires Super Admin or Admin;
  // this additionally blocks an Admin from touching a Super Admin account.
  function canEditEmployee(employee: Employee) {
    return (
      user?.role === "SUPER_ADMIN" ||
      (user?.role === "ADMIN" && employee.role !== "SUPER_ADMIN")
    );
  }

  async function changeEmployee(
    employeeId: string,
    changes: Partial<Employee> & { password?: string },
  ) {
    try {
      await updateEmployeeRequest(employeeId, changes);
      showToast("Employee account updated successfully.", "success");
      await loadEmployees();
    } catch (requestError: any) {
      showToast(
        requestError?.response?.data?.detail || "Could not update employee account.",
        "error",
      );
      throw requestError;
    }
  }

  async function handleToggleActive(employee: Employee) {
    if (!canEditEmployee(employee)) return;
    try {
      await changeEmployee(employee.employee_id, { is_active: !employee.is_active });
      setSelectedEmployee((current) =>
        current && current.employee_id === employee.employee_id
          ? { ...current, is_active: !employee.is_active }
          : current,
      );
    } catch {
      // toast already shown in changeEmployee
    }
  }

  return (
    <div>
      <div className="page-head">
        <div>
          <h1>Employee accounts</h1>
          <p>
            {user?.role === "SUPER_ADMIN"
              ? "Manage all ValueCare employee accounts."
              : "Manage employee accounts except Super Admin accounts."}
          </p>
        </div>
      </div>

      <div className="employee-toolbar">
        <div className="employee-search">
          <Search size={17} />

          <input
            className="search"
            placeholder="Search employees..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />

          {search && (
            <button
              type="button"
              className="employee-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="employee-toolbar-right">
          <span>{visibleEmployees.length} employees</span>

          <button
            type="button"
            className="employee-add-button"
            onClick={() => setShowCreateForm(true)}
          >
            Add Employee
          </button>
        </div>
      </div>

      {showCreateForm && (
        <div
          className="employee-modal-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowCreateForm(false);
            }
          }}
        >
          <div className="employee-modal">
            <div className="employee-modal-header">
              <div>
                <span className="employee-section-label">Employee Management</span>
                <h2>Create employee account</h2>
                <p>Create a new employee account and assign the appropriate role.</p>
              </div>

              <button
                type="button"
                className="employee-modal-close"
                onClick={() => setShowCreateForm(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form
              className="employee-create-form"
              onSubmit={async (event) => {
                await createEmployee(event);
                setShowCreateForm(false);
              }}
            >
              <div className="employee-form-grid">
                <div className="employee-field">
                  <label>Employee ID</label>
                  <input
                    value="Generated after creation"
                    disabled
                    aria-label="Employee ID generated after creation"
                  />
                </div>

                <div className="employee-field">
                  <label>
                    First name <span>*</span>
                  </label>
                  <input
                    required
                    placeholder="First name"
                    value={form.first_name}
                    onChange={(event) => updateForm("first_name", event.target.value)}
                  />
                </div>

                <div className="employee-field">
                  <label>
                    Last name <span>*</span>
                  </label>
                  <input
                    required
                    placeholder="Last name"
                    value={form.last_name}
                    onChange={(event) => updateForm("last_name", event.target.value)}
                  />
                </div>

                <div className="employee-field">
                  <label>
                    Email <span>*</span>
                  </label>
                  <input
                    required
                    type="email"
                    placeholder="employee@example.com"
                    value={form.email}
                    onChange={(event) => updateForm("email", event.target.value)}
                  />
                </div>

                <div className="employee-field">
                  <label>
                    Phone number <span>*</span>
                  </label>
                  <input
                    required
                    type="tel"
                    placeholder="09XX XXX XXXX"
                    value={form.phone}
                    onChange={(event) => updateForm("phone", event.target.value)}
                  />
                </div>

                <div className="employee-field">
                  <label>Role</label>
                  <EmployeeDropdown
                    options={roles.filter(
                      (role) => user?.role === "SUPER_ADMIN" || role !== "SUPER_ADMIN",
                    )}
                    onChange={(role) => updateForm("role", role)}
                    value={form.role}
                  />
                </div>

                <div className="employee-field employee-field-full">
                  <label>
                    Temporary password <span>*</span>
                  </label>
                  <input
                    required
                    type="password"
                    minLength={8}
                    placeholder="Minimum 8 characters"
                    value={form.password}
                    onChange={(event) => updateForm("password", event.target.value)}
                  />
                  <small>The employee can change their password after signing in.</small>
                </div>
              </div>

              <div className="employee-modal-footer">
                <button
                  type="button"
                  className="employee-cancel-button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setForm(blankForm);
                  }}
                >
                  Cancel
                </button>

                <button type="submit" className="employee-add-submit">
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedEmployee && (
        <EmployeeDetailModal
          key={selectedEmployee.employee_id}
          employee={selectedEmployee}
          currentUserRole={user?.role as Role | undefined}
          onClose={() => setSelectedEmployee(null)}
          onSave={changeEmployee}
          onToggleActive={handleToggleActive}
        />
      )}

      <div className="customer-table-wrap">
        {loading ? (
          <div className="customer-loading">
            <div className="customer-loading-spinner" />
            <div>
              <strong>Loading employees</strong>
              <span>Please wait a moment...</span>
            </div>
          </div>
        ) : visibleEmployees.length === 0 ? (
          <div className="customer-empty">
            <div className="customer-empty-icon">
              <Users size={23} />
            </div>
            <h3>{search ? "No employees found" : "No employees yet"}</h3>
            <p>
              {search ? "Try changing your search." : "Add your first employee to get started."}
            </p>
          </div>
        ) : (
          <table className="customer-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Employee ID</th>
                <th>Employee</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Account</th>
              </tr>
            </thead>

            <tbody>
              {visibleEmployees.map((employee, index) => (
                <tr key={employee.employee_id}>
                  <td>{index + 1}</td>
                  <td>
                    <strong>{employee.employee_id}</strong>
                  </td>
                  <td>
                    <strong>
                      {employee.first_name} {employee.last_name}
                    </strong>
                  </td>
                  <td>{employee.email}</td>
                  <td>{employee.phone}</td>
                  <td>{roleLabels[employee.role]}</td>
                  <td style={{ color: employee.is_active ? "#2e7d32" : "#d32f2f" }}>
                    <strong>{employee.is_active ? "Active" : "Inactive"}</strong>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="employee-view-button"
                      onClick={() => setSelectedEmployee(employee)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}