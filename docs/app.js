window.projectFund = function projectFund(opts) {
  const annual = opts.annual;
  const increase = opts.increase;
  let balance = FUND.startBalance;
  let contribution = annual;
  const rows = [];
  let firstGap = null;
  let minBalance = balance;
  let totalContrib = 0;
  FUND.expenses.forEach((expense, index) => {
    if (index > 0) contribution *= 1 + increase;
    totalContrib += contribution;
    const after = balance + contribution - expense;
    const interest = after > 0 ? after * FUND.interest : 0;
    balance = after + interest;
    if (balance < 0 && firstGap === null) firstGap = FUND.startYear + index;
    if (balance < minBalance) minBalance = balance;
    rows.push({
      year: FUND.startYear + index,
      contribution,
      expense,
      interest,
      balance,
    });
  });
  return {
    rows,
    firstGap,
    minBalance,
    end: balance,
    totalContrib,
    ok: firstGap === null,
  };
};

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

function detectTab() {
  const params = new URLSearchParams(window.location.search);
  return params.get("tab") === "fund" ? "fund" : "inspection";
}

let lang = detectLang();
let tab = detectTab();
let filter = "all";
let simAnnual = FUND.currentContribution;
let simIncrease = 0;

function locale() {
  if (lang === "fr") return "fr-CA";
  if (lang === "pt") return "pt-BR";
  return "en-CA";
}

function money(value) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function pct(value) {
  return new Intl.NumberFormat(locale(), {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}

function syncUrl() {
  const url = new URL(window.location.href);
  url.searchParams.set("lang", lang);
  if (tab === "fund") url.searchParams.set("tab", "fund");
  else url.searchParams.delete("tab");
  history.replaceState({}, "", url);
}

function setLang(next) {
  lang = next;
  localStorage.setItem("lang", next);
  syncUrl();
  render();
}

function setTab(next) {
  tab = next;
  syncUrl();
  render();
}

function esc(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function chrome(inner) {
  const t = I18N[lang];
  return `
    <div class="wrap">
      <header class="topbar">
        <div class="brand">${esc(t.brand)}</div>
        <div class="toolbar">
          <nav class="tabs" role="tablist">
            <button type="button" role="tab" data-tab="inspection" aria-selected="${
              tab === "inspection"
            }">${esc(t.navInspection)}</button>
            <button type="button" role="tab" data-tab="fund" aria-selected="${
              tab === "fund"
            }">${esc(t.navFund)}</button>
          </nav>
          <div class="lang" role="group" aria-label="Language">
            ${LANGS.map(
              (item) => `
                <button type="button" data-lang="${item.id}" aria-pressed="${
                  item.id === lang
                }">${esc(item.label)}</button>
              `
            ).join("")}
          </div>
          <button type="button" class="lock" data-lock="true">${esc(
            t.navLock
          )}</button>
        </div>
      </header>
      <main id="main">${inner}</main>
    </div>
  `;
}

function bindChrome() {
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.addEventListener("click", () => setLang(button.dataset.lang));
  });
  document.querySelectorAll("[data-tab]").forEach((button) => {
    button.addEventListener("click", () => setTab(button.dataset.tab));
  });
  document.querySelectorAll("[data-lock]").forEach((button) => {
    button.addEventListener("click", () => {
      sessionStorage.removeItem("syndicat-ontario-payload");
      window.location.reload();
    });
  });
}

function renderInspection() {
  const t = I18N[lang];
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
    .map((row) => `<tr>${row.map((cell) => `<td>${esc(cell)}</td>`).join("")}</tr>`)
    .join("");

  document.getElementById("app").innerHTML = chrome(`
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
  `);
  bindChrome();
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      render();
    });
  });
}

function chartBars(values, max, className) {
  return values
    .map((value, index) => {
      const height = max ? Math.max(2, (Math.abs(value) / max) * 100) : 2;
      const tone = value < 0 ? "neg" : className;
      return `<div class="bar-col" title="${FUND.startYear + index}: ${money(
        value
      )}"><span class="bar ${tone}" style="height:${height}%"></span><i>${String(
        FUND.startYear + index
      ).slice(2)}</i></div>`;
    })
    .join("");
}

function renderFund() {
  const t = I18N[lang];
  const f = FUND_I18N[lang];
  document.title = f.title;
  const sim = projectFund({ annual: simAnnual, increase: simIncrease });
  const spendMax = Math.max(...FUND.expenses);
  const balanceMax = Math.max(
    spendMax,
    ...sim.rows.map((row) => Math.abs(row.balance))
  );
  const perUnitYear = simAnnual / FUND.units;
  const perUnitMonth = perUnitYear / 12;

  const workRows = FUND.works
    .map(
      (work) => `
        <tr>
          <td>${work.year}</td>
          <td>${esc(f.workNames[work.id])}${
            work.linked
              ? ` <span class="pill now">${esc(f.linked)}</span>`
              : ""
          }</td>
          <td>${work.remaining} ${esc(f.yearsLeft)}</td>
          <td>${work.avg} ${esc(f.avgLife)}</td>
          <td>${money(work.cost)}</td>
        </tr>
      `
    )
    .join("");

  const scenarioCards = FUND.scenarios
    .map((item) => {
      const meta = f.scenarioMeta[item.id];
      return `
        <article class="card">
          <div class="meta">
            <span class="pill ${item.ok ? "ok" : "now"}">${
              item.ok ? "OK" : "—"
            }</span>
          </div>
          <h3>${esc(meta.name)}</h3>
          <p>${esc(meta.detail)}</p>
        </article>
      `;
    })
    .join("");

  document.getElementById("app").innerHTML = chrome(`
        <h1>${esc(f.h1)}</h1>
        <p class="lede">${esc(f.lede)}</p>
        <section class="stats">
          ${f.stats
            .map(
              (stat) =>
                `<div class="stat"><b>${esc(stat.value)}</b><span>${esc(
                  stat.label
                )}</span></div>`
            )
            .join("")}
        </section>
        <aside class="callout">
          <strong>${esc(f.calloutTitle)}</strong>
          ${esc(f.callout)}
        </aside>
        <p class="lede">${esc(f.perUnitNow)}</p>
        <h2>${esc(f.tryTitle)}</h2>
        <p class="lede">${esc(f.tryLead)}</p>
        <article class="card sim">
          <label>
            ${esc(f.annualLabel)}
            <strong id="annual-val">${money(simAnnual)}</strong>
            <input id="annual" type="range" min="500" max="20000" step="50" value="${simAnnual}" />
          </label>
          <label>
            ${esc(f.increaseLabel)}
            <strong id="increase-val">${pct(simIncrease)}</strong>
            <input id="increase" type="range" min="0" max="8" step="0.5" value="${
              simIncrease * 100
            }" />
          </label>
          <p id="sim-per">${esc(f.perUnit)}: ${money(perUnitYear)} (${money(
            perUnitMonth
          )}${esc(f.perMonth)})</p>
          <aside id="sim-result" class="callout ${sim.ok ? "ok" : ""}">
            <strong>${
              sim.ok
                ? esc(f.resultOk)
                : `${esc(f.resultBad)} ${sim.firstGap}`
            }</strong>
            ${esc(f.endBalance)}: ${money(sim.end)}.
            ${esc(f.minBalance)}: ${money(sim.minBalance)}.
            ${esc(f.totalPaid)}: ${money(sim.totalContrib)}.
          </aside>
          <div class="chart-label">${esc(f.chartSpend)}</div>
          <div id="chart-spend" class="chart">${chartBars(
            FUND.expenses,
            spendMax,
            "spend"
          )}</div>
          <div class="chart-label">${esc(f.chartBalance)}</div>
          <div id="chart-balance" class="chart">${chartBars(
            sim.rows.map((row) => row.balance),
            balanceMax,
            "bal"
          )}</div>
        </article>
        <h2>${esc(f.scenarios)}</h2>
        <p class="lede">${esc(f.scenarioNote)}</p>
        <div class="cards">${scenarioCards}</div>
        <h2>${esc(f.timeline)}</h2>
        <h3>${esc(f.works)}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>${f.workHeaders
                .map((header) => `<th>${esc(header)}</th>`)
                .join("")}</tr>
            </thead>
            <tbody>${workRows}</tbody>
          </table>
        </div>
        <section class="footnote">
          <h3>${esc(f.limits)}</h3>
          <p>${esc(f.limitsBody)}</p>
        </section>
  `);
  bindChrome();
  bindSim();
}

function bindSim() {
  const annual = document.getElementById("annual");
  const increase = document.getElementById("increase");
  if (!annual || !increase) return;
  const refresh = () => {
    simAnnual = Number(annual.value);
    simIncrease = Number(increase.value) / 100;
    const f = FUND_I18N[lang];
    const sim = projectFund({ annual: simAnnual, increase: simIncrease });
    const spendMax = Math.max(...FUND.expenses);
    const balanceMax = Math.max(
      spendMax,
      ...sim.rows.map((row) => Math.abs(row.balance))
    );
    const annualVal = document.getElementById("annual-val");
    const increaseVal = document.getElementById("increase-val");
    if (annualVal) annualVal.textContent = money(simAnnual);
    if (increaseVal) increaseVal.textContent = pct(simIncrease);
    const per = document.getElementById("sim-per");
    if (per) {
      per.textContent = `${f.perUnit}: ${money(simAnnual / FUND.units)} (${money(
        simAnnual / FUND.units / 12
      )}${f.perMonth})`;
    }
    const result = document.getElementById("sim-result");
    if (result) {
      result.className = `callout ${sim.ok ? "ok" : ""}`;
      result.innerHTML = `<strong>${
        sim.ok ? esc(f.resultOk) : `${esc(f.resultBad)} ${sim.firstGap}`
      }</strong> ${esc(f.endBalance)}: ${money(sim.end)}. ${esc(
        f.minBalance
      )}: ${money(sim.minBalance)}. ${esc(f.totalPaid)}: ${money(
        sim.totalContrib
      )}.`;
    }
    const spendChart = document.getElementById("chart-spend");
    const balChart = document.getElementById("chart-balance");
    if (spendChart) {
      spendChart.innerHTML = chartBars(FUND.expenses, spendMax, "spend");
    }
    if (balChart) {
      balChart.innerHTML = chartBars(
        sim.rows.map((row) => row.balance),
        balanceMax,
        "bal"
      );
    }
  };
  annual.addEventListener("input", refresh);
  increase.addEventListener("input", refresh);
}

function render() {
  document.documentElement.lang = I18N[lang].htmlLang;
  try {
    if (tab === "fund") renderFund();
    else renderInspection();
  } catch (err) {
    document.getElementById("app").hidden = false;
    document.getElementById("app").innerHTML =
      "<p class='lede'>Could not render this tab. Try a hard refresh (Ctrl+Shift+R).</p>";
    console.error(err);
  }
}

render();
