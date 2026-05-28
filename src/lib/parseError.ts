export function parseError(err: unknown): string {
  const raw = (err as any)?.message ?? (err as any)?.data?.message ?? String(err);

  // Strip Convex technical prefix
  const cleaned = raw
    .replace(/^Uncaught Error:\s*/i, "")
    .replace(/^Error:\s*/i, "")
    .replace(/Called by client[\s\S]*?:\s*/i, "")
    .replace(/\[Request ID:[^\]]+\]/g, "")
    .trim();

  // Map known technical messages to friendly ones
  const map: Record<string, string> = {
    "duplicate invitation": "An invite was already sent to this email. Revoke the existing invite first.",
    "no clerk account found": "This staff member hasn't accepted their invite yet.",
    "missing clerk_secret_key": "Server configuration error. Contact support.",
    "failed to send clerk invite": "Could not send invite. Please try again.",
    "invite already used or revoked": "This invite has already been used or revoked.",
    "invite expired": "This invite has expired. Please request a new one.",
    "invalid invite": "Invalid invite link.",
  };

  const lower = cleaned.toLowerCase();
  for (const [key, friendly] of Object.entries(map)) {
    if (lower.includes(key)) return friendly;
  }

  return cleaned || "Something went wrong. Please try again.";
}
