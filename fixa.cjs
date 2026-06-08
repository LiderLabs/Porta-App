const fs = require("fs");
const path = "C:/Users/user/Desktop/porta-app/src/features/reception/pages/SchedulingPage.tsx";
let lines = fs.readFileSync(path, "utf8").split("\n");

// Find the comment line "badge printer" and remove from there to the closing }
const start = lines.findIndex(l => l.includes("badge printer"));
const end = lines.findIndex((l, i) => i > start && l.trim() === "}");
if (start !== -1 && end !== -1) {
  lines.splice(start, end - start + 1);
  console.log("removed lines", start+1, "to", end+1);
} else { console.log("not found", start, end); }

fs.writeFileSync(path, lines.join("\n"), "utf8");
