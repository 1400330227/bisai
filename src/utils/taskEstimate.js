export function randomTaskBaseline() {
  return 5 + Math.floor(Math.random() * 3)
}

export function estimateTaskMinutes(baseline, workload = 0) {
  return Math.max(5, Math.min(10, Math.round(baseline + workload)))
}
