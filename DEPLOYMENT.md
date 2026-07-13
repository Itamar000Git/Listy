# Listy — Deployment Guide

Target platform: **Vercel** (not GitHub Pages — this app has server-side API
routes using the Firebase Admin SDK, which a static host like GitHub Pages
cannot run).

## 1. Environment variables to set in Vercel

Vercel → Project → Settings → Environment Variables. Names only — never paste
real values into a chat, issue tracker, or commit them to git. Copy each
value directly from Firebase Console / your own domain into Vercel's UI.

Set these for **Production**, **Preview**, and **Development** environments
(Vercel lets you scope per-environment; Preview deployments need their own
values too, or auth/Firestore calls will fail on every PR preview).

### Public (browser-exposed — safe, but still just paste, don't screenshot/share)
```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_APP_ID
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_APP_URL
```
`NEXT_PUBLIC_APP_URL` — your production URL with no trailing slash, e.g.
`https://listy.vercel.app` or your custom domain. For **Preview**
deployments, either leave it unset (the app falls back to
`window.location.origin` automatically) or set it per-preview if you want
predictable email-action links from preview builds too.

### Private (server-only — mark sensitive in Vercel if offered)
```
FIREBASE_PROJECT_ID
FIREBASE_CLIENT_EMAIL
FIREBASE_PRIVATE_KEY
```
`FIREBASE_PRIVATE_KEY` — paste the full PEM value from the service-account
JSON, including the `\n` escape sequences, wrapped in quotes. Vercel's env
var editor preserves this correctly; don't manually strip the `\n`s.

## 2. Firebase Console — Authorized Domains checklist

Firebase Auth rejects sign-in/email-action flows from origins not on this
list. Firebase Console → Authentication → Settings → Authorized domains:

- [ ] Add your Vercel production domain (e.g. `listy.vercel.app`, or your
      custom domain if you attach one — e.g. `listy.yourfamily.com`).
- [ ] If you plan to test from Vercel **preview** deployment URLs
      (`*.vercel.app` per-branch URLs), add each one you actually use, or
      accept that auth won't work on preview URLs until added — Vercel
      preview URLs are per-deployment and can't be wildcarded in Firebase's
      list.
- [ ] `localhost` is present by default for local dev — leave it.
- [ ] Remove any placeholder/test domains you no longer use.

## 3. Vercel project setup checklist

- [ ] Connect the GitHub repository to a new Vercel project (or run
      `vercel link` locally if you prefer the CLI — this requires your own
      Vercel login, which I cannot perform on your behalf).
- [ ] Framework preset: Next.js (auto-detected).
- [ ] Root directory: repository root (this project isn't in a monorepo
      subfolder).
- [ ] Add all environment variables from §1 above.
- [ ] Trigger a deployment (push to the connected branch, or `vercel deploy`
      from the CLI).
- [ ] Confirm the build succeeds in the Vercel dashboard's build log.

## 4. Post-deploy verification checklist

Once deployed, work through this by hand:

- [ ] Visit the production URL — `/` redirects to `/login`.
- [ ] Register a fresh test family account — confirms `NEXT_PUBLIC_FIREBASE_*`
      vars and the Admin SDK (`FIREBASE_*` vars) are both correctly wired.
- [ ] Check the verification email's link points at your production domain,
      not `localhost` or Firebase's default handler domain — confirms
      `NEXT_PUBLIC_APP_URL` is set correctly.
- [ ] Create a profile, a list, a task, complete it — exercises every API
      route end-to-end against production Firestore.
- [ ] Firebase Console → Firestore → confirm the `firestore.rules` you have
      locally match what's published (Console → Firestore Database → Rules
      tab) — Vercel deployment does **not** publish Firestore rules; that's
      a separate, manual Firebase Console/CLI step (see the rules-publish
      step from the earlier stage's report).
- [ ] Delete the test family account's Firebase Auth user afterward
      (Firebase Console → Authentication) if you don't want test data
      lingering in production.

## 5. What Vercel does *not* handle

- Firestore Security Rules — publish those via Firebase Console or
  `firebase deploy --only firestore:rules`, independently of any Vercel
  deploy.
- Firebase project creation, Authentication provider setup, Firestore
  database creation — one-time Firebase Console setup, already completed
  per your earlier message.
