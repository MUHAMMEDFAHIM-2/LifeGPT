// Talk to the API on whatever host served the page (localhost on the
// laptop, the laptop's LAN IP when opened from the phone).
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ??
  (typeof window !== "undefined"
    ? `http://${window.location.hostname}:8000`
    : "http://localhost:8000");

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

export interface WindowStats {
  days_logged: number;
  avg_sleep: number | null;
  avg_mood: number | null;
  avg_energy: number | null;
  avg_productivity: number | null;
  gym_days: number;
  gym_rate: number | null;
  total_study_hours: number;
  avg_screen_time: number | null;
}

export interface AnalyticsSummary {
  today: {
    date: string;
    logged: boolean;
    mood: number | null;
    energy: number | null;
    productivity: number | null;
    sleep_duration: number | null;
    gym_attended: boolean | null;
  };
  week: WindowStats;
  prev_week: WindowStats;
  deltas: {
    sleep: number | null;
    mood: number | null;
    productivity: number | null;
    gym_rate: number | null;
  };
  streaks: { logging: number; gym: number };
  total_entries: number;
}

export interface TrendPoint {
  date: string;
  sleep_duration: number | null;
  mood: number | null;
  energy: number | null;
  productivity: number | null;
  study_hours: number | null;
  work_hours: number | null;
  screen_time_hours: number | null;
  gym_attended: boolean;
}

export function getSummary(): Promise<AnalyticsSummary> {
  return request("/api/analytics/summary");
}

export function getTrends(days = 14): Promise<TrendPoint[]> {
  return request(`/api/analytics/trends?days=${days}`);
}

export interface PatternInsight {
  id: string;
  category: string;
  text: string;
  confidence: "early signal" | "pattern";
  evidence: Record<string, unknown>;
}

export interface WeekdayProfile {
  weekday: string;
  n: number;
  avg_productivity: number | null;
  avg_mood: number | null;
  gym_rate: number | null;
}

export interface PatternsResponse {
  maturity: {
    phase: "collecting" | "learning" | "modeling";
    label: string;
    days_logged: number;
    next_unlock: number | null;
    description: string;
  };
  insights: PatternInsight[];
  weekday_profile: WeekdayProfile[] | null;
  note: string;
}

export function getPatterns(): Promise<PatternsResponse> {
  return request("/api/analytics/patterns");
}

export interface Prediction {
  id: number;
  target_date: string;
  target: string;
  kind: "binary" | "regression";
  predicted_value: number;
  confidence: number;
  method: string;
  days_of_data: number;
  actual_value: number | null;
  error: number | null;
  correct: number | null;
  evaluated_at: string | null;
  created_at: string;
}

export function generatePredictions(targetDate?: string): Promise<Prediction[]> {
  const q = targetDate ? `?target_date=${targetDate}` : "";
  return request(`/api/predictions/generate${q}`, { method: "POST" });
}

export function getPredictions(date: string): Promise<Prediction[]> {
  return request(`/api/predictions/${date}`);
}

export interface TargetAccuracy {
  target: string;
  label: string;
  kind: "binary" | "regression";
  n: number;
  hit_rate: number | null;
  mae?: number | null;
  tolerance?: number | null;
}

export interface AccuracyReport {
  evaluated_predictions: number;
  days_scored: number;
  overall_accuracy: number | null;
  verdict: string;
  per_target: TargetAccuracy[];
  note: string;
}

export function getAccuracy(): Promise<AccuracyReport> {
  return request("/api/predictions/accuracy");
}

export function getComparisons(limit = 60): Promise<Prediction[]> {
  return request(`/api/predictions/compare?limit=${limit}`);
}

export interface AIReport {
  id: number;
  kind: "analysis" | "roast";
  intensity: "light" | "brutal" | "nuclear" | null;
  content: string;
  days_of_data: number;
  created_at: string;
}

export function generateAnalysis(): Promise<AIReport> {
  return request("/api/ai/analysis", { method: "POST" });
}

export function generateRoast(
  intensity: "light" | "brutal" | "nuclear",
): Promise<AIReport> {
  return request("/api/ai/roast", {
    method: "POST",
    body: JSON.stringify({ intensity }),
  });
}

export function getReports(kind: string, limit = 5): Promise<AIReport[]> {
  return request(`/api/ai/reports?kind=${kind}&limit=${limit}`);
}

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export function getForecastCommentary(): Promise<{ commentary: string }> {
  return request("/api/ai/forecast-commentary", { method: "POST" });
}

export function askLifeGPT(
  message: string,
  history: ChatTurn[],
): Promise<{ reply: string }> {
  return request("/api/ai/chat", {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });
}

export function getVapidPublicKey(): Promise<{ key: string }> {
  return request("/api/push/vapid-public-key");
}

export function subscribePush(sub: PushSubscriptionJSON): Promise<void> {
  return request("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(sub),
  });
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
