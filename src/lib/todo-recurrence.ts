import { RRule, rrulestr } from "rrule"

export type RecurrenceTemplate = {
  rrule: string | null
  rruleUntil: Date | null
  dueAt: Date | null
}

function parseRule(rrule: string, dtstart?: Date): RRule | null {
  try {
    const opts = rrulestr(rrule, { dtstart }).options
    return new RRule(opts)
  } catch {
    return null
  }
}

export function expandOccurrences(
  template: RecurrenceTemplate,
  from: Date,
  to: Date
): Date[] {
  if (!template.rrule) return template.dueAt && template.dueAt >= from && template.dueAt <= to ? [template.dueAt] : []
  const rule = parseRule(template.rrule, template.dueAt ?? undefined)
  if (!rule) return []
  const upper = template.rruleUntil && template.rruleUntil < to ? template.rruleUntil : to
  return rule.between(from, upper, true)
}

export function nextOccurrenceAfter(
  template: RecurrenceTemplate,
  after: Date
): Date | null {
  if (!template.rrule) return null
  const rule = parseRule(template.rrule, template.dueAt ?? undefined)
  if (!rule) return null
  const next = rule.after(after, false)
  if (!next) return null
  if (template.rruleUntil && next > template.rruleUntil) return null
  return next
}

export function describeRecurrence(rrule: string | null): string {
  if (!rrule) return "Sin recurrencia"
  try {
    return rrulestr(rrule).toText()
  } catch {
    return "Recurrencia inválida"
  }
}
