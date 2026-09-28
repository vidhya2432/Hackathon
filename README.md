# BharatFin AI

**Your money. Your language. Your AI copilot.**

A responsive web application and mobile-friendly prototype of an AI financial companion for ordinary Indian users — students, first-salary professionals, Tier-2/3 families, and gig workers.

On wide screens it uses a desktop dashboard layout with a persistent sidebar and spacious content area. On phones and narrow screens it automatically switches to the compact bottom-navigation layout.

This is **educational budgeting guidance**, not official financial, tax, credit, or investment advice. Financial data comes from user input and the connected persistence API. No bank credentials are collected.

## Run locally

### Full-stack mode (Node.js + SQLite)

Install Node.js 18+ first, then run:

```powershell
npm install
npm start
```

Open **http://localhost:8080/**. The server exposes:

- `GET /api/health`
- `GET /api/health/ready`
- `GET /api/state?userId=demo-user`
- `PUT /api/state?userId=demo-user`
- `GET /api/integrations?userId=demo-user`
- `PUT /api/integrations/{provider}/consent?userId=demo-user`
- `GET /api/reminders?userId=demo-user&days=30`
- `POST /api/auth/signup`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `DELETE /api/account`
- `POST /api/metrics?userId=demo-user`
- `GET /api/metrics/summary?days=30`
- `GET /api/resources`
- `GET /api/partners/offers`

State is persisted in `bharatfin.sqlite`. The database keeps the complete UI state for compatibility and also mirrors transactions, goals, and bills into normalized tables for future reporting and integrations. The browser still keeps a local copy so the UI remains usable if the API is temporarily unavailable.

Integration endpoints currently support explicit consent tracking and bill reminders. They do not connect to a bank or payment provider until a compliant production adapter is configured.

Authentication uses salted `scrypt` password hashes and expiring bearer sessions. Account deletion removes application data, normalized records, integration consent, sessions, and the user record.

Pilot metrics record only route and feature usage metadata; they never record income, transaction amounts, merchant names, or other financial values.

Partner and resource endpoints are informational only. Offers are not endorsements, personalized recommendations, or financial advice, and no user data is shared with partners by default.

For deployment, set `PORT` through the hosting platform and run `npm start`. Back up `bharatfin.sqlite` while the service is stopped or using SQLite's online backup tooling. The readiness endpoint can be used by a load balancer or process manager.

Voice input (Web Speech API) needs `http://localhost` (not a `file://` page).

In PowerShell, from this folder:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\serve.ps1
```

The script will automatically choose the first free local port starting at 8080, so if 8080 is already in use it will switch to the next available one (for example `http://localhost:8081/`).

Create an account from the sign-up screen. Your financial profile starts empty and is populated only from your entries.

## What to show judges

1. **Home** — the user’s live income, expenses, surplus, and wellness indicator (not a credit score).
2. **Can I afford this?** — Try ₹3,000 phone; see surplus, EMI, and risk — not a blunt YES/NO.
3. **AI Copilot** — English, Tamil, or Tanglish:
   - `How much did I spend this month?`
   - `Indha maasam naan evlo selavu pannirukken?`
   - `₹3000 phone vaangalaama?`
   - `EMI eppo pay pannanum?`
4. **Voice** — large mic; recognized text appears before processing.
5. **Insights** — charts plus spending-change sentences and a stress forecast.

## Architecture

User → text/voice → speech-to-text → language detect → intent + amount extraction → local financial data → category classification → cash-flow math → pressure forecast → explainable reply (what / why / do) → text + speech.

The Node.js service provides the SQLite persistence layer. AI/NLP still runs **on-device** with deterministic rules so the project works offline and is easy to evaluate.

## Privacy

The app uses SQLite as the primary persistence layer and localStorage as an offline fallback. Privacy settings include consent, PIN lock concept, and delete-all-records.
