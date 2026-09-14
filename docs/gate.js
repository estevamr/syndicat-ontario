const SESSION_KEY = "syndicat-ontario-payload-v4";
const GATE_SCRIPT_URL =
  (document.currentScript && document.currentScript.src) ||
  new URL("./gate.js", window.location.href).href;
const GATE_COPY = {
  en: {
    title: "Syndicate documents",
    docTitle: "4267, 4269, 4271 Ontario Est",
    lead: "This page is locked. Enter the shared password to view the inspection and reserve-fund summaries.",
    label: "Password",
    button: "Open",
    error: "That password does not match.",
    lock: "Lock",
  },
  fr: {
    title: "Documents du syndicat",
    docTitle: "4267, 4269, 4271 Ontario Est",
    lead: "Cette page est verrouillée. Entrez le mot de passe partagé pour voir les synthèses d’inspection et du fonds de prévoyance.",
    label: "Mot de passe",
    button: "Ouvrir",
    error: "Ce mot de passe ne correspond pas.",
    lock: "Verrouiller",
  },
  pt: {
    title: "Documentos do sindicato",
    docTitle: "4267, 4269, 4271 Ontario Est",
    lead: "Esta página está bloqueada. Introduza a senha partilhada para ver os resumos da inspeção e do fundo de reserva.",
    label: "Senha",
    button: "Abrir",
    error: "Essa senha não confere.",
    lock: "Bloquear",
  },
  ary: {
    title: "وثائق السينديك",
    docTitle: "4267، 4269، 4271 أونتاريو شرق",
    lead: "هاد الصفحة مسكورة. دخل كلمة السر باش تشوف خلاصة الإنسپكسيون وصندوق الاحتياط.",
    label: "كلمة السر",
    button: "حلّ",
    error: "هاد كلمة السر ماشي هي.",
    lock: "سكّر",
    dir: "rtl",
    htmlLang: "ary",
  },
};

const GATE_LANGS = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português" },
  { id: "ary", label: "Darija" },
];

function gateLang() {
  const stored = localStorage.getItem("lang");
  if (stored && GATE_COPY[stored]) return stored;
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}

function setGateLang(next) {
  if (!GATE_COPY[next]) return;
  localStorage.setItem("lang", next);
  const typed = document.getElementById("gate-pass")?.value || "";
  const hadError = Boolean(
    document.getElementById("gate-error") &&
      !document.getElementById("gate-error").hidden
  );
  showGate(hadError);
  const input = document.getElementById("gate-pass");
  if (input) {
    input.value = typed;
    input.focus();
  }
}

function b64ToBytes(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function deriveKey(password, salt, iterations) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function decryptPayload(password, envelope) {
  const salt = b64ToBytes(envelope.salt);
  const iv = b64ToBytes(envelope.iv);
  const data = b64ToBytes(envelope.data);
  const key = await deriveKey(password, salt, envelope.iter);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return JSON.parse(new TextDecoder().decode(plain));
}

function applyPayload(payload) {
  window.I18N = payload.I18N;
  window.FUND_I18N = payload.FUND_I18N;
  window.FUND = payload.FUND;
  window.MAINT_I18N = payload.MAINT_I18N;
  window.MAINT = payload.MAINT;
  window.ASSEMBLY_I18N = payload.ASSEMBLY_I18N;
  window.ASSEMBLY = payload.ASSEMBLY;
}

function payloadIsCurrent(payload) {
  return Boolean(
    payload &&
      payload.I18N &&
      payload.I18N.ary &&
      payload.FUND_I18N &&
      payload.FUND_I18N.ary &&
      payload.MAINT_I18N &&
      payload.MAINT_I18N.ary &&
      payload.FUND_I18N.en &&
      payload.FUND_I18N.en.saveBtn &&
      payload.ASSEMBLY &&
      payload.ASSEMBLY_I18N &&
      payload.ASSEMBLY_I18N.ary
  );
}

function loadApp() {
  if (document.querySelector("script[data-app]")) return;
  const script = document.createElement("script");
  const base = GATE_SCRIPT_URL.replace(/gate\.js(\?.*)?$/, "");
  script.src = `${base}app.js?v=23`;
  script.dataset.app = "true";
  script.onerror = () => {
    document.getElementById("app").hidden = false;
    document.getElementById("app").textContent =
      "Could not load app.js. Hard-refresh the page.";
  };
  document.body.appendChild(script);
}

function showGate(error) {
  const lang = gateLang();
  const copy = GATE_COPY[lang];
  document.title = copy.docTitle || "4267, 4269, 4271 Ontario Est";
  document.documentElement.lang = copy.htmlLang || lang;
  document.documentElement.dir = copy.dir === "rtl" ? "rtl" : "ltr";
  const gate = document.getElementById("gate");
  gate.hidden = false;
  document.getElementById("app").hidden = true;
  gate.innerHTML = `
    <form class="gate-card" id="gate-form">
      <div class="lang" role="group" aria-label="Language">
        ${GATE_LANGS.map(
          (item) => `
            <button type="button" data-lang="${item.id}" title="${item.label}" aria-pressed="${
              item.id === lang
            }">${item.label}</button>
          `
        ).join("")}
      </div>
      <p class="site-title">${copy.docTitle}</p>
      <p class="brand">${copy.title}</p>
      <h1>${copy.title}</h1>
      <p class="lede">${copy.lead}</p>
      <label>
        ${copy.label}
        <input id="gate-pass" type="password" name="password" autocomplete="current-password" required />
      </label>
      <button type="submit">${copy.button}</button>
      <p class="gate-error" id="gate-error" ${error ? "" : "hidden"}>${copy.error}</p>
    </form>
  `;
  document.getElementById("gate-form").addEventListener("submit", onSubmit);
  document.querySelectorAll("#gate [data-lang]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      setGateLang(button.dataset.lang);
    });
  });
  document.getElementById("gate-pass").focus();
}

async function onSubmit(event) {
  event.preventDefault();
  const password = document.getElementById("gate-pass").value;
  const errorEl = document.getElementById("gate-error");
  try {
    const envelope = window.__PAYLOAD__;
    const payload = await decryptPayload(password, envelope);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    openSite(payload);
  } catch (err) {
    errorEl.hidden = false;
  }
}

function openSite(payload) {
  applyPayload(payload);
  document.getElementById("gate").hidden = true;
  document.getElementById("gate").innerHTML = "";
  document.getElementById("app").hidden = false;
  loadApp();
}

async function start() {
  const response = await fetch("./payload.json", { cache: "no-store" });
  window.__PAYLOAD__ = await response.json();
  const cached = sessionStorage.getItem(SESSION_KEY);
  sessionStorage.removeItem("syndicat-ontario-payload");
  if (cached) {
    try {
      const payload = JSON.parse(cached);
      if (payloadIsCurrent(payload)) {
        openSite(payload);
        return;
      }
    } catch (err) {
      sessionStorage.removeItem(SESSION_KEY);
    }
    sessionStorage.removeItem(SESSION_KEY);
  }
  showGate(false);
}

document.getElementById("lock-site")?.remove();
start();
