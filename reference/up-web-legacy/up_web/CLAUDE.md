# CLAUDE.md

This file provides guidance to Claude Code when working with this project.

## Project Overview

T-Agent Web Application - Next.js frontend for TV production AI agent platform.

## Key References

### Database Schema
**Always refer to the schema before making database-related changes:**
- Schema: `../supabase/migrations/20251218162514_initial_schema.sql`
- Seed data: `../supabase/seed.sql`

### Documentation
**Refer to docs as needed:**
- `../docs/webapp/` - Web application design documents

## Development Commands

```bash
# Development
npm run dev              # Local with real auth (port 3100)
npm run dev:bypass       # Local with bypass auth (admin@actraise.org)
npm run dev:online       # Online (api.actraise.org) with bypass

# Database
npm run db:reset         # Reset local database with seed
npm run db:reset:full    # Reset with storage seeding
npm run supabase:start   # Start local Supabase
npm run supabase:stop    # Stop local Supabase
```

## Test Users (from seed.sql)

| Email | Role | Password |
|-------|------|----------|
| admin@actraise.org | system_admin + owner | password |
| test-admin@example.com | workspace admin | password |
| test-user@example.com | workspace member | password |

## Git Workflow

**Commit after every meaningful change:**
- After completing a feature or fix
- After modifying schema or migrations
- After updating configuration files
- Before switching to a different task

Use descriptive commit messages that explain the "why" not just the "what".

## Architecture

```
up_web/                     # Next.js frontend
├── lib/
│   ├── auth/              # Bypass authentication middleware
│   ├── supabase/          # Supabase client (server/client)
│   └── logger.ts          # Pino logging
├── middleware.ts          # Auth middleware with bypass support
└── .env.*                 # Environment configurations

../supabase/               # Supabase backend
├── migrations/            # Database schema
├── seed.sql              # Test data
└── config.toml           # Supabase configuration
```

## Environment Files

- `.env` - Local development with real auth
- `.env.bypass.local` - Local development with bypass auth
- `.env.bypass` - Online (production) with bypass auth

## Storage Buckets

| Bucket | Public | Max Size | Purpose |
|--------|--------|----------|---------|
| avatars | Yes | 5MB | User profile images |
| workspace-logos | Yes | 5MB | Workspace logos |
| program-covers | Yes | 10MB | Program cover images |
| attachments | No | 50MB | Chat attachments |
| exports | No | 100MB | Generated outputs |
