// Calcul du tableau d'amortissement et des indicateurs associés (mensualité, coût total, TAEG).

/**
 * Résout le taux périodique i tel que :
 *   Σ cashflows[k] / (1+i)^(k+1) = capitalNet
 * via Newton-Raphson (avec repli sur une bissection si Newton diverge).
 * cashflows[k] est le flux du mois k+1 (k = 0..n-1).
 */
function solveActuarialMonthlyRate(cashflows, capitalNet) {
  const n = cashflows.length;
  if (n === 0 || capitalNet <= 0) return 0;

  const npv = (i) => {
    let v = -capitalNet;
    for (let k = 0; k < n; k++) v += cashflows[k] / Math.pow(1 + i, k + 1);
    return v;
  };
  const dnpv = (i) => {
    let v = 0;
    for (let k = 0; k < n; k++) v += (-(k + 1) * cashflows[k]) / Math.pow(1 + i, k + 2);
    return v;
  };

  let i = 0.005;
  for (let iter = 0; iter < 100; iter++) {
    const f = npv(i);
    if (Math.abs(f) < 1e-9) return i;
    const fp = dnpv(i);
    if (fp === 0) break;
    let next = i - f / fp;
    if (!Number.isFinite(next) || next <= -0.999) next = i / 2;
    if (Math.abs(next - i) < 1e-12) return next;
    i = next;
  }

  // Repli : bissection sur une plage large si Newton-Raphson n'a pas convergé
  let lo = -0.01;
  let hi = 1;
  let flo = npv(lo);
  for (let iter = 0; iter < 200; iter++) {
    const mid = (lo + hi) / 2;
    const fmid = npv(mid);
    if (Math.abs(fmid) < 1e-9) return mid;
    if ((fmid > 0) === (flo > 0)) {
      lo = mid;
      flo = fmid;
    } else {
      hi = mid;
    }
  }
  return (lo + hi) / 2;
}

/**
 * TAEG actuariel indicatif : résout le taux périodique (mensuel) qui égalise le
 * capital effectivement mis à disposition (capital emprunté moins frais de dossier
 * payés au déblocage) avec la somme des mensualités actualisées, puis l'annualise
 * en taux proportionnel composé ((1+i)^12 - 1). C'est la méthode actuarielle du
 * code de la consommation (approche IRR), pas une simple moyenne des coûts.
 *
 * Reste indicatif : un TAEG réglementaire suit des conventions strictes sur les
 * dates exactes (mois normalisé de 30,41666 jours), les frais inclus/exclus et
 * l'arrondi (à la décimale inférieure), qui ne sont pas répliquées ici.
 */
function computeTaegActuariel(schedule, capital, fraisDossier) {
  if (!schedule.length || capital <= 0) return 0;
  const cashflows = schedule.map((r) => r.mensualiteTotale);
  const capitalNet = capital - (fraisDossier || 0);
  if (capitalNet <= 0) return 0;
  const monthlyRate = solveActuarialMonthlyRate(cashflows, capitalNet);
  return (Math.pow(1 + monthlyRate, 12) - 1) * 100;
}

export function computeAmortization(p) {
  const n = Math.round(p.dureeAnnees * 12);
  const t = p.taux / 100 / 12;
  const M = n <= 0 ? 0 : t === 0 ? p.capital / n : (p.capital * t) / (1 - Math.pow(1 + t, -n));
  const assuranceMensuelleInitiale = p.assuranceSaisie === "montant" ? p.assuranceMontantFixe : (p.capital * p.tauxAssurance) / 100 / 12;

  let crd = p.capital;
  const rows = [];
  let sumInterets = 0;
  let sumAssurance = 0;
  const start = p.dateDebut ? new Date(p.dateDebut) : new Date();

  const assuranceMensuelleTotalDuree = n > 0 ? p.assuranceMontantTotal / n : 0;

  for (let i = 1; i <= n; i++) {
    const interets = crd * t;
    const assurance =
      p.assuranceSaisie === "montant"
        ? p.assuranceMontantFixe
        : p.assuranceSaisie === "totalDuree"
        ? assuranceMensuelleTotalDuree
        : p.modeAssurance === "initial"
        ? assuranceMensuelleInitiale
        : (crd * p.tauxAssurance) / 100 / 12;
    let capitalAmorti = M - interets;
    if (i === n) capitalAmorti = crd;
    const crdDebut = crd;
    crd = Math.max(0, crd - capitalAmorti);
    sumInterets += interets;
    sumAssurance += assurance;
    const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
    rows.push({
      n: i,
      date: d,
      annee: d.getFullYear(),
      crdDebut,
      interets,
      assurance,
      capitalAmorti,
      mensualiteTotale: capitalAmorti + interets + assurance,
      crdFin: crd,
    });
  }

  const yearMap = new Map();
  for (const r of rows) {
    if (!yearMap.has(r.annee)) yearMap.set(r.annee, []);
    yearMap.get(r.annee).push(r);
  }
  const yearsArr = Array.from(yearMap.entries()).map(([annee, rs]) => ({
    annee,
    rows: rs,
    totalInterets: rs.reduce((a, r) => a + r.interets, 0),
    totalCapital: rs.reduce((a, r) => a + r.capitalAmorti, 0),
    totalAssurance: rs.reduce((a, r) => a + r.assurance, 0),
    crdFin: rs[rs.length - 1].crdFin,
  }));

  const coutCredit = sumInterets + sumAssurance + (p.fraisDossier || 0);
  const coutAnnualiseSimplifie = p.capital > 0 && p.dureeAnnees > 0 ? (coutCredit / p.capital / p.dureeAnnees) * 100 : 0;
  const taeg = computeTaegActuariel(rows, p.capital, p.fraisDossier);

  return {
    schedule: rows,
    mensualiteHorsAssurance: M,
    mensualiteTotale: rows.length ? rows[0].mensualiteTotale : 0,
    totalInterets: sumInterets,
    totalAssurance: sumAssurance,
    coutTotal: coutCredit,
    taeg,
    coutAnnualiseSimplifie,
    years: yearsArr,
  };
}
