import { useState } from "react";

// ── phone normalizer (Ghana 233 format) ───────────────────────────────────
function normalizeGhanaPhone(raw: string): { digits: string; valid: boolean } {
  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("2330")) digits = "233" + digits.slice(4);
  if (digits.startsWith("0")) digits = "233" + digits.slice(1);
  if (digits.length === 9) digits = "233" + digits;
  return { digits, valid: digits.length === 12 };
}

// ── message templates ─────────────────────────────────────────────────────
export type NotifyTemplate =
  | "approved"
  | "rejected"
  | "rescheduled"
  | "visitor_arrived"
  | "visitor_late"
  | "visitor_noshow"
  | "custom";

function buildMessage(template: NotifyTemplate, data: NotifyData): string {
  const time = data.scheduledDate
    ? new Date(data.scheduledDate).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";
  const date = data.scheduledDate
    ? new Date(data.scheduledDate).toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })
    : "";
  const orgName = data.orgName ?? "our office";

  switch (template) {
    case "approved":
      return `Hello ${data.visitorName},\n\nYour visit to ${orgName} has been *approved* ✅\n\n📅 ${date}\n⏰ ${time}${data.hostName ? `\n👤 Host: ${data.hostName}` : ""}${data.room ? `\n🚪 Room: ${data.room}` : ""}\n\nPlease arrive *at least 10 minutes early* and report to reception.\n\nThank you.`;

    case "rejected":
      return `Hello ${data.visitorName},\n\nWe regret to inform you that your visit request to ${orgName} on *${date}* at *${time}* could not be approved at this time.\n\nPlease contact us to reschedule or for more information.\n\nThank you for your understanding.`;

    case "rescheduled":
      return `Hello ${data.visitorName},\n\nYour visit to ${orgName} has been *rescheduled* 📅\n\n📅 New date: ${date}\n⏰ New time: ${time}${data.hostName ? `\n👤 Host: ${data.hostName}` : ""}\n\nPlease confirm if this works for you.\n\nThank you.`;

    case "visitor_arrived":
      return `Hi ${data.hostName ?? "there"},\n\n*${data.visitorName}* has arrived at reception for your *${time}* ${data.purpose ? `${data.purpose} ` : ""}meeting.${data.room ? `\n\n🚪 Room: ${data.room}` : ""}\n\nPlease come to reception or send directions. 🙏`;

    case "visitor_late":
      return `Hi ${data.hostName ?? "there"},\n\n*${data.visitorName}* is running late for your *${time}* meeting.\n\nDo you want to:\n• Proceed when they arrive\n• Reschedule\n• Cancel\n\nPlease advise.`;

    case "visitor_noshow":
      return `Hi ${data.hostName ?? "there"},\n\n*${data.visitorName}* did not show up for your *${time}* meeting today.\n\nWe have marked this as a no-show. Let us know if you'd like to reschedule.`;

    case "custom":
      return data.customMessage ?? "";

    default:
      return "";
  }
}

// ── types ─────────────────────────────────────────────────────────────────
export interface NotifyData {
  visitorName: string;
  visitorPhone?: string;
  visitorEmail?: string;
  hostName?: string;
  hostPhone?: string;
  scheduledDate?: number;
  purpose?: string;
  room?: string;
  orgName?: string;
  customMessage?: string;
}

interface NotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: NotifyTemplate;
  data: NotifyData;
  /** Who is being notified — visitor or host */
  target: "visitor" | "host";
  title?: string;
}

// ── modal ─────────────────────────────────────────────────────────────────
export function NotifyModal({ isOpen, onClose, template, data, target, title }: NotifyModalProps) {
  const [msg, setMsg] = useState(() => buildMessage(template, data));
  const [sent, setSent] = useState<"whatsapp" | "email" | null>(null);

  if (!isOpen) return null;

  const phone = target === "visitor" ? data.visitorPhone : data.hostPhone;
  const email = target === "visitor" ? data.visitorEmail : undefined;

  const sendWhatsApp = () => {
    if (!phone) return;
    const { digits, valid } = normalizeGhanaPhone(phone);
    if (!valid) { alert("Invalid phone number — cannot send WhatsApp"); return; }
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    setSent("whatsapp");
  };

  const sendEmail = () => {
    if (!email) return;
    const subject = encodeURIComponent(`Porta — Visit ${template === "approved" ? "Approved" : template === "rejected" ? "Update" : "Update"}`);
    const body = encodeURIComponent(msg.replace(/\*/g, ""));
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, "_blank");
    setSent("email");
  };

  const hasWhatsApp = !!phone;
  const hasEmail = !!email;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--surface, #21262d)",
          border: "1px solid var(--border, #30363d)",
          borderRadius: 16, width: "100%", maxWidth: 480,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 20px 14px",
          borderBottom: "1px solid var(--border, #30363d)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "rgba(63,185,80,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3fb950" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </div>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text, #e6edf3)" }}>
              {title ?? "Send notification"}
            </span>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: "none", cursor: "pointer",
            color: "var(--muted, #8b949e)", fontSize: 18, lineHeight: 1, padding: "2px 6px",
          }}>✕</button>
        </div>

        {/* recipient info */}
        <div style={{ padding: "14px 20px 0" }}>
          <div style={{
            background: "var(--bg, #0d1117)",
            border: "1px solid var(--border, #30363d)",
            borderRadius: 10, padding: "10px 14px",
            display: "flex", alignItems: "center", gap: 12,
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "var(--accent-bg, rgba(63,185,80,0.12))",
              color: "var(--accent, #3fb950)",
              fontWeight: 700, fontSize: 15,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              {(target === "visitor" ? data.visitorName : data.hostName ?? "H")[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text, #e6edf3)" }}>
                {target === "visitor" ? data.visitorName : data.hostName}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted, #8b949e)", marginTop: 2 }}>
                {phone && <span>📱 {phone}</span>}
                {phone && email && <span style={{ margin: "0 6px" }}>·</span>}
                {email && <span>✉️ {email}</span>}
                {!phone && !email && <span style={{ color: "var(--red, #f85149)" }}>No contact info available</span>}
              </div>
            </div>
          </div>
        </div>

        {/* message editor */}
        <div style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted, #8b949e)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
            Message
          </div>
          <textarea
            value={msg}
            onChange={e => setMsg(e.target.value)}
            rows={8}
            style={{
              width: "100%", boxSizing: "border-box",
              background: "var(--bg, #0d1117)",
              border: "1px solid var(--border, #30363d)",
              borderRadius: 10, padding: "12px 14px",
              color: "var(--text, #e6edf3)",
              fontSize: 13, lineHeight: 1.6,
              fontFamily: "inherit", resize: "vertical",
              outline: "none",
            }}
          />
          <div style={{ fontSize: 11, color: "var(--muted, #8b949e)", marginTop: 6 }}>
            You can edit the message before sending. *text* renders as bold in WhatsApp.
          </div>
        </div>

        {/* sent confirmation */}
        {sent && (
          <div style={{
            margin: "0 20px 12px",
            background: "rgba(63,185,80,0.1)",
            border: "1px solid rgba(63,185,80,0.3)",
            borderRadius: 8, padding: "10px 14px",
            fontSize: 13, color: "#3fb950", fontWeight: 600,
          }}>
            ✓ {sent === "whatsapp" ? "WhatsApp opened — hit send in WhatsApp to deliver" : "Email client opened"}
          </div>
        )}

        {/* action buttons */}
        <div style={{
          padding: "0 20px 20px",
          display: "flex", gap: 8,
        }}>
          {hasWhatsApp && (
            <button onClick={sendWhatsApp} style={{
              flex: 1, padding: "11px 0",
              background: "#25d366", border: "none", borderRadius: 10,
              color: "#fff", fontWeight: 700, fontSize: 13,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              fontFamily: "inherit",
              transition: "opacity .15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              WhatsApp
            </button>
          )}
          {hasEmail && (
            <button onClick={sendEmail} style={{
              flex: 1, padding: "11px 0",
              background: "var(--blue, #58a6ff)", border: "none", borderRadius: 10,
              color: "#fff", fontWeight: 700, fontSize: 13,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              fontFamily: "inherit",
              transition: "opacity .15s",
            }}
              onMouseEnter={e => (e.currentTarget.style.opacity = ".85")}
              onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                <polyline points="22,6 12,13 2,6"/>
              </svg>
              Email
            </button>
          )}
          {!hasWhatsApp && !hasEmail && (
            <div style={{ flex: 1, textAlign: "center", fontSize: 13, color: "var(--muted, #8b949e)", padding: "11px 0" }}>
              No contact info — add phone or email to the visit record first.
            </div>
          )}
          <button onClick={onClose} style={{
            padding: "11px 16px",
            background: "none", border: "1px solid var(--border, #30363d)", borderRadius: 10,
            color: "var(--muted, #8b949e)", fontWeight: 600, fontSize: 13,
            cursor: "pointer", fontFamily: "inherit",
            transition: "background .12s",
          }}
            onMouseEnter={e => (e.currentTarget.style.background = "var(--hov, #21262d)")}
            onMouseLeave={e => (e.currentTarget.style.background = "none")}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}