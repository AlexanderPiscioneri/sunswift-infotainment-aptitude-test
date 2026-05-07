// Store is the source of truth for what a log looks like.
export interface LogEntry {
  timestamp: number;
  component: "battery" | "motor" | "gps";
  value: number;
}
 
// Array in-memory "database" for the lifetime of the process.
const logs: LogEntry[] = [];
 
export function addLog(entry: LogEntry): void {
  logs.push(entry);
}
 
export function getAllLogs(): LogEntry[] {
  return [...logs];
}
 