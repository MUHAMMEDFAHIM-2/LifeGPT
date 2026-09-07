const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface DailyEntry {
  id: number;
  date: string;
  sleep_duration: number | null;
  bedtime: string | null;
  wake_time: string | null;
  work_hours: number | null;
  study_hours: number | null;
  gym_attended: boolean;
  exercise_minutes: number | null;
  steps: number | null;
  mood: number | null;
  energy: number | null;
  productivity: number | null;
  coffee_cups: number | null;
  screen_time_hours: number | null;
  social_media_hours: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DailyEntryPayload = Omit<
  DailyEntry,
  "id" | "created_at" | "updated_at"
>;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.detail ?? `Request failed (${res.status})`);
  }
  return res.status === 204 ? (undefined as T) : res.json();
}

export function getEntries(limit = 30): Promise<DailyEntry[]> {
  return request(`/api/entries?limit=${limit}`);
}

export async function getEntry(date: string): Promise<DailyEntry | null> {
  try {
    return await request<DailyEntry>(`/api/entries/${date}`);
  } catch {
    return null;
  }
}

export function createEntry(payload: DailyEntryPayload): Promise<DailyEntry> {
  return request("/api/entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateEntry(
  date: string,
  payload: Omit<DailyEntryPayload, "date">,
): Promise<DailyEntry> {
  return request(`/api/entries/${date}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}
