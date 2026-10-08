# FitPulse

FitPulse is a full-stack gym management and personalized fitness tracking web platform built with React, Node.js, Express, and MongoDB. It connects gym members, certified personal trainers, and facility administrators into a single unified application with real-time facility scheduling, rule-based and trainer-assigned workout splits, gym attendance tracking, and administrative controls.

---

## Table of Contents

- [Overview](#overview)
- [Core Features](#core-features)
- [User Roles & Permissions](#user-roles--permissions)
- [Workout Source Behavior](#workout-source-behavior)
- [Business Rules & Automation](#business-rules--automation)
- [Global Exercise Image System](#global-exercise-image-system)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Database Models](#database-models)
- [Backend API Reference](#backend-api-reference)
- [Security](#security)

---

## Overview

FitPulse solves the common disconnect between gym facility operations and member workout execution. Instead of relying on manual paper check-ins, static routine printouts, or isolated messaging apps, FitPulse provides:

- **Facility-Aware Scheduling:** Attendance check-ins respect real-time gym operating hours and scheduled facility closures in the `Asia/Kolkata` facility timezone.
- **Structured Workouts:** Members receive adaptive, goal-oriented workout routines (FitPulse Recommended, Trainer Assigned, or Custom) with exercise instructions, target muscle groups, sets, reps, and rest intervals.
- **Accountability & Consistency:** Tracks gym visits, live workout elapsed time, exercise completions, and weekly consistency percentages with rest-day exclusions and make-up workout flexibility.
- **Full Administrative Control:** Empowers administrators to manage users across all roles, update facility hours, schedule closures, and manage membership tiers.

---

## Core Features

### Member Features
- **Account Registration & Onboarding:** Collects full name, email, 10-digit phone number, password, physical parameters (age, height, weight), fitness goals, experience level, planned workout days (3–6 days/week), and preferred time of day.
- **Membership Management:** Browse active membership tiers (e.g., Monthly, Quarterly, Annual), simulate checkout payments, and inspect membership validity (Active, Frozen, or Expired).
- **Personalized Workout Splits:**
  - *FitPulse Recommended:* Automatically generated routines tailored to fitness goal and experience level.
  - *Trainer Assigned:* Custom routines created and assigned directly by personal trainers.
  - *Custom Plans:* Member-created daily workout splits.
- **Gym Attendance & Workout Sessions:**
  - One-click Check In / Check Out with a real-time session timer.
  - Interactive exercise completion checklist during active workout sessions.
  - Strict enforcement of **maximum one workout session per calendar day**.
  - Monthly gym visit counters that distinguish general facility visits from completed workout sessions.
- **Make-Up Workouts & Consistency Tracking:**
  - Scheduled rest days are excluded from the consistency denominator to reward recovery.
  - Missed scheduled workouts can be performed as make-up workouts on rest days.
  - Real-time weekly consistency score (%) based on fulfilled expected days.
- **Exercise Library:** Interactive directory searchable by exercise name, target muscle group (Chest, Back, Legs, Shoulders, Arms, Core), and equipment with form guidance and SVG illustrations.
- **Profile & Physical Metrics:** Manage personal contact details, update body weight/height, track fitness progression, and request or remove personal trainer assignments.

### Trainer Features
- **Trainee Roster:** View all members currently assigned to the trainer, including member fitness goals, experience levels, and consistency scores.
- **Member Detail Inspection:** Review trainee workout plans, scheduled weekly splits, and attendance activity.
- **Workout Plan Library:** Create, edit, and maintain custom multi-day workout routines with custom exercises, sets, reps, and rest intervals.
- **Plan Assignment:** Assign workout plans directly to trainees, automatically updating their active workout source.

### Administrator Features
- **Platform Overview:** Real-time metrics dashboard displaying total registered members, active trainers, active paid memberships, and today's facility attendance check-ins.
- **User Directory Management:**
  - View all registered users with search, role filters, and membership status badges.
  - Promote or change user roles across `Member`, `Trainer`, and `Admin`.
  - Update membership statuses (`Active`, `Frozen`, `Expired`).
  - **Full User Deletion Power:** Delete any member, trainer, or secondary admin account with confirmation modals and cascading trainee reassignment. Self-deletion is prevented to protect the active admin session.
- **Facility Schedule Management:**
  - Configure daily opening and closing hours for each day of the week (Monday through Sunday) in the `Asia/Kolkata` timezone.
  - Set general facility operational notes.
- **Scheduled Gym Closures:**
  - Schedule date-specific gym closures with public reasons and announcements (e.g., maintenance, holidays).
  - Cancel or edit upcoming closures.
- **Membership Plan Management:** Create, update, activate, and deactivate membership tiers with customized durations, pricing, and feature lists.

---

## User Roles & Permissions

FitPulse implements strict role-based access control (RBAC) enforced on both frontend views and backend Express middleware:

| Capability | Member | Trainer | Admin |
| :--- | :---: | :---: | :---: |
| View Public Landing Page & Operating Status | Yes | Yes | Yes |
| Check In / Check Out & Log Workout Attendance | Yes (requires Active membership) | No | No |
| Track Workouts & Complete Prescribed Exercises | Yes | No | No |
| Create Personal Custom Workout Plan | Yes | No | No |
| Request / Select Personal Trainer | Yes | No | No |
| View Trainee Roster & Trainee Profiles | No | Yes | Yes |
| Create & Assign Workout Plans to Trainees | No | Yes | Yes |
| View System Overview & Platform Metrics | No | No | Yes |
| Manage User Directory & Update Roles | No | No | Yes |
| Delete User Accounts (Members, Trainers, Other Admins) | No | No | Yes |
| Modify Gym Operating Hours (Mon–Sun) | No | No | Yes |
| Schedule & Cancel Facility Closures | No | No | Yes |
| Create & Edit Membership Tiers | No | No | Yes |

---

## Workout Source Behavior

The application enforces an authoritative workout source hierarchy (`activeWorkoutSource`) stored in the member's profile:

```text
[No Trainer Assigned]   ──>  Active Source: "recommended" (FitPulse Rule-Based Plan)
[Trainer Assigned]       ──>  Active Source: "trainer"     (Trainer Prescribed Plan)
[Trainer Removed/Deleted] ──>  Active Source: "recommended" (Safely Reassigned)
[Custom Plan Selected]   ──>  Active Source: "custom"      (Member-Built Routine)
```

- **No Trainer Assigned:** The member defaults to the rule-based FitPulse Recommended plan based on their fitness goal (`muscle_gain`, `weight_loss`, `endurance`, `strength`) and experience level (`beginner`, `intermediate`, `advanced`, `pro`).
- **Trainer Assigned:** When a trainer is assigned and provides a plan, the member's active source switches to `trainer`.
- **Trainer Removed or Deleted:** If a member unassigns their trainer, or if an administrator deletes the trainer account, all trainees are safely reassigned: `trainerId` is cleared (`null`), trainer-assigned plans are deactivated, and the active workout source resets to `recommended`.
- **Custom Plan:** Members can build custom routines and switch their active workout source to `custom` at any time.

---

## Business Rules & Automation

1. **One Workout Session Per Calendar Day:**
   - Enforced authoritatively on the backend using the facility timezone `Asia/Kolkata` (`dateKey: YYYY-MM-DD`).
   - A member may complete at most **one workout session per calendar day**, whether fulfilled via physical attendance check-out or manual day completion.
   - Any attempt to check in for a second workout session or manually complete a second workout day on the same date is rejected with HTTP `400 Bad Request` (`WORKOUT_ALREADY_COMPLETED_TODAY`).
   - Gym visits and workout sessions are tracked independently: members can have multiple physical attendance visits, but workout session fulfillment is capped at one per calendar day.
2. **Gated Make-Up Workouts:**
   - Missed workouts from earlier in the week are available for make-up on scheduled rest days.
   - Once a workout session is initiated or completed for today, make-up workout actions are automatically hidden and blocked for the remainder of the calendar day.
3. **Gym Operating Hours & Closure Enforcement:**
   - Attendance check-in evaluates live facility operating hours for the current day in `Asia/Kolkata`.
   - Check-ins are rejected if the facility is currently closed (`GYM_CLOSED`) or if a date-specific closure is active.
   - Rest days, closed days, and official closures are excluded from member consistency penalties.
4. **Automatic Session Checkout:**
   - If a member remains checked in past the facility's daily closing time, the backend automatically closes the session upon inspection, calculating duration up to the facility closing time.
5. **No Protected Roles / Full Admin Delete Authority:**
   - The Admin role has full authority over the platform user directory.
   - Admins can delete Members, Trainers, and secondary Admin accounts.
   - Self-deletion of the currently authenticated administrator is prevented to prevent accidental session lockouts.
6. **Multi-Tab Session Isolation:**
   - User authentication sessions are isolated per browser tab using `sessionStorage` and tab identifiers (`X-Tab-Session-Id`), allowing simultaneous testing of different roles in the same browser.

---

## Global Exercise Image System

FitPulse maintains a centralized, authoritative exercise image system across all member, trainer, and administrative views:

- **Vector Asset Library:** 14 public SVG exercise diagrams located in `client/public/exercises/`:
  - `bench-press.svg`, `incline-press.svg`, `pushup.svg`
  - `deadlift.svg`, `squats.svg`, `leg-press.svg`, `lunges.svg`
  - `lat-pulldown.svg`, `cable-row.svg`
  - `shoulder-press.svg`, `lateral-raise.svg`
  - `bicep-curl.svg`, `tricep-pushdown.svg`
  - `plank.svg`
- **Global Mapping & Component:**
  - `client/src/utils/exerciseImages.js`: Authoritative name and keyword matching function mapping exercise titles to the appropriate SVG asset.
  - `client/src/components/ExerciseImage.jsx`: Shared React component that resolves exercise image URLs with an automatic fallback placeholder, guaranteeing zero broken image icons across tables, cards, and checklist views.
  - Server-side generator services (`workoutGenerator.service.js`, `trainer.service.js`, `member.service.js`) attach valid `imageUrl` attributes to all generated and assigned exercises.

---

## Technology Stack

### Frontend
- **React 18** (`^18.3.1`) — Single-page component architecture
- **Vite 6** (`^6.2.0`) — Build tool and local development server
- **Tailwind CSS 4** (`^4.0.9`, `@tailwindcss/vite ^4.0.9`) — Utility-first styling
- **Native Browser APIs** — `sessionStorage` / `localStorage`, Fetch API, History API (hash routing)

### Backend
- **Node.js** (v18+) — Runtime environment
- **Express 4** (`^4.21.2`) — RESTful API routing and middleware
- **MongoDB & Mongoose 8** (`^8.9.5`) — Object data modeling and persistence
- **MongoDB Memory Server** (`^10.1.4`) — Embedded in-memory MongoDB fallback for instant zero-config development
- **JSON Web Tokens (JWT)** (`^9.0.3`) — Stateless authorization
- **BcryptJS** (`^3.0.3`) — Secure password hashing
- **CORS** (`^2.8.5`) — Cross-origin resource sharing
- **Dotenv** (`^16.4.7`) — Environment variable management

---

## Project Structure

```text
FS/
├── client/                             # Frontend React + Vite application
│   ├── public/
│   │   ├── exercises/                  # 14 authoritative exercise SVG diagrams
│   │   └── logo.svg                    # Brand logo asset
│   ├── src/
│   │   ├── components/                 # UI components and page views
│   │   │   ├── AdminDashboard.jsx      # Admin overview & system metrics
│   │   │   ├── AdminPlansPage.jsx      # Admin membership plans manager
│   │   │   ├── AdminSchedulePage.jsx   # Admin gym schedule & closures manager
│   │   │   ├── AdminUsersPage.jsx      # Admin user directory & deletion
│   │   │   ├── AttendancePage.jsx      # Member gym check-in & active session
│   │   │   ├── ConsistencyReportPage.jsx# Member consistency score & analysis
│   │   │   ├── DashboardPage.jsx       # Role-aware dashboard dispatcher
│   │   │   ├── ExerciseImage.jsx       # Reusable authoritative exercise image
│   │   │   ├── ExerciseLibraryPage.jsx # Public & member exercise catalog
│   │   │   ├── LandingPage.jsx         # Marketing landing page
│   │   │   ├── LoginPage.jsx           # User authentication login
│   │   │   ├── LogoutConfirmModal.jsx  # Logout confirmation modal
│   │   │   ├── MemberDashboard.jsx     # Member daily overview & today's plan
│   │   │   ├── MembershipPage.jsx      # Membership plan selection & checkout
│   │   │   ├── Navbar.jsx              # Navigation header with live gym status
│   │   │   ├── NoticeBanner.jsx        # Universal schedule & closure notices
│   │   │   ├── ProfilePage.jsx         # Member profile & trainer preferences
│   │   │   ├── RegisterPage.jsx        # New member account registration
│   │   │   ├── TrainerDashboard.jsx    # Trainer trainee roster & plan builder
│   │   │   └── WorkoutPlanPage.jsx     # Prescribed workout split & day logger
│   │   ├── utils/
│   │   │   ├── authStorage.js          # Tab-isolated session management
│   │   │   └── exerciseImages.js       # Exercise image dictionary & resolver
│   │   ├── App.jsx                     # Top-level application component
│   │   ├── index.css                   # Tailwind CSS styling entrypoint
│   │   └── main.jsx                    # React DOM entrypoint
│   ├── index.html                      # HTML template
│   ├── package.json                    # Client dependencies & scripts
│   └── vite.config.js                  # Vite configuration & /api proxy
│
├── server/                             # Backend Express server
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js                   # MongoDB connection & in-memory fallback
│   │   ├── controllers/                # Request handlers
│   │   │   ├── auth.controller.js      # Auth endpoints handler
│   │   │   ├── member.controller.js    # Member endpoints handler
│   │   │   └── trainer.controller.js   # Trainer endpoints handler
│   │   ├── middleware/
│   │   │   └── auth.middleware.js      # JWT protect, restrictTo, active membership
│   │   ├── models/                     # Mongoose database models
│   │   │   ├── attendance.model.js     # Attendance & workout session model
│   │   │   ├── fitnessProfile.model.js # Member fitness profile model
│   │   │   ├── gymClosure.model.js     # Facility closure model
│   │   │   ├── gymSchedule.model.js    # Weekly operating schedule model
│   │   │   ├── membershipPayment.model.js # Payment transactions model
│   │   │   ├── membershipPlan.model.js # Membership tiers model
│   │   │   ├── user.model.js           # Core user model (auth & roles)
│   │   │   └── workoutPlan.model.js    # Workout plan & exercises model
│   │   ├── routes/                     # Express API route declarations
│   │   │   ├── admin.routes.js         # /api/admin endpoints
│   │   │   ├── auth.routes.js          # /api/auth endpoints
│   │   │   ├── health.routes.js        # /api/health endpoint
│   │   │   ├── member.routes.js        # /api/member endpoints
│   │   │   ├── sync.routes.js          # /api/sync cross-tab sync endpoints
│   │   │   └── trainer.routes.js       # /api/trainer endpoints
│   │   ├── seed/
│   │   │   └── seed.js                 # Initial seed data generator
│   │   ├── services/                   # Core business logic
│   │   │   ├── auth.service.js         # Authentication & password validation
│   │   │   ├── member.service.js       # Member calculations & consistency
│   │   │   ├── schedule.service.js     # Facility operating hours evaluator
│   │   │   ├── sync.service.js         # Cross-session event recording
│   │   │   ├── trainer.service.js      # Trainer plan management
│   │   │   └── workoutGenerator.service.js # Rule-based workout generator
│   │   ├── utils/
│   │   │   └── time.utils.js           # Asia/Kolkata timezone & calendar helpers
│   │   ├── app.js                      # Express application setup
│   │   └── server.js                   # HTTP server entrypoint
│   ├── .env.example                    # Environment variable template
│   └── package.json                    # Server dependencies & scripts
│
├── .env.example                        # Root environment variable template
├── package.json                        # Root package scripts
└── README.md                           # Project documentation
```

---

## Getting Started

### Prerequisites
- **Node.js:** v18.0.0 or higher
- **npm:** v9.0.0 or higher
- **MongoDB:** *(Optional)* Local MongoDB community server (port 27017) or MongoDB Atlas URI. If no external MongoDB instance is detected, the server automatically starts an embedded in-memory MongoDB instance.

### 1. Installation

Install dependencies for both frontend and backend from the root directory:

```bash
npm run install:all
```

Alternatively, install dependencies inside each directory manually:

```bash
cd server && npm install
cd ../client && npm install
```

### 2. Environment Configuration

Create a `.env` file inside the `server/` directory based on `server/.env.example`:

```bash
cp server/.env.example server/.env
```

Ensure the configuration variables match your local environment (see [Environment Variables](#environment-variables)).

### 3. Running the Application

You can run the backend and frontend using the root package scripts:

**Terminal 1 — Backend API Server:**
```bash
npm run dev:server
```
*Starts Express on `http://localhost:5000` with hot-reload via nodemon.*

**Terminal 2 — Frontend Client:**
```bash
npm run dev:client
```
*Starts Vite development server on `http://localhost:5173`.*

### 4. Production Build

To validate and build the frontend client for production:

```bash
cd client
npm run build
```

The production bundle will be generated in `client/dist/`.

---

## Environment Variables

The backend configuration is managed through environment variables in `server/.env`. Below are the supported variables:

| Variable | Description | Default / Example |
| :--- | :--- | :--- |
| `PORT` | HTTP port for the backend Express server | `5000` |
| `MONGODB_URI` | MongoDB connection URI string | `mongodb://127.0.0.1:27017/fitpulse` |
| `CLIENT_URL` | Allowed CORS frontend origin | `http://localhost:5173` |
| `NODE_ENV` | Application runtime environment | `development` |
| `JWT_SECRET` | Secret key used to sign and verify JWT tokens | *Use a secure random string* |
| `JWT_EXPIRES_IN` | Validity duration of issued JWT tokens | `7d` |

> **Security Note:** Never commit `.env` files containing real production secrets or database credentials to version control.

---

## Database Models

FitPulse uses Mongoose with 8 defined data schemas:

1. **User (`users`):** Stores authentication credentials (`email`, hashed `password`), personal contact info (`fullName`, `phone`), platform `role` (`member`, `trainer`, `admin`), `specialization` (for trainers), and first-login indicators.
2. **FitnessProfile (`fitnessprofiles`):** Stores member fitness attributes (`fitnessGoal`, `experienceLevel`, `currentLevel`, `plannedDaysPerWeek`, `preferredSchedule`), physical metrics (`age`, `height`, `weight`), `membershipStatus` (`Active`, `Frozen`, `Expired`), dates, `trainerId`, and active workout preferences (`activeWorkoutSource`).
3. **Attendance (`attendances`):** Logs facility check-in and check-out events (`checkInTime`, `checkOutTime`, `durationMinutes`, `status`), calendar date reference (`dateKey` in `YYYY-MM-DD`), session score, and the array of logged exercises (`exerciseName`, `sets`, `reps`, `isCompleted`, `imageUrl`).
4. **WorkoutPlan (`workoutplans`):** Stores structured workout plans (`recommended`, `trainer`, `custom`), active status, `daysPerWeek`, and daily exercise arrays (`dayNumber`, `dayName`, `focus`, `isRestDay`, `exercises`).
5. **GymSchedule (`gymschedules`):** Stores default weekly operating hours for each day of the week (Monday through Sunday) with individual `openingTime` and `closingTime` strings.
6. **GymClosure (`gymclosures`):** Stores scheduled facility closure dates (`date` in `YYYY-MM-DD`), closure status (`isClosed`), public `reason`, and `announcement`.
7. **MembershipPlan (`membershipplans`):** Defines available membership offerings (`name`, `durationMonths`, `price`, `features`, `isActive`, `popular`).
8. **MembershipPayment (`membershippayments`):** Records simulated payment transactions (`userId`, `planName`, `planDurationMonths`, `amount`, `paymentStatus`, `transactionId`).

---

## Backend API Reference

All backend endpoints are prefixed with `/api`. Protected routes require a Bearer token in the `Authorization` header (`Authorization: Bearer <token>`).

### Health & Gym Status
- `GET /api/health` — Public server and database connectivity status check.
- `GET /api/gym/status` — Universal public gym operating status in `Asia/Kolkata` timezone.

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new member account with onboarding parameters.
- `POST /api/auth/login` — Authenticate existing user and return JWT token.
- `GET /api/auth/me` — *(Protected)* Fetch currently authenticated user identity.

### Member Endpoints (`/api/member`)
- `GET /api/member/dashboard` — Member dashboard summary, streak, today's workout, and attendance summary.
- `GET /api/member/profile` — Full member profile details and fitness preferences.
- `PUT /api/member/profile` — Update member contact info, physical stats (height, weight, age), and fitness goals.
- `GET /api/member/workout-plan` — Active workout routine, daily exercise prescription, and 1-workout-per-day completion status.
- `POST /api/member/workout-plan` — *(Active Membership)* Create a custom member workout plan.
- `POST /api/member/workout-plan/generate` — Regenerate rule-based recommended workout routine.
- `PATCH /api/member/workout-plan/day/:dayNumber/toggle-complete` — *(Active Membership)* Mark a workout day completed (enforces 1-workout-per-day limit).
- `GET /api/member/attendance` — Member attendance logs, today's session status, and make-up workout availability.
- `GET /api/member/attendance/current-session` — Active checked-in session details and auto-checkout status.
- `POST /api/member/attendance/check-in` — *(Active Membership)* Check into facility (enforces 1-workout-per-day limit and operating hours).
- `POST /api/member/attendance/check-out` — *(Active Membership)* Check out of facility and finalize workout session.
- `PATCH /api/member/attendance/active/exercise/:exerciseId/toggle` — *(Active Membership)* Toggle completion status of an exercise in the active session.
- `GET /api/member/consistency` — Weekly consistency report, attended vs expected days, and adherence percentage.
- `GET /api/member/membership/plans` — List active membership packages.
- `POST /api/member/membership/pay` — Simulate membership purchase transaction.
- `GET /api/member/trainers` — List available trainers.
- `PATCH /api/member/trainer-preference` — Update trainer request or selection.
- `GET /api/member/fitness-level` — View current fitness level rank and progression history.
- `POST /api/member/fitness-level/check-promotion` — Evaluate consistency and promote member fitness rank.

### Trainer Endpoints (`/api/trainer`)
*(Restricted to `trainer` and `admin` roles)*
- `GET /api/trainer/members` — List all members assigned to the authenticated trainer.
- `GET /api/trainer/members/:memberId` — View detailed trainee profile and workout schedule.
- `POST /api/trainer/members/:memberId/assign-plan` — Assign a workout plan template to a trainee.
- `PUT /api/trainer/members/:memberId/workout-plan` — Update assigned trainee's workout plan directly.
- `GET /api/trainer/plans` — List custom workout plan templates in the trainer's library.
- `POST /api/trainer/plans` — Create a new workout plan template.
- `GET /api/trainer/plans/:planId` — Retrieve workout plan template details.
- `PUT /api/trainer/plans/:planId` — Update workout plan template.
- `DELETE /api/trainer/plans/:planId` — Delete workout plan template.

### Admin Endpoints (`/api/admin`)
*(Restricted to `admin` role)*
- `GET /api/admin/system-overview` — Platform metric counters (members, trainers, active memberships, today's visits).
- `GET /api/admin/users` — Directory of all users with roles and membership statuses.
- `PATCH /api/admin/users/:userId/status` — Update user role (`member`, `trainer`, `admin`) or membership status (`Active`, `Frozen`, `Expired`).
- `DELETE /api/admin/users/:userId` — Permanently delete user account with cascading trainee reassignment (self-deletion blocked).
- `GET /api/admin/schedule` — Retrieve weekly operating schedule and daily hours.
- `PUT /api/admin/schedule` — Update opening and closing hours for days of the week.
- `GET /api/admin/closures` — List all scheduled facility closures.
- `POST /api/admin/closures` — Schedule a new date-specific facility closure.
- `PUT /api/admin/closures/:id` — Update an existing closure date, reason, or announcement.
- `DELETE /api/admin/closures/:id` — Cancel and remove a facility closure.
- `GET /api/admin/membership-plans` — Manage membership pricing plans.
- `POST /api/admin/membership-plans` — Create a new membership plan.
- `PUT /api/admin/membership-plans/:id` — Update membership plan pricing, features, or active status.

### Real-Time Sync (`/api/sync`)
- `GET /api/sync/status` — Returns shared data change events across sessions for cross-tab notifications.

---

## Security

- **Authentication:** Stateless authentication using JWT tokens with configurable expiration (`JWT_EXPIRES_IN`). Passwords are encrypted using salted `bcryptjs` hashes before storage.
- **Role-Based Authorization:** Express middleware (`protect`, `restrictTo`) strictly guards administrative and trainer endpoints at the network layer. Frontend navigation guards reflect permissions in the user interface.
- **Active Membership Protection:** High-value facility actions (checking in, completing workout days, creating custom plans) enforce active paid membership verification via `requireActiveMembership`.
- **Administrative Safety:** Administrator accounts cannot delete their own active session (`400 Bad Request`), preventing accidental administrator lockouts.
- **Tab-Isolated Storage:** Session tokens and cached identities are managed via `sessionStorage` with unique tab session identifiers (`X-Tab-Session-Id`), preventing cross-tab role collision during multi-role sessions.
