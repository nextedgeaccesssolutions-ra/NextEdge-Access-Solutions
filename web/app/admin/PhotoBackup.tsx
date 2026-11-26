"use client";
import { useRef, useState } from "react";
import { zipSync, unzipSync, strToU8, strFromU8 } from "fflate";

type P = { id: string; code: string; name: string; image: string };
type Entry = { id: string; code: string; name: string; image_url: string; file: string | null };

const EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif" };
const MIME: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif" };
const UPLOAD_MAX = 3 * 1024 * 1024;

async function pool<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, async () => { while (i < items.length) await fn(items[i++]); }));
}

/** Download every product photo as one ZIP (photos + manifest.json), or restore them from that ZIP. */
export default function PhotoBackup({ products, onRestored }: { products: P[]; onRestored: (id: string, image: string) => void }) {
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const withPhoto = products.filter((p) => p.image);

  async function backup() {
    setBusy(true);
    const files: Record<string, Uint8Array> = {};
    const manifest: Entry[] = [];
    const failed: string[] = [];
    let done = 0;
    await pool(withPhoto, 4, async (p) => {
      try {
        const r = await fetch(`/api/admin/photos/${encodeURIComponent(p.id)}`);
        if (!r.ok) throw new Error();
        const type = (r.headers.get("content-type") || "").split(";")[0];
        const name = `photos/${p.id}.${EXT[type] || "jpg"}`;
        files[name] = new Uint8Array(await r.arrayBuffer());
        manifest.push({ id: p.id, code: p.code, name: p.name, image_url: p.image, file: name });
      } catch {
        failed.push(p.name);
        manifest.push({ id: p.id, code: p.code, name: p.name, image_url: p.image, file: null });
      }
      setMsg(`Saving photos… ${++done} of ${withPhoto.length}`);
    });
    files["manifest.json"] = strToU8(JSON.stringify({ created: new Date().toISOString(), count: manifest.length, products: manifest }, null, 2));
    const zip = zipSync(files, { level: 0 });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([new Uint8Array(zip)], { type: "application/zip" }));
    a.download = `neas-photo-backup-${new Date().toISOString().slice(0, 10)}.zip`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    setMsg(`Backup downloaded: ${manifest.length - failed.length} photos saved.` + (failed.length ? ` ${failed.length} could not be downloaded and were saved as links only: ${failed.slice(0, 5).join(", ")}${failed.length > 5 ? "…" : ""}` : ""));
    setBusy(false);
  }

  async function restore(f: File) {
    if (!confirm("Restore photos from this backup? Every product in the backup gets its saved photo back, replacing its current photo.")) return;
    setBusy(true);
    try {
      const z = unzipSync(new Uint8Array(await f.arrayBuffer()));
      if (!z["manifest.json"]) throw new Error("This is not a NEAS photo backup (manifest.json is missing).");
      const list: Entry[] = JSON.parse(strFromU8(z["manifest.json"])).products || [];
      const known = new Set(products.map((p) => p.id));
      const todo = list.filter((e) => known.has(e.id));
      let ok = 0, done = 0;
      const failed: string[] = [];
      await pool(todo, 3, async (e) => {
        try {
          const bytes = e.file ? z[e.file] : undefined;
          let r: Response;
          if (bytes && bytes.byteLength <= UPLOAD_MAX) {
            const ext = (e.file!.split(".").pop() || "jpg").toLowerCase();
            const body = new FormData();
            body.append("file", new File([new Uint8Array(bytes)], e.file!.split("/").pop()!, { type: MIME[ext] || "image/jpeg" }));
            r = await fetch(`/api/admin/products/${encodeURIComponent(e.id)}/image`, { method: "POST", body });
          } else if (/^https?:\/\//.test(e.image_url)) {
            r = await fetch(`/api/admin/products/${encodeURIComponent(e.id)}/image`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url: e.image_url }) });
          } else throw new Error();
          const j = await r.json().catch(() => ({}));
          if (!r.ok) throw new Error();
          onRestored(e.id, j.image || "");
          ok++;
        } catch { failed.push(e.name); }
        setMsg(`Restoring photos… ${++done} of ${todo.length}`);
      });
      const skipped = list.length - todo.length;
      setMsg(`Restored ${ok} photos.` + (skipped ? ` ${skipped} products in the backup no longer exist in the store.` : "") + (failed.length ? ` ${failed.length} failed: ${failed.slice(0, 5).join(", ")}` : ""));
    } catch (err) {
      setMsg((err as Error).message || "Could not read the backup file.");
    }
    setBusy(false);
    if (file.current) file.current.value = "";
  }

  return (
    <div className="card" style={{ marginBottom: 12, padding: 12 }}>
      <b>Photo backup</b>
      <p className="muted" style={{ margin: "4px 0 8px", fontSize: 13 }}>
        Save every product photo ({withPhoto.length} of {products.length} products have one) to a ZIP file on your computer, so photos can be restored even if the database is lost. Make a new backup after adding or changing photos.
      </p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn btn-primary" disabled={busy || !withPhoto.length} onClick={backup}>Download photo backup</button>
        <button type="button" className="btn btn-ghost" disabled={busy} onClick={() => file.current?.click()}>Restore from backup…</button>
        <input ref={file} type="file" accept=".zip,application/zip" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) restore(f); }} />
      </div>
      {msg && <p style={{ margin: "8px 0 0", fontSize: 13 }} aria-live="polite">{msg}</p>}
    </div>
  );
}
