export type CyclePhase = "menstrual" | "follicular" | "ovulation" | "luteal"

export interface CycleInfo {
  phase: CyclePhase
  dayOfCycle: number
  label: string
  /** Short note shown in the weight tracker card */
  shortNote: string
  /** Detailed note for the AI coach system prompt */
  coachNote: string
}

/**
 * Calculate the current menstrual cycle phase from the last period start date.
 * Day 1 = first day of period.
 */
export function getCycleInfo(lastPeriodDate: Date, avgCycleDays = 28): CycleInfo {
  const daysSince = Math.floor((Date.now() - lastPeriodDate.getTime()) / 86_400_000)
  const dayOfCycle = (daysSince % avgCycleDays) + 1

  // Approximate phase boundaries (scaled to cycle length)
  const ovulationDay = Math.round(avgCycleDays * 0.5)     // ~day 14 of 28
  const follicularEnd = ovulationDay - 1                   // ~day 13
  const menstrualEnd = Math.min(5, Math.round(avgCycleDays * 0.18))

  if (dayOfCycle <= menstrualEnd) {
    return {
      phase: "menstrual",
      dayOfCycle,
      label: "Menstrual",
      shortNote: "Energy may be lower · scale weight can be elevated",
      coachNote: `Day ${dayOfCycle} of menstrual phase. The user may have lower energy, strength, and motivation. Inflammation can temporarily elevate scale weight. Prioritise recovery, gentle movement, and adequate nutrition — do not push for PRs or add volume this week.`,
    }
  }

  if (dayOfCycle <= follicularEnd) {
    return {
      phase: "follicular",
      dayOfCycle,
      label: "Follicular",
      shortNote: "Rising energy · good time for hard sessions",
      coachNote: `Day ${dayOfCycle} of follicular phase. Estrogen is rising — this is the best phase for progressive overload, high-intensity training, and setting new weights. Recovery is typically faster. Encourage pushing intensity.`,
    }
  }

  if (dayOfCycle <= ovulationDay) {
    return {
      phase: "ovulation",
      dayOfCycle,
      label: "Ovulation",
      shortNote: "Peak energy · ideal for PRs",
      coachNote: `Day ${dayOfCycle}, ovulation window. Peak estrogen and testosterone — ideal for personal records and max-effort sessions. Strength and coordination are at their highest.`,
    }
  }

  // Luteal phase
  const daysPostOvulation = dayOfCycle - ovulationDay
  return {
    phase: "luteal",
    dayOfCycle,
    label: "Luteal",
    shortNote: "Water retention normal (+1–2 kg) · scale weight unreliable",
    coachNote: `Day ${dayOfCycle} of luteal phase (${daysPostOvulation}d post-ovulation). Progesterone is dominant — water retention of 1–2 kg is NORMAL and will resolve at the start of the next period. Do NOT interpret a scale weight increase as fat gain right now. Appetite and cravings are typically higher; this is hormonal, not a willpower issue. Moderate-intensity training is fine but avoid expecting PRs. If the user is frustrated by scale weight, reassure them this is cycle-related.`,
  }
}
