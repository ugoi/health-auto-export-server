import { SleepMetric } from './models/Metric';

/**
 * Sleep-day helpers.
 *
 * Sleep segments are stored as UTC instants, but a "night" belongs to the
 * LOCAL calendar date it ends on (the date the user wakes up). E.g. a night
 * starting 2026-06-11T22:00:00Z in Europe/Zurich (CEST, UTC+2) is midnight
 * June 12 local — it belongs to sleep-day 2026-06-12.
 */

export const SLEEP_TIMEZONE = process.env.TIMEZONE || 'Europe/Zurich';

/** Offset of `timeZone` from UTC in minutes at the given instant (CEST → 120). */
const tzOffsetMinutes = (date: Date, timeZone: string): number => {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) {
    parts[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === '24' ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return (asUtc - date.getTime()) / 60000;
};

/** UTC instant of local midnight at the start of `YYYY-MM-DD` in `timeZone`. */
export const zonedMidnightUtc = (day: string, timeZone: string = SLEEP_TIMEZONE): Date => {
  const guess = new Date(`${day}T00:00:00Z`);
  const offset = tzOffsetMinutes(guess, timeZone);
  let result = new Date(guess.getTime() - offset * 60000);
  // Re-check in case the offset differs at the corrected instant (DST edge)
  const offset2 = tzOffsetMinutes(result, timeZone);
  if (offset2 !== offset) {
    result = new Date(guess.getTime() - offset2 * 60000);
  }
  return result;
};

/** Local calendar date (YYYY-MM-DD) of a UTC instant in `timeZone`. */
export const localDayOf = (date: Date, timeZone: string = SLEEP_TIMEZONE): string => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
};

const datePart = (d: Date): string => d.toISOString().slice(0, 10);

const nextDay = (day: string): string => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return datePart(d);
};

/**
 * Mongo filter for sleep segments belonging to local sleep-days
 * [fromDay .. toDay] (inclusive): a segment belongs to the local date its
 * sleepEnd falls on, so we filter sleepEnd over (local midnight of fromDay,
 * local midnight after toDay].
 */
export const sleepDayQuery = (
  fromDate: Date,
  toDate: Date,
  timeZone: string = SLEEP_TIMEZONE,
): Record<string, unknown> => {
  const start = zonedMidnightUtc(datePart(fromDate), timeZone);
  const end = zonedMidnightUtc(nextDay(datePart(toDate)), timeZone);
  return { sleepEnd: { $gt: start, $lte: end } };
};

export interface SleepDaySummary {
  date: string; // local sleep-day, YYYY-MM-DD
  segments: number;
  sleepStart: Date;
  sleepEnd: Date;
  asleep: number; // core + rem + deep
  core: number;
  rem: number;
  deep: number;
  awake: number;
  inBed: number;
}

/**
 * Sum sleep segments into per-local-sleep-day totals. A day's totals span
 * ALL segments whose sleepEnd falls on that local date.
 */
export const aggregateSleepByDay = (
  segments: SleepMetric[],
  timeZone: string = SLEEP_TIMEZONE,
): SleepDaySummary[] => {
  const byDay = new Map<string, SleepDaySummary>();
  for (const seg of segments) {
    const sleepStart = new Date(seg.sleepStart);
    const sleepEnd = new Date(seg.sleepEnd);
    const day = localDayOf(sleepEnd, timeZone);
    const existing = byDay.get(day);
    if (!existing) {
      byDay.set(day, {
        date: day,
        segments: 1,
        sleepStart,
        sleepEnd,
        asleep: seg.core + seg.rem + seg.deep,
        core: seg.core,
        rem: seg.rem,
        deep: seg.deep,
        awake: seg.awake,
        inBed: seg.inBed,
      });
    } else {
      existing.segments += 1;
      if (sleepStart < existing.sleepStart) existing.sleepStart = sleepStart;
      if (sleepEnd > existing.sleepEnd) existing.sleepEnd = sleepEnd;
      existing.asleep += seg.core + seg.rem + seg.deep;
      existing.core += seg.core;
      existing.rem += seg.rem;
      existing.deep += seg.deep;
      existing.awake += seg.awake;
      existing.inBed += seg.inBed;
    }
  }
  return [...byDay.values()].sort((a, b) => a.date.localeCompare(b.date));
};
