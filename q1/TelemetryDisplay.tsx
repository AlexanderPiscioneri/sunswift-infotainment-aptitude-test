/*
This component is also included in a blank vite project (q1-project) that I used to visualise the component.
This particular task can largely be accomplished with AI (as I am sure you are acutely aware of), so my approach 
largely involved me learning the fundamentals of React, and how it compares to Flutter, another framework for 
platform-agnostic development that I am more familiar with. Particularly, avoiding the temptation to copy and paste
blindly until something works, and instead relying on my experience with TypeScript in COMP1531 to do what I can,
and reasearching or asking AI about React-isms or more HTML-esc things when I got stuck.

Data interpretation justifications:
1. Timestamp - this always seems to be reliable, although I made it display seconds relative to some other time, which can be changed
but in my case I made it seconds passed since the first data point

2. Speed - I put a hard ceiling for speed in km/h as well as a maximum km/h change allowed per 100ms, thinking that these would potentially
be altered depending on the kind of test or when the data was recorded (i.e. testing dmax acceleration from rest might be more lenient on how
fast the car can accelerate etc.) for null or unrealistic speeds I interpolated between neighbouring points

3. Battery - Parsed the number, interpolated if null

4. Motor temp - Parsed the number, interpolated if null, added an alert above the graph if temperature is ever above some specified temperature

5. GPS - Parsed the coords, interpolated if null

*/

import rawData from '../data/telemetry_sample.json'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface GPSPoint {
    lat: number;
    lng: number;
}

interface TelemetryEntry {
    timestamp: number;
    speed: number | null;
    battery: number | null;
    motorTemp: number | null;
    gps: GPSPoint | null;
}

const SPEED_MAX = 200; // km/h — hard ceiling
const ACCEL_MAX = 10; // km/h change allowed per 100ms
const MOTOR_TEMP_WARN = 90;

function TelemetryDisplay() {
    const data = normaliseData(rawData as unknown[]);
    const peakEntry = data.reduce((max, d) => (d.motorTemp ?? 0) > (max.motorTemp ?? 0) ? d : max, data[0]);
    const overTemp = (peakEntry.motorTemp ?? 0) > MOTOR_TEMP_WARN;

    return (
        <div>
            <h3>Speed</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid />
                    <XAxis dataKey="timestamp" tickFormatter={(t) => `+${((t - data[0].timestamp) / 1000).toFixed(1)}s`} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(v) => v.toFixed(1)} label={{ value: 'Speed (km/h)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : '—')} labelFormatter={(t) => `+${((t - data[0].timestamp) / 1000).toFixed(1)}s`} />
                    <Line type="monotone" dataKey="speed" stroke="#2563eb" dot={false} connectNulls />
                </LineChart>
            </ResponsiveContainer>

            <h3>Battery</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid />
                    <XAxis dataKey="timestamp" tickFormatter={(t) => `+${((t - data[0].timestamp) / 1000).toFixed(1)}s`} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(v) => v.toFixed(1)} label={{ value: 'Battery (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : '—')} labelFormatter={(t) => `+${((t - data[0].timestamp) / 1000).toFixed(1)}s`} />
                    <Line type="monotone" dataKey="battery" stroke="#16a34a" dot={false} connectNulls />
                </LineChart>
            </ResponsiveContainer>

            <h3>Motor Temperature</h3>
            {overTemp && (
                <div style={{ color: 'red' }}>
                    Motor temp critical: peak {peakEntry.motorTemp?.toFixed(1)}°C at +{((peakEntry.timestamp - data[0].timestamp) / 1000).toFixed(1)}s
                </div>
            )}
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data}>
                    <CartesianGrid />
                    <XAxis dataKey="timestamp" tickFormatter={(t) => `+${((t - data[0].timestamp) / 1000).toFixed(1)}s`} label={{ value: 'Time (s)', position: 'insideBottom', offset: -5 }} />
                    <YAxis tickFormatter={(v) => v.toFixed(1)} label={{ value: 'Temp (°C)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(v) => (typeof v === 'number' ? v.toFixed(1) : '—')} labelFormatter={(t) => `+${((t - data[0].timestamp) / 1000).toFixed(1)}s`} />
                    <Line
                        type="monotone"
                        dataKey="motorTemp"
                        stroke="#f97316"
                        dot={(props) => {
                            const { cx, cy, payload } = props;
                            if ((payload.motorTemp ?? 0) <= MOTOR_TEMP_WARN) return <></>;
                            return <circle key={props.key} cx={cx} cy={cy} r={4} fill="#dc2626" />;
                        }}
                        connectNulls
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

export default TelemetryDisplay;

function parseNumber(value: unknown): number | null {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return isNaN(value) ? null : value;
    if (typeof value === 'string') {
        const parsed = parseFloat(value);
        return isNaN(parsed) ? null : parsed;
    }
    return null;
}

// Linear interpolate a numeric field across null gaps
function interpolateField(
    entries: TelemetryEntry[],
    field: 'speed' | 'battery' | 'motorTemp'
): void {
    let i = 0;
    while (i < entries.length) {
        if (entries[i][field] === null) {
            // Find the last known value before the gap
            const left = i - 1;
            // Find the next known value after the gap
            let right = i + 1;
            while (right < entries.length && entries[right][field] === null) right++;

            if (left >= 0 && right < entries.length) {
                // Interpolate using timestamps for accurate spacing
                const t0 = entries[left].timestamp;
                const t1 = entries[right].timestamp;
                const v0 = entries[left][field] as number;
                const v1 = entries[right][field] as number;

                for (let j = left + 1; j < right; j++) {
                    const t = (entries[j].timestamp - t0) / (t1 - t0);
                    (entries[j][field] as any) = v0 + (v1 - v0) * t;
                }
            }
            i = right;
        } else {
            i++;
        }
    }
}

// Interpolate GPS using timestampsd
function interpolateGPS(entries: TelemetryEntry[]): void {
    let i = 0;
    while (i < entries.length) {
        if (entries[i].gps === null) {
            const left = i - 1;
            let right = i + 1;
            while (right < entries.length && entries[right].gps === null) right++;

            if (left >= 0 && right < entries.length) {
                const t0 = entries[left].timestamp;
                const t1 = entries[right].timestamp;
                const g0 = entries[left].gps!;
                const g1 = entries[right].gps!;

                for (let j = left + 1; j < right; j++) {
                    const t = (entries[j].timestamp - t0) / (t1 - t0);
                    entries[j].gps = {
                        lat: g0.lat + (g1.lat - g0.lat) * t,
                        lng: g0.lng + (g1.lng - g0.lng) * t,
                    };
                }
            }
            i = right;
        } else {
            i++;
        }
    }
}

export function normaliseData(raw: unknown[]): TelemetryEntry[] {
    // Pass 1: parse and hard-cap
    const parsed: TelemetryEntry[] = raw.map((entry: any) => {
        const speed = parseNumber(entry.speed);
        const battery = parseNumber(entry.battery);
        const motorTemp = parseNumber(entry.motorTemp);

        return {
            timestamp: entry.timestamp,
            speed: speed !== null && speed <= SPEED_MAX ? speed : null,
            battery: battery !== null && battery >= 0 && battery <= 100 ? battery : null,
            motorTemp: motorTemp !== null && motorTemp > 0 ? motorTemp : null,
            gps: entry.gps ?? null,
        };
    });

    // Pass 2: null out physically impossible acceleration
    for (let i = 1; i < parsed.length; i++) {
        const curr = parsed[i];
        if (curr.speed === null) continue;

        // Find last non-null speed before this point
        let lastValid: TelemetryEntry | null = null;
        for (let j = i - 1; j >= 0; j--) {
            if (parsed[j].speed !== null) { lastValid = parsed[j]; break; }
        }

        if (lastValid === null) continue;

        const dt = curr.timestamp - lastValid.timestamp;
        const dv = Math.abs(curr.speed - lastValid.speed!);
        if ((dv / dt) * 1000 > ACCEL_MAX) curr.speed = null;
    }

    // Pass 3: interpolate all null fields
    interpolateField(parsed, 'speed');
    interpolateField(parsed, 'battery');
    interpolateField(parsed, 'motorTemp');
    interpolateGPS(parsed);

    return parsed;
}
