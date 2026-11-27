"use client";

import { useEffect, useState } from "react";

type Product = { id: string; name: string; category: string; price: number };
type Props = {
  products: Product[];
  qty: Record<string, number>;
  setQty: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  add: (id: string, quantity: number) => void;
  checkout: (selected?: Record<string, number>) => void;
  onAddToCart?: (product: Product, quantity: number) => void;
};

const peso = (n: number) => "₱" + Math.round(n).toLocaleString("en-PH");

export default function FloatingStoreControls({
  products, qty, setQty, add, checkout, onAddToCart,
}: Props) {
  const [activeId, setActiveId] = useState(products[0]?.id ?? "");
  const [visible, setVisible] = useState(false);
  const active = products.find(p => p.id === activeId) ?? products[0];

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 420);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>(".sp[data-product-id]"));
    if (!cards.length || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(entries => {
      const candidates = entries
        .filter(entry => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio);
      const id = candidates[0]?.target.getAttribute("data-product-id");
      if (id) setActiveId(id);
    }, { root: null, rootMargin: "-22% 0px -48% 0px", threshold: [0.1, 0.25, 0.5, 0.75] });
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, [products]);

  if (!active || !visible) return null;
  const quantity = qty[active.id] || 1;
  const changeQty = (next: number) =>
    setQty(current => ({ ...current, [active.id]: Math.max(1, Math.min(999, next)) }));

  return (
    <aside className="neas-floating-purchase" aria-label="Quick purchase for the visible product">
      <div className="neas-floating-product">
        <span className="neas-floating-category">{active.category}</span>
        <strong title={active.name}>{active.name}</strong>
        <b>{peso(active.price)}</b>
      </div>
      <div className="neas-floating-quantity" aria-label="Quantity">
        <button type="button" aria-label="Decrease quantity" onClick={() => changeQty(quantity - 1)}>−</button>
        <span aria-live="polite">{quantity}</span>
        <button type="button" aria-label="Increase quantity" onClick={() => changeQty(quantity + 1)}>+</button>
      </div>
      <div className="neas-floating-actions">
        <button
          type="button"
          className="buy"
          onClick={() => checkout({ [active.id]: quantity })}
        >BUY NOW</button>
        <button
          type="button"
          className="add"
          onClick={() => {
            add(active.id, quantity);
            onAddToCart?.(active, quantity);
            changeQty(1);
          }}
        >ADD TO CART</button>
      </div>
    </aside>
  );
}
