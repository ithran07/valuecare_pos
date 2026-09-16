import { useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Building2,
  ChevronRight,
  History,
  Package,
  Plus,
  Search,
  Send,
  Warehouse,
  X,
} from "lucide-react";
import {
  InventoryBatch,
  InventoryMovement,
  Warehouse as WarehouseType,
} from "../types";
import { api } from "../api";
import { useToast } from "../ToastContext";
import "../style/inventory.css";
import "../style/management.css";

type ActiveTab = "stock" | "transfers" | "history";

/* -------------------------------------------------------
   Helpers
------------------------------------------------------- */

function getCreatedTime(item: any): number {
  const value =
    item?.created_at ??
    item?.createdAt ??
    item?.date_created ??
    item?.dateCreated ??
    null;

  if (value) {
    const time = new Date(value).getTime();

    if (!Number.isNaN(time)) {
      return time;
    }
  }

  return 0;
}

function getNumericId(item: any): number {
  const value = Number(item?.id);

  return Number.isNaN(value) ? 0 : value;
}

function sortNewestFirst<T>(items: T[]): T[] {
  return [...items].sort((a: any, b: any) => {
    const dateDifference = getCreatedTime(b) - getCreatedTime(a);

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return getNumericId(b) - getNumericId(a);
  });
}

/* -------------------------------------------------------
   Page
------------------------------------------------------- */

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<WarehouseType[]>([]);
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);

  const [activeTab, setActiveTab] = useState<ActiveTab>("stock");
  const [search, setSearch] = useState("");
  const [selectedWarehouse, setSelectedWarehouse] = useState("all");

  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showCreateWarehouse, setShowCreateWarehouse] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    address: "",
  });

  const [transferForm, setTransferForm] = useState({
    fromWarehouse: "",
    toWarehouse: "",
    batchId: "",
    quantity: "",
  });

  const [loading, setLoading] = useState(true);
  const [submittingTransfer, setSubmittingTransfer] = useState(false);
  const [creatingWarehouse, setCreatingWarehouse] = useState(false);

  const { showToast } = useToast();

  /* -------------------------------------------------------
     Load inventory data
  ------------------------------------------------------- */

  const load = async () => {
    try {
      setLoading(true);

      const [
        warehouseResponse,
        batchResponse,
        movementResponse,
      ] = await Promise.all([
        api.get("/inventory/warehouses/"),
        api.get("/inventory/batches/?status=available"),
        api.get("/inventory/movements/"),
      ]);

      /*
       * Always sort newest records first.
       * This protects the UI even if the backend does not
       * currently use ORDER BY created_at DESC.
       */
      setWarehouses(sortNewestFirst(warehouseResponse.data));
      setBatches(sortNewestFirst(batchResponse.data));
      setMovements(sortNewestFirst(movementResponse.data));
    } catch (error) {
      console.error(error);

      showToast?.(
        "Failed to load inventory locations.",
        "error",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  /* -------------------------------------------------------
     Sorted data
  ------------------------------------------------------- */

  const sortedWarehouses = useMemo(
    () => sortNewestFirst(warehouses),
    [warehouses],
  );

  const sortedBatches = useMemo(
    () => sortNewestFirst(batches),
    [batches],
  );

  const sortedMovements = useMemo(
    () => sortNewestFirst(movements),
    [movements],
  );

  /* -------------------------------------------------------
     Warehouse summaries
  ------------------------------------------------------- */

  const warehouseSummaries = useMemo(() => {
    return sortedWarehouses.map((warehouse) => {
      const warehouseBatches = sortedBatches.filter(
        (batch) =>
          String((batch as any).warehouse) ===
            String(warehouse.id) ||
          String((batch as any).warehouse_id) ===
            String(warehouse.id) ||
          batch.warehouse_name === warehouse.name,
      );

      const totalUnits = warehouseBatches.reduce(
        (total, batch) =>
          total + Number(batch.quantity || 0),
        0,
      );

      const uniqueProducts = new Set(
        warehouseBatches.map(
          (batch) => batch.product_name,
        ),
      ).size;

      return {
        warehouse,
        totalUnits,
        uniqueProducts,
        batchCount: warehouseBatches.length,
      };
    });
  }, [sortedWarehouses, sortedBatches]);

  /* -------------------------------------------------------
     Overall inventory
  ------------------------------------------------------- */

  const totalStock = useMemo(
    () =>
      sortedBatches.reduce(
        (total, batch) =>
          total + Number(batch.quantity || 0),
        0,
      ),
    [sortedBatches],
  );

  const totalProducts = useMemo(
    () =>
      new Set(
        sortedBatches.map(
          (batch) => batch.product_name,
        ),
      ).size,
    [sortedBatches],
  );

  /* -------------------------------------------------------
     Filtered batches
  ------------------------------------------------------- */

  const filteredBatches = useMemo(() => {
    const query = search.toLowerCase().trim();

    return sortedBatches.filter((batch) => {
      const matchesSearch =
        !query ||
        `${batch.product_name} ${batch.sku} ${
          batch.batch_number
        } ${batch.warehouse_name || ""}`
          .toLowerCase()
          .includes(query);

      const matchesWarehouse =
        selectedWarehouse === "all" ||
        batch.warehouse_name ===
          sortedWarehouses.find(
            (warehouse) =>
              String(warehouse.id) ===
              selectedWarehouse,
          )?.name ||
        String((batch as any).warehouse) ===
          selectedWarehouse ||
        String((batch as any).warehouse_id) ===
          selectedWarehouse;

      return matchesSearch && matchesWarehouse;
    });
  }, [
    sortedBatches,
    search,
    selectedWarehouse,
    sortedWarehouses,
  ]);

  /* -------------------------------------------------------
     Transfer batches
  ------------------------------------------------------- */

  const availableTransferBatches = useMemo(() => {
    if (!transferForm.fromWarehouse) {
      return [];
    }

    const selected = sortedWarehouses.find(
      (warehouse) =>
        String(warehouse.id) ===
        String(transferForm.fromWarehouse),
    );

    if (!selected) {
      return [];
    }

    return sortedBatches.filter(
      (batch) =>
        String((batch as any).warehouse) ===
          String(transferForm.fromWarehouse) ||
        String((batch as any).warehouse_id) ===
          String(transferForm.fromWarehouse) ||
        batch.warehouse_name === selected.name,
    );
  }, [
    sortedBatches,
    transferForm.fromWarehouse,
    sortedWarehouses,
  ]);

  const selectedTransferBatch = useMemo(
    () =>
      availableTransferBatches.find(
        (batch) =>
          String(batch.id) ===
          transferForm.batchId,
      ),
    [
      availableTransferBatches,
      transferForm.batchId,
    ],
  );

  /* -------------------------------------------------------
     Movement history
  ------------------------------------------------------- */

  const filteredMovements = useMemo(() => {
    const query = search.toLowerCase().trim();

    if (!query) {
      return sortedMovements;
    }

    return sortedMovements.filter((movement) =>
      `${movement.product_name} ${
        movement.movement_type
      } ${movement.reference_number || ""} ${
        movement.performed_by_name ||
        movement.performed_by ||
        ""
      }`
        .toLowerCase()
        .includes(query),
    );
  }, [sortedMovements, search]);

  /* -------------------------------------------------------
     Transfers
  ------------------------------------------------------- */

  const transferMovements = useMemo(
    () =>
      sortedMovements.filter((movement) =>
        String(
          movement.movement_type || "",
        )
          .toLowerCase()
          .includes("transfer"),
      ),
    [sortedMovements],
  );

  /* -------------------------------------------------------
     Create warehouse
  ------------------------------------------------------- */

  async function createWarehouse() {
    if (
      !form.name.trim() ||
      !form.code.trim()
    ) {
      showToast(
        "Warehouse name and code are required.",
        "error",
      );

      return;
    }

    try {
      setCreatingWarehouse(true);

      const response = await api.post(
        "/inventory/warehouses/",
        form,
      );

      const createdWarehouse =
        response?.data;

      /*
       * Immediately place the newly created warehouse
       * at the top instead of waiting for the reload.
       */
      if (createdWarehouse) {
        setWarehouses((current) =>
          sortNewestFirst([
            createdWarehouse,
            ...current.filter(
              (warehouse) =>
                String(warehouse.id) !==
                String(createdWarehouse.id),
            ),
          ]),
        );
      }

      setForm({
        name: "",
        code: "",
        address: "",
      });

      setShowCreateWarehouse(false);

      showToast(
        "Warehouse created successfully.",
        "success",
      );

      /*
       * Reload so the rest of the inventory data stays
       * synchronized with the backend.
       */
      await load();
    } catch (error: any) {
      console.error(error);

      showToast(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Could not save warehouse.",
        "error",
      );
    } finally {
      setCreatingWarehouse(false);
    }
  }

  /* -------------------------------------------------------
     Transfer stock
  ------------------------------------------------------- */

  async function transferStock() {
    if (
      !transferForm.fromWarehouse ||
      !transferForm.toWarehouse ||
      !transferForm.batchId ||
      !transferForm.quantity
    ) {
      showToast(
        "Please complete all transfer fields.",
        "error",
      );

      return;
    }

    if (
      transferForm.fromWarehouse ===
      transferForm.toWarehouse
    ) {
      showToast(
        "Source and destination warehouses must be different.",
        "error",
      );

      return;
    }

    const quantity =
      Number(transferForm.quantity);

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0
    ) {
      showToast(
        "Enter a valid transfer quantity.",
        "error",
      );

      return;
    }

    if (
      selectedTransferBatch &&
      quantity >
        Number(selectedTransferBatch.quantity)
    ) {
      showToast(
        "Transfer quantity exceeds available stock.",
        "error",
      );

      return;
    }

    try {
      setSubmittingTransfer(true);

      await api.post(
        "/inventory/transfers/",
        {
          batch: Number(
            transferForm.batchId,
          ),
          from_warehouse: Number(
            transferForm.fromWarehouse,
          ),
          to_warehouse: Number(
            transferForm.toWarehouse,
          ),
          quantity,
        },
      );

      showToast(
        "Stock transferred successfully.",
        "success",
      );

      setTransferForm({
        fromWarehouse: "",
        toWarehouse: "",
        batchId: "",
        quantity: "",
      });

      /*
       * Reload + newest-first sorting means the newly
       * created transfer/movement will appear at the top.
       */
      await load();
    } catch (error: any) {
      console.error(error);

      showToast(
        error?.response?.data?.detail ||
          error?.response?.data?.message ||
          "Could not transfer stock.",
        "error",
      );
    } finally {
      setSubmittingTransfer(false);
    }
  }

  /* -------------------------------------------------------
     Helpers
  ------------------------------------------------------- */

  function getWarehouseName(id: string) {
    return (
      sortedWarehouses.find(
        (warehouse) =>
          String(warehouse.id) ===
          String(id),
      )?.name ||
      "Select warehouse"
    );
  }

  function closeWarehouseModal() {
    setShowWarehouseModal(false);
    setShowCreateWarehouse(false);

    setForm({
      name: "",
      code: "",
      address: "",
    });
  }

  /* -------------------------------------------------------
     Render
  ------------------------------------------------------- */

  return (
    <div className="inventory-locations-page">
      {/* =====================================================
          PAGE HEADER
      ===================================================== */}

      <div className="inventory-page-head">
        <div>
          <div className="inventory-page-eyebrow">
            <Warehouse size={16} />
            Inventory management
          </div>

          <h1>Inventory Locations</h1>

          <p>
            Track where your stock is stored, transfer
            inventory, and monitor movement history.
          </p>
        </div>

        <div className="inventory-page-actions">
          <button
            type="button"
            className="inventory-primary-button"
            onClick={() =>
              setShowWarehouseModal(true)
            }
          >
            <Building2 size={17} />
            Manage Warehouses
          </button>
        </div>
      </div>

      {/* =====================================================
          TABS
      ===================================================== */}

      <div className="inventory-tabs">
        <button
          type="button"
          className={
            activeTab === "stock"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveTab("stock");
            setSearch("");
          }}
        >
          <Package size={17} />
          Current Stock
        </button>

        <button
          type="button"
          className={
            activeTab === "transfers"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveTab("transfers");
            setSearch("");
          }}
        >
          <Send size={17} />
          Transfers
        </button>

        <button
          type="button"
          className={
            activeTab === "history"
              ? "active"
              : ""
          }
          onClick={() => {
            setActiveTab("history");
            setSearch("");
          }}
        >
          <History size={17} />
          Movement History
        </button>
      </div>

      {/* =====================================================
          CURRENT STOCK
      ===================================================== */}

      {activeTab === "stock" && (
        <>
          <div className="warehouse-summary-grid">
            {loading ? (
              <>
                {[1, 2, 3].map((item) => (
                  <div
                    className="warehouse-card warehouse-card-skeleton"
                    key={item}
                  >
                    <div className="skeleton-line short" />
                    <div className="skeleton-line large" />
                    <div className="skeleton-line medium" />
                  </div>
                ))}
              </>
            ) : warehouseSummaries.length ===
              0 ? (
              <div className="warehouse-no-summary">
                <Warehouse size={22} />

                <div>
                  <strong>
                    No warehouses yet
                  </strong>

                  <span>
                    Create a warehouse to start
                    organizing your inventory.
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setShowWarehouseModal(
                      true,
                    );
                    setShowCreateWarehouse(
                      true,
                    );
                  }}
                >
                  <Plus size={16} />
                  Add Warehouse
                </button>
              </div>
            ) : (
              <>
                {warehouseSummaries.map(
                  ({
                    warehouse,
                    totalUnits,
                    uniqueProducts,
                    batchCount,
                  }) => (
                    <button
                      type="button"
                      className={
                        selectedWarehouse ===
                        String(
                          warehouse.id,
                        )
                          ? "warehouse-card selected"
                          : "warehouse-card"
                      }
                      key={warehouse.id}
                      onClick={() =>
                        setSelectedWarehouse(
                          selectedWarehouse ===
                            String(
                              warehouse.id,
                            )
                            ? "all"
                            : String(
                                warehouse.id,
                              ),
                        )
                      }
                    >
                      <div className="warehouse-card-top">
                        <div className="warehouse-icon">
                          <Warehouse
                            size={19}
                          />
                        </div>

                        <ChevronRight
                          size={18}
                        />
                      </div>

                      <h3>
                        {warehouse.name}
                      </h3>

                      <span className="warehouse-code">
                        {warehouse.code}
                      </span>

                      <div className="warehouse-stock-count">
                        <strong>
                          {totalUnits.toLocaleString()}
                        </strong>

                        <span>
                          units in stock
                        </span>
                      </div>

                      <div className="warehouse-card-footer">
                        <span>
                          {uniqueProducts}{" "}
                          products
                        </span>

                        <span>
                          {batchCount}{" "}
                          batches
                        </span>
                      </div>
                    </button>
                  ),
                )}

                <div className="warehouse-total-card">
                  <div className="warehouse-total-icon">
                    <Package size={20} />
                  </div>

                  <span>
                    Total Inventory
                  </span>

                  <strong>
                    {totalStock.toLocaleString()}
                  </strong>

                  <small>
                    {totalProducts} unique{" "}
                    {totalProducts === 1
                      ? "product"
                      : "products"}
                  </small>
                </div>
              </>
            )}
          </div>

          <div className="inventory-content-card">
            <div className="inventory-card-header">
              <div>
                <h2>
                  {selectedWarehouse ===
                  "all"
                    ? "Current Stock"
                    : getWarehouseName(
                        selectedWarehouse,
                      )}
                </h2>

                <p>
                  {filteredBatches.length}{" "}
                  {filteredBatches.length ===
                  1
                    ? "batch"
                    : "batches"}{" "}
                  available
                </p>
              </div>

              <div className="inventory-toolbar">
                <div className="inventory-search">
                  <Search size={17} />

                  <input
                    placeholder="Search product, SKU or batch..."
                    value={search}
                    onChange={(event) =>
                      setSearch(
                        event.target.value,
                      )
                    }
                  />
                </div>

                <select
                  value={selectedWarehouse}
                  onChange={(event) =>
                    setSelectedWarehouse(
                      event.target.value,
                    )
                  }
                >
                  <option value="all">
                    All warehouses
                  </option>

                  {sortedWarehouses.map(
                    (warehouse) => (
                      <option
                        key={warehouse.id}
                        value={
                          warehouse.id
                        }
                      >
                        {warehouse.name}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </div>

            {loading ? (
              <LoadingState
                title="Loading current stock"
                description="Please wait while we load your inventory..."
              />
            ) : filteredBatches.length ===
              0 ? (
              <EmptyState
                icon={
                  <Package size={24} />
                }
                title={
                  search
                    ? "No stock found"
                    : "No stock available"
                }
                description={
                  search
                    ? "Try changing your search or warehouse filter."
                    : "Stock will appear here once inventory is received."
                }
              />
            ) : (
              <div className="inventory-table-wrap">
                <table className="inventory-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Batch</th>
                      <th>Warehouse</th>
                      <th>Available</th>
                      <th>Expiry</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredBatches.map(
                      (batch) => (
                        <tr key={batch.id}>
                          <td>
                            <div className="product-cell">
                              <div className="product-cell-icon">
                                <Package
                                  size={17}
                                />
                              </div>

                              <div>
                                <strong>
                                  {
                                    batch.product_name
                                  }
                                </strong>

                                <span>
                                  {
                                    batch.sku
                                  }
                                </span>
                              </div>
                            </div>
                          </td>

                          <td>
                            <span className="batch-code">
                              {
                                batch.batch_number
                              }
                            </span>
                          </td>

                          <td>
                            <span className="warehouse-badge">
                              <Warehouse
                                size={14}
                              />

                              {batch.warehouse_name ||
                                "Unassigned"}
                            </span>
                          </td>

                          <td>
                            <strong className="stock-quantity">
                              {Number(
                                batch.quantity,
                              ).toLocaleString()}
                            </strong>
                          </td>

                          <td>
                            <span
                              className={
                                batch.is_expired
                                  ? "expiry-badge expired"
                                  : "expiry-badge"
                              }
                            >
                              {batch.expiration_date ||
                                "No expiry"}
                            </span>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* =====================================================
          TRANSFERS
      ===================================================== */}

      {activeTab === "transfers" && (
        <div className="transfer-layout">
          <div className="transfer-card">
            <div className="transfer-card-header">
              <div className="transfer-header-icon">
                <Send size={20} />
              </div>

              <div>
                <h2>
                  Transfer Stock
                </h2>

                <p>
                  Move available inventory
                  between warehouse
                  locations.
                </p>
              </div>
            </div>

            <div className="transfer-form">
              <div className="transfer-location-grid">
                <div className="transfer-field">
                  <label>
                    From warehouse
                  </label>

                  <select
                    value={
                      transferForm.fromWarehouse
                    }
                    onChange={(event) =>
                      setTransferForm({
                        ...transferForm,
                        fromWarehouse:
                          event.target.value,
                        batchId: "",
                        quantity: "",
                      })
                    }
                  >
                    <option value="">
                      Select source
                      warehouse
                    </option>

                    {sortedWarehouses.map(
                      (warehouse) => (
                        <option
                          key={
                            warehouse.id
                          }
                          value={
                            warehouse.id
                          }
                        >
                          {warehouse.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="transfer-arrow">
                  <ArrowRight
                    size={20}
                  />
                </div>

                <div className="transfer-field">
                  <label>
                    To warehouse
                  </label>

                  <select
                    value={
                      transferForm.toWarehouse
                    }
                    onChange={(event) =>
                      setTransferForm({
                        ...transferForm,
                        toWarehouse:
                          event.target.value,
                      })
                    }
                  >
                    <option value="">
                      Select destination
                      warehouse
                    </option>

                    {sortedWarehouses
                      .filter(
                        (warehouse) =>
                          String(
                            warehouse.id,
                          ) !==
                          String(
                            transferForm.fromWarehouse,
                          ),
                      )
                      .map(
                        (warehouse) => (
                          <option
                            key={
                              warehouse.id
                            }
                            value={
                              warehouse.id
                            }
                          >
                            {
                              warehouse.name
                            }
                          </option>
                        ),
                      )}
                  </select>
                </div>
              </div>

              <div className="transfer-divider" />

              <div className="transfer-field">
                <label>
                  Select stock batch
                </label>

                <select
                  value={
                    transferForm.batchId
                  }
                  disabled={
                    !transferForm.fromWarehouse
                  }
                  onChange={(event) =>
                    setTransferForm({
                      ...transferForm,
                      batchId:
                        event.target.value,
                      quantity: "",
                    })
                  }
                >
                  <option value="">
                    {transferForm.fromWarehouse
                      ? "Select product batch"
                      : "Select a source warehouse first"}
                  </option>

                  {availableTransferBatches.map(
                    (batch) => (
                      <option
                        key={batch.id}
                        value={batch.id}
                      >
                        {
                          batch.product_name
                        }{" "}
                        —{" "}
                        {
                          batch.batch_number
                        }{" "}
                        (
                        {Number(
                          batch.quantity,
                        ).toLocaleString()}{" "}
                        available)
                      </option>
                    ),
                  )}
                </select>
              </div>

              {selectedTransferBatch && (
                <div className="selected-batch-card">
                  <div className="selected-batch-icon">
                    <Package size={19} />
                  </div>

                  <div className="selected-batch-info">
                    <strong>
                      {
                        selectedTransferBatch.product_name
                      }
                    </strong>

                    <span>
                      {
                        selectedTransferBatch.sku
                      }{" "}
                      · Batch{" "}
                      {
                        selectedTransferBatch.batch_number
                      }
                    </span>
                  </div>

                  <div className="selected-batch-available">
                    <strong>
                      {Number(
                        selectedTransferBatch.quantity,
                      ).toLocaleString()}
                    </strong>

                    <span>
                      available
                    </span>
                  </div>
                </div>
              )}

              <div className="transfer-field">
                <label>
                  Quantity to transfer
                </label>

                <input
                  type="number"
                  min="1"
                  max={
                    selectedTransferBatch?.quantity
                  }
                  placeholder="Enter quantity"
                  value={
                    transferForm.quantity
                  }
                  onChange={(event) =>
                    setTransferForm({
                      ...transferForm,
                      quantity:
                        event.target.value,
                    })
                  }
                />

                {selectedTransferBatch && (
                  <span className="field-hint">
                    Maximum available:{" "}
                    {Number(
                      selectedTransferBatch.quantity,
                    ).toLocaleString()}
                  </span>
                )}
              </div>

              <div className="transfer-actions">
                <button
                  type="button"
                  className="inventory-secondary-button"
                  onClick={() =>
                    setTransferForm({
                      fromWarehouse: "",
                      toWarehouse: "",
                      batchId: "",
                      quantity: "",
                    })
                  }
                >
                  Clear
                </button>

                <button
                  type="button"
                  className="inventory-primary-button"
                  disabled={
                    submittingTransfer
                  }
                  onClick={transferStock}
                >
                  <Send size={17} />

                  {submittingTransfer
                    ? "Transferring..."
                    : "Transfer Stock"}
                </button>
              </div>
            </div>
          </div>

          {/* Recent Transfers */}

          <div className="transfer-history-card">
            <div className="transfer-history-header">
              <div>
                <h2>
                  Recent Transfers
                </h2>

                <p>
                  Your latest stock
                  movements between
                  locations.
                </p>
              </div>

              <span>
                {transferMovements.length}{" "}
                transfers
              </span>
            </div>

            {loading ? (
              <LoadingState
                title="Loading transfers"
                description="Fetching recent inventory transfers..."
              />
            ) : transferMovements.length ===
              0 ? (
              <EmptyState
                icon={<Send size={23} />}
                title="No transfers yet"
                description="Stock transfers between warehouses will appear here."
              />
            ) : (
              <div className="transfer-history-list">
                {transferMovements
                  .slice(0, 8)
                  .map((movement) => (
                    <div
                      className="transfer-history-item"
                      key={movement.id}
                    >
                      <div className="movement-icon">
                        <Send size={16} />
                      </div>

                      <div className="movement-main">
                        <strong>
                          {
                            movement.product_name
                          }
                        </strong>

                        <span>
                          {movement.reference_number ||
                            "Warehouse stock transfer"}
                        </span>
                      </div>

                      <div className="movement-meta">
                        <strong>
                          {Number(
                            movement.quantity,
                          ).toLocaleString()}{" "}
                          units
                        </strong>

                        <span>
                          {new Date(
                            movement.created_at,
                          ).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* =====================================================
          MOVEMENT HISTORY
      ===================================================== */}

      {activeTab === "history" && (
        <div className="inventory-content-card">
          <div className="inventory-card-header">
            <div>
              <h2>
                Movement History
              </h2>

              <p>
                Complete record of stock
                received, transferred,
                adjusted, or removed.
              </p>
            </div>

            <div className="inventory-toolbar">
              <div className="inventory-search">
                <Search size={17} />

                <input
                  placeholder="Search product or reference..."
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value,
                    )
                  }
                />
              </div>
            </div>
          </div>

          {loading ? (
            <LoadingState
              title="Loading movement history"
              description="Please wait while we load inventory activity..."
            />
          ) : filteredMovements.length ===
            0 ? (
            <EmptyState
              icon={
                <History size={24} />
              }
              title={
                search
                  ? "No movements found"
                  : "No movements yet"
              }
              description={
                search
                  ? "Try changing your search."
                  : "Inventory activity will appear here as stock moves."
              }
            />
          ) : (
            <div className="inventory-table-wrap">
              <table className="inventory-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Product</th>
                    <th>Movement</th>
                    <th>Quantity</th>
                    <th>Reference</th>
                    <th>Handled By</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredMovements.map(
                    (movement) => (
                      <tr key={movement.id}>
                        <td>
                          <span className="movement-date">
                            {new Date(
                              movement.created_at,
                            ).toLocaleDateString()}
                          </span>

                          <small>
                            {new Date(
                              movement.created_at,
                            ).toLocaleTimeString(
                              [],
                              {
                                hour: "2-digit",
                                minute:
                                  "2-digit",
                              },
                            )}
                          </small>
                        </td>

                        <td>
                          <strong>
                            {
                              movement.product_name
                            }
                          </strong>
                        </td>

                        <td>
                          <span
                            className={`movement-type ${String(
                              movement.movement_type,
                            )
                              .toLowerCase()
                              .replace(
                                /\s+/g,
                                "-",
                              )}`}
                          >
                            {
                              movement.movement_type
                            }
                          </span>
                        </td>

                        <td>
                          <strong className="stock-quantity">
                            {Number(
                              movement.quantity,
                            ).toLocaleString()}
                          </strong>
                        </td>

                        <td>
                          <span className="reference-code">
                            {movement.reference_number ||
                              "—"}
                          </span>
                        </td>

                        <td>
                          {movement.performed_by_name ||
                            movement.performed_by ||
                            "—"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* =====================================================
          WAREHOUSE MANAGEMENT MODAL
      ===================================================== */}

      {showWarehouseModal && (
        <div
          className="management-modal-backdrop"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeWarehouseModal();
            }
          }}
        >
          <div
            className="management-modal management-modal-wide warehouse-management-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="warehouse-management-title"
          >
            <div className="management-modal-header">
              <div>
                <h2 id="warehouse-management-title">
                  Manage Warehouses
                </h2>

                <p>
                  Create and manage the
                  physical locations where
                  inventory is stored.
                </p>
              </div>

              <button
                type="button"
                className="management-modal-close"
                onClick={
                  closeWarehouseModal
                }
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="management-modal-body">
              {!showCreateWarehouse ? (
                <>
                  <div className="warehouse-modal-toolbar">
                    <div>
                      <strong>
                        {
                          sortedWarehouses.length
                        }{" "}
                        {sortedWarehouses.length ===
                        1
                          ? "warehouse"
                          : "warehouses"}
                      </strong>

                      <span>
                        Locations currently
                        available for
                        inventory storage.
                      </span>
                    </div>

                    <button
                      type="button"
                      className="inventory-primary-button"
                      onClick={() =>
                        setShowCreateWarehouse(
                          true,
                        )
                      }
                    >
                      <Plus size={17} />
                      Add Warehouse
                    </button>
                  </div>

                  {sortedWarehouses.length ===
                  0 ? (
                    <EmptyState
                      icon={
                        <Warehouse
                          size={24}
                        />
                      }
                      title="No warehouses yet"
                      description="Create your first warehouse to organize your inventory."
                    />
                  ) : (
                    <div className="warehouse-management-list">
                      {sortedWarehouses.map(
                        (warehouse) => (
                          <div
                            className="warehouse-management-item"
                            key={
                              warehouse.id
                            }
                          >
                            <div className="warehouse-management-icon">
                              <Warehouse
                                size={19}
                              />
                            </div>

                            <div className="warehouse-management-info">
                              <strong>
                                {
                                  warehouse.name
                                }
                              </strong>

                              <span>
                                {warehouse.address ||
                                  "No address provided"}
                              </span>
                            </div>

                            <span className="warehouse-management-code">
                              {
                                warehouse.code
                              }
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="warehouse-create-form">
                  <button
                    type="button"
                    className="back-to-warehouses"
                    onClick={() =>
                      setShowCreateWarehouse(
                        false,
                      )
                    }
                  >
                    ← Back to warehouses
                  </button>

                  <div className="warehouse-create-heading">
                    <h3>
                      Add New Warehouse
                    </h3>

                    <p>
                      Enter the details for
                      the new inventory
                      storage location.
                    </p>
                  </div>

                  <div className="warehouse-form-grid">
                    <div className="transfer-field">
                      <label>
                        Warehouse name{" "}
                        <span>*</span>
                      </label>

                      <input
                        placeholder="e.g. Main Warehouse"
                        value={form.name}
                        onChange={(
                          event,
                        ) =>
                          setForm({
                            ...form,
                            name: event.target
                              .value,
                          })
                        }
                      />
                    </div>

                    <div className="transfer-field">
                      <label>
                        Warehouse code{" "}
                        <span>*</span>
                      </label>

                      <input
                        placeholder="e.g. MAIN-001"
                        value={form.code}
                        onChange={(
                          event,
                        ) =>
                          setForm({
                            ...form,
                            code: event.target
                              .value,
                          })
                        }
                      />
                    </div>

                    <div className="transfer-field warehouse-address-field">
                      <label>
                        Address
                      </label>

                      <input
                        placeholder="Warehouse address or location"
                        value={
                          form.address
                        }
                        onChange={(
                          event,
                        ) =>
                          setForm({
                            ...form,
                            address:
                              event.target
                                .value,
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className="warehouse-create-actions">
                    <button
                      type="button"
                      className="inventory-secondary-button"
                      onClick={() =>
                        setShowCreateWarehouse(
                          false,
                        )
                      }
                      disabled={
                        creatingWarehouse
                      }
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      className="inventory-primary-button"
                      onClick={
                        createWarehouse
                      }
                      disabled={
                        creatingWarehouse
                      }
                    >
                      <Plus size={17} />

                      {creatingWarehouse
                        ? "Creating..."
                        : "Create Warehouse"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   Loading State
========================================================= */

function LoadingState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="inventory-loading">
      <div className="inventory-loading-spinner" />

      <div>
        <strong>{title}</strong>

        <span>{description}</span>
      </div>
    </div>
  );
}

/* =========================================================
   Empty State
========================================================= */

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="inventory-empty">
      <div className="inventory-empty-icon">
        {icon}
      </div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}