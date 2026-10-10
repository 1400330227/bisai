export function certaintyTone(value) {
  const text = String(value || '').trim()
  if (!text || /待核实|未披露|未知/.test(text)) return 'certainty-unknown'
  const levels = [text.includes('高'), text.includes('中'), text.includes('低')]
  if (levels.filter(Boolean).length > 1) return 'certainty-mixed'
  if (levels[0]) return 'certainty-high'
  if (levels[1]) return 'certainty-medium'
  if (levels[2]) return 'certainty-low'
  return 'certainty-unknown'
}
