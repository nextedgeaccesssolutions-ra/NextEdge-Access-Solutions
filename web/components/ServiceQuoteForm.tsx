"use client";

import { useState } from "react";

type Status = { kind: "idle" | "sending" | "sent" | "error"; message?: string };

/** Quote request for one service; posts to the existing /api/contact endpoint. */
export default function ServiceQuoteForm({ service }: { service: string }) {
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setStatus({ kind: "sending" });
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...Object.fromEntries(form), service }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok)
        throw new Error(data.error || "Your request could not be sent.");
      setStatus({ kind: "sent" });
      // Lets analytics (if the visitor consented) count a conversion.
      window.dispatchEvent(
        new CustomEvent("neas:lead", { detail: { service } })
      );
    } catch (err) {
      setStatus({ kind: "error", message: (err as Error).message });
    }
  }

  if (status.kind === "sent") {
    return (
      <div className="quote-done" role="status">
        <strong>Thank you, your request is in.</strong>
        <p>
          The NEAS team will reply by email. For urgent work, call (+63) 991 426
          5886.
        </p>
      </div>
    );
  }

  return (
    <form className="quote-form" onSubmit={onSubmit} noValidate={false}>
      <div className="row">
        <label>
          Name
          <input name="name" required maxLength={120} autoComplete="name" />
        </label>
        <label>
          Company
          <input name="company" maxLength={160} autoComplete="organization" />
        </label>
      </div>
      <div className="row">
        <label>
          Email
          <input
            name="email"
            type="email"
            required
            maxLength={320}
            autoComplete="email"
          />
        </label>
        <label>
          Phone
          <input name="phone" type="tel" maxLength={40} autoComplete="tel" />
        </label>
      </div>
      <label>
        Project details
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={3000}
          rows={5}
          placeholder="Location, structure or asset, scope of work and preferred timing"
        />
      </label>
      {/* Honeypot: hidden from people, filled by bots, discarded by the API. */}
      <input
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="hp"
        aria-hidden="true"
      />
      {status.kind === "error" && (
        <p className="quote-error" role="alert">
          {status.message}
        </p>
      )}
      <button type="submit" disabled={status.kind === "sending"}>
        {status.kind === "sending" ? "Sending…" : "Request a quotation"}
      </button>
    </form>
  );
}
