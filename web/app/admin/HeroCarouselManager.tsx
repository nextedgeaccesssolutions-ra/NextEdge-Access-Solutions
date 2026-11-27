"use client";
import { useState } from "react";
import type { HeroCarouselSlide } from "@/lib/hero-carousel";

export default function HeroCarouselManager({ initial }: { initial: HeroCarouselSlide[] }) {
  const [slides, setSlides] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const update = (index: number, patch: Partial<HeroCarouselSlide>) =>
    setSlides(current => current.map((slide, i) => i === index ? { ...slide, ...patch } : slide));
  const move = (index: number, direction: -1 | 1) => {
    setSlides(current => {
      const next = [...current], target = index + direction;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };
  async function upload(index: number, file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 3 * 1024 * 1024) {
      setMessage("Choose a JPG, PNG, WebP or GIF image up to 3 MB."); return;
    }
    const body = new FormData(); body.append("file", file);
    setBusy(true); setMessage("Uploading image…");
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error(result.error || "Upload failed.");
      update(index, { image: result.url }); setMessage("Image uploaded. Save and publish to apply it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setBusy(false); }
  }
  async function save() {
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/site", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ heroCarousel: slides }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save carousel.");
      setMessage("Carousel saved and published.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save carousel."); }
    finally { setBusy(false); }
  }
  function addSlide() {
    if (slides.length >= 8) { setMessage("A maximum of eight slides is supported."); return; }
    setSlides(current => [...current, { id: "slide-" + Date.now(), label: "New service", title: "Add a headline", description: "Describe this NEAS service or capability.", image: "/img/hero-power.webp", alt: "NEAS service image", ctaLabel: "Request a Quote", ctaUrl: "/contact", enabled: true }]);
    setMessage("New slide added. Complete its content before saving.");
  }
  return <div className="wrap" style={{ padding: "0 20px 40px", maxWidth: 1050 }}>
    <div className="eyebrow">Website content</div>
    <h2 style={{ marginTop: 4 }}>Homepage Hero Carousel</h2>
    <p className="muted">Manage up to eight slides. Rotation is automatic every five seconds; visitors can also use the arrows and slide indicators. Existing hero assets remain the defaults until you publish changes.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", margin: "16px 0" }}>
      <button type="button" className="btn btn-primary" onClick={addSlide} disabled={busy || slides.length >= 8}>＋ Add slide</button>
      <button type="button" className="btn btn-ghost" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save & publish carousel"}</button>
      <span className="muted" role="status" style={{ alignSelf: "center" }}>{message}</span>
    </div>
    <div style={{ display: "grid", gap: 14 }}>
      {slides.map((slide, index) => <section className="card" key={slide.id} style={{ padding: 16, border: "1px solid var(--line)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <strong>Slide {index + 1}: {slide.label}</strong>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <button type="button" className="btn btn-ghost" disabled={busy || index === 0} onClick={() => move(index, -1)} aria-label={"Move slide " + (index + 1) + " up"}>↑</button>
            <button type="button" className="btn btn-ghost" disabled={busy || index === slides.length - 1} onClick={() => move(index, 1)} aria-label={"Move slide " + (index + 1) + " down"}>↓</button>
            <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13 }}><input type="checkbox" checked={slide.enabled} onChange={e => update(index, { enabled: e.target.checked })}/> Enabled</label>
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => setSlides(current => current.filter((_, i) => i !== index))}>Delete</button>
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 260px) minmax(0, 1fr)", gap: 16, marginTop: 14 }}>
          <div>
            <img src={slide.image} alt={slide.alt} style={{ width: "100%", height: 145, objectFit: "cover", borderRadius: 8, background: "#e5e7eb" }}/>
            <label className="btn btn-ghost" style={{ display: "inline-flex", marginTop: 8, cursor: "pointer" }}>Upload / replace image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e => { const file=e.target.files?.[0]; e.target.value=""; void upload(index,file); }}/></label>
            <label style={{ display: "block", marginTop: 10, fontSize: 13 }}>Image URL<input className="input" value={slide.image} onChange={e => update(index,{image:e.target.value})}/></label>
            <label style={{ display: "block", marginTop: 10, fontSize: 13 }}>Image alt text<input className="input" value={slide.alt} onChange={e => update(index,{alt:e.target.value})}/></label>
          </div>
          <div style={{ display: "grid", gap: 10 }}>
            <label>Eyebrow / slide label<input className="input" value={slide.label} onChange={e => update(index,{label:e.target.value})}/></label>
            <label>Headline<input className="input" value={slide.title} onChange={e => update(index,{title:e.target.value})}/></label>
            <label>Description<textarea className="input" rows={3} value={slide.description} onChange={e => update(index,{description:e.target.value})}/></label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <label>CTA label<input className="input" value={slide.ctaLabel} onChange={e => update(index,{ctaLabel:e.target.value})}/></label>
              <label>CTA destination<input className="input" value={slide.ctaUrl} onChange={e => update(index,{ctaUrl:e.target.value})}/></label>
            </div>
          </div>
        </div>
      </section>)}
    </div>
    <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 18 }}>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save & publish carousel"}</button>
      <span className="muted" role="status">{message}</span>
    </div>
  </div>;
}
