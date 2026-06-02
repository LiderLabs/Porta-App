import * as React from "react";
import { useState } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

const STATUS_COLOR: Record<string,string> = {
  pending:"#e3b341", approved:"#58a6ff", accepted:"#58a6ff",
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

function isPast(ts: number) { return ts < Date.now() - 60000; }

export function LiveCalendar({ visits, blockedSlots=[], onSelectVisit, title }: {
  visits:any[]; blockedSlots?:any[]; onSelectVisit:(v:any)=>void; title?:string;
}) {
  const [cur, setCur] = useState(new Date());
  const [dayPopup, setDayPopup] = useState<{day:number;visits:any[]}|null>(null);
  const year=cur.getFullYear(), month=cur.getMonth();
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const cells=[...Array(firstDay).fill(null),...Array.from({length:daysInMonth},(_,i)=>i+1)];
  const today=new Date();
  const vByDay:Record<number,any[]>={};
  visits.forEach((v:any)=>{
    const d=new Date(v.scheduledDate);
    if(d.getFullYear()===year&&d.getMonth()===month){const day=d.getDate();vByDay[day]=[...(vByDay[day]??[]),v];}
  });
  const bByDay:Record<number,any[]>={};
  blockedSlots.forEach((b:any)=>{
    const d=new Date(b.startTime);
    if(d.getFullYear()===year&&d.getMonth()===month){const day=d.getDate();bByDay[day]=[...(bByDay[day]??[]),b];}
  });
  return (<>
    <style>{`
      .lc-wrap{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:14px;overflow:hidden}
      .lc-nav{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;border-bottom:1px solid var(--border,#30363d)}
      .lc-title{font-size:1rem;font-weight:700;color:var(--text,#e6edf3)}
      .lc-nav-btn{background:none;border:1px solid var(--border,#30363d);border-radius:8px;padding:5px 12px;color:var(--muted,#8b949e);cursor:pointer;font-size:16px}
      .lc-nav-btn:hover{background:var(--hov,#2d333b);color:var(--text,#e6edf3)}
      .lc-live{font-size:0.68rem;font-weight:700;color:var(--accent,#3fb950);letter-spacing:0.08em}
      .lc-grid{display:grid;grid-template-columns:repeat(7,1fr)}
      .lc-day-hdr{padding:8px 0;text-align:center;font-size:11px;font-weight:700;color:var(--muted,#8b949e);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--border,#30363d)}
      .lc-cell{min-height:90px;border-right:1px solid var(--border,#30363d);border-bottom:1px solid var(--border,#30363d);padding:6px 5px;transition:background .1s}
      .lc-cell:nth-child(7n){border-right:none}
      .lc-cell:hover{background:var(--hov,#2d333b)}
      .lc-cell--today{background:rgba(63,185,80,0.04)}
      .lc-day-num{font-size:11px;font-weight:600;color:var(--muted,#8b949e);margin-bottom:3px;display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px}
      .lc-cell--today .lc-day-num{background:var(--accent,#3fb950);color:#fff;border-radius:50%;font-weight:700}
      .lc-events{display:flex;flex-direction:column;gap:2px}
      .lc-event{font-size:11px;font-weight:600;padding:2px 5px;border-radius:4px;cursor:pointer;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:filter .1s}
      .lc-event:hover{filter:brightness(1.2)}
      .lc-event--past{opacity:0.5}
      .lc-event--blocked{background:var(--hov,#2d333b)!important;color:var(--muted,#8b949e)!important;cursor:default;font-size:10px}
      .lc-more{font-size:10px;color:var(--accent,#3fb950);padding:1px 4px;cursor:pointer;font-weight:600}
      .lc-more:hover{text-decoration:underline}
      .lc-modal-bg{position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:300;display:flex;align-items:center;justify-content:center;padding:16px}
      .lc-modal{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:14px;width:100%;max-width:420px;max-height:90vh;overflow-y:auto}
      .lc-modal-hd{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid var(--border,#30363d)}
      .lc-modal-title{font-size:0.95rem;font-weight:700;color:var(--text,#e6edf3)}
      .lc-modal-close{background:none;border:1px solid var(--border,#30363d);border-radius:6px;padding:3px 8px;cursor:pointer;color:var(--muted,#8b949e);font-size:14px;font-family:inherit}
      .lc-modal-close:hover{background:var(--hov,#2d333b);color:var(--text,#e6edf3)}
      .lc-modal-body{padding:20px;display:flex;flex-direction:column;gap:8px}
      .lc-avatar{width:52px;height:52px;border-radius:50%;background:var(--accent,#3fb950);color:#fff;font-weight:700;font-size:20px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px}
      .lc-vname{font-weight:700;font-size:1rem;color:var(--text,#e6edf3);text-align:center}
      .lc-fields{display:flex;flex-direction:column;gap:8px;margin-top:12px}
      .lc-field{display:flex;flex-direction:column;gap:2px}
      .lc-field-lbl{font-size:0.7rem;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:var(--muted,#8b949e)}
      .lc-field-val{font-size:0.82rem;color:var(--text,#e6edf3)}
      .lc-daypop-bg{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:299;display:flex;align-items:center;justify-content:center;padding:16px}
      .lc-daypop{background:var(--surface,#161b22);border:1px solid var(--border,#30363d);border-radius:12px;width:100%;max-width:300px;max-height:80vh;overflow-y:auto;padding:16px}
      .lc-daypop-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
      .lc-daypop-title{font-size:0.9rem;font-weight:700;color:var(--text,#e6edf3)}
      .lc-daypop-item{display:flex;align-items:center;gap:10px;padding:9px 10px;border-radius:8px;cursor:pointer;transition:background .1s;margin-bottom:4px}
      .lc-daypop-item:hover{background:var(--hov,#2d333b)}
      .lc-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
      .lc-dpname{font-size:0.83rem;font-weight:600;color:var(--text,#e6edf3)}
      .lc-dptime{font-size:0.72rem;color:var(--muted,#8b949e)}
      @media(max-width:640px){
        .lc-cell{min-height:52px;padding:3px 2px}
        .lc-event{font-size:9px;padding:1px 3px}
        .lc-day-num{font-size:10px;width:16px;height:16px}
        .lc-nav{padding:10px 12px}
        .lc-title{font-size:0.88rem}
      }
    `}</style>
    <div className="lc-wrap">
      <div className="lc-nav">
        <button className="lc-nav-btn" onClick={()=>setCur(new Date(year,month-1,1))}>&#8249;</button>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <span className="lc-title">{title?`${title} · `:""}{MONTHS[month]} {year}</span>
          <span className="lc-live">&#9679; LIVE</span>
        </div>
        <button className="lc-nav-btn" onClick={()=>setCur(new Date(year,month+1,1))}>&#8250;</button>
      </div>
      <div className="lc-grid">
        {DAYS.map(d=><div key={d} className="lc-day-hdr">{d}</div>)}
        {cells.map((day,i)=>{
          const isToday=day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
          const dv=vByDay[day]??[], db=bByDay[day]??[];
          const visible=dv.slice(0,2), extra=dv.length-2;
          return (
            <div key={i} className={`lc-cell${isToday?" lc-cell--today":""}`}>
              {day&&(<>
                <span className="lc-day-num">{day}</span>
                <div className="lc-events">
                  {db.slice(0,1).map((b:any)=>(
                    <div key={b._id} className="lc-event lc-event--blocked">&#128274; {b.staffName?.split(" ")[0]??"Blocked"}</div>
                  ))}
                  {visible.map((v:any)=>{
                    const past=isPast(v.scheduledDate);
                    const col=past?"#6b7280":(STATUS_COLOR[v.status]??"#6b7280");
                    return (
                      <div key={v._id} className={`lc-event${past?" lc-event--past":""}`}
                        style={{background:col+"28",color:col,border:`1px solid ${col}44`}}
                        onClick={()=>onSelectVisit(v)}
                        title={`${v.visitorName} — ${STATUS_LABEL[v.status]??v.status}${past?" (past)":""}`}>
                        {(v.visitorName??"Visitor").split(" ")[0]}
                      </div>
                    );
                  })}
                  {extra>0&&<div className="lc-more" onClick={()=>setDayPopup({day,visits:dv})}>+{extra} more</div>}
                </div>
              </>)}
            </div>
          );
        })}
      </div>
    </div>
    {dayPopup&&(
      <div className="lc-daypop-bg" onClick={()=>setDayPopup(null)}>
        <div className="lc-daypop" onClick={e=>e.stopPropagation()}>
          <div className="lc-daypop-hd">
            <span className="lc-daypop-title">{MONTHS[month]} {dayPopup.day} &mdash; {dayPopup.visits.length} visits</span>
            <button className="lc-modal-close" onClick={()=>setDayPopup(null)}>&#x2715;</button>
          </div>
          {dayPopup.visits.map((v:any)=>{
            const past=isPast(v.scheduledDate);
            const col=past?"#6b7280":(STATUS_COLOR[v.status]??"#6b7280");
            return (
              <div key={v._id} className="lc-daypop-item" onClick={()=>{setDayPopup(null);onSelectVisit(v);}}>
                <div className="lc-dot" style={{background:col}}/>
                <div>
                  <div className="lc-dpname">{v.visitorName}</div>
                  <div className="lc-dptime">
                    {new Date(v.scheduledDate).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}
                    {" · "}{STATUS_LABEL[v.status]??v.status}{past?" · Past":""}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    )}
  </>);
}
