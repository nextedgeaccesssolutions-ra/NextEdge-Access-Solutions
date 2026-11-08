(() => {
  if (document.getElementById("neas-assistant")) return;

  const root = document.createElement("div");
  root.id = "neas-assistant";
  root.innerHTML = `
    <button class="neas-assistant-launch" type="button" aria-label="Open NEAS assistant" aria-expanded="false" aria-controls="neas-assistant-panel">
      <span class="neas-assistant-mark" aria-hidden="true">N</span><span>Ask NEAS</span>
    </button>
    <section class="neas-assistant-panel" id="neas-assistant-panel" aria-labelledby="neas-assistant-heading" hidden>
      <header class="neas-assistant-head">
        <div><span class="neas-assistant-kicker">NEXTEDGE ACCESS SOLUTIONS</span><h2 id="neas-assistant-heading">How can we help?</h2></div>
        <button class="neas-assistant-close" type="button" aria-label="Close assistant">×</button>
      </header>
      <div class="neas-assistant-messages" role="log" aria-label="Conversation" aria-live="polite" aria-relevant="additions text" tabindex="0"></div>
      <div class="neas-assistant-shortcuts" role="group" aria-label="Suggested questions">
        <button type="button">What services do you offer?</button>
        <button type="button">I need a project quote</button>
      </div>
      <form class="neas-assistant-form" aria-label="Send a message">
        <label class="neas-sr-only" for="neas-assistant-input">Your message</label>
        <textarea id="neas-assistant-input" rows="1" maxlength="1200" placeholder="Ask us about NEAS…" required></textarea>
        <button type="submit" aria-label="Send message">Send</button>
      </form>
      <a class="neas-assistant-whatsapp" href="https://wa.me/639914265886" target="_blank" rel="noopener">Continue on WhatsApp ↗</a>
    </section>`;
  document.body.append(root);

  const launcher = root.querySelector(".neas-assistant-launch");
  const panel = root.querySelector(".neas-assistant-panel");
  const close = root.querySelector(".neas-assistant-close");
  const form = root.querySelector(".neas-assistant-form");
  const input = root.querySelector("#neas-assistant-input");
  const messagesBox = root.querySelector(".neas-assistant-messages");
  const shortcuts = root.querySelector(".neas-assistant-shortcuts");
  const whatsapp = root.querySelector(".neas-assistant-whatsapp");
  const history = [];
  let waiting = false;

  function addMessage(role, text) {
    const message = document.createElement("div");
    message.className = `neas-assistant-message ${role}`;
    message.textContent = text;
    messagesBox.append(message);
    while (messagesBox.children.length > 12) messagesBox.firstElementChild.remove();
    messagesBox.scrollTop = messagesBox.scrollHeight;
  }

  function setOpen(open) {
    panel.hidden = !open;
    launcher.setAttribute("aria-expanded", String(open));
    launcher.setAttribute("aria-label", open ? "Close NEAS assistant" : "Open NEAS assistant");
    if (open) input.focus();
    else launcher.focus();
  }

  launcher.addEventListener("click", () => setOpen(panel.hidden));
  close.addEventListener("click", () => setOpen(false));
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden && panel.contains(event.target)) {
      event.preventDefault();
      setOpen(false);
    }
  });
  shortcuts.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (button && !waiting) {
      input.value = button.textContent;
      form.requestSubmit();
    }
  });
  addMessage("assistant", "I can help with NEAS services and getting in touch. For project quotes, message our team on WhatsApp.");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = input.value.trim();
    if (!content || waiting) return;
    waiting = true;
    form.querySelector("button[type=submit]").disabled = true;
    shortcuts.hidden = true;
    addMessage("user", content);
    input.value = "";
    history.push({ role: "user", content });
    if (history.length > 8) history.splice(0, history.length - 8);

    const typing = document.createElement("div");
    typing.className = "neas-assistant-message assistant";
    typing.textContent = "Checking…";
    messagesBox.append(typing);
    messagesBox.scrollTop = messagesBox.scrollHeight;

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      const result = await response.json().catch(() => ({}));
      typing.remove();
      if (!response.ok || typeof result.reply !== "string") {
        throw new Error(result.error || "The assistant couldn't reply.");
      }
      history.push({ role: "assistant", content: result.reply });
      if (history.length > 8) history.splice(0, history.length - 8);
      addMessage("assistant", result.reply);
      whatsapp.href = `https://wa.me/639914265886?text=${encodeURIComponent(content.slice(0, 500))}`;
    } catch (error) {
      typing.remove();
      history.pop();
      addMessage("assistant", error.message || "The assistant is offline. Please continue on WhatsApp.");
      whatsapp.href = `https://wa.me/639914265886?text=${encodeURIComponent(content.slice(0, 500))}`;
    } finally {
      waiting = false;
      form.querySelector("button[type=submit]").disabled = false;
    }
  });
})();
