// patch-porta-app.cjs
// Receptionist walk-in form: host search, and a clear note that the host is notified.
//
//   src/features/reception/pages/CheckInPage.tsx
//
// The walk-in still calls visitors.checkIn with the same arguments, so this is safe to ship
// before or after the backend patch. The host only gets the alert once the backend patch
// (patch-porta-backend.cjs) is deployed.
//
// Run from the porta-app repo root:
//   node patch-porta-app.cjs --check   (verify every anchor, change nothing)
//   node patch-porta-app.cjs           (apply)
//
// Handles CRLF/LF and a BOM. All-or-nothing: if any anchor is missing, nothing is written.

const fs = require("fs");
const path = require("path");

const CHECK_ONLY = process.argv.includes("--check");
const ROOT = process.cwd();
const count = (s, needle) => s.split(needle).length - 1;

const rel = path.join("src", "features", "reception", "pages", "CheckInPage.tsx");
const file = path.join(ROOT, rel);

const edits = [
  {
    name: "host search state",
    find: `  const [actioningId, setActioningId] = useState<string | null>(null);\n`,
    replace:
      `  const [actioningId, setActioningId] = useState<string | null>(null);\n` +
      `  const [hostQ, setHostQ]     = useState("");\n`,
  },
  {
    name: "clear host search after a walk-in",
    find: `      setForm({ fullName:"", phone:"", email:"", company:"", purpose:"", hostId:"", idType:"", idNumber:"" });\n`,
    replace:
      `      setForm({ fullName:"", phone:"", email:"", company:"", purpose:"", hostId:"", idType:"", idNumber:"" });\n` +
      `      setHostQ("");\n`,
  },
  {
    name: "banner text",
    find: `Walk-in — visitor will be immediately checked in`,
    replace: `Walk-in — visitor is checked in now and the host is notified`,
  },
  {
    name: "host field with search",
    find:
      `                    <div className="ci-field">\n` +
      `                      <label className="ci-field-label">Host</label>\n` +
      `                      <select className="ci-input" value={form.hostId} onChange={(e) => set("hostId", e.target.value)}>\n` +
      `                        <option value="">Select host...</option>\n` +
      `                        {staff?.map((s: any) => (\n` +
      `                          <option key={s._id} value={s._id}>{s.name}{s.department ? \` — \${s.department}\` : ""}</option>\n` +
      `                        ))}\n` +
      `                      </select>\n` +
      `                    </div>\n`,
    replace:
      `                    <div className="ci-field ci-field--full">\n` +
      `                      <label className="ci-field-label">Host</label>\n` +
      `                      <input className="ci-input" placeholder="Search by name or department..." value={hostQ} onChange={(e) => setHostQ(e.target.value)} />\n` +
      `                      <select className="ci-input" value={form.hostId} onChange={(e) => set("hostId", e.target.value)}>\n` +
      `                        <option value="">Select host...</option>\n` +
      `                        {(staff ?? [])\n` +
      `                          .filter((s: any) => {\n` +
      `                            const q = hostQ.trim().toLowerCase();\n` +
      `                            return !q || s._id === form.hostId || \`\${s.name ?? ""} \${s.department ?? ""}\`.toLowerCase().includes(q);\n` +
      `                          })\n` +
      `                          .map((s: any) => (\n` +
      `                            <option key={s._id} value={s._id}>{s.name}{s.department ? \` — \${s.department}\` : ""}</option>\n` +
      `                          ))}\n` +
      `                      </select>\n` +
      `                      <span style={{ fontSize: "0.75rem", color: "var(--muted,#8b949e)" }}>The host is emailed when you check the visitor in.</span>\n` +
      `                    </div>\n`,
  },
];

if (!fs.existsSync(file)) {
  console.error(`\n${rel} not found. Run this from the porta-app repo root.`);
  process.exit(1);
}

const raw = fs.readFileSync(file, "utf8");
const crlf = raw.includes("\r\n");
let out = raw.replace(/\r\n/g, "\n");
const problems = [];

for (const e of edits) {
  const n = count(out, e.find);
  if (n !== 1) {
    problems.push(`[${e.name}] anchor matched ${n} times (expected 1)`);
    continue;
  }
  out = out.replace(e.find, () => e.replace);
}

if (problems.length) {
  console.error("\nNothing was changed. Problems found in " + rel.replace(/\\/g, "/") + ":\n");
  for (const p of problems) console.error("  - " + p);
  console.error("\nEither the patch was already applied, or your local file differs from GitHub. If it is the second, send me the file.");
  process.exit(1);
}

if (CHECK_ONLY) {
  console.log("All anchors found. Nothing written (--check).");
  process.exit(0);
}

fs.writeFileSync(file, crlf ? out.replace(/\n/g, "\r\n") : out, "utf8");
console.log("patched " + rel.replace(/\\/g, "/"));
console.log("\nDone. Next: npm run build, then register a walk-in with a host and check the host's inbox.");
