# Simulateur de prêt immobilier

Application React (Vite + Tailwind) : calcul de mensualités, tableau d'amortissement,
comparateur de scénarios et repères de marché pour l'assurance emprunteur.

## Lancer en local

```bash
npm install
npm run dev
```

Ouvre ensuite l'URL affichée dans le terminal (en général http://localhost:5173).

## Vérifier les calculs avant mise en ligne

La fonction de calcul principale est `computeAmortization` dans `src/App.jsx`.
Avant de publier l'appli, compare au moins un scénario simple (ex. 200 000 € à 3,5 %
sur 20 ans) avec un tableau Excel ou un simulateur bancaire de référence pour
t'assurer que les montants correspondent.

## Déployer en ligne

### Option A — Netlify (glisser-déposer, sans compte requis pour un test rapide)
```bash
npm run build
```
Puis va sur https://app.netlify.com/drop et glisse le dossier `dist/` généré.
Une URL publique est attribuée immédiatement (un compte gratuit permet de la
rendre permanente et d'avoir un nom de domaine personnalisé).

### Option B — Vercel (recommandé pour un usage durable)
```bash
npm install -g vercel
vercel
```
Suis les instructions (connexion à ton compte Vercel), puis `vercel --prod`
pour la mise en ligne définitive.

### Option C — GitHub Pages
1. Pousse ce dossier vers un dépôt GitHub
2. Ajoute `base: '/nom-du-repo/'` dans `vite.config.js`
3. Utilise l'action GitHub `actions/deploy-pages` ou le package `gh-pages`

## Stockage local

Les repères de marché (fourchettes de taux d'assurance par tranche d'âge,
éditables dans l'appli) sont sauvegardés dans le `localStorage` du navigateur —
propre à chaque utilisateur et à chaque appareil, sans base de données.
