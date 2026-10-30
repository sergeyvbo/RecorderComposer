import { z } from 'zod';
import { checkInvariants } from './invariants';
import { MAX_PITCH, MAX_TEMPO, MAX_TITLE, MIN_PITCH, MIN_TEMPO, type Melody } from './types';

export const FORMAT_ID = 'recorder-composer';
export const CURRENT_FORMAT_VERSION = 1;

/** Mirrors specs/001-recorder-composer/contracts/melody-file.schema.json (v1). */
const noteSchema = z
  .object({
    id: z.string().min(1).max(64),
    pitch: z.number().int().min(MIN_PITCH).max(MAX_PITCH),
    start: z.number().int().min(0).multipleOf(60),
    duration: z.number().int().min(60).multipleOf(60),
  })
  .strict();

const timeSignatureSchema = z.union([
  z.object({ beats: z.literal(2), beatUnit: z.literal(4) }).strict(),
  z.object({ beats: z.literal(3), beatUnit: z.literal(4) }).strict(),
  z.object({ beats: z.literal(4), beatUnit: z.literal(4) }).strict(),
  z.object({ beats: z.literal(6), beatUnit: z.literal(8) }).strict(),
]);

const keySchema = z.union([
  z.object({ tonic: z.enum(['C', 'G', 'D', 'A', 'E', 'F', 'Bb', 'Eb', 'Ab']), mode: z.literal('major') }).strict(),
  z.object({ tonic: z.enum(['A', 'E', 'B', 'F#', 'C#', 'D', 'G', 'C', 'F']), mode: z.literal('minor') }).strict(),
]);

const melodySchema = z
  .object({
    id: z.string().uuid(),
    title: z.string().min(1).max(MAX_TITLE).refine((t) => t.trim().length > 0),
    tempoBpm: z.number().int().min(MIN_TEMPO).max(MAX_TEMPO),
    timeSignature: timeSignatureSchema,
    key: keySchema,
    notes: z.array(noteSchema).max(5000),
    createdAt: z.string().datetime({ offset: true }),
    updatedAt: z.string().datetime({ offset: true }),
  })
  .strict();

const fileSchemaV1 = z
  .object({ format: z.literal(FORMAT_ID), formatVersion: z.literal(1), melody: melodySchema })
  .strict();

export type MelodyFileV1 = { format: typeof FORMAT_ID; formatVersion: 1; melody: Melody };

/** formatVersion n → n + 1. Empty while only v1 exists (Principle V). */
const MIGRATIONS: Record<number, (doc: Record<string, unknown>) => Record<string, unknown>> = {};

export type ParseError = 'notJson' | 'wrongFormat' | 'newerVersion' | 'invalid';
export type ParseResult =
  | { ok: true; melody: Melody; migratedFrom?: number }
  | { ok: false; error: ParseError; details?: string };

export function serialize(m: Melody): MelodyFileV1 {
  return { format: FORMAT_ID, formatVersion: 1, melody: m };
}

/** Parse an exported file (text or already-parsed JSON) or a stored document. */
export function parseMelodyFile(input: unknown): ParseResult {
  let json = input;
  if (typeof input === 'string') {
    try {
      json = JSON.parse(input);
    } catch {
      return { ok: false, error: 'notJson' };
    }
  }
  if (!json || typeof json !== 'object' || (json as { format?: unknown }).format !== FORMAT_ID) {
    return { ok: false, error: 'wrongFormat' };
  }
  let doc = json as Record<string, unknown>;
  const version = doc.formatVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: 'invalid', details: 'formatVersion' };
  }
  if (version > CURRENT_FORMAT_VERSION) return { ok: false, error: 'newerVersion' };
  for (let v = version; v < CURRENT_FORMAT_VERSION; v++) {
    const migrate = MIGRATIONS[v];
    if (!migrate) return { ok: false, error: 'invalid', details: `no migration from ${v}` };
    doc = migrate(doc);
  }
  const parsed = fileSchemaV1.safeParse(doc);
  if (!parsed.success) {
    return { ok: false, error: 'invalid', details: parsed.error.issues[0]?.message ?? 'schema' };
  }
  const melody = parsed.data.melody as Melody;
  const problems = checkInvariants(melody);
  if (problems.length) return { ok: false, error: 'invalid', details: problems[0] ?? 'invariant' };
  return version === CURRENT_FORMAT_VERSION ? { ok: true, melody } : { ok: true, melody, migratedFrom: version };
}
