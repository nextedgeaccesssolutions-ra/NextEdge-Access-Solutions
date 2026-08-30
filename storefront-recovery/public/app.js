import {
  DEFAULT_PRODUCTS,
  MODES,
  hashForMode,
  modeFromHash,
  selectedItems,
  validateCatalog,
} from "./catalog.js";

const STORE_KEY = "neas-storefront-state-v1";
const THEME_KEY = "neas-theme";
const state = {
  mode: modeFromHash(window.location.hash),
  products: [...DEFAULT_PRODUCTS],
  cart: readSavedCart(),
  coordinates: "",
};

const elements = {
  products: document.querySelector("#products"),
  cartCount: document.querySelector("#cart-count"),
  requestPanel: document.querySelector("#request-panel"),
  requestHeading: document.querySelector("#request-heading"),
  requestForm: document.querySelector("#request-form"),
  modeFields: document.querySelector("#mode-fields"),
  details: document.querySelector("#details"),
  submit: document.querySelector("#submit-request"),
  status: document.querySelector("#form-status"),
  locationStatus: document.querySelector("#location-status"),
  tabs: [...document.querySelectorAll("[data-mode]")],
  themeToggle: document.querySelector("#theme-toggle"),
};

function readSavedCart() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
    return saved && typeof saved === "object" ? saved : {};
  } catch {
    return {};
  }
}

function saveCart() {
  localStorage.setItem(STORE_KEY, JSON.stringify(state.cart));
}

function totalItems() {
  return Object.values(state.cart).reduce((total, value) => total + Number(value || 0), 0);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderProducts() {
  elements.products.innerHTML = state.products.map((product, index) => {
    const quantity = Number(state.cart[product.name] || 0);
    return `
      <article class="product-card">
        <div class="product-visual" aria-hidden="true"><span>${String(index + 1).padStart(2, "0")}</span><svg viewBox="0 0 24 24"><path d="M6.5 8.5h11l1.6 11h-14.2zM9 9V6.5a3 3 0 0 1 6 0V9"/></svg></div>
        <div class="product-body">
          <p class="eyebrow blue">${escapeHtml(product.category)}</p>
          <h3>${escapeHtml(product.name)}</h3>
          <p>${escapeHtml(product.note)}</p>
          <div class="product-action">
            <span>Quote quantity</span>
            <div class="quantity" aria-label="Quantity for ${escapeHtml(product.name)}">
              <button type="button" data-product="${escapeHtml(product.name)}" data-delta="-1" aria-label="Remove one ${escapeHtml(product.name)}">−</button>
              <output aria-live="polite">${quantity}</output>
              <button type="button" data-product="${escapeHtml(product.name)}" data-delta="1" aria-label="Add one ${escapeHtml(product.name)}">+</button>
            </div>
          </div>
        </div>
      </article>`;
  }).join("");

  elements.products.querySelectorAll("[data-product]").forEach((button) => {
    button.addEventListener("click", () => {
      const name = button.dataset.product;
      const delta = Number(button.dataset.delta);
      state.cart[name] = Math.max(0, Number(state.cart[name] || 0) + delta);
      saveCart();
      renderProducts();
      renderCartCount();
      if (state.mode === MODES.QUOTE) renderRequestPanel();
    });
  });
}

function renderCartCount() {
  elements.cartCount.textContent = String(totalItems());
}

function modeCopy() {
  const count = totalItems();
  if (state.mode === MODES.QUOTE) return {
    title: count ? `Request a quotation for ${count} selected item${count === 1 ? "" : "s"}` : "Request an equipment quotation",
    details: "Delivery location, equipment specifications, certification, or technical requirements",
  };
  if (state.mode === MODES.MEETING) return {
    title: "Request a scheduled meeting",
    details: "What would you like to discuss?",
  };
  return {
    title: "Request an access service",
    details: "Scope, access constraints, work location, or technical requirements",
  };
}

function renderRequestPanel({ focus = false } = {}) {
  const copy = modeCopy();
  elements.requestHeading.textContent = copy.title;
  elements.details.placeholder = copy.details;
  elements.requestPanel.id = state.mode === MODES.QUOTE ? "quote" : state.mode === MODES.MEETING ? "meeting-request" : "booking";
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.mode === state.mode;
    tab.setAttribute("aria-selected", String(active));
    tab.tabIndex = active ? 0 : -1;
  });

  if (state.mode === MODES.SERVICE) {
    elements.modeFields.innerHTML = `
      <label>Service<select name="service"><option>Commercial rope access</option><option>Industrial access</option><option>Telecom tower work</option><option>Wind energy support</option><option>Training and PPE</option></select></label>
      <label>Work location<input name="location" autocomplete="street-address" placeholder="Building, street, city" /></label>
      <div class="geo-row"><button class="secondary-button" id="use-location" type="button">Use current coordinates</button><span id="location-status" aria-live="polite">Optional—your browser will ask permission.</span></div>`;
    document.querySelector("#use-location").addEventListener("click", captureLocation);
    elements.locationStatus = document.querySelector("#location-status");
  } else if (state.mode === MODES.MEETING) {
    elements.modeFields.innerHTML = `
      <label>Preferred date<input type="date" name="preferredDate" /></label>
      <label>Preferred time<input type="time" name="preferredTime" /></label>`;
  } else {
    const items = selectedItems(state.products, state.cart);
    elements.modeFields.innerHTML = items.length
      ? `<div class="quote-summary"><p class="eyebrow blue">Selected equipment</p><ul>${items.map((item) => `<li><span>${escapeHtml(item.name)}</span><strong>× ${item.quantity}</strong></li>`).join("")}</ul></div>`
      : `<div class="empty-cart"><strong>Your quote cart is empty.</strong><span>Add equipment above, or describe what you need below.</span><a href="#store">Browse equipment</a></div>`;
  }

  elements.status.textContent = "";
  elements.status.className = "form-status";
  if (focus) requestAnimationFrame(() => elements.requestHeading.focus({ preventScroll: true }));
}

function selectMode(mode, { updateHash = true, focus = false } = {}) {
  state.mode = mode;
  renderRequestPanel({ focus });
  if (updateHash) {
    const nextHash = hashForMode(mode);
    if (window.location.hash === nextHash) {
      elements.requestPanel.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = nextHash;
    }
  }
}

function captureLocation() {
  if (!navigator.geolocation) {
    elements.locationStatus.textContent = "Location is not available in this browser.";
    return;
  }
  elements.locationStatus.textContent = "Requesting coordinates…";
  navigator.geolocation.getCurrentPosition(
    ({ coords }) => {
      state.coordinates = `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)} (accuracy ±${Math.round(coords.accuracy)}m)`;
      elements.locationStatus.textContent = `Coordinates added: ${state.coordinates}`;
    },
    () => { elements.locationStatus.textContent = "Coordinates were not shared. Enter the work location manually."; },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 },
  );
}

async function submitRequest(event) {
  event.preventDefault();
  elements.submit.disabled = true;
  elements.submit.textContent = "Sending request…";
  elements.status.textContent = "";

  const form = new FormData(elements.requestForm);
  const payload = Object.fromEntries(form.entries());
  payload.type = state.mode;
  payload.consent = form.get("consent") === "on";
  if (state.coordinates) payload.coordinates = state.coordinates;
  if (state.mode === MODES.QUOTE) payload.items = selectedItems(state.products, state.cart);

  try {
    const response = await fetch("/api/store-request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || "The request could not be sent.");
    elements.requestForm.reset();
    state.coordinates = "";
    if (state.mode === MODES.QUOTE) {
      state.cart = {};
      saveCart();
      renderProducts();
      renderCartCount();
      renderRequestPanel();
    }
    elements.status.textContent = "Request received. NEAS will review it before confirming a booking, meeting, or quotation.";
    elements.status.className = "form-status success";
  } catch (error) {
    elements.status.textContent = error instanceof Error ? error.message : "The request could not be sent. Please try again.";
    elements.status.className = "form-status error";
  } finally {
    elements.submit.disabled = false;
    elements.submit.textContent = "Send request";
  }
}

async function loadCatalog() {
  try {
    const response = await fetch("/api/store-content", { headers: { Accept: "application/json" } });
    if (!response.ok) return;
    const result = await response.json();
    const products = validateCatalog(result.products);
    if (products) {
      state.products = products;
      renderProducts();
      renderCartCount();
    }
  } catch {
    // The verified fallback catalog keeps the storefront usable offline.
  }
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  elements.themeToggle.setAttribute("aria-label", `Switch to ${theme === "dark" ? "light" : "dark"} theme`);
  elements.themeToggle.textContent = theme === "dark" ? "Light" : "Dark";
}

function initializeTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  const theme = saved === "dark" || saved === "light"
    ? saved
    : window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  applyTheme(theme);
  elements.themeToggle.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

elements.tabs.forEach((tab) => tab.addEventListener("click", () => selectMode(tab.dataset.mode, { focus: true })));
document.querySelectorAll("[data-select-mode]").forEach((link) => link.addEventListener("click", () => selectMode(link.dataset.selectMode)));
elements.requestForm.addEventListener("submit", submitRequest);
window.addEventListener("hashchange", () => {
  const mode = modeFromHash(window.location.hash);
  if (["#quote", "#booking", "#meeting-request"].includes(window.location.hash)) selectMode(mode, { updateHash: false, focus: true });
});

initializeTheme();
renderProducts();
renderCartCount();
renderRequestPanel();
loadCatalog();

if (window.location.hash === "#quote") {
  requestAnimationFrame(() => elements.requestPanel.scrollIntoView({ block: "start" }));
}

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("/service-worker.js"));
