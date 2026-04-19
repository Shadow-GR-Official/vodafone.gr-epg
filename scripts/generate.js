const fs = require("fs");
const path = require("path");

const DATA_DIR = "data";

// βρίσκουμε όλα τα raw_*.json
const files = fs.readdirSync(DATA_DIR)
  .filter(f => f.startsWith("raw_") && f.endsWith(".json"));

if (!files.length) {
  console.error("No raw_*.json files found!");
  process.exit(1);
}

// ------------------ helpers ------------------

function escapeXML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// σωστό XMLTV datetime με Europe/Athens offset (DST safe)
function fmt(dateValue) {
  if (!dateValue) return null;

  let val = Number(dateValue);
  if (val > 0 && val < 10000000000) val *= 1000;

  const d = new Date(val || dateValue);
  if (isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Athens",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(d);

  const p = {};
  parts.forEach(x => p[x.type] = x.value);

  let hh = p.hour === "24" ? "00" : p.hour;

  // υπολογισμός offset σωστά (+0200 / +0300)
  const tzOffset = -new Date(d.toLocaleString("en-US", { timeZone: "UTC" }))
    .getTimezoneOffset();

  const offsetHours = Math.floor(tzOffset / 60);
  const offsetStr = `${offsetHours >= 0 ? "+" : "-"}${String(Math.abs(offsetHours)).padStart(2, "0")}00`;

  return `${p.year}${p.month}${p.day}${hh}${p.minute}${p.second} ${offsetStr}`;
}

// ------------------ merge data ------------------

let channelNamesMap = {};
let allPrograms = [];

// φόρτωση όλων των ημερών
files.forEach(file => {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf-8"));

  if (Array.isArray(raw.channels)) {
    raw.channels.forEach(ch => {
      if (ch.uuid) channelNamesMap[ch.uuid] = ch.name;
    });
  }

  if (Array.isArray(raw.programs)) {
    allPrograms.push(...raw.programs);
  }
});

// ------------------ dedupe ------------------

const seen = new Set();
const cleanPrograms = [];

allPrograms.forEach(p => {
  const key = `${p.channelUuid}-${p.since || p.startTime}-${p.till || p.endTime}`;

  if (!seen.has(key)) {
    seen.add(key);
    cleanPrograms.push(p);
  }
});

// sort by channel + time
cleanPrograms.sort((a, b) => {
  const chA = a.channelUuid || "";
  const chB = b.channelUuid || "";

  if (chA !== chB) return chA.localeCompare(chB);

  return (a.since || a.startTime) - (b.since || b.startTime);
});

// ------------------ build XML ------------------

let channelNodes = "";
let programmeNodes = "";
const foundChannelIds = new Set();

cleanPrograms.forEach(p => {
  const chId = p.channelUuid || "unknown";

  if (!foundChannelIds.has(chId)) {
    const name = channelNamesMap[chId] || `Channel ${chId}`;

    channelNodes += `  <channel id="${escapeXML(chId)}">\n`;
    channelNodes += `    <display-name>${escapeXML(name)}</display-name>\n`;
    channelNodes += `  </channel>\n`;

    foundChannelIds.add(chId);
  }

  const start = fmt(p.since || p.startTime);
  const end = fmt(p.till || p.endTime);

  if (!start || !end) return;

  programmeNodes += `  <programme start="${start}" stop="${end}" channel="${escapeXML(chId)}">\n`;
  programmeNodes += `    <title lang="el">${escapeXML(p.title || "Πρόγραμμα")}</title>\n`;

  if (p.description) {
    programmeNodes += `    <desc lang="el">${escapeXML(p.description)}</desc>\n`;
  }

  programmeNodes += `  </programme>\n`;
});

// ------------------ write file ------------------

const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
${channelNodes.trimEnd()}
${programmeNodes.trimEnd()}
</tv>`;

fs.writeFileSync(path.join(DATA_DIR, "epg.xml"), finalXml, "utf-8");

console.log(`✅ EPG ready: ${foundChannelIds.size} channels, ${cleanPrograms.length} programmes`);
