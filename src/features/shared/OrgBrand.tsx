import { useEffect, useState } from "react";

/** Company logo with the company name as the fallback (no logo set, or the image fails to load). */
export function OrgBrand({ logoUrl, name, height = 28, className, style }: {
  logoUrl?: string | null; name: string; height?: number; className?: string; style?: React.CSSProperties;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [logoUrl]);

  if (logoUrl && !failed) {
    return (
      <img
        src={logoUrl}
        alt={name}
        title={name}
        onError={() => setFailed(true)}
        className={className}
        style={{ height, maxWidth: 180, width: "auto", objectFit: "contain", display: "block", ...style }}
      />
    );
  }
  return (
    <span className={className} style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)", letterSpacing: "-0.01em", maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", ...style }}>
      {name}
    </span>
  );
}
