"use client";
import { useState } from "react";
import type { Seo, Social, Business } from "@/lib/settings";
import { safeHttpsUrl, safeImageUrl } from "@/lib/html-safety";

type Tab = "seo" | "google" | "social" | "photos";

const PHOTO_FIELDS = [
  ["hero", "Homepage hero image", "Main homepage banner image", "/img/hero-city.jpg"],
  ["ropeAccess", "Rope Access service photo", "Our Services card", "/img/ce6c22d9bace.jpg"],
  ["inspection", "Inspection service photo", "NDT inspection card", "/img/877206fcf5ba.jpg"],
  ["coatings", "Coatings service photo", "Blasting and painting card", "/img/6447ca2a761e.jpg"],
  ["metMast", "Met Mast & Telecom photo", "Met mast and telecom card", "/img/0cc8f91dab71.jpg"],
  ["training", "Training & PPE photo", "Training and PPE card", "/img/390f5ed3244c.jpg"],
  ["windEnergy", "Wind Energy service photo", "Wind turbine service card", "/img/0ce37cb33507.jpg"],
  ["clientTriconti", "Triconti ECC client photo", "Displayed on the Our Clients page", "/img/hero-wind.jpg"],
  ["clientAtimonan", "Atimonan Windkraft client photo", "Displayed on the Our Clients page", "/img/0ce37cb33507.jpg"],
  ["clientPhilsurv", "Philsurv Geodetic Engineer photo", "Displayed on the Our Clients page", "/img/hero-metmast.jpg"],
] as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return <label className="field" style={{ marginBottom: 10 }}>{label}{children}{hint && <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{hint}</span>}</label>;
}

export default function SettingsPanel(props: { seo: Seo; social: Social; business: Business; sitePhotos: Record<string, string> }) {
  const [tab, setTab] = useState<Tab>("seo");
  const [seo, setSeo] = useState(props.seo);
  const [social, setSocial] = useState(props.social);
  const [biz, setBiz] = useState(props.business);
  const [sitePhotos, setSitePhotos] = useState<Record<string, string>>(() => Object.fromEntries(PHOTO_FIELDS.map(([key, , , fallback]) => [key, props.sitePhotos[key] || fallback])));
  const [photoUrlDrafts, setPhotoUrlDrafts] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  async function save(body: unknown) {
    setBusy(true); setMsg("");
    try {
      const r = await fetch("/api/admin/site", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
      const result = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(result.error || "Save failed.");
      setMsg("Saved ✓ — live on the homepage within a minute.");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Save failed. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }
  const S = (k: keyof Seo) => ({ value: String(seo[k] ?? ""), onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setSeo({ ...seo, [k]: e.target.value }) });
  const So = (k: keyof Social) => ({ value: social[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => setSocial({ ...social, [k]: e.target.value }), type: "url", placeholder: "https://…" });
  const B = (k: keyof Business) => ({ value: biz[k] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement>) => setBiz({ ...biz, [k]: e.target.value }) });
  const titleLen = seo.title.length, descLen = seo.description.length;
  const safeLogo = safeImageUrl(biz.logo);
  const safeSemrushUrl = safeHttpsUrl(seo.semrushUrl);
  const safeSitePhotos = Object.fromEntries(PHOTO_FIELDS.map(([key]) => [key, safeImageUrl(sitePhotos[key], "")])) as Record<string, string>;

  return <div className="wrap" style={{ padding: "0 20px 40px" }}>
    <div className="eyebrow" style={{ marginTop: 10 }}>Website settings</div>
    <h2 style={{ margin: "4px 0 12px" }}>SEO, Google &amp; Social Media</h2>
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
      {([["seo", "SEO (advanced)"], ["google", "Google Business"], ["social", "Social media"], ["photos", "Website Photos"]] as const).map(([k, l]) => <button key={k} type="button" className={"btn " + (tab === k ? "btn-primary" : "btn-ghost")} onClick={() => { setTab(k); setMsg(""); }}>{l}</button>)}
      {msg && <span className={msg.startsWith("Saved") ? "ok" : "err"} role="status" style={{ alignSelf: "center" }}>{msg}</span>}
    </div>


    {tab === "photos" && <div className="card" style={{ maxWidth: 980 }}>
      <h3 style={{ marginTop: 0 }}>Manage homepage photos</h3>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16 }}>Upload a replacement photo or add a public HTTPS image URL. Changes are saved to the website and appear on the homepage after saving. Uploads: JPG, PNG, WebP or GIF · maximum 3 MB. URL images must be publicly accessible.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: 14 }}>
        {PHOTO_FIELDS.map(([key, label, hint, fallback]) => <div key={key} style={{ border: "1px solid var(--line)", borderRadius: 12, padding: 12, minWidth: 0 }}>
          <b>{label}</b><p className="muted" style={{ fontSize: 12, margin: "3px 0 10px" }}>{hint}</p>
          {safeSitePhotos[key] ? <img src={safeSitePhotos[key]} alt={label} style={{ width: "100%", height: 150, objectFit: "cover", borderRadius: 8, background: "#eef2f4", border: "1px solid var(--line)" }} /> : <div style={{ width: "100%", height: 150, display: "grid", placeItems: "center", borderRadius: 8, background: "linear-gradient(135deg,#102b39,#091722)", border: "1px dashed var(--line)", color: "#d7ad68", fontWeight: 700, fontSize: 13 }}>No client photo uploaded</div>}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
            <label className="btn btn-ghost" style={{ cursor: "pointer" }}>Upload / Replace<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={async (e) => {
              const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
              if (file.size > 3 * 1024 * 1024) { setMsg("Each photo must be 3 MB or smaller."); return; }
              const fd = new FormData(); fd.append("file", file); setBusy(true); setMsg("Uploading " + label + "…");
              try {
                const response = await fetch("/api/admin/upload", { method: "POST", body: fd });
                const result = await response.json().catch(() => ({}));
                if (!response.ok || !result.url) throw new Error(result.error || "Photo upload failed.");
                setSitePhotos((current) => ({ ...current, [key]: result.url }));
                setPhotoUrlDrafts((current) => ({ ...current, [key]: result.url }));
                setMsg(label + " uploaded. Click Save Photos to publish it.");
              } catch (error) {
                setMsg(error instanceof Error ? error.message : "Photo upload failed. Check your connection and try again.");
              } finally {
                setBusy(false);
              }
            }} /></label>
            <button type="button" className="btn btn-ghost" onClick={() => {
              setSitePhotos((current) => ({ ...current, [key]: fallback }));
              setPhotoUrlDrafts((current) => ({ ...current, [key]: fallback }));
              setMsg(label + " reset to its default. Click Save Photos to publish it.");
            }}>Use default</button>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
            <input className="input" type="url" aria-label={`Image URL for ${label}`} placeholder="Paste public image URL (https://…)" value={photoUrlDrafts[key] ?? sitePhotos[key] ?? ""} onChange={(e) => setPhotoUrlDrafts((current) => ({ ...current, [key]: e.target.value }))} style={{ flex: "1 1 220px", minWidth: 0 }} />
            <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => {
              // The field displays the current image when no draft exists; use that same value on click.
              const value = (photoUrlDrafts[key] ?? sitePhotos[key] ?? "").trim();
              let parsed: URL;
              try { parsed = new URL(value); } catch { setMsg("Enter a valid image URL for " + label + "."); return; }
              if (parsed.protocol !== "https:") { setMsg("Image URLs must use HTTPS."); return; }
              if (!parsed.hostname || parsed.username || parsed.password) { setMsg("Enter a public image URL without sign-in credentials."); return; }
              // Do not pre-load the remote image here: hotlink protection and cross-origin policies
              // can reject a probe even when the URL itself is a valid public image.
              setSitePhotos((current) => ({ ...current, [key]: value }));
              setPhotoUrlDrafts((current) => ({ ...current, [key]: value }));
              setMsg(label + " URL applied. Check the preview, then click Save Photos to publish it.");
            }}>Use URL</button>
          </div>
        </div>)}
      </div>
      <button type="button" className="btn btn-primary" style={{ marginTop: 18 }} disabled={busy} onClick={() => save({ sitePhotos })}>Save Photos</button>
    </div>}

    {tab === "seo" && <div className="card" style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <img src={safeLogo} alt="Logo" style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 10, background: "#f8fafc", border: "1px solid var(--line)" }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <b>Company logo</b>
          <div className="muted" style={{ fontSize: 12, margin: "2px 0 8px" }}>Used by Google (business logo in search), Facebook/LinkedIn link previews when no share image is set, and your Link-in-Bio page. Square PNG, at least 512×512.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label className="btn btn-ghost" style={{ cursor: "pointer" }}>Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); setMsg("Uploading…"); const r = await fetch("/api/admin/upload", { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); if (r.ok) { setBiz({ ...biz, logo: j.url }); setMsg("Logo uploaded — click Save to apply."); } else setMsg(j.error || "Upload failed"); }} /></label>
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="or paste an image link https://…" value={biz.logo ?? ""} onChange={(e) => setBiz({ ...biz, logo: e.target.value })} />
          </div>
        </div>
      </div>
      <div style={{ background: "#f8fafc", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 14 }}>
        <div className="muted" style={{ fontSize: 12 }}>Google search preview</div>
        <div style={{ color: "#1a0dab", fontSize: 18, marginTop: 4 }}>{seo.title || "Page title"}</div>
        <div style={{ color: "#006621", fontSize: 13 }}>{seo.canonical}</div>
        <div style={{ color: "#4d5156", fontSize: 13 }}>{seo.description}</div>
      </div>
      <Field label={`Page title (${titleLen}/60)`} hint={titleLen > 60 ? "Google may cut titles longer than 60 characters." : "Shown as the blue link in Google."}><input maxLength={70} {...S("title")} /></Field>
      <Field label={`Meta description (${descLen}/160)`} hint="The grey text under your link in Google."><textarea rows={3} maxLength={170} {...S("description")} /></Field>
      <Field label="Keywords" hint="Comma separated. Helps Bing; Google mostly ignores this."><input maxLength={400} {...S("keywords")} /></Field>
      <Field label="Website address (canonical URL)"><input type="url" {...S("canonical")} /></Field>
      <Field label="Share image (Facebook / Messenger / LinkedIn preview)" hint="A full https:// link, or /img/hero-city.jpg."><input {...S("ogImage")} /></Field>
      <Field label="Google Search Console verification code" hint="Search Console → Add property → HTML tag → copy only the content=&quot;…&quot; value."><input {...S("googleVerification")} /></Field>
      <Field label="Google Analytics 4 Measurement ID" hint="Looks like G-XXXXXXXXXX. Leave blank to turn analytics off."><input placeholder="G-XXXXXXXXXX" {...S("gaMeasurementId")} /></Field>
      <Field label="Bing Webmaster verification code"><input {...S("bingVerification")} /></Field>
      <div style={{ border: "1px solid var(--line)", borderRadius: 10, padding: 12, margin: "6px 0 12px", background: "#fff7ed" }}>
        <b>Semrush</b>
        <Field label="Semrush report link" hint="Paste your Semrush On-Page SEO Checker / Site Audit link. Opens from here in one click (you stay signed in to Semrush in your browser)."><input type="url" placeholder="https://www.semrush.com/on-page-seo-checker/…" {...S("semrushUrl")} /></Field>
        {safeSemrushUrl && <a className="btn btn-ghost" href={safeSemrushUrl} target="_blank" rel="noopener">Open Semrush report ↗</a>}
        <Field label="Other verification tags (one per line, name=code)" hint="For Semrush, Yandex, Pinterest, Facebook domain verification, etc. Example: facebook-domain-verification=abc123"><textarea rows={3} placeholder="facebook-domain-verification=abc123" {...S("extraMeta")} /></Field>
      </div>
      <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, margin: "6px 0 14px" }}><input type="checkbox" checked={seo.robotsIndex} onChange={(e) => setSeo({ ...seo, robotsIndex: e.target.checked })} /> Allow Google and other search engines to list the website</label>
      <p className="muted" style={{ fontSize: 12 }}>Also live automatically: <a href="/sitemap.xml" target="_blank">sitemap.xml</a> and <a href="/robots.txt" target="_blank">robots.txt</a>. Submit the sitemap in Google Search Console.</p>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save({ seo, business: biz })}>Save SEO</button>
    </div>}

    {tab === "google" && <div className="card" style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <img src={safeLogo} alt="Logo" style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 10, background: "#f8fafc", border: "1px solid var(--line)" }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <b>Company logo</b>
          <div className="muted" style={{ fontSize: 12, margin: "2px 0 8px" }}>Used by Google (business logo in search), Facebook/LinkedIn link previews when no share image is set, and your Link-in-Bio page. Square PNG, at least 512×512.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label className="btn btn-ghost" style={{ cursor: "pointer" }}>Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); setMsg("Uploading…"); const r = await fetch("/api/admin/upload", { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); if (r.ok) { setBiz({ ...biz, logo: j.url }); setMsg("Logo uploaded — click Save to apply."); } else setMsg(j.error || "Upload failed"); }} /></label>
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="or paste an image link https://…" value={biz.logo ?? ""} onChange={(e) => setBiz({ ...biz, logo: e.target.value })} />
          </div>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>These details are added to the homepage as LocalBusiness data so Google can match your website to your Business Profile and show your phone, address and hours in search and Maps.</p>
      <Field label="Google Business Profile link" hint="From your profile: Share → copy link (e.g. https://g.page/r/… or https://maps.app.goo.gl/…)."><input {...So("googleBusiness")} /></Field>
      <Field label="Google Maps location link"><input {...So("googleMaps")} /></Field>
      <Field label="Google review link" hint="Profile → Ask for reviews → copy link. Adds a ‘Review us on Google’ button to the footer."><input {...So("googleReview")} /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: "0 12px" }}>
        <Field label="Business name"><input {...B("name")} /></Field>
        <Field label="Phone"><input {...B("phone")} /></Field>
        <Field label="Email"><input type="email" {...B("email")} /></Field>
        <Field label="Opening hours" hint="e.g. Mo-Sa 08:00-17:00"><input {...B("hours")} /></Field>
        <Field label="Street address"><input {...B("street")} /></Field>
        <Field label="City / Municipality"><input {...B("city")} /></Field>
        <Field label="Province / Region"><input {...B("region")} /></Field>
        <Field label="Postal code"><input {...B("postal")} /></Field>
      </div>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save({ social, business: biz })}>Save Google Business details</button>
    </div>}

    {tab === "social" && <div className="card" style={{ maxWidth: 820 }}>
      <div style={{ display: "flex", gap: 14, alignItems: "center", border: "1px solid var(--line)", borderRadius: 10, padding: 12, marginBottom: 14, flexWrap: "wrap" }}>
        <img src={safeLogo} alt="Logo" style={{ width: 72, height: 72, objectFit: "contain", borderRadius: 10, background: "#f8fafc", border: "1px solid var(--line)" }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <b>Company logo</b>
          <div className="muted" style={{ fontSize: 12, margin: "2px 0 8px" }}>Used by Google (business logo in search), Facebook/LinkedIn link previews when no share image is set, and your Link-in-Bio page. Square PNG, at least 512×512.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <label className="btn btn-ghost" style={{ cursor: "pointer" }}>Upload logo<input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fd = new FormData(); fd.append("file", f); setMsg("Uploading…"); const r = await fetch("/api/admin/upload", { method: "POST", body: fd }); const j = await r.json().catch(() => ({})); if (r.ok) { setBiz({ ...biz, logo: j.url }); setMsg("Logo uploaded — click Save to apply."); } else setMsg(j.error || "Upload failed"); }} /></label>
            <input className="input" style={{ flex: 1, minWidth: 200 }} placeholder="or paste an image link https://…" value={biz.logo ?? ""} onChange={(e) => setBiz({ ...biz, logo: e.target.value })} />
          </div>
        </div>
      </div>
      <p className="muted" style={{ marginTop: 0 }}>These links power the social buttons on the side of the homepage. Leave a field blank to hide that button.</p>
      <Field label="Facebook page"><input {...So("facebook")} /></Field>
      <Field label="Instagram"><input {...So("instagram")} /></Field>
      <Field label="LinkedIn"><input {...So("linkedin")} /></Field>
      <Field label="YouTube"><input {...So("youtube")} /></Field>
      <Field label="TikTok"><input {...So("tiktok")} /></Field>
      <Field label="X (Twitter)"><input {...So("x")} /></Field>
      <button type="button" className="btn btn-primary" disabled={busy} onClick={() => save({ social, business: biz })}>Save social links</button>
    </div>}
  </div>;
}
