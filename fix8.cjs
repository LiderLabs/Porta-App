const fs = require("fs");
const path = "C:/Users/user/Desktop/porta-app/src/app/layouts/ReceptionLayout.tsx";
let lines = fs.readFileSync(path, "utf8").split("\n");
const i = lines.findIndex(l => l.includes("/reception/checkin"));
if (i !== -1) {
  // Remove this line and the next 3 (svg line, "Check In" text, closing NavLink)
  let end = i;
  for (let j = i; j < i + 6; j++) {
    if (lines[j].includes("</NavLink>")) { end = j; break; }
  }
  lines.splice(i, end - i + 1);
  console.log("removed lines", i, "to", end);
} else { console.log("not found"); }
fs.writeFileSync(path, lines.join("\n"), "utf8");
