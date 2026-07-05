const fs = require("fs");
const path = require("path");

const swPath = path.join(__dirname, "public", "service-worker.js");
const version = Date.now().toString();

let content = fs.readFileSync(swPath, "utf8");
content = content.replace(/porta-app-[^']+/, `porta-app-${version}`);
fs.writeFileSync(swPath, content, "utf8");

console.log(`service-worker.js stamped with version: ${version}`);
