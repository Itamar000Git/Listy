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

## Audio assets

`/public/audio/mark_task.mp3` plays when an individual task is marked
completed; `/public/audio/end_list.mp3` plays once when the whole list
is completed and the celebration triggers. Both are wired up with
Safari unlock, mute persistence, no-overlap, and fail-silent-on-error
behavior (`src/lib/audio/sound-manager.ts`). To replace either file,
overwrite it at the same path — no code changes needed, the filenames
are the interface.

(`/public/audio/applause.mp3` and `/public/audio/celebration.mp3` are
leftover synthesized placeholder tones from an earlier stage and are
no longer referenced by the app.)

## Further documentation

- [`DEPLOYMENT.md`](./DEPLOYMENT.md) — Vercel environment variables,
  Firebase Authorized Domains, and the full deploy checklist.
- [`QA-CHECKLIST.md`](./QA-CHECKLIST.md) — manual real-device testing
  checklist (Safari audio, RTL, offline, two-device sync, etc.) that
  must be run by hand before a public family test.
- [`firestore.rules`](./firestore.rules) — the Security Rules source of
  truth, with inline rationale comments.
