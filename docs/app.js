function roundCad(value) {
  return Math.round(Number(value) || 0);
}

function hasShifts(shifts) {
  return Object.keys(shifts || {}).some((id) => Number(shifts[id]) !== 0);
}

function spendPlan(shifts) {
  const years = FUND.expenses.length;
  if (!hasShifts(shifts)) {
    return { expenses: FUND.expenses.slice(), dropped: [] };
  }
  const expenses = Array(years).fill(0);
  const dropped = [];
  FUND.works.forEach((work) => {
    const delta = Number(shifts[work.id] || 0);
    const year = work.year + delta;
    const cost = roundCad(work.cost * Math.pow(1 + FUND.inflation, delta));
    const idx = year - FUND.startYear;
    if (idx >= years) dropped.push({ id: work.id, year, cost });
    else if (idx < 0) expenses[0] += cost;
    else expenses[idx] += cost;
  });
  return { expenses, dropped };
}

window.projectFund = function projectFund(opts) {
  const plan = spendPlan(opts.shifts);
  const expenses = plan.expenses;
  const annual = Number(opts.annual);
  const increase = Number(opts.increase) || 0;
  const phaseYears = Math.min(
    expenses.length,
    Math.max(1, Number(opts.phaseYears) || expenses.length)
  );
  const usePhase2 = Boolean(opts.usePhase2);
  const annual2 = Number(opts.annual2);
  const increase2 = Number(opts.increase2) || 0;
  let balance = Number(opts.startBalance ?? FUND.startBalance);
  const rate = Number(opts.interest ?? FUND.interest);
  const specialYear = Number(opts.specialYear);
  const specialAmount = roundCad(opts.specialAmount || 0);
  const rows = [];
  let firstGap = null;
  let minBalance = balance;
  let totalContrib = 0;
  expenses.forEach((expense, index) => {
    let contribution;
    if (!usePhase2 || index < phaseYears) {
      contribution = roundCad(annual * Math.pow(1 + increase, index));
    } else {
      contribution = roundCad(
        annual2 * Math.pow(1 + increase2, index - phaseYears)
      );
    }
    const year = FUND.startYear + index;
    const special = year === specialYear ? specialAmount : 0;
    totalContrib += contribution + special;
    const after = balance + contribution + special - expense;
    const interest = after > 0 ? roundCad(after * rate) : 0;
    balance = after + interest;
    if (balance < 0 && firstGap === null) firstGap = year;
    if (balance < minBalance) minBalance = balance;
    rows.push({
      year,
      contribution,
      special,
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
    dropped: plan.dropped,
    expenses,
  };
};

const LANGS = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "pt", label: "Português" },
  { id: "ary", label: "Darija" },
];

function detectLang() {
  const params = new URLSearchParams(window.location.search);
  const fromUrl = params.get("lang");
  if (fromUrl && I18N && I18N[fromUrl]) return fromUrl;
  const stored = localStorage.getItem("lang");
  if (stored && I18N && I18N[stored]) return stored;
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("fr")) return "fr";
  if (nav.startsWith("pt")) return "pt";
  return "en";
}

function detectTab() {
  const params = new URLSearchParams(window.location.search);
  const next = params.get("tab");
  if (next === "fund" || next === "maint" || next === "assembly") return next;
  return "inspection";
}

let lang = detectLang();
let tab = detectTab();
let filter = "all";

const SIM_STORE = "syndicat-ontario-sim-v1";

function defaultWorkshop() {
  return {
    annual: FUND.currentContribution,
    increase: 0,
    usePhase2: false,
    phaseYears: 10,
    annual2: FUND.law16Contribution,
    increase2: FUND.inflation,
    specialYear: FUND.startYear,
    specialAmount: 0,
    startBalance: FUND.startBalance,
    interestPct: FUND.interest * 100,
    shifts: {},
    saved: [],
    saveLabel: "",
  };
}

function loadWorkshop() {
  const base = defaultWorkshop();
  try {
    const raw = JSON.parse(localStorage.getItem(SIM_STORE) || "null");
    if (!raw || typeof raw !== "object") return base;
    return {
      ...base,
      ...raw,
      shifts: { ...(raw.shifts || {}) },
      saved: Array.isArray(raw.saved) ? raw.saved : [],
    };
  } catch (err) {
    return base;
  }
}

function persistWorkshop() {
  localStorage.setItem(SIM_STORE, JSON.stringify(workshop));
}

let workshop = loadWorkshop();

function workshopOpts() {
  return {
    annual: workshop.annual,
    increase: workshop.increase,
    usePhase2: workshop.usePhase2,
    phaseYears: workshop.phaseYears,
    annual2: workshop.annual2,
    increase2: workshop.increase2,
    specialYear: workshop.specialYear,
    specialAmount: workshop.specialAmount,
    startBalance: workshop.startBalance,
    interest: Number(workshop.interestPct) / 100,
    shifts: workshop.shifts,
  };
}

function applyStudyPath(item) {
  workshop.annual = item.annual;
  workshop.increase = item.increase || 0;
  workshop.usePhase2 = (item.phaseYears || 25) < 25;
  workshop.phaseYears = item.phaseYears && item.phaseYears < 25 ? item.phaseYears : 10;
  workshop.annual2 = item.annual2 ?? FUND.law16Contribution;
  workshop.increase2 = item.increase2 ?? FUND.inflation;
  workshop.specialAmount = 0;
  workshop.specialYear = FUND.startYear;
  workshop.startBalance = FUND.startBalance;
  workshop.interestPct = FUND.interest * 100;
  workshop.shifts = {};
  persistWorkshop();
}

function locale() {
  if (lang === "fr") return "fr-CA";
  if (lang === "pt") return "pt-BR";
  if (lang === "ary") return "ar-MA";
  return "en-CA";
}

function money(value) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency: "CAD",
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function money2(value) {
  return new Intl.NumberFormat(locale(), {
    style: "currency",
    currency: "CAD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function portionFees(annual) {
  const current = FUND.currentContribution;
  const names = (ASSEMBLY_I18N[lang] && ASSEMBLY_I18N[lang].owners) || {};
  return FUND.portions.map((portion) => {
    const reserveNow = (current * portion.share) / 12;
    const reserveNew = (annual * portion.share) / 12;
    const rest = portion.monthlyNow - reserveNow;
    return {
      ...portion,
      name: names[portion.id] || portion.address,
      reserveNow,
      reserveNew,
      monthlyNew: rest + reserveNew,
    };
  });
}

function feeTable(annual) {
  const f = FUND_I18N[lang];
  const rows = portionFees(annual)
    .map(
      (row) => `
        <tr>
          <td>${esc(row.name)}</td>
          <td>${pct(row.share)}</td>
          <td>${money2(row.monthlyNow)}</td>
          <td>${money2(row.reserveNow)}</td>
          <td>${money2(row.reserveNew)}</td>
          <td>${money2(row.monthlyNew)}</td>
        </tr>
      `
    )
    .join("");
  return `
    <h2>${esc(f.feeTitle)}</h2>
    <p class="lede">${esc(f.feeLead)}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>${f.feeHeaders.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>
        </thead>
        <tbody id="fee-body">${rows}</tbody>
      </table>
    </div>
  `;
}

function photoGrid(ids) {
  const t = I18N[lang];
  const list = (FUND.photos || []).filter((item) => !ids || ids.includes(item.id));
  return `
    <div class="gallery">
      ${list
        .map(
          (item) => `
            <figure>
              <img src="${esc(item.src)}" alt="${esc(t.photos[item.id] || "")}" loading="lazy" />
              <figcaption>${esc(t.photos[item.id] || "")}</figcaption>
            </figure>
          `
        )
        .join("")}
    </div>
  `;
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
  if (tab === "inspection") url.searchParams.delete("tab");
  else url.searchParams.set("tab", tab);
  history.replaceState({}, "", url);
}

function setLang(next) {
  if (!I18N[next]) return;
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
    <div class="wrap ${tab === "fund" ? "fund-page" : ""}">
      <header class="topbar">
        <div class="titles">
          <p class="site-title">${esc(t.tabTitle)}</p>
          <p class="brand">${esc(t.brand)}</p>
        </div>
        <div class="toolbar">
          <nav class="tabs" role="tablist" aria-label="${esc(t.tabTitle)}">
            <button type="button" role="tab" data-tab="inspection" title="${esc(
              t.navInspection
            )}" aria-selected="${tab === "inspection"}">${esc(
              t.navInspection
            )}</button>
            <button type="button" role="tab" data-tab="fund" title="${esc(
              t.navFund
            )}" aria-selected="${tab === "fund"}">${esc(t.navFund)}</button>
            <button type="button" role="tab" data-tab="maint" title="${esc(
              t.navMaint
            )}" aria-selected="${tab === "maint"}">${esc(t.navMaint)}</button>
            <button type="button" role="tab" data-tab="assembly" title="${esc(
              t.navAssembly
            )}" aria-selected="${tab === "assembly"}">${esc(
              t.navAssembly
            )}</button>
          </nav>
          <div class="lang" role="group" aria-label="Language">
            ${LANGS.map(
              (item) => `
                <button type="button" data-lang="${item.id}" title="${esc(
                  item.label
                )}" aria-pressed="${
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
      [
        "syndicat-ontario-payload",
        "syndicat-ontario-payload-v2",
        "syndicat-ontario-payload-v3",
        "syndicat-ontario-payload-v4",
      ].forEach((key) => sessionStorage.removeItem(key));
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
        <h2>${esc(t.gallery)}</h2>
        ${photoGrid(["front", "rear", "rubble", "crack", "infil", "guard", "drain", "terrace"])}
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

function workYear(work) {
  return work.year + Number(workshop.shifts[work.id] || 0);
}

function workCost(work) {
  const delta = Number(workshop.shifts[work.id] || 0);
  return roundCad(work.cost * Math.pow(1 + FUND.inflation, delta));
}

function renderFund() {
  const t = I18N[lang];
  const f = FUND_I18N[lang];
  document.title = f.title;
  const sim = projectFund(workshopOpts());
  const spendMax = Math.max(1, ...sim.expenses);
  const balanceMax = Math.max(
    spendMax,
    ...sim.rows.map((row) => Math.abs(row.balance))
  );
  const perUnitYear = workshop.annual / FUND.units;
  const perUnitMonth = perUnitYear / 12;
  const lastYear = FUND.startYear + FUND.expenses.length - 1;

  const workRows = FUND.works
    .map((work) => {
      const year = workYear(work);
      const dropped = year > lastYear;
      return `
        <tr>
          <td>
            <input class="year-input" data-shift="${esc(work.id)}" type="number" min="${FUND.startYear}" max="2075" value="${year}" />
            ${dropped ? `<div class="hint">${esc(f.dropped)}</div>` : ""}
          </td>
          <td>${esc(f.workNames[work.id])}${
            work.linked
              ? ` <span class="pill now">${esc(f.linked)}</span>`
              : ""
          }</td>
          <td>${work.remaining} ${esc(f.yearsLeft)}</td>
          <td>${work.avg} ${esc(f.avgLife)}</td>
          <td>${money(workCost(work))}</td>
        </tr>
      `;
    })
    .join("");

  const outsideRows = (FUND.outsideHorizon || [])
    .map(
      (item) => `
        <tr>
          <td>—</td>
          <td>${esc(f.workNames[item.id] || item.id)}</td>
          <td>${item.remaining} ${esc(f.yearsLeft)}</td>
          <td>${item.avg} ${esc(f.avgLife)}</td>
          <td>—</td>
        </tr>
      `
    )
    .join("");

  const scenarioCards = FUND.scenarios
    .map((item) => {
      const meta = f.scenarioMeta[item.id];
      return `
        <article class="card pick">
          <div class="meta">
            <span class="pill ${item.ok ? "ok" : "now"}">${
              item.ok ? "OK" : "—"
            }</span>
          </div>
          <h3>${esc(meta.name)}</h3>
          <p>${esc(meta.detail)}</p>
          <button type="button" class="action" data-apply="${esc(item.id)}">${esc(
            f.applyStudy
          )}</button>
        </article>
      `;
    })
    .join("");

  const yearRows = sim.rows
    .map(
      (row) => `
        <tr>
          <td>${row.year}</td>
          <td>${money(row.contribution)}</td>
          <td>${row.special ? money(row.special) : "—"}</td>
          <td>${row.expense ? money(row.expense) : "—"}</td>
          <td>${row.interest ? money(row.interest) : "—"}</td>
          <td class="${row.balance < 0 ? "neg-cell" : ""}">${money(row.balance)}</td>
        </tr>
      `
    )
    .join("");

  const savedBlock =
    workshop.saved.length === 0
      ? `<p class="lede">${esc(f.noSaved)}</p>`
      : `<ul class="saved-list">${workshop.saved
          .map(
            (item) => `
              <li>
                <span>${esc(item.name)}</span>
                <span>
                  <button type="button" class="action" data-load="${esc(item.id)}">${esc(
                    f.loadBtn
                  )}</button>
                  <button type="button" class="action ghost" data-forget="${esc(
                    item.id
                  )}">${esc(f.deleteBtn)}</button>
                </span>
              </li>
            `
          )
          .join("")}</ul>`;

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
        ${feeTable(workshop.annual)}
        <h2>${esc(f.tryTitle)}</h2>
        <p class="lede">${esc(f.tryLead)}</p>
        <article class="card sim">
          <div class="sim-grid">
            <label>
              ${esc(f.annualLabel)}
              <strong id="annual-val">${money(workshop.annual)}</strong>
              <input id="annual" type="range" min="500" max="25000" step="50" value="${workshop.annual}" />
            </label>
            <label>
              ${esc(f.increaseLabel)}
              <strong id="increase-val">${pct(workshop.increase)}</strong>
              <input id="increase" type="range" min="0" max="8" step="0.5" value="${
                workshop.increase * 100
              }" />
            </label>
            <label>
              ${esc(f.startBalance)}
              <input id="start-balance" type="number" min="0" step="100" value="${workshop.startBalance}" />
            </label>
            <label>
              ${esc(f.interestLabel)}
              <strong id="interest-val">${pct(workshop.interestPct / 100)}</strong>
              <input id="interest" type="range" min="0" max="5" step="0.1" value="${workshop.interestPct}" />
            </label>
            <label>
              ${esc(f.specialYear)}
              <input id="special-year" type="number" min="${FUND.startYear}" max="${lastYear}" value="${workshop.specialYear}" />
            </label>
            <label>
              ${esc(f.specialAmount)}
              <input id="special-amount" type="number" min="0" step="100" value="${workshop.specialAmount}" />
            </label>
          </div>
          <label class="check">
            <input id="use-phase2" type="checkbox" ${workshop.usePhase2 ? "checked" : ""} />
            ${esc(f.phase2)}
          </label>
          <div class="sim-grid" id="phase2-fields" ${workshop.usePhase2 ? "" : "hidden"}>
            <label>
              ${esc(f.phaseYears)}
              <input id="phase-years" type="number" min="1" max="24" value="${workshop.phaseYears}" />
            </label>
            <label>
              ${esc(f.annualAfter)}
              <input id="annual2" type="number" min="0" step="50" value="${workshop.annual2}" />
            </label>
            <label>
              ${esc(f.increaseAfter)}
              <strong id="increase2-val">${pct(workshop.increase2)}</strong>
              <input id="increase2" type="range" min="0" max="8" step="0.5" value="${
                workshop.increase2 * 100
              }" />
            </label>
          </div>
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
            sim.expenses,
            spendMax,
            "spend"
          )}</div>
          <div class="chart-label">${esc(f.chartBalance)}</div>
          <div id="chart-balance" class="chart">${chartBars(
            sim.rows.map((row) => row.balance),
            balanceMax,
            "bal"
          )}</div>
          <h3>${esc(f.yearTable)}</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>${esc(f.colYear)}</th>
                  <th>${esc(f.colContrib)}</th>
                  <th>${esc(f.colSpecial)}</th>
                  <th>${esc(f.colSpend)}</th>
                  <th>${esc(f.colInterest)}</th>
                  <th>${esc(f.colBalance)}</th>
                </tr>
              </thead>
              <tbody id="year-body">${yearRows}</tbody>
            </table>
          </div>
          <div class="sim-actions">
            <button type="button" class="action" data-reset="true">${esc(f.resetStudy)}</button>
          </div>
          <label>
            ${esc(f.saveName)}
            <input id="save-label" type="text" maxlength="80" value="${esc(workshop.saveLabel)}" />
          </label>
          <div class="sim-actions">
            <button type="button" class="action" data-save="true">${esc(f.saveBtn)}</button>
          </div>
          <h3>${esc(f.savedTitle)}</h3>
          ${savedBlock}
        </article>
        <h2>${esc(f.scenarios)}</h2>
        <p class="lede">${esc(f.scenarioNote)}</p>
        <div class="cards">${scenarioCards}</div>
        <h2>${esc(f.shiftTitle)}</h2>
        <p class="lede">${esc(f.shiftLead)}</p>
        <h3>${esc(f.works)}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>${esc(f.targetYear)}</th>
                ${f.workHeaders.slice(1).map((header) => `<th>${esc(header)}</th>`).join("")}
              </tr>
            </thead>
            <tbody>${workRows}</tbody>
          </table>
        </div>
        <h3>${esc(f.outsideTitle)}</h3>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>${f.workHeaders.map((header) => `<th>${esc(header)}</th>`).join("")}</tr>
            </thead>
            <tbody>${outsideRows}</tbody>
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
  const readFields = () => {
    const annual = document.getElementById("annual");
    const increase = document.getElementById("increase");
    const start = document.getElementById("start-balance");
    const interest = document.getElementById("interest");
    const specialYear = document.getElementById("special-year");
    const specialAmount = document.getElementById("special-amount");
    const usePhase2 = document.getElementById("use-phase2");
    const phaseYears = document.getElementById("phase-years");
    const annual2 = document.getElementById("annual2");
    const increase2 = document.getElementById("increase2");
    const saveLabel = document.getElementById("save-label");
    if (annual) workshop.annual = Number(annual.value);
    if (increase) workshop.increase = Number(increase.value) / 100;
    if (start) workshop.startBalance = Number(start.value);
    if (interest) workshop.interestPct = Number(interest.value);
    if (specialYear) workshop.specialYear = Number(specialYear.value);
    if (specialAmount) workshop.specialAmount = Number(specialAmount.value);
    if (usePhase2) workshop.usePhase2 = usePhase2.checked;
    if (phaseYears) workshop.phaseYears = Number(phaseYears.value);
    if (annual2) workshop.annual2 = Number(annual2.value);
    if (increase2) workshop.increase2 = Number(increase2.value) / 100;
    if (saveLabel) workshop.saveLabel = saveLabel.value;
    persistWorkshop();
  };

  const paint = () => {
    const f = FUND_I18N[lang];
    const sim = projectFund(workshopOpts());
    const spendMax = Math.max(1, ...sim.expenses);
    const balanceMax = Math.max(
      spendMax,
      ...sim.rows.map((row) => Math.abs(row.balance))
    );
    const annualVal = document.getElementById("annual-val");
    const increaseVal = document.getElementById("increase-val");
    const interestVal = document.getElementById("interest-val");
    const increase2Val = document.getElementById("increase2-val");
    if (annualVal) annualVal.textContent = money(workshop.annual);
    if (increaseVal) increaseVal.textContent = pct(workshop.increase);
    if (interestVal) interestVal.textContent = pct(workshop.interestPct / 100);
    if (increase2Val) increase2Val.textContent = pct(workshop.increase2);
    const phaseBox = document.getElementById("phase2-fields");
    if (phaseBox) phaseBox.hidden = !workshop.usePhase2;
    const per = document.getElementById("sim-per");
    if (per) {
      per.textContent = `${f.perUnit}: ${money(workshop.annual / FUND.units)} (${money(
        workshop.annual / FUND.units / 12
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
      spendChart.innerHTML = chartBars(sim.expenses, spendMax, "spend");
    }
    if (balChart) {
      balChart.innerHTML = chartBars(
        sim.rows.map((row) => row.balance),
        balanceMax,
        "bal"
      );
    }
    const yearBody = document.getElementById("year-body");
    if (yearBody) {
      yearBody.innerHTML = sim.rows
        .map(
          (row) => `
        <tr>
          <td>${row.year}</td>
          <td>${money(row.contribution)}</td>
          <td>${row.special ? money(row.special) : "—"}</td>
          <td>${row.expense ? money(row.expense) : "—"}</td>
          <td>${row.interest ? money(row.interest) : "—"}</td>
          <td class="${row.balance < 0 ? "neg-cell" : ""}">${money(row.balance)}</td>
        </tr>
      `
        )
        .join("");
    }
    const feeBody = document.getElementById("fee-body");
    if (feeBody) {
      feeBody.innerHTML = portionFees(workshop.annual)
        .map(
          (row) => `
        <tr>
          <td>${esc(row.name)}</td>
          <td>${pct(row.share)}</td>
          <td>${money2(row.monthlyNow)}</td>
          <td>${money2(row.reserveNow)}</td>
          <td>${money2(row.reserveNew)}</td>
          <td>${money2(row.monthlyNew)}</td>
        </tr>
      `
        )
        .join("");
    }
  };

  const live = () => {
    readFields();
    paint();
  };

  [
    "annual",
    "increase",
    "start-balance",
    "interest",
    "special-year",
    "special-amount",
    "phase-years",
    "annual2",
    "increase2",
    "save-label",
  ].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("input", live);
  });
  const usePhase2 = document.getElementById("use-phase2");
  if (usePhase2) {
    usePhase2.addEventListener("change", () => {
      readFields();
      render();
    });
  }
  document.querySelectorAll("[data-shift]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.shift;
      const work = FUND.works.find((item) => item.id === id);
      if (!work) return;
      workshop.shifts[id] = Number(input.value) - work.year;
      persistWorkshop();
      render();
    });
  });
  document.querySelectorAll("[data-apply]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = FUND.scenarios.find((row) => row.id === button.dataset.apply);
      if (!item) return;
      applyStudyPath(item);
      render();
    });
  });
  document.querySelectorAll("[data-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      const saved = workshop.saved;
      workshop = defaultWorkshop();
      workshop.saved = saved;
      persistWorkshop();
      render();
    });
  });
  document.querySelectorAll("[data-save]").forEach((button) => {
    button.addEventListener("click", () => {
      readFields();
      const name = (workshop.saveLabel || "").trim();
      if (!name) return;
      workshop.saved.push({
        id: String(Date.now()),
        name,
        state: {
          annual: workshop.annual,
          increase: workshop.increase,
          usePhase2: workshop.usePhase2,
          phaseYears: workshop.phaseYears,
          annual2: workshop.annual2,
          increase2: workshop.increase2,
          specialYear: workshop.specialYear,
          specialAmount: workshop.specialAmount,
          startBalance: workshop.startBalance,
          interestPct: workshop.interestPct,
          shifts: { ...workshop.shifts },
        },
      });
      workshop.saveLabel = "";
      persistWorkshop();
      render();
    });
  });
  document.querySelectorAll("[data-load]").forEach((button) => {
    button.addEventListener("click", () => {
      const item = workshop.saved.find((row) => row.id === button.dataset.load);
      if (!item) return;
      Object.assign(workshop, item.state);
      workshop.shifts = { ...(item.state.shifts || {}) };
      persistWorkshop();
      render();
    });
  });
  document.querySelectorAll("[data-forget]").forEach((button) => {
    button.addEventListener("click", () => {
      workshop.saved = workshop.saved.filter(
        (row) => row.id !== button.dataset.forget
      );
      persistWorkshop();
      render();
    });
  });
}

function renderMaint() {
  const t = I18N[lang];
  const m = MAINT_I18N[lang];
  document.title = m.title;
  const urgent = MAINT.urgent
    .map(
      (item) => `
        <article class="card">
          <div class="meta"><span class="pill now">${esc(t.filterNow)}</span></div>
          <p>${esc(m.urgent[item.id])}</p>
        </article>
      `
    )
    .join("");
  const history = MAINT.history
    .map((row) => {
      const cost =
        row.cost == null ? esc(m.noCost) : money(row.cost);
      return `<tr><td>${row.year}</td><td>${esc(m.history[row.id])}</td><td>${cost}</td></tr>`;
    })
    .join("");
  const yearly = MAINT.yearly
    .map((item) => `<li>${esc(m.yearly[item.id])}</li>`)
    .join("");
  const inventory = (MAINT.inventory || [])
    .map(
      (item) => `
        <article class="card">
          <div class="meta"><span class="pill ${item.flag}">${esc(
            item.flag === "now"
              ? t.filterNow
              : item.flag === "soon"
                ? t.filterSoon
                : t.filterLater
          )}</span></div>
          <p>${esc(m.inventory[item.id])}</p>
        </article>
      `
    )
    .join("");
  const carnetPlan = (MAINT.carnetPlan || [])
    .map((item) => {
      const name = (FUND_I18N[lang].workNames && FUND_I18N[lang].workNames[item.id]) || item.id;
      const cost = item.cost == null ? esc(m.afterWindow) : money(item.cost);
      return `<tr><td>${esc(name)}</td><td>${cost}</td></tr>`;
    })
    .join("");
  document.getElementById("app").innerHTML = chrome(`
        <h1>${esc(m.h1)}</h1>
        <p class="lede">${esc(m.lede)}</p>
        <aside class="callout">
          <strong>${esc(m.calloutTitle)}</strong>
          ${esc(m.callout)}
        </aside>
        <h2>${esc(m.urgentTitle)}</h2>
        <div class="cards">${urgent}</div>
        <h2>${esc(m.inventoryTitle)}</h2>
        <div class="cards">${inventory}</div>
        <h2>${esc(m.historyTitle)}</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>${m.histHeaders.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>
            </thead>
            <tbody>${history}</tbody>
          </table>
        </div>
        <h2>${esc(m.carnetPlanTitle)}</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>${esc(FUND_I18N[lang].workHeaders[1])}</th><th>${esc(
                FUND_I18N[lang].workHeaders[4]
              )}</th></tr>
            </thead>
            <tbody>${carnetPlan}</tbody>
          </table>
        </div>
        <h2>${esc(m.yearlyTitle)}</h2>
        <article class="card">
          <ul class="plain">${yearly}</ul>
        </article>
        ${photoGrid(["rubble", "infil", "guard", "drain"])}
        <h2>${esc(m.skipTitle)}</h2>
        <p class="lede">${esc(m.skipBody)}</p>
        <section class="footnote">
          <p>${esc(m.limits)}</p>
        </section>
  `);
  bindChrome();
}

function renderAssembly() {
  const a = ASSEMBLY_I18N[lang];
  document.title = a.title;
  const feeRows = ASSEMBLY.portions
    .map(
      (row) => `
        <tr>
          <td>${esc(a.owners[row.id])}</td>
          <td>${pct(row.share)}</td>
          <td>${money2(row.monthlyNow)}</td>
          <td>${money2(row.monthly2027)}</td>
          <td>${money2(row.reserve2027)}</td>
          <td>${money2(row.ins2027)}</td>
          <td>${money2(row.ops2027)}</td>
        </tr>
      `
    )
    .join("");
  document.getElementById("app").innerHTML = chrome(`
        <h1>${esc(a.h1)}</h1>
        <p class="lede">${esc(a.lede)}</p>
        <aside class="callout">
          <strong>${esc(a.calloutTitle)}</strong>
          ${esc(a.callout)}
        </aside>
        <h2>${esc(a.selfTitle)}</h2>
        <p>${esc(a.selfBody)}</p>
        <h2>${esc(a.feesTitle)}</h2>
        <p class="lede">${esc(a.feesLead)}</p>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>${a.feeHeaders.map((h) => `<th>${esc(h)}</th>`).join("")}</tr>
            </thead>
            <tbody>${feeRows}</tbody>
          </table>
        </div>
        <h2>${esc(a.planTitle)}</h2>
        <p>${esc(a.planBody)}</p>
        <figure class="plan-fig">
          <img src="${esc(ASSEMBLY.planImg)}" alt="${esc(a.planCaption)}" />
          <figcaption>${esc(a.planCaption)}</figcaption>
        </figure>
        <h2>${esc(a.decisionsTitle)}</h2>
        <article class="card">
          <ul class="plain">
            ${a.decisions.map((item) => `<li>${esc(item)}</li>`).join("")}
          </ul>
        </article>
        <section class="footnote">
          <p>${esc(a.limits)}</p>
        </section>
  `);
  bindChrome();
}

function render() {
  document.documentElement.lang = I18N[lang].htmlLang;
  document.documentElement.dir = I18N[lang].dir === "rtl" ? "rtl" : "ltr";
  try {
    if (tab === "fund") renderFund();
    else if (tab === "maint") renderMaint();
    else if (tab === "assembly") renderAssembly();
    else renderInspection();
  } catch (err) {
    document.getElementById("app").hidden = false;
    document.getElementById("app").innerHTML =
      "<p class='lede'>Could not render this tab. Try a hard refresh (Ctrl+Shift+R).</p>";
    console.error(err);
  }
}

render();
