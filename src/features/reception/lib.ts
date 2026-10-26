// Shared helpers for the receptionist screens.
export const MIN = 60_000;

export const AWAITING = ["pending", "approved", "accepted"];
export const ONSITE = ["checked_in", "in_meeting"];
export const CLOSED = ["completed", "cancelled", "rejected", "declined", "no_show"];

export type Tone = "amber" | "blue" | "green" | "violet" | "grey" | "red";

export const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", approved: "Approved", accepted: "Approved",
  rejected: "Rejected", declined: "Rejected",
  checked_in: "On site", in_meeting: "In meeting",
  completed: "Completed", cancelled: "Cancelled",
  no_show: "No show", rescheduled: "Rescheduled",
};

export const STATUS_TONE: Record<string, Tone> = {
  pending: "amber", approved: "blue", accepted: "blue",
  rejected: "red", declined: "red",
  checked_in: "green", in_meeting: "violet",
  completed: "grey", cancelled: "grey", no_show: "red", rescheduled: "blue",
};

export const normStatus = (s: string) => (s === "accepted" ? "approved" : s === "declined" ? "rejected" : s);

export const pad = (n: number) => String(n).padStart(2, "0");

export const fmtTime = (ts: number) =>
  new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

export const fmtDateTime = (ts: number) =>
  new Date(ts).toLocaleString([], { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export function startOfDay(ts: number) {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dayLabel(ts: number, now = Date.now()) {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / (24 * 60 * MIN));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return new Date(ts).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" });
}

export const initial = (name?: string) => (name?.trim()?.[0] ?? "?").toUpperCase();

/** "12 min late", "in 25 min", "now" relative to the scheduled time. */
export function relativeTo(ts: number, now: number) {
  const m = Math.round((ts - now) / MIN);
  if (Math.abs(m) < 2) return { text: "Due now", late: false };
  if (m < 0) {
    const a = -m;
    return { text: a >= 60 ? `${Math.floor(a / 60)}h ${a % 60}m late` : `${a} min late`, late: a > 5 };
  }
  return { text: m >= 60 ? `in ${Math.floor(m / 60)}h ${m % 60}m` : `in ${m} min`, late: false };
}
