const fs = require("fs");

// Έλεγχος αν υπάρχει το αρχείο πριν το διαβάσουμε
if (!fs.existsSync("data/raw.json")) {
    console.error("Error: data/raw.json not found!");
    process.exit(1);
}

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

// 1. Φτιάχνουμε ένα "λεξικό" (Map) με τα ονόματα των καναλιών
const channelNamesMap = {};
if (Array.isArray(raw.channels)) {
  raw.channels.forEach(ch => {
    if (ch.uuid) {
      channelNamesMap[ch.uuid] = ch.name;
    }
  });
}

function escapeXML(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Μετατρέπει το timestamp σε μορφή XMLTV (YYYYMMDDHHMMSS +0300)
 * Διασφαλίζει ώρα Ελλάδας (Europe/Athens)
 */
function fmt(dateValue) {
  if (!dateValue) return "19700101000000 +0300";
  
  let val = Number(dateValue);
  // Αν το timestamp είναι σε δευτερόλεπτα, το μετατρέπουμε σε milliseconds
  if (val > 0 && val < 10000000000) val *= 1000; 
  
  const d = new Date(val || dateValue);
  if (isNaN(d.getTime())) return "19700101000000 +0300";

  // Force Europe/Athens Timezone
  const parts = new Intl.DateTimeFormat('el-GR', {
    timeZone: 'Europe/Athens',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const p = {};
  parts.forEach(part => p[part.type] = part.value);

  // Επιστρέφει YYYYMMDDHHMMSS +0300
  return `${p.year}${p.month}${p.day}${p.hour}${p.minute}${p.second} +0300`;
}

let channelNodes = "";
let programmeNodes = "";
const foundChannelIds = new Set();

// 2. Επεξεργασία προγραμμάτων
const allPrograms = raw.programs || [];

allPrograms.forEach(p => {
  const chId = p.channelUuid || "unknown";
  
  // Δημιουργία <channel> tag αν δεν υπάρχει ήδη
  if (!foundChannelIds.has(chId)) {
    const realName = channelNamesMap[chId] || `Channel ${chId}`;
    channelNodes += `  <channel id="${escapeXML(chId)}">\n`;
    channelNodes += `    <display-name>${escapeXML(realName)}</display-name>\n`;
    channelNodes += `  </channel>\n`;
    foundChannelIds.add(chId);
  }

  const start = p.since || p.startTime;
  const end = p.till || p.endTime;

  if (start && end) {
    programmeNodes += `  <programme start="${fmt(start)}" stop="${fmt(end)}" channel="${escapeXML(chId)}">\n`;
    programmeNodes += `    <title lang="el">${escapeXML(p.title || "Πρόγραμμα")}</title>\n`;
    if (p.description) {
        programmeNodes += `    <desc lang="el">${escapeXML(p.description)}</desc>\n`;
    }
    programmeNodes += `  </programme>\n`;
  }
});

const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<tv>
${channelNodes.trimEnd()}
${programmeNodes.trimEnd()}
</tv>`;

// Διασφάλιση ότι υπάρχει ο φάκελος data
if (!fs.existsSync("data")) fs.mkdirSync("data");

fs.writeFileSync("data/epg.xml", finalXml, "utf-8");
console.log(`✅ Επιτυχία! Δημιουργήθηκε το EPG με ${foundChannelIds.size} κανάλια.`);
