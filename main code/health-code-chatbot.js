/**
 * Health Code Compliance Chatbot — demo prototype (no AI backend).
 */
(function initHealthCodeChatbot() {
  const PANEL_OPEN_CLASS = "health-chat-panel--open";
  const HIGHLIGHT_CLASS = "health-chat-field-highlight";

  const UI = {
    en: {
      title: "Health code helper",
      subtitle: "Demo assistant — not official guidance",
      placeholder: "Ask about permits or food safety…",
      send: "Send",
      open: "Open health code helper",
      close: "Close panel",
      suggested: "Suggested questions",
      demoBadge: "Demo response",
      citations: "Sources in this project",
      noCitation: "No project document matched this answer.",
      highlightNote: "Highlighted the related section in your application.",
      highlightUnavailable:
        "Open the application workflow to highlight form fields (use Get Started).",
      welcome:
        "I can help you explore MarketKey’s workflow. Answers are labeled demos and cite only materials shipped with this app."
    },
    es: {
      title: "Asistente de código sanitario",
      subtitle: "Asistente de demostración — no es orientación oficial",
      placeholder: "Pregunte sobre permisos o seguridad alimentaria…",
      send: "Enviar",
      open: "Abrir asistente de código sanitario",
      close: "Cerrar panel",
      suggested: "Preguntas sugeridas",
      demoBadge: "Respuesta de demostración",
      citations: "Fuentes en este proyecto",
      noCitation: "Ningún documento del proyecto coincide con esta respuesta.",
      highlightNote: "Se resaltó la sección relacionada en su solicitud.",
      highlightUnavailable:
        "Abra el flujo de solicitud para resaltar campos (use Comenzar).",
      welcome:
        "Puedo ayudarle a explorar el flujo de MarketKey. Las respuestas son demostraciones y citan solo materiales incluidos en esta aplicación."
    }
  };

  const SUGGESTED = {
    en: [
      "Do I need a commercial kitchen to sell pre-baked pastries?",
      "What food-safety requirements apply to my business?",
      "Which permits do I need?"
    ],
    es: [
      "¿Necesito una cocina comercial para vender pasteles prehorneados?",
      "¿Qué requisitos de seguridad alimentaria aplican a mi negocio?",
      "¿Qué permisos necesito?"
    ]
  };

  const TOPICS = {
    commercial_kitchen: {
      match: /commercial kitchen|pre-baked|pastries|pastel|prehornead|cocina comercial|empaquet/i,
      citations: ["tff_vs_agri", "questionnaire_originalPackageCheck"],
      highlight: { screen: "screen3", formPage: 1, fieldId: "originalPackageCheck", needsTff: true },
      en: {
        body:
          "MarketKey routes prepared foods (including baked goods and samples) through the Temporary Food Facility (TFF) path, which uses the county application. Whether everything stays in factory-sealed packaging or is prepared in a commercial kitchen is captured on the questionnaire — that answer affects whether the commissary section is required. This demo does not determine your legal requirements; confirm with Alameda County Environmental Health."
      },
      es: {
        body:
          "MarketKey dirige los alimentos preparados (incluidos productos horneados y muestras) por la ruta de Instalación Temporal de Alimentos (TFF), que utiliza la solicitud del condado. Si todo permanece en empaque sellado de fábrica o se prepara en una cocina comercial se registra en el cuestionario; esa respuesta afecta si se requiere la sección de comisaría. Esta demostración no determina sus requisitos legales; confirme con Salud Ambiental del Condado de Alameda."
      }
    },
    food_safety: {
      match: /food[- ]safety|sanit|handwash|temperature|seguridad alimentaria|higiene/i,
      citations: ["food_safety_quiz", "tff_vs_agri"],
      highlight: { screen: "screen3", formPage: 3, anchor: "formPage3", needsTff: true },
      en: {
        body:
          "In this app, food-safety topics appear in the operations questions (water, waste, booth setup) and in the official-style food safety quiz on form page 3. MarketKey helps you complete those sections; it does not replace county inspections or training. Use the demo quiz as a worksheet only."
      },
      es: {
        body:
          "En esta aplicación, la seguridad alimentaria aparece en las preguntas operativas (agua, residuos, configuración del puesto) y en el cuestionario de seguridad alimentaria en la página 3. MarketKey le ayuda a completar esas secciones; no sustituye inspecciones ni capacitación del condado. Use el cuestionario de demostración solo como guía de trabajo."
      }
    },
    permits: {
      match: /which permits|permits do i|qué permisos|permiso/i,
      citations: ["tff_vs_agri", "questionnaire_path"],
      highlight: { screen: "screen2", needsTff: false },
      en: {
        body:
          "Use Step 2 (Path) in MarketKey: prepared foods and samples typically follow the TFF permit route; whole raw produce from your own farm may follow the agricultural guidance instead. Fremont vendors in this prototype target Alameda County’s TFF PDF workflow — always verify current county rules before submitting."
      },
      es: {
        body:
          "Use el Paso 2 (Ruta) en MarketKey: los alimentos preparados y las muestras suelen seguir la ruta de permiso TFF; los productos agrícolas crudos enteros de su propia finca pueden seguir la guía agrícola. Este prototipo apunta al flujo PDF TFF del Condado de Alameda — verifique siempre las reglas vigentes antes de enviar."
      }
    }
  };

  let chatLang = "en";
  let sourceCatalog = null;
  let messages = [];

  const els = {};

  function t(key) {
    return UI[chatLang][key] ?? UI.en[key];
  }

  async function loadSourceCatalog() {
    try {
      const response = await fetch("./data/health-chat-sources.json");
      if (!response.ok) throw new Error("catalog missing");
      sourceCatalog = await response.json();
    } catch (error) {
      console.warn("Health chat sources catalog unavailable:", error);
      sourceCatalog = { sources: [] };
    }
  }

  function resolveTopic(text) {
    const normalized = text.trim();
    if (!normalized) return null;
    return (
      Object.values(TOPICS).find((topic) => topic.match.test(normalized)) || null
    );
  }

  function buildAssistantReply(userText) {
    const topic = resolveTopic(userText);
    const langPack = topic ? topic[chatLang] || topic.en : null;

    const citations = topic?.citations || [];

    let body;
    if (langPack) {
      body = langPack.body;
    } else {
      body =
        chatLang === "es"
          ? "No encontré un tema coincidente en la base de demostración. Pruebe una pregunta sugerida sobre cocinas comerciales, seguridad alimentaria o permisos."
          : "I could not match a demo topic. Try a suggested question about commercial kitchens, food safety, or permits.";
    }

    return {
      demo: true,
      body,
      citations,
      highlight: topic?.highlight ?? null
    };
  }

  function renderCitationList(citationIds) {
    if (!citationIds.length) {
      return `<p class="health-chat-citations-empty">${t("noCitation")}</p>`;
    }

    const lookup = new Map(
      (sourceCatalog?.sources || []).map((item) => [item.id, item])
    );

    const items = citationIds
      .map((id) => lookup.get(id))
      .filter(Boolean)
      .map((source) => {
        const label =
          chatLang === "es" ? source.label_es : source.label_en;
        const loc = source.location || "";
        return `<li><span class="health-chat-citation-label">${label}</span><span class="health-chat-citation-loc">${loc}</span></li>`;
      })
      .join("");

    if (!items) {
      return `<p class="health-chat-citations-empty">${t("noCitation")}</p>`;
    }

    return `<p class="health-chat-citations-title">${t("citations")}</p><ul class="health-chat-citations">${items}</ul>`;
  }

  function appendMessage(role, html) {
    messages.push({ role, html });
    renderMessages();
  }

  function renderMessages() {
    if (!els.log) return;
    els.log.innerHTML = messages
      .map((msg) => {
        const roleClass =
          msg.role === "user"
            ? "health-chat-bubble health-chat-bubble--user"
            : "health-chat-bubble health-chat-bubble--assistant";
        return `<div class="${roleClass}">${msg.html}</div>`;
      })
      .join("");
    els.log.scrollTop = els.log.scrollHeight;
  }

  function clearHighlights() {
    document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach((node) => {
      node.classList.remove(HIGHLIGHT_CLASS);
    });
  }

  function tryHighlight(target) {
    if (!target) return false;

    clearHighlights();

    if (typeof switchView !== "function" || typeof showScreen !== "function") {
      return false;
    }

    switchView("app");
    if (target.needsTff && typeof appState !== "undefined") {
      appState.path = "tff";
    }
    showScreen(target.screen);
    if (target.formPage && typeof showFormPage === "function") {
      showFormPage(target.formPage);
    }

    let focusEl = null;
    if (target.fieldId) {
      focusEl =
        document.getElementById(target.fieldId) ||
        document.querySelector(`label[for="${target.fieldId}"]`);
      focusEl = focusEl?.closest?.(".question") || focusEl;
    } else if (target.anchor) {
      focusEl = document.getElementById(target.anchor);
    } else if (target.screen === "screen2") {
      focusEl = document.getElementById("tffPathBtn");
    }

    if (!focusEl) return false;

    focusEl.classList.add(HIGHLIGHT_CLASS);
    focusEl.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }

  function handleUserMessage(text) {
    const trimmed = text.trim();
    if (!trimmed) return;

    appendMessage("user", escapeHtml(trimmed));

    const reply = buildAssistantReply(trimmed);
    const citationHtml = renderCitationList(reply.citations);
    const highlighted = tryHighlight(reply.highlight);

    const footerNotes = [];
    if (highlighted) footerNotes.push(t("highlightNote"));
    else if (reply.highlight) footerNotes.push(t("highlightUnavailable"));

    const assistantHtml = `
      <span class="health-chat-demo-badge">${t("demoBadge")}</span>
      <p class="health-chat-body">${escapeHtml(reply.body)}</p>
      ${citationHtml}
      ${footerNotes.map((n) => `<p class="health-chat-footnote">${escapeHtml(n)}</p>`).join("")}
    `;

    appendMessage("assistant", assistantHtml);
  }

  function escapeHtml(value) {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSuggested() {
    if (!els.suggested) return;
    const list = SUGGESTED[chatLang] || SUGGESTED.en;
    els.suggested.replaceChildren();
    list.forEach((question) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "health-chat-suggested-btn";
      btn.textContent = question;
      btn.addEventListener("click", () => {
        els.input.value = question;
        handleUserMessage(question);
        els.input.value = "";
      });
      els.suggested.append(btn);
    });
  }

  function applyLanguage() {
    els.title.textContent = t("title");
    els.subtitle.textContent = t("subtitle");
    els.input.placeholder = t("placeholder");
    els.send.textContent = t("send");
    els.toggle.setAttribute("aria-label", t("open"));
    els.close.setAttribute("aria-label", t("close"));
    els.suggestedLabel.textContent = t("suggested");
    els.langButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.chatLang === chatLang);
      btn.setAttribute(
        "aria-pressed",
        btn.dataset.chatLang === chatLang ? "true" : "false"
      );
    });
    renderSuggested();
  }

  function setPanelOpen(open) {
    els.panel.classList.toggle(PANEL_OPEN_CLASS, open);
    els.panel.setAttribute("aria-hidden", open ? "false" : "true");
    els.toggle.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) els.input.focus();
  }

  function bindEvents() {
    els.toggle.addEventListener("click", () => {
      const open = !els.panel.classList.contains(PANEL_OPEN_CLASS);
      setPanelOpen(open);
    });
    els.close.addEventListener("click", () => setPanelOpen(false));

    els.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const value = els.input.value;
      handleUserMessage(value);
      els.input.value = "";
    });

    els.langButtons.forEach((btn) => {
      btn.addEventListener("click", () => {
        chatLang = btn.dataset.chatLang;
        applyLanguage();
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && els.panel.classList.contains(PANEL_OPEN_CLASS)) {
        setPanelOpen(false);
      }
    });
  }

  function cacheElements() {
    els.toggle = document.getElementById("healthChatToggle");
    els.panel = document.getElementById("healthChatPanel");
    els.close = document.getElementById("healthChatClose");
    els.log = document.getElementById("healthChatLog");
    els.form = document.getElementById("healthChatForm");
    els.input = document.getElementById("healthChatInput");
    els.send = document.getElementById("healthChatSend");
    els.title = document.getElementById("healthChatTitle");
    els.subtitle = document.getElementById("healthChatSubtitle");
    els.suggested = document.getElementById("healthChatSuggested");
    els.suggestedLabel = document.getElementById("healthChatSuggestedLabel");
    els.langButtons = document.querySelectorAll("[data-chat-lang]");
  }

  document.addEventListener("DOMContentLoaded", async () => {
    cacheElements();
    if (!els.panel) return;

    await loadSourceCatalog();
    bindEvents();
    applyLanguage();

    appendMessage(
      "assistant",
      `<span class="health-chat-demo-badge">${t("demoBadge")}</span><p class="health-chat-body">${escapeHtml(t("welcome"))}</p>`
    );
  });
})();