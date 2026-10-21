import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { NotifyModal } from "../../shared/NotifyModal";
import type { NotifyData } from "../../shared/NotifyModal";

// ── constants ──────────────────────────────────────────────────────────────
const PURPOSES = ["Meeting", "Interview", "Delivery", "Consultation", "Maintenance", "Training", "Site visit", "Other"];
const DURATIONS = [15, 30, 45, 60, 90, 120];
const MIN = 60_000;
const PX = 1; // pixels per minute on the timeline
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 19;
const GUTTER = 54;
const HIDDEN_STATUSES = ["cancelled", "rejected", "declined", "no_show"];

const STATUS_COLOR: Record<string, string> = {
  pending: "#f59e0b", approved: "#58a6ff", accepted: "#58a6ff",
  checked_in: "#3fb950", in_meeting: "#a78bfa", completed: "#6b7280",
};
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", approved: "Approved", accepted: "Approved",
  checked_in: "Checked in", in_meeting: "In meeting", completed: "Completed",
};
const AVAIL_COLOR: Record<string, string> = {
  available: "#3fb950", busy: "#f59e0b", away: "#f59e0b", off: "#6b7280",
};

// ── helpers ────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fmtTime = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const toTimeInput = (ts: number) => { const d = new Date(ts); return `${pad(d.getHours())}:${pad(d.getMinutes())}`; };

function dayBounds(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0).getTime();
  return { start, end: start + 24 * 60 * MIN - 1 };
}

function hourLabel(h: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12} ${ampm}`;
}

type Item = {
  id: string; start: number; end: number; kind: "visit" | "blocked";
  label: string; sub?: string; status?: string;
};

/** The message the receptionist sends to the host. The numbered replies are easy to read
 *  by a person today and easy to parse if replies are handled automatically later. */
function buildHostMessage(p: {
  host: string; visitor: string; company?: string; purpose?: string;
  start: number; end: number; hereNow: boolean;
}) {
  const day = new Date(p.start).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" });
  const who = p.company ? `*${p.visitor}* (${p.company})` : `*${p.visitor}*`;
  const why = p.purpose && p.purpose !== "Other" ? ` (${p.purpose})` : "";
  const intro = p.hereNow ? `${who} is at reception${why}.` : `${who} would like to see you${why}.`;
  return (
    `Hi ${p.host},\n\n${intro}\n\n` +
    `📅 ${day}\n⏰ ${fmtTime(p.start)} – ${fmtTime(p.end)}\n\n` +
    `Please reply:\n1 – Confirm\n2 – Suggest another time\n3 – Can't make it`
  );
}

// ── page ───────────────────────────────────────────────────────────────────
export function StaffAgendaPage() {
  const { user } = useUser();
  const staff = useQuery(api.staff.list);
  const scheduleVisit = useMutation(api.scheduling.create);
  const approve = useMutation(api.scheduling.approve);
  const markCheckedIn = useMutation(api.scheduling.markCheckedIn);
  const sendMessage = useMutation(api.messages.send);

  const [q, setQ] = useState("");
  const [hostId, setHostId] = useState("");
  const [date, setDate] = useState(() => toDateInput(new Date()));
  const [now, setNow] = useState(() => Date.now());
  const [form, setForm] = useState({
    visitorName: "", visitorPhone: "", visitorEmail: "", visitorCompany: "",
    purpose: "", notes: "", time: "", duration: 30,
  });
  const [hereOverride, setHereOverride] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [last, setLast] = useState<null | { visitId: string; visitor: string; start: number; hostName: string; data: NotifyData }>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  // ── staff search ─────────────────────────────────────────────────────────
  const staffList: any[] = (staff ?? []) as any[];
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return staffList
      .filter((s) => !needle || `${s.name ?? ""} ${s.department ?? ""} ${s.title ?? ""}`.toLowerCase().includes(needle))
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  }, [staffList, q]);
  const host: any = staffList.find((s) => s._id === hostId);

  // ── the host's agenda for the chosen day ─────────────────────────────────
  const { start: dayStart, end: dayEnd } = useMemo(() => dayBounds(date), [date]);
  const todayStr = toDateInput(new Date(now));
  const isToday = date === todayStr;
  const isPastDay = date < todayStr;

  const cal: any = useQuery(
    api.scheduling.getLiveCalendar,
    hostId ? { rangeStart: dayStart - 12 * 60 * MIN, rangeEnd: dayEnd, hostId: hostId as Id<"staff"> } : "skip",
  );

  const items: Item[] = useMemo(() => {
    if (!cal) return [];
    const out: Item[] = [];
    for (const v of cal.visits ?? []) {
      if (HIDDEN_STATUSES.includes(v.status)) continue;
      const s = v.scheduledDate;
      const e = s + (v.duration ?? 60) * MIN;
      if (e <= dayStart || s > dayEnd) continue;
      out.push({ id: v._id, start: s, end: e, kind: "visit", label: v.visitorName ?? "Visitor", sub: v.purpose || undefined, status: v.status });
    }
    for (const b of cal.blockedSlots ?? []) {
      if (b.endTime <= dayStart || b.startTime > dayEnd) continue;
      out.push({ id: b._id, start: b.startTime, end: b.endTime, kind: "blocked", label: "Blocked", sub: b.reason || undefined });
    }
    return out.sort((a, b) => a.start - b.start);
  }, [cal, dayStart, dayEnd]);

  // Timeline window: 7 AM – 7 PM, stretched if the day has anything outside it.
  const startHour = items.length
    ? Math.min(DEFAULT_START_HOUR, new Date(Math.max(items[0].start, dayStart)).getHours())
    : DEFAULT_START_HOUR;
  const lastEnd = items.length ? Math.max(...items.map((i) => Math.min(i.end, dayEnd + 1))) : 0;
  const endHour = Math.min(24, Math.max(DEFAULT_END_HOUR, Math.ceil((lastEnd - dayStart) / (60 * MIN))));
  const winStart = dayStart + startHour * 60 * MIN;
  const winEnd = dayStart + endHour * 60 * MIN;
  const trackHeight = (endHour - startHour) * 60 * PX;

  // Items that overlap sit side by side; everything else keeps the full width.
  const laid = useMemo(() => {
    const res: (Item & { lane: number; count: number })[] = [];
    let cluster: (Item & { lane: number })[] = [];
    let lanes: number[] = [];
    let clusterEnd = 0;
    const flush = () => {
      const count = Math.max(1, lanes.length);
      cluster.forEach((c) => res.push({ ...c, count }));
      cluster = []; lanes = []; clusterEnd = 0;
    };
    for (const it of items) {
      if (cluster.length && it.start >= clusterEnd) flush();
      let l = lanes.findIndex((end) => end <= it.start);
      if (l === -1) { l = lanes.length; lanes.push(it.end); } else { lanes[l] = it.end; }
      cluster.push({ ...it, lane: l });
      clusterEnd = Math.max(clusterEnd, it.end);
    }
    flush();
    return res;
  }, [items]);

  // ── status line ──────────────────────────────────────────────────────────
  const live = items.filter((i) => i.status !== "completed");
  const current = isToday ? live.find((i) => i.start <= now && now < i.end) : undefined;
  const next = isToday ? live.find((i) => i.start > now) : undefined;
  let statusText = "";
  let statusColor = "#3fb950";
  if (isToday) {
    if (current) {
      statusColor = "#f59e0b";
      statusText = current.kind === "blocked"
        ? `Blocked until ${fmtTime(current.end)}`
        : current.status === "checked_in" || current.status === "in_meeting"
          ? `With a visitor until ${fmtTime(current.end)}`
          : `Has an appointment until ${fmtTime(current.end)}`;
    } else {
      statusText = "Free now";
    }
    statusText += next ? ` · next at ${fmtTime(next.start)}` : current ? "" : " · nothing else today";
  }

  // ── slot picking ─────────────────────────────────────────────────────────
  const proposedStart = hostId && form.time ? new Date(`${date}T${form.time}`).getTime() : 0;
  const proposedEnd = proposedStart + form.duration * MIN;

  const conflicts: any = useQuery(
    api.scheduling.checkConflicts,
    proposedStart && hostId ? { hostId: hostId as Id<"staff">, proposedStart, proposedEnd } : "skip",
  );
  const hasConflict = !!conflicts?.hasConflict;
  const inPast = !!proposedStart && proposedStart < now - 5 * MIN;

  const freeSlots = useMemo(() => {
    if (!hostId || isPastDay) return [] as { ts: number; label: string }[];
    const dur = form.duration * MIN;
    const busy = items.filter((i) => i.status !== "completed");
    const fits = (t: number) => t + dur <= winEnd && busy.every((b) => t + dur <= b.start || t >= b.end);
    const out: { ts: number; label: string }[] = [];
    let from = winStart;
    if (isToday) {
      const nowSlot = Math.ceil(now / (5 * MIN)) * 5 * MIN;
      if (nowSlot >= winStart && fits(nowSlot)) out.push({ ts: nowSlot, label: "Now" });
      from = Math.max(winStart, nowSlot);
    }
    let t = Math.ceil(from / (30 * MIN)) * 30 * MIN;
    for (; t + dur <= winEnd && out.length < 8; t += 30 * MIN) {
      if (out.length && out[0].label === "Now" && t === out[0].ts) continue;
      if (fits(t)) out.push({ ts: t, label: fmtTime(t) });
    }
    return out;
  }, [hostId, isPastDay, isToday, items, form.duration, winStart, winEnd, now]);

  // "Visitor is here now" is ticked automatically when the slot is within 30 minutes of now.
  const autoHere = isToday && !!proposedStart && Math.abs(proposedStart - now) <= 30 * MIN;
  const hereNow = hereOverride ?? autoHere;

  // Scroll the timeline to the current time (or the first appointment) when it opens.
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || cal === undefined) return;
    const anchor = isToday
      ? ((Date.now() - winStart) / MIN) * PX - 90
      : items[0] ? ((items[0].start - winStart) / MIN) * PX - 40 : 0;
    el.scrollTop = Math.max(0, anchor);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hostId, date, cal === undefined]);

  const pickFromTimeline = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mins = Math.round((e.clientY - rect.top) / PX / 15) * 15;
    set("time", toTimeInput(winStart + mins * MIN));
  };

  const shiftDay = (n: number) => {
    const [y, m, d] = date.split("-").map(Number);
    setDate(toDateInput(new Date(y, m - 1, d + n)));
    set("time", "");
  };

  const chooseHost = (id: string) => {
    setHostId(id);
    setDate(toDateInput(new Date()));
    set("time", "");
    setError("");
    setLast(null);
  };

  // ── schedule ─────────────────────────────────────────────────────────────
  const canSubmit = !!host && !!form.visitorName.trim() && !!proposedStart && !hasConflict && !inPast && !submitting;

  const handleSchedule = async () => {
    if (!canSubmit || !host) return;
    setSubmitting(true); setError("");
    try {
      const visitId = await scheduleVisit({
        visitorName: form.visitorName.trim(),
        visitorEmail: form.visitorEmail.trim() || undefined,
        visitorPhone: form.visitorPhone.trim() || undefined,
        visitorCompany: form.visitorCompany.trim() || undefined,
        purpose: form.purpose || undefined,
        scheduledDate: proposedStart,
        duration: form.duration,
        hostStaffId: host._id as Id<"staff">,
        notes: form.notes.trim() || undefined,
        source: hereNow ? "walkin" : "admin",
      });
      // A visitor who is standing at reception is approved and checked in straight away.
      // Anyone booked for later stays pending (holding the slot) until the host confirms.
      if (hereNow) {
        await approve({ visitId, actorName: user?.fullName ?? "Receptionist" });
        await markCheckedIn({ visitId });
      }
      const message = buildHostMessage({
        host: host.name, visitor: form.visitorName.trim(), company: form.visitorCompany.trim() || undefined,
        purpose: form.purpose || undefined, start: proposedStart, end: proposedEnd, hereNow,
      });
      setLast({
        visitId: visitId as string, visitor: form.visitorName.trim(), start: proposedStart, hostName: host.name,
        data: {
          visitorName: form.visitorName.trim(), hostName: host.name, hostPhone: host.phone ?? undefined,
          scheduledDate: proposedStart, purpose: form.purpose || undefined, customMessage: message,
        },
      });
      setNotifyOpen(true);
      setForm({ visitorName: "", visitorPhone: "", visitorEmail: "", visitorCompany: "", purpose: "", notes: "", time: "", duration: 30 });
      setHereOverride(null);
    } catch {
      setError("Could not schedule the visit. Please check the details and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const slotColor = hasConflict || inPast ? "#f85149" : "#3fb950";

  return (
    <>
      <style>{`
        .sa { display:grid; grid-template-columns:260px 1fr; gap:20px; align-items:start; }
        .sa-title { font-size:1.4rem; font-weight:700; color:var(--text,#e6edf3); margin-bottom:4px; }
        .sa-sub { font-size:0.85rem; color:var(--muted,#8b949e); margin-bottom:20px; }
        .sa-card { background:var(--surface,#21262d); border:1px solid var(--border,#30363d); border-radius:12px; padding:16px; }
        .sa-card + .sa-card { margin-top:16px; }
        .sa-input { background:var(--bg,#0d1117); border:1px solid var(--border,#30363d); border-radius:8px; padding:9px 12px; font-size:0.875rem; color:var(--text,#e6edf3); font-family:inherit; outline:none; width:100%; }
        .sa-input:focus { border-color:var(--accent,#3fb950); }
        .sa-label { display:block; font-size:0.75rem; font-weight:600; color:var(--muted,#8b949e); margin-bottom:5px; }
        .sa-staff-list { margin-top:10px; max-height:calc(100vh - 260px); overflow-y:auto; display:flex; flex-direction:column; gap:4px; }
        .sa-staff { display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:8px; border:1px solid transparent; cursor:pointer; background:none; text-align:left; font-family:inherit; color:var(--text,#e6edf3); width:100%; }
        .sa-staff:hover { background:var(--hov,#2d333b); }
        .sa-staff--on { background:var(--accent-bg,rgba(63,185,80,0.12)); border-color:var(--accent,#3fb950); }
        .sa-avatar { width:34px; height:34px; border-radius:50%; background:var(--accent,#3fb950); color:#fff; font-weight:700; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
        .sa-staff-name { font-size:0.88rem; font-weight:600; }
        .sa-staff-meta { font-size:0.75rem; color:var(--muted,#8b949e); }
        .sa-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0; margin-left:auto; }
        .sa-head { display:flex; align-items:center; gap:14px; flex-wrap:wrap; }
        .sa-head-main { flex:1; min-width:180px; }
        .sa-host-name { font-size:1.1rem; font-weight:700; color:var(--text,#e6edf3); }
        .sa-status { display:inline-flex; align-items:center; gap:6px; font-size:0.82rem; font-weight:600; margin-top:4px; }
        .sa-datenav { display:flex; align-items:center; gap:6px; }
        .sa-btn { padding:8px 12px; background:transparent; border:1px solid var(--border,#30363d); border-radius:8px; font-size:0.82rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .sa-btn:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .sa-timeline { margin-top:14px; max-height:440px; overflow-y:auto; border:1px solid var(--border,#30363d); border-radius:10px; background:var(--bg,#0d1117); }
        .sa-track { position:relative; margin-left:${GUTTER}px; cursor:crosshair; }
        .sa-hour { position:absolute; left:0; right:0; border-top:1px solid var(--border,#30363d); }
        .sa-hour span { position:absolute; left:-${GUTTER - 6}px; top:-8px; font-size:0.7rem; color:var(--muted,#8b949e); background:var(--bg,#0d1117); padding:0 3px; }
        .sa-block { position:absolute; z-index:1; border-radius:7px; padding:4px 8px; font-size:0.75rem; overflow:hidden; border-left:3px solid; box-sizing:border-box; }
        .sa-block b { display:block; font-size:0.78rem; color:var(--text,#e6edf3); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .sa-block span { color:var(--muted,#8b949e); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; display:block; }
        .sa-block--blocked { background:repeating-linear-gradient(45deg,rgba(107,114,128,0.2),rgba(107,114,128,0.2) 6px,rgba(107,114,128,0.08) 6px,rgba(107,114,128,0.08) 12px); border-color:#6b7280; }
        .sa-now { position:absolute; z-index:0; left:-6px; right:0; height:2px; background:#f85149; pointer-events:none; }
        .sa-now::before { content:""; position:absolute; left:0; top:-3px; width:8px; height:8px; border-radius:50%; background:#f85149; }
        .sa-pick { position:absolute; z-index:2; left:0; right:0; border-radius:7px; border:2px dashed; pointer-events:none; }
        .sa-chips { display:flex; flex-wrap:wrap; gap:6px; }
        .sa-chip { padding:6px 12px; border-radius:20px; border:1px solid var(--border,#30363d); background:transparent; color:var(--text,#e6edf3); font-size:0.8rem; font-weight:600; cursor:pointer; font-family:inherit; }
        .sa-chip:hover { border-color:var(--accent,#3fb950); }
        .sa-chip--on { background:var(--accent,#3fb950); border-color:var(--accent,#3fb950); color:#fff; }
        .sa-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-top:14px; }
        .sa-full { grid-column:1/-1; }
        .sa-warn { margin-top:12px; font-size:0.82rem; color:#e3b341; background:rgba(227,179,65,0.1); border:1px solid rgba(227,179,65,0.3); border-radius:8px; padding:10px 14px; }
        .sa-err { margin-top:12px; font-size:0.82rem; color:#f85149; background:rgba(248,81,73,0.1); border:1px solid rgba(248,81,73,0.3); border-radius:8px; padding:10px 14px; }
        .sa-ok { font-size:0.85rem; color:var(--accent,#3fb950); background:rgba(63,185,80,0.1); border:1px solid rgba(63,185,80,0.25); border-radius:10px; padding:12px 16px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; margin-bottom:16px; }
        .sa-submit { padding:11px 20px; background:var(--accent,#3fb950); color:#fff; border:none; border-radius:8px; font-size:0.9rem; font-weight:700; cursor:pointer; font-family:inherit; }
        .sa-submit:disabled { opacity:0.5; cursor:not-allowed; }
        .sa-empty { padding:40px 20px; text-align:center; color:var(--muted,#8b949e); font-size:0.9rem; }
        @media (max-width: 900px) { .sa { grid-template-columns:1fr; } .sa-staff-list { max-height:220px; } }
      `}</style>

      <h1 className="sa-title">Staff agenda</h1>
      <p className="sa-sub">Search for a staff member, see their day, pick a free time, then send the details to them on WhatsApp.</p>

      <div className="sa">
        {/* ── staff search ─────────────────────────────────────────────── */}
        <div className="sa-card">
          <input className="sa-input" placeholder="Search by name or department..." value={q} onChange={(e) => setQ(e.target.value)} />
          <div className="sa-staff-list">
            {staff === undefined ? (
              <div className="sa-empty">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="sa-empty">No staff found.</div>
            ) : filtered.map((s) => (
              <button key={s._id} className={`sa-staff${s._id === hostId ? " sa-staff--on" : ""}`} onClick={() => chooseHost(s._id)}>
                <div className="sa-avatar">{(s.name ?? "?")[0].toUpperCase()}</div>
                <div style={{ minWidth: 0 }}>
                  <div className="sa-staff-name">{s.name}</div>
                  <div className="sa-staff-meta">{[s.department, s.title].filter(Boolean).join(" · ") || "Staff"}</div>
                </div>
                <span className="sa-dot" style={{ background: AVAIL_COLOR[s.availability ?? "available"] ?? "#3fb950" }} title={s.availability ?? "available"} />
              </button>
            ))}
          </div>
        </div>

        {/* ── agenda + booking ─────────────────────────────────────────── */}
        <div>
          {!host ? (
            <div className="sa-card"><div className="sa-empty">Choose a staff member to see their agenda.</div></div>
          ) : (
            <>
              {last && (
                <div className="sa-ok">
                  <span>✓ {last.visitor} scheduled with {last.hostName} at {fmtTime(last.start)}.</span>
                  <button className="sa-btn" style={{ marginLeft: "auto" }} onClick={() => setNotifyOpen(true)}>💬 Message {last.hostName} on WhatsApp</button>
                </div>
              )}

              <div className="sa-card">
                <div className="sa-head">
                  <div className="sa-avatar" style={{ width: 44, height: 44, fontSize: 18 }}>{(host.name ?? "?")[0].toUpperCase()}</div>
                  <div className="sa-head-main">
                    <div className="sa-host-name">{host.name}</div>
                    <div className="sa-staff-meta">{[host.department, host.title].filter(Boolean).join(" · ")}</div>
                    {isToday && <div className="sa-status" style={{ color: statusColor }}><span className="sa-dot" style={{ background: statusColor, marginLeft: 0 }} />{statusText}</div>}
                  </div>
                  <div className="sa-datenav">
                    <button className="sa-btn" onClick={() => shiftDay(-1)} aria-label="Previous day">‹</button>
                    <input className="sa-input" type="date" style={{ width: 150 }} value={date} onChange={(e) => { if (e.target.value) { setDate(e.target.value); set("time", ""); } }} />
                    <button className="sa-btn" onClick={() => shiftDay(1)} aria-label="Next day">›</button>
                    {!isToday && <button className="sa-btn" onClick={() => { setDate(todayStr); set("time", ""); }}>Today</button>}
                  </div>
                </div>

                <div className="sa-timeline" ref={scrollRef}>
                  {cal === undefined ? (
                    <div className="sa-empty">Loading agenda...</div>
                  ) : (
                    <div className="sa-track" style={{ height: trackHeight }} onClick={pickFromTimeline}>
                      {Array.from({ length: endHour - startHour }, (_, i) => (
                        <div key={i} className="sa-hour" style={{ top: i * 60 * PX }}><span>{hourLabel(startHour + i)}</span></div>
                      ))}
                      {laid.map((it) => {
                        const top = (Math.max(it.start, winStart) - winStart) / MIN * PX;
                        const height = Math.max(22, (Math.min(it.end, winEnd) - Math.max(it.start, winStart)) / MIN * PX - 2);
                        const color = it.kind === "blocked" ? "#6b7280" : STATUS_COLOR[it.status ?? ""] ?? "#58a6ff";
                        const detail = `${fmtTime(it.start)} – ${fmtTime(it.end)}${it.status ? ` · ${STATUS_LABEL[it.status] ?? it.status}` : ""}${it.sub ? ` · ${it.sub}` : ""}`;
                        const compact = height < 40; // short meetings: one line so nothing is clipped
                        return (
                          <div key={it.id} className={`sa-block${it.kind === "blocked" ? " sa-block--blocked" : ""}`}
                            onClick={(e) => e.stopPropagation()}
                            title={`${it.label} · ${detail}`}
                            style={{
                              top, height, left: `calc(${(it.lane / it.count) * 100}% + 4px)`, width: `calc(${100 / it.count}% - 8px)`,
                              borderColor: color, background: it.kind === "blocked" ? undefined : `${color}26`,
                            }}>
                            {compact ? (
                              <b style={{ lineHeight: "20px" }}>{it.label} <span style={{ display: "inline", fontWeight: 400 }}>· {fmtTime(it.start)}</span></b>
                            ) : (
                              <>
                                <b>{it.label}</b>
                                <span>{detail}</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {isToday && now >= winStart && now <= winEnd && <div className="sa-now" style={{ top: (now - winStart) / MIN * PX }} />}
                      {proposedStart >= winStart && proposedStart < winEnd && (
                        <div className="sa-pick" style={{ top: (proposedStart - winStart) / MIN * PX, height: form.duration * PX, borderColor: slotColor, background: `${slotColor}22` }} />
                      )}
                    </div>
                  )}
                </div>
                {cal !== undefined && items.length === 0 && (
                  <div className="sa-staff-meta" style={{ marginTop: 8 }}>Nothing scheduled for {host.name} on this day.</div>
                )}
              </div>

              <div className="sa-card">
                <label className="sa-label">Pick a time (or click the agenda above)</label>
                <div className="sa-chips">
                  {isPastDay ? <span className="sa-staff-meta">This day has passed.</span>
                    : freeSlots.length === 0 ? <span className="sa-staff-meta">No free {form.duration}-minute slot left in this day's hours. Try a shorter meeting or another day.</span>
                    : freeSlots.map((s) => (
                      <button key={s.ts} className={`sa-chip${form.time === toTimeInput(s.ts) ? " sa-chip--on" : ""}`} onClick={() => set("time", toTimeInput(s.ts))}>{s.label}</button>
                    ))}
                </div>

                <div className="sa-grid">
                  <div>
                    <label className="sa-label">Time</label>
                    <input className="sa-input" type="time" value={form.time} onChange={(e) => set("time", e.target.value)} />
                  </div>
                  <div>
                    <label className="sa-label">Length</label>
                    <select className="sa-input" value={form.duration} onChange={(e) => set("duration", Number(e.target.value))}>
                      {DURATIONS.map((d) => <option key={d} value={d}>{d < 60 ? `${d} min` : d === 60 ? "1 hour" : `${d / 60} hours`}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="sa-label">Visitor name *</label>
                    <input className="sa-input" placeholder="Jane Mensah" value={form.visitorName} onChange={(e) => set("visitorName", e.target.value)} />
                  </div>
                  <div>
                    <label className="sa-label">Company</label>
                    <input className="sa-input" placeholder="Acme Inc." value={form.visitorCompany} onChange={(e) => set("visitorCompany", e.target.value)} />
                  </div>
                  <div>
                    <label className="sa-label">Phone</label>
                    <input className="sa-input" type="tel" value={form.visitorPhone} onChange={(e) => set("visitorPhone", e.target.value)} />
                  </div>
                  <div>
                    <label className="sa-label">Email</label>
                    <input className="sa-input" type="email" value={form.visitorEmail} onChange={(e) => set("visitorEmail", e.target.value)} />
                  </div>
                  <div className="sa-full">
                    <label className="sa-label">Purpose</label>
                    <select className="sa-input" value={form.purpose} onChange={(e) => set("purpose", e.target.value)}>
                      <option value="">Select purpose...</option>
                      {PURPOSES.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14, fontSize: "0.85rem", color: "var(--text,#e6edf3)", cursor: "pointer" }}>
                  <input type="checkbox" checked={hereNow} onChange={(e) => setHereOverride(e.target.checked)} />
                  Visitor is at reception now (check them in)
                </label>
                <div className="sa-staff-meta" style={{ marginTop: 4 }}>
                  {hereNow ? "They will be approved and checked in. The host is also emailed." : "Held as pending until the host confirms."}
                </div>

                {hasConflict && (
                  <div className="sa-warn">
                    {host.name} is not free at that time
                    {conflicts.blockedConflicts?.length > 0 ? " (blocked)" : conflicts.visitConflicts?.[0] ? ` (with ${conflicts.visitConflicts[0].visitorName})` : ""}. Pick another time.
                  </div>
                )}
                {inPast && <div className="sa-warn">That time has already passed.</div>}
                {error && <div className="sa-err">{error}</div>}

                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                  <button className="sa-submit" disabled={!canSubmit} onClick={handleSchedule}>
                    {submitting ? "Scheduling..." : "Schedule and message host"}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {notifyOpen && last && (
        <NotifyModal
          isOpen={true}
          onClose={() => setNotifyOpen(false)}
          template="custom"
          target="host"
          title={`Message ${last.hostName}`}
          data={last.data}
          onInApp={(msg) => {
            sendMessage({ visitId: last.visitId as Id<"scheduledVisits">, senderClerkId: user?.id ?? "", senderName: user?.fullName ?? "Receptionist", senderRole: "receptionist", message: msg });
            setNotifyOpen(false);
          }}
        />
      )}
    </>
  );
}
