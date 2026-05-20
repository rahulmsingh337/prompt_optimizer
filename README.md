# NEXA Prompt Agent 🚀

NEXA Prompt Agent is an end-to-end, production-ready full-stack web application designed to transform rough, ambiguous, or fragmented directives into highly structured, context-rich, copy-ready AI prompts.

---

## 📖 Table of Contents
1. [What It Does](#🔍-what-it-does)
2. [Methodology: The 4-D Pipeline](#🧠-methodology-the-4-d-pipeline)
3. [Product Shape & Interactive Read-Only Demo](#🎮-product-shape--interactive-read-only-demo)
4. [Tech Stack & Architecture](#💻-tech-stack-&-architecture)
5. [Environment Variables](#🔐-environment-variables)
6. [GitHub OAuth Registration Steps](#🔑-github-oauth-registration-steps)
7. [Running Locally](#🛠-running-locally)
8. [Vercel Deployment Steps](#☁-vercel-deployment-steps)
9. [CI/CD Pipelines (GitHub Actions)](#🤖-cicd-pipelines-github-actions)
10. [Go-Live Checklist](#🏁-go-live-checklist)

---

## 🔍 What It Does

NEXA bridges the gap between raw user thoughts and high-performance LLM prompt outputs. By analyzing target model constraints and applying state-of-the-art prompt design patterns, it ensures your prompts are optimized for platforms like **ChatGPT, Claude, Gemini, or other customizable LLMs**.

- **Auto-Complexity Detection:** The app dynamically crawls user request length and key terminologies to intelligently route standard request formats to `BASIC` mode while automatically promoting dense technical requests to `DETAIL` mode.
- **Two Modes of Optimization:**
  - **BASIC:** Perform a fast, one-step enhancement generating structural markdown instructions, key improvements, and techniques applied.
  - **DETAIL:** Guide the user through 2–3 context-aware, highly targeted clarifying questions (such as asking for database details on coding project scripts, or voice tone on copy drafts) before synthesizing the final master prompt.
- **No-Retention Security Guarantee:** No persistent database is used; your queries, answers, and synthesized outputs run in stateless memory servers and are never saved or indexed outside of client sessions.

---

## 🧠 Methodology: The 4-D Pipeline

Every prompt optimized by NEXA undergoes a strict logical progression:
1. **Deconstruct:** Breaking down raw user intent, isolating targeted outcomes and implicit parameters.
2. **Diagnose:** Identifying phrasing weaknesses, flat variables, passive guidelines, or format ambiguities.
3. **Develop:** Compiling state-of-the-art formatting frameworks, persona roles, delimitations, and contextual examples tailored to the selected Target AI requirements.
4. **Deliver:** Exporting raw copy-pasteable markdown strings accompanied by expert engineering tips.

---

## 🎮 Product Shape & Interactive Read-Only Demo

To provide a flawless visitor experience, NEXA divides the application routing into three responsive layers:
- **`'/'` Landing Page (Public):** Explains core features, diagrams the 4-D methodology, and showcases a **Read-Only Demo Workbench**. 
  - *No Live APIs called on Landing:* Visitors can play with two preset scenarios—one basic marketing campaign, and one complex database engineering pipeline. In the complex scenario, visitors can adjust answering parameters in real-time and click *"Submit Answers"* to see how the DETAIL layout generates code prompt formats.
- **`'/sign-in'` Page (Public):** Offers a single click **"Sign in with GitHub"** redirect and a high-convenience **"Bypass Sandbox Login"** designed to instantly provision mock sessions in trial environments where OAuth secrets are not yet compiled.
- **`'/app'` Dashboard (Protected):** Once logged in, grants access to the full AI-powered Prompt Optimizer workspace using your server-side Google GenAI (Gemini) keys.

---

## 💻 Tech Stack & Architecture

- **Frontend:** React 19 + Vite + Tailwind CSS v4. Responsive portfolio-grade dark theme designed for ultra-low latency. Smooth local pathname-routing without heavy router page flickers.
- **Backend:** Node.js Express Server. Mounts Vite development middleware concurrently inside local sandbox loops, and serves raw production assets when built.
- **AI Core:** Official `@google/genai` TypeScript SDK utilizing the fast, high-performance `gemini-3.5-flash` model.
- **Authentication:** Custom cryptographic cookies. Authenticated sessions are signed via JWT on the Express backend utilizing standard `jsonwebtoken` and verified securely on incoming endpoints.

---

## 🔐 Environment Variables

Create a `.env` file in your project root or configure these variables inside your hosting platform:

```env
# Google Gemini API key used server-side to execute optimization chains
GEMINI_API_KEY="AIzaSyYourGeminiApiKeyHere"

# Self-referential base URL used to securely route callback sessions
APP_URL="http://localhost:3000"

# Secret token used by JWT to sign session cookies
AUTH_SECRET="your_custom_32_character_cryptographic_secret"

# GitHub OAuth Application IDs (Required for live Github logs)
AUTH_GITHUB_ID="your_github_client_id"
AUTH_GITHUB_SECRET="your_github_client_secret"
```

---

## 🔑 GitHub OAuth Registration Steps

To enable the real "Sign in with GitHub" buttons, register two separate OAuth applications inside your GitHub developer profile:

### 1. Developer Environment (Local Host)
- **Homepage URL:** `http://localhost:3000`
- **Authorization Callback URL:** `http://localhost:3000/api/auth/callback/github`

### 2. Production Environment (Live Site)
- **Homepage URL:** `https://your-production-domain.com`
- **Authorization Callback URL:** `https://your-production-domain.com/api/auth/callback/github`

*Tip: If GitHub secrets are pending setup or you are reviewing a branch deployment, click the "Bypass Sandbox Login" button to immediately obtain active developer session keys!*

---

## 🛠 Running Locally

Follow these quick commands to fire up the system on your local machine:

```bash
# 1. Install all dependencies from package.json
npm install

# 2. Boot the development workspace in concurrent client-server mode
npm run dev
```

The workspace will launch at **`http://localhost:3000`** binding immediately to your Express listener and Vite assets!

---

## ☁ Vercel Deployment Steps

Deploying NEXA to Vercel takes less than two minutes:

1. **Push your code** to a GitHub repository.
2. Go to your **Vercel Dashboard** and click **"Add New Project"**.
3. Import your NEXA repository.
4. Set the **Framework Preset** to `Other` or `Vite`, or retain defaults.
5. In **Environment Variables**, add the values listed in the `.env` section above:
   - `GEMINI_API_KEY`
   - `APP_URL` (Set this to your newly generated Vercel production domain)
   - `AUTH_SECRET`
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
6. Click **Deploy**. Vercel will install dependencies, compile assets, and orchestrate server-side endpoints automatically!

---

## 🤖 CI/CD Pipelines (GitHub Actions)

Located under `/.github/workflows/quality_gate.yml`, our integrated workflow regulates quality assurance on every PR merge request:

- **Syntax Lint:** Instantly runs `npm run lint` (`tsc --noEmit`) to verify that imports, type declarations, properties, and React hooks compile error-free.
- **Production Compilation:** Runs `npm run build` representing Vite static production builds and bundling the Express `server.ts` into a self-contained, cold-start optimized `dist/server.cjs` via `esbuild`.

---

## 🏁 Go-Live Checklist

Verify these crucial check-points before shipping to high-volume production:
- [ ] Confirm `GEMINI_API_KEY` is configured securely in deployment Secrets (never checked in).
- [ ] Ensure `APP_URL` matches your active live custom domain.
- [ ] Check that `AUTH_SECRET` is set to a long, hard-to-brute-force string to prevent session tampering.
- [ ] Verify your GitHub OAuth App registration has the correct callback parameters matching your live website domains.
- [ ] Run `npm run build` locally once to assure CJS bundlers compile server components cleanly.
