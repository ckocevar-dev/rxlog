# RxLog 

_Current version: **v0.5.0 (MVP)**_

I have a space-saving, mobile reading workflow: I remove covers 
to fit more books on a shelf and sometimes carry a few loose pages in my
pocket so I can read anywhere. That breaks the usual cues (cover/spine), 
so I created a barcode-system and this app RxLog to still identify books, track progress, and shelve them
quickly.

## How the barcode works

I draw a simple three-lane mark (left / middle / right) on a book’s top, bottom, or left edge using a text marker or pen.

In each lane I draw 0–5 short lines; the three lane counts form a 
unique code (215 usable combinations per color & edge placement).

- Color = book width (quick visual grouping).
- Edge placement (top/bottom/left) = book height (faster shelving).

## What the app does

- Generate & reserve codes automatically, including suggested color and edge placement.
- Register the book (author, titleKeyword, publisher, pages) and store it with the code.

## What is planned for the future

- Research the first-published year automatically (ResearchService: Go).
- Autocomplete abbreviations for authors/publishers to speed input (AutocompleteService: Go, Redis).
- Mobile: look up books on the go and update reading status (reading → finished/abandoned) (MobileService: Kotlin).
- When a book is finished/abandoned, the code is freed for reuse (BarcodeService: Go, pgx, Redis).
- Analytics: see your most-read authors (AnalyticsService: Go, pgx, Redis).

---

## Versioning & releases

RxLog uses [Semantic Versioning](https://semver.org/) in a lightweight way:

- **MAJOR** – breaking changes in APIs or data format (planned for a future `1.0.0`).
- **MINOR** – new features that are backwards-compatible (e.g. new services, UX improvements).
- **PATCH** – bug fixes and small internal changes.

This repository is currently at: **v0.5.0 (MVP)**  
Major services run end-to-end; some are still stubbed or work-in-progress (see *Project status*).

Git tags:

- `v0.5.0` – current published version (described in this README).
- `main` – may contain unreleased changes and experiments.

## Changelog

- **v0.5.0**
  - End-to-end flow: dimensions → barcode assignment → registration → status updates.
  - Basic analytics and autocomplete stubs wired through the Gateway.
  - Frontend MVP (React + Vite dev server) plus Docker Compose setup for backend services.

---

## Current Version

This version of RxLog is focused on getting the **core workflow** running end-to-end:

- capture dimensions,
- assign barcodes based on size rules,
- register books and update reading status,
- handle edge cases such as **no barcode stock left in a size group** (`NO_STOCK`),
- search for books and update them.

The UI is intentionally minimal and functional so the app can be used and published quickly.  
Improving UX and increasing test coverage is a **continuous process**, not a one-time task.

The philosophy is: **ship early, then iterate** on UX and tests while keeping the system usable.

Planned / ongoing improvements include:

- **UX**
  - Refining error messages and inline feedback (e.g. clearer hints when no barcode is available for a given combination).
  - Introducing a small, consistent design system (spacing, buttons, typography) to make the app feel more polished).
  - Improving form guidance for dimensions (units, examples, validation hints).

- **Tests**
  - Adding more automated tests for dimension parsing (mm/cm, German decimals, invalid input).
  - Adding tests to verify that **all size rules are correctly applied**, including boundary cases and “no stock” situations.
  - Adding more integration tests across services to prevent regressions in UX-critical paths.

The goal is to keep the system usable in production while iterating continuously on UX, behavior, and test coverage.

---

## At a glance

### Services

Gateway (Java – Spring Boot)  
Bookservice (Java + Flyway)  
Barcode (Go + pgx + Redis)  

**Infra:** PostgreSQL 16, Redis 7.  
**Frontend:** React (Vite dev server). Nginx container planned for a future release.

Default ports (local): Frontend **5173** (Vite dev), Gateway **8080**, Postgres **5432**, Redis **6379**.

---

## Quick start

### 1) Start backend & infrastructure (Docker)

Prereqs: Docker and Docker Compose installed and running.  
From the **repository root**:

```bash
docker compose up --build -d
```

Check that the gateway is up:

```bash
curl http://localhost:8080/actuator/health
# Expect: {"status":"UP"} (or similar)
```

### 2) Start the frontend (Vite dev server)

In a **second terminal**:

```bash
cd frontend-react
npm install         # first time only
npm run dev         # Vite dev server
```

Vite will print a URL like:

```text
  Local:   http://localhost:5173/
```

Open that in your browser to use RxLog.

---

## Sample API

Register a book via the gateway:

```bash
curl -X POST http://localhost:8080/api/register/book   -H 'content-type: application/json'   -d '{
    "title":"American Gods",
    "author":"Neil Gaiman",
    "publisher":"HarperCollins",
    "barcode":"978031603",
    "sizeRuleId":1
  }'
```

---

## Project status

> Current state: usable MVP, with some services fully implemented and others stubbed/WIP.  
> Suitable for demos and personal use; evolving toward a fuller feature set.

| Service      | Runs with compose | Health status           | API in README | Tests | Notes                |
|--------------|-------------------|-------------------------|---------------|-------|----------------------|
| Gateway      | ✅ core           | `UP`                    | ✅            | ✅    | Routes & health      |
| Bookservice  | ✅ core           | `UP`                    | ✅            | ✅    | Flyway migrations    |
| Barcode      | ⏳ extras         | `NOT_IMPLEMENTED` (501) | 🔶 stub only  | ⏳    | Allocation rules WIP |
| Autocomplete | ⏳ extras         | `NOT_IMPLEMENTED` (501) | 🔶 stub only  | ⏳    | Prefix search WIP    |
| Analytics    | ⏳ extras         | `NOT_IMPLEMENTED` (501) | 🔶 stub only  | ⏳    | Top authors WIP      |
| Research     | ⏳ extras         | `OUT_OF_SERVICE` (503)  | ❌            | ⏳    | Worker planned       |

Legend: ✅ implemented · 🔶 stubbed · ⏳ in progress · ❌ not started

---

## 3-minute demo

```bash
# Stop any previous stack (optional)
docker compose down -v

# Start backend
docker compose up --build -d

# Health check
curl -f http://localhost:8080/actuator/health

# Register two books
curl -s -X POST http://localhost:8080/api/register/book   -H 'content-type: application/json'   -d '{
    "title":"American Gods",
    "author":"Neil Gaiman",
    "publisher":"HarperCollins",
    "barcode":"L2-M1-R0",
    "sizeRuleId":1
  }'

curl -s -X POST http://localhost:8080/api/register/book   -H 'content-type: application/json'   -d '{
    "title":"The Hobbit",
    "author":"J. R. R. Tolkien",
    "publisher":"Allen & Unwin",
    "barcode":"L0-M3-R1",
    "sizeRuleId":1
  }'

# (Optional) Autocomplete / status / analytics – once services are implemented
# curl -s 'http://localhost:8080/api/autocomplete?field=author&q=tolk'
# curl -s -X PATCH http://localhost:8080/api/mobile/books/1/status #   -H 'content-type: application/json' #   -d '{"status":"finished","lastPage":310}'
# curl -s 'http://localhost:8080/api/analytics/top-authors?limit=5'
```

> Don’t forget to start the frontend (`npm run dev` in `frontend-react`) and open `http://localhost:5173` for the UI.

---

## Architecture

```mermaid
flowchart LR
  FE[Frontend (React + Vite)] -->|HTTP| GW[Gateway (Spring Boot)]
  GW --> REG[Bookservice (Registration, Java + Flyway)]
  GW --> BAR[Barcode (Go + pgx + Redis)]
  GW --> AUT[Autocomplete (Go + Redis)]
  GW --> ANA[Analytics (Go + pgx + Redis)]
  GW --> MOB[Mobile (Kotlin)]
  RES[Research (Go worker)] --> REG

  REG <-->|SQL| PG[(PostgreSQL 16)]
  BAR <-->|cache| RD[(Redis 7)]
  AUT <-->|cache| RD
  ANA <-->|read| PG
```

---

## Language conventions

All source code comments and identifiers are in English.  
User-facing messages may be in German.
