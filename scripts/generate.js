const fs = require("fs");

// Φόρτωση δεδομένων
const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

function escapeXML(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function fmt(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const pad = n => String(n).padStart(2, "0");
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + " +0300";
}

let channelNodes = "";
let programmeNodes = "";
let usedPrograms = 0;

const channelIds = Object.keys(raw);

channelIds.forEach(chId => {
  const progs = raw[chId];
  if (!Array.isArray(progs) || progs.length === 0) return;

  // 1. Φτιάχνουμε τη λίστα των καναλιών (στο header)
  // Επειδή το API έχει μόνο IDs, χρησιμοποιούμε το ID ως όνομα αν δεν υπάρχει info
  const displayName = progs[0].channelName || `Channel ${chId}`;
  
  channelNodes += `  <channel id="${escapeXML(chId)}">\n`;
  channelNodes += `    <display-name>${escapeXML(displayName)}</display-name>\n`;
  channelNodes += `  </channel>\n`;

  // 2. Μαζεύουμε όλα τα προγράμματα
  for (const p of progs) {
    const start = p.startTime || p.since;
    const end = p.endTime || p.till;
    if (!start || !end) continue;

    programmeNodes += `  <programme start="${fmt(start)}" stop="${fmt(end)}" channel="${escapeXML(chId)}">\n`;
    programmeNodes += `    <title lang="el">${escapeXML(p.title || "Πρόγραμμα")}</title>\n`;
    if (p.description) programmeNodes += `    <desc lang="el">${escapeXML(p.description)}</desc>\n`;
    if (p.category) programmeNodes += `    <category lang="el">${escapeXML(p.category)}</category>\n`;
    if (p.p_image) programmeNodes += `    <icon src="${escapeXML(p.p_image)}"/>\n`;
    programmeNodes += `  </programme>\n`;
    
    usedPrograms++;
  }
});

// Ενώνουμε τα κομμάτια σωστά
const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="VodafoneGR-EPG-Fix">
${channelNodes}
${programmeNodes}
</tv>`;

fs.writeFileSync("data/epg.xml", finalXml, "utf-8");

console.log(`Έτοιμο! Μπήκαν ${channelIds.length} κανάλια και ${usedPrograms} προγράμματα.`);
