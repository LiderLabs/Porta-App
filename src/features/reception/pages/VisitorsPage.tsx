import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import "../reception.css";
import { MIN, fmtDateTime, fmtTime, startOfDay } from "../lib";
import { Modal, StatusBadge } from "../parts";

type Filter = "all" | "onsite" | "left";
type Range = "today" | "week" | "month" | "all";

type V = {
  id: string; source: "visit" | "walkin"; name: string; company: string; phone: string; email: string;
  purpose: string; host: string; arrived: number; left?: number; onSite: boolean; status: string;
};

const RANGES: { id: Range; label: string; days: number }[] = [
  { id: "today", label: "Today", days: 0 },
  { id: "week", label: "7 days", days: 7 },
  { id: "month", label: "30 days", days: 30 },
  { id: "all", label: "All time", days: -1 },
];

function exportCSV(rows: V[]) {
  const head = ["Name", "Company", "Phone", "Email", "Purpose", "Host", "Arrived", "Left", "Status"];
  const body = rows.map((v) => [
    v.name, v.company, v.phone, v.email, v.purpose, v.host,
    new Date(v.arrived).toLocaleString(), v.left ? new Date(v.left).toLocaleString() : "", v.onSite ? "On site" : "Left",
  ]);
  const csv = [head, ...body].map((r) => r.map((c) => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" }));
  a.download = `visitors-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export function VisitorsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const walkIns = useQuery(api.visitors.list);
  const visits = useQuery(api.scheduling.list);
  const checkOutWalkIn = useMutation(api.visitors.checkOut);
  const markCompleted = useMutation(api.scheduling.markCompleted);

  const [filter, setFilter] = useState<Filter>("all");
  const [range, setRange] = useState<Range>("week");
  const [q, setQ] = useState(params.get("search") ?? "");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  // People who actually came: appointments that were checked in, plus the older walk-in log.
  const all: V[] = useMemo(() => {
    const fromVisits: V[] = ((visits ?? []) as any[])
      .filter((v) => ["checked_in", "in_meeting", "completed"].includes(v.status))
      .map((v) => ({
        id: v._id, source: "visit", name: v.visitorName ?? "Visitor", company: v.visitorCompany ?? "",
        phone: v.visitorPhone ?? "", email: v.visitorEmail ?? "", purpose: v.purpose ?? "", host: v.hostName ?? "",
        arrived: v.checkInTime ?? v.scheduledDate, left: v.checkOutTime ?? v.completedAt, onSite: v.status !== "completed", status: v.status,
      }));
    const fromWalkIns: V[] = ((walkIns ?? []) as any[]).map((w) => ({
      id: w._id, source: "walkin", name: w.fullName ?? "Visitor", company: w.company ?? "", phone: w.phone ?? "",
      email: w.email ?? "", purpose: w.purpose ?? "", host: w.hostName ?? "", arrived: w.checkInTime, left: w.checkOutTime,
      onSite: w.status === "IN", status: w.status === "IN" ? "checked_in" : "completed",
    }));
    return [...fromVisits, ...fromWalkIns].sort((a, b) => b.arrived - a.arrived);
  }, [visits, walkIns]);

  const since = useMemo(() => {
    const r = RANGES.find((x) => x.id === range)!;
    return r.days < 0 ? 0 : startOfDay(Date.now()) - r.days * 24 * 60 * MIN;
  }, [range]);

  const inRange = all.filter((v) => v.arrived >= since);
  const needle = q.trim().toLowerCase();
  const shown = inRange
    .filter((v) => filter === "all" || (filter === "onsite" ? v.onSite : !v.onSite))
    .filter((v) => !needle || `${v.name} ${v.company} ${v.purpose} ${v.host} ${v.email}`.toLowerCase().includes(needle));
  const onSiteCount = inRange.filter((v) => v.onSite).length;

  const checkOut = async (v: V) => {
    setBusy(v.id); setError("");
    try {
      if (v.source === "walkin") await checkOutWalkIn({ visitorId: v.id as any });
      else await markCompleted({ visitId: v.id as any });
    } catch {
      setError("Could not check that visitor out. Try again.");
    } finally {
      setBusy(null);
    }
  };

  const selected = selectedId ? all.find((v) => v.id === selectedId) : null;
  const loading = visits === undefined || walkIns === undefined;

  return (
    <div className="rc">
      <div className="rc-head">
        <div>
          <h1 className="rc-title">Visitors</h1>
          <p className="rc-sub">{inRange.length} {inRange.length === 1 ? "visitor" : "visitors"} · {onSiteCount} on site</p>
        </div>
        <div className="rc-actions">
          <button className="rc-btn" disabled={shown.length === 0} onClick={() => exportCSV(shown)}>Export CSV</button>
          <button className="rc-btn rc-btn--primary" onClick={() => navigate("/reception/agenda")}>New visitor</button>
        </div>
      </div>

      {error && <div className="rc-notice rc-notice--red" role="alert">{error}<button className="rc-btn rc-btn--sm" onClick={() => setError("")}>Dismiss</button></div>}

      <div className="rc-toolbar">
        <input className="rc-input rc-search" type="search" placeholder="Search name, company, host" aria-label="Search visitors" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="rc-seg" role="group" aria-label="Status">
          {([["all", "All"], ["onsite", "On site"], ["left", "Left"]] as [Filter, string][]).map(([id, label]) => (
            <button key={id} aria-pressed={filter === id} onClick={() => setFilter(id)}>{label}</button>
          ))}
        </div>
        <div className="rc-seg" role="group" aria-label="Period" style={{ marginLeft: "auto" }}>
          {RANGES.map((r) => (<button key={r.id} aria-pressed={range === r.id} onClick={() => setRange(r.id)}>{r.label}</button>))}
        </div>
      </div>

      <div className="rc-list" style={{ ["--rc-acts" as any]: "110px" }}>
        {loading ? <div className="rc-empty">Loading...</div>
          : shown.length === 0 ? <div className="rc-empty"><b>No visitors found</b>Try a longer period or a different search.</div>
          : shown.map((v) => (
            <div key={v.id} className="rc-row rc-row--click" tabIndex={0} onClick={() => setSelectedId(v.id)} onKeyDown={(e) => { if (e.key === "Enter") setSelectedId(v.id); }}>
              <div className="rc-time">{fmtTime(v.arrived)}<small>{startOfDay(v.arrived) === startOfDay(Date.now()) ? "Today" : new Date(v.arrived).toLocaleDateString([], { day: "numeric", month: "short" })}</small></div>
              <div className="rc-who">
                <div className="rc-name">{v.name}</div>
                <div className="rc-meta">{[v.purpose, v.company].filter(Boolean).join(" · ") || "No details"}</div>
              </div>
              <div className="rc-host">{v.host ? `Host: ${v.host}` : ""}</div>
              <div className="rc-badge-cell"><StatusBadge status={v.onSite ? "checked_in" : "completed"} /></div>
              <div className="rc-row-actions" onClick={(e) => e.stopPropagation()}>
                {v.onSite && <button className="rc-btn rc-btn--sm" disabled={busy === v.id} onClick={() => checkOut(v)}>Check out</button>}
              </div>
            </div>
          ))}
      </div>

      {selected && (
        <Modal
          title={<><h2>{selected.name}</h2><div style={{ marginTop: 6 }}><StatusBadge status={selected.onSite ? "checked_in" : "completed"} /></div></>}
          onClose={() => setSelectedId(null)}
          footer={selected.onSite ? <button className="rc-btn rc-btn--primary" disabled={busy === selected.id} onClick={() => checkOut(selected)}>Check out</button> : undefined}
        >
          <dl className="rc-facts" style={{ marginTop: 0 }}>
            {([["Company", selected.company], ["Host", selected.host], ["Purpose", selected.purpose], ["Phone", selected.phone], ["Email", selected.email],
              ["Arrived", fmtDateTime(selected.arrived)], ["Left", selected.left ? fmtDateTime(selected.left) : ""]] as [string, string][])
              .filter(([, v]) => v).map(([k, v]) => (<div key={k} style={{ display: "contents" }}><dt>{k}</dt><dd>{v}</dd></div>))}
          </dl>
        </Modal>
      )}
    </div>
  );
}
