# Nibash

A private, 100% offline personal finance app for iOS and Android — expense/income
tracking, budgets, shopping lists, debt tracking, savings goals, bills, subscriptions,
and local backup/restore. No login, no cloud sync, no backend, no analytics. Everything
lives in local SQLite on the device. Built Bangladesh-first (BDT/৳, bKash/Nagad mobile
wallets, Bangla + English mixed text).

## Tech stack

React Native + Expo (TypeScript) + `expo-sqlite`. See [CLAUDE.md](CLAUDE.md) for the full
architecture rundown (persistence, security, notifications, backup) and
[PRD.md](PRD.md) / [PLAN.md](PLAN.md) for the product spec and build history.

## Getting started

```bash
cd app
npm install
```

```bash
npm run ios       # open in iOS Simulator
```

```bash
npm run android    # open in Android emulator
```

```bash
npm run web        # browser — fastest loop for UI-only changes (no SQLite on web)
```

```bash
npx tsc --noEmit   # typecheck
```

## Building a distributable APK

The app is native-only for anything touching SQLite, notifications, biometrics, or
contacts, so it needs a real build (not Expo Go) to install outside development. From
`app/`, using [EAS Build](https://docs.expo.dev/build/introduction/):

```bash
npx eas-cli build --platform android --profile preview
```

This produces a signed `.apk` you can host and sideload directly — no Play Store
required. iOS distribution outside the App Store is far more restricted by Apple (see
[CLAUDE.md](CLAUDE.md) / project notes); there is currently no equivalent `.ipa`
side-loading flow set up.

## Project status

Feature-complete per [PLAN.md](PLAN.md) — Parts A through E (persistence, security,
notifications, backup/export, per-module polish, ledger-derived account balances, and a
first-run welcome tour) are all implemented and verified.
