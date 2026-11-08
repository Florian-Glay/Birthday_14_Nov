# Les 21 ans de Lou

Une page d’anniversaire rose et vinyle, conçue pour le 14 novembre 2026. Les photos et vidéos optimisées défilent automatiquement sur une orbite elliptique. Les vidéos sont silencieuses, sans contrôles, en lecture automatique et en boucle.

## Tester en local

Installe les dépendances une première fois, puis lance le site :

```bash
npm install
npm run dev
```

Ouvre ensuite <http://127.0.0.1:4173>.

## Ajouter des souvenirs

Dépose les originaux dans `media/`, puis relance le serveur. `npm run dev` optimise automatiquement les fichiers nouveaux ou modifiés avant de démarrer.

- Les images deviennent des WebP de 1440 px maximum.
- Les vidéos deviennent des MP4 H.264 de 720p maximum, 30 images/s, sans audio et avec démarrage rapide.
- Les originaux restent dans `media/` et sont ignorés par Git.
- Les versions légères publiables sont écrites dans `media-web/`.

Pour lancer uniquement la conversion :

```bash
npm run prepare:media
```

Formats d’entrée pris en charge : JPG, JPEG, PNG, WebP, GIF, AVIF, MP4, WebM, MOV et M4V.

## Publier avec GitHub Pages

1. Pousse le dépôt sur GitHub.
2. Dans **Settings → Pages → Build and deployment**, choisis **GitHub Actions**.
3. Pousse une modification sur `main` ou `master`, ou lance manuellement le workflow **Déployer sur GitHub Pages**.

Le workflow régénère automatiquement la liste des médias optimisés avant chaque publication. Il faut donc versionner `media-web/`, mais pas `media/`.
