# NEXA Prompt Agent 🚀
## User Acceptance Testing (UAT) Specifications & Test Report

This document defines the User Acceptance Testing (UAT) criteria, functional specifications, test cases, and formal execution results for the **NEXA Prompt Agent** web application.

---

## 📋 1. UAT Scope & Application Features
The NEXA Prompt Agent is a stateless prompt-engineering workspace that converts raw prompts into production-grade LLM system instructions using the **4-D Methodology** (Deconstruct, Diagnose, Develop, Deliver).

### Tested Modules & Components:
1. **Landing Page (`/`):** Public greeting card layout detailing the 4-D process and holding a local, stateful, read-only Interactive Demo Widget representing Marketing and database engineering presets.
2. **Gateway Gate (`/sign-in`):** Unified authenticating dashboard presenting live GitHub App logs and a "Bypass Sandbox Session" action for developers.
3. **Core Workspace (`/app`):** Active workspace utilizing the server-side `@google/genai` (Gemini) client with automated mode routers.
4. **Self-Governing Complexity Auto-router:** Character constraints (>120 char) or domain keywords contextually routing prompts into BASIC (single step) or DETAIL (2-3 targeted question panels) workflows.
5. **Real-time Sanitizers:** Live client and server-side security regex scanners filtering threats (SQL injections, XSS scripts, Prompt/System override scripts, Path traversals, host SSRF webhook links) and appending defensive guidelines.
6. **Syntax Highlighter (PrismJS):** Interactive responsive text container with manual code select option override and automatic reactive language parsing (Python, SQL, YAML, Javascript, JSON, Bash, Markdown).
7. **Volume Meter Analytics (Recharts):** Custom historical token counters tracking outputs and plotting trend graphs showing volume, model platform, date/timestamp, and domain in customized tooltip overlays.
8. **Feedback logs:** FIFO anonymous feedback repository with a 50-item stack bound, rating verification, comment character clamping, and embedded email sanitization filters.

---

## 🎯 2. UAT Acceptance Criteria
- **UAT-AC-01:** The Landing Page must be fully responsive, displaying consistent display styling, and allowing users to experiment with structural scenarios without calling live server endpoints.
- **UAT-AC-02:** Development bypass protocols should mock authorization states seamlessly when live client application secrets are pending configurations.
- **UAT-AC-03:** Prompt submissions must be parsed dynamically to trigger DETAIL questionnaires if technical complexities or length thresholds are satisfied.
- **UAT-AC-04:** Malicious string sequences must be caught preemptively, resulting in targeted safety directives inside synthesized promts rather than application breaks or server-side execution failures.
- **UAT-AC-05:** Synthesized responses must show highlighted code matching their detected programming syntax language, and users can manually override formatting on-the-fly.
- **UAT-AC-06:** Token consumption trend analytics must load dynamically on successful generation inside Recharts panels, mapping dates and metrics in hover-state overlays.
- **UAT-AC-07:** The feedback submission system should block malformed rating scopes or bad email address formats before queuing data into the 50-item memory buffer.

---

## 🧪 3. Detailed UAT Test Cases

| Test ID | Module | Scenario description | Expected Outcome | Status |
| :--- | :--- | :--- | :--- | :---: |
| **TC-01** | Landing Page | Interact with read-only demo options (Marketing Campaign & database engineering) on the homepage. | Widget shifts state; selecting DB scenario presents question forms which submit results to generate a mock code prompt locally. | **PASS** |
| **TC-02** | Gateway | Click "Bypass Sandbox Login" on `/sign-in` gateway. | Bypasses GitHub OAuth, provisions secure JWT session cookie server-side, and routes client into `/app`. | **PASS** |
| **TC-03** | Auto-Router | Submit short raw string ("write a greeting") with "Auto" mode selected. | Router flags prompt as low complexity and executes the **BASIC** (fast one-step) optimization. | **PASS** |
| **TC-04** | Auto-Router | Submit code request containing technical keyword "react database setup" or text >120 characters. | Router automatically triggers **DETAIL** questionnaire panels, prompting for explicit user constraints. | **PASS** |
| **TC-05** | Security | Submit query with SQL injection terms ("SELECT * FROM users; DROP TABLE logs") or traversals. | Scan is triggered, injecting specialized protective instructions (Anti-SQL-injection guidelines) inside output prompts. | **PASS** |
| **TC-06** | Syntax Highlight | Generate Python structure containing definitions (`def ...`) or sql datasets. | Parser detects code pattern automatically, applying Tomorrow dark visual themes via **PrismJS** with correct highlighted styles. | **PASS** |
| **TC-07** | Dashboard Chart | Verify token dashboard metrics after obtaining optimized compilation. | Token, Word, and Character counters update, and **Recharts** charts plot a line illustrating the newly compiled prompt metrics. | **PASS** |
| **TC-08** | Feedback | Submit upvote with malformed contact email sequence (`contact@domain` with no root suffix) in text. | System rejects package with `400 Bad Request` and returns structured explanation to correct email formatting. | **PASS** |
| **TC-09** | Feedback | Submit multiple valid ratings sequentially to test capacity bounds. | System stores entries securely as anonymous database nodes, truncating oldest members if array size exceeds the `50` FIFO limit. | **PASS** |
| **TC-10** | Error Recovery | Simulated AI response returns with minor syntax anomalies (e.g. nested lists, stray commas, backticks). | Stateless recovery engine processes failure, cleans trailing anomalies, and reconstructs flawless semantic outputs. | **PASS** |

---

## 🛸 4. Programmatic Verification Logs

To verify these results objectively, the E2E verification test suite is executed, comprising **51 automated test cases** that assert state machine routing, security sanitizers, syntax identifier matching, and chart dataset structures.

```bash
$ npx vitest run tests/

 RUN  v4.1.7  /app/applet

  ✓ tests/uat_scenarios.test.ts (9 tests) 28 ms
  ✓ tests/nexa.test.ts (42 tests) 42 ms

 Test Files  2 passed (2)
      Tests  51 passed (51)
   Start at  07:50:22
   Duration  2.44s
```

*Verification Result: **UAT Completed Successfully. Zero defects detected. Applet meets all user acceptances and compliance goals.***
