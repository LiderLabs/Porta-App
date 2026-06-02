import { useState } from "react";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useTheme } from "../../../app/layouts/AdminLayout";
import {
  Users, Building2, MailOpen, UserCheck,
  LogIn, CalendarClock, ShieldAlert, DoorOpen,
  ChevronRight, CheckCircle2, Circle,
} from "lucide-react";

export function DashboardPage() {
  const { user }  = useUser();
  const navigate  = useNavigate();
  const { dark }  = useTheme();

  const staff     = useQuery(api.staff.list);
  const depts     = useQuery(api.departments.list);
  const invites   = useQuery(api.invites.list);
  const visitors  = useQuery(api.visitors.getTodayStats);
  const scheduled = useQuery(api.visitors.getTodayScheduled);
  const rules     = useQuery(api.bookingRules.get);
  const blacklist = useQuery(api.blacklist.list);

  const pendingInvites = invites?.filter((i: any) => i.status === "pending").length ?? 0;
  const org       = useQuery(api.orgSettings.getMyOrg);

  const [copied, setCopied] = useState(false);
  // Theme tokens
  const t = dark ? {
    bg:        "#0d1117",
    card:      "#161b22",
    border:    "#30363d",
    text:      "#e6edf3",
    muted:     "#8b949e",
    faint:     "#484f58",
    hov:       "#2d333b",
    chip:      "#2d333b",
    chipText:  "#8b949e",
    link:      "#3fb950",
  } : {
    bg:        "#f8fafc",
    card:      "#ffffff",
    border:    "#e2e8f0",
    text:      "#0f172a",
    muted:     "#64748b",
    faint:     "#e2e8f0",
    hov:       "#f1f5f9",
    chip:      "#f1f5f9",
    chipText:  "#475569",
    link:      "#16a34a",
  };

  const CARDS = [
    { label: "Staff members",   value: staff?.length ?? "—",                              color: "#3fb950", bg: dark ? "rgba(63,185,80,0.12)"   : "#f0fdf4", Icon: Users },
    { label: "Departments",     value: depts?.length ?? "—",                              color: "#38bdf8", bg: dark ? "rgba(56,189,248,0.12)"  : "#f0f9ff", Icon: Building2 },
    { label: "Pending invites", value: pendingInvites,                                    color: "#f59e0b", bg: dark ? "rgba(245,158,11,0.12)"  : "#fffbeb", Icon: MailOpen },
    { label: "Visitors today",  value: visitors?.totalToday ?? "—",                       color: "#a78bfa", bg: dark ? "rgba(167,139,250,0.12)" : "#faf5ff", Icon: UserCheck },
    { label: "Currently in",    value: visitors?.currentlyIn ?? "—",                      color: "#3fb950", bg: dark ? "rgba(63,185,80,0.12)"   : "#f0fdf4", Icon: LogIn },
    { label: "Scheduled today", value: scheduled?.length ?? "—",                          color: "#fb923c", bg: dark ? "rgba(251,146,60,0.12)"  : "#fff7ed", Icon: CalendarClock },
    { label: "Blacklisted",     value: blacklist?.length ?? "—",                          color: "#f85149", bg: dark ? "rgba(248,81,73,0.12)"   : "#fef2f2", Icon: ShieldAlert },
    {
      label: "Walk-ins",
      value: rules === undefined ? "—" : rules?.walkInEnabled ? "On" : "Off",
      color: rules?.walkInEnabled ? "#3fb950" : (dark ? "#484f58" : "#94a3b8"),
      bg:    rules?.walkInEnabled ? (dark ? "rgba(63,185,80,0.12)" : "#f0fdf4") : (dark ? "#21262d" : "#f9fafb"),
      Icon:  DoorOpen,
    },
  ];

  const setupItems = [
    { label: "Add departments",    done: (depts?.length ?? 0) > 0,           action: () => navigate("/departments") },
    { label: "Invite staff",       done: (staff?.length ?? 0) > 0,           action: () => navigate("/staff") },
    { label: "Set appointment rules",  done: !!rules,                             action: () => navigate("/booking-rules") },
    { label: "Configure security", done: blacklist !== undefined,             action: () => navigate("/security") },
  ];

  return (
    <>
      <style>{`
        .dash-root {
          font-family: 'DM Sans', sans-serif;
          padding: 24px 32px 40px;
          background: ${t.bg};
          min-height: calc(100vh - 52px);
          color: ${t.text};
          transition: background 0.2s, color 0.2s;
        }

        /* Header */
        .dash-hdr {
          display: flex; align-items: flex-start;
          justify-content: space-between; flex-wrap: wrap; gap: 12px;
          margin-bottom: 28px;
        }
        .dash-title {
          font-size: 1.65rem; font-weight: 700;
          color: ${t.text}; letter-spacing: -0.02em; margin-bottom: 3px;
        }
        .dash-sub { font-size: 0.875rem; color: ${t.muted}; }
        .dash-invite {
          background: ${t.link}; color: #fff;
          border: none; border-radius: 8px;
          padding: 10px 20px; font-size: 0.875rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: filter 0.15s; white-space: nowrap;
        }
        .dash-invite:hover { filter: brightness(1.1); }

        /* KPI grid — fills full width */
        .dash-kpi-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 14px;
          margin-bottom: 24px;
        }
        @media (max-width: 1100px) { .dash-kpi-grid { grid-template-columns: repeat(4,1fr); } }
        @media (max-width: 860px)  { .dash-kpi-grid { grid-template-columns: repeat(2,1fr); } }
        @media (max-width: 480px)  { .dash-kpi-grid { grid-template-columns: 1fr 1fr; } }

        .dash-kpi {
          background: ${t.card};
          border: 1px solid ${t.border};
          border-radius: 12px;
          padding: 18px 16px;
          cursor: pointer;
          transition: box-shadow 0.15s, transform 0.15s, border-color 0.15s;
          display: flex; flex-direction: column; gap: 10px;
        }
        .dash-kpi:hover {
          box-shadow: 0 4px 20px rgba(0,0,0,${dark ? "0.35" : "0.08"});
          transform: translateY(-2px);
          border-color: ${dark ? "#444d56" : "#cbd5e1"};
        }
        .dash-kpi-icon {
          width: 38px; height: 38px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }
        .dash-kpi-val {
          font-size: 1.8rem; font-weight: 700;
          letter-spacing: -0.03em; line-height: 1;
        }
        .dash-kpi-lbl {
          font-size: 0.73rem; color: ${t.muted};
          font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em;
        }

        /* Bottom grid */
        .dash-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 18px;
        }
        @media (max-width: 900px) { .dash-bottom { grid-template-columns: 1fr; } }

        .dash-card {
          background: ${t.card};
          border: 1px solid ${t.border};
          border-radius: 12px; padding: 20px;
          transition: background 0.2s, border-color 0.2s;
        }
        .dash-card-hd {
          display: flex; align-items: center;
          justify-content: space-between; margin-bottom: 14px;
        }
        .dash-card-title { font-size: 0.9rem; font-weight: 700; color: ${t.text}; }
        .dash-card-link {
          background: none; border: none; color: ${t.link};
          font-size: 0.78rem; font-weight: 600;
          cursor: pointer; font-family: inherit;
          display: flex; align-items: center; gap: 2px; padding: 0;
        }
        .dash-card-link:hover { text-decoration: underline; }

        .dash-row {
          display: flex; align-items: center; gap: 10px;
          padding: 9px 0; border-bottom: 1px solid ${t.border};
        }
        .dash-row:last-child { border-bottom: none; }
        .dash-av {
          width: 32px; height: 32px; border-radius: 50%;
          background: ${t.hov}; color: ${t.muted};
          font-weight: 700; font-size: 12px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
        }
        .dash-row-name { font-size: 0.85rem; font-weight: 600; color: ${t.text}; }
        .dash-row-sub  { font-size: 0.73rem; color: ${t.muted}; margin-top: 1px; }
        .dash-chip {
          margin-left: auto; background: ${t.chip}; color: ${t.chipText};
          font-size: 0.68rem; font-weight: 600;
          padding: 3px 8px; border-radius: 999px; text-transform: capitalize;
          white-space: nowrap;
        }
        .dash-dot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }

        .dash-check {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 6px; border-bottom: 1px solid ${t.border};
          cursor: pointer; border-radius: 6px;
          transition: background 0.1s;
        }
        .dash-check:last-child { border-bottom: none; }
        .dash-check:hover { background: ${t.hov}; }
        .dash-check-lbl {
          font-size: 0.85rem; font-weight: 500; color: ${t.text}; flex: 1;
        }
        .dash-check-lbl--done { color: ${t.muted}; text-decoration: line-through; }

        .dash-empty { font-size: 0.82rem; color: ${t.muted}; padding: 10px 0; }
        .dash-ilink {
          background: none; border: none; color: ${t.link};
          font-size: 0.82rem; cursor: pointer; font-family: inherit; padding: 0;
        }
      `}</style>

      <div className="dash-root">
        {/* Header */}
        <div className="dash-hdr">
          <div>
            <h1 className="dash-title">Welcome back, {user?.firstName || "there"}</h1>
            <p className="dash-sub">Here's your organisation at a glance.</p>
          </div>
          <button className="dash-invite" onClick={() => navigate("/staff")}>
            + Invite staff
          </button>
        </div>

        {/* KPI cards — 4 columns, fills full width */}
        <div className="dash-kpi-grid">
          {CARDS.map(({ label, value, color, bg, Icon }) => (
            <div key={label} className="dash-kpi">
              <div className="dash-kpi-icon" style={{ background: bg }}>
                <Icon size={19} color={color} strokeWidth={2} />
              </div>
              <div className="dash-kpi-val" style={{ color }}>{value}</div>
              <div className="dash-kpi-lbl">{label}</div>
            </div>
          ))}
        </div>

        {/* Bottom 3-col */}
        <div className="dash-bottom">
          {/* Recent staff */}
          <div className="dash-card">
            <div className="dash-card-hd">
              <div className="dash-card-title">Recent staff</div>
              <button className="dash-card-link" onClick={() => navigate("/staff")}>
                View all <ChevronRight size={13} />
              </button>
            </div>
            {(staff ?? []).slice(0, 6).map((s: any) => (
              <div key={s._id} className="dash-row">
                <div className="dash-av">{s.name?.[0]?.toUpperCase() ?? "?"}</div>
                <div>
                  <div className="dash-row-name">{s.name}</div>
                  <div className="dash-row-sub">
                    {s.department || "No dept"} · {s.role || "employee"}
                  </div>
                </div>
                <span className="dash-chip">{s.role || "employee"}</span>
              </div>
            ))}
            {(!staff || staff.length === 0) && (
              <div className="dash-empty">
                No staff yet.{" "}
                <button className="dash-ilink" onClick={() => navigate("/staff")}>
                  Invite your first team member
                </button>
              </div>
            )}
          </div>

          {/* Departments */}
          <div className="dash-card">
            <div className="dash-card-hd">
              <div className="dash-card-title">Departments</div>
              <button className="dash-card-link" onClick={() => navigate("/departments")}>
                Manage <ChevronRight size={13} />
              </button>
            </div>
            {(depts ?? []).map((d: any) => (
              <div key={d._id} className="dash-row">
                <div className="dash-dot" style={{ background: d.color || "#3fb950" }} />
                <div>
                  <div className="dash-row-name">{d.name}</div>
                  <div className="dash-row-sub">
                    {d.staffCount ?? 0} staff ·{" "}
                    {d.headName ? "Head: " + d.headName : "No head assigned"}
                  </div>
                </div>
              </div>
            ))}
            {(!depts || depts.length === 0) && (
              <div className="dash-empty">
                No departments yet.{" "}
                <button className="dash-ilink" onClick={() => navigate("/departments")}>
                  Add one
                </button>
              </div>
            )}
          </div>

          {/* Quick setup */}
          <div className="dash-card">
            <div className="dash-card-hd">
              <div className="dash-card-title">Quick setup</div>
            </div>
            {setupItems.map(({ label, done, action }) => (
              <div key={label} className="dash-check" onClick={action}>
                {done
                  ? <CheckCircle2 size={17} color="#3fb950" strokeWidth={2} />
                  : <Circle size={17} color={dark ? "#484f58" : "#cbd5e1"} strokeWidth={2} />
                }
                <span className={`dash-check-lbl${done ? " dash-check-lbl--done" : ""}`}>
                  {label}
                </span>
                {!done && <ChevronRight size={14} color={dark ? "#484f58" : "#94a3b8"} />}
              </div>
            ))}
          </div>
        </div>

        {/* Booking link */}
        {org?.slug && (
          <div style={{marginTop:18,background:dark?"#161b22":"#fff",border:`1px solid ${dark?"#30363d":"#e2e8f0"}`,borderRadius:12,padding:"18px 20px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10,flexWrap:"wrap",gap:8}}>
              <div>
                <div style={{fontSize:"0.88rem",fontWeight:700,color:dark?"#e6edf3":"#0f172a"}}>Your booking link</div>
                <div style={{fontSize:"0.75rem",color:dark?"#8b949e":"#64748b",marginTop:2}}>Share this link with visitors so they can book appointments directly.</div>
              </div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
                <a href={`${window.location.origin.replace("5173","5174")}/book/${org.slug}`} target="_blank" rel="noreferrer"
                  style={{fontSize:"0.78rem",fontWeight:600,color:"#3fb950",textDecoration:"none",padding:"6px 12px",border:"1px solid rgba(63,185,80,0.3)",borderRadius:7,background:"rgba(63,185,80,0.08)"}}>
                  Preview ↗
                </a>
                <button onClick={()=>{navigator.clipboard.writeText(`${window.location.origin.replace("5173","5174")}/book/${org.slug}`);setCopied(true);setTimeout(()=>setCopied(false),2000);}}
                  style={{fontSize:"0.78rem",fontWeight:700,padding:"6px 14px",borderRadius:7,border:"none",background:copied?"#3fb950":"rgba(63,185,80,0.15)",color:copied?"#fff":"#3fb950",cursor:"pointer",fontFamily:"inherit",transition:"all .2s"}}>
                  {copied?"✓ Copied!":"Copy link"}
                </button>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,background:dark?"#0d1117":"#f8fafc",border:`1px solid ${dark?"#30363d":"#e2e8f0"}`,borderRadius:8,padding:"9px 14px",fontFamily:"monospace",fontSize:"0.8rem",color:dark?"#8b949e":"#64748b",overflowX:"auto",whiteSpace:"nowrap"}}>
              🔗 {window.location.origin.replace("5173","5174")}/book/{org.slug}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default DashboardPage;
