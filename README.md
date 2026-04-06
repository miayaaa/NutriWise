# NutriWise

AI-powered nutrition and fitness tracking. Log meals, workouts, and weight — get personalized coaching from Claude based on your actual data.

## Features

- **Food logging** — plain text or photo (Claude Vision); AI estimates calories + macros with confidence indicator; one-tap recent meals reuse
- **Workout logging** — strength (sets/reps/weight), cardio with machine kcal field, or custom activities; workout templates with 4-day periodisation
- **Body measurements** — waist/hip tracking with 90-day trend chart; daily feel score
- **AI Coach** — chat with Claude using your real logged data as context; periodic 7/30/90-day insights with score; nutrition-first priority rules (low intake always flagged before workout advice)
- **Weekly snapshot** — 7-day calorie sparkline, food + workout streaks with milestone badges, daily logging dots
- **Dashboard** — daily calorie/macro summary with completion banner, water tracker, weight trend chart (90-day), intermittent fasting timer
- **Menstrual cycle tracking** — phase display (follicular/ovulatory/luteal/menstrual) with coach-aware notes; factored into AI advice
- **Personalization** — BMR/TDEE estimation (Mifflin-St Jeor), goal-based protein targets, calorie goals

## Stack

- **Framework**: [Next.js 14](https://nextjs.org) (App Router, TypeScript)
- **Database**: [Neon](https://neon.tech) PostgreSQL + [Prisma](https://www.prisma.io) ORM
- **Auth**: [NextAuth.js](https://next-auth.js.org) (Google & GitHub OAuth)
- **AI**: Anthropic Claude Haiku (streaming chat, calorie estimation, periodic insights)
- **UI**: [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com) + Recharts

## Running Locally

1. Clone and install:
```bash
git clone https://github.com/miayaaa/NutriWise.git
cd NutriWise
pnpm install
```

2. Copy and fill in environment variables:
```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Random secret (`openssl rand -base64 32`) |
| `NEXTAUTH_URL` | App URL (`http://localhost:3000` for local) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth |
| `GITHUB_ID` / `GITHUB_SECRET` | GitHub OAuth |

3. Set up the database and start:
```bash
pnpm postinstall    # generate Prisma client
pnpm db:check       # verify migration status
pnpm dev:checked    # start dev server with checks
```

## Key Commands

```bash
pnpm dev            # start dev server
pnpm build          # production build
npx prisma db push  # sync schema to DB
pnpm db:studio      # Prisma Studio GUI
pnpm test           # Jest tests
pnpm lint           # ESLint
pnpm ci:verify      # full CI check suite
```

## Project Structure

```
app/
  api/
    ai/chat/              # streaming Claude coach chat (SSE)
    ai/estimate/          # food calorie AI estimation (returns confidence)
    ai/vision-food/       # photo food log via Claude Vision
    coach/insights/       # periodic 7/30/90d analysis (cached 12h)
    food-logs/            # CRUD + history + recent reuse
    workout-logs/         # CRUD + last-performance lookup
    workout-templates/    # CRUD for 4-day training templates
    body-measurements/    # CRUD for waist/hip/feel logs
    water-logs/           # CRUD
    weight-logs/          # CRUD
    activities/           # custom activity tracking
  dashboard/              # main app pages
lib/
  ai/                     # Claude prompts & integration
  api/                    # DB query helpers
  cycle.ts                # menstrual cycle phase calculation
prisma/
  schema.prisma           # full data model
```
