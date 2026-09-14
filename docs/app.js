function roundCad(value) {
  return Math.round(Number(value) || 0);
}

function hasShifts(shifts) {
  return Object.keys(shifts || {}).some((id) => Number(shifts[id]) !== 0);
}

const EXTRA_WORK = [
  {
    id: "backflow",
    year: 2027,
    remaining: 1,
    avg: 40,
    cost: 1800,
    marketMin: 750,
    marketMax: 2500,
    kind: "near",
    est: true,
  },
  {
    id: "guardRaise",
    year: 2027,
    remaining: 1,
    avg: 45,
    cost: 7500,
    marketMin: 4500,
    marketMax: 12000,
    kind: "near",
    est: true,
  },
  {
    id: "roofMembrane",
    year: 2051,
    remaining: 25,
    avg: 30,
    cost: 36000,
    marketMin: 18000,
    marketMax: 46000,
    kind: "later",
    est: true,
  },
  {
    id: "alumGuards",
    year: 2051,
    remaining: 25,
    avg: 45,
    cost: 13000,
    marketMin: 8000,
    marketMax: 20000,
    kind: "later",
    est: true,
  },
  {
    id: "blockCladding",
    year: 2051,
    remaining: 25,
    avg: 25,
    cost: 22000,
    marketMin: 14400,
    marketMax: 38400,
    kind: "later",
    est: true,
  },
  {
    id: "crackSeal",
    year: 2027,
    remaining: 1,
    avg: 40,
    cost: 1400,
    marketMin: 800,
    marketMax: 2500,
    kind: "near",
    est: true,
  },
  {
    id: "balconyGutter",
    year: 2027,
    remaining: 1,
    avg: 25,
    cost: 900,
    marketMin: 400,
    marketMax: 1800,
    kind: "near",
    est: true,
  },
  {
    id: "waterHeater",
    year: 2027,
    remaining: 1,
    avg: 10,
    cost: 2400,
    marketMin: 1500,
    marketMax: 3800,
    kind: "near",
    est: true,
  },
  {
    id: "smokeAlarms",
    year: 2027,
    remaining: 1,
    avg: 10,
    cost: 500,
    marketMin: 250,
    marketMax: 900,
    kind: "near",
    est: true,
  },
];

function marketRange(work) {
  if (work.marketMin == null || work.marketMax == null) return "";
  return `${money(work.marketMin)}–${money(work.marketMax)}`;
}

function marketTable() {
  const h = helpCopy();
  const rows = EXTRA_WORK.map(
    (work) => `
      <tr>
        <td>${esc(workLabel(work.id))}</td>
        <td>${esc(marketRange(work))}</td>
        <td>${money(work.cost)}</td>
      </tr>
    `
  ).join("");
  return `
    <h2>${esc(h.marketTitle)}</h2>
    <p class="lede">${esc(h.marketNote)}</p>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>${esc(
              (FUND_I18N[lang] &&
                FUND_I18N[lang].workHeaders &&
                FUND_I18N[lang].workHeaders[1]) ||
                "Item"
            )}</th>
            <th>${esc(h.marketRange)}</th>
            <th>${esc(h.marketUsed)}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function defaultExtras() {
  const extras = {};
  EXTRA_WORK.forEach((work) => {
    extras[work.id] = work.id === "backflow" || work.id === "guardRaise";
  });
  return extras;
}

function normalizeExtras(raw) {
  const extras = defaultExtras();
  if (!raw || typeof raw !== "object") return extras;
  if (raw.extras && typeof raw.extras === "object") {
    EXTRA_WORK.forEach((work) => {
      if (raw.extras[work.id] != null) extras[work.id] = Boolean(raw.extras[work.id]);
    });
    return extras;
  }
  const nearOn = raw.includeNear !== false;
  const laterOn = Boolean(raw.includeLater);
  extras.backflow = nearOn;
  extras.guardRaise = nearOn;
  extras.roofMembrane = laterOn;
  extras.alumGuards = laterOn;
  extras.blockCladding = laterOn;
  return extras;
}

function extraWorksSelected() {
  const assign = typeof planState === "function" ? planState() : null;
  if (assign) {
    return EXTRA_WORK.filter(
      (work) => assign[work.id] && assign[work.id] !== "off"
    );
  }
  return EXTRA_WORK.filter(
    (work) => workshop && workshop.extras && workshop.extras[work.id]
  );
}

function extraSpendTotal() {
  return extraWorksSelected().reduce((sum, work) => sum + workCost(work), 0);
}

function extraTallyHtml(sim) {
  const h = helpCopy();
  const f = FUND_I18N[lang];
  const extras = extraWorksSelected();
  const spend = extraSpendTotal();
  if (!extras.length) {
    return `<aside id="extra-tally" class="extra-tally">${esc(h.extraTallyNone)}</aside>`;
  }
  const result = sim.ok
    ? h.resultOkLong
    : `${h.resultBadLong} ${sim.firstGap}.`;
  return `<aside id="extra-tally" class="extra-tally">
    <strong>${esc(h.extraTallyOn)} ${money(spend)}</strong>
    <p class="lede">${esc(h.extraTallyFees)}</p>
    <p>${esc(h.extraTallyResult)} ${esc(result)} ${esc(f.endBalance)}: ${money(
      sim.end
    )}.</p>
  </aside>`;
}

function extraCheckList() {
  const h = helpCopy();
  const row = (work) => `
    <label class="check extra-item">
      <input type="checkbox" data-extra="${esc(work.id)}" ${
        workshop.extras && workshop.extras[work.id] ? "checked" : ""
      } />
      <span>
        ${esc(workLabel(work.id))}
        <span class="extra-meta">${money(work.cost)} · ${esc(h.marketRange)} ${esc(
          marketRange(work)
        )}</span>
      </span>
    </label>`;
  const near = EXTRA_WORK.filter((work) => work.kind === "near");
  const later = EXTRA_WORK.filter((work) => work.kind === "later");
  return `
    <div class="extra-list">
      <p class="lede">${esc(h.extraListLead)}</p>
      ${near.map(row).join("")}
      <p class="chart-label">${esc(h.extraLaterHead)}</p>
      ${later.map(row).join("")}
      ${extraTallyHtml(projectFund(workshopOpts()))}
    </div>
  `;
}

function workLabel(id) {
  const extra = (helpCopy().extraNames || {})[id];
  if (extra) return extra;
  const names = FUND_I18N[lang] && FUND_I18N[lang].workNames;
  return (names && names[id]) || id;
}

function findWork(id) {
  return (
    (FUND.works || []).find((item) => item.id === id) ||
    EXTRA_WORK.find((item) => item.id === id) ||
    null
  );
}

function workCostHtml(work) {
  const h = helpCopy();
  return `${money(workCost(work))}${
    work.est && work.marketMin != null
      ? `<div class="market-hint">${esc(h.marketRange)}: ${esc(marketRange(work))}</div>`
      : ""
  }`;
}

function paintWorkShifts() {
  const lastYear = FUND.startYear + FUND.expenses.length - 1;
  document.querySelectorAll("[data-shift]").forEach((input) => {
    const work = findWork(input.dataset.shift);
    if (!work) return;
    const year = workYear(work);
    if (document.activeElement !== input) input.value = String(year);
    const hint = document.querySelector(`[data-dropped="${work.id}"]`);
    if (hint) hint.hidden = year <= lastYear;
    const costCell = document.querySelector(`[data-work-cost="${work.id}"]`);
    if (costCell) costCell.innerHTML = workCostHtml(work);
  });
}

function applyYearShift(input) {
  const work = findWork(input.dataset.shift);
  if (!work) return false;
  const year = Number(input.value);
  if (!Number.isFinite(year) || year < 1900 || year > 2100) return false;
  const rounded = Math.round(year);
  workshop.shifts[work.id] = rounded - work.year;
  if (isExtraWork(work.id)) {
    if (!workshop.extras) workshop.extras = defaultExtras();
    workshop.extras[work.id] = true;
  }
  const assignments = planState();
  assignments[work.id] = rounded;
  persistPlanAssignments(assignments);
  persistWorkshop();
  return true;
}

function studyWorkStats() {
  const costs = (FUND.works || []).map((work) => Number(work.cost) || 0).filter((cost) => cost > 0);
  const total = costs.reduce((sum, cost) => sum + cost, 0);
  const count = costs.length;
  return {
    total,
    count,
    avg: count ? total / count : 0,
  };
}

function spendPlan(shifts, extraList, workList) {
  const years = FUND.expenses.length;
  const extras = extraList !== undefined ? extraList : extraWorksSelected();
  const catalog = workList !== undefined ? workList : FUND.works || [];
  const rebuild = hasShifts(shifts) || workList !== undefined;
  const expenses = rebuild ? Array(years).fill(0) : FUND.expenses.slice();
  const dropped = [];
  const add = (work) => {
    const delta = Number(shifts[work.id] || 0);
    const year = work.year + delta;
    const cost = roundCad(work.cost * Math.pow(1 + FUND.inflation, delta));
    const idx = year - FUND.startYear;
    if (idx >= years) {
      expenses[years - 1] += cost;
      dropped.push({ id: work.id, year, cost, folded: true });
    } else if (idx < 0) expenses[0] += cost;
    else expenses[idx] += cost;
  };
  if (rebuild) catalog.forEach(add);
  extras.forEach(add);
  return { expenses, dropped };
}

window.projectFund = function projectFund(opts) {
  const plan = spendPlan(opts.shifts, opts.extraList, opts.workList);
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

const WORKSHOP_HELP = {
  en: {
    tipLabel: "Help",
    howTitle: "Three steps",
    howSteps: [
      "Job years are the same as Plan. Change them here or there.",
      "Read the green or red box — does this pot last?",
      "Move the two sliders to try a different yearly amount. Plan’s monthly cards follow.",
    ],
    fundLead:
      "Sandbox for the yearly pot. Years match Plan. Sliders here change what Plan shows as the monthly fee.",
    pathPicks: "Start from a printed idea",
    loadedNote: "Loaded. Change the sliders or tap another idea.",
    guideTitle: "What this workshop is",
    guideBody:
      "The reserve is a shared pot for big building jobs. You pick how much goes in each year. Green: the pot never goes below $0 through 2050. Red: it runs out that year.",
    stepStart: "1 · Start from an idea",
    stepStartLead:
      "Same mixes the study printed. Tap one, then read the box.",
    stepVerdict: "2 · Does the pot last?",
    stepPay: "3 · What you put in each year",
    stepPayLead:
      "This is the shared reserve, all three portions together. The table under the box splits it by quote-part.",
    moreTitle: "Less common knobs",
    moreLead:
      "Starting cash, interest, a one-time special, a second phase, extras the study left out, and save.",
    chartsTitle: "Work cost vs pot, year by year",
    yearsTitle: "Numbers for each year",
    shiftWrapTitle: "Job years (same as Plan)",
    nearShort:
      "Also count the backflow valve and raising balcony guards (soon, estimates)",
    laterShort:
      "Also count roof, full guards, and block walls after 2050 (estimates)",
    resultOkLong: "This mix lasts 25 years.",
    resultBadLong: "This mix runs out in",
    resultHintOk:
      "You can still try a lower pot, or turn extras on, to see the edge.",
    resultHintBad:
      "Try a higher yearly amount, a one-time special, or start from Proposed 1.",
    payCaption: "What each portion would pay with this yearly pot",
    studyPrinted: "The study’s mixes, in words",
    studyPrintedLead:
      "Same ideas as step 1, with the study’s own comment on each mix.",
    unitBreak: "Breakdown per unit",
    unit: "Unit",
    share: "Quote-part",
    reserveYear: "Reserve / year",
    reserveMonth: "Reserve / month",
    thenYear: "Then / year",
    thenMonth: "Then / month",
    specialOnce: "Special (once)",
    newFee: "New monthly fee",
    reserveNow: "Reserve today / month",
    tips: {
      annual:
        "Total reserve for the year, all three portions together. The fee table splits it 27.5% / 27.5% / 45%.",
      increase:
        "Added every year in phase 1. 0% keeps the same dollar amount. Proposed 1 uses 2%.",
      start:
        "Cash already in the reserve at the start of 2026. The study uses $5,881. Change this only if the bank balance is different.",
      interest:
        "Paid only when the balance is still positive after that year’s money in and money out. The study uses 1%.",
      specialYear:
        "Year the one-time extra payment hits the fund. Set the amount next to it. Leave the amount at 0 to skip this.",
      specialAmount:
        "One extra payment in the year you picked. Use this to test a special assessment before a big job.",
      phase2:
        "After N years, switch to a different yearly amount and increase. Proposed 3 does this: catch-up for 10 years, then Law 16.",
      phaseYears:
        "How long phase 1 lasts. 2026 is year 1, so 10 years means 2026–2035, then phase 2 starts in 2036.",
      annual2:
        "Yearly contribution once phase 2 starts. Proposed 3 uses $5,960 (0.5% of reconstruction).",
      increase2:
        "Yearly increase in phase 2. The study inflates the Law 16 amount at 3%/year.",
      result:
        "Green if the balance never goes below $0. Red shows the first shortfall year. Lowest balance is the deepest hole.",
      save: "Stores this mix of sliders and moved work on this computer only. Other phones will not see it.",
      reset:
        "Back to today’s $5,647, no increase, no special assessment, and the study years for the work.",
      loadStudy:
        "Copies that printed scenario into the workshop so you can tweak it. Unsaved slider changes will be replaced.",
      shift:
        "Change when a job happens. Later years add 3% inflation; earlier years reduce it. After 2050 the cost leaves this 25-year window.",
      fee: "New monthly ≈ (today’s fee − today’s reserve share) + new reserve share. Dwellings 27.5% each; 4267 is 45%.",
      yearTable:
        "Money in, special, money out, interest, closing balance. Red = short that year.",
      saved:
        "Load puts a named path back on the sliders. Delete removes it from this computer only.",
    },
    extraNear:
      "Also count near-term carnet jobs not in the 25-year study: backflow valve and raising balcony guards. These are estimates — get quotes.",
    extraLater:
      "Also count work after 2050 (roof membrane, aluminum guards, block cladding). Costs are estimates, inflated 3%/year and folded into 2050 so the path has to fund them.",
    avgWork: "Average priced item in the 25-year list",
    extraNames: {
      backflow: "Sewer backflow valve (Montréal mid-market)",
      guardRaise: "Raise balcony guards to 42 in. (Montréal mid-market)",
      roofMembrane: "Elastomeric roof membrane (Montréal mid-market)",
      alumGuards: "Aluminum guards, full replace (Montréal mid-market)",
      blockCladding: "Concrete-block cladding (Montréal mid-market)",
      crackSeal: "Seal rear foundation crack (Montréal mid-market)",
      balconyGutter: "Balcony gutter at restaurant ceiling (Montréal mid-market)",
      waterHeater: "Replace 2017 water heater (Montréal mid-market)",
      smokeAlarms: "Replace common-area smoke alarms (Montréal mid-market)",
    },
    extraListLead:
      "Same extras as Plan. Untick to skip — Plan updates too.",
    extraLaterHead: "After 2050 (folded into the last year)",
    extraInResult: "Extra jobs on the work side",
    extraTallyNone:
      "No extra jobs ticked. The pot only covers the study’s 25-year list.",
    extraTallyOn: "Extra jobs added to the work side:",
    extraTallyFees:
      "The yearly fee sliders above stay put. If the box turns red, raise the yearly pot.",
    extraTallyResult: "Updated result:",
    marketTitle: "Montréal contractor ranges (2026)",
    marketUsed: "Used in workshop",
    marketRange: "Local range",
    marketNote:
      "Midpoints from Greater Montréal 2026 contractor guides, not quotes. Backflow $750–$2,500 (slab cut often $1,200–$2,500); RénoPlex may pay $90 or $600 under a slab. Aluminum guards about $80–$250/lin. ft plus install. Elastomeric reroof about $15–$23/sq. ft; your 2023 roof invoice was $35,311. Block/masonry rebuild about $240–$480/m². Get two or three RBQ quotes.",
    maintAvgTitle: "Upcoming work — average budget",
    maintEst: "Estimate",
    maintInStudy: "In the reserve study",
    maintAvgLead:
      "Priced items in the 25-year study average this much each. Urgent carnet jobs already in the study use those figures. Jobs with no study price use the Montréal mid-market figures below and can be switched on in the reserve-fund workshop.",
  },
  fr: {
    tipLabel: "Aide",
    howTitle: "Trois étapes",
    howSteps: [
      "Les années des postes sont les mêmes que sur Plan. Changez-les ici ou là.",
      "Lisez l’encadré vert ou rouge — la cagnotte tient-elle ?",
      "Bougez les deux curseurs pour un autre montant annuel. Les mensuels du Plan suivent.",
    ],
    fundLead:
      "Bac à sable pour la cagnotte annuelle. Les années suivent Plan. Les curseurs ici changent le mensuel affiché sur Plan.",
    pathPicks: "Partir d’une idée imprimée",
    loadedNote: "Chargé. Changez les curseurs ou touchez une autre idée.",
    guideTitle: "À quoi sert cet atelier",
    guideBody:
      "Le fonds est une cagnotte commune pour les gros travaux. Vous choisissez combien y entre chaque année. Vert : la cagnotte ne passe jamais sous 0 $ jusqu’en 2050. Rouge : elle est vide cette année-là.",
    stepStart: "1 · Partir d’une idée",
    stepStartLead:
      "Les mêmes mélanges que l’étude. Touchez-en un, puis lisez l’encadré.",
    stepVerdict: "2 · La cagnotte tient-elle ?",
    stepPay: "3 · Ce que vous versez chaque année",
    stepPayLead:
      "C’est la prévoyance des trois portions ensemble. Le tableau sous l’encadré la répartit selon la quote-part.",
    moreTitle: "Réglages moins courants",
    moreLead:
      "Solde de départ, intérêt, cotisation spéciale, deuxième phase, travaux hors étude, et enregistrement.",
    chartsTitle: "Travaux vs cagnotte, année par année",
    yearsTitle: "Chiffres pour chaque année",
    shiftWrapTitle: "Années des postes (les mêmes que Plan)",
    nearShort:
      "Compter aussi le clapet anti-retour et le rehaussement des garde-corps (bientôt, estimations)",
    laterShort:
      "Compter aussi toiture, garde-corps complets et blocs après 2050 (estimations)",
    resultOkLong: "Ce mélange tient 25 ans.",
    resultBadLong: "Ce mélange est vide en",
    resultHintOk:
      "Vous pouvez encore baisser la cagnotte, ou activer les extras, pour voir la limite.",
    resultHintBad:
      "Essayez un montant annuel plus haut, une cotisation spéciale, ou partez du proposé 1.",
    payCaption: "Ce que chaque portion paierait avec cette cagnotte annuelle",
    studyPrinted: "Les mélanges de l’étude, en mots",
    studyPrintedLead:
      "Les mêmes idées qu’à l’étape 1, avec le commentaire de l’étude.",
    unitBreak: "Répartition par unité",
    unit: "Unité",
    share: "Quote-part",
    reserveYear: "Prévoyance / an",
    reserveMonth: "Prévoyance / mois",
    thenYear: "Ensuite / an",
    thenMonth: "Ensuite / mois",
    specialOnce: "Spéciale (une fois)",
    newFee: "Nouveau frais mensuel",
    reserveNow: "Prévoyance aujourd’hui / mois",
    tips: {
      annual:
        "Cotisation de prévoyance de l’année, les trois portions ensemble. Le tableau la répartit 27,5 % / 27,5 % / 45 %.",
      increase:
        "Ajoutée chaque année en phase 1. 0 % = le même montant. Le proposé 1 utilise 2 %.",
      start:
        "Argent déjà dans le fonds au début de 2026. L’étude part de 5 881 $. Changez seulement si le solde bancaire est différent.",
      interest:
        "Versé seulement si le solde est encore positif après les entrées et sorties de l’année. L’étude utilise 1 %.",
      specialYear:
        "Année où le versement unique entre au fonds. Mettez le montant à côté. Laissez 0 $ pour l’ignorer.",
      specialAmount:
        "Un versement unique l’année choisie. Utile pour tester une cotisation spéciale avant un gros chantier.",
      phase2:
        "Après N années, on passe à un autre montant et une autre hausse. Le proposé 3 fait ça : rattrapage 10 ans, puis loi 16.",
      phaseYears:
        "Durée de la phase 1. 2026 est l’année 1, donc 10 ans = 2026–2035, puis la phase 2 commence en 2036.",
      annual2:
        "Cotisation annuelle une fois la phase 2 commencée. Le proposé 3 utilise 5 960 $ (0,5 % de la reconstruction).",
      increase2:
        "Hausse annuelle en phase 2. L’étude fait croître le montant loi 16 de 3 %/an.",
      result:
        "Vert si le solde ne passe jamais sous 0 $. Rouge = première année en déficit. Le solde le plus bas est le trou le plus profond.",
      save: "Garde ce mélange de curseurs et de travaux déplacés sur cet ordinateur seulement. Un autre téléphone ne le verra pas.",
      reset:
        "Retour à 5 647 $ aujourd’hui, sans hausse, sans cotisation spéciale, et aux années de l’étude.",
      loadStudy:
        "Copie ce scénario imprimé dans l’atelier pour que vous puissiez le modifier. Les curseurs non enregistrés seront remplacés.",
      shift:
        "Changez l’année d’un chantier. Plus tard = +3 %/an ; plus tôt = moins cher. Après 2050, le coût sort de cette fenêtre de 25 ans.",
      fee: "Nouveau mensuel ≈ (frais d’aujourd’hui − part prévoyance actuelle) + nouvelle part. Logements 27,5 % chacun ; 4267 = 45 %.",
      yearTable:
        "Entrées, spéciale, sorties, intérêt, solde de clôture. Rouge = déficit cette année.",
      saved:
        "Charger remet un chemin nommé sur les curseurs. Supprimer l’enlève seulement de cet ordinateur.",
    },
    extraNear:
      "Compter aussi les travaux de carnet hors étude 25 ans : clapet anti-retour et rehaussement des garde-corps. Estimations — obtenir des soumissions.",
    extraLater:
      "Compter aussi les travaux après 2050 (membrane, garde-corps alu, blocs). Estimations, gonflées de 3 %/an et placées en 2050 pour que le chemin les finance.",
    avgWork: "Poste moyen (prix) dans la liste 25 ans",
    extraNames: {
      backflow: "Clapet anti-retour (milieu de marché Montréal)",
      guardRaise: "Rehausser les garde-corps à 42 po (milieu de marché Montréal)",
      roofMembrane: "Membrane élastomère (milieu de marché Montréal)",
      alumGuards: "Garde-corps aluminium, remplacement (milieu de marché Montréal)",
      blockCladding: "Revêtement en blocs (milieu de marché Montréal)",
      crackSeal: "Colmater la fissure arrière (milieu de marché Montréal)",
      balconyGutter: "Gouttière du balcon au plafond du restaurant (milieu de marché Montréal)",
      waterHeater: "Remplacer le chauffe-eau 2017 (milieu de marché Montréal)",
      smokeAlarms: "Remplacer les détecteurs des communs (milieu de marché Montréal)",
    },
    extraListLead:
      "Mêmes extras que Plan. Décochez pour ignorer — Plan suit.",
    extraLaterHead: "Après 2050 (placés dans la dernière année)",
    extraInResult: "Travaux extras côté dépenses",
    extraTallyNone:
      "Aucun extra coché. La cagnotte ne couvre que la liste 25 ans de l’étude.",
    extraTallyOn: "Extras ajoutés côté travaux :",
    extraTallyFees:
      "Les curseurs de cotisation annuelle ne bougent pas. Si l’encadré passe au rouge, augmentez la cagnotte.",
    extraTallyResult: "Résultat à jour :",
    marketTitle: "Fourchettes d’entrepreneurs à Montréal (2026)",
    marketUsed: "Retenu dans l’atelier",
    marketRange: "Fourchette locale",
    marketNote:
      "Milieux de fourchettes 2026 du Grand Montréal, pas des soumissions. Clapet 750–2 500 $ (dalle souvent 1 200–2 500 $); RénoPlex peut verser 90 $ ou 600 $ sous dalle. Garde-corps alu environ 80–250 $/pi lin. plus pose. Réfection élastomère environ 15–23 $/pi²; facture toiture 2023 : 35 311 $. Maçonnerie/blocs environ 240–480 $/m². Obtenir 2 ou 3 soumissions RBQ.",
    maintAvgTitle: "Travaux à venir — budget moyen",
    maintEst: "Estimation",
    maintInStudy: "Dans l’étude de prévoyance",
    maintAvgLead:
      "Les postes chiffrés de l’étude 25 ans ont ce coût moyen. Les urgences déjà dans l’étude gardent ces montants. Sans prix d’étude : milieux de marché montréalais ci-dessous, activables dans l’atelier du fonds.",
  },
  pt: {
    tipLabel: "Ajuda",
    howTitle: "Três passos",
    howSteps: [
      "Os anos das obras são os mesmos do Plano. Mexam aqui ou lá.",
      "Leiam a caixa verde ou vermelha — o pote aguenta?",
      "Mexam nos dois cursores para outro valor anual. Os mensais do Plano seguem.",
    ],
    fundLead:
      "Caixa de areia para o pote anual. Os anos seguem o Plano. Os cursores daqui mudam o mensal no Plano.",
    pathPicks: "Começar por uma ideia impressa",
    loadedNote: "Carregado. Mexam nos cursores ou toquem noutra ideia.",
    guideTitle: "Para que serve esta oficina",
    guideBody:
      "O fundo é um pote comum para obras grandes. Escolhem quanto entra por ano. Verde: o pote nunca desce abaixo de 0 $ até 2050. Vermelho: esgota nesse ano.",
    stepStart: "1 · Começar por uma ideia",
    stepStartLead:
      "As mesmas misturas que o estudo imprimiu. Toquem numa, depois leiam a caixa.",
    stepVerdict: "2 · O pote aguenta?",
    stepPay: "3 · O que põem por ano",
    stepPayLead:
      "É a reserva das três porções juntas. A tabela debaixo da caixa reparte pela quota.",
    moreTitle: "Botões menos comuns",
    moreLead:
      "Saldo inicial, juro, contribuição especial, segunda fase, obras fora do estudo, e guardar.",
    chartsTitle: "Obras vs pote, ano a ano",
    yearsTitle: "Números de cada ano",
    shiftWrapTitle: "Anos das obras (os mesmos do Plano)",
    nearShort:
      "Contar também a válvula anti-retorno e elevar guarda-corpos (em breve, estimativas)",
    laterShort:
      "Contar também telhado, guarda-corpos completos e blocos depois de 2050 (estimativas)",
    resultOkLong: "Esta mistura aguenta 25 anos.",
    resultBadLong: "Esta mistura esgota em",
    resultHintOk:
      "Ainda podem baixar o pote, ou ligar extras, para ver o limite.",
    resultHintBad:
      "Tentem um valor anual mais alto, uma especial, ou comecem pelo proposto 1.",
    payCaption: "O que cada porção pagaria com este pote anual",
    studyPrinted: "As misturas do estudo, por palavras",
    studyPrintedLead:
      "As mesmas ideias do passo 1, com o comentário do estudo.",
    unitBreak: "Repartição por unidade",
    unit: "Unidade",
    share: "Quota",
    reserveYear: "Reserva / ano",
    reserveMonth: "Reserva / mês",
    thenYear: "Depois / ano",
    thenMonth: "Depois / mês",
    specialOnce: "Especial (uma vez)",
    newFee: "Nova taxa mensal",
    reserveNow: "Reserva hoje / mês",
    tips: {
      annual:
        "Reserva do ano, as três porções juntas. A tabela reparte 27,5% / 27,5% / 45%.",
      increase:
        "Somado todos os anos na fase 1. 0% = o mesmo valor. O proposto 1 usa 2%.",
      start:
        "Dinheiro já no fundo no início de 2026. O estudo usa 5.881 $. Mudem só se o saldo bancário for outro.",
      interest:
        "Só entra se o saldo ainda for positivo depois das entradas e saídas do ano. O estudo usa 1%.",
      specialYear:
        "Ano em que o pagamento único entra no fundo. Ponham o valor ao lado. Deixem 0 $ para ignorar.",
      specialAmount:
        "Um pagamento extra no ano escolhido. Sirve para testar uma contribuição especial antes de uma obra grande.",
      phase2:
        "Depois de N anos, muda para outro valor e outro aumento. O proposto 3 faz isto: recuperação 10 anos, depois lei 16.",
      phaseYears:
        "Duração da fase 1. 2026 é o ano 1, por isso 10 anos = 2026–2035, e a fase 2 começa em 2036.",
      annual2:
        "Contribuição anual quando a fase 2 começa. O proposto 3 usa 5.960 $ (0,5% da reconstrução).",
      increase2:
        "Aumento anual na fase 2. O estudo faz crescer o valor da lei 16 a 3%/ano.",
      result:
        "Verde se o saldo nunca desce abaixo de 0 $. Vermelho = primeiro ano em rombo. O saldo mais baixo é o buraco mais fundo.",
      save: "Guarda esta mistura de cursores e obras movidas só neste computador. Outro telemóvel não a vê.",
      reset:
        "Volta aos 5.647 $ de hoje, sem aumento, sem contribuição especial, e aos anos do estudo.",
      loadStudy:
        "Copia aquele cenário impresso para a oficina para o poderem ajustar. Alterações não guardadas são substituídas.",
      shift:
        "Mudam o ano da obra. Mais tarde = +3%/ano; mais cedo = mais barato. Depois de 2050 o custo sai desta janela de 25 anos.",
      fee: "Novo mensal ≈ (taxa de hoje − quota de reserva atual) + nova quota. Habitações 27,5% cada; 4267 = 45%.",
      yearTable:
        "Entradas, especial, saídas, juro, saldo de fecho. Vermelho = rombo nesse ano.",
      saved:
        "Carregar põe um caminho com nome de volta nos cursores. Apagar tira-o só deste computador.",
    },
    extraNear:
      "Contar também as obras do caderno fora do estudo de 25 anos: válvula anti-retorno e elevar guarda-corpos. Estimativas — peçam orçamentos.",
    extraLater:
      "Contar também obras depois de 2050 (membrana, guarda-corpos, blocos). Estimativas, inflacionadas 3%/ano e somadas em 2050 para o caminho as financiar.",
    avgWork: "Item médio (com preço) na lista de 25 anos",
    extraNames: {
      backflow: "Válvula anti-retorno (médio de mercado em Montreal)",
      guardRaise: "Elevar guarda-corpos para 42 pol. (médio de mercado em Montreal)",
      roofMembrane: "Membrana elastomérica (médio de mercado em Montreal)",
      alumGuards: "Guarda-corpos de alumínio, substituição (médio de mercado em Montreal)",
      blockCladding: "Revestimento de blocos (médio de mercado em Montreal)",
      crackSeal: "Selar a fenda traseira da fundação (médio de mercado em Montreal)",
      balconyGutter: "Calha do varanda no tecto do restaurante (médio de mercado em Montreal)",
      waterHeater: "Substituir o termoacumulador de 2017 (médio de mercado em Montreal)",
      smokeAlarms: "Substituir detetores das zonas comuns (médio de mercado em Montreal)",
    },
    extraListLead:
      "Os mesmos extras do Plano. Desmarquem para saltar — o Plano segue.",
    extraLaterHead: "Depois de 2050 (somadas no último ano)",
    extraInResult: "Obras extra no lado das despesas",
    extraTallyNone:
      "Nenhuma extra marcada. O pote só cobre a lista de 25 anos do estudo.",
    extraTallyOn: "Extras somados às obras:",
    extraTallyFees:
      "Os cursores da taxa anual não mexem. Se a caixa ficar vermelha, subam o pote.",
    extraTallyResult: "Resultado atualizado:",
    marketTitle: "Faixas de empreiteiros em Montreal (2026)",
    marketUsed: "Usado na oficina",
    marketRange: "Faixa local",
    marketNote:
      "Pontos médios de guias de 2026 na Grande Montreal, não orçamentos. Válvula 750–2.500 $ (laje muitas vezes 1.200–2.500 $); RénoPlex pode pagar 90 $ ou 600 $ sob laje. Guarda-corpos de alumínio cerca de 80–250 $/pé lin. mais instalação. Telhado elastomérico cerca de 15–23 $/pé²; fatura de 2023: 35.311 $. Alvenaria/blocos cerca de 240–480 $/m². Pedir 2 ou 3 orçamentos RBQ.",
    maintAvgTitle: "Obras futuras — orçamento médio",
    maintEst: "Estimativa",
    maintInStudy: "No estudo de reserva",
    maintAvgLead:
      "Os itens com preço no estudo de 25 anos têm este custo médio. Urgências já no estudo usam esses valores. Sem preço: médios de mercado de Montreal abaixo, ligáveis na oficina do fundo.",
  },
  ary: {
    tipLabel: "شرح",
    howTitle: "تلاتة خطوات",
    howSteps: [
      "سنين الخدمات بحال المخطط. بدّلهم هنا ولا تما.",
      "قرا الصندوق الأخضر ولا الحمر — واش القادّة كاتصمد؟",
      "حرّك جوج سلايدر لمبلغ سنوي آخر. الشهري دالمخطط كيتبع.",
    ],
    fundLead:
      "ورشة دالمبلغ السنوي. السنين بحال المخطط. السلايدر هنا كيبدّلو الشهري فالمخطط.",
    pathPicks: "بدا من فكرة مطبوعة",
    loadedNote: "تحمّل. بدّل السلايدر ولا ضغط على فكرة خرا.",
    guideTitle: "علاش هاد الورشة",
    guideBody:
      "الصندوق هو قادّة مشتركة للأشغال الكبار. كتختار شحال كيدخل كل عام. أخضر: القادّة عمرو تهبط تحت 0 $ حتى 2050. حمر: كاتسالا فداك العام.",
    stepStart: "1 · بدا من فكرة",
    stepStartLead:
      "نفس الخلطات اللي طبعت الدراسة. ضغط على وحدة، وقرا الصندوق.",
    stepVerdict: "2 · واش القادّة كاتصمد؟",
    stepPay: "3 · شنو كتحط كل عام",
    stepPayLead:
      "هاد الاحتياط ديال التلاتة مجموعين. الجدول تحت الصندوق كيقسمو بالكوت-پار.",
    moreTitle: "إعدادات قلّ استعمال",
    moreLead:
      "الرصيد اللول، الفايدة، دفعة مرة، مرحلة تانية، أشغال برا الدراسة، والتسجيل.",
    chartsTitle: "الأشغال مقابل القادّة، عام بعام",
    yearsTitle: "الأرقام لكل عام",
    shiftWrapTitle: "سنين الخدمات (بحال المخطط)",
    nearShort:
      "حسب حتى صمام الرجوع وتعلية الكارد-كور (قريب، تقديرات)",
    laterShort:
      "حسب حتى السطح والكارد-كور الكامل والبلوك من بعد 2050 (تقديرات)",
    resultOkLong: "هاد الخلطة كاتصمد 25 عام.",
    resultBadLong: "هاد الخلطة كاتسالا فـ",
    resultHintOk:
      "تقدر تنقص القادّة، ولا تشعل الزيادات، باش تشوف الحد.",
    resultHintBad:
      "جرّب مبلغ سنوي أعلى، ولا دفعة مرة، ولا بدا من المقترح 1.",
    payCaption: "شنو غادي تخلص كل حصة بهاد القادّة السنوية",
    studyPrinted: "خلطات الدراسة، بالكلام",
    studyPrintedLead:
      "نفس الأفكار ديال الخطوة 1، مع تعليق الدراسة.",
    unitBreak: "التقسيم لكل وحدة",
    unit: "الوحدة",
    share: "الكوت-پار",
    reserveYear: "الاحتياط / عام",
    reserveMonth: "الاحتياط / شهر",
    thenYear: "من بعد / عام",
    thenMonth: "من بعد / شهر",
    specialOnce: "سبيسيال (مرة)",
    newFee: "الشهري الجديد",
    reserveNow: "الاحتياط دابا / شهر",
    tips: {
      annual:
        "الاحتياط ديال العام، التلاتة دالحصص مجموعين. الجدول كيقسمو 27,5% / 27,5% / 45%.",
      increase:
        "كاتزاد كل عام فالمرحلة 1. 0% = نفس المبلغ. المقترح 1 كيستعمل 2%.",
      start:
        "الفلوس اللي ديجا فالصندوق فبداية 2026. الدراسة كاتبدا بـ 5 881 $. بدّل غير إلا كان الرصيد فالبناك مختلف.",
      interest:
        "كاتدخل غير إلا بقا الرصيد إيجابي من بعد الدخل والخرج ديال العام. الدراسة كاتستعمل 1%.",
      specialYear:
        "العام اللي كاتدخل فيه الدفعة الواحدة للصندوق. حط المبلغ حداها. خلّي 0 $ باش تتجاهلها.",
      specialAmount:
        "دفعة زيادة فالعام اللي اخترتي. باش تجرّب كوتيزاسيون سبيسيال قبل أشغال كبار.",
      phase2:
        "من بعد N سنين، كتحول لمبلغ وزيادة خرين. المقترح 3 كيدير هاد الشي: تدارك 10 سنين، من بعد القانون 16.",
      phaseYears:
        "شحال كاتطول المرحلة 1. 2026 هو العام 1، يعني 10 سنين = 2026–2035، والمرحلة 2 كاتبدا فـ 2036.",
      annual2:
        "المساهمة السنوية منين كاتبدا المرحلة 2. المقترح 3 كيستعمل 5 960 $ (0,5% من إعادة البناء).",
      increase2:
        "الزيادة فالمرحلة 2. الدراسة كاتزيد مبلغ القانون 16 بـ 3% فالسنة.",
      result:
        "خضر إلا الرصيد عمرو هبط تحت 0 $. حمر = أول عام فالنقص. أقل رصيد هو أعمق حفرة.",
      save: "كاتحفظ هاد الخلطة ديال السلايدر والأشغال المحرّكة غير فهاد الجهاز. تليفون آخر ما غادي يشوفهاش.",
      reset:
        "رجع لـ 5 647 $ دابا، بلا زيادة، بلا كوتيزاسيون سبيسيال، وسنين الدراسة.",
      loadStudy:
        "كاتنسخ داك السيناريو المطبوع للورشة باش تعدّلو. التغييرات اللي ما تسجّلاتش غادي تتبدّل.",
      shift:
        "بدّل عام الخدمة. من بعد = +3% فالسنة؛ من قبل = رخص. من بعد 2050 الثمن كايخرج من هاد 25 عام.",
      fee: "الشهري الجديد ≈ (المصاريف دابا − حصة الاحتياط دابا) + الحصة الجديدة. السكن 27,5% لكل واحد؛ 4267 = 45%.",
      yearTable:
        "الدخل، السبيسيال، الخرج، الفايدة، الرصيد فالآخر. الحمر = نقص فداك العام.",
      saved:
        "حمّل كيرجع طريق مسمّى للسلايدر. مسح كيمحيها غير من هاد الجهاز.",
    },
    extraNear:
      "حسب حتى الأشغال ديال الكارني اللي ما داخلينش فـ 25 عام: صمام الرجوع وتعلية الكارد-كور. تقديرات — خدّاو دوڤيز.",
    extraLater:
      "حسب حتى الأشغال من بعد 2050 (الميمبران، الكارد-كور، البلوك). تقديرات، كيزيدو 3% فالسنة وكيتجمعو فـ 2050.",
    avgWork: "المعدل ديال عنصر مسعّر فلائحة 25 عام",
    extraNames: {
      backflow: "صمام رجوع الواد (وسط سوق مونتريال)",
      guardRaise: "طلع الكارد-كور لـ 42 إنش (وسط سوق مونتريال)",
      roofMembrane: "ميمبران السطح (وسط سوق مونتريال)",
      alumGuards: "كارد-كور ألومنيوم، تبديل كامل (وسط سوق مونتريال)",
      blockCladding: "كسوة البلوك (وسط سوق مونتريال)",
      crackSeal: "سلك الشقّة الورانية (وسط سوق مونتريال)",
      balconyGutter: "ڭوّيير البالكون فسقف الريسطو (وسط سوق مونتريال)",
      waterHeater: "بدّل الشوفو-أو ديال 2017 (وسط سوق مونتريال)",
      smokeAlarms: "بدّل كاشف الدخان دالمشترك (وسط سوق مونتريال)",
    },
    extraListLead:
      "نفس الزيادات دالمخطط. حيّد العلامة باش تخطّى — المخطط كيتبع.",
    extraLaterHead: "من بعد 2050 (كيتجمعو فآخر عام)",
    extraInResult: "الأشغال الزايدة فجهة الخرج",
    extraTallyNone:
      "ما علّمتي حتى شغل زايد. القادّة كاتغطي غير لائحة 25 عام ديال الدراسة.",
    extraTallyOn: "الأشغال الزايدة اللي تزادو:",
    extraTallyFees:
      "السلايدر ديال الفلوس فالسنة ما كيتّحركوش. إلا الصندوق حمر، طلّع القادّة.",
    extraTallyResult: "النتيجة دابا:",
    marketTitle: "أسعار المقاولين فمونتريال (2026)",
    marketUsed: "المستعمل فالورشة",
    marketRange: "المجال المحلي",
    marketNote:
      "أوساط مجالات 2026 فالمنطقة، ماشي دوڤيز. الصمام 750–2 500 $ (الدال غالبا 1 200–2 500 $)؛ RénoPlex يقدر يعطي 90 $ ولا 600 $ تحت الدال. الكارد-كور ألومنيوم تقريبا 80–250 $ لكل قدم + التركيب. السطح 15–23 $ للقدم²؛ فاتورة 2023: 35 311 $. البلوك/الماصونية 240–480 $ للمتر². خدّاو 2 ولا 3 دوڤيز RBQ.",
    maintAvgTitle: "الأشغال الجايين — معدل الميزانية",
    maintEst: "تقدير",
    maintInStudy: "فدراسة الاحتياط",
    maintAvgLead:
      "العناصر المسعّرة فدراسة 25 عام عندها هاد المعدل. الطوارئ اللي ديجا فالدراسة كيبقاو بنفس الثمن. بلا ثمن: وسط سوق مونتريال لتحت، تقدر تحسبهم فالورشة.",
  },
};

function helpCopy() {
  return WORKSHOP_HELP[lang] || WORKSHOP_HELP.en;
}

const PLAN_NOW_IDS = [
  "drain",
  "foundationWall",
  "woodBalconies",
  "backflow",
  "guardRaise",
  "crackSeal",
  "balconyGutter",
];

function isExtraWork(id) {
  return EXTRA_WORK.some((item) => item.id === id);
}

const PLAN_I18N = {
  en: {
    tab: "Plan",
    title: "Renovation plan — when, and what you pay",
    h1: "Renovation plan",
    lede:
      "You pay a monthly condo fee every month. That money sits in a shared pot. The pot pays the contractor in the year of the repair — you do not pay the whole job in that month.",
    howTitle: "In 30 seconds",
    howSteps: [
      "Set the year of each repair (or Skip).",
      "Read your monthly fee. Same amount every month that year, from January 2027.",
      "The pot pays the contractor in the job year — you do not pay that invoice yourself.",
    ],
    otherTitle: "Other figures you will hear",
    otherBody:
      "Today’s reserve is $5,647 / year. Law 16’s proxy is $5,960. The May meeting aimed at $6,140 / year for 5 years. The study’s Proposed 1 (study jobs only, no extras) is about $338 / month for 4269 and 4271, $571 for 4267. A flat $11,500 / year also covers the study list if you refuse a 2% rise. None of those replace the monthly cards above.",
    customFee:
      "These monthlies follow the What if sliders. The mix on this page needs",
    useNeeded: "Use the fee this mix needs",
    payStart: "Start paying this in January 2027",
    payHow:
      "Same fee every month that year. It rises 2% each January so the pot can cover later jobs (especially brick in 2050).",
    scheduleTitle: "When the repair happens, and what you pay that year",
    colYear: "Year",
    colRepair: "Repairs paid from the pot",
    noRepair: "No repair — you still pay the monthly fee.",
    extraVs: "vs today",
    flatAlt: "If you refuse a yearly increase, you would need a flat",
    startYearNote: "First year of the new fee",
    pickTitle: "Set the year of each repair",
    recVsMix:
      "The monthly numbers above follow the years you pick below. This green box is the study’s default path if you keep the inspector years.",
    off: "Skip",
    yearLabel: "Year",
    resultTitle: "Your years — what you would pay",
    mixLead:
      "This block follows the years you pick below. The green recommendation above does not move.",
    mixEnd: "Balance in 2050",
    mixMin: "Lowest balance",
    mixGap: "First shortfall",
    mixOk: "Stays positive",
    growLabel: "If the reserve grows 2% / year",
    flatLabel: "If the reserve stays a flat dollar amount",
    today: "today",
    month: "/ month",
    yearPot: "Shared reserve / year",
    worksIn: "jobs in this mix",
    cannot: "Even $45,000 / year does not cover this mix. Skip or delay a big item.",
    loadWorkshop: "Open What if (sliders and charts)",
    reset: "Reset to inspector years",
    skipTitle: "Skipped (not in the pot)",
    footnote:
      "Moving a job later adds 3% / year. Skipped jobs are omitted — the building still ages. Get RBQ quotes before you vote a fee.",
    empty: "No job in this year.",
    recTitle: "The study’s recommendation",
    recLead:
      "Start the higher reserve in January 2027, before the moisture jobs. Do not wait until 2031, when today’s $5,647 / year first goes red.",
    recShape:
      "Recommended path (Proposed 1): $9,500 into the reserve in 2026, then +2% each year. That stays green through 2050.",
    recFees:
      "4269 and 4271: about $338 / month (today $250, +$88). 4267: about $571 / month (today $427, +$144). Together about $3,850 more per year.",
    recNot:
      "Today’s $5,647 and Law 16’s $5,960 are not enough. The May $6,140 / year target is a 5-year savings idea, not a 25-year plan. A flat $11,500 / year also works if you do not want a yearly increase.",
  },
  fr: {
    tab: "Plan",
    title: "Plan des travaux — quand, et combien",
    h1: "Plan des travaux",
    lede:
      "Vous payez des frais mensuels tous les mois. Cet argent va dans une cagnotte commune. La cagnotte paie l’entrepreneur l’année du chantier — vous ne payez pas tout le poste ce mois-là.",
    howTitle: "En 30 secondes",
    howSteps: [
      "Fixez l’année de chaque poste (ou Ignorer).",
      "Lisez votre frais mensuel. Le même montant chaque mois de l’année, dès janvier 2027.",
      "La cagnotte paie l’entrepreneur l’année du chantier — vous ne payez pas cette facture vous-même.",
    ],
    otherTitle: "Autres chiffres que vous entendrez",
    otherBody:
      "La prévoyance d’aujourd’hui est 5 647 $ / an. La loi 16 vise 5 960 $. L’assemblée de mai visait 6 140 $ / an sur 5 ans. Le proposé 1 de l’étude (postes de l’étude seulement) est environ 338 $ / mois pour 4269 et 4271, 571 $ pour 4267. 11 500 $ / an sans hausse couvre aussi la liste de l’étude. Rien de tout cela ne remplace les cartes mensuelles ci-dessus.",
    customFee:
      "Ces mensuels suivent les curseurs de « Et si ». Ce mélange a besoin de",
    useNeeded: "Utiliser le frais que ce mélange exige",
    payStart: "Commencer à payer ça en janvier 2027",
    payHow:
      "Le même frais chaque mois de l’année. Il monte de 2 % chaque janvier pour les postes plus tard (surtout la brique en 2050).",
    scheduleTitle: "Quand le chantier a lieu, et ce que vous payez cette année-là",
    colYear: "Année",
    colRepair: "Travaux payés par la cagnotte",
    noRepair: "Pas de chantier — vous payez quand même le mensuel.",
    extraVs: "vs aujourd’hui",
    flatAlt: "Sans hausse annuelle, il faudrait un montant fixe de",
    startYearNote: "Première année du nouveau frais",
    pickTitle: "Fixez l’année de chaque poste",
    recVsMix:
      "Les mensuels ci-dessus suivent les années choisies plus bas. Ce cadre vert est le chemin par défaut de l’étude si vous gardez les années de l’inspecteur.",
    off: "Ignorer",
    yearLabel: "Année",
    resultTitle: "Vos années — ce que vous paieriez",
    mixLead:
      "Ce bloc suit les années choisies plus bas. La recommandation verte ci-dessus ne bouge pas.",
    mixEnd: "Solde en 2050",
    mixMin: "Solde le plus bas",
    mixGap: "Premier déficit",
    mixOk: "Reste positif",
    growLabel: "Si la prévoyance monte de 2 % / an",
    flatLabel: "Si le montant annuel reste le même",
    today: "aujourd’hui",
    month: "/ mois",
    yearPot: "Prévoyance commune / an",
    worksIn: "postes dans ce mélange",
    cannot: "Même 45 000 $ / an ne couvrent pas ce mélange. Ignorez ou reportez un gros poste.",
    loadWorkshop: "Ouvrir Et si (curseurs et graphiques)",
    reset: "Revenir aux années de l’inspecteur",
    skipTitle: "Ignorés (hors cagnotte)",
    footnote:
      "Reporter un poste ajoute 3 % / an. Un poste ignoré n’est pas financé — l’immeuble vieillit quand même. Obtenir des soumissions RBQ avant de voter les frais.",
    empty: "Aucun poste cette année-là.",
    recTitle: "La recommandation de l’étude",
    recLead:
      "Montez la prévoyance dès janvier 2027, avant les travaux d’humidité. N’attendez pas 2031, quand les 5 647 $ / an d’aujourd’hui passent dans le rouge.",
    recShape:
      "Chemin recommandé (proposé 1) : 9 500 $ au fonds en 2026, puis +2 % / an. Reste positif jusqu’en 2050.",
    recFees:
      "4269 et 4271 : environ 338 $ / mois (aujourd’hui 250 $, +88 $). 4267 : environ 571 $ / mois (aujourd’hui 427 $, +144 $). Environ 3 850 $ de plus par an au total.",
    recNot:
      "Les 5 647 $ d’aujourd’hui et les 5 960 $ de la loi 16 ne suffisent pas. L’objectif de mai (6 140 $ / an) est une idée sur 5 ans, pas un plan 25 ans. 11 500 $ / an sans hausse fonctionne aussi.",
  },
  pt: {
    tab: "Plano",
    title: "Plano de obras — quando, e quanto pagam",
    h1: "Plano de obras",
    lede:
      "Pagam uma taxa mensal todos os meses. Esse dinheiro fica num pote comum. O pote paga o empreiteiro no ano da obra — não pagam a obra inteira nesse mês.",
    howTitle: "Em 30 segundos",
    howSteps: [
      "Marquem o ano de cada obra (ou Saltar).",
      "Leiam a taxa mensal. O mesmo valor em todos os meses desse ano, desde janeiro de 2027.",
      "O pote paga o empreiteiro no ano da obra — não pagam essa fatura vocês.",
    ],
    otherTitle: "Outros números que vão ouvir",
    otherBody:
      "A reserva de hoje é 5.647 $ / ano. A lei 16 aponta 5.960 $. A reunião de maio visava 6.140 $ / ano durante 5 anos. O proposto 1 do estudo (só obras do estudo) é cerca de 338 $ / mês para 4269 e 4271, 571 $ para 4267. 11.500 $ / ano sem aumento também cobre a lista do estudo. Nada disso substitui os cartões mensais acima.",
    customFee:
      "Estes mensais seguem os cursores de « E se ». Esta mistura precisa de",
    useNeeded: "Usar a taxa que esta mistura precisa",
    payStart: "Começar a pagar isto em janeiro de 2027",
    payHow:
      "A mesma taxa em todos os meses desse ano. Sobe 2% em cada janeiro para as obras mais tarde (sobretudo o tijolo em 2050).",
    scheduleTitle: "Quando a obra acontece, e o que pagam nesse ano",
    colYear: "Ano",
    colRepair: "Obras pagas pelo pote",
    noRepair: "Sem obra — continuam a pagar o mensal.",
    extraVs: "vs hoje",
    flatAlt: "Sem aumento anual, precisariam de um valor fixo de",
    startYearNote: "Primeiro ano da nova taxa",
    pickTitle: "Marquem o ano de cada obra",
    recVsMix:
      "Os mensais acima seguem os anos que escolherem abaixo. Esta caixa verde é o caminho por defeito do estudo se mantiverem os anos do inspetor.",
    off: "Saltar",
    yearLabel: "Ano",
    resultTitle: "Os vossos anos — o que pagariam",
    mixLead:
      "Este bloco segue os anos que escolherem abaixo. A recomendação verde acima não mexe.",
    mixEnd: "Saldo em 2050",
    mixMin: "Saldo mais baixo",
    mixGap: "Primeiro rombo",
    mixOk: "Fica positivo",
    growLabel: "Se a reserva crescer 2% / ano",
    flatLabel: "Se o valor anual ficar igual",
    today: "hoje",
    month: "/ mês",
    yearPot: "Reserva comum / ano",
    worksIn: "obras nesta mistura",
    cannot: "Nem 45.000 $ / ano cobrem esta mistura. Saltem ou atrasem uma obra grande.",
    loadWorkshop: "Abrir E se (cursores e gráficos)",
    reset: "Voltar aos anos do inspetor",
    skipTitle: "Saltadas (fora do pote)",
    footnote:
      "Atrasar uma obra soma 3% / ano. Obras saltadas não são financiadas — o prédio continua a envelhecer. Peçam orçamentos RBQ antes de votar a taxa.",
    empty: "Nenhuma obra neste ano.",
    recTitle: "A recomendação do estudo",
    recLead:
      "Subam a reserva em janeiro de 2027, antes das obras de humidade. Não esperem por 2031, quando os 5.647 $ / ano de hoje ficam no vermelho.",
    recShape:
      "Caminho recomendado (proposto 1): 9.500 $ no fundo em 2026, depois +2% / ano. Fica positivo até 2050.",
    recFees:
      "4269 e 4271: cerca de 338 $ / mês (hoje 250 $, +88 $). 4267: cerca de 571 $ / mês (hoje 427 $, +144 $). Cerca de 3.850 $ a mais por ano no total.",
    recNot:
      "Os 5.647 $ de hoje e os 5.960 $ da lei 16 não chegam. Os 6.140 $ / ano de maio são uma ideia a 5 anos, não um plano a 25. 11.500 $ / ano sem aumento também funciona.",
  },
  ary: {
    tab: "المخطط",
    title: "مخطط الإصلاح — إيمتى، وشنو تخلصو",
    h1: "مخطط الإصلاح",
    lede:
      "كاتخلصو شهري كل شهر. هاد الفلوس كيمشيو لقادّة مشتركة. القادّة كاتخلّص المقاول عام الخدمة — ما كاتخلصش الخدمة كاملة فداك الشهر.",
    howTitle: "فـ 30 ثانية",
    howSteps: [
      "حدّد العام ديال كل خدمة (ولا تخطّى).",
      "قرا الشهري ديالك. نفس المبلغ كل شهر فداك العام، من يناير 2027.",
      "القادّة كاتخلّص المقاول عام الخدمة — ما كاتخلصش نتا الفاتورة.",
    ],
    otherTitle: "أرقام خرا غادي تسمعو",
    otherBody:
      "الاحتياط دابا 5 647 $ فالسنة. القانون 16 كيهضر على 5 960 $. اجتماع ماي بغا 6 140 $ فالسنة لـ 5 سنين. المقترح 1 دالدراسة (غير أشغال الدراسة) تقريبا 338 $ فالشهر لـ 4269 و4271، و571 $ لـ 4267. 11 500 $ فالسنة بلا زيادة حتى هي كاتغطي ليستة الدراسة. حتى واحد ما كيعوّض الكارط الشهرية لفوق.",
    customFee:
      "هاد الشهري كيتبع سلايدر « واش لو ». هاد الخلطة خصّها",
    useNeeded: "ستعمل المصروف اللي هاد الخلطة خصّها",
    payStart: "بدا تخلّص هاد الشي من يناير 2027",
    payHow:
      "نفس الشهري كل شهر فداك العام. كيزيد 2% كل يناير باش يغطي الخدمات من بعد (خصوصا الابريك فـ 2050).",
    scheduleTitle: "إيمتى الخدمة، وشنو كاتخلص فداك العام",
    colYear: "العام",
    colRepair: "الخدمات اللي كاتخلصهم القادّة",
    noRepair: "ما كايناش خدمة — كاتخلص الشهري تا هو.",
    extraVs: "مقابل دابا",
    flatAlt: "بلا زيادة سنوية، خصّكم مبلغ ثابت",
    startYearNote: "أول عام دالمصاريف الجداد",
    pickTitle: "حدّد العام ديال كل خدمة",
    recVsMix:
      "الأرقام الشهرية لفوق كيتبعو السنين لتحت. الصندوق الأخضر هو طريق الدراسة إلا بقيتو بسنين الإنسپكتور.",
    off: "تخطّى",
    yearLabel: "العام",
    resultTitle: "السنين ديالكم — شنو غادي تخلصو",
    mixLead:
      "هاد الصندوق كيتبع السنين لتحت. التوصية الخضرا لفوق ما كاتتحركش.",
    mixEnd: "الرصيد فـ 2050",
    mixMin: "أقل رصيد",
    mixGap: "أول نقص",
    mixOk: "كيبقا إيجابي",
    growLabel: "إلا الاحتياط طلع 2% فالسنة",
    flatLabel: "إلا المبلغ السنوي بقا بحالو",
    today: "دابا",
    month: "/ شهر",
    yearPot: "الاحتياط المشترك / عام",
    worksIn: "خدمات فهاد الخلطة",
    cannot: "حتى 45 000 $ فالسنة ما يكفيوش. تخطّاو ولا أخّرو خدمة كبيرة.",
    loadWorkshop: "حلّ واش لو (سلايدر ورسوم)",
    reset: "رجع لسنين الإنسپكتور",
    skipTitle: "متخطّيين (برا القادّة)",
    footnote:
      "إلا أخّرتي الخدمة كاتزيد 3% فالسنة. المتخطّاة ما ممولةش — العمارة كتكبر فالعمر. خدّاو دوڤيز RBQ قبل ما تصوّتو على المصاريف.",
    empty: "حتى خدمة فهاد العام.",
    recTitle: "توصية الدراسة",
    recLead:
      "طلعو الاحتياط من يناير 2027، قبل أشغال الرطوبة. ما تستناوش 2031، منين 5 647 $ دابا كيحمر.",
    recShape:
      "الطريق الموصى بيه (المقترح 1): 9 500 $ للصندوق فـ 2026، من بعد +2% فالسنة. كيبقا خضر حتى 2050.",
    recFees:
      "4269 و4271: تقريبا 338 $ فالشهر (دابا 250 $، +88 $). 4267: تقريبا 571 $ فالشهر (دابا 427 $، +144 $). زيادة تقريبا 3 850 $ فالسنة مجموعين.",
    recNot:
      "5 647 $ دابا و5 960 $ دالقانون 16 ما يكفيوش. 6 140 $ دماي فكرة د 5 سنين، ماشي مخطط 25 عام. 11 500 $ فالسنة بلا زيادة حتى هي كتصلح.",
  },
};

function planCopy() {
  return PLAN_I18N[lang] || PLAN_I18N.en;
}

const SITE_I18N = {
  en: {
    navPlan: "Plan",
    navInspection: "Inspection",
    navFund: "What if",
    navMaint: "Maintenance",
    navAssembly: "Assembly",
    inspectHint:
      "This page is what the inspector saw. What you pay each month is on Plan.",
    assemblyNote:
      "The May target ($6,140 / year, about $30,700 in 5 years) is a short savings idea. It is not the 25-year monthly fee. Use Plan for that.",
  },
  fr: {
    navPlan: "Plan",
    navInspection: "Inspection",
    navFund: "Et si",
    navMaint: "Entretien",
    navAssembly: "Assemblée",
    inspectHint:
      "Cette page, c’est ce que l’inspecteur a vu. Ce que vous payez chaque mois est dans Plan.",
    assemblyNote:
      "L’objectif de mai (6 140 $ / an, environ 30 700 $ en 5 ans) est une idée d’épargne courte. Ce n’est pas le frais mensuel sur 25 ans. Voyez Plan pour ça.",
  },
  pt: {
    navPlan: "Plano",
    navInspection: "Inspeção",
    navFund: "E se",
    navMaint: "Manutenção",
    navAssembly: "Assembleia",
    inspectHint:
      "Esta página é o que o inspetor viu. O que pagam por mês está no Plano.",
    assemblyNote:
      "A meta de maio (6.140 $ / ano, cerca de 30.700 $ em 5 anos) é uma ideia de poupança curta. Não é a taxa mensal a 25 anos. Usem o Plano para isso.",
  },
  ary: {
    navPlan: "المخطط",
    navInspection: "الإنسپكسيون",
    navFund: "واش لو",
    navMaint: "الصيانة",
    navAssembly: "الجمعية",
    inspectHint:
      "هاد الصفحة هي اللي شاف الإنسپكتور. شنو كاتخلص كل شهر كاين فالمخطط.",
    assemblyNote:
      "هدف ماي (6 140 $ فالسنة، تقريبا 30 700 $ ف 5 سنين) فكرة دالتوفير قصيرة. ماشي الشهري د 25 عام. شوف المخطط.",
  },
};

function siteCopy() {
  return SITE_I18N[lang] || SITE_I18N.en;
}

function defaultPlanYear(work) {
  if (PLAN_NOW_IDS.includes(work.id)) {
    return isExtraWork(work.id) ? 2027 : 2028;
  }
  if (isExtraWork(work.id)) return work.kind === "near" ? 2031 : 2050;
  return work.year || FUND.startYear;
}

function defaultPlanAssignments() {
  const assign = {};
  const add = (work) => {
    if (work) assign[work.id] = defaultPlanYear(work);
  };
  (FUND.works || []).forEach(add);
  EXTRA_WORK.forEach(add);
  return assign;
}

const PLAN_STORE = "syndicat-ontario-plan-v2";

function migratePlanValue(id, value) {
  if (value === "off") return "off";
  const year = Number(value);
  if (Number.isFinite(year) && year >= 1900 && year <= 2100) return Math.round(year);
  const work = findWork(id);
  if (value === "now") return work && isExtraWork(id) ? 2027 : 2028;
  if (value === "next") return 2031;
  if (value === "later") return work ? defaultPlanYear(work) : 2050;
  return work ? defaultPlanYear(work) : "off";
}

function loadPlanAssignments() {
  const base = defaultPlanAssignments();
  try {
    const raw =
      JSON.parse(localStorage.getItem(PLAN_STORE) || "null") ||
      JSON.parse(localStorage.getItem("syndicat-ontario-plan-v1") || "null");
    if (!raw || typeof raw !== "object") return base;
    const next = { ...base };
    Object.keys(raw).forEach((id) => {
      next[id] = migratePlanValue(id, raw[id]);
    });
    return next;
  } catch (err) {
    return base;
  }
}

function persistPlanAssignments(assignments) {
  localStorage.setItem(PLAN_STORE, JSON.stringify(assignments));
}

let planAssignments = null;

function planState() {
  if (!planAssignments) planAssignments = loadPlanAssignments();
  return planAssignments;
}

function planJobCatalog() {
  const seen = new Set();
  const list = [];
  const push = (work) => {
    if (!work || seen.has(work.id)) return;
    seen.add(work.id);
    list.push(work);
  };
  PLAN_NOW_IDS.forEach((id) => push(findWork(id)));
  (FUND.works || []).forEach(push);
  EXTRA_WORK.forEach(push);
  return list;
}

function planLastYear() {
  return FUND.startYear + FUND.expenses.length - 1;
}

function planTargetYear(work, assignment) {
  if (assignment === "off" || assignment == null) return null;
  const year = Number(assignment);
  if (!Number.isFinite(year)) return migratePlanValue(work.id, assignment);
  return Math.min(planLastYear(), Math.max(FUND.startYear, Math.round(year)));
}

function assignmentsKey(assignments) {
  return planJobCatalog()
    .map((work) => `${work.id}:${assignments[work.id] ?? "off"}`)
    .join("|");
}

function planMix(assignments) {
  const assign = assignments || planState();
  const included = planJobCatalog().filter(
    (work) => assign[work.id] && assign[work.id] !== "off"
  );
  const studyWorks = included.filter((work) => !isExtraWork(work.id));
  const extras = included.filter((work) => isExtraWork(work.id));
  const shifts = {};
  included.forEach((work) => {
    const year = planTargetYear(work, assign[work.id]);
    if (year == null) return;
    shifts[work.id] = year - work.year;
  });
  return { included, studyWorks, extras, shifts, key: assignmentsKey(assign) };
}

function studyOnlyAssignments() {
  const assign = {};
  (FUND.works || []).forEach((work) => {
    assign[work.id] = work.year;
  });
  EXTRA_WORK.forEach((work) => {
    assign[work.id] = "off";
  });
  return assign;
}

function writePlanFromWorkshopYears() {
  const assign = { ...defaultPlanAssignments() };
  (FUND.works || []).forEach((work) => {
    assign[work.id] = work.year + Number((workshop.shifts || {})[work.id] || 0);
  });
  EXTRA_WORK.forEach((work) => {
    assign[work.id] =
      workshop.extras && workshop.extras[work.id]
        ? work.year + Number((workshop.shifts || {})[work.id] || 0)
        : "off";
  });
  planAssignments = assign;
  persistPlanAssignments(assign);
  workshop.planKey = assignmentsKey(assign);
}

function syncWorkshopToPlanYears(pushFee) {
  const assign = planState();
  const mix = planMix(assign);
  workshop.shifts = { ...mix.shifts };
  if (!workshop.extras) workshop.extras = defaultExtras();
  EXTRA_WORK.forEach((work) => {
    workshop.extras[work.id] = Boolean(
      assign[work.id] && assign[work.id] !== "off"
    );
  });
  if (pushFee) {
    const solved = planSolve(assign);
    if (solved.grow.sim.ok && !solved.grow.capped) {
      workshop.annual = solved.grow.annual;
      workshop.increase = 0.02;
    }
    workshop.usePhase2 = false;
    workshop.specialAmount = 0;
    workshop.loadedStudy = "";
    workshop.planKey = mix.key;
  }
  persistWorkshop();
  return mix;
}

function ensurePlanFeeSynced() {
  const key = assignmentsKey(planState());
  if (workshop.planKey !== key) syncWorkshopToPlanYears(true);
  else syncWorkshopToPlanYears(false);
}

function planSolve(assignments) {
  const mix = planMix(assignments);
  const base = {
    startBalance: FUND.startBalance,
    interest: FUND.interest,
    specialYear: 0,
    specialAmount: 0,
    usePhase2: false,
    phaseYears: 25,
    annual2: FUND.law16Contribution,
    increase2: FUND.inflation,
    shifts: mix.shifts,
    extraList: mix.extras,
    workList: mix.studyWorks,
  };
  const search = (increase) => {
    let lo = 500;
    let hi = 45000;
    let best = null;
    while (lo <= hi) {
      const mid = Math.round((lo + hi) / 2 / 50) * 50;
      const sim = projectFund({ ...base, annual: mid, increase });
      if (sim.ok) {
        best = { annual: mid, increase, sim };
        hi = mid - 50;
      } else lo = mid + 50;
    }
    if (!best) {
      const sim = projectFund({ ...base, annual: 45000, increase });
      return { annual: 45000, increase, sim, capped: !sim.ok };
    }
    return best;
  };
  return { flat: search(0), grow: search(0.02), included: mix.included, shifts: mix.shifts };
}

function verdictHtml(sim) {
  const f = FUND_I18N[lang];
  const h = helpCopy();
  const headline = sim.ok
    ? h.resultOkLong
    : `${h.resultBadLong} ${sim.firstGap}.`;
  const hint = sim.ok ? h.resultHintOk : h.resultHintBad;
  const extraSpend = extraSpendTotal();
  const extraLine =
    extraSpend > 0
      ? `<p class="verdict-nums">${esc(h.extraInResult)} ${money(extraSpend)}.</p>`
      : "";
  return `<strong>${esc(headline)} ${tip("result", h.tips.result)}</strong>
    <p class="verdict-nums">${esc(f.endBalance)}: ${money(sim.end)}. ${esc(
      f.minBalance
    )}: ${money(sim.minBalance)}. ${esc(f.totalPaid)}: ${money(
      sim.totalContrib
    )}.</p>
    ${extraLine}
    <p class="lede">${esc(hint)}</p>`;
}

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
  if (
    next === "fund" ||
    next === "maint" ||
    next === "assembly" ||
    next === "inspection"
  )
    return next;
  return "plan";
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
    loadedStudy: "",
    extras: defaultExtras(),
    planKey: "",
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
      extras: normalizeExtras(raw),
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
  const mix = planMix(planState());
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
    shifts: mix.shifts,
    extraList: mix.extras,
    workList: mix.studyWorks,
  };
}

function applyStudyPath(item) {
  planAssignments = studyOnlyAssignments();
  persistPlanAssignments(planAssignments);
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
  workshop.extras = defaultExtras();
  EXTRA_WORK.forEach((work) => {
    workshop.extras[work.id] = false;
  });
  workshop.loadedStudy = item.id;
  workshop.planKey = assignmentsKey(planAssignments);
  persistWorkshop();
}

function revealPathChange() {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ["annual-val", "increase-val", "unit-break", "sim-result", "path-loaded"].forEach(
        (id) => {
          const el = document.getElementById(id);
          if (!el) return;
          el.classList.remove("just-changed");
          void el.offsetWidth;
          el.classList.add("just-changed");
        }
      );
      const result = document.getElementById("sim-result");
      const annual = document.getElementById("annual");
      const target = result || annual || document.getElementById("workshop");
      if (result) {
        result.tabIndex = -1;
        result.focus({ preventScroll: true });
      } else if (annual) {
        annual.focus({ preventScroll: true });
      }
      if (target) target.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
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

function unitBreakHead() {
  const h = helpCopy();
  return `
    <th>${esc(h.unit)}</th>
    <th>${esc(h.share)}</th>
    <th>${esc(h.reserveYear)}</th>
    <th>${esc(h.reserveMonth)}</th>
    ${
      workshop.usePhase2
        ? `<th>${esc(h.thenYear)}</th><th>${esc(h.thenMonth)}</th>`
        : ""
    }
    <th>${esc(h.specialOnce)}</th>
    <th>${esc(h.newFee)}</th>
  `;
}

function unitBreakBody(annual) {
  const special = Number(workshop.specialAmount) || 0;
  return portionFees(annual)
    .map((row) => {
      const thenYear = (Number(workshop.annual2) || 0) * row.share;
      return `
        <tr>
          <td>${esc(row.name)}</td>
          <td>${pct(row.share)}</td>
          <td>${money2(row.reserveNew * 12)}</td>
          <td>${money2(row.reserveNew)}</td>
          ${
            workshop.usePhase2
              ? `<td>${money2(thenYear)}</td><td>${money2(thenYear / 12)}</td>`
              : ""
          }
          <td>${special ? money2(special * row.share) : "—"}</td>
          <td>${money2(row.monthlyNew)}</td>
        </tr>
      `;
    })
    .join("");
}

function unitBreakTable(annual) {
  if (!FUND.portions) return "";
  const h = helpCopy();
  return `
    <div class="unit-break" id="unit-break">
      <div class="chart-label">${esc(h.payCaption || h.unitBreak)}</div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr id="unit-break-head">${unitBreakHead()}</tr>
          </thead>
          <tbody id="unit-break-body">${unitBreakBody(annual)}</tbody>
        </table>
      </div>
    </div>
  `;
}

function unitStatCards() {
  if (!FUND.portions) return "";
  const h = helpCopy();
  return `
    <section class="stats unit-stats">
      ${portionFees(FUND.currentContribution)
        .map(
          (row) => `
            <div class="stat">
              <b>${esc(row.name)}</b>
              <span>${pct(row.share)} · ${money2(row.reserveNow)} ${esc(
                h.reserveNow
              )}</span>
            </div>
          `
        )
        .join("")}
    </section>
  `;
}

function feeTable(annual) {
  const f = FUND_I18N[lang];
  const h = helpCopy();
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
    <h2>${labelLine(f.feeTitle, "fee", h.tips.fee)}</h2>
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
  if (tab === "plan") url.searchParams.delete("tab");
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

function tip(id, text, end) {
  const h = helpCopy();
  if (!text) return "";
  return `<span class="tip${end ? " tip-end" : ""}">
    <button type="button" class="tip-btn" aria-label="${esc(
      h.tipLabel
    )}" aria-describedby="tip-${esc(id)}">?</button>
    <span id="tip-${esc(id)}" class="tip-pop" role="tooltip">${esc(text)}</span>
  </span>`;
}

function labelLine(text, tipId, tipText, end) {
  return `<span class="label-row">${esc(text)}${tip(tipId, tipText, end)}</span>`;
}

function pathPickButtons() {
  const f = FUND_I18N[lang];
  return (FUND.scenarios || [])
    .map((item) => {
      const meta = f.scenarioMeta[item.id];
      if (!meta) return "";
      const on = workshop.loadedStudy === item.id;
      return `<button type="button" class="action${
        on ? "" : " ghost"
      }" data-apply="${esc(item.id)}" aria-pressed="${on}">${esc(meta.name)}</button>`;
    })
    .join("");
}

function civicNums() {
  return lang === "ary" ? "4267، 4269، 4271" : "4267, 4269, 4271";
}

function withCivic(text) {
  return String(text || "").replaceAll("4267-4271", civicNums());
}

function chrome(inner) {
  const t = I18N[lang];
  const nav = siteCopy();
  return `
    <div class="wrap ${tab === "fund" || tab === "plan" ? "fund-page" : ""} ${
      tab === "plan" ? "plan-page" : ""
    }">
      <header class="topbar">
        <div class="titles">
          <p class="site-title">${esc(withCivic(t.tabTitle))}</p>
          <p class="brand">${esc(t.brand)}</p>
        </div>
        <div class="toolbar">
          <nav class="tabs" role="tablist" aria-label="${esc(withCivic(t.tabTitle))}">
            <button type="button" role="tab" data-tab="plan" title="${esc(
              nav.navPlan
            )}" aria-selected="${tab === "plan"}">${esc(nav.navPlan)}</button>
            <button type="button" role="tab" data-tab="inspection" title="${esc(
              nav.navInspection
            )}" aria-selected="${tab === "inspection"}">${esc(
              nav.navInspection
            )}</button>
            <button type="button" role="tab" data-tab="fund" title="${esc(
              nav.navFund
            )}" aria-selected="${tab === "fund"}">${esc(nav.navFund)}</button>
            <button type="button" role="tab" data-tab="maint" title="${esc(
              nav.navMaint
            )}" aria-selected="${tab === "maint"}">${esc(nav.navMaint)}</button>
            <button type="button" role="tab" data-tab="assembly" title="${esc(
              nav.navAssembly
            )}" aria-selected="${tab === "assembly"}">${esc(
              nav.navAssembly
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
      <main id="main" class="${
        tab === "fund" || tab === "plan" ? "fund-stack" : ""
      }">${inner}</main>
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
  document.title = withCivic(t.title);
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
        <h1>${esc(withCivic(t.h1))}</h1>
        <p class="lede">${esc(t.lede)}</p>
        <aside class="callout">${esc(siteCopy().inspectHint)}</aside>
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
  const h = helpCopy();
  ensurePlanFeeSynced();
  document.title = withCivic(f.title);
  const sim = projectFund(workshopOpts());
  const spendMax = Math.max(1, ...sim.expenses);
  const balanceMax = Math.max(
    spendMax,
    ...sim.rows.map((row) => Math.abs(row.balance))
  );
  const lastYear = FUND.startYear + FUND.expenses.length - 1;

  const workRows = planMix(planState())
    .included
    .map((work) => {
      const year = workYear(work);
      const dropped = year > lastYear;
      const name = workLabel(work.id);
      return `
        <tr>
          <td>
            <input class="year-input" data-shift="${esc(work.id)}" type="number" min="${FUND.startYear}" max="2075" value="${year}" />
            <div class="hint" data-dropped="${esc(work.id)}" ${dropped ? "" : "hidden"}>${esc(f.dropped)}</div>
          </td>
          <td>${esc(name)}${
            work.linked
              ? ` <span class="pill now">${esc(f.linked)}</span>`
              : ""
          }${
            work.est
              ? ` <span class="pill info">${esc(h.maintEst)}</span>`
              : ""
          }</td>
          <td>${work.remaining} ${esc(f.yearsLeft)}</td>
          <td>${work.avg} ${esc(f.avgLife)}</td>
          <td data-work-cost="${esc(work.id)}">${workCostHtml(work)}</td>
        </tr>
      `;
    })
    .join("");

  const outsideRows = (FUND.outsideHorizon || [])
    .map((item) => {
      const extra = EXTRA_WORK.find((work) => work.id === item.id);
      const cost = extra
        ? `${money(extra.cost)} <span class="pill info">${esc(h.maintEst)}</span>`
        : "—";
      return `
        <tr>
          <td>—</td>
          <td>${esc(workLabel(item.id))}</td>
          <td>${item.remaining} ${esc(f.yearsLeft)}</td>
          <td>${item.avg} ${esc(f.avgLife)}</td>
          <td>${cost}</td>
        </tr>
      `;
    })
    .join("");

  const scenarioCards = FUND.scenarios
    .map((item) => {
      const meta = f.scenarioMeta[item.id];
      return `
        <article class="card pick${workshop.loadedStudy === item.id ? " active" : ""}" data-path="${esc(item.id)}">
          <div class="meta">
            <span class="pill ${item.ok ? "ok" : "now"}">${
              item.ok ? "OK" : "—"
            }</span>
          </div>
          <h3>${esc(meta.name)}</h3>
          <p>${esc(meta.detail)}</p>
          <div class="sim-actions">
            <button type="button" class="action" data-apply="${esc(item.id)}">${esc(
              f.applyStudy
            )}</button>
          </div>
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
        <h1>${esc(withCivic(f.h1))}</h1>
        <p class="lede">${esc(h.fundLead)}</p>
        <section class="stats">
          ${f.stats
            .map(
              (stat) =>
                `<div class="stat"><b>${esc(stat.value)}</b><span>${esc(
                  stat.label
                )}</span></div>`
            )
            .join("")}
          <div class="stat">
            <b>${money(studyWorkStats().avg)}</b>
            <span>${esc(h.avgWork)}</span>
          </div>
        </section>
        <aside class="callout">
          <strong>${esc(f.calloutTitle)}</strong>
          ${esc(f.callout)}
        </aside>
        <p class="lede">${esc(f.perUnitNow)}</p>
        ${unitStatCards()}
        <h2>${esc(h.guideTitle)}</h2>
        <p class="lede">${esc(h.guideBody)}</p>
        <aside class="how-box">
          <strong>${esc(h.howTitle)}</strong>
          <ol>
            ${h.howSteps.map((step) => `<li>${esc(step)}</li>`).join("")}
          </ol>
        </aside>
        <article class="card sim" id="workshop">
          <div class="workshop-step">
            <h3>${esc(h.stepStart)}</h3>
            <p class="lede">${esc(h.stepStartLead)}</p>
            <div class="path-picks">
              <div class="path-picks-row" id="path-picks">${pathPickButtons()}</div>
              <p class="path-loaded" id="path-loaded" ${
                workshop.loadedStudy ? "" : "hidden"
              }>${esc(h.loadedNote)}</p>
            </div>
          </div>
          <div class="workshop-step">
            <h3>${esc(h.stepVerdict)}</h3>
            <aside id="sim-result" class="callout ${sim.ok ? "ok" : ""}" tabindex="-1">
              ${verdictHtml(sim)}
            </aside>
            ${unitBreakTable(workshop.annual)}
          </div>
          <div class="workshop-step">
            <h3>${esc(h.stepPay)}</h3>
            <p class="lede">${esc(h.stepPayLead)}</p>
            <div class="sim-grid">
              <label>
                ${labelLine(f.annualLabel, "annual", h.tips.annual)}
                <strong id="annual-val">${money(workshop.annual)}</strong>
                <input id="annual" type="range" min="500" max="25000" step="50" value="${workshop.annual}" />
              </label>
              <label>
                ${labelLine(f.increaseLabel, "increase", h.tips.increase, true)}
                <strong id="increase-val">${pct(workshop.increase)}</strong>
                <input id="increase" type="range" min="0" max="8" step="0.5" value="${
                  workshop.increase * 100
                }" />
              </label>
            </div>
            <div class="sim-actions">
              <button type="button" class="action" data-reset="true">${esc(f.resetStudy)}</button>
              ${tip("reset", h.tips.reset)}
            </div>
          </div>
          <details class="more-box">
            <summary>${esc(h.moreTitle)}</summary>
            <p class="lede">${esc(h.moreLead)}</p>
            ${extraCheckList()}
            <div class="sim-grid">
              <label>
                ${labelLine(f.startBalance, "start", h.tips.start)}
                <input id="start-balance" type="number" min="0" step="100" value="${workshop.startBalance}" />
              </label>
              <label>
                ${labelLine(f.interestLabel, "interest", h.tips.interest, true)}
                <strong id="interest-val">${pct(workshop.interestPct / 100)}</strong>
                <input id="interest" type="range" min="0" max="5" step="0.1" value="${workshop.interestPct}" />
              </label>
              <label>
                ${labelLine(f.specialYear, "specialYear", h.tips.specialYear)}
                <input id="special-year" type="number" min="${FUND.startYear}" max="${lastYear}" value="${workshop.specialYear}" />
              </label>
              <label>
                ${labelLine(f.specialAmount, "specialAmount", h.tips.specialAmount, true)}
                <input id="special-amount" type="number" min="0" step="100" value="${workshop.specialAmount}" />
              </label>
            </div>
            <label class="check">
              <input id="use-phase2" type="checkbox" ${workshop.usePhase2 ? "checked" : ""} />
              ${esc(f.phase2)}
              ${tip("phase2", h.tips.phase2)}
            </label>
            <div class="sim-grid" id="phase2-fields" ${workshop.usePhase2 ? "" : "hidden"}>
              <label>
                ${labelLine(f.phaseYears, "phaseYears", h.tips.phaseYears)}
                <input id="phase-years" type="number" min="1" max="24" value="${workshop.phaseYears}" />
              </label>
              <label>
                ${labelLine(f.annualAfter, "annual2", h.tips.annual2, true)}
                <input id="annual2" type="number" min="0" step="50" value="${workshop.annual2}" />
              </label>
              <label>
                ${labelLine(f.increaseAfter, "increase2", h.tips.increase2)}
                <strong id="increase2-val">${pct(workshop.increase2)}</strong>
                <input id="increase2" type="range" min="0" max="8" step="0.5" value="${
                  workshop.increase2 * 100
                }" />
              </label>
            </div>
            ${feeTable(workshop.annual)}
            <label>
              ${labelLine(f.saveName, "save", h.tips.save)}
              <input id="save-label" type="text" maxlength="80" value="${esc(workshop.saveLabel)}" />
            </label>
            <div class="sim-actions">
              <button type="button" class="action" data-save="true">${esc(f.saveBtn)}</button>
            </div>
            <h3>${labelLine(f.savedTitle, "saved", h.tips.saved)}</h3>
            ${savedBlock}
          </details>
          <div class="chart-block">
            <div class="chart-label">${esc(h.chartsTitle)}</div>
            <div class="chart-label">${esc(f.chartSpend)}</div>
            <div id="chart-spend" class="chart">${chartBars(
              sim.expenses,
              spendMax,
              "spend"
            )}</div>
          </div>
          <div class="chart-block">
            <div class="chart-label">${esc(f.chartBalance)}</div>
            <div id="chart-balance" class="chart">${chartBars(
              sim.rows.map((row) => row.balance),
              balanceMax,
              "bal"
            )}</div>
          </div>
          <details class="fold-box">
            <summary>${labelLine(h.yearsTitle, "yearTable", h.tips.yearTable)}</summary>
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
          </details>
        </article>
        <h2>${esc(h.shiftWrapTitle)}</h2>
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
        <details class="fold-box">
          <summary>${esc(h.studyPrinted)}</summary>
          <p class="lede">${esc(h.studyPrintedLead)}</p>
          <div class="cards">${scenarioCards}</div>
          <h3>${esc(f.outsideTitle)}</h3>
          <div class="table-wrap">
            <table>
              <thead>
                <tr>${f.workHeaders.map((header) => `<th>${esc(header)}</th>`).join("")}</tr>
              </thead>
              <tbody>${outsideRows}</tbody>
            </table>
          </div>
          ${marketTable()}
        </details>
        <section class="footnote">
          <h3>${esc(f.limits)}</h3>
          <p>${esc(f.limitsBody)}</p>
        </section>
  `);
  bindChrome();
  bindSim();
}

function closeTips() {
  document.querySelectorAll(".tip-pop.is-open").forEach((pop) => {
    pop.classList.remove("is-open");
    pop.style.left = "";
    pop.style.top = "";
  });
}

function placeTip(button) {
  const wrap = button && button.closest(".tip");
  const pop = wrap && wrap.querySelector(".tip-pop");
  if (!pop) return;
  closeTips();
  pop.classList.add("is-open");
  const gap = 10;
  const rect = button.getBoundingClientRect();
  const width = pop.offsetWidth;
  const height = pop.offsetHeight;
  let left = rect.left + rect.width / 2 - width / 2;
  left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
  let top = rect.top - height - gap;
  if (top < 12) top = Math.min(rect.bottom + gap, window.innerHeight - height - 12);
  pop.style.left = `${Math.round(left)}px`;
  pop.style.top = `${Math.round(top)}px`;
}

function wireTips(root) {
  if (!root) return;
  if (!window.__fundTipWindow) {
    window.__fundTipWindow = true;
    window.addEventListener("scroll", closeTips, true);
    window.addEventListener("resize", closeTips);
  }
  root.querySelectorAll(".tip").forEach((wrap) => {
    if (wrap.dataset.wired === "true") return;
    wrap.dataset.wired = "true";
    const button = wrap.querySelector(".tip-btn");
    if (!button) return;
    wrap.addEventListener("mouseenter", () => placeTip(button));
    wrap.addEventListener("mouseleave", closeTips);
    wrap.addEventListener("focusin", () => placeTip(button));
    wrap.addEventListener("focusout", closeTips);
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      const pop = wrap.querySelector(".tip-pop");
      if (pop && pop.classList.contains("is-open")) closeTips();
      else placeTip(button);
    });
  });
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
    const unitHead = document.getElementById("unit-break-head");
    const unitBody = document.getElementById("unit-break-body");
    if (unitHead) unitHead.innerHTML = unitBreakHead();
    if (unitBody) unitBody.innerHTML = unitBreakBody(workshop.annual);
    const result = document.getElementById("sim-result");
    if (result) {
      result.className = `callout ${sim.ok ? "ok" : ""}`;
      result.innerHTML = verdictHtml(sim);
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
    document.querySelectorAll("#path-picks [data-apply]").forEach((button) => {
      const on = workshop.loadedStudy === button.dataset.apply;
      button.setAttribute("aria-pressed", String(on));
      button.classList.toggle("ghost", !on);
    });
    const loadedNote = document.getElementById("path-loaded");
    if (loadedNote) loadedNote.hidden = !workshop.loadedStudy;
    document.querySelectorAll(".card.pick[data-path]").forEach((card) => {
      card.classList.toggle("active", card.dataset.path === workshop.loadedStudy);
    });
    const extraTally = document.getElementById("extra-tally");
    if (extraTally) {
      const wrap = document.createElement("div");
      wrap.innerHTML = extraTallyHtml(sim);
      extraTally.replaceWith(wrap.firstElementChild);
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
    const resultBox = document.getElementById("sim-result");
    if (resultBox) wireTips(resultBox);
    paintWorkShifts();
  };

  const live = () => {
    if (workshop.loadedStudy) workshop.loadedStudy = "";
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
  wireTips(document.getElementById("app"));
  const usePhase2 = document.getElementById("use-phase2");
  if (usePhase2) {
    usePhase2.addEventListener("change", () => {
      readFields();
      render();
    });
  }
  document.querySelectorAll("[data-extra]").forEach((input) => {
    input.addEventListener("change", () => {
      const work = findWork(input.dataset.extra);
      const assignments = planState();
      assignments[input.dataset.extra] = input.checked
        ? defaultPlanYear(work)
        : "off";
      persistPlanAssignments(assignments);
      if (workshop.loadedStudy) workshop.loadedStudy = "";
      syncWorkshopToPlanYears(true);
      render();
    });
  });
  document.querySelectorAll("[data-shift]").forEach((input) => {
    const onYear = () => {
      if (!applyYearShift(input)) return;
      if (workshop.loadedStudy) workshop.loadedStudy = "";
      syncWorkshopToPlanYears(true);
      paint();
    };
    input.addEventListener("input", onYear);
    input.addEventListener("change", onYear);
  });
  document.querySelectorAll("[data-apply]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      const item = FUND.scenarios.find((row) => row.id === button.dataset.apply);
      if (!item) return;
      applyStudyPath(item);
      render();
      revealPathChange();
    });
  });
  document.querySelectorAll("[data-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      const saved = workshop.saved;
      planAssignments = studyOnlyAssignments();
      persistPlanAssignments(planAssignments);
      workshop = defaultWorkshop();
      workshop.saved = saved;
      workshop.planKey = assignmentsKey(planAssignments);
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
          extras: { ...workshop.extras },
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
      workshop.extras = normalizeExtras(item.state);
      workshop.loadedStudy = "";
      writePlanFromWorkshopYears();
      persistWorkshop();
      render();
      revealPathChange();
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
  const h = helpCopy();
  document.title = withCivic(m.title);
  const urgentCosts = {
    wall: { cost: 24258, study: true },
    drain: { cost: 19468, study: true },
    ceiling: { cost: 14037, study: true },
    backflow: { cost: 1800, study: false, extraId: "backflow" },
    guard: { cost: 7500, study: false, extraId: "guardRaise" },
  };
  const study = studyWorkStats();
  const urgentPriced = MAINT.urgent
    .map((item) => urgentCosts[item.id])
    .filter((item) => item && item.cost);
  const urgentTotal = urgentPriced.reduce((sum, item) => sum + item.cost, 0);
  const urgentAvg = urgentPriced.length ? urgentTotal / urgentPriced.length : 0;
  const urgent = MAINT.urgent
    .map((item) => {
      const price = urgentCosts[item.id];
      return `
        <article class="card">
          <div class="meta"><span class="pill now">${esc(t.filterNow)}</span></div>
          <p>${esc(m.urgent[item.id])}</p>
          ${
            price
              ? `<p class="lede">${money(price.cost)} · ${esc(
                  price.study ? h.maintInStudy : h.maintEst
                )}${
                  price.extraId
                    ? ` · ${esc(h.marketRange)} ${esc(
                        marketRange(
                          EXTRA_WORK.find((work) => work.id === price.extraId) ||
                            {}
                        )
                      )}`
                    : ""
                }</p>`
              : ""
          }
        </article>
      `;
    })
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
      const name = workLabel(item.id);
      const extra = EXTRA_WORK.find((work) => work.id === item.id);
      const cost =
        item.cost != null
          ? money(item.cost)
          : extra
            ? `${money(extra.cost)} <span class="pill info">${esc(h.maintEst)}</span>`
            : esc(m.afterWindow);
      return `<tr><td>${esc(name)}</td><td>${cost}</td></tr>`;
    })
    .join("");
  document.getElementById("app").innerHTML = chrome(`
        <h1>${esc(withCivic(m.h1))}</h1>
        <p class="lede">${esc(m.lede)}</p>
        <aside class="callout">
          <strong>${esc(m.calloutTitle)}</strong>
          ${esc(m.callout)}
        </aside>
        <h2>${esc(h.maintAvgTitle)}</h2>
        <p class="lede">${esc(h.maintAvgLead)}</p>
        <section class="stats unit-stats">
          <div class="stat">
            <b>${money(study.avg)}</b>
            <span>${esc(h.avgWork)}</span>
          </div>
          <div class="stat">
            <b>${money(urgentAvg)}</b>
            <span>${esc(m.urgentTitle)}</span>
          </div>
          <div class="stat">
            <b>${money(urgentTotal)}</b>
            <span>${esc(m.urgentTitle)} · ${urgentPriced.length}</span>
          </div>
        </section>
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
        ${marketTable()}
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
        <aside class="callout">${esc(siteCopy().assemblyNote)}</aside>
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

function recommendBox(forPlan) {
  const p = planCopy();
  return `
    <aside class="callout ok recommend-box">
      <strong>${esc(p.recTitle)}</strong>
      ${forPlan ? `<p>${esc(p.recVsMix)}</p>` : ""}
      <p>${esc(p.recLead)}</p>
      <p>${esc(p.recShape)}</p>
      <p>${esc(p.recFees)}</p>
      <p class="lede">${esc(p.recNot)}</p>
    </aside>
  `;
}

function planYearSelect(work, assignment) {
  const p = planCopy();
  const selected = assignment === "off" ? "off" : String(planTargetYear(work, assignment));
  const years = [];
  for (let year = FUND.startYear; year <= planLastYear(); year += 1) {
    years.push(
      `<option value="${year}" ${selected === String(year) ? "selected" : ""}>${year}</option>`
    );
  }
  return `
    <label class="plan-pick">
      <span class="visually-hidden">${esc(p.yearLabel)}</span>
      <select data-plan-job="${esc(work.id)}">
        ${years.join("")}
        <option value="off" ${assignment === "off" ? "selected" : ""}>${esc(p.off)}</option>
      </select>
    </label>
  `;
}

function planMonthlyInYear(annual0, increase, year) {
  const index = Math.max(0, year - FUND.startYear);
  const annual = roundCad(annual0 * Math.pow(1 + (increase || 0), index));
  return portionFees(annual);
}

function planStartCards(solved) {
  const p = planCopy();
  const start = Math.max(2027, FUND.startYear);
  const annual0 = workshop.annual;
  const increase = workshop.increase;
  const fees = planMonthlyInYear(annual0, increase, start);
  const annualStart = roundCad(
    annual0 * Math.pow(1 + (increase || 0), start - FUND.startYear)
  );
  return `
    <h2>${esc(p.payStart)}</h2>
    <p class="lede">${esc(p.payHow)}</p>
    <p class="lede">${esc(p.yearPot)}: ${money(annualStart)} · ${pct(increase)}</p>
    <section class="stats plan-pay">
      ${fees
        .map((row) => {
          const extra = row.monthlyNew - row.monthlyNow;
          return `
            <div class="stat">
              <b>${money2(row.monthlyNew)} <small>${esc(p.month)}</small></b>
              <span>${esc(row.name)} · ${esc(p.today)} ${money2(
                row.monthlyNow
              )} (${extra >= 0 ? "+" : ""}${money2(extra)})</span>
            </div>
          `;
        })
        .join("")}
    </section>
    <p class="lede">${esc(p.flatAlt)} ${money(solved.flat.annual)}.</p>
  `;
}

function planScheduleTable(solved, byYear) {
  const p = planCopy();
  const annual0 = workshop.annual;
  const increase = workshop.increase;
  const portions = portionFees(annual0);
  const years = new Set([2027, ...byYear.keys()]);
  const sortedYears = [...years].sort((left, right) => left - right);
  const head = `<tr><th>${esc(p.colYear)}</th><th>${esc(p.colRepair)}</th>${portions
    .map((row) => `<th>${esc(row.name)}</th>`)
    .join("")}</tr>`;
  const body = sortedYears
    .map((year) => {
      const jobs = byYear.get(year) || [];
      const spend = jobs.reduce((sum, work) => {
        const delta = year - work.year;
        return sum + roundCad(work.cost * Math.pow(1 + FUND.inflation, delta));
      }, 0);
      const labels = jobs.map((work) => workLabel(work.id)).join(", ");
      const fees = planMonthlyInYear(annual0, increase, year);
      return `
        <tr${jobs.length ? "" : ' class="plan-quiet"'}>
          <td>${year}${
            year === 2027 ? ` <span class="extra-meta">${esc(p.startYearNote)}</span>` : ""
          }</td>
          <td>${
            jobs.length ? `${esc(labels)} · ${money(spend)}` : esc(p.noRepair)
          }</td>
          ${fees
            .map((row) => `<td>${money2(row.monthlyNew)} <span class="extra-meta">${esc(p.month)}</span></td>`)
            .join("")}
        </tr>
      `;
    })
    .join("");
  return `
    <h2>${esc(p.scheduleTitle)}</h2>
    <div class="table-wrap">
      <table class="plan-schedule">
        <thead>${head}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function planJobRow(work, assignment) {
  const year = planTargetYear(work, assignment);
  const delta = year == null ? 0 : year - work.year;
  const shown = roundCad(work.cost * Math.pow(1 + FUND.inflation, delta));
  return `
    <li class="plan-job">
      <div>
        <strong>${esc(workLabel(work.id))}</strong>
        <span class="extra-meta">${money(shown)}</span>
      </div>
      ${planYearSelect(work, assignment)}
    </li>
  `;
}

function renderPlan() {
  const p = planCopy();
  ensurePlanFeeSynced();
  document.title = withCivic(p.title);
  const assignments = planState();
  const solved = planSolve(assignments);
  const catalog = planJobCatalog();
  const byYear = new Map();
  catalog.forEach((work) => {
    const year = planTargetYear(work, assignments[work.id]);
    if (year == null) return;
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year).push(work);
  });
  const columns = [...byYear.keys()]
    .sort((a, b) => a - b)
    .map((year) => {
      const jobs = byYear.get(year);
      const spend = jobs.reduce((sum, work) => {
        const delta = year - work.year;
        return sum + roundCad(work.cost * Math.pow(1 + FUND.inflation, delta));
      }, 0);
      return `
        <article class="card plan-col">
          <h2>${year}</h2>
          <p class="lede">${money(spend)} · ${jobs.length} ${esc(p.worksIn)}</p>
          <ul class="plan-jobs">${jobs
            .map((work) => planJobRow(work, assignments[work.id]))
            .join("")}</ul>
        </article>
      `;
    })
    .join("");
  const skipped = catalog.filter((work) => assignments[work.id] === "off");
  const sim = projectFund(workshopOpts());
  const customFee =
    Math.abs((workshop.annual || 0) - (solved.grow.annual || 0)) > 1 ||
    Math.abs((workshop.increase || 0) - 0.02) > 0.0001;

  document.getElementById("app").innerHTML = chrome(`
        <h1>${esc(p.h1)}</h1>
        <p class="lede">${esc(p.lede)}</p>
        <aside class="how-box">
          <strong>${esc(p.howTitle)}</strong>
          <ol>
            ${p.howSteps.map((step) => `<li>${esc(step)}</li>`).join("")}
          </ol>
        </aside>
        <h2>${esc(p.pickTitle)}</h2>
        <div class="plan-buckets">${columns}</div>
        ${
          skipped.length
            ? `<h2>${esc(p.skipTitle)}</h2>
               <ul class="plan-jobs plan-skipped">${skipped
                 .map((work) => planJobRow(work, "off"))
                 .join("")}</ul>`
            : ""
        }
        <div id="plan-result">
          ${
            !sim.ok
              ? `<aside class="callout">${
                  solved.grow.capped
                    ? esc(p.cannot)
                    : `${esc(helpCopy().resultBadLong)} ${sim.firstGap}.`
                }</aside>`
              : ""
          }
          ${planStartCards(solved)}${planScheduleTable(solved, byYear)}
          ${
            customFee && solved.grow.sim.ok && !solved.grow.capped
              ? `<aside class="callout">
                   ${esc(p.customFee)} ${money(solved.grow.annual)}
                   (${pct(0.02)}).
                   <div class="sim-actions">
                     <button type="button" class="action" data-plan-needed="true">${esc(
                       p.useNeeded
                     )}</button>
                   </div>
                 </aside>`
              : ""
          }
        </div>
        <section class="footnote">
          <h3>${esc(p.otherTitle)}</h3>
          <p>${esc(p.otherBody)}</p>
          <p>${esc(p.footnote)}</p>
        </section>
        <div class="sim-actions">
          <button type="button" class="action" data-plan-workshop="true">${esc(
            p.loadWorkshop
          )}</button>
          <button type="button" class="action ghost" data-plan-reset="true">${esc(
            p.reset
          )}</button>
        </div>
  `);
  bindChrome();
  bindPlan(solved);
  const live = document.getElementById("plan-result");
  if (live) {
    live.classList.remove("just-changed");
    void live.offsetWidth;
    live.classList.add("just-changed");
  }
}

function bindPlan(solved) {
  document.querySelectorAll("[data-plan-job]").forEach((select) => {
    select.addEventListener("change", () => {
      const assignments = planState();
      assignments[select.dataset.planJob] =
        select.value === "off" ? "off" : Number(select.value);
      persistPlanAssignments(assignments);
      syncWorkshopToPlanYears(true);
      render();
    });
  });
  document.querySelectorAll("[data-plan-reset]").forEach((button) => {
    button.addEventListener("click", () => {
      planAssignments = defaultPlanAssignments();
      persistPlanAssignments(planAssignments);
      syncWorkshopToPlanYears(true);
      render();
    });
  });
  document.querySelectorAll("[data-plan-needed]").forEach((button) => {
    button.addEventListener("click", () => {
      syncWorkshopToPlanYears(true);
      render();
    });
  });
  document.querySelectorAll("[data-plan-workshop]").forEach((button) => {
    button.addEventListener("click", () => {
      syncWorkshopToPlanYears(false);
      setTab("fund");
    });
  });
}

function render() {
  document.documentElement.lang = I18N[lang].htmlLang;
  document.documentElement.dir = I18N[lang].dir === "rtl" ? "rtl" : "ltr";
  try {
    if (tab === "plan") renderPlan();
    else if (tab === "fund") renderFund();
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
