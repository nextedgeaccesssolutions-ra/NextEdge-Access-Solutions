"use client";

import "./cart.css";

import { useEffect, useMemo, useState } from "react";

type Product = {
  id: string; category: string; code: string; name: string; price: number;
  image?: string;
};
const peso = (n: number) => "₱" + Math.round(n).toLocaleString("en-PH");

export default function CartClient({ products }: { products: Product[] }) {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const byId = useMemo(() => new Map(products.map(p => [p.id, p])), [products]);
  const lines = Object.entries(cart)
    .filter(([id, qty]) => byId.has(id) && Number.isFinite(qty) && qty > 0)
    .map(([id, qty]) => ({ product: byId.get(id)!, quantity: qty }));
  const count = lines.reduce((sum, line) => sum + line.quantity, 0);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.product.price, 0);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("neasCart") || "{}");
      if (saved && typeof saved === "object" && !Array.isArray(saved)) {
        const clean: Record<string, number> = {};
        for (const [id, value] of Object.entries(saved)) {
          const quantity = Math.floor(Number(value));
          if (quantity > 0 && quantity <= 999) clean[id] = quantity;
        }
        setCart(clean);
      }
    } catch { setCart({}); }
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) {
      try { localStorage.setItem("neasCart", JSON.stringify(cart)); } catch {}
    }
  }, [cart, ready]);

  function setQuantity(id: string, value: number) {
    setCart(current => {
      const next = { ...current };
      const quantity = Math.floor(value);
      if (quantity <= 0) delete next[id];
      else next[id] = Math.min(999, quantity);
      return next;
    });
  }

  return (
    <main className="wrap neas-cart-page">
      <div className="eyebrow">NEAS Online Store</div>
      <h1>Your Shopping Cart</h1>
      <p className="muted">Review your selected equipment separately from the product catalogue. You can update quantities or remove items before checkout.</p>
      {!ready ? <p className="muted">Loading your cart…</p> : !lines.length ? (
        <section className="neas-cart-empty">
          <div style={{ fontSize: 38 }} aria-hidden="true">🛒</div>
          <h2>Your cart is empty</h2>
          <p className="muted">Add products from the NEAS catalogue and they will appear here.</p>
          <a className="btn btn-primary" href="/store">Continue shopping</a>
        </section>
      ) : (
        <div className="neas-cart-layout">
          <section className="neas-cart-items" aria-label="Cart items">
            {lines.map(({ product, quantity }) => (
              <article className="neas-cart-item" key={product.id}>
                <div className="neas-cart-image">
                  {product.image ? <img src={product.image} alt={product.name} /> : <span aria-hidden="true">🛡️</span>}
                </div>
                <div className="neas-cart-info">
                  <span className="eyebrow">{product.category}</span>
                  <h2>{product.name}</h2>
                  {product.code && <p className="muted">Code: {product.code}</p>}
                  <strong>{peso(product.price)} <small className="muted">/ unit</small></strong>
                  <div className="neas-cart-controls">
                    <button type="button" aria-label={"Decrease " + product.name} onClick={() => setQuantity(product.id, quantity - 1)}>−</button>
                    <input aria-label={"Quantity of " + product.name} type="number" min={1} max={999} value={quantity} onChange={e => setQuantity(product.id, Number(e.target.value))} />
                    <button type="button" aria-label={"Increase " + product.name} onClick={() => setQuantity(product.id, quantity + 1)}>+</button>
                    <button type="button" className="neas-cart-remove" onClick={() => setQuantity(product.id, 0)}>Remove</button>
                  </div>
                </div>
                <strong className="neas-cart-line-total">{peso(product.price * quantity)}</strong>
              </article>
            ))}
          </section>
          <aside className="neas-cart-summary">
            <h2>Order Summary</h2>
            <div><span>Items</span><b>{count}</b></div>
            <div><span>Subtotal</span><b>{peso(total)}</b></div>
            <p className="muted">Stock, delivery and final order details are confirmed by NEAS before fulfilment.</p>
            <a className="btn btn-primary neas-cart-checkout" href="/store?checkout=1">Proceed to checkout</a>
            <a className="neas-cart-continue" href="/store">Continue shopping</a>
            <button type="button" className="neas-cart-clear" onClick={() => setCart({})}>Clear cart</button>
          </aside>
        </div>
      )}
    </main>
  );
}
