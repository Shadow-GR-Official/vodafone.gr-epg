const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

// 1. Φτιάχνουμε ένα "λεξικό" (Map) με τα ονόματα των καναλιών
// Χρησιμοποιούμε το uuid ως κλειδί και το name ως τιμή
const channelNamesMap = {};
if (Array.isArray(raw.channels)) {
  raw.channels.forEach(ch => {
    if (ch.uuid) {
      channelNamesMap[ch.uuid] = ch.name;
    }
  });
}

function escapeXML(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function fmt(dateValue) {
  if (!dateValue) return "19700101000000 +0300";
  let val = Number(dateValue);
  if (val > 0 && val < 10000000000) val *= 1000; 
  const d = new Date(val || dateValue);
  if (isNaN(d.getTime())) return "19700101000000 +0300";
  const pad = n => String(n).padStart(2, "0");
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + " +0300";
}

let channelNodes = "";
let programmeNodes = "";
const foundChannelIds = new Set();

// 2. Επεξεργασία προγραμμάτων
const allPrograms = raw.programs || [];

allPrograms.forEach(p => {
  const chId = p.channelUuid || "unknown";
  
  // Αν είναι η πρώτη φορά που βλέπουμε αυτό το κανάλι, φτιάξε το <channel> tag
  if (!foundChannelIds.has(chId)) {
    const realName = channelNamesMap[chId] || `Channel ${chId}`;
    channelNodes += `  <channel id="${escapeXML(chId)}">\n`;
    channelNodes += `    <display-name>${escapeXML(realName)}</display-name>\n`;
    channelNodes += `  </channel>\n`;
    foundChannelIds.add(chId);
  }

  const start = p.since || p.startTime;
  const end = p.till || p.endTime;

  programmeNodes += `  <programme start="${fmt(start)}" stop="${fmt(end)}" channel="${escapeXML(chId)}">\n`;
  programmeNodes += `    <title lang="el">${escapeXML(p.title || "Πρόγραμμα")}</title>\n`;
  if (p.description) programmeNodes += `    <desc lang="el">${escapeXML(p.description)}</desc>\n`;
  programmeNodes += `  </programme>\n`;
});

const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="VodafoneGR-EPG-Fix">
${channelNodes}
${programmeNodes}
</tv>`;

fs.writeFileSync("data/epg.xml", finalXml, "utf-8");
console.log(`Έγινε η "παντρειά"! Βρέθηκαν ${foundChannelIds.size} κανάλια με τα ονόματά τους.`);
