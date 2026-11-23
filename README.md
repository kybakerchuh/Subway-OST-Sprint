# Subway OST Sprint

A 3D endless subway runner built with React, TypeScript, Tailwind CSS, Three.js, and Firebase, combining Subway Surfers-inspired track verticality and power-ups with **Algebra 1 OST Playbook** math challenges.

## Features

- **3D Endless Runner Gameplay**: Three-lane track switching, ramps onto elevated train roofs, oncoming express trains, low barriers/overhead signals, Inspector chase stumbles, Hoverboard shields, Paint Jetpack, Super Sneakers, Coin Magnet, and 2x Multiplier.
- **Algebra 1 OST Playbook Topics**: 11 dedicated topic banks (30 questions each) plus Mixed Playbook review, with vertical fraction and superscript exponent rendering, visual graphs/tables, hints, and step-by-step explanations.
- **O-S-T Word Hunt & Timed Quizzes**: Answer questions on crashes to revive, every 30 seconds of survival, or upon collecting all **O-S-T** track letters for bonus points and coins.
- **Progression & Challenges**: 30x Score Multiplier missions, unlockable OST mastery Hoverboards, shuffling Weekly Challenges (alternating OST question goals and coin targets), Google Sign-In cloud sync, and global leaderboards.

## Running Locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Scripts

- `npm run dev` — Start the Vite development server on port 3000
- `npm run build` — Build the production static bundle into `dist/`
- `npm run preview` — Preview the production build locally
- `npm run lint` — Run TypeScript typechecking (`tsc --noEmit`)
- `npm run lint:rules` — Validate `firestore.rules` with `@firebase/eslint-plugin-security-rules`

## Deploying on GitHub Pages

This repository is configured with a relative Vite base (`base: './'`) and an automated workflow at `.github/workflows/deploy.yml`:

1. Push the repository to GitHub on the `main` branch.
2. In your GitHub repository, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
3. Wait for the **Deploy Subway OST Sprint to GitHub Pages** workflow to finish, then open the published `github.io` URL.

### Enabling Google Sign-In on GitHub Pages

Guest play, Weekly Challenges, Hoverboards, and high scores work automatically via browser storage on any host. To enable **Google Sign-In** and global leaderboard syncing from your GitHub Pages domain:

1. Open the [Firebase Console](https://console.firebase.google.com/) for your project.
2. Go to **Authentication → Settings → Authorized domains**.
3. Click **Add domain** and add `<your-github-username>.github.io` (without `https://` or repository path).

## Controls

- **Move Left / Right**: Swipe Left/Right, `A`/`D`, or `Left`/`Right` Arrow
- **Jump**: Swipe Up, `W`, `Up` Arrow, or `Space`
- **Roll / Fast Drop**: Swipe Down, `S`, or `Down` Arrow
- **Hoverboard Shield**: Double-tap screen or press `H`
- **Pause**: `P` or `Escape`
