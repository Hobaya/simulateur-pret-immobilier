import { describe, it, expect } from "vitest";
import { euros } from "./App.jsx";

// Vérifie le comportement de formatage sous-jacent à l'interrupteur "Afficher les centimes"
// (0 décimales quand il est désactivé, 2 quand il est activé — activé par défaut dans l'appli).
describe("euros — interrupteur centimes", () => {
  it("sans centimes (interrupteur désactivé) : aucune décimale, montant arrondi à l'euro", () => {
    expect(euros(1234.5, 0)).not.toMatch(/,/);
    expect(euros(70.83, 0)).toMatch(/^71\s?€$/);
  });

  it("avec centimes (interrupteur activé, comportement par défaut) : exactement 2 décimales", () => {
    expect(euros(1234.5, 2)).toMatch(/,50\s?€$/);
    expect(euros(70.83, 2)).toMatch(/,83\s?€$/);
  });

  it("un même montant affiché dans les deux modes ne diffère que par la précision affichée", () => {
    const montant = 1521.4;
    const sansCentimes = euros(montant, 0);
    const avecCentimes = euros(montant, 2);
    expect(sansCentimes).toMatch(/^1.521\s?€$/);
    expect(avecCentimes).toMatch(/^1.521,40\s?€$/);
  });

  it("un montant nul ou non défini ne fait pas planter le formatage", () => {
    expect(() => euros(undefined, 2)).not.toThrow();
    expect(euros(0, 2)).toMatch(/^0,00\s?€$/);
  });
});
