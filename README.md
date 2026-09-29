# EsportsHub

> eSports tournament platform for **League of Legends** (multi-game ready) — a player transfer market, tournaments with live brackets, and real-time match tracking. Built with **Spring Boot** and **Angular**.

![Java](https://img.shields.io/badge/Java-21-ED8B00?style=flat-square&logo=openjdk&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring_Boot-4.1-6DB33F?style=flat-square&logo=springboot&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![Liquibase](https://img.shields.io/badge/Liquibase-2962FF?style=flat-square&logo=liquibase&logoColor=white)
![JWT](https://img.shields.io/badge/JWT-auth-000000?style=flat-square&logo=jsonwebtokens&logoColor=white)
![Spring Security](https://img.shields.io/badge/Spring_Security-RBAC-6DB33F?style=flat-square&logo=springsecurity&logoColor=white)
![Swagger](https://img.shields.io/badge/Swagger-OpenAPI-85EA2D?style=flat-square&logo=swagger&logoColor=black)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat-square&logo=docker&logoColor=white)
![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-010101?style=flat-square)
![Angular](https://img.shields.io/badge/Angular-planned-DD0031?style=flat-square&logo=angular&logoColor=white)

[Overview](#overview) · [Tech Stack](#tech-stack) · [Architecture](#architecture) · [Database](#database) · [Getting Started](#getting-started) · [Project Structure](#project-structure) · [Roadmap](#roadmap)

## Overview

EsportsHub is a platform for amateur esports competition. Players build profiles and get scouted on a **transfer market**, organizers run **tournaments** with automatically generated brackets, and matches are **streamed live** to spectators.

The whole system is designed as an **event + broadcast layer**: bracket updates, referee input, and in-game data all become events that flow through one WebSocket layer to everyone watching.

Core capabilities:

| | Feature |
|---|---|
| 👤 | **Profiles & accounts** — a player, one identity per game (rank, division, position, handle) |
| 💱 | **Transfer market** — listings, offers between teams, and contracts |
| 🏆 | **Tournaments** — player-created, admin-approved, with auto-generated brackets |
| 📡 | **Live matches** — real-time scoreboard and bracket updates over WebSocket |
| 🛡️ | **Integrity** — role-based access, dual result confirmation, full event log |

The domain is modelled **generically so any game can be added** (CS2, Valorant, Dota 2…). League of Legends is the first because it exposes a local live-data API.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Spring Boot 4.1 (Java 21, Maven) |
| Database | PostgreSQL — schema managed by **Liquibase** |
| Security | Spring Security + JWT authentication + role-based authorization |
| API docs | springdoc-openapi (**Swagger UI**) |
| Real-time | WebSocket (STOMP) *(planned)* |
| Messaging | RabbitMQ *(planned)* |
| Frontend | Angular *(planned)* |
| Dev infra | Docker Compose |

## Architecture

Three sources of live events converge on the backend and are broadcast to spectators over a single WebSocket layer:

```
  Riot Live API ─┐  (in-game data, via desktop agent — planned)
                 │
  Referee panel ─┼──▶  Spring Boot   ──▶  WebSocket  ──▶  Spectators
                 │     state machine      (STOMP)          (Angular)
  Bracket logic ─┘     + event log
```

1. **Server logic** — bracket generation & progression (server-authoritative)
2. **Referee panel** — manual score entry
3. **Riot Live Client Data API** — automatic in-game data via a desktop agent *(planned)*

Match and tournament lifecycles are modelled as **state machines** (a tournament moves `PENDING → REGISTRATION → ONGOING → COMPLETED`), and classic design patterns map onto concrete parts of the codebase — Strategy (bracket formats), Builder (bracket generation), Facade (match control), Observer (broadcasting).

## Database

The schema is fully managed by **Liquibase** migrations (`backend/src/main/resources/db/changelog/`) — the database is versioned in code and rebuilt identically on any machine. Hibernate never alters the schema (`ddl-auto: none`).

The model is generic: a person (`users`) is separated from their per-game identity (`game_accounts`), and a `games` catalog drives everything, so a new game is a single row rather than a schema change. A player has **one account per game** (enforced by a unique constraint) but can play many games.

## Getting Started

**Prerequisites:** JDK 21, Docker Desktop *(Node.js later for the frontend)*.

```bash
# 1. Start the PostgreSQL database
docker compose up -d

# 2. Run the backend
cd backend
./mvnw spring-boot:run
```

On startup, Liquibase builds the full schema automatically and a default **admin** account is created (`admin` / `admin12345`, overridable via the `ADMIN_PASSWORD` env variable). Explore and test every endpoint in the browser via **Swagger UI**:

```
http://localhost:8080/swagger-ui.html
```

Key endpoints:

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create an account, returns a JWT |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET  | `/api/tournaments` | List approved tournaments (public) |
| POST | `/api/tournaments` | Create a tournament → `PENDING` (auth) |
| GET  | `/api/tournaments/pending` | Pending tournaments (**ADMIN**) |
| POST | `/api/tournaments/{id}/approve` | Approve a tournament (**ADMIN**) |
| GET  | `/api/me/game-accounts` | My per-game accounts (auth) |
| POST | `/api/me/game-accounts` | Add a per-game account (auth) |
| GET  | `/api/players/{username}/game-accounts` | Public player profile |

Authentication is stateless: register or log in, then send the returned token in the `Authorization: Bearer <token>` header (in Swagger, click **Authorize** and paste it). Role-restricted routes are guarded with `@PreAuthorize` — a non-admin calling an admin route gets a `403`.

## Project Structure

```
EsportsHub/
├── backend/                 # Spring Boot API
│   ├── src/main/java/com/esportshub/backend/
│   │   ├── auth/            # JWT auth (register, login, filter, service)
│   │   ├── user/            # User & Role entities, repositories
│   │   ├── game/            # Game catalog (read-only reference data)
│   │   ├── gameaccount/     # Per-game player identity (profiles, market status)
│   │   ├── tournament/      # Tournaments: creation, ownership, admin approval
│   │   └── config/          # Security, OpenAPI, data bootstrap
│   └── src/main/resources/
│       └── db/changelog/    # Liquibase migrations (the DB schema)
├── frontend/                # Angular app (planned)
└── docker-compose.yml       # PostgreSQL for local dev
```

## Roadmap

- [x] Project skeleton, PostgreSQL via Docker, Liquibase
- [x] Full generic multi-game database schema
- [x] Users & roles (entities, repositories, endpoint)
- [x] 🔐 Authentication — registration & JWT login
- [x] 📖 API documentation with Swagger UI
- [x] 🛡️ Role-based authorization (RBAC) on endpoints
- [x] 👤 Player profiles & per-game accounts (rank, division, position, market status)
- [x] 🏆 Tournaments — player-created, organizer ownership, admin approval (state machine)
- [ ] 👥 Teams & rosters
- [ ] 💱 Transfer market — listings, offers, contracts
- [ ] 🧩 Bracket generation & seeding (Strategy + Builder)
- [ ] 📡 Live match tracking (WebSocket + state machine)
- [ ] 🎮 Riot Live Client Data agent (RabbitMQ)
- [ ] 🖥️ Angular frontend

---

*Academic project — Electrical Engineering.*
