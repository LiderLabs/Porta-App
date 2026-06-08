const fs = require("fs");
const path = "C:/Users/user/Desktop/porta-app/src/features/reception/pages/SchedulingPage.tsx";
let lines = fs.readFileSync(path, "utf8").split("\n");
const i = lines.findIndex(l => l.includes("printBadge"));
if (i !== -1) { lines.splice(i, 1); console.log("removed printBadge at line", i+1); }
fs.writeFileSync(path, lines.join("\n"), "utf8");
