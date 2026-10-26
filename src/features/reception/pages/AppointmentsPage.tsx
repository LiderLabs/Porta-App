import React, { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import "../reception.css";
import {
  AWAITING, MIN, dayLabel, fmtDateTime, fmtTime, normStatus, startOfDay, toDateInput, toTimeInput,
} from "../lib";
import { ConfirmButton, Modal, StatusBadge } from "../parts";
import { NotifyModal } from "../../shared/NotifyModal";
import type { NotifyTemplate } from "../../shared/NotifyModal";

type Filter = "upcoming" | "today" | "pending" | "onsite" | "past" | "cancelled";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Today" },
  { id: "pending", label: "Pending" },
  { id: "onsite", label: "On site" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const OFF = ["cancelled", "rejected", "no_show"];

function RescheduleModal({ visit, onClose }: { visit: any; onClose: () => void }) {
  const reschedule = useMutation(api.scheduling.reschedule);
  const start = new Date(visit.scheduledDate);
  const [date, setDate] = useState(toDateInput(start));
  const [time, setTime] = useState(toTimeInput(start));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const when = date && time ? new Date(`${date}T${time}`).getTime() : 0;
  const past = !!when && when < Date.now() - 5 * MIN;

  const save = async () => {
    setSaving(true); setError("");
    try {
      await reschedule({ visitId: visit._id, scheduledDate: when });
      onClose();
    } catch {
      setError("Could not reschedule. The host may be busy at that time.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<><h2>Reschedule</h2><div className="rc-meta">{visit.visitorName}{visit.hostName ? ` with ${visit.hostName}` : ""}</div></>}
      onClose={onClose}
      footer={<>
        <button className="rc-btn" onClick={onClose}>Cancel</button>
        <button className="rc-btn rc-btn--primary" disabled={saving || !when || past} onClick={save}>{saving ? "Saving..." : "Reschedule"}</button>
      </>}
    >
      <div className="rc-grid2">
        <div><label className="rc-label">New date</label><input className="rc-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
        <div><label className="rc-label">New time</label><input className="rc-input" type="time" value={time} onChange={(e) => setTime(e.target.value)} /></div>
      </div>
      {past && <div className="rc-notice rc-notice--amber" style={{ marginTop: 14, marginBottom: 0 }}>That time has already passed.</div>}
      {error && <div className="rc-notice rc-notice--red" style={{ marginTop: 14, marginBottom: 0 }} role="alert">{error}</div>}
    </Modal>
  );
}

const WA_TEMPLATES: { id: NotifyTemplate; label: string }[] = [
  { id: "visitor_arrived", label: "Visitor has arrived" },
  { id: "visitor_late", label: "Visitor is late" },
  { id: "visitor_noshow", label: "Visitor did not show" },
  { id: "rescheduled", label: "Meeting rescheduled" },
  { id: "custom", label: "Write my own" },
];

function EditModal({ visit, onClose }: { visit: any; onClose: () => void }) {
  const update = useMutation(api.scheduling.update);
  const [f, setF] = useState({
    visitorName: visit.visitorName ?? "", visitorPhone: visit.visitorPhone ?? "", visitorEmail: visit.visitorEmail ?? "",
    visitorCompany: visit.visitorCompany ?? "", purpose: visit.purpose ?? "", notes: visit.notes ?? "",
    duration: String(visit.duration ?? 30),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const save = async () => {
    setSaving(true); setError("");
    try {
      await update({
        visitId: visit._id, visitorName: f.visitorName, visitorPhone: f.visitorPhone, visitorEmail: f.visitorEmail,
        visitorCompany: f.visitorCompany, purpose: f.purpose, notes: f.notes, duration: Number(f.duration) || undefined,
      });
      onClose();
    } catch (e) {
      setError(typeof (e as any)?.data === "string" ? (e as any).data : "Could not save the changes. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title={<><h2>Edit booking</h2><div className="rc-meta">{visit.visitorName}{visit.hostName ? ` with ${visit.hostName}` : ""}</div></>}
      onClose={onClose}
      footer={<>
        <button className="rc-btn" onClick={onClose}>Cancel</button>
        <button className="rc-btn rc-btn--primary" disabled={saving || !f.visitorName.trim()} onClick={save}>{saving ? "Saving..." : "Save changes"}</button>
      </>}
    >
      <div className="rc-grid2">
        <div><label className="rc-label">Visitor name</label><input className="rc-input" value={f.visitorName} onChange={set("visitorName")} /></div>
        <div><label className="rc-label">Company</label><input className="rc-input" value={f.visitorCompany} onChange={set("visitorCompany")} /></div>
        <div><label className="rc-label">Phone</label><input className="rc-input" inputMode="tel" value={f.visitorPhone} onChange={set("visitorPhone")} /></div>
        <div><label className="rc-label">Email</label><input className="rc-input" type="email" value={f.visitorEmail} onChange={set("visitorEmail")} /></div>
        <div><label className="rc-label">Purpose</label><input className="rc-input" value={f.purpose} onChange={set("purpose")} /></div>
        <div><label className="rc-label">Length (minutes)</label><input className="rc-input" type="number" min={5} max={600} value={f.duration} onChange={set("duration")} /></div>
      </div>
      <div style={{ marginTop: 12 }}><label className="rc-label">Notes</label><textarea className="rc-input" rows={3} value={f.notes} onChange={set("notes")} /></div>
      <div className="rc-meta" style={{ marginTop: 10 }}>To change the date or time, use Reschedule. Edits are recorded in the admin activity log.</div>
      {error && <div className="rc-notice rc-notice--red" style={{ marginTop: 14, marginBottom: 0 }} role="alert">{error}</div>}
    </Modal>
  );
}

function DetailModal({ visit, hostPhone, onClose, run, busy, onReschedule, onEdit, onDelete }: {
  visit: any; hostPhone?: string; onClose: () => void; run: (a: string, v: any) => void; busy: boolean;
  onReschedule: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const { user } = useUser();
  const [waOpen, setWaOpen] = useState(false);
  const [waTemplate, setWaTemplate] = useState<NotifyTemplate>(() => {
    const st = normStatus(visit.status);
    return st === "checked_in" || st === "in_meeting" ? "visitor_arrived" : st === "no_show" ? "visitor_noshow" : "custom";
  });
  const messages = useQuery(api.messages.listByVisit, { visitId: visit._id });
  const send = useMutation(api.messages.send);
  const [text, setText] = useState("");
  const [sendError, setSendError] = useState("");
  const n = normStatus(visit.status);

  const submit = async () => {
    if (!text.trim()) return;
    setSendError("");
    try { await send({ visitId: visit._id, message: text.trim() }); setText(""); }
    catch { setSendError("Message not sent. Try again."); }
  };

  const facts: [string, any][] = [
    ["When", fmtDateTime(visit.scheduledDate)],
    ["Host", visit.hostName], ["Purpose", visit.purpose], ["Company", visit.visitorCompany],
    ["Phone", visit.visitorPhone], ["Email", visit.visitorEmail], ["Notes", visit.notes], ["Approved by", visit.approvedBy],
  ];

  return (
    <Modal
      title={<><h2>{visit.visitorName}</h2><div style={{ marginTop: 6 }}><StatusBadge status={visit.status} /></div></>}
      onClose={onClose}
      footer={<>
        <ConfirmButton className="rc-push" disabled={busy} confirmLabel="Delete for good?" onConfirm={onDelete}>Delete</ConfirmButton>
        {n === "pending" && <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={busy} onClick={() => run("approve", visit)}>Approve</button>}
        {n === "approved" && <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={busy} onClick={() => run("check_in", visit)}>Check in</button>}
        {n === "checked_in" && <button className="rc-btn rc-btn--sm" disabled={busy} onClick={() => run("in_meeting", visit)}>In meeting</button>}
        {(n === "checked_in" || n === "in_meeting") && <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={busy} onClick={() => run("complete", visit)}>Check out</button>}
        <button className="rc-btn rc-btn--sm" onClick={onEdit}>Edit</button>
        {(n === "pending" || n === "approved") && <button className="rc-btn rc-btn--sm" onClick={onReschedule}>Reschedule</button>}
        {n === "pending" && <ConfirmButton disabled={busy} confirmLabel="Reject?" onConfirm={() => run("reject", visit)}>Reject</ConfirmButton>}
        {n === "approved" && <ConfirmButton disabled={busy} confirmLabel="Mark no show?" onConfirm={() => run("no_show", visit)}>No show</ConfirmButton>}
        {(n === "pending" || n === "approved") && <ConfirmButton disabled={busy} confirmLabel="Cancel visit?" onConfirm={() => run("cancel", visit)}>Cancel visit</ConfirmButton>}
      </>}
    >
      <dl className="rc-facts" style={{ marginTop: 0 }}>
        {facts.filter(([, v]) => v).map(([k, v]) => (<div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", margin: "14px 0 4px" }}>
        <select className="rc-input" style={{ flex: "1 1 160px", minWidth: 0 }} value={waTemplate} onChange={(e) => setWaTemplate(e.target.value as NotifyTemplate)} aria-label="Message type">
          {WA_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
        <button className="rc-btn" style={{ background: "#25d366", borderColor: "#25d366", color: "#fff", fontWeight: 700 }} onClick={() => setWaOpen(true)}>
          Message {visit.hostName ?? "host"} on WhatsApp
        </button>
      </div>
      {waOpen && (
        <NotifyModal
          key={waTemplate}
          isOpen={true}
          onClose={() => setWaOpen(false)}
          template={waTemplate}
          target="host"
          title={`Message ${visit.hostName ?? "host"}`}
          data={{
            visitorName: visit.visitorName, hostName: visit.hostName, hostPhone,
            scheduledDate: visit.scheduledDate, purpose: visit.purpose,
            customMessage: `Hi ${visit.hostName ?? "there"}, `,
          }}
        />
      )}
      <div className="rc-thread">
        <h3>Messages with staff</h3>
        <div className="rc-msgs">
          {messages === undefined ? <div className="rc-meta">Loading...</div>
            : messages.length === 0 ? <div className="rc-meta">No messages yet.</div>
            : (messages as any[]).map((m) => (
              <div key={m._id} className={`rc-msg${m.senderRole === "receptionist" ? " rc-msg--self" : ""}`}>
                <small>{m.senderName} · {fmtTime(m.createdAt)}</small>{m.message}
              </div>
            ))}
        </div>
        {sendError && <div className="rc-meta" style={{ color: "var(--danger)", marginBottom: 6 }}>{sendError}</div>}
        <div className="rc-send">
          <input className="rc-input" placeholder={`Message ${visit.hostName ?? "staff"}`} value={text} aria-label="Message"
            onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} />
          <button className="rc-btn rc-btn--primary" disabled={!text.trim() || !user} onClick={submit}>Send</button>
        </div>
      </div>
    </Modal>
  );
}

export function AppointmentsPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const visits = useQuery(api.scheduling.list);
  const staffList = useQuery(api.staff.list);

  const approve = useMutation(api.scheduling.approve);
  const reject = useMutation(api.scheduling.reject);
  const markCheckedIn = useMutation(api.scheduling.markCheckedIn);
  const markInMeeting = useMutation(api.scheduling.markInMeeting);
  const markCompleted = useMutation(api.scheduling.markCompleted);
  const markNoShow = useMutation(api.scheduling.markNoShow);
  const cancel = useMutation(api.scheduling.cancel);
  const remove = useMutation(api.scheduling.remove);

  const initialFilter = (params.get("filter") as Filter) || "upcoming";
  const [filter, setFilterState] = useState<Filter>(FILTERS.some((f) => f.id === initialFilter) ? initialFilter : "upcoming");
  const setFilter = (f: Filter) => { setFilterState(f); setParams(f === "upcoming" ? {} : { filter: f }, { replace: true }); };
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(t); }, []);

  const all: any[] = (visits ?? []) as any[];
  const todayStart = startOfDay(now);
  const todayEnd = todayStart + 24 * 60 * MIN;

  const inFilter = (v: any, f: Filter) => {
    const n = normStatus(v.status);
    const t = v.scheduledDate;
    switch (f) {
      case "upcoming": return t >= todayStart && !["completed", ...OFF].includes(n);
      case "today": return t >= todayStart && t < todayEnd && !OFF.includes(n);
      case "pending": return n === "pending";
      case "onsite": return n === "checked_in" || n === "in_meeting";
      case "past": return (t < todayStart || n === "completed") && !OFF.includes(n);
      case "cancelled": return OFF.includes(n);
    }
  };

  const counts = useMemo(() => {
    const c = {} as Record<Filter, number>;
    FILTERS.forEach((f) => { c[f.id] = all.filter((v) => inFilter(v, f.id)).length; });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, todayStart]);

  const needle = q.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = all
      .filter((v) => inFilter(v, filter))
      .filter((v) => !needle || `${v.visitorName ?? ""} ${v.visitorCompany ?? ""} ${v.visitorEmail ?? ""} ${v.hostName ?? ""} ${v.purpose ?? ""}`.toLowerCase().includes(needle));
    const desc = filter === "past" || filter === "cancelled";
    return list.sort((a, b) => (desc ? b.scheduledDate - a.scheduledDate : a.scheduledDate - b.scheduledDate));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, filter, needle, todayStart]);

  const groups = useMemo(() => {
    const out: { key: number; label: string; items: any[] }[] = [];
    for (const v of rows) {
      const key = startOfDay(v.scheduledDate);
      let g = out[out.length - 1];
      if (!g || g.key !== key) { g = { key, label: dayLabel(v.scheduledDate, now), items: [] }; out.push(g); }
      g.items.push(v);
    }
    return out;
  }, [rows, now]);

  const run = async (action: string, v: any) => {
    setBusyId(v._id); setError("");
    try {
      const visitId = v._id;
      if (action === "approve") await approve({ visitId, actorName: user?.fullName ?? "Receptionist" });
      else if (action === "reject") await reject({ visitId });
      else if (action === "check_in") await markCheckedIn({ visitId });
      else if (action === "in_meeting") await markInMeeting({ visitId });
      else if (action === "complete") await markCompleted({ visitId });
      else if (action === "no_show") await markNoShow({ visitId });
      else if (action === "cancel") await cancel({ visitId });
    } catch {
      setError("That did not go through. Check your connection and try again.");
    } finally {
      setBusyId(null);
    }
  };

  const selected = selectedId ? all.find((v) => v._id === selectedId) : null;
  const toReschedule = rescheduleId ? all.find((v) => v._id === rescheduleId) : null;
  const toEdit = editId ? all.find((v) => v._id === editId) : null;
  const pendingCount = counts.pending ?? 0;

  return (
    <div className="rc">
      <div className="rc-head">
        <div>
          <h1 className="rc-title">Appointments</h1>
          <p className="rc-sub">Approve, reschedule and follow every booked visit.</p>
        </div>
        <div className="rc-actions">
          <button className="rc-btn rc-btn--primary" onClick={() => navigate("/reception/agenda")}>Book a visit</button>
        </div>
      </div>

      {error && (
        <div className="rc-notice rc-notice--red" role="alert">{error}<button className="rc-btn rc-btn--sm" onClick={() => setError("")}>Dismiss</button></div>
      )}
      {pendingCount > 0 && filter !== "pending" && (
        <div className="rc-notice rc-notice--amber">
          {pendingCount} {pendingCount === 1 ? "visit is" : "visits are"} waiting for approval.
          <button className="rc-btn rc-btn--sm" onClick={() => setFilter("pending")}>Review</button>
        </div>
      )}

      <div className="rc-toolbar">
        <div className="rc-seg" role="group" aria-label="Filter appointments">
          {FILTERS.map((f) => (
            <button key={f.id} aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
              {f.label}
              {counts[f.id] > 0 && <span className={`rc-count${f.id === "pending" ? " rc-count--alert" : ""}`}>{counts[f.id]}</span>}
            </button>
          ))}
        </div>
        <input className="rc-input rc-search" type="search" style={{ marginLeft: "auto" }} placeholder="Search visitor or host" aria-label="Search appointments" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {visits === undefined ? (
        <div className="rc-list"><div className="rc-empty">Loading...</div></div>
      ) : groups.length === 0 ? (
        <div className="rc-list"><div className="rc-empty"><b>Nothing here</b>{needle ? "No appointment matches your search." : "No appointments in this view."}</div></div>
      ) : groups.map((g) => (
        <div key={g.key} className="rc-group">
          <div className="rc-daytitle">{g.label}<span>{g.items.length} {g.items.length === 1 ? "visit" : "visits"}</span></div>
          <div className="rc-list" style={{ ["--rc-acts" as any]: "300px" }}>
            {g.items.map((v) => {
              const n = normStatus(v.status);
              const disabled = busyId === v._id;
              return (
                <div key={v._id} className="rc-row rc-row--click" tabIndex={0} onClick={() => setSelectedId(v._id)}
                  onKeyDown={(e) => { if (e.key === "Enter") setSelectedId(v._id); }}>
                  <div className="rc-time">{fmtTime(v.scheduledDate)}<small>{v.duration ? `${v.duration} min` : ""}</small></div>
                  <div className="rc-who">
                    <div className="rc-name">{v.visitorName}</div>
                    <div className="rc-meta">{[v.purpose, v.visitorCompany].filter(Boolean).join(" · ") || "No details"}</div>
                  </div>
                  <div className="rc-host">{v.hostName ? `Host: ${v.hostName}` : "No host"}</div>
                  <div className="rc-badge-cell"><StatusBadge status={v.status} /></div>
                  <div className="rc-row-actions" onClick={(e) => e.stopPropagation()}>
                    {n === "pending" && <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={disabled} onClick={() => run("approve", v)}>Approve</button>}
                    {n === "approved" && <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={disabled} onClick={() => run("check_in", v)}>Check in</button>}
                    {n === "checked_in" && <button className="rc-btn rc-btn--sm" disabled={disabled} onClick={() => run("in_meeting", v)}>In meeting</button>}
                    {(n === "checked_in" || n === "in_meeting") && <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={disabled} onClick={() => run("complete", v)}>Check out</button>}
                    {AWAITING.includes(v.status) && <button className="rc-btn rc-btn--quiet rc-btn--sm" onClick={() => setRescheduleId(v._id)}>Reschedule</button>}
                    <button className="rc-btn rc-btn--quiet rc-btn--sm" onClick={() => setSelectedId(v._id)}>Details</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {selected && !toReschedule && !toEdit && (
        <DetailModal
          visit={selected}
          hostPhone={((staffList ?? []) as any[]).find((s) => s._id === selected.hostId)?.phone ?? undefined}
          busy={busyId === selected._id}
          onClose={() => setSelectedId(null)}
          run={run}
          onReschedule={() => setRescheduleId(selected._id)}
          onEdit={() => setEditId(selected._id)}
          onDelete={async () => {
            try { await remove({ visitId: selected._id }); setSelectedId(null); }
            catch { setError("Could not delete that visit."); }
          }}
        />
      )}
      {toReschedule && <RescheduleModal visit={toReschedule} onClose={() => setRescheduleId(null)} />}
      {toEdit && <EditModal visit={toEdit} onClose={() => setEditId(null)} />}
    </div>
  );
}
