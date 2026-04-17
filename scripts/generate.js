const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

// 1. Εντοπισμός των προγραμμάτων (Η Vodafone τα έχει στο raw.programs)
const allPrograms = raw.programs || [];

function escapeXML(str = "") {
  return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function fmt(dateValue) {
  if (!dateValue) return "19700101000000 +0300";
  
  // Μετατροπή σε νούμερο αν είναι string timestamp
  let val = Number(dateValue);
  
  // Αν το timestamp είναι σε δευτερόλεπτα (10 ψηφία), το κάνουμε milliseconds
  if (val > 0 && val < 10000000000) val *= 1000; 
  
  const d = new Date(val || dateValue); // Δοκίμασε και ως string αν αποτύχει το νούμερο
  
  if (isNaN(d.getTime())) return "19700101000000 +0300";

  const pad = n => String(n).padStart(2, "0");
  return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds()) + " +0300";
}

// Χρησιμοποιούμε Map για να μαζέψουμε τα μοναδικά κανάλια που εμφανίζονται στα προγράμματα
const channelsMap = new Map();
let programmeNodes = "";

allPrograms.forEach(p => {
  const chId = p.channelUuid || p.channelId || "unknown";
  const chName = p.channelName || `Channel ${chId}`;
  
  // Αποθήκευση καναλιού για το header
  if (!channelsMap.has(chId)) {
    channelsMap.set(chId, chName);
  }

  const start = p.since || p.startTime;
  const end = p.till || p.endTime;

  programmeNodes += `  <programme start="${fmt(start)}" stop="${fmt(end)}" channel="${escapeXML(chId)}">\n`;
  programmeNodes += `    <title lang="el">${escapeXML(p.title || "Πρόγραμμα")}</title>\n`;
  if (p.description) programmeNodes += `    <desc lang="el">${escapeXML(p.description)}</desc>\n`;
  if (p.category) programmeNodes += `    <category lang="el">${escapeXML(p.category)}</category>\n`;
  programmeNodes += `  </programme>\n`;
});

// Φτιάχνουμε το channelNodes από το Map
let channelNodes = "";
channelsMap.forEach((name, id) => {
  channelNodes += `  <channel id="${escapeXML(id)}">\n`;
  channelNodes += `    <display-name>${escapeXML(name)}</display-name>\n`;
  channelNodes += `  </channel>\n`;
});

const finalXml = `<?xml version="1.0" encoding="UTF-8"?>
<tv generator-info-name="VodafoneGR-EPG-Fix">
${channelNodes}
${programmeNodes}
</tv>`;

fs.writeFileSync("data/epg.xml", finalXml, "utf-8");
console.log(`Έτοιμο! Βρήκα ${channelsMap.size} κανάλια.`);
