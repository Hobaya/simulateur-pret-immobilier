import { describe, it, expect } from "vitest";
import { computeAmortization } from "./amortization.js";

const baseParams = {
  capital: 100000,
  taux: 3,
  dureeAnnees: 20,
  tauxAssurance: 0,
  modeAssurance: "initial",
  assuranceSaisie: "taux",
  assuranceMontantFixe: 0,
  fraisDossier: 0,
  dateDebut: "2024-01-01",
};

describe("computeAmortization — prêt de référence 100 000 € à 3 % sur 20 ans, sans assurance", () => {
  const r = computeAmortization(baseParams);

  it("génère 240 échéances mensuelles", () => {
    expect(r.schedule.length).toBe(240);
  });

  it("calcule une mensualité hors assurance conforme à la formule d'annuité classique (~554,60 €)", () => {
    // Référence indépendante : mensualités bancaires standard pour 100k€/3%/20 ans.
    expect(r.mensualiteHorsAssurance).toBeCloseTo(554.5976, 3);
  });

  it("amortit intégralement le capital (capital restant dû final = 0)", () => {
    const last = r.schedule[r.schedule.length - 1];
    expect(last.crdFin).toBe(0);
  });

  it("répartit les mensualités en capital + intérêts pour un total d'intérêts proche de la référence (~33 103 €)", () => {
    expect(r.totalInterets).toBeCloseTo(33103.42, 0);
  });

  it("garde une mensualité totale stable d'un mois sur l'autre (hors assurance dégressive)", () => {
    const mensualites = r.schedule.slice(0, -1).map((row) => row.mensualiteTotale);
    const first = mensualites[0];
    for (const m of mensualites) {
      expect(m).toBeCloseTo(first, 2);
    }
  });

  it("la somme du capital amorti sur toutes les échéances égale le capital emprunté", () => {
    const totalCapitalAmorti = r.schedule.reduce((sum, row) => sum + row.capitalAmorti, 0);
    expect(totalCapitalAmorti).toBeCloseTo(baseParams.capital, 6);
  });
});

describe("computeAmortization — cas limites", () => {
  it("taux à 0 % : la mensualité est le capital divisé par le nombre de mois, sans intérêts", () => {
    const r = computeAmortization({ ...baseParams, taux: 0 });
    expect(r.mensualiteHorsAssurance).toBeCloseTo(100000 / 240, 6);
    expect(r.totalInterets).toBe(0);
    expect(r.schedule[r.schedule.length - 1].crdFin).toBe(0);
  });

  it("capital à 0 € : aucune division par zéro, mensualités et TAEG nuls", () => {
    const r = computeAmortization({ ...baseParams, capital: 0 });
    expect(Number.isFinite(r.mensualiteHorsAssurance)).toBe(true);
    expect(r.mensualiteHorsAssurance).toBe(0);
    expect(Number.isFinite(r.taeg)).toBe(true);
    expect(r.taeg).toBe(0);
  });

  it("l'arrondi de la dernière échéance absorbe le résidu flottant sans laisser de solde négatif ni positif", () => {
    const r = computeAmortization({ ...baseParams, capital: 133337.77, taux: 4.123, dureeAnnees: 17 });
    const last = r.schedule[r.schedule.length - 1];
    expect(last.crdFin).toBe(0);
    expect(last.capitalAmorti).toBeGreaterThan(0);
  });
});

describe("computeAmortization — assurance emprunteur", () => {
  it("mode capital initial : la cotisation d'assurance est constante sur toute la durée", () => {
    const r = computeAmortization({ ...baseParams, tauxAssurance: 0.34, modeAssurance: "initial" });
    const assurances = r.schedule.map((row) => row.assurance);
    expect(new Set(assurances.map((a) => a.toFixed(6))).size).toBe(1);
    expect(assurances[0]).toBeCloseTo((100000 * 0.34) / 100 / 12, 6);
  });

  it("mode capital restant dû : la cotisation décroît avec le capital restant dû", () => {
    const r = computeAmortization({ ...baseParams, tauxAssurance: 0.34, modeAssurance: "restant" });
    const first = r.schedule[0].assurance;
    const last = r.schedule[r.schedule.length - 1].assurance;
    expect(last).toBeLessThan(first);
  });

  it("montant fixe : la cotisation ne dépend ni du capital ni du temps", () => {
    const r = computeAmortization({ ...baseParams, assuranceSaisie: "montant", assuranceMontantFixe: 42 });
    expect(r.schedule.every((row) => row.assurance === 42)).toBe(true);
  });

  it("total sur la durée : la cotisation mensuelle est le montant total divisé par le nombre d'échéances", () => {
    const r = computeAmortization({ ...baseParams, assuranceSaisie: "totalDuree", assuranceMontantTotal: 15000 });
    const attendu = 15000 / 240;
    expect(r.schedule.every((row) => Math.abs(row.assurance - attendu) < 1e-9)).toBe(true);
  });

  it("total sur la durée : la somme des cotisations mensuelles reconstitue le montant total saisi", () => {
    const r = computeAmortization({ ...baseParams, assuranceSaisie: "totalDuree", assuranceMontantTotal: 15000 });
    expect(r.totalAssurance).toBeCloseTo(15000, 6);
  });

  it("total sur la durée : équivaut à un montant fixe égal à total ÷ durée (même mensualité, même TAEG)", () => {
    const total = computeAmortization({ ...baseParams, assuranceSaisie: "totalDuree", assuranceMontantTotal: 12000 });
    const fixe = computeAmortization({ ...baseParams, assuranceSaisie: "montant", assuranceMontantFixe: 12000 / 240 });
    expect(total.mensualiteTotale).toBeCloseTo(fixe.mensualiteTotale, 6);
    expect(total.taeg).toBeCloseTo(fixe.taeg, 6);
  });
});

describe("computeAmortization — TAEG actuariel", () => {
  it("sans frais annexes, le TAEG actuariel converge vers le taux nominal (assurance nulle)", () => {
    const r = computeAmortization({ ...baseParams, taux: 3, tauxAssurance: 0, fraisDossier: 0 });
    // Sans assurance ni frais, l'IRR des flux doit reconstituer le taux nominal composé.
    expect(r.taeg).toBeCloseTo(3.0, 1);
  });

  it("le TAEG augmente avec l'ajout de frais de dossier, à taux nominal et assurance identiques", () => {
    const sansFrais = computeAmortization({ ...baseParams, fraisDossier: 0 });
    const avecFrais = computeAmortization({ ...baseParams, fraisDossier: 3000 });
    expect(avecFrais.taeg).toBeGreaterThan(sansFrais.taeg);
  });

  it("le TAEG augmente avec l'ajout d'une assurance emprunteur", () => {
    const sansAssurance = computeAmortization({ ...baseParams, tauxAssurance: 0 });
    const avecAssurance = computeAmortization({ ...baseParams, tauxAssurance: 0.34 });
    expect(avecAssurance.taeg).toBeGreaterThan(sansAssurance.taeg);
  });

  it("le TAEG augmente avec une assurance saisie en total sur la durée", () => {
    const sansAssurance = computeAmortization({ ...baseParams, assuranceSaisie: "totalDuree", assuranceMontantTotal: 0 });
    const avecAssurance = computeAmortization({ ...baseParams, assuranceSaisie: "totalDuree", assuranceMontantTotal: 15000 });
    expect(avecAssurance.taeg).toBeGreaterThan(sansAssurance.taeg);
  });
});

describe("computeAmortization — remboursement anticipé", () => {
  const ECHEANCE = 60;
  const MONTANT = 20000;

  it("le capital restant dû juste après le versement baisse exactement du montant versé, en plus de l'amortissement normal", () => {
    const sansRemb = computeAmortization(baseParams);
    const avecRemb = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "duree" },
    });
    const crdFinSansRemb = sansRemb.schedule[ECHEANCE - 1].crdFin;
    const crdFinAvecRemb = avecRemb.schedule[ECHEANCE - 1].crdFin;
    expect(crdFinSansRemb - crdFinAvecRemb).toBeCloseTo(MONTANT, 6);
  });

  it("l'échéance du versement porte le montant versé et le met en évidence via versementAnticipe > 0", () => {
    const r = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "duree" },
    });
    const ligne = r.schedule[ECHEANCE - 1];
    expect(ligne.versementAnticipe).toBeCloseTo(MONTANT, 6);
    // Aucune autre échéance ne porte de versement anticipé
    expect(r.schedule.filter((row) => row.versementAnticipe > 0)).toHaveLength(1);
  });

  it('mode "raccourcir la durée" : mensualité hors assurance inchangée, mais le prêt se termine avant le terme initial', () => {
    const sansRemb = computeAmortization(baseParams);
    const avecRemb = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "duree" },
    });
    // Mensualité (hors versement ponctuel) identique avant le versement
    expect(avecRemb.schedule[0].mensualiteTotale).toBeCloseTo(sansRemb.schedule[0].mensualiteTotale, 6);
    expect(avecRemb.schedule.length).toBeLessThan(sansRemb.schedule.length);
    expect(avecRemb.schedule[avecRemb.schedule.length - 1].crdFin).toBe(0);
  });

  it('mode "réduire la mensualité" : la durée totale reste égale à la durée initiale', () => {
    const sansRemb = computeAmortization(baseParams);
    const avecRemb = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "mensualite" },
    });
    expect(avecRemb.schedule.length).toBe(sansRemb.schedule.length);
    expect(avecRemb.schedule[avecRemb.schedule.length - 1].crdFin).toBe(0);
  });

  it('mode "réduire la mensualité" : la mensualité diminue strictement après le versement', () => {
    const r = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "mensualite" },
    });
    const avant = r.schedule[ECHEANCE - 2].mensualiteTotale;
    const apres = r.schedule[ECHEANCE].mensualiteTotale; // première échéance suivant le versement
    expect(apres).toBeLessThan(avant);
    expect(r.remboursementAnticipeInfo.nouvelleMensualite).toBeCloseTo(apres, 6);
  });

  it("un remboursement anticipé réduit toujours le total des intérêts payés par rapport au scénario sans versement", () => {
    const sansRemb = computeAmortization(baseParams);
    const avecRembDuree = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "duree" },
    });
    const avecRembMensualite = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "mensualite" },
    });
    expect(avecRembDuree.totalInterets).toBeLessThan(sansRemb.totalInterets);
    expect(avecRembMensualite.totalInterets).toBeLessThan(sansRemb.totalInterets);
  });

  it("remboursementAnticipeInfo est renseigné avec l'échéance et le montant appliqué", () => {
    const r = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: ECHEANCE, mode: "duree" },
    });
    expect(r.remboursementAnticipeInfo).not.toBeNull();
    expect(r.remboursementAnticipeInfo.echeance).toBe(ECHEANCE);
    expect(r.remboursementAnticipeInfo.montantApplique).toBeCloseTo(MONTANT, 6);
    expect(r.remboursementAnticipeInfo.dureeReelleMois).toBe(r.schedule.length);
  });

  it("un versement supérieur au capital restant dû est plafonné, sans passer le solde en négatif", () => {
    const enormeMontant = 999999999;
    const r = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: enormeMontant, echeance: ECHEANCE, mode: "duree" },
    });
    const ligne = r.schedule[ECHEANCE - 1];
    expect(ligne.crdFin).toBe(0);
    expect(ligne.versementAnticipe).toBeLessThan(enormeMontant);
    expect(r.schedule.length).toBe(ECHEANCE);
  });

  it("une échéance de versement hors plage (au-delà de la durée) est ignorée, comportement identique à sans versement", () => {
    const sansRemb = computeAmortization(baseParams);
    const avecEcheanceInvalide = computeAmortization({
      ...baseParams,
      remboursementAnticipe: { montant: MONTANT, echeance: 9999, mode: "duree" },
    });
    expect(avecEcheanceInvalide.schedule.length).toBe(sansRemb.schedule.length);
    expect(avecEcheanceInvalide.totalInterets).toBeCloseTo(sansRemb.totalInterets, 6);
    expect(avecEcheanceInvalide.remboursementAnticipeInfo).toBeNull();
  });

  it("sans remboursementAnticipe fourni, le comportement est strictement identique à avant (non-régression)", () => {
    const a = computeAmortization(baseParams);
    const b = computeAmortization({ ...baseParams, remboursementAnticipe: null });
    expect(b.schedule.length).toBe(a.schedule.length);
    expect(b.totalInterets).toBeCloseTo(a.totalInterets, 9);
    expect(b.taeg).toBeCloseTo(a.taeg, 9);
    expect(b.remboursementAnticipeInfo).toBeNull();
  });
});
