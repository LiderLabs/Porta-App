import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";

type Range = "7d" | "30d" | "90d";

export function AnalyticsPage() {
  const [range, setRange] = useState<Range>("7d");
  const visitors = useQuery(api.visitors.list);

  const rangeDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const rangeMs   = rangeDays * 24 * 60 * 60 * 1000;
  const now       = Date.now();
  const cutoff    = now - rangeMs;

  const inRange = (visitors ?? []).filter((v: any) => v.checkInTime >= cutoff);

  const totalVisits   = inRange.length;
  const uniqueNames   = new Set(inRange.map((v: any) => v.email || v.fullName)).size;
  const dailyAvg      = totalVisits > 0 ? (totalVisits / rangeDays).toFixed(1) : "0";

  // Group by day for sparkline data
  const dayMap: Record<string, number> = {};
  for (let i = rangeDays - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    dayMap[key] = 0;
  }
  inRange.forEach((v: any) => {
    const key = new Date(v.checkInTime).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (key in dayMap) dayMap[key]++;
  });

  const days    = Object.keys(dayMap);
  const counts  = Object.values(dayMap);
  const maxCount = Math.max(...counts, 1);

  // Busiest day and peak hour
  let busiestDay = "—";
  let busiestDayCount = 0;
  let peakHour = "—";
  const hourMap: Record<number, number> = {};

  inRange.forEach((v: any) => {
    const d = new Date(v.checkInTime);
    const dayKey = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    const h = d.getHours();
    hourMap[h] = (hourMap[h] ?? 0) + 1;
    if (dayMap[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })] > busiestDayCount) {
      busiestDayCount = dayMap[d.toLocaleDateString("en-US", { month: "short", day: "numeric" })];
      busiestDay = dayKey;
    }
  });

  if (Object.keys(hourMap).length > 0) {
    const peakH = parseInt(Object.entries(hourMap).sort((a,b)=>b[1]-a[1])[0][0]);
    const suffix = peakH >= 12 ? "PM" : "AM";
    const h12    = peakH % 12 || 12;
    peakHour = `${h12}:00 ${suffix}`;
  }

  // Purpose breakdown
  const purposeMap: Record<string, number> = {};
  inRange.forEach((v: any) => { if (v.purpose) purposeMap[v.purpose] = (purposeMap[v.purpose] ?? 0) + 1; });
  const topPurposes = Object.entries(purposeMap).sort((a,b)=>b[1]-a[1]).slice(0, 5);

  // SVG bar chart dims
  // chart layout vars reserved for future SVG render

  const stats = [
    { label: "Total visits",     value: totalVisits, sub: `Last ${rangeDays} days` },
    { label: "Unique visitors",  value: uniqueNames, sub: "by name / email" },
    { label: "Daily average",    value: dailyAvg,    sub: "visits per day" },
    { label: "Busiest day",      value: busiestDay,  sub: `${busiestDayCount} visits` },
    { label: "Peak hour",        value: peakHour,    sub: `${hourMap[parseInt(peakHour)] ?? 0} visits` },
  ];

  return (
    <>
      <style>{`
        .an-page { padding: 0; }
        .an-header { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:24px; gap:16px; flex-wrap:wrap; }
        .an-title { font-size:1.4rem; font-weight:700; color:var(--text,#e6edf3); margin-bottom:4px; }
        .an-subtitle { font-size:0.85rem; color:var(--muted,#8b949e); }
        .an-header-right { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
        .an-range-btns { display:flex; gap:4px; }
        .an-range-btn { padding:6px 14px; border:1px solid var(--border,#30363d); border-radius:8px; background:transparent; font-size:0.8rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; }
        .an-range-btn:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .an-range-btn--on { background:var(--accent-bg,rgba(63,185,80,0.12)); color:var(--accent,#3fb950); border-color:transparent; }
        .an-export-btn { padding:6px 14px; border:1px solid var(--border,#30363d); border-radius:8px; background:transparent; font-size:0.8rem; font-weight:600; color:var(--muted,#8b949e); cursor:pointer; font-family:inherit; display:flex; align-items:center; gap:6px; }
        .an-export-btn:hover { background:var(--hov,#2d333b); color:var(--text,#e6edf3); }
        .an-stat-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(160px,1fr)); gap:12px; margin-bottom:20px; }
        .an-stat { background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; padding:18px 20px; }
        .an-stat-label { font-size:0.72rem; font-weight:600; text-transform:uppercase; letter-spacing:.05em; color:var(--muted,#8b949e); margin-bottom:8px; }
        .an-stat-value { font-size:1.6rem; font-weight:800; color:var(--text,#e6edf3); line-height:1; word-break:break-word; }
        .an-stat-sub { font-size:0.72rem; color:var(--muted,#8b949e); margin-top:5px; }
        .an-card { background:var(--surface,#161b22); border:1px solid var(--border,#30363d); border-radius:12px; padding:20px 24px; margin-bottom:16px; }
        .an-card-title { font-size:0.85rem; font-weight:700; color:var(--text,#e6edf3); margin-bottom:16px; }
        .an-chart-wrap { overflow-x:auto; }
        .an-chart-svg { display:block; }
        .an-chart-x { display:flex; justify-content:space-between; padding:6px 20px 0; }
        .an-chart-x-label { font-size:10px; color:var(--muted,#8b949e); text-align:center; white-space:nowrap; flex:1; }
        .an-purpose-row { display:flex; align-items:center; gap:12px; margin-bottom:10px; }
        .an-purpose-row:last-child { margin-bottom:0; }
        .an-purpose-label { font-size:0.82rem; color:var(--text,#e6edf3); width:120px; flex-shrink:0; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
        .an-purpose-bar-wrap { flex:1; background:var(--hov,#2d333b); border-radius:4px; height:8px; overflow:hidden; }
        .an-purpose-bar { height:100%; background:var(--accent,#3fb950); border-radius:4px; transition:width .3s; }
        .an-purpose-count { font-size:0.78rem; font-weight:600; color:var(--muted,#8b949e); width:28px; text-align:right; flex-shrink:0; }
        .an-empty { color:var(--muted,#8b949e); font-size:0.875rem; padding:20px 0; text-align:center; }
        .an-day-list { display:flex; flex-direction:column; gap:6px; }
        .an-day-row { display:flex; align-items:center; gap:12px; }
        .an-day-label { font-size:0.8rem; color:var(--muted,#8b949e); width:100px; flex-shrink:0; }
        .an-day-bar-wrap { flex:1; background:var(--hov,#2d333b); border-radius:4px; height:10px; overflow:hidden; }
        .an-day-bar { height:100%; background:var(--accent,#3fb950); border-radius:4px; }
        .an-day-count { font-size:0.78rem; font-weight:600; color:var(--text,#e6edf3); width:24px; text-align:right; flex-shrink:0; }
      `}</style>
      <div className="an-page">
        <div className="an-header">
          <div>
            <h1 className="an-title">Analytics</h1>
            <p className="an-subtitle">Visitor trends and insights for your workspace</p>
          </div>
          <div className="an-header-right">
            <div className="an-range-btns">
              {(["7d","30d","90d"] as Range[]).map(r => (
                <button key={r} className={`an-range-btn${range===r?" an-range-btn--on":""}`} onClick={()=>setRange(r)}>
                  {r === "7d" ? "7 days" : r === "30d" ? "30 days" : "90 days"}
                </button>
              ))}
            </div>
            <button className="an-export-btn">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Export
            </button>
          </div>
        </div>

        {/* Stat cards */}
        <div className="an-stat-grid">
          {stats.map(s => (
            <div key={s.label} className="an-stat">
              <div className="an-stat-label">{s.label}</div>
              <div className="an-stat-value">{s.value}</div>
              <div className="an-stat-sub">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Daily visits chart */}
        <div className="an-card">
          <div className="an-card-title">Daily visits — last {rangeDays} days</div>
          {totalVisits === 0 ? (
            <div className="an-empty">No visit data for this period.</div>
          ) : (
            <div className="an-day-list">
              {days.slice(-14).map((day, i) => (
                <div key={day} className="an-day-row">
                  <span className="an-day-label">{day}</span>
                  <div className="an-day-bar-wrap">
                    <div className="an-day-bar" style={{width:`${(counts[days.length-14+i] / maxCount)*100}%`}} />
                  </div>
                  <span className="an-day-count">{counts[days.length-14+i]}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Purpose breakdown */}
        <div className="an-card">
          <div className="an-card-title">Visit purposes</div>
          {topPurposes.length === 0 ? (
            <div className="an-empty">No purpose data for this period.</div>
          ) : (
            topPurposes.map(([purpose, count]) => (
              <div key={purpose} className="an-purpose-row">
                <span className="an-purpose-label">{purpose}</span>
                <div className="an-purpose-bar-wrap">
                  <div className="an-purpose-bar" style={{width:`${(count / topPurposes[0][1]) * 100}%`}} />
                </div>
                <span className="an-purpose-count">{count}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}