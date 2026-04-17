const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

const channels = raw.channels || [];
const programmes = raw.programmes || raw.events || [];

// ---------------- XML ESCAPE ----------------
function escapeXML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ---------------- XMLTV TIME ----------------
function fmt(dateStr) {
  const d = new Date(dateStr);

  const pad = n => String(n).padStart(2, "0");

  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds()) +
    " +0300"
  );
}

// ---------------- INDEX CHANNELS (IMPORTANT FIX) ----------------
// map uuid → channel object
const channelMap = new Map();
for (const ch of channels) {
  if (ch?.uuid) channelMap.set(String(ch.uuid), ch);
}

// DEBUG counters
let usedPrograms = 0;
let skippedPrograms = 0;

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n\n`;

// ---------------- CHANNELS ----------------
for (const ch of channels) {
  if (!ch?.uuid || !ch?.name) continue;

  xml += `  <channel id="${escapeXML(ch.uuid)}">\n`;
  xml += `    <display-name>${escapeXML(ch.name)}</display-name>\n`;

  if (ch.logo) {
    xml += `    <icon src="${escapeXML(ch.logo)}"/>\n`;
  }

  xml += `  </channel>\n\n`;
}

// ---------------- PROGRAMMES (FIXED LOGIC) ----------------
for (const p of programmes) {
  if (!p?.channelUuid || !p?.since || !p?.till) {
    skippedPrograms++;
    continue;
  }

  // IMPORTANT: ensure channel exists
  if (!channelMap.has(String(p.channelUuid))) {
    skippedPrograms++;
    continue;
  }

  xml += `  <programme start="${fmt(p.since)}" stop="${fmt(p.till)}" channel="${escapeXML(p.channelUuid)}">\n`;

  xml += `    <title>${escapeXML(p.title || "Πρόγραμμα")}</title>\n`;

  if (p.description) {
    xml += `    <desc>${escapeXML(p.description)}</desc>\n`;
  }

  if (p.category) {
    xml += `    <category>${escapeXML(p.category)}</category>\n`;
  }

  xml += `  </programme>\n\n`;

  usedPrograms++;
}

xml += `</tv>`;

// write file
fs.writeFileSync("data/epg.xml", xml, "utf-8");

// ---------------- DEBUG OUTPUT ----------------
console.log("Channels:", channels.length);
console.log("Programmes total:", programmes.length);
console.log("Used programmes:", usedPrograms);
console.log("Skipped programmes:", skippedPrograms);
