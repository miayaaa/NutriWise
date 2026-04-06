# CLAUDE.md — NutriWise Dev Guide

## Stack Quick Reference

- **Next.js 14 App Router** — pages are async Server Components; mutations go through API routes
- **Prisma + Neon PostgreSQL** — `lib/db.ts` exports the singleton client
- **NextAuth** — every API route validates session via `getServerSession(authOptions)`
- **Claude Haiku** — used for all AI features (chat, calorie estimation, insights)
- **pnpm** — use pnpm, not npm/yarn

## Key Files for AI Coaching

| File | Purpose |
|---|---|
| `app/api/ai/chat/route.ts` | Streaming coach chat; `buildSystemPrompt()` injects all user context |
| `app/api/ai/estimate/route.ts` | Food calorie estimation (JSON-only output); returns `confidence` high/medium/low |
| `app/api/coach/insights/route.ts` | Triggers periodic insight generation, handles caching |
| `lib/ai/coach-insights.ts` | Claude prompt + fallback for 7/30/90d insights |
| `lib/ai/calories.ts` | Food estimation prompt |
| `lib/ai/workout.ts` | Post-workout comment generation |
| `lib/api/coach-insights.ts` | DB queries: aggregate metrics for insights |

## AI Coaching Behaviour

All five original coaching issues have been addressed:

1. **Calorie adequacy (chat)** — `buildSystemPrompt()` computes `todayCalorieTooLow` (< 1000 kcal or < 70% BMR) and `weeklyAvgTooLow` (< 1100 kcal or < BMR). Active alerts are injected into the prompt as `🚨 Active Priority Alerts` and the coaching style section has explicit priority rules: nutrition warning before any workout advice when intake is critically low.

2. **Fallback insights** — `fallbackCoachInsight()` gates the cardio recommendation on `intakeIsAdequate`. If intake is critically low, the action item is replaced with a nutrition adequacy warning. Score gets a `−15` penalty when `avgCaloriesPerLoggedDay < 1100` or `< BMR * 0.80`.

3. **Consecutive training days** — calculated in both `buildSystemPrompt()` and `fallbackCoachInsight()`. Chat prompt injects a `⚠️ PRIORITY ALERT — RECOVERY NEEDED` when ≥ 4 consecutive days are logged.

4. **Calorie estimate uncertainty** — `confidence` (high/medium/low) is returned by the estimate API and surfaced in `quick-food-log.tsx` via `CONFIDENCE_CONFIG`. Machine kcal in the chat prompt is labelled `(±30% estimate)`.

5. **Insight score penalty** — implemented in `fallbackCoachInsight()` via `lowIntakePenalty`.

## Coaching Philosophy

The goal is sustainable fat loss / muscle gain, not maximum short-term effort:

1. **Nutrition first** — adequate intake > more exercise. A 500 kcal deficit is correct; an 800+ kcal deficit is counterproductive.
2. **Trend over daily number** — weekly average matters more than any single day's log.
3. **Sustainable intensity** — "can you do this for 8 weeks?" is a better question than "can you do more today?"
4. **Data uncertainty** — calorie estimates (both food and exercise machines) have ±20-40% error. Frame advice with this in mind.
5. **Recovery is training** — consecutive high-intensity days without rest degrades results.

## Data Model Summary

```
User              → goals (calorie, water, weight), profile (age, gender, height), fasting schedule,
                    lastPeriodDate + avgCycleDays (menstrual cycle tracking)
FoodLog           → description, mealType, aiCalories, protein, carbs, fat, localDate (timezone-safe)
WorkoutLog        → type, durationMin, details (JSON: mode/strength/cardio/other)
WaterLog          → amount (ml), date
WeightLog         → weightKg, date
BodyMeasurement   → waistCm, hipCm, feelScore, notes, date
WorkoutTemplate   → name, description, exercises (JSON), cycleDay (1-4 periodisation)
CoachInsight      → rangeType (7d/30d/90d), summary, coachComment, actionItems[], score, cached 12h
Activity          → custom activities (hobbies, habits) with optional food tracking
```

## Common Patterns

```typescript
// Always validate session first
const session = await getServerSession(authOptions)
if (!session?.user) return new Response("Unauthorized", { status: 403 })

// Use localDate for food queries (timezone-safe daily grouping)
where: { localDate: "2026-03-25" }   // preferred over date range for daily views

// Claude calls always have fallbacks
try {
  const result = await callClaude(...)
  return result
} catch {
  return fallbackResponse(...)
}
```

## Dev Workflow

```bash
pnpm dev            # start locally
pnpm db:studio      # inspect DB visually
pnpm lint           # check before committing
```

When editing AI prompts, test with realistic edge cases:
- User with very low intake (< 1000 kcal) and fat_loss goal
- User who trained 5+ consecutive days
- User with no profile data set (age/height/weight missing)
- User on intermittent fasting who just logged a workout outside their eating window
