const LANGS = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português" },
];

function detectLang() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("lang");
  if (fromUrl && I18N[fromUrl]) return fromUrl;
  const stored = localStorage.getItem("lang");
  if (stored && I18N[stored]) return stored;
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}

let lang = detectLang();
let filter = "all";

function setLang(next) {
  lang = next;
  localStorage.setItem("lang", next);
  const url = new URL(window.location.href);
  url.searchParams.set("lang", next);
  history.replaceState({}, "", url);
  render();
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function render() {
  const t = I18N[lang];
  document.documentElement.lang = t.htmlLang;
  document.title = t.title;

  const priorities = t.priorities
    .filter((item) => filter === "all" || item.id === filter)
    .map(
      (item) => `
        <article class="card">
          <div class="meta">
            <span class="pill ${item.id}">${esc(item.label)}</span>
          </div>
          <h3>${esc(item.title)}</h3>
          <p><strong>${esc(t.why)}.</strong> ${esc(item.why)}</p>
          <p><strong>${esc(t.ask)}.</strong> ${esc(item.ask)}</p>
        </article>
      `
    )
    .join("");

  const restRows = t.restRows
    .map(
      (row) =>
        `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`
    )
    .join("");

  document.getElementById("app").innerHTML = `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">${esc(t.brand)}</div>
        <div class="lang" role="group" aria-label="Language">
          ${LANGS.map(
            (item) => `
              <button type="button" data-lang="${item.id}" aria-pressed="${
                item.id === lang
              }">${esc(item.label)}</button>
            `
          ).join("")}
        </div>
      </header>
      <main id="main">
        <h1>${esc(t.h1)}</h1>
        <p class="lede">${esc(t.lede)}</p>
        <section class="stats">
          ${t.stats
            .map(
              (stat) =>
                `<div class="stat"><b>${esc(stat.value)}</b><span>${esc(
                  stat.label
                )}</span></div>`
            )
            .join("")}
        </section>
        <aside class="callout">
          <strong>${esc(t.calloutTitle)}</strong>
          ${esc(t.callout)}
        </aside>
        <h2>${esc(t.actFirst)}</h2>
        <div class="filters" role="group">
          <button type="button" data-filter="all" aria-pressed="${
            filter === "all"
          }">${esc(t.filterAll)}</button>
          <button type="button" data-filter="now" aria-pressed="${
            filter === "now"
          }">${esc(t.filterNow)}</button>
          <button type="button" data-filter="soon" aria-pressed="${
            filter === "soon"
          }">${esc(t.filterSoon)}</button>
        </div>
        <div class="cards">${priorities}</div>
        <h2>${esc(t.snapshot)}</h2>
        <div class="grid-2">
          <article class="card">
            <h3>${esc(t.whatItIs)}</h3>
            <p>${esc(t.whatItIsBody)}</p>
            <p class="lede">${esc(t.whatItIsNote)}</p>
          </article>
          <article class="card">
            <h3>${esc(t.generallyOk)}</h3>
            <ul class="plain">
              ${t.okItems.map((item) => `<li>${esc(item)}</li>`).join("")}
            </ul>
          </article>
        </div>
        <h2>${esc(t.rest)}</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>${t.tableHeaders
                .map((header) => `<th>${esc(header)}</th>`)
                .join("")}</tr>
            </thead>
            <tbody>${restRows}</tbody>
          </table>
        </div>
        <h2>${esc(t.money)}</h2>
        <div class="grid-3">
          <article class="card">
            <div class="meta"><span class="pill now">${esc(t.budgetNow)}</span></div>
            <h3>${esc(t.moisture)}</h3>
            <p>${esc(t.moistureBody)}</p>
          </article>
          <article class="card">
            <div class="meta"><span class="pill soon">${esc(t.years)}</span></div>
            <h3>${esc(t.heater)}</h3>
            <p>${esc(t.heaterBody)}</p>
          </article>
          <article class="card">
            <div class="meta"><span class="pill ok">${esc(t.operating)}</span></div>
            <h3>${esc(t.recurring)}</h3>
            <p>${esc(t.recurringBody)}</p>
          </article>
        </div>
        <section class="footnote">
          <h3>${esc(t.limits)}</h3>
          <p>${esc(t.limitsBody)}</p>
          <div class="pills-row">
            <span class="pill now">${esc(t.pills[0])}</span>
            <span class="pill ok">${esc(t.pills[1])}</span>
            <span class="pill info">${esc(t.pills[2])}</span>
          </div>
        </section>
      </main>
    </div>
  `;

  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => setLang(button.dataset.lang));
  });
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      render();
    });
  });
}

render();
