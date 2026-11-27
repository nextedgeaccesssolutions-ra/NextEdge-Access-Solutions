"use client";
import { useState } from "react";
import type { ServicePage } from "@/lib/service-pages";

export default function SolarServiceManager({ initial }: { initial: ServicePage }) {
  const [page, setPage] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const set = (key: keyof ServicePage, value: unknown) => setPage(current => ({ ...current, [key]: value }));
  const lines = (value: string[]) => value.join("\n");
  const parseLines = (value: string) => value.split("\n").map(item => item.trim()).filter(Boolean);
  const faqText = page.faqs.map(faq => faq.q + " | " + faq.a).join("\n");
  async function upload(file?: File) {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) || file.size > 3 * 1024 * 1024) { setMessage("Choose a JPG, PNG, WebP or GIF image up to 3 MB."); return; }
    const body = new FormData(); body.append("file", file); setBusy(true); setMessage("Uploading page image…");
    try {
      const response = await fetch("/api/admin/upload", { method: "POST", body });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.url) throw new Error(result.error || "Upload failed.");
      set("image", result.url); setMessage("Image uploaded. Save and publish to apply it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Image upload failed."); }
    finally { setBusy(false); }
  }
  async function save() {
    const faqs = page.faqs;
    setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/admin/site", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ solarServicePage: { title: page.title, h1: page.h1, metaDescription: page.metaDescription, eyebrow: page.eyebrow, intro: page.intro, image: page.image, scope: page.scope, industries: page.industries, experience: page.experience, faqs, enquiryLabel: page.enquiryLabel } }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Could not save service page.");
      setMessage("Solar service page saved and published.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save service page."); }
    finally { setBusy(false); }
  }
  return <div className="wrap" style={{ padding: "0 20px 40px", maxWidth: 980 }}>
    <div className="eyebrow">Service content management</div>
    <h2 style={{ marginTop: 4 }}>Solar Energy &amp; Industrial Services</h2>
    <p className="muted">Edit the public service page, SEO metadata, service scope and FAQs. Changes are saved to the existing website settings store.</p>
    <div className="card" style={{ padding: 18, border: "1px solid var(--line)", display: "grid", gap: 12 }}>
      <label>SEO title<input className="input" value={page.title} maxLength={100} onChange={e => set("title",e.target.value)}/><small className="muted">{page.title.length}/100 characters</small></label>
      <label>Page H1<input className="input" value={page.h1} maxLength={120} onChange={e => set("h1",e.target.value)}/></label>
      <label>Meta description<textarea className="input" rows={3} maxLength={170} value={page.metaDescription} onChange={e => set("metaDescription",e.target.value)}/><small className="muted">{page.metaDescription.length}/170 characters</small></label>
      <label>Eyebrow<input className="input" value={page.eyebrow} onChange={e => set("eyebrow",e.target.value)}/></label>
      <label>Introduction<textarea className="input" rows={4} value={page.intro} onChange={e => set("intro",e.target.value)}/></label>
      <label>Hero / service image<input className="input" value={page.image || ""} onChange={e => set("image",e.target.value)}/></label>
      <label className="btn btn-ghost" style={{ display: "inline-flex", width: "fit-content", cursor: "pointer" }}>Upload / replace image<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={e => { const file=e.target.files?.[0]; e.target.value=""; void upload(file); }}/></label>
      <label>Service scope (one item per line)<textarea className="input" rows={8} value={lines(page.scope)} onChange={e => set("scope",parseLines(e.target.value))}/></label>
      <label>Target industries (one item per line)<textarea className="input" rows={5} value={lines(page.industries)} onChange={e => set("industries",parseLines(e.target.value))}/></label>
      <label>Relevant experience (one item per line)<textarea className="input" rows={4} value={lines(page.experience)} onChange={e => set("experience",parseLines(e.target.value))}/></label>
      <label>FAQs (one question and answer per line, separated by |)<textarea className="input" rows={8} defaultValue={faqText} onChange={e => set("faqs",e.target.value.split("\n").map(line => { const i=line.indexOf("|"); return i>0 ? { q:line.slice(0,i).trim(), a:line.slice(i+1).trim() } : null; }).filter((item): item is {q:string;a:string} => !!item))}/><small className="muted">Format: Question | Answer</small></label>
      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save & publish service page"}</button>
        <span className="muted" role="status">{message}</span>
        <a className="btn btn-ghost" href="/services/solar-energy-industrial" target="_blank" rel="noopener">Preview public page ↗</a>
      </div>
    </div>
  </div>;
}
