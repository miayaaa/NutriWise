/** Whether a local hour (0-23) falls inside the eating window; handles windows that wrap midnight. */
export function isInEatingWindow(hour: number, fastingStart: number, fastingEnd: number): boolean {
  return fastingEnd > fastingStart
    ? hour >= fastingStart && hour < fastingEnd
    : hour >= fastingStart || hour < fastingEnd
}
