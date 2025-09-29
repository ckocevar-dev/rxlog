# RXLOG

RXLOG is a demo app for registering books with barcodes.

## Features
- Register a book with required fields (author, size, keywords, publisher, pages).
- Barcodes are consumed strictly from `AvailableBarcodes` (pool only) — no synthetic codes.
- DB-driven size rules (`sizerules`) map (width, height) → prefix.
- Live preview shows the first available code from the pool for the computed prefix.
- 7-day delayed release: when a book is finished/abandoned, its barcode is returned to the pool after 7 days.

## Tech Stack
- Backend: Node.js (Express), MongoDB (Mongoose)
- Frontend: Vite + vanilla JS

## Development (split processes)
Backend (API http://localhost:3000)
```bash
npm run dev:backend
```
Frontend (UI http://localhost:5173)
```bash
npm run dev:frontend
```

## Production / One-command demo
Build the frontend, copy to backend/public, then serve API + UI from backend:
```bash
npm run build:frontend
npm run start:backend
```
Open http://localhost:3000/

## Delayed release job
```bash
npm run release:barcodes
```
Schedule via `crontab` if desired.

## Data requirements
- Insert your real size rules into `sizerules`.
- Insert full barcodes into `AvailableBarcodes` (e.g., `eik0001`), not prefix-only values.
