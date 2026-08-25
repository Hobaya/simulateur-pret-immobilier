import React, { useState, useMemo } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LineChart, Line } from "recharts";
import { Info, Download, RotateCcw, Search, ChevronDown, ChevronRight, Printer, Pencil, Check, RefreshCw, Plus, X, Copy, SplitSquareHorizontal, Lock, Unlock } from "lucide-react";
import { computeAmortization, computeRachatCredit } from "./amortization.js";

const INK = "#16233D";
const PAPER = "#F7F4EE";
const PAPER_ALT = "#EFEAE0";
const GOLD = "#9C7A3C";
const GOLD_LIGHT = "#C9A063";
const GREEN = "#4B7A5B";
const ROSE = "#93463D";
const LINE = "#DDD6C5";

const DEFAULT_BAREMES = [
  { id: "b1", label: "25-35 ans", delegationMin: 0.08, delegationMax: 0.15, groupeMin: 0.25, groupeMax: 0.4, ageMax: 35 },
  { id: "b2", label: "35-45 ans", delegationMin: 0.15, delegationMax: 0.3, groupeMin: 0.35, groupeMax: 0.55, ageMax: 45 },
  { id: "b3", label: "45-55 ans", delegationMin: 0.3, delegationMax: 0.55, groupeMin: 0.55, groupeMax: 0.8, ageMax: 55 },
  { id: "b4", label: "55 ans et +", delegationMin: 0.5, delegationMax: 0.9, groupeMin: 0.8, groupeMax: 1.2, ageMax: 999 },
];
const DEFAULT_SOURCE = "Comparateurs de marché (Meilleurtaux, Covelia, Qivio...)";

export function euros(n, decimals = 0) {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n || 0);
}

function formatDate(d) {
  return d.toLocaleDateString("fr-FR", { month: "short", year: "numeric" });
}

function formatDureeMois(mois) {
  const ans = Math.floor(mois / 12);
  const reste = mois % 12;
  if (ans === 0) return `${reste} mois`;
  if (reste === 0) return `${ans} an${ans > 1 ? "s" : ""}`;
  return `${ans} an${ans > 1 ? "s" : ""} ${reste} mois`;
}

function Tip({ text }) {
  return (
    <span className="group relative inline-flex items-center ml-1 align-middle">
      <Info size={13} className="opacity-50 cursor-help" />
      <span
        className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1.5 w-56 z-20
                   rounded-md px-2.5 py-1.5 text-[11px] leading-snug opacity-0 group-hover:opacity-100
                   transition-opacity shadow-lg"
        style={{ background: INK, color: PAPER }}
      >
        {text}
      </span>
    </span>
  );
}

function DateField({ label, value, onChange, tooltip }) {
  return (
    <div>
      <label className="flex items-center text-[12px] font-medium mb-1" style={{ color: INK }}>
        {label}
        {tooltip && <Tip text={tooltip} />}
      </label>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-2.5 py-1.5 text-[13px] outline-none rounded-md border bg-white"
        style={{ borderColor: LINE, color: INK }}
      />
    </div>
  );
}

function NumberField({ label, value, onChange, step = 1, min = 0, suffix, tooltip }) {
  return (
    <div>
      <label className="flex items-center text-[12px] font-medium mb-1" style={{ color: INK }}>
        {label}
        {tooltip && <Tip text={tooltip} />}
      </label>
      <div className="flex items-center rounded-md border overflow-hidden" style={{ borderColor: LINE, background: "#fff" }}>
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(Math.max(min, parseFloat(e.target.value) || 0))}
          className="w-full px-2.5 py-1.5 text-[13px] outline-none bg-transparent"
          style={{ color: INK }}
        />
        {suffix && (
          <span className="px-2 text-[12px] shrink-0" style={{ color: "#8A8371", borderLeft: `1px solid ${LINE}` }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function MiniField({ label, value, onChange, step, suffix }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <label className="text-[11px]" style={{ color: "#6B6455" }}>
        {label}
      </label>
      <div className="flex items-center rounded border overflow-hidden bg-white" style={{ borderColor: LINE }}>
        <input
          type="number"
          value={value}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="w-16 px-1.5 py-1 text-[11.5px] text-right outline-none bg-transparent"
          style={{ color: INK }}
        />
        <span className="px-1 text-[10px]" style={{ color: "#8A8371" }}>
          {suffix}
        </span>
      </div>
    </div>
  );
}

function SliderField({ label, value, onChange, min, max, step, suffix, tooltip, locked = false, onToggleLock }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1 gap-2">
        <label className="flex items-center text-[12px] font-medium" style={{ color: INK }}>
          {label}
          {tooltip && <Tip text={tooltip} />}
        </label>
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center rounded border overflow-hidden bg-white" style={{ borderColor: LINE }}>
            <input
              type="number"
              value={value}
              min={min}
              max={max}
              step={step}
              disabled={locked}
              onChange={(e) => onChange(Math.min(max, Math.max(min, parseFloat(e.target.value) || 0)))}
              className="w-14 px-1.5 py-0.5 text-[12px] text-right font-semibold outline-none bg-transparent disabled:opacity-50"
              style={{ color: GOLD }}
            />
            <span className="px-1 text-[11px]" style={{ color: "#8A8371" }}>
              {suffix}
            </span>
          </div>
          {onToggleLock && (
            <button
              type="button"
              onClick={onToggleLock}
              title={locked ? "Déverrouiller ce champ" : "Verrouiller ce champ"}
              className="shrink-0 hover:opacity-70"
              style={{ color: locked ? GOLD : "#8A8371" }}
            >
              {locked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={locked}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-current disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ accentColor: GOLD }}
      />
    </div>
  );
}

function CentimesToggle({ checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      aria-pressed={checked}
      className="flex items-center gap-2"
    >
      <span className="text-[11px] uppercase tracking-wide opacity-60">Afficher les centimes</span>
      <span
        className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
        style={{ background: checked ? GOLD : "rgba(247,244,238,0.25)" }}
      >
        <span
          className="inline-block h-3.5 w-3.5 rounded-full transition-transform"
          style={{ background: PAPER, transform: checked ? "translateX(18px)" : "translateX(2px)" }}
        />
      </span>
    </button>
  );
}

export default function App() {
  const [capital, setCapital] = useState(250000);
  const [taux, setTaux] = useState(3.5);
  const [tauxVerrouille, setTauxVerrouille] = useState(false);
  const [dureeAnnees, setDureeAnnees] = useState(20);
  const [dureeVerrouille, setDureeVerrouille] = useState(false);
  const [dureeUnite, setDureeUnite] = useState("ans");
  const [tauxAssurance, setTauxAssurance] = useState(0.34);
  const [modeAssurance, setModeAssurance] = useState("initial");
  const [assuranceSaisie, setAssuranceSaisie] = useState("taux");
  const [assuranceMontantFixe, setAssuranceMontantFixe] = useState(70);
  const [assuranceMontantTotal, setAssuranceMontantTotal] = useState(15000);
  const [afficherCentimes, setAfficherCentimes] = useState(true);
  const [fraisDossier, setFraisDossier] = useState(1200);
  const [dateDebut, setDateDebut] = useState(() => new Date().toISOString().slice(0, 10));
  const [rembActif, setRembActif] = useState(false);
  const [rembMontant, setRembMontant] = useState(10000);
  const [rembEcheance, setRembEcheance] = useState(60);
  const [rembMode, setRembMode] = useState("duree");
  const [showRachat, setShowRachat] = useState(false);
  const [rachatEcheance, setRachatEcheance] = useState(60);
  const [rachatNouveauTaux, setRachatNouveauTaux] = useState(3);
  const [rachatNouvelleDureeAnnees, setRachatNouvelleDureeAnnees] = useState(20);
  const [rachatFrais, setRachatFrais] = useState(2000);
  const [rachatIraManuelleActif, setRachatIraManuelleActif] = useState(false);
  const [rachatIraManuelle, setRachatIraManuelle] = useState(0);
  const [age, setAge] = useState(38);
  const [baremes, setBaremes] = useState(DEFAULT_BAREMES);
  const [baremeSource, setBaremeSource] = useState(DEFAULT_SOURCE);
  const [baremeDate, setBaremeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingBaremes, setEditingBaremes] = useState(false);
  const [baremesLoaded, setBaremesLoaded] = useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("baremes-assurance-emprunteur");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.baremes) setBaremes(parsed.baremes);
        if (parsed.source) setBaremeSource(parsed.source);
        if (parsed.date) setBaremeDate(parsed.date);
      }
    } catch (e) {
      /* rien d'enregistré encore, on garde les valeurs par défaut */
    }
    setBaremesLoaded(true);
  }, []);

  const saveBaremes = (nextBaremes, nextSource, nextDate) => {
    setBaremes(nextBaremes);
    setBaremeSource(nextSource);
    setBaremeDate(nextDate);
    try {
      localStorage.setItem(
        "baremes-assurance-emprunteur",
        JSON.stringify({ baremes: nextBaremes, source: nextSource, date: nextDate })
      );
    } catch (e) {
      /* la sauvegarde a échoué (stockage plein ou navigation privée), les valeurs restent actives pour cette session */
    }
  };

  const updateBaremeField = (id, field, value) => {
    const next = baremes.map((b) => (b.id === id ? { ...b, [field]: parseFloat(value) || 0 } : b));
    saveBaremes(next, baremeSource, baremeDate);
  };
  const [search, setSearch] = useState("");
  const [collapsedYears, setCollapsedYears] = useState(new Set());
  const [showComparateur, setShowComparateur] = useState(false);
  const makeScenarioFromCurrent = (label) => ({
    id: `s${Date.now()}${Math.random()}`,
    label,
    capital,
    taux,
    dureeAnnees,
    tauxAssurance,
    modeAssurance,
    assuranceSaisie,
    assuranceMontantFixe,
    assuranceMontantTotal,
    fraisDossier,
    dateDebut,
  });
  const [scenarios, setScenarios] = useState([]);

  const openComparateur = () => {
    if (scenarios.length === 0) {
      setScenarios([
        { ...makeScenarioFromCurrent("Scénario A"), dureeAnnees: dureeAnnees },
        { ...makeScenarioFromCurrent("Scénario B"), dureeAnnees: Math.max(5, dureeAnnees - 5) },
      ]);
    }
    setShowComparateur(true);
  };

  const updateScenario = (id, field, value) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  };

  const copyCurrentIntoScenario = (id) => {
    setScenarios((prev) => prev.map((s) => (s.id === id ? { ...makeScenarioFromCurrent(s.label) } : s)));
  };

  const addScenario = () => {
    if (scenarios.length >= 3) return;
    setScenarios((prev) => [...prev, makeScenarioFromCurrent(`Scénario ${String.fromCharCode(65 + prev.length)}`)]);
  };

  const removeScenario = (id) => {
    setScenarios((prev) => prev.filter((s) => s.id !== id));
  };

  const SCENARIO_COLORS = [INK, ROSE, GREEN];

  const scenarioResults = useMemo(() => {
    return scenarios.map((s, i) => ({ ...s, color: SCENARIO_COLORS[i % 3], result: computeAmortization(s) }));
  }, [scenarios]);

  const scenarioChartData = useMemo(() => {
    if (!scenarioResults.length) return [];
    const maxMonths = Math.max(...scenarioResults.map((s) => s.result.schedule.length));
    const points = [];
    for (let m = 0; m <= maxMonths; m += Math.max(1, Math.round(maxMonths / 40))) {
      const point = { mois: m };
      scenarioResults.forEach((s) => {
        const row = s.result.schedule[m - 1];
        point[s.label] = row ? Math.round(row.crdFin) : m === 0 ? s.capital : 0;
      });
      points.push(point);
    }
    return points;
  }, [scenarioResults]);

  const reset = () => {
    setCapital(250000);
    setTaux(3.5);
    setTauxVerrouille(false);
    setDureeAnnees(20);
    setDureeVerrouille(false);
    setDureeUnite("ans");
    setTauxAssurance(0.34);
    setModeAssurance("initial");
    setAssuranceSaisie("taux");
    setAssuranceMontantFixe(70);
    setAssuranceMontantTotal(15000);
    setFraisDossier(1200);
    setDateDebut(new Date().toISOString().slice(0, 10));
    setRembActif(false);
    setRembMontant(10000);
    setRembEcheance(60);
    setRembMode("duree");
    setShowRachat(false);
    setRachatEcheance(60);
    setRachatNouveauTaux(3);
    setRachatNouvelleDureeAnnees(20);
    setRachatFrais(2000);
    setRachatIraManuelleActif(false);
    setRachatIraManuelle(0);
    setSearch("");
    setCollapsedYears(new Set());
  };

  const remboursementAnticipeParam = useMemo(() => {
    if (!rembActif || !(rembMontant > 0) || !(rembEcheance >= 1)) return null;
    return { montant: rembMontant, echeance: Math.round(rembEcheance), mode: rembMode };
  }, [rembActif, rembMontant, rembEcheance, rembMode]);

  const { schedule, mensualiteHorsAssurance, totalInterets, totalAssurance, coutTotal, taeg, years, remboursementAnticipeInfo } = useMemo(() => {
    return computeAmortization({
      capital,
      taux,
      dureeAnnees,
      tauxAssurance,
      modeAssurance,
      assuranceSaisie,
      assuranceMontantFixe,
      assuranceMontantTotal,
      fraisDossier,
      dateDebut,
      remboursementAnticipe: remboursementAnticipeParam,
    });
  }, [capital, taux, dureeAnnees, tauxAssurance, modeAssurance, fraisDossier, dateDebut, assuranceSaisie, assuranceMontantFixe, assuranceMontantTotal, remboursementAnticipeParam]);

  // Scénario de référence sans le versement, utilisé uniquement pour chiffrer l'économie
  // d'intérêts et le gain de durée — ne remplace pas le calcul TAEG/coût affiché ci-dessus,
  // qui reste celui du scénario avec versement.
  const sansRemboursement = useMemo(() => {
    if (!remboursementAnticipeParam) return null;
    return computeAmortization({ capital, taux, dureeAnnees, tauxAssurance, modeAssurance, assuranceSaisie, assuranceMontantFixe, assuranceMontantTotal, fraisDossier, dateDebut });
  }, [capital, taux, dureeAnnees, tauxAssurance, modeAssurance, fraisDossier, dateDebut, assuranceSaisie, assuranceMontantFixe, assuranceMontantTotal, remboursementAnticipeParam]);

  const rembResultats = useMemo(() => {
    if (!remboursementAnticipeParam || !sansRemboursement || !remboursementAnticipeInfo) return null;
    return {
      interetsEconomises: sansRemboursement.totalInterets - totalInterets,
      gainDureeMois: sansRemboursement.schedule.length - schedule.length,
      nouvelleMensualite: remboursementAnticipeInfo.nouvelleMensualite,
      nouveauCoutTotal: coutTotal,
      dureeReelleMois: schedule.length,
    };
  }, [remboursementAnticipeParam, sansRemboursement, remboursementAnticipeInfo, totalInterets, schedule.length, coutTotal]);

  // Simulation de rachat de crédit : outil d'analyse indépendant, ne touche ni au
  // tableau d'amortissement principal (schedule/years) ni au graphique — computeRachatCredit
  // recalcule son propre scénario "si maintien" via computeAmortization, sans le modifier.
  const rachatResultat = useMemo(() => {
    if (!showRachat) return null;
    return computeRachatCredit({
      capital,
      taux,
      dureeAnnees,
      tauxAssurance,
      modeAssurance,
      assuranceSaisie,
      assuranceMontantFixe,
      assuranceMontantTotal,
      fraisDossier,
      dateDebut,
      echeanceRachat: Math.round(rachatEcheance),
      nouveauTaux: rachatNouveauTaux,
      nouvelleDureeAnnees: rachatNouvelleDureeAnnees,
      fraisNouveauPret: rachatFrais,
      iraManuelle: rachatIraManuelleActif ? rachatIraManuelle : null,
    });
  }, [
    showRachat,
    capital,
    taux,
    dureeAnnees,
    tauxAssurance,
    modeAssurance,
    assuranceSaisie,
    assuranceMontantFixe,
    assuranceMontantTotal,
    fraisDossier,
    dateDebut,
    rachatEcheance,
    rachatNouveauTaux,
    rachatNouvelleDureeAnnees,
    rachatFrais,
    rachatIraManuelleActif,
    rachatIraManuelle,
  ]);

  const mensualiteTotale = schedule.length ? schedule[0].mensualiteTotale : 0;
  const assuranceMensuelle = schedule.length ? schedule[0].assurance : 0;

  const brackedApplicable = useMemo(() => {
    return baremes.find((b) => age <= b.ageMax) || baremes[baremes.length - 1];
  }, [baremes, age]);

  const positionMarche = useMemo(() => {
    if (!brackedApplicable || assuranceSaisie !== "taux") return null;
    if (tauxAssurance < brackedApplicable.delegationMin) return { label: "Sous la fourchette délégation", color: GOLD };
    if (tauxAssurance <= brackedApplicable.delegationMax) return { label: "Dans la fourchette délégation", color: GREEN };
    if (tauxAssurance <= brackedApplicable.groupeMax) return { label: "Niveau contrat groupe bancaire", color: ROSE };
    return { label: "Au-dessus des repères de marché", color: ROSE };
  }, [brackedApplicable, tauxAssurance, assuranceSaisie]);

  const chartData = useMemo(() => {
    let cumInterets = 0;
    return schedule
      .filter((r) => r.n % 6 === 0 || r.n === 1 || r.n === schedule.length)
      .map((r) => {
        cumInterets = schedule.filter((s) => s.n <= r.n).reduce((a, s) => a + s.interets, 0);
        return {
          label: formatDate(r.date),
          "Capital restant dû": Math.round(r.crdFin),
          "Intérêts cumulés": Math.round(cumInterets),
        };
      });
  }, [schedule]);

  const pieData = [
    { name: "Capital", value: capital, color: INK },
    { name: "Intérêts", value: totalInterets, color: ROSE },
    { name: "Assurance", value: totalAssurance, color: GOLD },
  ];

  const toggleYear = (y) => {
    setCollapsedYears((prev) => {
      const next = new Set(prev);
      next.has(y) ? next.delete(y) : next.add(y);
      return next;
    });
  };

  const filteredYears = useMemo(() => {
    if (!search.trim()) return years;
    const q = search.trim().toLowerCase();
    return years
      .map((y) => {
        if (String(y.annee).includes(q)) return y;
        const rows = y.rows.filter((r) => String(r.n).includes(q));
        return rows.length ? { ...y, rows } : null;
      })
      .filter(Boolean);
  }, [years, search]);

  const exportCSV = () => {
    const header = ["N","Date","Capital restant dû (début)","Intérêts","Assurance","Capital amorti","Mensualité totale","Capital restant dû (fin)"];
    const lines = schedule.map((r) =>
      [r.n, formatDate(r.date), r.crdDebut.toFixed(2), r.interets.toFixed(2), r.assurance.toFixed(2), r.capitalAmorti.toFixed(2), r.mensualiteTotale.toFixed(2), r.crdFin.toFixed(2)].join(";")
    );
    const csv = [header.join(";"), ...lines].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tableau-amortissement.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentMonthIdx = schedule.length
    ? schedule.findIndex((r) => r.date.getMonth() === new Date().getMonth() && r.date.getFullYear() === new Date().getFullYear())
    : -1;

  const decimals = afficherCentimes ? 2 : 0;

  // Durée du prêt : stockée en années (dureeAnnees) quelle que soit l'unité affichée/saisie ;
  // conversion automatique vers/depuis les mois pour l'affichage du curseur et du champ numérique.
  const dureeAffichee = dureeUnite === "mois" ? Math.round(dureeAnnees * 12) : Math.round(dureeAnnees * 100) / 100;
  const dureeMin = dureeUnite === "mois" ? 60 : 5;
  const dureeMax = dureeUnite === "mois" ? 360 : 30;
  const handleDureeChange = (v) => setDureeAnnees(dureeUnite === "mois" ? v / 12 : v);

  return (
    <div className="min-h-screen w-full" style={{ background: PAPER, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="mb-5">
          <h1 className="text-[22px] font-semibold tracking-tight" style={{ color: INK, fontFamily: "Georgia, serif" }}>
            Simulateur de prêt immobilier
          </h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: "#8A8371" }}>
            Mensualités, coût du crédit et tableau d'amortissement complet
          </p>
        </header>

        {/* Résumé — figé (sticky) à partir du breakpoint md uniquement ; défile normalement sur mobile */}
        <div
          className="md:sticky md:top-2 z-30 rounded-xl mb-5 px-5 py-4 flex flex-wrap items-center gap-x-8 gap-y-3 shadow-sm"
          style={{ background: INK, color: PAPER }}
        >
          <div className="min-w-[180px]">
            <div className="text-[11px] uppercase tracking-wide opacity-60">Mensualité totale</div>
            <div className="text-[28px] font-semibold leading-tight tabular-nums" style={{ color: GOLD_LIGHT, fontFamily: "Georgia, serif" }}>
              {euros(mensualiteTotale, decimals)}
            </div>
          </div>
          <div className="h-9 w-px opacity-20" style={{ background: PAPER }} />
          <Stat label="Capital emprunté" value={euros(capital, decimals)} />
          <Stat label="Durée" value={`${dureeAnnees} ans (${schedule.length} mois)`} />
          <Stat label="Coût total du crédit" value={euros(coutTotal, decimals)} />
          <Stat label="TAEG indicatif" value={`${taeg.toFixed(3)} %`} sub="non normé" />
          <div className="h-9 w-px opacity-20" style={{ background: PAPER }} />
          <CentimesToggle checked={afficherCentimes} onChange={setAfficherCentimes} />
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setShowRachat((v) => !v)}
              className="flex items-center gap-1.5 text-[12px] font-medium rounded-md px-3 py-1.5 border transition-colors hover:opacity-80"
              style={{ borderColor: "rgba(247,244,238,0.3)", color: PAPER }}
            >
              <RefreshCw size={13} /> {showRachat ? "Fermer le rachat" : "Simuler un rachat de crédit"}
            </button>
            <button
              onClick={() => (showComparateur ? setShowComparateur(false) : openComparateur())}
              className="flex items-center gap-1.5 text-[12px] font-medium rounded-md px-3 py-1.5 border transition-colors hover:opacity-80"
              style={{ borderColor: "rgba(247,244,238,0.3)", color: PAPER }}
            >
              <SplitSquareHorizontal size={13} /> {showComparateur ? "Fermer le comparateur" : "Comparer des scénarios"}
            </button>
          </div>
        </div>

        {showRachat && (
          <div className="rounded-xl border p-4 mb-5" style={{ borderColor: LINE, background: "#fff" }}>
            <h2 className="text-[15px] font-semibold mb-1" style={{ color: INK, fontFamily: "Georgia, serif" }}>
              Simulation de rachat de crédit
            </h2>
            <p className="text-[11.5px] mb-3" style={{ color: "#8A8371" }}>
              Outil d'analyse indépendant : ne modifie ni le tableau d'amortissement ni le graphique ci-dessous.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-3">
                <NumberField
                  label="Échéance du rachat"
                  value={rachatEcheance}
                  onChange={setRachatEcheance}
                  step={1}
                  min={1}
                  suffix="mois"
                  tooltip="Numéro du mois auquel le prêt actuel est intégralement remboursé par le nouveau prêt."
                />
                <NumberField label="Nouveau taux d'intérêt" value={rachatNouveauTaux} onChange={setRachatNouveauTaux} step={0.05} suffix="%" />
                <NumberField label="Nouvelle durée" value={rachatNouvelleDureeAnnees} onChange={setRachatNouvelleDureeAnnees} step={1} min={1} suffix="ans" />
                <NumberField
                  label="Frais du nouveau prêt"
                  value={rachatFrais}
                  onChange={setRachatFrais}
                  step={100}
                  suffix="€"
                  tooltip="Dossier, garantie, courtage... financés dans le nouveau capital emprunté."
                />

                <div className="rounded-md border p-2.5" style={{ borderColor: LINE, background: PAPER_ALT }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#6B6455" }}>
                      IRA (indemnité de remboursement anticipé)
                    </span>
                    <button
                      onClick={() => setRachatIraManuelleActif((v) => !v)}
                      className="flex items-center gap-1 text-[11px] hover:opacity-70"
                      style={{ color: INK }}
                    >
                      {rachatIraManuelleActif ? <Check size={12} /> : <Pencil size={12} />}
                      {rachatIraManuelleActif ? "Auto" : "Saisir manuellement"}
                    </button>
                  </div>
                  {rachatResultat && (
                    <div className="text-[11px] mb-1.5" style={{ color: "#6B6455" }}>
                      Plafond légal (art. R313-25) : <strong style={{ color: INK }}>{euros(rachatResultat.iraLegale, decimals)}</strong> — le plus
                      petit entre 6 mois d'intérêts et 3 % du capital restant dû.
                    </div>
                  )}
                  {rachatIraManuelleActif && (
                    <NumberField
                      label="Montant de l'IRA"
                      value={rachatIraManuelle}
                      onChange={setRachatIraManuelle}
                      step={100}
                      suffix="€"
                      tooltip="Cas d'exonération légale (mobilité, décès, revente liée...) ou montant négocié avec la banque."
                    />
                  )}
                </div>
              </div>

              <div>
                {!rachatResultat ? (
                  <div className="text-[12px]" style={{ color: "#8A8371" }}>
                    Échéance de rachat au-delà de la durée du prêt actuel ({schedule.length} mois) : aucun résultat.
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                          CRD au rachat
                        </div>
                        <div className="text-[14px] font-semibold tabular-nums" style={{ color: INK }}>
                          {euros(rachatResultat.crdRachat, decimals)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                          Nouveau capital emprunté
                        </div>
                        <div className="text-[14px] font-semibold tabular-nums" style={{ color: INK }}>
                          {euros(rachatResultat.nouveauCapital, decimals)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                          Nouvelle mensualité
                        </div>
                        <div className="text-[14px] font-semibold tabular-nums" style={{ color: INK }}>
                          {euros(rachatResultat.nouvelleMensualite, decimals)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                          Durée totale (rachat inclus)
                        </div>
                        <div className="text-[14px] font-semibold" style={{ color: INK }}>
                          {formatDureeMois(rachatResultat.dureeTotaleMois)}
                        </div>
                      </div>
                    </div>

                    <div className="rounded-lg p-3" style={{ background: rachatResultat.avantageux ? "rgba(75,122,91,0.12)" : "rgba(147,70,61,0.10)" }}>
                      <div className="text-[11px] uppercase tracking-wide mb-1" style={{ color: "#6B6455" }}>
                        Gain net du rachat
                      </div>
                      <div
                        className="text-[22px] font-semibold tabular-nums"
                        style={{ color: rachatResultat.avantageux ? GREEN : ROSE, fontFamily: "Georgia, serif" }}
                      >
                        {rachatResultat.gainNet >= 0 ? "+" : ""}
                        {euros(rachatResultat.gainNet, decimals)}
                      </div>
                      <div className="text-[12px] font-medium mt-0.5" style={{ color: rachatResultat.avantageux ? GREEN : ROSE }}>
                        {rachatResultat.avantageux ? "Rachat avantageux" : "Rachat non avantageux"}
                      </div>
                      <div className="text-[10.5px] mt-1.5 leading-snug" style={{ color: "#8A8371" }}>
                        Coût restant si maintien {euros(rachatResultat.coutRestantSiMaintien, decimals)} − coût du nouveau prêt{" "}
                        {euros(rachatResultat.coutNouveauPret, decimals)} − IRA {euros(rachatResultat.iraAppliquee, decimals)} − frais{" "}
                        {euros(rachatFrais, decimals)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {showComparateur && (
          <div className="rounded-xl border p-4 mb-5" style={{ borderColor: LINE, background: "#fff" }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[15px] font-semibold" style={{ color: INK, fontFamily: "Georgia, serif" }}>
                Comparateur de scénarios
              </h2>
              {scenarios.length < 3 && (
                <button onClick={addScenario} className="flex items-center gap-1 text-[12px] font-medium rounded-md px-2.5 py-1.5 border hover:opacity-80" style={{ borderColor: LINE, color: INK }}>
                  <Plus size={13} /> Ajouter un scénario
                </button>
              )}
            </div>

            <div className={`grid gap-3 mb-4 grid-cols-1 ${scenarios.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"}`}>
              {scenarioResults.map((s) => (
                <div key={s.id} className="rounded-lg border p-3" style={{ borderColor: LINE, background: PAPER_ALT }}>
                  <div className="flex items-center justify-between mb-2 gap-2">
                    <input
                      value={s.label}
                      onChange={(e) => updateScenario(s.id, "label", e.target.value)}
                      className="text-[13px] font-medium bg-transparent outline-none border-b flex-1"
                      style={{ color: s.color, borderColor: "transparent" }}
                    />
                    <button onClick={() => copyCurrentIntoScenario(s.id)} title="Copier les paramètres actuels du simulateur" className="hover:opacity-70">
                      <Copy size={13} style={{ color: "#8A8371" }} />
                    </button>
                    {scenarios.length > 2 && (
                      <button onClick={() => removeScenario(s.id)} className="hover:opacity-70">
                        <X size={14} style={{ color: "#8A8371" }} />
                      </button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <MiniField label="Capital" value={s.capital} onChange={(v) => updateScenario(s.id, "capital", v)} suffix="€" step={1000} />
                    <MiniField label="Taux" value={s.taux} onChange={(v) => updateScenario(s.id, "taux", v)} suffix="%" step={0.05} />
                    <MiniField label="Durée" value={s.dureeAnnees} onChange={(v) => updateScenario(s.id, "dureeAnnees", v)} suffix="ans" step={1} />
                    {s.assuranceSaisie === "montant" ? (
                      <MiniField label="Assurance" value={s.assuranceMontantFixe} onChange={(v) => updateScenario(s.id, "assuranceMontantFixe", v)} suffix="€/mois" step={1} />
                    ) : s.assuranceSaisie === "totalDuree" ? (
                      <MiniField label="Ass. totale" value={s.assuranceMontantTotal} onChange={(v) => updateScenario(s.id, "assuranceMontantTotal", v)} suffix="€" step={100} />
                    ) : (
                      <MiniField label="Ass. taux" value={s.tauxAssurance} onChange={(v) => updateScenario(s.id, "tauxAssurance", v)} suffix="%" step={0.01} />
                    )}
                    <div className="flex rounded-md overflow-hidden border text-[10.5px]" style={{ borderColor: LINE }}>
                      <button
                        onClick={() => updateScenario(s.id, "modeAssurance", "initial")}
                        className="flex-1 py-1 transition-colors"
                        style={{ background: s.modeAssurance === "initial" ? INK : "#fff", color: s.modeAssurance === "initial" ? PAPER : INK }}
                      >
                        Capital initial
                      </button>
                      <button
                        onClick={() => updateScenario(s.id, "modeAssurance", "restant")}
                        className="flex-1 py-1 transition-colors"
                        style={{ background: s.modeAssurance === "restant" ? INK : "#fff", color: s.modeAssurance === "restant" ? PAPER : INK }}
                      >
                        Restant dû
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t" style={{ borderColor: LINE }}>
                    <div className="text-[11px]" style={{ color: "#8A8371" }}>Mensualité</div>
                    <div className="text-[17px] font-semibold" style={{ color: s.color, fontFamily: "Georgia, serif" }}>
                      {euros(s.result.mensualiteTotale, decimals)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {scenarioResults.length > 0 && (
              <>
                <div className="rounded-lg border overflow-hidden mb-4" style={{ borderColor: LINE }}>
                  <table className="w-full text-[12px] border-collapse">
                    <thead style={{ background: PAPER_ALT }}>
                      <tr>
                        <th className="text-left px-3 py-2 font-medium" style={{ color: "#6B6455" }}>Indicateur</th>
                        {scenarioResults.map((s) => (
                          <th key={s.id} className="text-right px-3 py-2 font-medium" style={{ color: s.color }}>
                            {s.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        { label: "Mensualité totale", get: (s) => euros(s.result.mensualiteTotale, decimals) },
                        { label: "Durée", get: (s) => `${s.dureeAnnees} ans` },
                        { label: "Coût des intérêts", get: (s) => euros(s.result.totalInterets, decimals) },
                        { label: "Coût de l'assurance", get: (s) => euros(s.result.totalAssurance, decimals) },
                        { label: "Coût total du crédit", get: (s) => euros(s.result.coutTotal, decimals) },
                        { label: "TAEG indicatif", get: (s) => `${s.result.taeg.toFixed(3)} %` },
                      ].map((row) => (
                        <tr key={row.label} className="border-t" style={{ borderColor: LINE }}>
                          <td className="px-3 py-1.5" style={{ color: INK }}>{row.label}</td>
                          {scenarioResults.map((s) => (
                            <td key={s.id} className="px-3 py-1.5 text-right font-medium" style={{ color: INK }}>
                              {row.get(s)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="rounded-lg border p-3" style={{ borderColor: LINE }}>
                  <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: "#8A8371" }}>
                    Capital restant dû par scénario
                  </div>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={scenarioChartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                        <CartesianGrid stroke={LINE} strokeDasharray="2 4" vertical={false} />
                        <XAxis dataKey="mois" tick={{ fontSize: 10, fill: "#8A8371" }} tickFormatter={(v) => `${v}m`} axisLine={{ stroke: LINE }} tickLine={false} />
                        <YAxis tick={{ fontSize: 10, fill: "#8A8371" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                        <Tooltip formatter={(v) => euros(v, decimals)} labelFormatter={(v) => `Mois ${v}`} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: LINE }} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {scenarioResults.map((s) => (
                          <Line key={s.id} type="monotone" dataKey={s.label} stroke={s.color} strokeWidth={1.75} dot={false} />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-5">
          {/* Formulaire */}
          <div className="lg:sticky lg:top-[104px] lg:self-start rounded-xl border p-4 space-y-4" style={{ borderColor: LINE, background: "#fff", height: "fit-content" }}>
            <NumberField label="Capital emprunté" value={capital} onChange={setCapital} step={1000} suffix="€" />
            <SliderField
              label="Taux d'intérêt annuel"
              value={taux}
              onChange={setTaux}
              min={0.5}
              max={7}
              step={0.05}
              suffix="%"
              tooltip="Taux nominal hors assurance, appliqué chaque mois au capital restant dû."
              locked={tauxVerrouille}
              onToggleLock={() => setTauxVerrouille((v) => !v)}
            />

            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px]" style={{ color: "#8A8371" }}>
                  Unité de la durée
                </span>
                <div className="flex rounded overflow-hidden border text-[10.5px]" style={{ borderColor: LINE }}>
                  <button
                    onClick={() => setDureeUnite("ans")}
                    className="px-2 py-1 transition-colors"
                    style={{ background: dureeUnite === "ans" ? INK : "#fff", color: dureeUnite === "ans" ? PAPER : INK }}
                  >
                    Années
                  </button>
                  <button
                    onClick={() => setDureeUnite("mois")}
                    className="px-2 py-1 transition-colors"
                    style={{ background: dureeUnite === "mois" ? INK : "#fff", color: dureeUnite === "mois" ? PAPER : INK }}
                  >
                    Mois
                  </button>
                </div>
              </div>
              <SliderField
                label="Durée du prêt"
                value={dureeAffichee}
                onChange={handleDureeChange}
                min={dureeMin}
                max={dureeMax}
                step={1}
                suffix={dureeUnite === "mois" ? "mois" : "ans"}
                locked={dureeVerrouille}
                onToggleLock={() => setDureeVerrouille((v) => !v)}
              />
            </div>
            <DateField label="Date de début du prêt" value={dateDebut} onChange={setDateDebut} tooltip="Date de la première échéance. Le tableau d'amortissement est daté à partir de cette date." />

            <div className="pt-1 border-t" style={{ borderColor: LINE }}>
              <label className="flex items-center text-[12px] font-medium mb-1.5 mt-3" style={{ color: INK }}>
                Assurance emprunteur
                <Tip text="Saisis soit un taux appliqué au capital, soit le montant mensuel exact indiqué par ta banque ou un autre simulateur." />
              </label>
              <div className="flex rounded-md overflow-hidden border text-[12px] mb-3" style={{ borderColor: LINE }}>
                <button
                  onClick={() => setAssuranceSaisie("taux")}
                  className="flex-1 py-1.5 transition-colors"
                  style={{ background: assuranceSaisie === "taux" ? INK : "#fff", color: assuranceSaisie === "taux" ? PAPER : INK }}
                >
                  % du capital
                </button>
                <button
                  onClick={() => setAssuranceSaisie("montant")}
                  className="flex-1 py-1.5 transition-colors"
                  style={{ background: assuranceSaisie === "montant" ? INK : "#fff", color: assuranceSaisie === "montant" ? PAPER : INK }}
                >
                  Montant fixe €/mois
                </button>
                <button
                  onClick={() => setAssuranceSaisie("totalDuree")}
                  className="flex-1 py-1.5 transition-colors"
                  style={{ background: assuranceSaisie === "totalDuree" ? INK : "#fff", color: assuranceSaisie === "totalDuree" ? PAPER : INK }}
                >
                  Total sur la durée
                </button>
              </div>

              {assuranceSaisie === "taux" ? (
                <>
                  <label className="flex items-center text-[12px] font-medium mb-1.5" style={{ color: INK }}>
                    Mode de calcul
                    <Tip text="Capital initial : cotisation fixe sur toute la durée. Capital restant dû : cotisation dégressive, souvent moins chère au total." />
                  </label>
                  <div className="flex rounded-md overflow-hidden border text-[12px] mb-3" style={{ borderColor: LINE }}>
                    <button
                      onClick={() => setModeAssurance("initial")}
                      className="flex-1 py-1.5 transition-colors"
                      style={{ background: modeAssurance === "initial" ? INK : "#fff", color: modeAssurance === "initial" ? PAPER : INK }}
                    >
                      Capital initial
                    </button>
                    <button
                      onClick={() => setModeAssurance("restant")}
                      className="flex-1 py-1.5 transition-colors"
                      style={{ background: modeAssurance === "restant" ? INK : "#fff", color: modeAssurance === "restant" ? PAPER : INK }}
                    >
                      Capital restant dû
                    </button>
                  </div>
                  <NumberField label="Taux d'assurance annuel" value={tauxAssurance} onChange={setTauxAssurance} step={0.01} suffix="%" />
                </>
              ) : assuranceSaisie === "montant" ? (
                <NumberField label="Montant mensuel de l'assurance" value={assuranceMontantFixe} onChange={setAssuranceMontantFixe} step={1} suffix="€/mois" />
              ) : (
                <NumberField
                  label="Coût total de l'assurance sur la durée"
                  value={assuranceMontantTotal}
                  onChange={setAssuranceMontantTotal}
                  step={100}
                  suffix="€"
                  tooltip="Montant total communiqué par ta banque pour toute la durée du prêt. Réparti automatiquement en mensualité constante (montant ÷ nombre de mois)."
                />
              )}
            </div>

            <div className="text-[11.5px] rounded-md px-2.5 py-1.5" style={{ background: PAPER_ALT, color: "#6B6455" }}>
              Assurance ce mois-ci : <strong style={{ color: INK }}>{euros(assuranceMensuelle, decimals)}</strong>
            </div>

            <div className="pt-1 border-t" style={{ borderColor: LINE }}>
              <NumberField label="Âge de l'emprunteur" value={age} onChange={setAge} step={1} suffix="ans" tooltip="Utilisé uniquement pour situer ton taux par rapport aux repères de marché ci-dessous." />
            </div>

            <div className="rounded-md border p-2.5" style={{ borderColor: LINE, background: PAPER_ALT }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#6B6455" }}>
                  Repères de marché
                </span>
                <button onClick={() => setEditingBaremes((v) => !v)} className="flex items-center gap-1 text-[11px] hover:opacity-70" style={{ color: INK }}>
                  {editingBaremes ? <Check size={12} /> : <Pencil size={12} />}
                  {editingBaremes ? "Terminer" : "Modifier"}
                </button>
              </div>

              {!baremesLoaded ? (
                <div className="text-[11px]" style={{ color: "#8A8371" }}>
                  Chargement...
                </div>
              ) : positionMarche ? (
                <div className="text-[12px] mb-1.5">
                  <span className="font-medium" style={{ color: positionMarche.color }}>
                    {positionMarche.label}
                  </span>
                  <span style={{ color: "#8A8371" }}>
                    {" "}
                    · {brackedApplicable.label} : délégation {brackedApplicable.delegationMin}–{brackedApplicable.delegationMax}%, groupe {brackedApplicable.groupeMin}–{brackedApplicable.groupeMax}%
                  </span>
                </div>
              ) : (
                <div className="text-[11px] mb-1.5" style={{ color: "#8A8371" }}>
                  Repère non applicable hors saisie "% du capital".
                </div>
              )}

              {editingBaremes && (
                <div className="space-y-2 mt-2 pt-2 border-t" style={{ borderColor: LINE }}>
                  {baremes.map((b) => (
                    <div key={b.id} className="grid grid-cols-5 gap-1 items-center text-[11px]">
                      <span style={{ color: INK }}>{b.label}</span>
                      {["delegationMin", "delegationMax", "groupeMin", "groupeMax"].map((f) => (
                        <input
                          key={f}
                          type="number"
                          step="0.01"
                          value={b[f]}
                          onChange={(e) => updateBaremeField(b.id, f, e.target.value)}
                          className="w-full px-1 py-1 rounded border text-[11px] text-right bg-white"
                          style={{ borderColor: LINE, color: INK }}
                        />
                      ))}
                    </div>
                  ))}
                  <div className="grid grid-cols-4 gap-1 text-[10px] text-center" style={{ color: "#8A8371" }}>
                    <span></span>
                    <span>Délég. min</span>
                    <span>Délég. max</span>
                    <span>Groupe min/max</span>
                  </div>
                  <input
                    type="text"
                    value={baremeSource}
                    onChange={(e) => saveBaremes(baremes, e.target.value, baremeDate)}
                    placeholder="Source des repères"
                    className="w-full px-2 py-1 rounded border text-[11px] bg-white"
                    style={{ borderColor: LINE, color: INK }}
                  />
                  <div className="flex items-center justify-between">
                    <input
                      type="date"
                      value={baremeDate}
                      onChange={(e) => saveBaremes(baremes, baremeSource, e.target.value)}
                      className="px-2 py-1 rounded border text-[11px] bg-white"
                      style={{ borderColor: LINE, color: INK }}
                    />
                    <button
                      onClick={() => saveBaremes(DEFAULT_BAREMES, DEFAULT_SOURCE, new Date().toISOString().slice(0, 10))}
                      className="flex items-center gap-1 text-[11px] hover:opacity-70"
                      style={{ color: "#8A8371" }}
                    >
                      <RefreshCw size={11} /> Défaut
                    </button>
                  </div>
                </div>
              )}

              <div className="text-[10px] mt-1.5" style={{ color: "#A39C8C" }}>
                Source : {baremeSource} · mis à jour le {new Date(baremeDate).toLocaleDateString("fr-FR")}
              </div>
            </div>

            <NumberField label="Frais de dossier / garantie" value={fraisDossier} onChange={setFraisDossier} step={50} suffix="€" tooltip="Utilisés uniquement pour estimer le TAEG indicatif." />

            <div className="rounded-md border p-2.5" style={{ borderColor: LINE, background: PAPER_ALT }}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wide" style={{ color: "#6B6455" }}>
                  Remboursement anticipé
                </span>
                <button onClick={() => setRembActif((v) => !v)} className="flex items-center gap-1 text-[11px] hover:opacity-70" style={{ color: INK }}>
                  {rembActif ? <Check size={12} /> : <Plus size={12} />}
                  {rembActif ? "Désactiver" : "Activer"}
                </button>
              </div>

              {rembActif && (
                <div className="space-y-2 mt-2">
                  <NumberField label="Montant versé" value={rembMontant} onChange={setRembMontant} step={500} suffix="€" />
                  <NumberField
                    label="À l'échéance n°"
                    value={rembEcheance}
                    onChange={setRembEcheance}
                    step={1}
                    min={1}
                    tooltip="Numéro du mois auquel le versement est effectué (1 = première échéance)."
                  />
                  <div className="flex rounded-md overflow-hidden border text-[11px]" style={{ borderColor: LINE }}>
                    <button
                      onClick={() => setRembMode("duree")}
                      className="flex-1 py-1.5 transition-colors"
                      style={{ background: rembMode === "duree" ? INK : "#fff", color: rembMode === "duree" ? PAPER : INK }}
                    >
                      Raccourcir la durée
                    </button>
                    <button
                      onClick={() => setRembMode("mensualite")}
                      className="flex-1 py-1.5 transition-colors"
                      style={{ background: rembMode === "mensualite" ? INK : "#fff", color: rembMode === "mensualite" ? PAPER : INK }}
                    >
                      Réduire la mensualité
                    </button>
                  </div>
                  {rembEcheance > dureeAnnees * 12 && (
                    <div className="text-[11px]" style={{ color: ROSE }}>
                      Échéance au-delà de la durée du prêt : sans effet.
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={reset}
              className="w-full flex items-center justify-center gap-1.5 text-[12px] font-medium rounded-md py-2 border transition-colors hover:opacity-80"
              style={{ borderColor: LINE, color: INK }}
            >
              <RotateCcw size={13} /> Réinitialiser
            </button>
          </div>

          {/* Résultats */}
          <div className="space-y-5">
            {/* Répartition + graphique */}
            <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">
              <div className="rounded-xl border p-3" style={{ borderColor: LINE, background: "#fff" }}>
                <div className="text-[11px] font-medium uppercase tracking-wide mb-1" style={{ color: "#8A8371" }}>
                  Répartition du coût
                </div>
                <div style={{ height: 150 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" innerRadius={38} outerRadius={60} paddingAngle={2}>
                        {pieData.map((e, i) => (
                          <Cell key={i} fill={e.color} stroke="#fff" strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => euros(v, decimals)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-1 mt-1">
                  {pieData.map((e) => (
                    <div key={e.name} className="flex items-center justify-between text-[11.5px]">
                      <span className="flex items-center gap-1.5" style={{ color: INK }}>
                        <span className="inline-block w-2 h-2 rounded-full" style={{ background: e.color }} />
                        {e.name}
                      </span>
                      <span style={{ color: "#8A8371" }}>{euros(e.value, decimals)}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border p-3" style={{ borderColor: LINE, background: "#fff" }}>
                <div className="text-[11px] font-medium uppercase tracking-wide mb-2" style={{ color: "#8A8371" }}>
                  Capital restant dû vs intérêts cumulés
                </div>
                <div style={{ height: 190 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke={LINE} strokeDasharray="2 4" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#8A8371" }} interval="preserveStartEnd" axisLine={{ stroke: LINE }} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#8A8371" }} axisLine={false} tickLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                      <Tooltip formatter={(v) => euros(v, decimals)} contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: LINE }} />
                      <Area type="monotone" dataKey="Capital restant dû" stroke={INK} fill={INK} fillOpacity={0.12} strokeWidth={1.5} />
                      <Area type="monotone" dataKey="Intérêts cumulés" stroke={ROSE} fill={ROSE} fillOpacity={0.12} strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {rembResultats && (
              <div className="rounded-xl border p-4" style={{ borderColor: LINE, background: "#fff" }}>
                <h2 className="text-[13px] font-semibold mb-3" style={{ color: INK, fontFamily: "Georgia, serif" }}>
                  Impact du remboursement anticipé (échéance n°{remboursementAnticipeInfo.echeance})
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                      Intérêts économisés
                    </div>
                    <div className="text-[15px] font-semibold tabular-nums" style={{ color: GREEN }}>
                      {euros(rembResultats.interetsEconomises, decimals)}
                    </div>
                  </div>
                  {rembMode === "duree" ? (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                        Gain de durée
                      </div>
                      <div className="text-[15px] font-semibold" style={{ color: INK }}>
                        {formatDureeMois(rembResultats.gainDureeMois)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                        Nouvelle mensualité
                      </div>
                      <div className="text-[15px] font-semibold tabular-nums" style={{ color: INK }}>
                        {euros(rembResultats.nouvelleMensualite, decimals)}
                      </div>
                    </div>
                  )}
                  <div>
                    <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                      Nouveau coût total
                    </div>
                    <div className="text-[15px] font-semibold tabular-nums" style={{ color: INK }}>
                      {euros(rembResultats.nouveauCoutTotal, decimals)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] uppercase tracking-wide" style={{ color: "#8A8371" }}>
                      Nouvelle durée réelle
                    </div>
                    <div className="text-[15px] font-semibold" style={{ color: INK }}>
                      {formatDureeMois(rembResultats.dureeReelleMois)}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tableau */}
            <div className="rounded-xl border overflow-hidden" style={{ borderColor: LINE, background: "#fff" }}>
              <div className="flex items-center justify-between gap-2 p-3 border-b" style={{ borderColor: LINE }}>
                <div className="flex items-center gap-1.5 rounded-md border px-2 py-1 flex-1 max-w-xs" style={{ borderColor: LINE }}>
                  <Search size={13} style={{ color: "#8A8371" }} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filtrer par année ou n° échéance"
                    className="w-full text-[12px] outline-none bg-transparent"
                    style={{ color: INK }}
                  />
                </div>
                <div className="flex gap-2">
                  <button onClick={exportCSV} className="flex items-center gap-1.5 text-[12px] font-medium rounded-md px-2.5 py-1.5 border hover:opacity-80" style={{ borderColor: LINE, color: INK }}>
                    <Download size={13} /> CSV
                  </button>
                  <button onClick={() => window.print()} className="flex items-center gap-1.5 text-[12px] font-medium rounded-md px-2.5 py-1.5 border hover:opacity-80" style={{ borderColor: LINE, color: INK }}>
                    <Printer size={13} /> Imprimer
                  </button>
                </div>
              </div>

              <div className="max-h-[520px] overflow-y-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead className="sticky top-0 z-10" style={{ background: PAPER_ALT }}>
                    <tr>
                      {["N°", "Date", "CRD début", "Intérêts", "Assurance", "Capital amorti", "Mensualité", "CRD fin"].map((h) => (
                        <th key={h} className="text-right px-3 py-2 font-medium first:text-left" style={{ color: "#6B6455", borderBottom: `1px solid ${LINE}` }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredYears.map((y) => {
                      const collapsed = collapsedYears.has(y.annee);
                      return (
                        <React.Fragment key={y.annee}>
                          <tr
                            onClick={() => toggleYear(y.annee)}
                            className="cursor-pointer select-none"
                            style={{ background: PAPER_ALT }}
                          >
                            <td colSpan={2} className="px-3 py-1.5 font-semibold flex items-center gap-1" style={{ color: INK }}>
                              {collapsed ? <ChevronRight size={13} /> : <ChevronDown size={13} />} {y.annee}
                            </td>
                            <td className="px-3 py-1.5 text-right" style={{ color: "#8A8371" }}>—</td>
                            <td className="px-3 py-1.5 text-right" style={{ color: ROSE }}>{euros(y.totalInterets, decimals)}</td>
                            <td className="px-3 py-1.5 text-right" style={{ color: GOLD }}>{euros(y.totalAssurance, decimals)}</td>
                            <td className="px-3 py-1.5 text-right" style={{ color: GREEN }}>{euros(y.totalCapital, decimals)}</td>
                            <td className="px-3 py-1.5 text-right" style={{ color: "#8A8371" }}>—</td>
                            <td className="px-3 py-1.5 text-right font-medium" style={{ color: INK }}>{euros(y.crdFin, decimals)}</td>
                          </tr>
                          {!collapsed &&
                            y.rows.map((r, idx) => {
                              const pct = r.crdFin / capital;
                              const isCurrent = schedule[currentMonthIdx] && r.n === schedule[currentMonthIdx].n;
                              const isRemboursement = r.versementAnticipe > 0;
                              return (
                                <tr
                                  key={r.n}
                                  className="relative hover:brightness-95"
                                  style={{
                                    background: isRemboursement ? "rgba(75,122,91,0.14)" : isCurrent ? "#FBF2DE" : idx % 2 === 0 ? "#fff" : "#FCFBF8",
                                  }}
                                >
                                  <td className="px-3 py-1.5" style={{ color: "#8A8371" }}>{r.n}</td>
                                  <td className="px-3 py-1.5" style={{ color: INK }}>{formatDate(r.date)}</td>
                                  <td className="px-3 py-1.5 text-right" style={{ color: "#6B6455" }}>{euros(r.crdDebut, decimals)}</td>
                                  <td className="px-3 py-1.5 text-right" style={{ color: ROSE }}>{euros(r.interets, decimals)}</td>
                                  <td className="px-3 py-1.5 text-right" style={{ color: GOLD }}>{euros(r.assurance, decimals)}</td>
                                  <td className="px-3 py-1.5 text-right" style={{ color: GREEN }}>{euros(r.capitalAmorti, decimals)}</td>
                                  <td className="px-3 py-1.5 text-right font-medium" style={{ color: INK }}>
                                    {euros(r.mensualiteTotale, decimals)}
                                    {isRemboursement && (
                                      <div className="text-[9.5px] font-normal whitespace-nowrap" style={{ color: GREEN }}>
                                        dont {euros(r.versementAnticipe, decimals)} versement anticipé
                                      </div>
                                    )}
                                  </td>
                                  <td className="px-3 py-1.5 text-right" style={{ color: "#6B6455" }}>
                                    <span className="relative z-10">{euros(r.crdFin, decimals)}</span>
                                    <span
                                      className="absolute left-0 top-0 bottom-0"
                                      style={{ width: `${pct * 100}%`, background: INK, opacity: 0.04 }}
                                    />
                                  </td>
                                </tr>
                              );
                            })}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide opacity-60">{label}</div>
      <div className="text-[15px] font-medium">{value}</div>
      {sub && <div className="text-[10px] opacity-50">{sub}</div>}
    </div>
  );
}
