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

  // Remboursement anticipé (facultatif) : un versement ponctuel à une échéance donnée,
  // qui soit raccourcit la durée (mensualité inchangée), soit réduit la mensualité des
  // échéances suivantes (durée contractuelle inchangée). N'affecte en rien le calcul du
  // TAEG actuariel lui-même (computeTaegActuariel, non modifié) : celui-ci continue de
  // travailler sur les mensualités réellement payées, versement compris.
  const remb = p.remboursementAnticipe;
  const rembActif = !!(remb && remb.montant > 0 && Number.isInteger(remb.echeance) && remb.echeance >= 1 && remb.echeance <= n);
  const rembMode = remb && remb.mode === "mensualite" ? "mensualite" : "duree";
  let mensualiteCourante = M;
  let remboursementAnticipeInfo = null;

  for (let i = 1; i <= n; i++) {
    if (crd <= 1e-9) break;

    const interets = crd * t;
    const assurance =
      p.assuranceSaisie === "montant"
        ? p.assuranceMontantFixe
        : p.assuranceSaisie === "totalDuree"
        ? assuranceMensuelleTotalDuree
        : p.modeAssurance === "initial"
        ? assuranceMensuelleInitiale
        : (crd * p.tauxAssurance) / 100 / 12;

    let capitalAmorti = mensualiteCourante - interets;
    if (capitalAmorti > crd) capitalAmorti = crd;
    if (capitalAmorti < 0) capitalAmorti = 0;
    const crdDebut = crd;
    crd = crd - capitalAmorti;

    let versementAnticipe = 0;
    if (rembActif && i === remb.echeance && crd > 1e-9) {
      versementAnticipe = Math.min(remb.montant, crd);
      crd = crd - versementAnticipe;
      if (rembMode === "mensualite") {
        const moisRestants = n - i;
        mensualiteCourante =
          moisRestants > 0 && crd > 1e-9
            ? t === 0
              ? crd / moisRestants
              : (crd * t) / (1 - Math.pow(1 + t, -moisRestants))
            : 0;
      }
      remboursementAnticipeInfo = {
        echeance: i,
        montantApplique: versementAnticipe,
        nouvelleMensualite: rembMode === "mensualite" ? mensualiteCourante : null,
      };
    }

    // Dernière échéance (terme contractuel n, ou solde soldé plus tôt en mode "durée") :
    // on absorbe tout résidu flottant pour finir exactement à zéro.
    if (i === n && crd > 1e-9) {
      capitalAmorti += crd;
      crd = 0;
    }
    if (crd < 1e-9) crd = 0;

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
      versementAnticipe,
      mensualiteTotale: capitalAmorti + interets + assurance + versementAnticipe,
      crdFin: crd,
    });
  }

  if (remboursementAnticipeInfo) {
    remboursementAnticipeInfo.dureeReelleMois = rows.length;
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
    remboursementAnticipeInfo,
  };
}

/**
 * Simulation de rachat de crédit : remboursement intégral du prêt actuel à une échéance
 * donnée, financé par un nouveau prêt à un taux (et éventuellement une durée) différents.
 *
 * IRA (indemnité de remboursement anticipé) calculée au plafond légal français
 * (art. R313-25 du Code de la consommation) : le plus petit montant entre 6 mois
 * d'intérêts au taux du prêt actuel et 3% du capital restant dû à l'échéance du rachat.
 * `p.iraManuelle` permet de saisir un montant différent (exonération légale ou négociation).
 *
 * Outil d'analyse indépendant : ne modifie ni ne réutilise le tableau d'amortissement
 * principal — il recalcule son propre scénario "si maintien" via computeAmortization,
 * sans toucher à la fonction elle-même.
 */
export function computeRachatCredit(p) {
  const baseline = computeAmortization({
    capital: p.capital,
    taux: p.taux,
    dureeAnnees: p.dureeAnnees,
    tauxAssurance: p.tauxAssurance,
    modeAssurance: p.modeAssurance,
    assuranceSaisie: p.assuranceSaisie,
    assuranceMontantFixe: p.assuranceMontantFixe,
    assuranceMontantTotal: p.assuranceMontantTotal,
    fraisDossier: p.fraisDossier,
    dateDebut: p.dateDebut,
  });

  const n = baseline.schedule.length;
  const echeance = Math.round(p.echeanceRachat);
  if (!(echeance >= 1) || echeance > n) return null;

  const ligneRachat = baseline.schedule[echeance - 1];
  const crdRachat = ligneRachat.crdFin;

  const plafondSixMoisInterets = 6 * crdRachat * (p.taux / 100 / 12);
  const plafondTroisPourcentCapital = crdRachat * 0.03;
  const iraLegale = Math.min(plafondSixMoisInterets, plafondTroisPourcentCapital);
  const iraAppliquee = p.iraManuelle != null && p.iraManuelle >= 0 ? p.iraManuelle : iraLegale;

  const fraisNouveauPret = p.fraisNouveauPret || 0;
  const nouveauCapital = crdRachat + iraAppliquee + fraisNouveauPret;

  const nouveauPret = computeAmortization({
    capital: nouveauCapital,
    taux: p.nouveauTaux,
    dureeAnnees: p.nouvelleDureeAnnees,
    tauxAssurance: p.tauxAssurance,
    modeAssurance: p.modeAssurance,
    assuranceSaisie: p.assuranceSaisie,
    assuranceMontantFixe: p.assuranceMontantFixe,
    assuranceMontantTotal: p.assuranceMontantTotal,
    fraisDossier: fraisNouveauPret,
    dateDebut: ligneRachat.date.toISOString().slice(0, 10),
  });

  const coutRestantSiMaintien = baseline.schedule
    .slice(echeance)
    .reduce((sum, r) => sum + r.interets + r.assurance, 0);
  const coutNouveauPret = nouveauPret.totalInterets + nouveauPret.totalAssurance;
  const gainNet = coutRestantSiMaintien - coutNouveauPret - iraAppliquee - fraisNouveauPret;

  return {
    echeanceRachat: echeance,
    crdRachat,
    iraLegale,
    iraAppliquee,
    nouveauCapital,
    nouvelleMensualite: nouveauPret.mensualiteTotale,
    dureeTotaleMois: echeance + nouveauPret.schedule.length,
    coutRestantSiMaintien,
    coutNouveauPret,
    gainNet,
    avantageux: gainNet > 0,
  };
}
