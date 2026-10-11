# Smart Queue & Crowd Prediction System (Q-Flow)

A full-stack MERN application for intelligent digital queue reservation, live token dispatch, and real-time crowd telemetry across **Hospitals** and **Banks**. Features sub-second **Socket.IO** synchronization, **historical same-weekday regression for crowd forecasting**, and **automated overcrowding alert detection**.

---

## 🏛️ System Architecture & Roles

1. **User (Citizen / Patient / Customer)**
   - Registration via 10-digit mobile number, Name, Gender, Date of Birth, optional Email, and Password.
   - Category Selection: **Hospital** (with doctors & specialists) or **Bank** (with counters & cash desks).
   - GPS Geolocation and hybrid search merging **local MongoDB database** with **OpenStreetMap Overpass API**.
   - Interactive 75-token grid with real-time color states:
     - ⚪ **White**: Available slot.
     - 🔵 **Light Blue**: Booked by a citizen.
     - 🟢 **Green**: Completed consultation.
     - 🔴 **Red**: Cancelled slot.
     - ⭐ **Gold Star Ring**: User's active booked token.
   - Proactive alert: *"🔔 Your token is approaching"* notification when within 3 positions of the counter.

2. **Staff / Counter Operator**
   - Registration with category (`Hospital` or `Bank`), unique `staffId`, email, phone, and password.
   - Initial status: `pending` (blocked until Super Admin review).
   - Once approved and assigned to a department, staff can:
     - View the live queue and "Now Serving" counter state.
     - Click **"Call Next Token"** to advance the queue and announce the next citizen.
     - Click booked tokens to **"Mark Completed"** (triggers automatic recalculation of average consultation duration from the last 50 completed tokens).
     - **"Cancel Token"** or **"Pause / Resume Counter"**.
   - Strict server-side authorization: Staff attempting to operate tokens outside their assigned department are rejected with **403 Forbidden**.

3. **Admin (Super Administrator)**
   - Overview with live stat cards, crowd level badge (`LOW` / `MEDIUM` / `HIGH`), longest-queue department, counter utilization meter, and per-department counter load monitor (Green / Yellow / Red).
   - **Real-Time Overcrowding Alert Banner**: Broadcasts automated recommendations (*"Open another counter at <department>"*) when waiting citizens exceed threshold limits.
   - **Analytics & AI Forecasting**: Peak hours bar chart (30-day hourly history), daily footfall area chart (14 days), and hourly crowd prediction for today using Recharts.
   - **Staff Management**: Live table of pending approvals with facility/department assignment modal, reject, and deactivation.
   - **Facilities & Doctors Management**: Complete CRUD for Places, Departments, and Doctor rosters.
   - **Threshold Settings**: Live sliders for Crowd Alert Threshold and LOW / MEDIUM / HIGH traffic classification limits.
   - **Live Surge Demo Tool**: Instant simulation streaming 30–50 token bookings to demonstrate real-time queue climbing and alert triggers, with one-click data reset.

---

## 📋 Prerequisites

- **Node.js**: `v18.0.0` or higher (tested on Node v20 & v24)
- **npm**: `v9.0.0` or higher
- **MongoDB**: Optional! The server comes with an automatic **In-Memory MongoDB server (`mongodb-memory-server`)** fallback for zero-configuration, instant out-of-the-box evaluation. If a local MongoDB instance is running at `mongodb://127.0.0.1:27017/smart_queue`, it connects automatically.

---

## 🚀 Quick Start Guide (One-Command Setup)

### 1. Install All Dependencies

From the workspace root directory:

```bash
npm run install:all
```

*Or install individually:*
```bash
npm install
npm --prefix server install
npm --prefix client install
```

### 2. Seed Database

Populates Super Admin, 5 Guntur hospitals with doctor rosters, 3 bank branches, sample staff accounts, and 8 weeks of historical queue analytics:

```bash
npm run seed
```

### 3. Run Application (Concurrently)

Starts both the Express Socket.IO backend (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`) simultaneously:

```bash
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 🔑 Pre-Seeded Credentials

| Role | Identifier / Username | Password | Notes |
|---|---|---|---|
| 👑 **Super Admin** | `admin` | `Admin@12345` | Full administrative control |
| 🧑‍💼 **Approved Staff** | `STAFF-HOSP-01` | `Staff@123` | Assigned to Ramesh Hospitals (Cardiology) |
| ⏳ **Pending Staff** | `STAFF-BANK-02` | `Staff@123` | Waiting for admin approval |
| 🚫 **Rejected Staff** | `STAFF-HOSP-03` | `Staff@123` | Demonstrates rejected login notice |
| 👤 **Citizen User** | `9123456789` | `User@123` | Sample registered user (Anil Kumar) |

---

## ⚙️ Environment Variables

### Server (`server/.env`)
```env
PORT=5000
CLIENT_URL=http://localhost:5173
MONGO_URI=mongodb://127.0.0.1:27017/smart_queue
JWT_SECRET=smart_queue_secret_key_2026_super_secure_random_string_dev
ADMIN_SEED_USERNAME=admin
ADMIN_SEED_PASSWORD=Admin@12345
```

### Client (`client/.env`)
```env
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

> **API Keys Note**: The OpenStreetMap Overpass API is a public open-source service and **requires NO API key**. It runs out of the box with an automated 4-second timeout and offline graceful fallback.

---

## 📡 API Endpoints Reference

### Authentication (`/api/auth`)
- `POST /api/auth/user/signup`: Register citizen user (rate-limited, validated DOB & phone)
- `POST /api/auth/user/login`: Login citizen user
- `POST /api/auth/staff/signup`: Register staff operator (status defaults to `pending`)
- `POST /api/auth/staff/login`: Login staff operator (enforces approved status)
- `POST /api/auth/admin/login`: Login administrator
- `GET /api/auth/me`: Fetch authenticated session profile

### Facilities & Places (`/api/places`)
- `GET /api/places/nearby?category=&lat=&lng=&radius=`: Geolocation hybrid search merging MongoDB and OpenStreetMap Overpass
- `GET /api/places/:id/departments`: Fetch departments & doctor rosters for a facility

### Tokens & Counters (`/api/tokens` & `/api/departments`)
- `GET /api/departments/:id/tokens?date=`: Fetch 75-token grid with real-time status and wait estimates
- `POST /api/tokens/:id/book`: Atomically book an available token (enforces 1 active token per dept/day)
- `POST /api/tokens/:id/cancel`: Cancel token (by token owner or assigned staff)
- `POST /api/tokens/:id/complete`: Complete consultation (staff only, auto-recalculates `avgServiceMinutes`)
- `POST /api/departments/:id/call-next`: Advance queue and set "Now Serving" (staff only)
- `POST /api/departments/:id/pause` & `/resume`: Hold or resume counter queue processing
- `GET /api/my/tokens`: Fetch current user's booked tokens

### Analytics & Crowd AI (`/api/analytics`)
- `GET /api/analytics/summary`: Real-time tokens, waiting count, wait estimates, crowd level, and longest queue
- `GET /api/analytics/peak-hours`: 30-day historical bookings grouped by hour
- `GET /api/analytics/crowd-prediction`: Same-weekday 8-week regression analysis for today's operating hours
- `GET /api/analytics/daily-visitors?days=14`: 14-day footfall vs completed consultations trend

### Administration & Simulation (`/api/admin`)
- `GET /api/admin/staff?status=`: Filter staff directory by status
- `PATCH /api/admin/staff/:id/approve`: Approve staff and assign facility + department
- `PATCH /api/admin/staff/:id/reject`: Reject staff application
- `PATCH /api/admin/staff/:id/deactivate`: Deactivate staff member
- `GET /api/admin/settings` & `PUT /api/admin/settings`: Configure crowd thresholds
- `GET /api/admin/places`, `POST`, `PUT`, `DELETE`: Facility CRUD
- `GET /api/admin/departments`, `POST`, `PUT`, `DELETE`: Department CRUD
- `POST`, `PUT`, `DELETE /api/admin/departments/:id/doctors`: Doctor roster management
- `POST /api/admin/simulate`: Stream 30–50 simulated token bookings in real time
- `POST /api/admin/simulate/reset`: Clean up and reset demo tokens back to available

---

## 🎬 5-Minute Live Presentation Demo Script

Follow this script to deliver an impressive live demonstration of all core system capabilities:

### Act 1: Citizen Booking & Real-Time Sync (Minutes 0:00 – 1:30)
1. Open two browser windows side by side:
   - **Window A**: Incognito / Browser 1 at `http://localhost:5173`.
   - **Window B**: Normal / Browser 2 at `http://localhost:5173`.
2. In Window A, sign in as Citizen: `9123456789` / `User@123`.
3. Click **"Book Token"** -> Select **Hospital** -> Pick **Ramesh Hospitals Guntur** -> Select **Cardiology**.
4. Observe the 75-token grid. Click an available white tile (e.g., **Token #2**).
5. Confirm booking: Notice the tile turns **Light Blue** with your **Gold Star Ring** indicator.
6. Open Window B, log in as staff: `STAFF-HOSP-01` / `Staff@123`, and navigate to Cardiology. Observe that Window B updated **instantly with zero refresh** via Socket.IO.

### Act 2: Staff Call-Next & Dynamic Duration Recalculation (Minutes 1:30 – 2:45)
1. In Window B (Staff Console), click **"Call Next Token"**.
2. Notice the live banner immediately updates to **"Now Serving: Token #1"**. Window A announces the update in real time.
3. Click **Token #1** -> Click **"Mark Completed"**.
4. The token turns **Green**. The system automatically computes the elapsed time (`completedAt - calledAt`) and recalculates `avgServiceMinutes` for the department.

### Act 3: Admin Approval Workflow (Minutes 2:45 – 3:30)
1. Open a new tab and sign in as Super Admin: `admin` / `Admin@12345`.
2. Click **"Staff Approvals"** on the sidebar.
3. Point out pending operator `STAFF-BANK-02`. Click **"Approve"**.
4. In the dialog, assign them to **State Bank of India (Main Branch)** -> **Cash Deposit Counter**.
5. Click **"Confirm & Authorize"**. Show that the staff member is immediately moved to the authorized directory.

### Act 4: Live Crowd Surge Simulation & Overcrowding Alert (Minutes 3:30 – 5:00)
1. On the Admin Dashboard, click **"Overview"**.
2. Click **"Run Demo Simulation"**.
3. Choose **Cardiology** and select **35 tokens**.
4. Click **"Start Surge Simulation"**.
5. **The Wow Moment**: Watch the dashboard in real time as tokens stream into the queue over 3 seconds:
   - The waiting count visibly climbs from 1 to 36.
   - The crowd level badge escalates from `LOW` to **`HIGH`**.
   - An eye-catching glowing **Rose Alert Banner** appears at the top:
     > *"🚨 Real-Time Crowd Alert: Overcrowding Detected at Cardiology (Ramesh Hospitals). 💡 Recommendation: Open another counter at Cardiology."*
6. Switch to Window A (Citizen Token Grid): Point out how the grid filled up live with simulated tokens without refreshing.
7. Return to the Admin Console and click **"Reset Demo Data"** to restore clean state.

---

## 🔒 Security Hardening Summary

- **Helmet**: Sets defensive HTTP response headers (X-Frame-Options, Content-Security-Policy, etc.).
- **NoSQL Injection Defense**: `express-mongo-sanitize` scrubs request bodies, params, and query strings.
- **Rate Limiting**: `express-rate-limit` prevents brute-force attacks on all authentication routes (`/api/auth/login`).
- **Credential Protection**: Mongoose models enforce schema-level `toJSON` methods that unconditionally strip `passwordHash` before any JSON serialization.
- **Strict Role-Based Access Control**: Middleware verifies JWT signatures and enforces role authorization (`admin`, `staff`, `user`) with 403 Forbidden enforcement on unassigned departments.
- **Fail-Safe Overpass Gateway**: External OpenStreetMap queries are wrapped in an `AbortController` 4-second timeout, ensuring external network latency never blocks local booking availability.
