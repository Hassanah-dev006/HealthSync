# Community-Based Malaria Early Detection & Rapid Response System

A working full-stack platform built for the ALU BSc Software Engineering **Foundations Project**.

Community members and community health workers (CHWs) report symptoms through a simple,
multilingual (Kinyarwanda / English), icon-based interface. The system:

1. **Scores the risk** of each report (low / medium / high),
2. **Detects clusters** of cases in real time (possible local outbreaks), and
3. **Triggers a rapid-response referral** (SMS) to the nearest health facility for high-risk cases.

A live **dashboard** gives district health officials a map of reports, active outbreak clusters,
and referrals as they happen.

> This is a demonstration build. It does **not** diagnose malaria; it helps people decide when to
> seek a test and care, and helps officials see outbreaks earlier.

---

# Links
Scrum board: https://github.com/users/Hassanah-dev006/projects/4



## 1. Quick start

**Requirements:** [Node.js](https://nodejs.org) 18 or newer (tested on Node 22).

```bash
# 1. install dependencies
npm install

# 2. start the server (auto-creates + seeds the database on first run)
npm start
```

Then open in your browser:

| Page | URL | For |
|------|-----|-----|
| Landing | http://localhost:3000 | everyone |
| **Reporter app** | http://localhost:3000/report.html | community members & CHWs |
| **Dashboard** | http://localhost:3000/dashboard.html | district health officials |

That's it — no database server to install. Data is stored in a single SQLite file (`malaria.db`).

**Try it:** open two browser tabs — the reporter and the dashboard side by side. Submit a few
reports with fever + chills + headache near the same spot and watch a **cluster** appear on the
dashboard map, and a **referral** show up in the side panel. (On the reporter page, click the map
to set a location if your browser blocks geolocation.)

Other commands:

```bash
npm run seed     # (re)insert facilities, CHWs and a few demo reports
npm run reset    # wipe ALL data and re-seed from scratch
npm run dev      # start with auto-restart on file changes
```

---

## 2. What it does (mapped to the proposal)

| Proposal feature | Where it lives |
|------------------|----------------|
| Multilingual, icon-based symptom reporting | `public/report.html`, `public/js/report.js`, `public/js/i18n.js` |
| Risk scoring (low / medium / high) | `server/services/riskEngine.js` |
| Real-time geospatial cluster detection | `server/services/clustering.js` |
| Rapid-response SMS/call referral | `server/services/referral.js` |
| District dashboard with live cluster map | `public/dashboard.html`, `public/js/dashboard.js` |
| Health-facility & CHW registry | `server/seed/facilities.js`, `/api/facilities` |
| Database schema (matches the ERD) | `server/db.js` |
| Works on basic phones / poor networks (PWA) | `public/manifest.webmanifest`, `public/service-worker.js` |

---

## 3. Tech stack

- **Backend:** Node.js + Express (REST API)
- **Database:** SQLite via `better-sqlite3` (zero-config; swap for PostgreSQL + PostGIS in production)
- **Frontend:** Vanilla JavaScript + Leaflet maps (no build step — runs straight from the browser)
- **Messaging:** pluggable SMS gateway — **simulation mode** by default, optional **Twilio**
- **PWA:** web manifest + service worker for an installable, offline-capable app shell

This stack mirrors the proposal (React + Node + PostgreSQL + SMS gateway) while staying simple
enough to run with a single command. The frontend is plain JS so there is nothing to compile; if
your team prefers React, the same REST API works unchanged.

---

## 4. Project structure

```
malaria-platform/
├── server/
│   ├── index.js              # Express app: serves API + frontend
│   ├── config.js             # tunable thresholds (clustering, referral, SMS)
│   ├── db.js                 # SQLite schema (matches the ERD)
│   ├── loadEnv.js            # tiny .env loader (no dependency)
│   ├── services/
│   │   ├── riskEngine.js     # symptom -> low/medium/high
│   │   ├── clustering.js     # haversine + greedy outbreak detection
│   │   ├── referral.js       # nearest facility + SMS (sim/Twilio)
│   │   └── geo.js            # haversine distance + id helper
│   ├── routes/
│   │   ├── reports.js        # POST/GET /api/reports (the core pipeline)
│   │   └── dashboard.js      # /api/facilities, /clusters, /referrals, /stats
│   └── seed/
│       ├── facilities.js     # Kigali / Bumbogo / Kimironko seed data
│       └── run.js            # seed + reset runner
├── public/
│   ├── index.html            # landing
│   ├── report.html           # reporter app (multilingual, icon-based)
│   ├── dashboard.html        # health-official dashboard
│   ├── css/styles.css
│   ├── js/{i18n,api,report,dashboard}.js
│   ├── icons/                # PWA icons
│   ├── manifest.webmanifest
│   └── service-worker.js
├── package.json
├── .env.example
└── README.md
```

---

## 5. How the risk engine works

Rule-based and deliberately **conservative** — it rounds risk *up*, because a missed high-risk
case is far more costly than a false alarm (every medium/high case is sent to a CHW or facility to
confirm; the system never diagnoses on its own). See `server/services/riskEngine.js`.

- Any **danger sign** (e.g. convulsions, difficulty breathing) → **HIGH** immediately.
- **fever + chills + headache** (classic malaria pattern) → **HIGH**.
- Longer-lasting fever adds risk.
- Otherwise a weighted **score** bands the report into low / medium / high.

This is intentionally structured so it could later be replaced by a data-driven model without
touching the rest of the platform.

## 6. How clustering works

After every report, the system looks at recent medium/high reports within a time window
(default 7 days) and groups together those within a distance radius (default 1.5 km) using the
**haversine** formula. Any group reaching the minimum case count (default 3) is flagged as an
active **cluster** and drawn on the dashboard map. Thresholds live in `server/config.js`.

## 7. How referral works

For a high-risk report the system finds the **nearest health facility** (haversine), composes a
short **bilingual** referral message, and "sends" it.

- **Simulation mode (default):** the message is printed to the server console and stored in the
  database, so the whole rapid-response flow is demonstrable with no accounts or cost.
- **Twilio mode:** add Twilio credentials to a `.env` file (see `.env.example`) and real SMS are sent.

---

## 8. API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | service status + SMS mode |
| `GET`  | `/api/symptoms` | symptom catalogue (keys + danger flag) |
| `POST` | `/api/reports` | submit a report → returns risk + referral |
| `GET`  | `/api/reports?limit=` | recent reports with risk levels |
| `GET`  | `/api/facilities` | health facilities + CHWs |
| `GET`  | `/api/clusters` | active outbreak clusters |
| `GET`  | `/api/referrals` | rapid-response referrals |
| `GET`  | `/api/stats` | headline dashboard numbers |

**Example — submit a report:**

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{"symptoms":["fever","chills","headache"],"durationDays":3,
       "latitude":-1.9049,"longitude":30.1186,"village":"Bumbogo","name":"Mukamana"}'
```

Response:

```json
{
  "reportId": "rpt_ab5d6b7da8",
  "assessment": { "level": "high", "score": 10,
                  "reasons": ["Classic malaria pattern: fever + chills + headache"] },
  "referral": { "facilityId": "fac_bumbogo", "distanceKm": 0.02, "channel": "sms",
                "status": "sent", "message": "HIGH-RISK malaria alert: ..." }
}
```

---

## 9. Configuration

All optional — copy `.env.example` to `.env` to override. Key settings: `PORT`,
`CLUSTER_RADIUS_KM`, `CLUSTER_MIN_CASES`, `AUTO_REFER_LEVELS`, and the Twilio credentials.

---

## 10. Notes, limitations & next steps

- **Not a diagnosis tool.** It is triage + referral support only, as stated in the proposal's ethics section.
- **Kinyarwanda translations** in `public/js/i18n.js` are a solid starting point but should be
  reviewed by a native speaker before any real use.
- **Privacy:** for a real deployment, store identifiers separately, obtain consent, and coarsen
  location for clustering — see the proposal. This demo keeps data in a local SQLite file only.
- **Production path:** swap SQLite for PostgreSQL + PostGIS (same schema), put the SMS gateway in
  live mode, add authentication for the dashboard, and host behind HTTPS.
- The pilot metrics from the proposal (time-to-referral, referral completion, cluster latency) can
  all be computed from the `referrals` and `symptom_reports` tables.

---

*Community-Based Malaria Early Detection & Rapid Response System — ALU BSc Software Engineering, Foundations Project.*# Community-Based Malaria Early Detection & Rapid Response System

A working full-stack platform built for the ALU BSc Software Engineering **Foundations Project**.

Community members and community health workers (CHWs) report symptoms through a simple,
multilingual (Kinyarwanda / English), icon-based interface. The system:

1. **Scores the risk** of each report (low / medium / high),
2. **Detects clusters** of cases in real time (possible local outbreaks), and
3. **Triggers a rapid-response referral** (SMS) to the nearest health facility for high-risk cases.

A live **dashboard** gives district health officials a map of reports, active outbreak clusters,
and referrals as they happen.

> This is a demonstration build. It does **not** diagnose malaria; it helps people decide when to
> seek a test and care, and helps officials see outbreaks earlier.

---

## 1. Quick start

**Requirements:** [Node.js](https://nodejs.org) 18 or newer (tested on Node 22).

```bash
# 1. install dependencies
npm install

# 2. start the server (auto-creates + seeds the database on first run)
npm start
```

Then open in your browser:

| Page | URL | For |
|------|-----|-----|
| Landing | http://localhost:3000 | everyone |
| **Reporter app** | http://localhost:3000/report.html | community members & CHWs |
| **Dashboard** | http://localhost:3000/dashboard.html | district health officials |

That's it — no database server to install. Data is stored in a single SQLite file (`malaria.db`).

**Try it:** open two browser tabs — the reporter and the dashboard side by side. Submit a few
reports with fever + chills + headache near the same spot and watch a **cluster** appear on the
dashboard map, and a **referral** show up in the side panel. (On the reporter page, click the map
to set a location if your browser blocks geolocation.)

Other commands:

```bash
npm run seed     # (re)insert facilities, CHWs and a few demo reports
npm run reset    # wipe ALL data and re-seed from scratch
npm run dev      # start with auto-restart on file changes
```

---

## 2. What it does (mapped to the proposal)

| Proposal feature | Where it lives |
|------------------|----------------|
| Multilingual, icon-based symptom reporting | `public/report.html`, `public/js/report.js`, `public/js/i18n.js` |
| Risk scoring (low / medium / high) | `server/services/riskEngine.js` |
| Real-time geospatial cluster detection | `server/services/clustering.js` |
| Rapid-response SMS/call referral | `server/services/referral.js` |
| District dashboard with live cluster map | `public/dashboard.html`, `public/js/dashboard.js` |
| Health-facility & CHW registry | `server/seed/facilities.js`, `/api/facilities` |
| Database schema (matches the ERD) | `server/db.js` |
| Works on basic phones / poor networks (PWA) | `public/manifest.webmanifest`, `public/service-worker.js` |

---

## 3. Tech stack

- **Backend:** Node.js + Express (REST API)
- **Database:** SQLite via `better-sqlite3` (zero-config; swap for PostgreSQL + PostGIS in production)
- **Frontend:** Vanilla JavaScript + Leaflet maps (no build step — runs straight from the browser)
- **Messaging:** pluggable SMS gateway — **simulation mode** by default, optional **Twilio**
- **PWA:** web manifest + service worker for an installable, offline-capable app shell

This stack mirrors the proposal (React + Node + PostgreSQL + SMS gateway) while staying simple
enough to run with a single command. The frontend is plain JS so there is nothing to compile; if
your team prefers React, the same REST API works unchanged.

---

## 4. Project structure

```
malaria-platform/
├── server/
│   ├── index.js              # Express app: serves API + frontend
│   ├── config.js             # tunable thresholds (clustering, referral, SMS)
│   ├── db.js                 # SQLite schema (matches the ERD)
│   ├── loadEnv.js            # tiny .env loader (no dependency)
│   ├── services/
│   │   ├── riskEngine.js     # symptom -> low/medium/high
│   │   ├── clustering.js     # haversine + greedy outbreak detection
│   │   ├── referral.js       # nearest facility + SMS (sim/Twilio)
│   │   └── geo.js            # haversine distance + id helper
│   ├── routes/
│   │   ├── reports.js        # POST/GET /api/reports (the core pipeline)
│   │   └── dashboard.js      # /api/facilities, /clusters, /referrals, /stats
│   └── seed/
│       ├── facilities.js     # Kigali / Bumbogo / Kimironko seed data
│       └── run.js            # seed + reset runner
├── public/
│   ├── index.html            # landing
│   ├── report.html           # reporter app (multilingual, icon-based)
│   ├── dashboard.html        # health-official dashboard
│   ├── css/styles.css
│   ├── js/{i18n,api,report,dashboard}.js
│   ├── icons/                # PWA icons
│   ├── manifest.webmanifest
│   └── service-worker.js
├── package.json
├── .env.example
└── README.md
```

---

## 5. How the risk engine works

Rule-based and deliberately **conservative** — it rounds risk *up*, because a missed high-risk
case is far more costly than a false alarm (every medium/high case is sent to a CHW or facility to
confirm; the system never diagnoses on its own). See `server/services/riskEngine.js`.

- Any **danger sign** (e.g. convulsions, difficulty breathing) → **HIGH** immediately.
- **fever + chills + headache** (classic malaria pattern) → **HIGH**.
- Longer-lasting fever adds risk.
- Otherwise a weighted **score** bands the report into low / medium / high.

This is intentionally structured so it could later be replaced by a data-driven model without
touching the rest of the platform.

## 6. How clustering works

After every report, the system looks at recent medium/high reports within a time window
(default 7 days) and groups together those within a distance radius (default 1.5 km) using the
**haversine** formula. Any group reaching the minimum case count (default 3) is flagged as an
active **cluster** and drawn on the dashboard map. Thresholds live in `server/config.js`.

## 7. How referral works

For a high-risk report the system finds the **nearest health facility** (haversine), composes a
short **bilingual** referral message, and "sends" it.

- **Simulation mode (default):** the message is printed to the server console and stored in the
  database, so the whole rapid-response flow is demonstrable with no accounts or cost.
- **Twilio mode:** add Twilio credentials to a `.env` file (see `.env.example`) and real SMS are sent.

---

## 8. API reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/health` | service status + SMS mode |
| `GET`  | `/api/symptoms` | symptom catalogue (keys + danger flag) |
| `POST` | `/api/reports` | submit a report → returns risk + referral |
| `GET`  | `/api/reports?limit=` | recent reports with risk levels |
| `GET`  | `/api/facilities` | health facilities + CHWs |
| `GET`  | `/api/clusters` | active outbreak clusters |
| `GET`  | `/api/referrals` | rapid-response referrals |
| `GET`  | `/api/stats` | headline dashboard numbers |

**Example — submit a report:**

```bash
curl -X POST http://localhost:3000/api/reports \
  -H "Content-Type: application/json" \
  -d '{"symptoms":["fever","chills","headache"],"durationDays":3,
       "latitude":-1.9049,"longitude":30.1186,"village":"Bumbogo","name":"Mukamana"}'
```

Response:

```json
{
  "reportId": "rpt_ab5d6b7da8",
  "assessment": { "level": "high", "score": 10,
                  "reasons": ["Classic malaria pattern: fever + chills + headache"] },
  "referral": { "facilityId": "fac_bumbogo", "distanceKm": 0.02, "channel": "sms",
                "status": "sent", "message": "HIGH-RISK malaria alert: ..." }
}
```

---

## 9. Configuration

All optional — copy `.env.example` to `.env` to override. Key settings: `PORT`,
`CLUSTER_RADIUS_KM`, `CLUSTER_MIN_CASES`, `AUTO_REFER_LEVELS`, and the Twilio credentials.

---

## 10. Notes, limitations & next steps

- **Not a diagnosis tool.** It is triage + referral support only, as stated in the proposal's ethics section.
- **Kinyarwanda translations** in `public/js/i18n.js` are a solid starting point but should be
  reviewed by a native speaker before any real use.
- **Privacy:** for a real deployment, store identifiers separately, obtain consent, and coarsen
  location for clustering — see the proposal. This demo keeps data in a local SQLite file only.
- **Production path:** swap SQLite for PostgreSQL + PostGIS (same schema), put the SMS gateway in
  live mode, add authentication for the dashboard, and host behind HTTPS.
- The pilot metrics from the proposal (time-to-referral, referral completion, cluster latency) can
  all be computed from the `referrals` and `symptom_reports` tables.

---

