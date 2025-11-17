MavWalk is a website curated for University of Texas at Arlington students to enjoy uplifting messages while navigating the massive campus. The project pairs a Node.js/Express backend with a Vite + React frontend.

**Contributors:** Cleona Hua, Jaafar Alumary, Paul Dang, Saina Shrestha

## Quick Start
- Install Node.js 18+ (includes npm).
- Start the backend from `src/backend` with `npm install` then `npm start`.
- Start the frontend from `src/frontend` with `npm install` then `npm run dev`.
- Visit http://localhost:5173 while both servers are running.

## Prerequisites
- [Node.js](https://nodejs.org/) (which ships with npm)
- Two terminal windows/tabs (one for the backend, one for the frontend)

## Backend Setup (`src/backend`)
1. Open a terminal and move into the backend directory:
   ```bash
   cd src/backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Express server:
   ```bash
   npm start
   ```
   The backend listens on `http://localhost:3001` by default.

## Frontend Setup (`src/frontend`)
1. Open a second terminal (or tab) and move into the frontend directory:
   ```bash
   cd src/frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   Vite prints a local development URL, which is usually http://localhost:5173. 
   Open it in your browser.

## Running Both Servers Together
- Keep the backend running in the first terminal and the frontend running in the second terminal.
- If you prefer a single terminal, use a multiplexer like tmux, or run one process in the background.
- Ensure the backend is up before interacting with the frontend to avoid API errors.

## Content Moderation Policy
- We rely on a third-party library; we do not curate or store word lists.
- Text submitted by users is normalized (Unicode NFKC, lowercase, diacritic stripping, simple leetspeak folding, and repeat collapsing) before being classified.
- Server middleware masks profane input on write requests and logs only the category code and action taken.
- Additional runtime terms can be supplied via the `EXTRA_PROFANITY` environment variable without touching source control.

## Moderating Saved Messages
- Every user submission now lands in a moderation queue (`status = pending`) until a reviewer approves or rejects it.
- Run `npm run moderate -- list` in the project root to see pending messages in your terminal. Pass filters such as `--status approved`, `--start "Central Library"`, or `--destination "Fine Arts Building"` when you need a specific slice.
- Approve or reject directly from the CLI with `npm run moderate -- approve <id>` or `npm run moderate -- reject <id>` (add `--reviewed-by` and `--notes` to capture reviewer context).
- Prefer a REST workflow instead? The backend exposes `/api/moderation/messages` plus the `/approve` and `/reject` endpoints—example `curl` commands and more detail live in [docs/MODERATION.md](docs/MODERATION.md).

## Summary
- Backend: `cd src/backend && npm install && npm start`
- Frontend: `cd src/frontend && npm install && npm run dev`
- App URL: `http://localhost:5173`
