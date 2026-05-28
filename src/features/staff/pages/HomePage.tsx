import { useQuery, useMutation } from "convex/react";
// @ts-ignore
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import {
  Bell, CalendarPlus, Clock, CheckCheck, CalendarDays,
  ChevronRight, AlarmClock,
} from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  pending:    "#f59e0b",
  approved:   "#3fb950",
  accepted:   "#3fb950",
  rejected:   "#f85149",
  declined:   "#f85149",
  checked_in: "#38bdf8",
  in_meeting: "#a78bfa",
  completed:  "#6b7280",
  cancelled:  "#6b7280",
  no_show:    "#ef4444",
};

export function HomePage() {
  const { user } = useUser();
  const navigate  = useNavigate();

  const allVisits     = useQuery(api.scheduling.listByStaff, { clerkUserId: user?.id ?? "" });
  const upcoming      = useQuery(api.scheduling.getUpcoming,  { clerkUserId: user?.id ?? "" });
  const notifications = useQuery(api.notifications.listForUser, { clerkUserId: user?.id ?? "" });
  const markAllRead   = useMutation(api.notifications.markAllRead);

  const today = new Date();
  const todayVisits = (allVisits ?? []).filter((v: any) => {
    const d = new Date(v.scheduledDate);
    return (
      d.getFullYear() === today.getFullYear() &&
      d.getMonth()    === today.getMonth() &&
      d.getDate()     === today.getDate()
    );
  });

  const pending  = (allVisits ?? []).filter((v: any) => v.status === "pending");
  const accepted = (allVisits ?? []).filter((v: any) =>
    ["approved","accepted","checked_in","in_meeting"].includes(v.status)
  );
  const unread   = (notifications ?? []).filter((n: any) => !n.read);

  const hour      = new Date().getHours();
  const greeting  = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = user?.firstName ?? "there";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap');

        .hp {
          font-family: 'DM Sans', sans-serif;
          padding: 24px 28px 48px;
          width: 100%;
          min-height: 0;
          box-sizing: border-box;
          color: var(--text);
          background: var(--bg);
        }

        /* Header */
        .hp-hdr {
          display: flex; align-items: flex-start;
          justify-content: space-between; flex-wrap: wrap;
          gap: 12px; margin-bottom: 24px;
        }
        .hp-greeting {
          font-size: 1.6rem; font-weight: 800;
          letter-spacing: -0.02em; color: var(--text);
          margin-bottom: 3px;
        }
        .hp-date { font-size: 0.875rem; color: var(--muted); }
        .hp-bell-btn {
          position: relative; background: var(--surface);
          border: 1px solid var(--border); border-radius: 10px;
          padding: 8px 10px; cursor: pointer; color: var(--muted);
          display: flex; align-items: center;
          transition: color .12s, border-color .12s;
        }
        .hp-bell-btn:hover { color: var(--text); border-color: var(--accent); }
        .hp-bell-badge {
          position: absolute; top: -5px; right: -5px;
          background: #f59e0b; color: #fff;
          font-size: 10px; font-weight: 700;
          width: 18px; height: 18px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
        }

        /* KPI strip */
        .hp-kpis {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px; margin-bottom: 20px;
        }
        @media (max-width: 700px) { .hp-kpis { grid-template-columns: repeat(2,1fr); } }
        .hp-kpi {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 16px;
          border-left: 3px solid transparent;
        }
        .hp-kpi--blue   { border-left-color: #38bdf8; }
        .hp-kpi--orange { border-left-color: #f59e0b; }
        .hp-kpi--green  { border-left-color: #3fb950; }
        .hp-kpi--muted  { border-left-color: #6b7280; }
        .hp-kpi-val   { font-size: 1.8rem; font-weight: 800; letter-spacing: -0.03em; color: var(--text); line-height: 1; margin-bottom: 4px; }
        .hp-kpi-label { font-size: 0.73rem; color: var(--muted); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }

        /* Reminder banner */
        .hp-reminder {
          display: flex; align-items: flex-start; gap: 12px;
          background: rgba(245,158,11,0.1); border: 1px solid rgba(245,158,11,0.3);
          border-radius: 10px; padding: 12px 16px; margin-bottom: 20px;
        }
        .hp-reminder-title { font-size: 0.85rem; font-weight: 700; color: #f59e0b; }
        .hp-reminder-sub   { font-size: 0.8rem; color: var(--muted); margin-top: 2px; }

        /* Grid */
        .hp-grid {
          display: grid; grid-template-columns: 1fr 1fr;
          gap: 16px; margin-bottom: 24px;
        }
        @media (max-width: 800px) { .hp-grid { grid-template-columns: 1fr; } }

        .hp-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; overflow: hidden;
        }
        .hp-card-hd {
          display: flex; align-items: center;
          justify-content: space-between;
          padding: 14px 16px; border-bottom: 1px solid var(--border);
        }
        .hp-card-title { font-size: 0.875rem; font-weight: 700; color: var(--text); }
        .hp-card-link {
          background: none; border: none; color: var(--accent);
          font-size: 0.78rem; font-weight: 600; cursor: pointer;
          font-family: inherit; display: flex; align-items: center; gap: 2px; padding: 0;
        }
        .hp-card-link:hover { text-decoration: underline; }
        .hp-empty { padding: 24px 16px; font-size: 0.85rem; color: var(--muted); text-align: center; }

        /* Visit rows */
        .hp-visit-list { display: flex; flex-direction: column; }
        .hp-visit-row {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-bottom: 1px solid var(--border);
        }
        .hp-visit-row:last-child { border-bottom: none; }
        .hp-visit-av {
          width: 32px; height: 32px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 12px; color: #fff; flex-shrink: 0;
        }
        .hp-visit-name  { font-size: 0.85rem; font-weight: 600; color: var(--text); }
        .hp-visit-time  { font-size: 0.73rem; color: var(--muted); margin-top: 1px; }
        .hp-visit-status { margin-left: auto; font-size: 0.72rem; font-weight: 700; flex-shrink: 0; }

        /* Notifications */
        .hp-notif-list { display: flex; flex-direction: column; }
        .hp-notif-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 16px; border-bottom: 1px solid var(--border);
          opacity: 0.6;
        }
        .hp-notif-row:last-child { border-bottom: none; }
        .hp-notif-row--unread { opacity: 1; }
        .hp-notif-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--accent); margin-top: 5px; flex-shrink: 0;
        }
        .hp-notif-msg  { font-size: 0.82rem; color: var(--text); font-weight: 500; }
        .hp-notif-time { font-size: 0.72rem; color: var(--muted); margin-top: 2px; }

        /* Quick actions */
        .hp-quick-title { font-size: 0.72rem; font-weight: 700; color: var(--muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 10px; }
        .hp-quick-grid  { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; }
        @media (max-width: 700px) { .hp-quick-grid { grid-template-columns: repeat(2,1fr); } }
        .hp-quick-btn {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 12px; padding: 18px 14px;
          display: flex; flex-direction: column; align-items: center; gap: 10px;
          cursor: pointer; font-family: inherit; font-size: 0.82rem;
          font-weight: 600; color: var(--text);
          transition: border-color .12s, box-shadow .12s, transform .12s;
        }
        .hp-quick-btn:hover {
          border-color: var(--accent);
          box-shadow: 0 4px 16px rgba(0,0,0,0.1);
          transform: translateY(-2px);
        }
      `}</style>

      <div className="hp">
        {/* Header */}
        <div className="hp-hdr">
          <div>
            <div className="hp-greeting">{greeting}, {firstName}</div>
            <div className="hp-date">
              {today.toLocaleDateString([], { weekday:"long", month:"long", day:"numeric" })}
            </div>
          </div>
          {unread.length > 0 && (
            <button className="hp-bell-btn"
              onClick={() => markAllRead({ clerkUserId: user?.id ?? "" })}>
              <Bell size={18} />
              <span className="hp-bell-badge">{unread.length}</span>
            </button>
          )}
        </div>

        {/* KPI strip */}
        <div className="hp-kpis">
          <div className="hp-kpi hp-kpi--blue">
            <div className="hp-kpi-val">{todayVisits.length}</div>
            <div className="hp-kpi-label">Today's visits</div>
          </div>
          <div className="hp-kpi hp-kpi--orange">
            <div className="hp-kpi-val">{pending.length}</div>
            <div className="hp-kpi-label">Pending approval</div>
          </div>
          <div className="hp-kpi hp-kpi--green">
            <div className="hp-kpi-val">{upcoming?.length ?? 0}</div>
            <div className="hp-kpi-label">In next 24 hours</div>
          </div>
          <div className="hp-kpi hp-kpi--muted">
            <div className="hp-kpi-val">{accepted.length}</div>
            <div className="hp-kpi-label">Accepted total</div>
          </div>
        </div>

        {/* Reminder banner */}
        {(upcoming ?? []).length > 0 && (
          <div className="hp-reminder">
            <AlarmClock size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div className="hp-reminder-title">Visit reminder</div>
              <div className="hp-reminder-sub">
                {upcoming![0].visitorName} is scheduled at{" "}
                {new Date(upcoming![0].scheduledDate).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                {upcoming!.length > 1 ? ` · +${upcoming!.length - 1} more today` : ""}
              </div>
            </div>
          </div>
        )}

        {/* Today + Notifications grid */}
        <div className="hp-grid">
          <div className="hp-card">
            <div className="hp-card-hd">
              <div className="hp-card-title">Today's schedule</div>
              <button className="hp-card-link" onClick={() => navigate("/staff/schedule")}>
                View all <ChevronRight size={13} />
              </button>
            </div>
            {todayVisits.length === 0 ? (
              <div className="hp-empty">No visits scheduled today.</div>
            ) : (
              <div className="hp-visit-list">
                {todayVisits.map((v: any) => {
                  const hue = [...v.visitorName].reduce((a: number, c: string) => a + c.charCodeAt(0), 0) % 360;
                  return (
                    <div key={v._id} className="hp-visit-row">
                      <div className="hp-visit-av" style={{ background: `hsl(${hue},50%,28%)` }}>
                        {v.visitorName[0].toUpperCase()}
                      </div>
                      <div>
                        <div className="hp-visit-name">{v.visitorName}</div>
                        <div className="hp-visit-time">
                          {new Date(v.scheduledDate).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                          {v.purpose ? ` · ${v.purpose}` : ""}
                        </div>
                      </div>
                      <div className="hp-visit-status" style={{ color: STATUS_COLORS[v.status] ?? "var(--muted)" }}>
                        {v.status}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="hp-card">
            <div className="hp-card-hd">
              <div className="hp-card-title">Notifications</div>
              {unread.length > 0 && (
                <button className="hp-card-link"
                  onClick={() => markAllRead({ clerkUserId: user?.id ?? "" })}>
                  Mark all read
                </button>
              )}
            </div>
            {(notifications ?? []).length === 0 ? (
              <div className="hp-empty">No notifications yet.</div>
            ) : (
              <div className="hp-notif-list">
                {(notifications ?? []).slice(0, 8).map((n: any) => (
                  <div key={n._id} className={`hp-notif-row${n.read ? "" : " hp-notif-row--unread"}`}>
                    <div className="hp-notif-dot" />
                    <div>
                      <div className="hp-notif-msg">{n.message}</div>
                      <div className="hp-notif-time">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour:"2-digit", minute:"2-digit" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <div className="hp-quick-title">Quick actions</div>
          <div className="hp-quick-grid">
            <button className="hp-quick-btn" onClick={() => navigate("/staff/schedule")}>
              <CalendarPlus size={22} color="var(--accent)" />
              <span>Schedule a visit</span>
            </button>
            <button className="hp-quick-btn" onClick={() => navigate("/staff/schedule")}>
              <Clock size={22} color="#f59e0b" />
              <span>Pending ({pending.length})</span>
            </button>
            <button className="hp-quick-btn" onClick={() => navigate("/staff/schedule")}>
              <CheckCheck size={22} color="#3fb950" />
              <span>Accepted visits</span>
            </button>
            <button className="hp-quick-btn" onClick={() => navigate("/staff/schedule")}>
              <CalendarDays size={22} color="#38bdf8" />
              <span>All visits</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}