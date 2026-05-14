# Constraints

## Deployment
- Target: VPS with Docker
- Region: not specified (developer's choice)

## Scale
- Launch: ~100 users
- 6 months: ~100 users (no aggressive growth target for v1.0)
- Request volume: low (personal-scale app, no high-concurrency requirements)

## Budget
- Infrastructure: up to $20/month
- Tooling: free/open-source preferred

## Compliance & Security
- HTTPS (TLS termination at reverse proxy)
- Passwords hashed (bcrypt or argon2)
- JWT-based session management
- Standard web security practices (no special compliance requirements for v1.0)
- GDPR: deferred to v1.1

## Tech Stack Preferences
- **Language**: TypeScript (both frontend and backend)
- **Frontend**: Vite + React + TypeScript + Material UI + Redux
- **Backend**: Vite + Node.js + Express + TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Containerization**: Docker + Docker Compose
- **Schema**: Prisma (`.prodready/define/data-model/schema.prisma`)
