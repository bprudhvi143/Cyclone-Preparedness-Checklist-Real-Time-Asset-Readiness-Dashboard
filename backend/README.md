# GVMC Disaster Management Backend

A production-grade Python backend using **FastAPI**, **SQLAlchemy 2.0**, and **PostgreSQL/PostGIS**, designed to digitize cyclone preparedness activities and report asset readiness in real-time across Greater Visakhapatnam Municipal Corporation (GVMC) zones.

---

## 1. Quick Start Guide (Docker)

The fastest way to deploy the entire stack (FastAPI app, PostgreSQL with PostGIS, and Redis cache) is via **Docker Compose**.

### Prerequisites
*   Ensure **Docker Desktop** is installed and running on your system.

### Steps
1.  Navigate to the `backend/` directory.
2.  Copy `.env.example` to `.env`:
    ```bash
    cp .env.example .env
    ```
    *(For Windows PowerShell: `Copy-Item .env.example .env`)*
3.  Build and launch the container ecosystem:
    ```bash
    docker-compose up --build
    ```
4.  Once the services are healthy, run migrations and database seeding:
    ```bash
    # Apply database migrations
    docker-compose exec backend alembic upgrade head

    # Seed the database with administrative configurations and default users
    docker-compose exec backend python app/db/seed/seed.py
    ```
5.  Access the interactive Swagger API documentation at:
    *   **Swagger UI**: `http://localhost:8000/docs`
    *   **ReDoc**: `http://localhost:8000/redoc`

---

## 2. Environment Variables

Configure these settings inside `backend/.env`:

| Key Name | Default Value | Description |
| :--- | :--- | :--- |
| `ENV_MODE` | `dev` | Server environment execution mode (`dev` or `prod`). |
| `DATABASE_URL` | `postgresql+asyncpg://...` | Asynchronous connection URL for PostgreSQL. |
| `REDIS_URL` | `redis://localhost:6379/0` | Connection target for rate limiting and cache blocks. |
| `JWT_SECRET` | `9ee8f38c35d97...` | High-entropy key used to sign authentication tokens. |
| `ACCESS_TOKEN_EXPIRE_MINUTES`| `30` | Access Token validation lifetime. |
| `REFRESH_TOKEN_EXPIRE_DAYS`| `7` | Refresh Token validation lifetime. |
| `UPLOAD_DIR` | `./uploads` | Target directory for field officer photo uploads. |
| `MAX_UPLOAD_SIZE_MB` | `5` | Maximum allowed photo size in megabytes. |

---

## 3. Developer Guide (Local Development Setup)

To run the backend locally without Docker (e.g., using a local python virtual environment):

1.  **System Requirements**:
    *   Ensure **PostgreSQL 16+** with the **PostGIS** extension is installed on your machine.
    *   Ensure a local **Redis** server is running.
2.  **Create Virtual Environment**:
    ```bash
    python -m venv venv
    source venv/bin/activate  # Windows: venv\Scripts\activate
    ```
3.  **Install Dependencies**:
    ```bash
    pip install -r requirements.txt
    ```
4.  **Database Extension Setup**:
    Verify that your target database is running the PostGIS extension:
    ```sql
    CREATE EXTENSION IF NOT EXISTS postgis;
    ```
5.  **Run Migrations & Seeding**:
    ```bash
    alembic upgrade head
    python app/db/seed/seed.py
    ```
6.  **Start FastAPI App**:
    ```bash
    uvicorn app.main:app --reload --port 8000
    ```

---

## 4. Testing Suite

The project includes unit, integration, and API tests executed via `pytest`.

### Run Tests Locally
Ensure dependencies (including `pytest-asyncio` and `httpx`) are installed, then run:
```bash
pytest tests/
```

The test environment automatically runs tests against an in-memory SQLite database to ensure clean, decoupled transactions.

---

## 5. API Reference Summary

All routes are prefixed with `/api/v1/` and enforce Role-Based Access Control (RBAC):

### Authentication (`/auth`)
*   `POST /auth/login`: Authenticate email/password. Returns access token, refresh token, and user role.
*   `POST /auth/refresh`: Issue new tokens using a valid refresh token.
*   `GET /auth/me`: Fetch authenticated user profile.
*   `POST /auth/register`: Create user account (Admin role required).

### Administrative Data
*   `GET /locations/zones`: Retrieve all zones.
*   `GET /locations/wards`: Fetch all wards (returns bounding polygon coordinates).
*   `GET /shelters`: List safe evacuation shelters with occupancy capacity details and coordinates.
*   `GET /assets`: List staged disaster machinery (pumps, generators) and operational statuses.

### Checklists & Submissions
*   `GET /checklists/templates/active`: Fetch active preparedness checklist schema for field inspections.
*   `POST /checklists/submissions`: Submit a checklist (requires `multipart/form-data` with a string JSON `payload` and file attachments).

### Alerts & Dashboards
*   `GET /alerts`: Retrieve active preparedness alerts (filtered by zone for Zone Officers).
*   `POST /alerts/{id}/review`: Resolve an active alert, updating resolution remarks.
*   `GET /dashboard/statistics`: Fetch city-wide aggregate readiness scores, active alert counts, and recent activity feeds.
*   `GET /reports/export`: Download CSV summary audits for Zones, Wards, Officers, Assets, Checklists, or Alerts.
