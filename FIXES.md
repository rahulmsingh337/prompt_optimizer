# Prompify — Additive Fixes

All changes here are **purely additive**. Nothing in the existing flow was removed or broken.
Copy the files below into your project root and test. Zero changes to your existing
`LandingPage.tsx`, `OptimizerApp.tsx`, `SignInPage.tsx`, or `PlexusBackground.tsx`.

---

## What was fixed

### Fix 1 — `@google.com` blanket bypass removed (security)

**Problem:** Any user with a `@google.com` email got unlimited tokens — a security hole visible in source code.

**Change in `server.ts`:** Removed `|| cleanEmail.endsWith("@google.com")` from all 5 bypass checks.
Only the exact `OWNER_EMAIL` env var now grants the unlimited bypass.

**Breaking change:** None. If your email is a `@google.com` address, add it to `OWNER_EMAIL` in your Vercel env vars.

---

### Fix 2 — Token limits now persist on Vercel (infrastructure)

**Problem:** `daily_tokens.json` writes to disk, which is read-only in Vercel serverless functions.
Rate limiting was silently broken in production.

**Change in `server.ts`:**
- Added `firebase-admin` integration at the top (dynamic import, no crash if not installed).
- `checkAndDeductTokens` is now `async`. It tries Firestore first, falls back to the JSON file.
- `/api/token-status` is now `async` with the same Firestore-first pattern.
- Three route-level pre-checks now use `await checkAndDeductTokens(...)`.

**What you need to do:**
1. Install `firebase-admin`: `npm install firebase-admin`
2. Create a Firebase service account key in Firebase Console → Project Settings → Service Accounts.
3. Add `FIREBASE_SERVICE_ACCOUNT_JSON` to your Vercel environment variables (see `.env.example`).
4. Add Firestore security rules for the new collections (see below).

**Firestore collections added:**
- `token_limits/{userId}` — daily token tracking per user
- `free_trials/{sessionToken}` — anonymous trial tracking (TTL 24h)
- `shared_prompts/{shareId}` — shared prompt data (TTL 30 days)

**Firestore security rules to add:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Existing rules stay as-is
    
    // Token limits — server-only (no client read/write)
    match /token_limits/{userId} {
      allow read, write: if false; // Admin SDK only
    }
    
    // Free trials — server-only
    match /free_trials/{token} {
      allow read, write: if false; // Admin SDK only
    }
    
    // Shared prompts — public read, server write
    match /shared_prompts/{shareId} {
      allow read: if true;         // Anyone can view a share link
      allow write: if false;       // Admin SDK only
    }
  }
}
```

---

### Fix 3 — Free trial (3 optimizations without sign-in)

**New files:**
- `src/components/FreeTrialBanner.tsx` — the trial UI component
- Updated `src/App.tsx` — adds `FreeTrialBanner` on landing, adds `/p/:shareId` route

**How it works:**
- On first visit, a session token is generated and stored in `sessionStorage`.
- The optimizer runs up to 3 times using `POST /api/optimize` with `sessionToken` in the body instead of `userId`.
- After 3 uses, the user sees a sign-in prompt.
- The trial count is tracked in Firestore `free_trials/{sessionToken}` (or in-memory as fallback).

**New server routes:**
- `GET /api/trial-status?sessionToken=<token>` — returns trial count
- Trial logic inside `POST /api/optimize` — if no `userId`, uses `sessionToken` path

---

### Fix 4 — Shareable prompt URLs

**New files:**
- `src/components/ShareButton.tsx` — drop-in button for OptimizerApp output panel
- `src/components/SharedPromptView.tsx` — full-page view for `/p/:shareId`
- Updated `src/App.tsx` — routes `/p/:shareId` to `SharedPromptView`

**New server routes:**
- `POST /api/share` — saves an optimized prompt, returns `{ shareId, url: "/p/<id>" }`
- `GET /api/share/:shareId` — fetches shared prompt (no auth)

**To add the Share button to OptimizerApp output panel:**
```tsx
// In OptimizerApp.tsx, import at the top:
import ShareButton from "./ShareButton";

// In the output panel JSX, next to your existing Copy button:
<ShareButton result={result} queryState={queryState} />
```
`queryState` is already in scope in `OptimizerApp` — it's the `QueryState` object
you send to `/api/optimize`.

---

## Files to copy into your project

| Source (this package) | Destination in your repo | Action |
|---|---|---|
| `server.ts` | `server.ts` | Replace |
| `src/App.tsx` | `src/App.tsx` | Replace |
| `src/components/FreeTrialBanner.tsx` | `src/components/FreeTrialBanner.tsx` | New file |
| `src/components/ShareButton.tsx` | `src/components/ShareButton.tsx` | New file |
| `src/components/SharedPromptView.tsx` | `src/components/SharedPromptView.tsx` | New file |
| `.env.example` | `.env.example` | Replace |

**Do NOT copy over:** `LandingPage.tsx`, `OptimizerApp.tsx`, `SignInPage.tsx`, `PlexusBackground.tsx`, `firebase.ts`, `types.ts` — these are unchanged.

---

## npm install

```bash
npm install firebase-admin
```

That's the only new dependency. `firebase-admin` is a server-side package used only in `server.ts`.

---

## Environment variables to add in Vercel

| Variable | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Stringified JSON of your Firebase service account key |

Existing variables (`GEMINI_API_KEY`, `APP_URL`, `AUTH_SECRET`, `OWNER_EMAIL`) stay the same.

**Important:** Change your `OWNER_EMAIL` to your exact email address (e.g. `you@gmail.com`).
The old `@google.com` wildcard is gone.

---

## Testing locally

```bash
# 1. Add FIREBASE_SERVICE_ACCOUNT_JSON to .env (or use gcloud ADC)
# 2. npm install firebase-admin
# 3. npm run dev
# 4. Visit http://localhost:3000 — you should see the trial bar at the bottom
# 5. Submit a prompt without signing in — should work up to 3 times
# 6. Click "Share link" on an optimized result — should generate /p/<id>
# 7. Visit the /p/<id> URL directly — should show SharedPromptView without auth
```

---

## What was NOT changed

- `LandingPage.tsx` — not modified
- `OptimizerApp.tsx` — not modified (add `ShareButton` manually, see above)
- `SignInPage.tsx` — not modified
- `PlexusBackground.tsx` — not modified
- `firebase.ts` — not modified
- `types.ts` — not modified
- `vite.config.ts` — not modified
- `vercel.json` — not modified
- `package.json` scripts — not modified (only new dep: `firebase-admin`)
