import * as React from "react";
import { useState, useMemo } from "react";

const MONTHS_LONG = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS_LONG  = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const DAYS_SHORT = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const HOURS = Array.from({length:24},(_,i)=>i);

const STATUS_COLOR: Record<string,string> = {
  pending:"#f59e0b", approved:"#58a6ff", accepted:"#58a6ff",
  checked_in:"#3fb950", in_meeting:"#a78bfa",
  completed:"#6b7280", cancelled:"#6b7280",
  rejected:"#f85149", declined:"#f85149", no_show:"#f85149",
};
const STATUS_LABEL: Record<string,string> = {
  pending:"Pending", approved:"Approved", accepted:"Approved",
  checked_in:"Checked in", in_meeting:"In meeting",
  completed:"Completed", cancelled:"Cancelled",
  rejected:"Rejected", declined:"Rejected", no_show:"No show",
};

type CalView = "day" | "week" | "month";

function isPast(ts: number) { return ts < Date.now() - 60000; }

function fmt12(h: number, m: number) {
  const ampm = h >= 12 ? "PM" : "AM";
  const hh = h % 12 || 12;
  return `${hh}:${String(m).padStart(2,"0")} ${ampm}`;
}

function startOfWeek(d: Date) {
  const copy = new Date(d);
  copy.setDate(d.getDate() - d.getDay());
  copy.setHours(0,0,0,0);
  return copy;
}

export function LiveCalendar({ visits, blockedSlots=[], onSelectVisit, title }: {
  visits: any[]; blockedSlots?: any[]; onSelectVisit: (v: any) => void; title?: string;
}) {
  const [cur, setCur] = useState(new Date());
  const [view, setView] = useState<CalView>("month");
  const today = new Date();

  // ── navigation ──────────────────────────────────────────────────────────────
  const goToday = () => setCur(new Date());
  const goPrev = () => {
    const d = new Date(cur);
    if (view === "month") d.setMonth(d.getMonth() - 1);
    else if (view === "week") d.setDate(d.getDate() - 7);
    else d.setDate(d.getDate() - 1);
    setCur(d);
  };
  const goNext = () => {
    const d = new Date(cur);
    if (view === "month") d.setMonth(d.getMonth() + 1);
    else if (view === "week") d.setDate(d.getDate() + 7);
    else d.setDate(d.getDate() + 1);
    setCur(d);
  };

  // ── header label ────────────────────────────────────────────────────────────
  const headerLabel = useMemo(() => {
    if (view === "month") return `${MONTHS_LONG[cur.getMonth()]} ${cur.getFullYear()}`;
    if (view === "day") return `${DAYS_LONG[cur.getDay()]}, ${MONTHS_SHORT[cur.getMonth()]} ${cur.getDate()}, ${cur.getFullYear()}`;
    const ws = startOfWeek(cur);
    const we = new Date(ws); we.setDate(ws.getDate() + 6);
    if (ws.getMonth() === we.getMonth())
      return `${MONTHS_LONG[ws.getMonth()]} ${ws.getDate()} – ${we.getDate()}, ${ws.getFullYear()}`;
    return `${MONTHS_SHORT[ws.getMonth()]} ${ws.getDate()} – ${MONTHS_SHORT[we.getMonth()]} ${we.getDate()}, ${ws.getFullYear()}`;
  }, [cur, view]);

  // ── visits by date ───────────────────────────────────────────────────────────
  const visitsForDay = (d: Date) => {
    const s = new Date(d); s.setHours(0,0,0,0);
    const e = new Date(d); e.setHours(23,59,59,999);
    return visits.filter((v:any) => v.scheduledDate >= s.getTime() && v.scheduledDate <= e.getTime());
  };

  const blockedForDay = (d: Date) => {
    const s = new Date(d); s.setHours(0,0,0,0);
    const e = new Date(d); e.setHours(23,59,59,999);
    return blockedSlots.filter((b:any) => b.startTime >= s.getTime() && b.startTime <= e.getTime());
  };

  const isToday = (d: Date) =>
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();

  const isCurDay = (d: Date) =>
    d.getDate() === cur.getDate() &&
    d.getMonth() === cur.getMonth() &&
    d.getFullYear() === cur.getFullYear();

  // ── MONTH view ───────────────────────────────────────────────────────────────
  const MonthView = () => {
    const year = cur.getFullYear(), month = cur.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month+1, 0).getDate();
    const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];
    // pad to complete last row
    while (cells.length % 7 !== 0) cells.push(null);
    const [popup, setPopup] = useState<{date:Date;visits:any[]}|null>(null);

    return (
      <>
        <div className="gc-month-grid">
          {DAYS_SHORT.map(d => <div key={d} className="gc-month-hdr">{d}</div>)}
          {cells.map((day, i) => {
            const date = day ? new Date(year, month, day) : null;
            const dv = date ? visitsForDay(date) : [];
            const db = date ? blockedForDay(date) : [];
            const todayCell = date ? isToday(date) : false;
            return (
              <div key={i} className={`gc-month-cell${todayCell?" gc-month-cell--today":""}`}
                onClick={() => date && dv.length > 2 && setPopup({date, visits:dv})}>
                {day && (
                  <>
                    <div className={`gc-day-num${todayCell?" gc-day-num--today":""}`}>{day}</div>
                    <div className="gc-month-events">
                      {db.slice(0,1).map((b:any) => (
                        <div key={b._id} className="gc-event gc-event--blocked">
                          🔒 {b.staffName?.split(" ")[0] ?? "Blocked"}
                        </div>
                      ))}
                      {dv.slice(0,2).map((v:any) => {
                        const past = isPast(v.scheduledDate);
                        const col = past ? "#6b7280" : (STATUS_COLOR[v.status] ?? "#6b7280");
                        const time = new Date(v.scheduledDate).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});
                        return (
                          <div key={v._id} className={`gc-event${past?" gc-event--past":""}`}
                            style={{background:`${col}22`,color:col,borderLeft:`2px solid ${col}`}}
                            onClick={e => { e.stopPropagation(); onSelectVisit(v); }}
                            title={`${v.visitorName} — ${STATUS_LABEL[v.status]??v.status}`}>
                            <span className="gc-event-time">{time}</span> {v.visitorName?.split(" ")[0]}
                          </div>
                        );
                      })}
                      {dv.length > 2 && (
                        <div className="gc-more"
                          onClick={e => { e.stopPropagation(); date && setPopup({date, visits:dv}); }}>
                          +{dv.length - 2} more
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
        {popup && (
          <div className="gc-overlay" onClick={() => setPopup(null)}>
            <div className="gc-popup" onClick={e => e.stopPropagation()}>
              <div className="gc-popup-hd">
                <span className="gc-popup-title">
                  {DAYS_LONG[popup.date.getDay()]}, {MONTHS_SHORT[popup.date.getMonth()]} {popup.date.getDate()}
                </span>
                <button className="gc-close-btn" onClick={() => setPopup(null)}>✕</button>
              </div>
              <div className="gc-popup-body">
                {popup.visits.map((v:any) => {
                  const past = isPast(v.scheduledDate);
                  const col = past ? "#6b7280" : (STATUS_COLOR[v.status] ?? "#6b7280");
                  return (
                    <div key={v._id} className="gc-popup-item"
                      onClick={() => { setPopup(null); onSelectVisit(v); }}>
                      <div className="gc-popup-dot" style={{background:col}}/>
                      <div>
                        <div className="gc-popup-name">{v.visitorName}</div>
                        <div className="gc-popup-meta">
                          {new Date(v.scheduledDate).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                          {" · "}{STATUS_LABEL[v.status]??v.status}
                          {v.hostName ? ` · ${v.hostName}` : ""}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // ── TIME GRID (Day & Week) ──────────────────────────────────────────────────
  const TimeGrid = ({ days }: { days: Date[] }) => {
    const nowH = today.getHours(), nowM = today.getMinutes();
    const nowPct = ((nowH * 60 + nowM) / (24 * 60)) * 100;
    const showNowLine = days.some(d => isToday(d));

    return (
      <div className="gc-timegrid">
        {/* day headers */}
        <div className="gc-tg-hdr-row">
          <div className="gc-tg-gutter"/>
          {days.map((d, i) => (
            <div key={i} className={`gc-tg-day-hdr${isToday(d)?" gc-tg-day-hdr--today":""}`}
              onClick={() => { setCur(d); setView("day"); }}>
              <span className="gc-tg-day-name">{DAYS_SHORT[d.getDay()]}</span>
              <span className={`gc-tg-day-num${isToday(d)?" gc-tg-day-num--today":""}`}>{d.getDate()}</span>
            </div>
          ))}
        </div>
        {/* time slots */}
        <div className="gc-tg-body">
          <div className="gc-tg-hours">
            {HOURS.map(h => (
              <div key={h} className="gc-tg-hour-row">
                <div className="gc-tg-hour-label">{h === 0 ? "" : fmt12(h, 0)}</div>
                <div className="gc-tg-hour-line"/>
              </div>
            ))}
            {showNowLine && (
              <div className="gc-now-line" style={{top:`${nowPct}%`}}>
                <div className="gc-now-dot"/>
                <div className="gc-now-bar"/>
              </div>
            )}
          </div>
          <div className="gc-tg-cols">
            {days.map((d, di) => {
              const dv = visitsForDay(d);
              const db = blockedForDay(d);
              return (
                <div key={di} className={`gc-tg-col${isToday(d)?" gc-tg-col--today":""}`}>
                  {/* blocked slots */}
                  {db.map((b:any) => {
                    const startH = new Date(b.startTime).getHours();
                    const startM = new Date(b.startTime).getMinutes();
                    const endH = b.endTime ? new Date(b.endTime).getHours() : startH + 1;
                    const endM = b.endTime ? new Date(b.endTime).getMinutes() : 0;
                    const top = ((startH * 60 + startM) / (24 * 60)) * 100;
                    const height = Math.max(2, ((endH * 60 + endM - startH * 60 - startM) / (24 * 60)) * 100);
                    return (
                      <div key={b._id} className="gc-tg-event gc-tg-event--blocked"
                        style={{top:`${top}%`,height:`${height}%`}}>
                        🔒 {b.staffName?.split(" ")[0] ?? "Blocked"}
                      </div>
                    );
                  })}
                  {/* visits */}
                  {dv.map((v:any) => {
                    const vd = new Date(v.scheduledDate);
                    const startH = vd.getHours(), startM = vd.getMinutes();
                    const top = ((startH * 60 + startM) / (24 * 60)) * 100;
                    const height = Math.max(2.5, (60 / (24 * 60)) * 100); // default 1hr
                    const past = isPast(v.scheduledDate);
                    const col = past ? "#6b7280" : (STATUS_COLOR[v.status] ?? "#6b7280");
                    return (
                      <div key={v._id} className="gc-tg-event"
                        style={{
                          top:`${top}%`, height:`${height}%`,
                          background:`${col}22`, color:col,
                          borderLeft:`3px solid ${col}`,
                          opacity: past ? 0.6 : 1,
                        }}
                        onClick={() => onSelectVisit(v)}
                        title={`${v.visitorName} — ${STATUS_LABEL[v.status]??v.status}`}>
                        <div className="gc-tg-event-name">{v.visitorName?.split(" ")[0]}</div>
                        <div className="gc-tg-event-time">{fmt12(startH, startM)}</div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ── day & week day arrays ────────────────────────────────────────────────────
  const dayDays = [cur];
  const weekStart = startOfWeek(cur);
  const weekDays = Array.from({length:7}, (_,i) => {
    const d = new Date(weekStart); d.setDate(weekStart.getDate() + i); return d;
  });

  return (
    <>
      <style>{`
        /* ── wrapper ── */
        .gc-wrap { background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:14px; overflow:hidden; font-family:inherit; }

        /* ── toolbar ── */
        .gc-toolbar { display:flex; align-items:center; justify-content:space-between; padding:12px 16px; border-bottom:1px solid var(--border,#30363d); gap:12px; flex-wrap:wrap; }
        .gc-toolbar-left { display:flex; align-items:center; gap:8px; }
        .gc-today-btn { background:none; border:1px solid var(--border,#30363d); border-radius:8px; padding:6px 14px; font-size:13px; font-weight:600; color:var(--text,#e6edf3); cursor:pointer; font-family:inherit; transition:background .12s; }
        .gc-today-btn:hover { background:var(--hov,#2d333b); }
        .gc-nav-btn { background:none; border:1px solid var(--border,#30363d); border-radius:8px; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:var(--muted,#8b949e); cursor:pointer; font-size:16px; transition:background .12s; }
        .gc-nav-btn:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .gc-header-label { font-size:1rem; font-weight:700; color:var(--text,#e6edf3); white-space:nowrap; }
        .gc-live-dot { font-size:11px; font-weight:700; color:var(--accent,#3fb950); letter-spacing:0.06em; }
        .gc-view-switcher { display:flex; background:var(--bg,#0d1117); border:1px solid var(--border,#30363d); border-radius:8px; overflow:hidden; }
        .gc-view-btn { background:none; border:none; padding:6px 14px; font-size:12px; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; transition:background .12s,color .12s; white-space:nowrap; }
        .gc-view-btn:hover { color:var(--text,#e6edf3); background:var(--hov,#2d333b); }
        .gc-view-btn--active { background:var(--accent-bg,rgba(63,185,80,0.12)); color:var(--accent,#3fb950); }

        /* ── month view ── */
        .gc-month-grid { display:grid; grid-template-columns:repeat(7,1fr); }
        .gc-month-hdr { padding:8px 0; text-align:center; font-size:11px; font-weight:700; color:var(--muted,#8b949e); text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid var(--border,#30363d); }
        .gc-month-cell { min-height:100px; border-right:1px solid var(--border,#30363d); border-bottom:1px solid var(--border,#30363d); padding:6px 5px; cursor:default; transition:background .1s; }
        .gc-month-cell:nth-child(7n) { border-right:none; }
        .gc-month-cell:hover { background:var(--hov,#2d333b); }
        .gc-month-cell--today { background:rgba(63,185,80,0.04); }
        .gc-day-num { font-size:12px; font-weight:600; color:var(--muted,#8b949e); margin-bottom:4px; width:24px; height:24px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; }
        .gc-day-num--today { background:var(--accent,#3fb950); color:#fff; font-weight:700; }
        .gc-month-events { display:flex; flex-direction:column; gap:2px; }
        .gc-event { font-size:11px; font-weight:600; padding:2px 6px; border-radius:4px; cursor:pointer; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; transition:filter .1s; }
        .gc-event:hover { filter:brightness(1.15); }
        .gc-event--past { opacity:0.5; }
        .gc-event--blocked { background:var(--hov,#2d333b)!important; color:var(--muted,#8b949e)!important; border-left:2px solid var(--muted,#8b949e)!important; cursor:default; font-size:10px; }
        .gc-event-time { opacity:0.75; margin-right:2px; }
        .gc-more { font-size:11px; color:var(--accent,#3fb950); padding:1px 4px; cursor:pointer; font-weight:600; border-radius:4px; }
        .gc-more:hover { background:var(--accent-bg,rgba(63,185,80,0.12)); }

        /* ── time grid ── */
        .gc-timegrid { display:flex; flex-direction:column; overflow:hidden; }
        .gc-tg-hdr-row { display:flex; border-bottom:1px solid var(--border,#30363d); }
        .gc-tg-gutter { width:56px; flex-shrink:0; }
        .gc-tg-day-hdr { flex:1; text-align:center; padding:8px 4px; cursor:pointer; transition:background .1s; }
        .gc-tg-day-hdr:hover { background:var(--hov,#2d333b); }
        .gc-tg-day-hdr--today { background:rgba(63,185,80,0.04); }
        .gc-tg-day-name { display:block; font-size:11px; font-weight:700; color:var(--muted,#8b949e); text-transform:uppercase; letter-spacing:0.05em; }
        .gc-tg-day-num { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border-radius:50%; font-size:14px; font-weight:700; color:var(--text,#e6edf3); margin-top:2px; }
        .gc-tg-day-num--today { background:var(--accent,#3fb950); color:#fff; }
        .gc-tg-body { display:flex; max-height:600px; overflow-y:auto; position:relative; }
        .gc-tg-hours { width:56px; flex-shrink:0; position:relative; }
        .gc-tg-hour-row { height:48px; position:relative; }
        .gc-tg-hour-label { position:absolute; top:-8px; left:0; right:6px; text-align:right; font-size:10px; color:var(--muted,#8b949e); white-space:nowrap; }
        .gc-tg-hour-line { position:absolute; top:0; left:100%; right:0; border-top:1px solid var(--border,#30363d); width:9999px; pointer-events:none; }
        .gc-tg-cols { flex:1; display:flex; position:relative; }
        .gc-tg-col { flex:1; position:relative; border-right:1px solid var(--border,#30363d); min-height:${24*48}px; }
        .gc-tg-col:last-child { border-right:none; }
        .gc-tg-col--today { background:rgba(63,185,80,0.02); }
        .gc-tg-event { position:absolute; left:2px; right:2px; border-radius:4px; padding:3px 5px; font-size:11px; cursor:pointer; overflow:hidden; transition:filter .1s; z-index:1; }
        .gc-tg-event:hover { filter:brightness(1.15); z-index:2; }
        .gc-tg-event--blocked { background:var(--hov,#2d333b)!important; color:var(--muted,#8b949e)!important; border-left:2px solid var(--muted,#8b949e)!important; cursor:default; font-size:10px; }
        .gc-tg-event-name { font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .gc-tg-event-time { font-size:10px; opacity:0.8; }
        .gc-now-line { position:absolute; left:0; right:0; z-index:10; display:flex; align-items:center; pointer-events:none; }
        .gc-now-dot { width:10px; height:10px; border-radius:50%; background:var(--accent,#3fb950); flex-shrink:0; margin-left:-5px; }
        .gc-now-bar { flex:1; height:2px; background:var(--accent,#3fb950); }

        /* ── popup ── */
        .gc-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.6); z-index:300; display:flex; align-items:center; justify-content:center; padding:16px; }
        .gc-popup { background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:14px; width:100%; max-width:360px; max-height:80vh; overflow-y:auto; box-shadow:0 16px 48px rgba(0,0,0,0.4); }
        .gc-popup-hd { display:flex; align-items:center; justify-content:space-between; padding:16px 18px 12px; border-bottom:1px solid var(--border,#30363d); }
        .gc-popup-title { font-size:0.9rem; font-weight:700; color:var(--text,#e6edf3); }
        .gc-close-btn { background:none; border:1px solid var(--border,#30363d); border-radius:6px; padding:3px 9px; cursor:pointer; color:var(--muted,#8b949e); font-size:13px; font-family:inherit; }
        .gc-close-btn:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .gc-popup-body { padding:12px 16px; display:flex; flex-direction:column; gap:6px; }
        .gc-popup-item { display:flex; align-items:flex-start; gap:10px; padding:9px 10px; border-radius:8px; cursor:pointer; transition:background .1s; }
        .gc-popup-item:hover { background:var(--hov,#2d333b); }
        .gc-popup-dot { width:9px; height:9px; border-radius:50%; flex-shrink:0; margin-top:4px; }
        .gc-popup-name { font-size:0.85rem; font-weight:600; color:var(--text,#e6edf3); }
        .gc-popup-meta { font-size:0.75rem; color:var(--muted,#8b949e); margin-top:1px; }

        /* ── responsive ── */
        @media(max-width:640px){
          .gc-month-cell { min-height:60px; padding:3px 2px; }
          .gc-event { font-size:9px; padding:1px 3px; }
          .gc-day-num { font-size:10px; width:18px; height:18px; }
          .gc-toolbar { padding:8px 10px; }
          .gc-header-label { font-size:0.85rem; }
          .gc-view-btn { padding:5px 9px; font-size:11px; }
          .gc-tg-body { max-height:420px; }
          .gc-tg-hour-row { height:36px; }
        }
      `}</style>

      <div className="gc-wrap">
        {/* toolbar */}
        <div className="gc-toolbar">
          <div className="gc-toolbar-left">
            <button className="gc-today-btn" onClick={goToday}>Today</button>
            <button className="gc-nav-btn" onClick={goPrev}>‹</button>
            <button className="gc-nav-btn" onClick={goNext}>›</button>
            <span className="gc-header-label">{headerLabel}</span>
            <span className="gc-live-dot">● LIVE</span>
          </div>
          <div className="gc-view-switcher">
            {(["day","week","month"] as CalView[]).map(v => (
              <button key={v} className={`gc-view-btn${view===v?" gc-view-btn--active":""}`}
                onClick={() => setView(v)}>
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* views */}
        {view === "month" && <MonthView />}
        {view === "week"  && <TimeGrid days={weekDays} />}
        {view === "day"   && <TimeGrid days={dayDays} />}
      </div>
    </>
  );
}