# GVMC Cyclone Preparedness Checklist & Real-Time Asset Readiness Dashboard

This directory houses the frontend React application built with TypeScript, Vite, Tailwind CSS, TanStack Query, and React Router.

## Project Tech Stack
*   **Core**: React 18+ (TSX)
*   **Build Utility**: Vite & TypeScript
*   **Routing**: React Router DOM (v6/v7)
*   **State & Cache Management**: TanStack Query (React Query)
*   **HTTP Client**: Axios
*   **Forms & Validation**: React Hook Form with Zod
*   **Geospatial Maps**: Leaflet Maps & React-Leaflet
*   **Graphical Visualizations**: Recharts
*   **Styling System**: Tailwind CSS v4

---

## Directory Architecture
```text
src/
├── assets/          # Static logos and branding images
├── components/      # Reusable UI controls (Button, Card, Badge, Skeleton, Table, EmptyState)
├── config/          # Configurations and system constants
├── contexts/        # React context wrappers (AuthContext for JWT access validation)
├── layouts/         # Core layout wrappers (DashboardLayout frame)
├── pages/           # Operational page views (Dashboard, Checklists submit, Shelters, Assets, Alerts, Reports, Settings)
├── routes/          # Navigation routers and Protected Guards
├── services/        # Axios API clients
├── types/           # Global TypeScript definitions matching backend DTO schemas
├── App.tsx          # App entry wrapper launching query contexts
├── index.css        # Main stylesheet mapping Tailwind variables and maps style overrides
└── main.tsx         # Document mount engine
```

---

## Component Specifications

### 1. Reusable Layouts & Navigators
*   `DashboardLayout.tsx`: The primary administrative frame. Features a collapsible sidebar listing active items matched with the user's role, and a navbar exposing date telemetry, active role chips, and notifications.
*   `Table.tsx`: Full-fledged records display containing search input fields, page toggle actions, column header sorting triggers, and a click-to-download CSV exporter.

### 2. Workflow Panels & Maps
*   `ChecklistSubmitPage.tsx`: The core data entry form. Selects zone-ward-shelter hierarchies, fetches the active checklist questionnaire dynamically, retrieves device GPS coordinates, warns the user if they are off-site (distance > 100 meters), and sends form submissions as multipart payloads containing files.
*   `DashboardPage.tsx`: Renders real-time telemetry counters, readiness comparison bar charts, and a Leaflet map showing markers for GVMC shelters and equipment.

---

## Running the Application Locally

1.  **Start the FastAPI Backend**:
    Follow the backend execution guidelines (e.g. running from the virtual environment):
    ```bash
    cd backend
    .\venv\Scripts\uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
    ```

2.  **Launch the Vite Dev Server**:
    In another terminal session, navigate to the `frontend/` directory and run:
    ```bash
    cd frontend
    npm run dev
    ```
    This will serve the app on `http://localhost:5173`.
