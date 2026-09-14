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
    cost: 2500,
    kind: "near",
    est: true,
  },
  {
    id: "guardRaise",
    year: 2027,
    remaining: 1,
    avg: 45,
    cost: 3500,
    kind: "near",
    est: true,
  },
  {
    id: "roofMembrane",
    year: 2051,
    remaining: 25,
    avg: 30,
    cost: 38580,
    kind: "later",
    est: true,
  },
  {
    id: "alumGuards",
    year: 2051,
    remaining: 25,
    avg: 45,
    cost: 6851,
    kind: "later",
    est: true,
  },
  {
    id: "blockCladding",
    year: 2051,
    remaining: 25,
    avg: 25,
    cost: 23840,
    kind: "later",
    est: true,
  },
];

function extraWorksSelected() {
  return EXTRA_WORK.filter((work) => {
    if (work.kind === "near") return workshop && workshop.includeNear;
    if (work.kind === "later") return workshop && workshop.includeLater;
    return false;
  });
}

function workLabel(id) {
  const extra = (helpCopy().extraNames || {})[id];
  if (extra) return extra;
  const names = FUND_I18N[lang] && FUND_I18N[lang].workNames;
  return (names && names[id]) || id;
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

function spendPlan(shifts) {
  const years = FUND.expenses.length;
  const extras = extraWorksSelected();
  const rebuild = hasShifts(shifts);
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
  if (rebuild) (FUND.works || []).forEach(add);
  extras.forEach(add);
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

const WORKSHOP_HELP = {
  en: {
    tipLabel: "Help",
    howTitle: "How to test a path",
    howSteps: [
      "Pick a printed path in the workshop (or on a card below). The sliders jump to that mix.",
      "Move the sliders and years. The result box, charts, and fee table update as you go.",
      "Red in the year table means the fund is short that year. Green in the result box means it stays positive for 25 years.",
      "Name and save a path to compare later. Saves stay on this computer only.",
    ],
    pathPicks: "Start from a printed path",
    loadedNote: "Loaded into the sliders. Change anything to explore.",
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
      backflow: "Sewer backflow valve (estimate)",
      guardRaise: "Raise balcony guards to 42 in. (estimate)",
      roofMembrane: "Elastomeric roof membrane (est. from 2023 roof)",
      alumGuards: "Aluminum guards (estimate, steel-stairs order)",
      blockCladding: "Concrete-block cladding (est. ~2% of reconstruction)",
    },
    maintAvgTitle: "Upcoming work — average budget",
    maintEst: "Estimate",
    maintInStudy: "In the reserve study",
    maintAvgLead:
      "Priced items in the 25-year study average this much each. Urgent carnet jobs already in the study use those figures. Jobs with no study price use the estimates and can be switched on in the reserve-fund workshop.",
  },
  fr: {
    tipLabel: "Aide",
    howTitle: "Comment tester un chemin",
    howSteps: [
      "Choisissez un chemin imprimé dans l’atelier (ou sur une carte plus bas). Les curseurs prennent ce mélange.",
      "Bougez les curseurs et les années. L’encadré, les graphiques et le tableau des frais se mettent à jour tout de suite.",
      "Le rouge dans le tableau annuel = déficit cette année. Le vert dans l’encadré = le fonds reste positif 25 ans.",
      "Nommez et enregistrez un chemin pour comparer plus tard. Ça reste seulement sur cet ordinateur.",
    ],
    pathPicks: "Partir d’un chemin imprimé",
    loadedNote: "Chargé dans les curseurs. Changez ce que vous voulez pour explorer.",
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
      backflow: "Clapet anti-retour (estimation)",
      guardRaise: "Rehausser les garde-corps à 42 po (estimation)",
      roofMembrane: "Membrane élastomère (est. toiture 2023)",
      alumGuards: "Garde-corps aluminium (est., ordre des escaliers acier)",
      blockCladding: "Revêtement en blocs (est. ~2 % de la reconstruction)",
    },
    maintAvgTitle: "Travaux à venir — budget moyen",
    maintEst: "Estimation",
    maintInStudy: "Dans l’étude de prévoyance",
    maintAvgLead:
      "Les postes chiffrés de l’étude 25 ans ont ce coût moyen. Les urgences déjà dans l’étude gardent ces montants. Sans prix d’étude : estimations, activables dans l’atelier du fonds.",
  },
  pt: {
    tipLabel: "Ajuda",
    howTitle: "Como testar um caminho",
    howSteps: [
      "Escolham um caminho impresso na oficina (ou num cartão abaixo). Os cursores saltam para essa mistura.",
      "Mexam nos cursores e nos anos. A caixa de resultado, os gráficos e a tabela de taxas atualizam na hora.",
      "Vermelho na tabela anual = rombo nesse ano. Verde na caixa = o fundo fica positivo 25 anos.",
      "Dêem um nome e guardem para comparar depois. Fica só neste computador.",
    ],
    pathPicks: "Começar por um caminho impresso",
    loadedNote: "Carregado nos cursores. Mexam no que quiserem para explorar.",
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
      backflow: "Válvula anti-retorno (estimativa)",
      guardRaise: "Elevar guarda-corpos para 42 pol. (estimativa)",
      roofMembrane: "Membrana do telhado (est. do telhado 2023)",
      alumGuards: "Guarda-corpos de alumínio (est., ordem das escadas de aço)",
      blockCladding: "Revestimento de blocos (est. ~2% da reconstrução)",
    },
    maintAvgTitle: "Obras futuras — orçamento médio",
    maintEst: "Estimativa",
    maintInStudy: "No estudo de reserva",
    maintAvgLead:
      "Os itens com preço no estudo de 25 anos têm este custo médio. Urgências já no estudo usam esses valores. Sem preço: estimativas, ligáveis na oficina do fundo.",
  },
  ary: {
    tipLabel: "شرح",
    howTitle: "كيفاش تجرّب طريق",
    howSteps: [
      "ختار طريق مطبوع فالورشة (ولا من كارطة لتحت). السلايدر كيمشيو لهاد الخلطة.",
      "حرّك السلايدر والسنين. النتيجة، الگراف والجدول كيتبدّلو دغيا.",
      "الحمر فالجدول = نقص فداك العام. الخضر فصندوق النتيجة = الصندوق كيبقا إيجابي 25 عام.",
      "سمّي وسجّل الطريق باش تقارن من بعد. كيبقا غير فهاد الجهاز.",
    ],
    pathPicks: "بدا من طريق مطبوع",
    loadedNote: "تحمّل فالسلايدر. بدّل اللي بغيتي باش تجرّب.",
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
      backflow: "صمام رجوع الواد (تقدير)",
      guardRaise: "طلع الكارد-كور لـ 42 إنش (تقدير)",
      roofMembrane: "ميمبران السطح (تقدير من سطح 2023)",
      alumGuards: "كارد-كور ألومنيوم (تقدير، بحال سلالم الحديد)",
      blockCladding: "كسوة البلوك (تقدير ~2% من إعادة البناء)",
    },
    maintAvgTitle: "الأشغال الجايين — معدل الميزانية",
    maintEst: "تقدير",
    maintInStudy: "فدراسة الاحتياط",
    maintAvgLead:
      "العناصر المسعّرة فدراسة 25 عام عندها هاد المعدل. الطوارئ اللي ديجا فالدراسة كيبقاو بنفس الثمن. بلا ثمن: تقديرات تقدر تحسبهم فالورشة.",
  },
};

function helpCopy() {
  return WORKSHOP_HELP[lang] || WORKSHOP_HELP.en;
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
    loadedStudy: "",
    includeNear: true,
    includeLater: false,
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
  workshop.loadedStudy = item.id;
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
      <div class="chart-label">${esc(h.unitBreak)}</div>
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
  return `
    <div class="wrap ${tab === "fund" ? "fund-page" : ""}">
      <header class="topbar">
        <div class="titles">
          <p class="site-title">${esc(withCivic(t.tabTitle))}</p>
          <p class="brand">${esc(t.brand)}</p>
        </div>
        <div class="toolbar">
          <nav class="tabs" role="tablist" aria-label="${esc(withCivic(t.tabTitle))}">
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
      <main id="main" class="${tab === "fund" ? "fund-stack" : ""}">${inner}</main>
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
  document.title = withCivic(f.title);
  const sim = projectFund(workshopOpts());
  const spendMax = Math.max(1, ...sim.expenses);
  const balanceMax = Math.max(
    spendMax,
    ...sim.rows.map((row) => Math.abs(row.balance))
  );
  const lastYear = FUND.startYear + FUND.expenses.length - 1;

  const workRows = [...(FUND.works || []), ...extraWorksSelected()]
    .map((work) => {
      const year = workYear(work);
      const dropped = year > lastYear;
      const name = workLabel(work.id);
      return `
        <tr>
          <td>
            <input class="year-input" data-shift="${esc(work.id)}" type="number" min="${FUND.startYear}" max="2075" value="${year}" />
            ${dropped ? `<div class="hint">${esc(f.dropped)}</div>` : ""}
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
          <td>${money(workCost(work))}</td>
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
        ${feeTable(workshop.annual)}
        <h2>${esc(f.tryTitle)}</h2>
        <p class="lede">${esc(f.tryLead)}</p>
        <aside class="how-box">
          <strong>${esc(h.howTitle)}</strong>
          <ol>
            ${h.howSteps.map((step) => `<li>${esc(step)}</li>`).join("")}
          </ol>
        </aside>
        <article class="card sim" id="workshop">
          <div class="path-picks">
            <span class="chart-label">${esc(h.pathPicks)}</span>
            <div class="path-picks-row" id="path-picks">${pathPickButtons()}</div>
            <p class="path-loaded" id="path-loaded" ${
              workshop.loadedStudy ? "" : "hidden"
            }>${esc(h.loadedNote)}</p>
          </div>
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
          <label class="check">
            <input id="include-near" type="checkbox" ${workshop.includeNear ? "checked" : ""} />
            ${esc(h.extraNear)}
          </label>
          <label class="check">
            <input id="include-later" type="checkbox" ${workshop.includeLater ? "checked" : ""} />
            ${esc(h.extraLater)}
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
          ${unitBreakTable(workshop.annual)}
          <aside id="sim-result" class="callout ${sim.ok ? "ok" : ""}" tabindex="-1">
            <strong>${
              sim.ok
                ? esc(f.resultOk)
                : `${esc(f.resultBad)} ${sim.firstGap}`
            } ${tip("result", h.tips.result)}</strong>
            ${esc(f.endBalance)}: ${money(sim.end)}.
            ${esc(f.minBalance)}: ${money(sim.minBalance)}.
            ${esc(f.totalPaid)}: ${money(sim.totalContrib)}.
          </aside>
          <div class="chart-block">
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
          <h3>${labelLine(f.yearTable, "yearTable", h.tips.yearTable)}</h3>
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
            ${tip("reset", h.tips.reset)}
          </div>
          <label>
            ${labelLine(f.saveName, "save", h.tips.save)}
            <input id="save-label" type="text" maxlength="80" value="${esc(workshop.saveLabel)}" />
          </label>
          <div class="sim-actions">
            <button type="button" class="action" data-save="true">${esc(f.saveBtn)}</button>
          </div>
          <h3>${labelLine(f.savedTitle, "saved", h.tips.saved)}</h3>
          ${savedBlock}
        </article>
        <h2>${esc(f.scenarios)}</h2>
        <p class="lede">${esc(f.scenarioNote)}</p>
        <div class="cards">${scenarioCards}</div>
        <h2>${labelLine(f.shiftTitle, "shift", h.tips.shift)}</h2>
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
    const includeNear = document.getElementById("include-near");
    const includeLater = document.getElementById("include-later");
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
    if (includeNear) workshop.includeNear = includeNear.checked;
    if (includeLater) workshop.includeLater = includeLater.checked;
    if (phaseYears) workshop.phaseYears = Number(phaseYears.value);
    if (annual2) workshop.annual2 = Number(annual2.value);
    if (increase2) workshop.increase2 = Number(increase2.value) / 100;
    if (saveLabel) workshop.saveLabel = saveLabel.value;
    persistWorkshop();
  };

  const paint = () => {
    const f = FUND_I18N[lang];
    const h = helpCopy();
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
      result.innerHTML = `<strong>${
        sim.ok ? esc(f.resultOk) : `${esc(f.resultBad)} ${sim.firstGap}`
      } ${tip("result", h.tips.result)}</strong> ${esc(f.endBalance)}: ${money(
        sim.end
      )}. ${esc(f.minBalance)}: ${money(sim.minBalance)}. ${esc(
        f.totalPaid
      )}: ${money(sim.totalContrib)}.`;
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
  ["include-near", "include-later"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", () => {
        readFields();
        render();
      });
    }
  });
  document.querySelectorAll("[data-shift]").forEach((input) => {
    input.addEventListener("change", () => {
      const id = input.dataset.shift;
      const work =
        (FUND.works || []).find((item) => item.id === id) ||
        EXTRA_WORK.find((item) => item.id === id);
      if (!work) return;
      workshop.shifts[id] = Number(input.value) - work.year;
      persistWorkshop();
      render();
    });
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
          includeNear: workshop.includeNear,
          includeLater: workshop.includeLater,
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
      workshop.loadedStudy = "";
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
    backflow: { cost: 2500, study: false },
    guard: { cost: 3500, study: false },
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
                )}</p>`
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
