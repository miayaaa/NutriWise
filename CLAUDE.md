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
| `app/api/ai/estimate/route.ts` | Food calorie estimation (JSON-only output) |
| `app/api/coach/insights/route.ts` | Triggers periodic insight generation, handles caching |
| `lib/ai/coach-insights.ts` | Claude prompt + fallback for 7/30/90d insights |
| `lib/ai/calories.ts` | Food estimation prompt |
| `lib/ai/workout.ts` | Post-workout comment generation |
| `lib/api/coach-insights.ts` | DB queries: aggregate metrics for insights |

## AI Coaching — Known Issues & Improvements Needed

### Problem 1: Recommends more intensity without checking calorie adequacy

**Root cause**: The chat system prompt says "For fat_loss: add cardio frequency" with no guard condition. Claude can see today's calories in context but has no instruction to prioritize nutrition warnings above exercise advice.

**Fix**: Add explicit priority rules at the top of the coaching style section in `buildSystemPrompt()` (`app/api/ai/chat/route.ts`):
- If today's calories < 1000 kcal (or < 70% of BMR), lead with a nutrition warning before any workout advice
- Never recommend increasing workout intensity on days with extreme calorie deficit
- Flag if weekly average intake is below BMR

### Problem 2: Fallback insights ignore calorie intake entirely

**Root cause**: `fallbackCoachInsight()` in `lib/ai/coach-insights.ts` always adds "Add one 20-min cardio session" for fat_loss regardless of `metrics.nutrition.avgCaloriesPerLoggedDay`.

**Fix**: Gate the cardio recommendation on adequate average intake (e.g., `>= 1100 kcal/day`). If intake is too low, replace with a nutrition adequacy action item.

### Problem 3: No consecutive training days awareness

**Root cause**: The workout summary in `buildSystemPrompt()` lists recent workouts but the system prompt doesn't instruct Claude to check for rest day needs.

**Fix**: Calculate consecutive training days from `recentWorkouts` and add to context. Add coaching instruction: if ≥ 4 consecutive days logged, recommend active recovery before more intensity.

### Problem 4: Calorie estimates are presented as precise

**Root cause**: AI returns a single kcal number with no uncertainty framing. For mixed-ingredient foods (pies, dumplings), real error can be ±30-40%.

**Fix**: The estimate API already returns a `confidence` field (high/medium/low) — surface this in the UI when confidence is not "high". Consider displaying as a range on medium/low confidence.

### Problem 5: Insights treat every metric equally

**Root cause**: The insight score formula in fallback weights workout sessions (max 40 pts) but doesn't penalize dangerously low intake.

**Fix**: Add a penalty to the score when `avgCaloriesPerLoggedDay` is below `bmrKcal * 0.8`.

## Coaching Philosophy to Encode

The goal is sustainable fat loss / muscle gain, not maximum short-term effort. The AI should reflect this:

1. **Nutrition first** — adequate intake > more exercise. A 500 kcal deficit is correct; an 800+ kcal deficit is counterproductive.
2. **Trend over daily number** — weekly average matters more than any single day's log.
3. **Sustainable intensity** — "can you do this for 8 weeks?" is a better question than "can you do more today?"
4. **Data uncertainty** — calorie estimates (both food and exercise machines) have ±20-40% error. Frame advice with this in mind.
5. **Recovery is training** — consecutive high-intensity days without rest degrades results.

## Data Model Summary

```
User         → goals (calorie, water, weight), profile (age, gender, height), fasting schedule
FoodLog      → description, mealType, aiCalories, protein, carbs, fat, localDate (timezone-safe)
WorkoutLog   → type, durationMin, details (JSON: mode/strength/cardio/other)
WaterLog     → amount (ml), date
WeightLog    → weightKg, date
CoachInsight → rangeType (7d/30d/90d), summary, coachComment, actionItems[], score, cached 12h
Activity     → custom activities (hobbies, habits) with optional food tracking
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
