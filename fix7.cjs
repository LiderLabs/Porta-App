const fs = require("fs");
const path = "C:/Users/user/Desktop/porta-app/src/features/reception/pages/SchedulingPage.tsx";
let lines = fs.readFileSync(path, "utf8").split("\n");

// Fix 1: remove lines 537-543 (0-indexed: 536-542) - the conditional wrapping a comment
// Find the line with the bad pattern
const i1 = lines.findIndex(l => l.includes("isAppt ? [\"checked_in\",\"in_meeting\"].includes(v.status) : true"));
if (i1 !== -1) {
  // Find the closing )} of this block
  let end1 = i1;
  for (let i = i1; i < i1 + 10; i++) {
    if (lines[i].trim() === ")}") { end1 = i; break; }
  }
  lines.splice(i1, end1 - i1 + 1);
  console.log("fix1 done at line", i1);
} else { console.log("fix1 not found"); }

// Fix 2: find and remove the checked_in/in_meeting/completed conditional wrapping a comment
const i2 = lines.findIndex(l => l.includes("checked_in\",\"in_meeting\",\"completed\"].includes(v.status) && ("));
if (i2 !== -1) {
  let end2 = i2;
  for (let i = i2; i < i2 + 5; i++) {
    if (lines[i].trim() === ")}") { end2 = i; break; }
  }
  lines.splice(i2, end2 - i2 + 1);
  console.log("fix2 done at line", i2);
} else { console.log("fix2 not found"); }

fs.writeFileSync(path, lines.join("\n"), "utf8");
console.log("done");
