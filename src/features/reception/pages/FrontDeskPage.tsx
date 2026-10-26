import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import "../reception.css";
import { AWAITING, ONSITE, fmtTime, normStatus, relativeTo, startOfDay, MIN } from "../lib";
import { StatusBadge, ConfirmButton } from "../parts";

type Row = {
  id: string; kind: "visit" | "walkin"; status: string; name: string; sub: string; host: string;
  time: number; timeNote: string; late: boolean;
};

export function FrontDeskPage() {
  const { user } = useUser();
  const navigate = useNavigate();
  const visits = useQuery(api.scheduling.list);
  const walkIns = useQuery(api.visitors.list);

  const approve = useMutation(api.scheduling.approve);
  const markCheckedIn = useMutation(api.scheduling.markCheckedIn);
  const markInMeeting = useMutation(api.scheduling.markInMeeting);
  const markCompleted = useMutation(api.scheduling.markCompleted);
  const markNoShow = useMutation(api.scheduling.markNoShow);
  const checkOutWalkIn = useMutation(api.visitors.checkOut);

  const [now, setNow] = useState(() => Date.now());
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const dayStart = startOfDay(now);
  const dayEnd = dayStart + 24 * 60 * MIN;
  const needle = q.trim().toLowerCase();
  const match = (r: Row) => !needle || `${r.name} ${r.sub} ${r.host}`.toLowerCase().includes(needle);

  const { expected, onSite, doneCount, pendingTotal } = useMemo(() => {
    const today = ((visits ?? []) as any[]).filter((v) => v.scheduledDate >= dayStart && v.scheduledDate < dayEnd);
    const toRow = (v: any): Row => {
      const rel = relativeTo(v.scheduledDate, now);
      const onsite = ONSITE.includes(v.status);
      return {
        id: v._id, kind: "visit", status: v.status, name: v.visitorName ?? "Visitor",
        sub: [v.purpose, v.visitorCompany].filter(Boolean).join(" · "), host: v.hostName ?? "",
        time: v.scheduledDate, timeNote: onsite ? "Scheduled" : rel.text, late: !onsite && rel.late,
      };
    };
    const expected = today.filter((v) => AWAITING.includes(v.status)).map(toRow).sort((a, b) => a.time - b.time);
    const onSiteVisits = today.filter((v) => ONSITE.includes(v.status)).map(toRow);
    // Older walk-ins were logged in a separate list. Anyone still marked IN needs checking out.
    const legacy: Row[] = ((walkIns ?? []) as any[]).filter((w) => w.status === "IN").map((w) => ({
      id: w._id, kind: "walkin", status: "checked_in", name: w.fullName ?? "Visitor",
      sub: [w.purpose, w.company].filter(Boolean).join(" · "), host: "", time: w.checkInTime, timeNote: "Arrived", late: false,
    }));
    return {
      expected,
      onSite: [...onSiteVisits, ...legacy].sort((a, b) => a.time - b.time),
      doneCount: today.filter((v) => v.status === "completed").length,
      pendingTotal: ((visits ?? []) as any[]).filter((v) => v.status === "pending" && v.scheduledDate >= dayStart).length,
    };
  }, [visits, walkIns, now, dayStart, dayEnd]);

  const run = async (row: Row, action: string) => {
    setBusy(row.id + action); setError("");
    try {
      const visitId = row.id as Id<"scheduledVisits">;
      if (row.kind === "walkin") await checkOutWalkIn({ visitorId: row.id as Id<"visitors"> });
      else if (action === "approve") await approve({ visitId, actorName: user?.fullName ?? "Receptionist" });
      else if (action === "checkin") await markCheckedIn({ visitId });
      else if (action === "meeting") await markInMeeting({ visitId });
      else if (action === "checkout") await markCompleted({ visitId });
      else if (action === "noshow") await markNoShow({ visitId });
    } catch {
      setError("That did not go through. Check your connection and try again.");
    } finally {
      setBusy(null);
    }
  };

  const loading = visits === undefined;
  const expectedShown = expected.filter(match);
  const onSiteShown = onSite.filter(match);

  const renderRow = (r: Row, section: "expected" | "onsite") => {
    const disabled = busy !== null && busy.startsWith(r.id);
    const n = normStatus(r.status);
    return (
      <div key={r.id} className="rc-row">
        <div className="rc-time">
          {fmtTime(r.time)}
          <small className={r.late ? "is-late" : ""}>{r.timeNote}</small>
        </div>
        <div className="rc-who">
          <div className="rc-name">{r.name}</div>
          {r.sub && <div className="rc-meta">{r.sub}</div>}
        </div>
        <div className="rc-host">{r.host ? `Seeing ${r.host}` : ""}</div>
        <div className="rc-badge-cell"><StatusBadge status={r.status} /></div>
        <div className="rc-row-actions">
          {section === "expected" && n === "pending" && (
            <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={disabled} onClick={() => run(r, "approve")}>Approve</button>
          )}
          {section === "expected" && n === "approved" && (
            <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={disabled} onClick={() => run(r, "checkin")}>Check in</button>
          )}
          {section === "expected" && (
            <ConfirmButton disabled={disabled} confirmLabel="Mark no show?" onConfirm={() => run(r, "noshow")}>No show</ConfirmButton>
          )}
          {section === "onsite" && r.kind === "visit" && n === "checked_in" && (
            <button className="rc-btn rc-btn--sm" disabled={disabled} onClick={() => run(r, "meeting")}>In meeting</button>
          )}
          {section === "onsite" && (
            <button className="rc-btn rc-btn--primary rc-btn--sm" disabled={disabled} onClick={() => run(r, "checkout")}>Check out</button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="rc">
      <div className="rc-head">
        <div>
          <h1 className="rc-title">Front desk</h1>
          <p className="rc-sub">{new Date(now).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" })}</p>
        </div>
        <div className="rc-actions">
          <button className="rc-btn rc-btn--primary" onClick={() => navigate("/reception/agenda")}>New visitor</button>
        </div>
      </div>

      {error && (
        <div className="rc-notice rc-notice--red" role="alert">
          {error}
          <button className="rc-btn rc-btn--sm" onClick={() => setError("")}>Dismiss</button>
        </div>
      )}

      {pendingTotal > 0 && (
        <div className="rc-notice rc-notice--amber">
          {pendingTotal} {pendingTotal === 1 ? "visit is" : "visits are"} waiting for approval.
          <Link className="rc-btn rc-btn--sm" to="/reception/appointments?filter=pending">Review</Link>
        </div>
      )}

      <div className="rc-stats">
        <div className="rc-stat"><b>{loading ? "–" : expected.length}</b><span>Expected</span></div>
        <div className="rc-stat"><b>{loading ? "–" : onSite.length}</b><span>On site</span></div>
        <div className="rc-stat"><b>{loading ? "–" : doneCount}</b><span>Completed today</span></div>
      </div>

      <div className="rc-toolbar">
        <input className="rc-input rc-search" type="search" placeholder="Search by visitor, company or host" aria-label="Search today's visitors" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="rc-list"><div className="rc-empty">Loading...</div></div>
      ) : expected.length === 0 && onSite.length === 0 ? (
        <div className="rc-list">
          <div className="rc-empty">
            <b>No visitors expected</b>
            Nobody is booked for the rest of today. Use New visitor when someone arrives.
          </div>
        </div>
      ) : (
        <>
          <section className="rc-section">
            <h2 className="rc-section-title">Expected <span className="rc-count">{expectedShown.length}</span></h2>
            <div className="rc-list" style={{ ["--rc-acts" as any]: "200px" }}>
              {expectedShown.length === 0
                ? <div className="rc-empty">{needle ? "No match." : "Everyone expected has arrived."}</div>
                : expectedShown.map((r) => renderRow(r, "expected"))}
            </div>
          </section>
          <section className="rc-section">
            <h2 className="rc-section-title">On site <span className="rc-count">{onSiteShown.length}</span></h2>
            <div className="rc-list" style={{ ["--rc-acts" as any]: "200px" }}>
              {onSiteShown.length === 0
                ? <div className="rc-empty">{needle ? "No match." : "Nobody is on site right now."}</div>
                : onSiteShown.map((r) => renderRow(r, "onsite"))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
