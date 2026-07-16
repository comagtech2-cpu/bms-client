import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search,
  Plus,
  ShoppingBag,
  Trash2,
  User,
  CheckCircle,
  Printer,
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { format } from "date-fns";
import api from "../api/axios";
import { useCartStore } from "../store/cartStore";
import { useCurrency } from "../hooks/useCurrency";
import type { Product, Category, Customer, Transaction } from "../types";

type PayMethod = "CASH" | "CARD" | "TRANSFER" | "CREDIT";

// ─── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({
  tx,
  business,
  onClose,
}: {
  tx: Transaction;
  business: any;
  onClose: () => void;
}) {
  const currency = business?.currency || "$";
  const vatRate = business?.vatRate !== undefined ? business.vatRate : 7.5;
  const subtotal = tx.total / (1 + vatRate / 100);
  const tax = tx.total - subtotal;
  const staffName = tx.staff?.name ?? "Staff";
  const customerName = tx.customer?.name ?? tx.guestName ?? "Guest Customer";

  return (
    <div
      className="modal-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header no-print">
          <h2 className="modal-title">Sale Complete!</h2>
          <button className="modal-close" onClick={onClose}>
            ×
          </button>
        </div>
        <div id="receipt-print-area" className="receipt-container">
          {/* Header */}
          <div className="receipt-header">
            <div className="receipt-title">
              {business?.name ?? "My Business"}
            </div>
            {business?.address && (
              <div className="receipt-subtitle">{business.address}</div>
            )}
            {business?.phone && (
              <div className="receipt-subtitle">{business.phone}</div>
            )}
          </div>

          {/* Meta Grid */}
          <div className="receipt-meta-grid">
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Receipt #</span>
              <span className="receipt-meta-value">
                {String(tx.id).padStart(5, "0")}
              </span>
            </div>
            <div className="receipt-meta-item right">
              <span className="receipt-meta-label">Status</span>
              <span
                className="receipt-meta-value"
                style={{ color: "var(--accent-green)", fontWeight: 800 }}
              >
                PAID
              </span>
            </div>
            <div className="receipt-meta-item">
              <span className="receipt-meta-label">Date & Time</span>
              <span className="receipt-meta-value">
                {format(new Date(tx.createdAt), "MMM d, yyyy, h:mm a")}
              </span>
            </div>
            <div className="receipt-meta-item right">
              <span className="receipt-meta-label">Served By</span>
              <span className="receipt-meta-value">{staffName}</span>
            </div>
          </div>

          {/* Customer info if present */}
          {(tx.customer || tx.guestName) && (
            <div
              style={{
                fontSize: 11,
                marginBottom: 12,
                color: "var(--text-muted)",
              }}
            >
              CUSTOMER:{" "}
              <strong style={{ color: "var(--text-primary)" }}>
                {customerName}
              </strong>
            </div>
          )}

          {/* Items Table */}
          <table className="receipt-table">
            <thead>
              <tr>
                <th style={{ textAlign: "left" }}>Item</th>
                <th style={{ textAlign: "center" }}>Qty</th>
                <th style={{ textAlign: "right" }}>Price</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {tx.items?.map((item) => (
                <tr key={item.id}>
                  <td style={{ textAlign: "left", fontWeight: 500 }}>
                    {item.product?.name}
                  </td>
                  <td style={{ textAlign: "center" }}>{item.qty}</td>
                  <td style={{ textAlign: "right" }}>
                    {currency}
                    {item.price.toFixed(2)}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>
                    {currency}
                    {(item.qty * item.price).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals Panel */}
          <div className="receipt-totals-panel">
            <div className="receipt-total-row">
              <span>Subtotal</span>
              <span>
                {currency}
                {subtotal.toLocaleString("en", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="receipt-total-row">
              <span>Tax (VAT {vatRate}%)</span>
              <span>
                {currency}
                {tax.toLocaleString("en", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="receipt-total-row grand">
              <span style={{ fontWeight: 700 }}>GRAND TOTAL</span>
              <span className="receipt-total-row grand-amount">
                {currency}
                {tx.total.toLocaleString("en", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="receipt-total-row" style={{ marginTop: 4 }}>
              <span>Amount Paid ({tx.paymentMethod})</span>
              <span>
                {currency}
                {tx.amountPaid.toLocaleString("en", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="receipt-total-row">
              <span>Balance Due</span>
              <span>
                {currency}
                {(tx.change > 0
                  ? 0
                  : Math.max(0, tx.total - tx.amountPaid)
                ).toFixed(2)}
              </span>
            </div>
            {tx.change > 0 && (
              <div
                className="receipt-total-row"
                style={{
                  color: "var(--accent-green)",
                  fontWeight: 600,
                  marginTop: 2,
                }}
              >
                <span>Change Given</span>
                <span>
                  {currency}
                  {tx.change.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          <div
            style={{
              borderTop: "1.5px dashed var(--border)",
              margin: "16px 0",
            }}
          />

          <div
            style={{
              textAlign: "center",
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: "0.05em",
              color: "var(--text-muted)",
            }}
          >
            THANK YOU FOR YOUR BUSINESS!
          </div>

          <div className="receipt-digital-card">
            <QRCodeSVG
              value={`Receipt #${String(tx.id).padStart(5, "0")} | ${business?.name ?? ""} | ${currency}${tx.total.toFixed(2)}`}
              size={56}
              className="receipt-digital-qr"
            />
            <div className="receipt-digital-info">
              <span className="receipt-digital-title">Digital Copy</span>
              <span className="receipt-digital-desc">
                Scan this code to download or share your digital receipt.
              </span>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            Close
          </button>
          <button className="btn-primary" onClick={() => window.print()}>
            <Printer size={14} /> Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Sales Page ───────────────────────────────────────────────────────────
export default function Sales() {
  const qc = useQueryClient();
  const currency = useCurrency();
  const {
    items,
    addItem,
    removeItem,
    updateQty,
    updatePrice,
    setCustomer,
    clearCart,
    customerId,
    total,
  } = useCartStore();

  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [payMethod, setPayMethod] = useState<PayMethod>("CASH");
  const [amountPaid, setAmountPaid] = useState("");
  const [guestName, setGuestName] = useState("");
  const [completedTx, setCompletedTx] = useState<Transaction | null>(null);
  const [error, setError] = useState("");
  const [outOfStockMsg, setOutOfStockMsg] = useState<string | null>(null);

  // Pricing modal — shown when a no-price (stock-only) product is selected
  const [pricingModal, setPricingModal] = useState<{ product: Product } | null>(
    null,
  );
  const [modalPrice, setModalPrice] = useState("");
  const [modalQty, setModalQty] = useState("1");

  const showOutOfStock = (name: string) => {
    setOutOfStockMsg(`"${name}" is out of stock!`);
    setTimeout(() => setOutOfStockMsg(null), 3000);
  };

  const handleAddItem = (p: Product) => {
    if (p.stock === 0) {
      showOutOfStock(p.name);
      return;
    }
    const cartItem = items.find((i) => i.productId === p.id);
    if (cartItem && cartItem.qty >= p.stock) {
      showOutOfStock(p.name);
      return;
    }
    // No price → open pricing popup instead of adding directly
    if (p.price === 0) {
      setModalPrice("");
      setModalQty("1");
      setPricingModal({ product: p });
      return;
    }
    addItem({ productId: p.id, name: p.name, price: p.price, stock: p.stock });
  };

  const handlePricingConfirm = () => {
    if (!pricingModal) return;
    const price = parseFloat(modalPrice);
    const qty = Math.max(1, parseInt(modalQty) || 1);
    if (!price || price <= 0) return;
    const p = pricingModal.product;
    const existing = items.find((i) => i.productId === p.id);
    if (existing) {
      updatePrice(p.id, price);
      updateQty(p.id, Math.min(existing.qty + qty, p.stock));
    } else {
      addItem({ productId: p.id, name: p.name, price, stock: p.stock });
      if (qty !== 1) {
        updateQty(p.id, Math.min(qty, p.stock));
      }
    }
    setPricingModal(null);
  };

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["products", { search, categoryId: activeCategory }],
    queryFn: () =>
      api
        .get("/products", {
          params: {
            search: search || undefined,
            categoryId: activeCategory || undefined,
          },
        })
        .then((r) => r.data.data ?? r.data),
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["categories"],
    queryFn: () => api.get("/categories").then((r) => r.data),
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: () => api.get("/customers").then((r) => r.data),
  });

  const { data: business } = useQuery({
    queryKey: ["business"],
    queryFn: () => api.get("/settings/business").then((r) => r.data),
  });

  const checkoutMutation = useMutation({
    mutationFn: (data: any) =>
      api.post("/transactions", data).then((r) => r.data),
    onSuccess: (tx) => {
      setCompletedTx(tx);
      clearCart();
      setAmountPaid("");
      setGuestName("");
      qc.invalidateQueries({ queryKey: ["dashboard-stats"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["low-stock"] });
    },
    onError: (err: any) =>
      setError(err.response?.data?.message ?? "Checkout failed"),
  });

  const fmt = (n?: number | null) => {
    const val = Number(n);
    if (isNaN(val)) return "0";
    return val.toLocaleString(undefined, {
      minimumFractionDigits: val % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
  };

  const cartTotal = total();
  const paid = parseFloat(amountPaid) || 0;
  const change = payMethod === "CASH" ? Math.max(0, paid - cartTotal) : 0;
  const canComplete =
    items.length > 0 &&
    (payMethod === "CREDIT" ? !!customerId : payMethod !== "CASH" || paid > 0);

  const handleCompleteSale = () => {
    if (!canComplete) return;
    setError("");
    checkoutMutation.mutate({
      customerId: customerId || undefined,
      guestName: customerId ? undefined : guestName.trim() || undefined,
      paymentMethod: payMethod,
      amountPaid:
        payMethod === "CREDIT" ? 0 : payMethod === "CASH" ? paid : cartTotal,
      items: items.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        price: i.price,
      })),
    });
  };

  const payBtns: { method: PayMethod; label: string; icon: string }[] = [
    { method: "CASH", label: "CASH", icon: "💵" },
    { method: "CARD", label: "CARD", icon: "💳" },
    { method: "TRANSFER", label: "TRANSFER", icon: "🏦" },
    { method: "CREDIT", label: "CREDIT", icon: "📋" },
  ];

  return (
    <div
      className="pos-layout"
      style={{ height: "calc(100vh - 60px)", margin: "-24px" }}
    >
      {/* Left: Product Selection */}
      <div className="pos-left">
        {/* Search */}
        <div className="pos-search">
          <Search className="pos-search-icon" />
          <input
            type="text"
            placeholder="Search items by name, SKU or scan barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            id="pos-search-input"
          />
        </div>

        {/* Category Tabs */}
        <div className="category-tabs">
          <button
            className={`cat-tab ${activeCategory === null ? "active" : ""}`}
            onClick={() => setActiveCategory(null)}
          >
            All Items
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`cat-tab ${activeCategory === cat.id ? "active" : ""}`}
              onClick={() => setActiveCategory(cat.id)}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product List */}
        <div className="product-list">
          {products.map((p) => {
            const isOutOfStock = p.stock === 0;
            const noPrice = p.price === 0;
            return (
              <div
                key={p.id}
                className={`product-list-item ${isOutOfStock ? "out-of-stock" : ""}`}
                onClick={() => handleAddItem(p)}
              >
                <div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--text-primary)",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--accent-blue)",
                      marginTop: 4,
                    }}
                  >
                    {noPrice ? (
                      <span
                        style={{
                          color: "var(--accent-orange)",
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {/*💰 Price set at sale*/}
                      </span>
                    ) : (
                      `${currency}${p.price.toFixed(2)}`
                    )}
                  </div>
                </div>
                <button
                  className="btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 600,
                    height: 36,
                    opacity: isOutOfStock ? 0.4 : 1,
                  }}
                  disabled={isOutOfStock}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleAddItem(p);
                  }}
                >
                  <Plus size={14} /> Add
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Cart & Payment */}
      <div className="pos-right">
        <div
          style={{
            fontWeight: 800,
            fontSize: 15,
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <ShoppingBag size={16} /> Current Sale
          </div>
          {items.length > 0 && (
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--accent-blue)",
                background: "rgba(79,124,255,0.1)",
                padding: "2px 8px",
                borderRadius: 99,
              }}
            >
              {items.reduce((s, i) => s + i.qty, 0)} items
            </span>
          )}
        </div>

        {/* Cart Items */}
        <div className="cart-section">
          {items.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--text-muted)",
                fontSize: 12,
                padding: "20px 0",
              }}
            >
              No items added yet
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.productId}
                className="cart-item"
                style={{
                  flexDirection: "column",
                  alignItems: "stretch",
                  gap: 8,
                  padding: "10px 0",
                }}
              >
                {/* Top row: Product Name & Remove Button */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div
                    className="cart-item-name"
                    style={{
                      fontWeight: 700,
                      fontSize: 14,
                      color: "var(--text-primary)",
                    }}
                  >
                    {item.name}
                  </div>
                  <button
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: "1px solid rgba(239,68,68,0.3)",
                      borderRadius: 6,
                      color: "#ef4444",
                      width: 28,
                      height: 28,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(item.productId);
                    }}
                    title="Remove item"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Bottom row: Unit Price × Qty = Line Total + Controls */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                    marginTop: 2,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                    }}
                  >
                    {currency}
                    {fmt(item.price)}{" "}
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 500 }}
                    >
                      ×
                    </span>{" "}
                    {item.qty}{" "}
                    <span
                      style={{ color: "var(--text-muted)", fontWeight: 500 }}
                    >
                      =
                    </span>{" "}
                    <span
                      style={{ color: "var(--accent-blue)", fontWeight: 800 }}
                    >
                      {currency}
                      {fmt(item.price * item.qty)}
                    </span>
                  </div>
                  <div className="qty-control" style={{ gap: 6 }}>
                    <button
                      className="qty-btn"
                      style={{ width: 26, height: 26, fontSize: 16 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQty(item.productId, item.qty - 1);
                      }}
                      title="Decrease quantity"
                    >
                      −
                    </button>
                    <span
                      className="qty-display"
                      style={{ minWidth: 22, fontSize: 14 }}
                    >
                      {item.qty}
                    </span>
                    <button
                      className="qty-btn"
                      style={{ width: 26, height: 26, fontSize: 16 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        updateQty(item.productId, item.qty + 1);
                      }}
                      title="Increase quantity"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Totals */}
        <div className="cart-total">
          <div className="cart-total-row">
            <span>Subtotal</span>
            <span>
              {currency}
              {cartTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
          <div className="cart-total-main">
            <span>Total</span>
            <span>
              {currency}
              {cartTotal.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>

        {/* Customer */}
        <div>
          <div
            className="cart-label"
            style={{ display: "flex", alignItems: "center", gap: 4 }}
          >
            <User size={11} /> Customer
          </div>
          <select
            className="form-control"
            value={customerId ?? ""}
            onChange={(e) => setCustomer(e.target.value || null)}
            id="pos-customer-select"
            style={{ marginBottom: customerId ? 0 : 8 }}
          >
            <option value="">👤 Guest Customer (Custom Name)</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          {!customerId && (
            <input
              type="text"
              className="form-control"
              placeholder="Enter Guest Customer Name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              id="pos-guest-name-input"
            />
          )}
        </div>

        {/* Payment Methods */}
        <div>
          <div className="cart-label">Payment Method</div>
          <div className="payment-methods">
            {payBtns.map((btn) => (
              <button
                key={btn.method}
                className={`pay-btn ${btn.method.toLowerCase()} ${payMethod === btn.method ? "active" : ""}`}
                onClick={() => setPayMethod(btn.method)}
                id={`pay-btn-${btn.method.toLowerCase()}`}
              >
                <span>{btn.icon}</span>
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Amount Paid (CASH only) */}
        {payMethod === "CASH" && (
          <div>
            <div className="cart-label">Amount Received</div>
            <input
              type="number"
              className="form-control"
              placeholder="0.00"
              value={amountPaid}
              onChange={(e) => setAmountPaid(e.target.value)}
              id="pos-amount-paid"
              min={0}
              step={0.01}
            />
            <div className="amount-row" style={{ marginTop: 6 }}>
              <span className="amount-label">CHANGE</span>
              <span className="change-value">
                {currency}
                {change.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {payMethod === "CREDIT" && !customerId && (
          <div
            className="alert alert-warning"
            style={{ fontSize: 11, padding: "8px 10px", marginTop: 10 }}
          >
            👤 A registered customer must be selected for credit transactions.
          </div>
        )}

        {error && <div className="alert alert-error">{error}</div>}

        {/* Complete Sale */}
        <button
          className="complete-btn"
          onClick={handleCompleteSale}
          disabled={!canComplete || checkoutMutation.isPending}
          id="pos-complete-btn"
        >
          {checkoutMutation.isPending ? (
            <>
              <span
                className="loading-spinner"
                style={{ width: 16, height: 16, borderWidth: 2 }}
              />{" "}
              Processing...
            </>
          ) : (
            <>
              <CheckCircle size={16} /> Complete Sale
            </>
          )}
        </button>
      </div>

      {/* ── Pricing Modal (Stock-Only products with no preset price) ────────── */}
      {pricingModal && (
        <div
          className="modal-overlay"
          onClick={(e) => e.target === e.currentTarget && setPricingModal(null)}
        >
          <div className="modal-box" style={{ maxWidth: 380 }}>
            <div className="modal-header">
              <h2 className="modal-title">Set Selling Price</h2>
              <button
                className="modal-close"
                onClick={() => setPricingModal(null)}
              >
                ×
              </button>
            </div>

            {/* Product name banner */}
            <div
              style={{
                background: "rgba(245,158,11,0.08)",
                border: "1px solid rgba(245,158,11,0.25)",
                borderRadius: 8,
                padding: "10px 14px",
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 20 }}>📦</span>
              <div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--text-primary)",
                  }}
                >
                  {pricingModal.product.name}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 2,
                  }}
                >
                  No preset price — enter the price for this sale
                </div>
              </div>
            </div>

            <div className="grid-2" style={{ gap: 12, marginBottom: 20 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">
                  Selling Price ({currency}) *
                </label>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  className="form-control"
                  value={modalPrice}
                  onChange={(e) => setModalPrice(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handlePricingConfirm()}
                  style={{ fontSize: 18, fontWeight: 700, textAlign: "center" }}
                />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label className="form-label">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max={pricingModal.product.stock}
                  placeholder="1"
                  className="form-control"
                  value={modalQty}
                  onChange={(e) => setModalQty(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePricingConfirm()}
                  style={{ fontSize: 18, fontWeight: 700, textAlign: "center" }}
                />
              </div>
            </div>

            {/* Live total preview */}
            {parseFloat(modalPrice) > 0 && (
              <div
                style={{
                  background: "var(--bg-input)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 18,
                  border: "1px solid var(--border)",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    color: "var(--text-muted)",
                    fontWeight: 600,
                  }}
                >
                  Line Total
                </span>
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: "var(--accent-blue)",
                  }}
                >
                  {currency}
                  {(parseFloat(modalPrice) * (parseInt(modalQty) || 1)).toFixed(
                    2,
                  )}
                </span>
              </div>
            )}

            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setPricingModal(null)}
              >
                Cancel
              </button>
              <button
                className="btn-primary"
                onClick={handlePricingConfirm}
                disabled={!modalPrice || parseFloat(modalPrice) <= 0}
              >
                <Plus size={14} /> Add to Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Out-of-Stock Toast */}
      {outOfStockMsg && (
        <div
          style={{
            position: "fixed",
            bottom: 120,
            left: "50%",
            transform: "translateX(-50%)",
            background: "linear-gradient(135deg, #ff4d4f 0%, #cf1322 100%)",
            color: "#fff",
            padding: "14px 28px",
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 14,
            boxShadow: "0 8px 32px rgba(255,77,79,0.45)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 10,
            letterSpacing: "0.01em",
            animation: "slideUpFade 0.3s ease",
          }}
        >
          <span style={{ fontSize: 20 }}>🚫</span>
          {outOfStockMsg}
        </div>
      )}

      {/* Receipt Modal */}
      {completedTx && (
        <ReceiptModal
          tx={completedTx}
          business={business}
          onClose={() => setCompletedTx(null)}
        />
      )}
    </div>
  );
}
