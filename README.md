# Listy — Visual Task Board for Families

A Hebrew/RTL, mobile-first web app where kids complete tasks by tapping
picture cards. Built with Next.js, Firebase (Auth + Firestore), and the
Firebase Admin SDK on trusted server routes.

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in real Firebase values — see below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

See `.env.example` for the full list. You need:
- 5 `NEXT_PUBLIC_FIREBASE_*` values from Firebase Console → Project
  settings → General → Your apps → Web app.
- 3 `FIREBASE_*` service-account values from Firebase Console → Project
  settings → Service accounts → Generate new private key.
- `NEXT_PUBLIC_APP_URL` — this deployment's own URL (falls back to the
  browser's origin automatically in local dev if left unset).

### Firestore Security Rules

`firestore.rules` in this repo is the source of truth — publish it via
Firebase Console → Firestore Database → Rules, or `firebase deploy
--only firestore:rules` (needs `firebase login` + a `firebase use
<project-id>` once). It is **not** deployed automatically by `npm run
build` or by Vercel.

## Scripts

```bash
npm run dev          # local dev server
npm run build        # production build
npm run lint          # ESLint
npm test              # Vitest (unit/component/api/security tests)
npm run test:rules    # Firestore Rules simulator tests — requires Java
                       # and the Firebase emulator; see the comment at
                       # the top of tests/security/firestore-rules.test.ts
```

## Audio assets — currently placeholders

`/public/audio/applause.mp3` and `/public/audio/celebration.mp3` are
**synthesized placeholder tones** (filtered noise + a sine-tone
arpeggio, generated with `ffmpeg`) — **not** real applause, crowd, or
trumpet recordings. No audio was downloaded or sourced from any
copyrighted material.

They're fully wired up (Safari unlock, mute persistence, no-overlap,
fail-silent-on-error) and functional as stand-ins, but should be
replaced with real royalty-free audio before a real family uses this
app. To replace them: **just overwrite the two files at the same
paths** — no code changes needed, the filenames are the interface.

## Further documentation

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Vercel environment variables,
  Firebase Authorized Domains, and the full deploy checklist.
- [`QA-CHECKLIST.md`](./QA-CHECKLIST.md) — manual real-device testing
  checklist (Safari audio, RTL, offline, two-device sync, etc.) that
  must be run by hand before a public family test.
- [`firestore.rules`](./firestore.rules) — the Security Rules source of
  truth, with inline rationale comments.
