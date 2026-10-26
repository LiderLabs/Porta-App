import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { STATUS_LABEL, STATUS_TONE, normStatus } from "./lib";

export function StatusBadge({ status }: { status: string }) {
  const n = normStatus(status);
  return <span className={`rc-badge rc-badge--${STATUS_TONE[n] ?? "grey"}`}>{STATUS_LABEL[n] ?? status}</span>;
}

/** A button that asks for a second click before doing something hard to undo. */
export function ConfirmButton({
  children, confirmLabel = "Confirm", onConfirm, disabled, className = "",
}: { children: ReactNode; confirmLabel?: string; onConfirm: () => void; disabled?: boolean; className?: string }) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <button
      type="button"
      disabled={disabled}
      className={`rc-btn rc-btn--sm ${armed ? "rc-btn--armed" : "rc-btn--danger"} ${className}`}
      onClick={() => {
        if (armed) { clearTimeout(timer.current); setArmed(false); onConfirm(); return; }
        setArmed(true);
        timer.current = setTimeout(() => setArmed(false), 3500);
      }}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}

export function Modal({ title, onClose, children, footer }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="rc-overlay" onClick={onClose}>
      <div className="rc rc-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
        <div className="rc-modal-head">
          <div style={{ minWidth: 0 }}>{title}</div>
          <button type="button" className="rc-btn rc-btn--quiet rc-btn--sm" onClick={onClose}>Close</button>
        </div>
        <div className="rc-modal-body">{children}</div>
        {footer ? <div className="rc-modal-foot">{footer}</div> : null}
      </div>
    </div>
  );
}
