"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  NumberField,
  RatingSlider,
  Section,
  Stepper,
  TimeField,
  Toggle,
} from "@/components/checkin/inputs";
import {
  createEntry,
  generatePredictions,
  getEntry,
  updateEntry,
  type DailyEntry,
} from "@/lib/api";

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const emptyForm = {
  sleep_duration: "",
  bedtime: "",
  wake_time: "",
  work_hours: "",
  study_hours: "",
  gym_attended: false,
  exercise_minutes: "",
  steps: "",
  mood: 5,
  energy: 5,
  productivity: 5,
  coffee_cups: 0,
  screen_time_hours: "",
  social_media_hours: "",
  notes: "",
};

type FormState = typeof emptyForm;

function entryToForm(e: DailyEntry): FormState {
  return {
    sleep_duration: e.sleep_duration?.toString() ?? "",
    bedtime: e.bedtime?.slice(0, 5) ?? "",
    wake_time: e.wake_time?.slice(0, 5) ?? "",
    work_hours: e.work_hours?.toString() ?? "",
    study_hours: e.study_hours?.toString() ?? "",
    gym_attended: e.gym_attended,
    exercise_minutes: e.exercise_minutes?.toString() ?? "",
    steps: e.steps?.toString() ?? "",
    mood: e.mood ?? 5,
    energy: e.energy ?? 5,
    productivity: e.productivity ?? 5,
    coffee_cups: e.coffee_cups ?? 0,
    screen_time_hours: e.screen_time_hours?.toString() ?? "",
    social_media_hours: e.social_media_hours?.toString() ?? "",
    notes: e.notes ?? "",
  };
}

const num = (s: string) => (s.trim() === "" ? null : Number(s));

export default function CheckinPage() {
  const [date, setDate] = useState(todayISO);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  const set = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((f) => ({ ...f, [key]: value })),
    [],
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setMessage(null);
    getEntry(date).then((entry) => {
      if (cancelled) return;
      setExists(entry !== null);
      setForm(entry ? entryToForm(entry) : emptyForm);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [date]);

  async function save() {
    setSaving(true);
    setMessage(null);
    const payload = {
      sleep_duration: num(form.sleep_duration),
      bedtime: form.bedtime || null,
      wake_time: form.wake_time || null,
      work_hours: num(form.work_hours),
      study_hours: num(form.study_hours),
      gym_attended: form.gym_attended,
      exercise_minutes: num(form.exercise_minutes),
      steps: num(form.steps),
      mood: form.mood,
      energy: form.energy,
      productivity: form.productivity,
      coffee_cups: form.coffee_cups,
      screen_time_hours: num(form.screen_time_hours),
      social_media_hours: num(form.social_media_hours),
      notes: form.notes.trim() || null,
    };
    try {
      if (exists) {
        await updateEntry(date, payload);
      } else {
        await createEntry({ date, ...payload });
        setExists(true);
      }
      setMessage({ kind: "ok", text: exists ? "Entry updated." : "Logged. LifeGPT is watching." });
      // Lock in tomorrow's predictions with the freshest data (best effort —
      // fails silently if they're already evaluated).
      generatePredictions().catch(() => {});
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Something went wrong.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-md px-4 py-6 flex flex-col gap-4 pb-28">
        <header className="flex items-center justify-between">
          <div>
            <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
              ← LifeGPT
            </Link>
            <h1 className="text-2xl font-bold">Daily Check-In</h1>
          </div>
          <input
            type="date"
            value={date}
            max={todayISO()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-xl bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500 [color-scheme:dark]"
          />
        </header>

        {loading ? (
          <p className="py-16 text-center text-zinc-500">Loading…</p>
        ) : (
          <>
            {exists && (
              <p className="rounded-xl bg-violet-500/10 px-4 py-2 text-sm text-violet-300">
                Editing existing entry for {date}.
              </p>
            )}

            <Section title="Sleep">
              <NumberField
                label="Sleep duration"
                unit="hours"
                value={form.sleep_duration}
                onChange={(v) => set("sleep_duration", v)}
              />
              <div className="flex gap-3">
                <TimeField
                  label="Bedtime"
                  value={form.bedtime}
                  onChange={(v) => set("bedtime", v)}
                />
                <TimeField
                  label="Wake up"
                  value={form.wake_time}
                  onChange={(v) => set("wake_time", v)}
                />
              </div>
            </Section>

            <Section title="Work & Study">
              <div className="flex gap-3">
                <NumberField
                  label="Work"
                  unit="h"
                  value={form.work_hours}
                  onChange={(v) => set("work_hours", v)}
                />
                <NumberField
                  label="Study"
                  unit="h"
                  value={form.study_hours}
                  onChange={(v) => set("study_hours", v)}
                />
              </div>
            </Section>

            <Section title="Exercise">
              <Toggle
                label="Went to the gym"
                value={form.gym_attended}
                onChange={(v) => set("gym_attended", v)}
              />
              <div className="flex gap-3">
                <NumberField
                  label="Exercise"
                  unit="min"
                  step={5}
                  max={1440}
                  value={form.exercise_minutes}
                  onChange={(v) => set("exercise_minutes", v)}
                />
                <NumberField
                  label="Steps"
                  step={500}
                  max={200000}
                  value={form.steps}
                  onChange={(v) => set("steps", v)}
                />
              </div>
            </Section>

            <Section title="How was today?">
              <RatingSlider
                label="Mood"
                value={form.mood}
                onChange={(v) => set("mood", v)}
              />
              <RatingSlider
                label="Energy"
                value={form.energy}
                onChange={(v) => set("energy", v)}
              />
              <RatingSlider
                label="Productivity"
                value={form.productivity}
                onChange={(v) => set("productivity", v)}
              />
            </Section>

            <Section title="Lifestyle">
              <Stepper
                label="Coffee / caffeine"
                value={form.coffee_cups}
                onChange={(v) => set("coffee_cups", v)}
              />
              <div className="flex gap-3">
                <NumberField
                  label="Screen time"
                  unit="h"
                  value={form.screen_time_hours}
                  onChange={(v) => set("screen_time_hours", v)}
                />
                <NumberField
                  label="Social media"
                  unit="h"
                  value={form.social_media_hours}
                  onChange={(v) => set("social_media_hours", v)}
                />
              </div>
            </Section>

            <Section title="Notes">
              <textarea
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Anything significant today?"
                rows={3}
                maxLength={2000}
                className="rounded-xl bg-zinc-800 px-3 py-2.5 text-white placeholder-zinc-600 outline-none focus:ring-2 focus:ring-violet-500 resize-none"
              />
            </Section>
          </>
        )}

        <div className="fixed inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/95 to-transparent px-4 pb-5 pt-8">
          <div className="mx-auto max-w-md flex flex-col gap-2">
            {message && (
              <p
                className={`rounded-xl px-4 py-2 text-center text-sm ${
                  message.kind === "ok"
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-red-500/15 text-red-300"
                }`}
              >
                {message.text}
              </p>
            )}
            <button
              onClick={save}
              disabled={saving || loading}
              className="w-full rounded-2xl bg-violet-600 py-3.5 font-semibold text-white transition active:scale-[0.98] disabled:opacity-50"
            >
              {saving ? "Saving…" : exists ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
