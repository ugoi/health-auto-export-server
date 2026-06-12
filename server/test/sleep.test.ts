import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { saveMetrics } from '../src/controllers/metrics';
import { SleepModel } from '../src/models/Metric';
import { aggregateSleepByDay, sleepDayQuery, zonedMidnightUtc } from '../src/sleepDay';

let mongod: MongoMemoryServer;

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'hae_test' });
  // Mirrors startup: builds the per-segment unique index
  await SleepModel.syncIndexes();
}, 120000);

afterAll(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

beforeEach(async () => {
  await SleepModel.deleteMany({});
});

const SOURCE = "Stefan's Apple Watch";

// Three segments of the same night, same HAE `date` and source — the shape
// Apple Health / HAE actually sends. Night ends local morning Jun 12 (Zürich).
const segment = (sleepStart: string, sleepEnd: string, stages: Partial<Record<string, number>> = {}) => ({
  date: '2026-06-12 00:00:00 +0200',
  inBedStart: sleepStart,
  inBedEnd: sleepEnd,
  sleepStart,
  sleepEnd,
  core: stages.core ?? 1,
  rem: stages.rem ?? 0.5,
  deep: stages.deep ?? 0.5,
  awake: stages.awake ?? 0.1,
  inBed: stages.inBed ?? 2.1,
  source: SOURCE,
});

const ingestPayload = (segments: ReturnType<typeof segment>[]) => ({
  data: {
    metrics: [
      {
        name: 'sleep_analysis',
        units: 'hr',
        data: segments as never[],
      },
    ],
  },
});

const NIGHT = [
  segment('2026-06-11T22:00:00Z', '2026-06-12T00:10:00Z', { core: 1.5, rem: 0.3, deep: 0.3 }),
  segment('2026-06-12T00:20:00Z', '2026-06-12T02:30:00Z', { core: 1.2, rem: 0.6, deep: 0.3 }),
  segment('2026-06-12T02:40:00Z', '2026-06-12T04:33:00Z', { core: 0.85, rem: 0.6, deep: 0.4 }),
];

describe('sleep segment ingestion', () => {
  it('persists multiple same-date/source segments without overwriting', async () => {
    const response = await saveMetrics(ingestPayload(NIGHT));
    expect(response.metrics?.success).toBe(true);

    const stored = await SleepModel.find({}).sort({ sleepStart: 1 }).lean();
    expect(stored).toHaveLength(3);
    // Total asleep across segments ≈ 6h03, not just the last segment
    const totalAsleep = stored.reduce((sum, s) => sum + s.core + s.rem + s.deep, 0);
    expect(totalAsleep).toBeCloseTo(6.05, 2);
  });

  it('re-ingesting the same segments is idempotent (upsert, no duplicates)', async () => {
    await saveMetrics(ingestPayload(NIGHT));
    await saveMetrics(ingestPayload(NIGHT));
    expect(await SleepModel.countDocuments()).toBe(3);
  });
});

describe('local sleep-day query (Europe/Zurich)', () => {
  it('local midnight Jun 12 in Zürich (CEST) is 2026-06-11T22:00Z', () => {
    expect(zonedMidnightUtc('2026-06-12', 'Europe/Zurich').toISOString()).toBe(
      '2026-06-11T22:00:00.000Z',
    );
  });

  it('returns the night starting 2026-06-11T22:00Z for local date 2026-06-12', async () => {
    const previousNight = segment('2026-06-10T21:30:00Z', '2026-06-11T05:00:00Z');
    previousNight.date = '2026-06-11 00:00:00 +0200';
    await saveMetrics(ingestPayload([...NIGHT, previousNight]));

    const query = sleepDayQuery(
      new Date('2026-06-12T00:00:00Z'),
      new Date('2026-06-12T00:00:00Z'),
      'Europe/Zurich',
    );
    const found = await SleepModel.find(query).sort({ sleepStart: 1 }).lean();

    // Only the 3 segments of the night ending local Jun 12 — a naive UTC
    // date filter would have missed the 22:00Z start entirely.
    expect(found).toHaveLength(3);
    expect(found[0].sleepStart.toISOString()).toBe('2026-06-11T22:00:00.000Z');
    expect(found.every((s) => s.sleepEnd > new Date('2026-06-11T22:00:00Z'))).toBe(true);
  });

  it('aggregates day totals across all segments of the local sleep-day', async () => {
    await saveMetrics(ingestPayload(NIGHT));
    const found = await SleepModel.find(
      sleepDayQuery(new Date('2026-06-12'), new Date('2026-06-12'), 'Europe/Zurich'),
    ).lean();

    const days = aggregateSleepByDay(found as never[], 'Europe/Zurich');
    expect(days).toHaveLength(1);
    expect(days[0].date).toBe('2026-06-12');
    expect(days[0].segments).toBe(3);
    expect(days[0].asleep).toBeCloseTo(6.05, 2); // ≈ 6h03, not a single segment's 1h51
    expect(days[0].sleepStart.toISOString()).toBe('2026-06-11T22:00:00.000Z');
    expect(days[0].sleepEnd.toISOString()).toBe('2026-06-12T04:33:00.000Z');
  });
});
