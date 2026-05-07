import { LogEntry } from "./store.ts";
 
const ALLOWED_COMPONENTS: ReadonlySet<LogEntry["component"]> = new Set(["battery", "motor", "gps"]);
 
export type ValidationResult =
  | { valid: true; entry: LogEntry }
  | { valid: false; reason: string };
 
/*
 Validates a single raw log entry.
 Kept separate from server.ts so it can be unit-tested without Express,
 similar to COMP1531
 */
export function validateEntry(raw: unknown): ValidationResult {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { valid: false, reason: "Entry must be a JSON object." };
  }
 
  const { timestamp, component, value } = raw as Record<string, unknown>;
 
  if (timestamp === undefined)
    return { valid: false, reason: "Missing required field: timestamp." };
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp))
    return { valid: false, reason: "'timestamp' must be a finite number (ms since epoch)." };
 
  if (component === undefined)
    return { valid: false, reason: "Missing required field: component." };
  if (!ALLOWED_COMPONENTS.has(component as LogEntry["component"]))
    return { valid: false, reason: `'component' must be one of: ${[...ALLOWED_COMPONENTS].join(", ")}. Got: "${component}".` };
 
  if (value === undefined)
    return { valid: false, reason: "Missing required field: value." };
  if (typeof value !== "number" || !Number.isFinite(value))
    return { valid: false, reason: "'value' must be a finite number." };
 
  return { valid: true, entry: { timestamp, component: component as LogEntry["component"], value } };
}
 