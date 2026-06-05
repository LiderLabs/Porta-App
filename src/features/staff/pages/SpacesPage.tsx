import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/clerk-react";

function timeLabel(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function todayRange() {
  const d = new Date();
  const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return { start, end: start + 24 * 60 * 60 * 1000 };
}

export function SpacesPage() {
  const { user } = useUser();
  const staffRecord = useQuery(api.staff.getByClerkId, user?.id ? { clerkUserId: user.id } : "skip");
  const orgId = (staffRecord?.orgId ?? (user?.publicMetadata as any)?.orgId) as string | undefined;
  const rooms = useQuery(api.rooms.listActive, orgId ? { orgId } : "skip");
  const allVisits = useQuery(api.scheduling.listByOrg, orgId ? { orgId } : "skip");
  const now = Date.now();
  const { start: dayStart, end: dayEnd } = todayRange();

  if (staffRecord === undefined) {
    return <div style={{ padding: "32px", color: "var(--muted, #8b949e)", fontFamily: "inherit" }}>Loading...</div>;
  }

  if (!orgId || rooms === undefined) {
    return <div style={{ padding: "32px", color: "var(--muted, #8b949e)", fontFamily: "inherit" }}>Unable to load rooms. Please refresh.</div>;
  }

  if (rooms.length === 0) {
    return (
      <div style={{ padding: "32px" }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text, #e6edf3)", marginBottom: 8 }}>Room Availability</h2>
        <p style={{ color: "var(--muted, #8b949e)", fontSize: 14 }}>No active rooms have been set up yet. Ask your admin to add rooms.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "24px 28px", maxWidth: 900, fontFamily: "inherit" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: "var(--text, #e6edf3)", margin: 0 }}>Room Availability</h2>
        <p style={{ fontSize: 13, color: "var(--muted, #8b949e)", marginTop: 4 }}>
          Live room availability · {new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rooms.map((room: any) => {
          const roomVisits = (allVisits ?? []).filter((v: any) =>
            v.roomId === room._id &&
            v.scheduledDate >= dayStart &&
            v.scheduledDate < dayEnd &&
            !["cancelled", "no_show", "rejected"].includes(v.status)
          ).sort((a: any, b: any) => a.scheduledDate - b.scheduledDate);

          const current = roomVisits.find((v: any) => {
            const end = v.scheduledDate + (v.duration ?? 60) * 60 * 1000;
            return v.scheduledDate <= now && end > now;
          });

          const next = roomVisits.find((v: any) => v.scheduledDate > now);
          const isOccupied = !!current;
          const statusColor = isOccupied ? "#f85149" : "#3fb950";
          const statusBg = isOccupied ? "rgba(248,81,73,0.1)" : "rgba(63,185,80,0.1)";

          let nextFreeLabel = "";
          if (isOccupied && current) {
            nextFreeLabel = `Free at ${timeLabel(current.scheduledDate + (current.duration ?? 60) * 60 * 1000)}`;
          } else if (next) {
            nextFreeLabel = `Next booking at ${timeLabel(next.scheduledDate)}`;
          } else {
            nextFreeLabel = "Free for the rest of the day";
          }

          return (
            <div key={room._id} style={{
              background: "var(--surface, #161b22)",
              border: "1px solid var(--border, #30363d)",
              borderRadius: 12,
              padding: "18px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text, #e6edf3)" }}>{room.name}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 10px", borderRadius: 20, background: statusBg, color: statusColor, display: "flex", alignItems: "center", gap: 5 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: statusColor, display: "inline-block" }} />
                      {isOccupied ? "Occupied" : "Available"}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted, #8b949e)", marginTop: 3, display: "flex", gap: 12 }}>
                    {room.floor && <span>Floor {room.floor}</span>}
                    {room.capacity && <span>· Capacity {room.capacity}</span>}
                    {room.amenities?.length > 0 && <span>· {room.amenities.join(", ")}</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: isOccupied ? "#f59e0b" : "var(--muted, #8b949e)", textAlign: "right", flexShrink: 0 }}>
                  {nextFreeLabel}
                </div>
              </div>

              {current && (
                <div style={{ background: "rgba(248,81,73,0.08)", border: "1px solid rgba(248,81,73,0.2)", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f85149" }}>In use now</div>
                    <div style={{ fontSize: 13, color: "var(--text, #e6edf3)", marginTop: 2 }}>
                      {current.visitorName}
                      {current.purpose && <span style={{ color: "var(--muted, #8b949e)" }}> · {current.purpose}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: "var(--muted, #8b949e)", flexShrink: 0, marginLeft: 12 }}>
                    {timeLabel(current.scheduledDate)} – {timeLabel(current.scheduledDate + (current.duration ?? 60) * 60 * 1000)}
                  </div>
                </div>
              )}

              {roomVisits.length > 0 ? (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #8b949e)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                    Today's bookings ({roomVisits.length})
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {roomVisits.map((v: any) => {
                      const endTs = v.scheduledDate + (v.duration ?? 60) * 60 * 1000;
                      const isPast = endTs < now;
                      const isNow = v.scheduledDate <= now && endTs > now;
                      return (
                        <div key={v._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "7px 12px", borderRadius: 7, background: isNow ? "rgba(63,185,80,0.07)" : "var(--hov, #21262d)", border: `1px solid ${isNow ? "rgba(63,185,80,0.2)" : "transparent"}`, opacity: isPast ? 0.5 : 1 }}>
                          <div style={{ fontSize: 11, color: "var(--muted, #8b949e)", flexShrink: 0, width: 96 }}>
                            {timeLabel(v.scheduledDate)} – {timeLabel(endTs)}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <span style={{ fontSize: 13, color: "var(--text, #e6edf3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>{v.visitorName}</span>
                            {v.purpose && <span style={{ fontSize: 11, color: "var(--muted, #8b949e)" }}>{v.purpose}</span>}
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12, background: isNow ? "rgba(63,185,80,0.15)" : isPast ? "rgba(139,148,158,0.1)" : "rgba(56,189,248,0.1)", color: isNow ? "#3fb950" : isPast ? "#8b949e" : "#38bdf8", flexShrink: 0 }}>
                            {isNow ? "Now" : isPast ? "Done" : "Upcoming"}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div style={{ fontSize: 13, color: "var(--muted, #8b949e)", fontStyle: "italic" }}>No bookings scheduled for today</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}