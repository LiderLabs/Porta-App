import { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

const LABEL: Record<string, { text: string; color: string }> = {
  EDITED:      { text: "Edited",      color: "#58a6ff" },
  RESCHEDULED: { text: "Rescheduled", color: "#d29922" },
  CANCELLED:   { text: "Cancelled",   color: "#f85149" },
  REJECTED:    { text: "Rejected",    color: "#f85149" },
  DELETED:     { text: "Deleted",     color: "#f85149" },
  APPROVED:    { text: "Approved",    color: "#3fb950" },
  NO_SHOW:     { text: "No show",     color: "#8b949e" },
};

const fmt = (ms: number) => new Date(ms).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

export function ActivityPage() {
  const rows = useQuery(api.activity.list, { limit: 300 }) as any[] | undefined;
  const [q, setQ] = useState("");
  const [action, setAction] = useState("ALL");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (rows ?? []).filter((r) =>
      (action === "ALL" || r.action === action) &&
      (!needle || `${r.targetLabel ?? ""} ${r.actorName ?? ""} ${r.detail ?? ""}`.toLowerCase().includes(needle)));
  }, [rows, q, action]);

  const detailOf = (r: any) =>
    r.action === "RESCHEDULED" && r.fromDate && r.toDate ? `${fmt(r.fromDate)} to ${fmt(r.toDate)}` : (r.detail || "");

  return (
    <div className="ad-page">
      <div className="ad-page-head">
        <div>
          <h1 className="ad-title">Activity log</h1>
          <p className="ad-sub">Who changed, moved, approved or cancelled bookings, newest first</p>
        </div>
      </div>

      <div className="ad-card">
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            placeholder="Search visitor, staff or detail"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ flex: "1 1 220px", minWidth: 0, padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontSize: 13 }}
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", fontFamily: "inherit", fontSize: 13 }}
          >
            <option value="ALL">All actions</option>
            {Object.entries(LABEL).map(([k, v]) => <option key={k} value={k}>{v.text}</option>)}
          </select>
        </div>

        {rows === undefined ? (
          <div className="ad-empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="ad-empty">{rows.length === 0 ? "No booking activity yet." : "Nothing matches your filters."}</div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="ad-table">
              <thead><tr><th>When</th><th>Action</th><th>Visitor</th><th>Detail</th><th>By</th></tr></thead>
              <tbody>
                {filtered.map((r) => {
                  const l = LABEL[r.action] ?? { text: r.action, color: "var(--muted)" };
                  return (
                    <tr key={r._id}>
                      <td style={{ whiteSpace: "nowrap", fontSize: 12, color: "var(--muted)" }}>{fmt(r.createdAt)}</td>
                      <td><span style={{ color: l.color, fontWeight: 700, fontSize: 12 }}>{l.text}</span></td>
                      <td style={{ fontWeight: 600 }}>{r.targetLabel || "-"}</td>
                      <td style={{ fontSize: 12, color: "var(--muted)", maxWidth: 360, overflowWrap: "anywhere" }}>{detailOf(r) || "-"}</td>
                      <td style={{ fontSize: 13 }}>{r.actorName}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
