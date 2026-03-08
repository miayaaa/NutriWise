import * as z from "zod"

export const userNameSchema = z.object({
  name: z.string().min(3).max(32),
})

export const userProfileSchema = z.object({
  dailyCalorieGoal: z.number().int().min(500).max(10000),
})

export const userWaterGoalSchema = z.object({
  dailyWaterGoal: z.number().int().min(500).max(5000),
})

export const userFastingSchema = z.object({
  fastingEnabled: z.boolean(),
  fastingStart: z.number().int().min(0).max(23),
  fastingEnd: z.number().int().min(0).max(23),
})

export const userBodyMetricsSchema = z.object({
  heightCm: z.number().int().min(80).max(260).nullable().optional(),
  weightGoalKg: z.number().min(25).max(350).nullable().optional(),
})
