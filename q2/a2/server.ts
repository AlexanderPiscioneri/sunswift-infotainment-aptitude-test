/*
  Borrowed a similar structure to the one seen in COMP1531 for this task, as it is
  relatively simple to follow and is also something I'm more familiar with than
  other methods I found in my research/refreshment of thesse concepts.
  
  I assumed the backend storage is simple in memory storage as advised, and treated
  logs as an array of objects, as it seemed the most intuitive and simple solution,
  although I'm curious to know if there is another solution in reality where logs
  are stored in a more sustainable way that handles a large number of entries/allocates
  mmemory more efficiently than an array.

  For validation, I covered every value I could think of and then asked AI if
  there was anything I had missed, and it had picked up more vague ones such as
  checking if a number is finite. I also realised keeping the component types
  modular would also make more sense than hard checking them, so it could be
  expanded more easily in the future.
*/

import express, { Request, Response } from "express";
import { addLog, getAllLogs, LogEntry } from "./store.js";
import { validateEntry } from "./validation.ts";
 
const app = express();
app.use(express.json());
 
/* POST /logs/upload
  - Accept a JSON array of telemetry logs
  - Validate each entry
  - Store valid entries in memory
  - Reject invalid entries with a meaningful error response
*/
app.post("/logs/upload", (req: Request, res: Response): void => {
  const body: unknown = req.body;
 
  if (!Array.isArray(body)) {
    res.status(400).json({ error: "Request body must be a JSON array." });
    return;
  }
  if (body.length === 0) {
    res.status(400).json({ error: "Log array must not be empty." });
    return;
  }
 
  const accepted: number[] = [];
  const rejected: { index: number; reason: string }[] = [];
 
  for (let i = 0; i < body.length; i++) {
    const result = validateEntry(body[i]);
    if (result.valid) {
      addLog(result.entry);
      accepted.push(i);
    } else {
      rejected.push({ index: i, reason: result.reason });
    }
  }
 
  if (accepted.length === 0) {
    res.status(400).json({ error: "No valid entries. Nothing stored.", rejected });
    return;
  }
 
  res.status(201).json({
    message: `${accepted.length} out of ${body.length} entries accepted.`,
    accepted: accepted.length,
    ...(rejected.length > 0 && { rejected }),
  });
});

/* GET /logs/summary
  This endpoint computes and returns:
  - Total number of stored events
  - For each component:
      - Count
      - Minimum value
      - Maximum value
      - Average value
  - The latest event (by timestamp)
*/
app.get("/logs/summary", (_req: Request, res: Response): void => {
  const logs = getAllLogs();
 
  if (logs.length === 0) {
    res.status(200).json({ count: 0, components: {}, latest: null });
    return;
  }
 
  type Acc = { count: number; min: number; max: number; sum: number };
  const acc: Partial<Record<LogEntry["component"], Acc>> = {};
  let latest = logs[0];
 
  for (const log of logs) {
    if (log.timestamp > latest.timestamp) latest = log;
 
    const s = acc[log.component];
    if (!s) {
      acc[log.component] = { count: 1, min: log.value, max: log.value, sum: log.value };
    } else {
      s.count++;
      s.sum += log.value;
      if (log.value < s.min) s.min = log.value;
      if (log.value > s.max) s.max = log.value;
    }
  }
 
  const components = Object.fromEntries(
    (Object.entries(acc) as [LogEntry["component"], Acc][]).map(([component, s]) => [
      component,
      { count: s.count, min: s.min, max: s.max, avg: Number((s.sum / s.count).toFixed(4)) },
    ])
  );
 
  res.status(200).json({ count: logs.length, components, latest });
});
 
const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => console.log(`Telemetry API listening on http://localhost:${PORT}`));
 
export default app;