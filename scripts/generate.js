const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

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
  if (!dateStr) return "";
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

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n\n`;

let usedPrograms = 0;
let channelCount = 0;

// Το API της Vodafone επιστρέφει ένα αντικείμενο όπου τα keys είναι τα channel IDs
// Παράδειγμα: { "101": [...προγράμματα...], "102": [...] }
const channelIds = Object.keys(raw);

// ---------------- CHANNELS & PROGRAMMES ----------------
for (const chId of channelIds) {
  const programmes = raw[chId];
  if (!Array.isArray(programmes) || programmes.length === 0) continue;

  // 1. Δημιουργία Channel Entry (Παίρνουμε το όνομα από το πρώτο πρόγραμμα αν δεν υπάρχει αλλού)
  const channelName = programmes[0].channelName || chId;
  xml += `  <channel id="${escapeXML(chId)}">\n`;
  xml += `    <display-name>${escapeXML(channelName)}</display-name>\n`;
  xml += `  </channel>\n\n`;
  channelCount++;

  // 2. Επεξεργασία Προγραμμάτων
  for (const p of programmes) {
    // Η Vodafone χρησιμοποιεί τα πεδία 'startTime' και 'endTime' (ή 'since'/'till')
    // Προσαρμογή ανάλογα με το response:
    const start = p.startTime || p.since;
    const end = p.endTime || p.till;

    if (!start || !end) continue;

    xml += `  <programme start="${fmt(start)}" stop="${fmt(end)}" channel="${escapeXML(chId)}">\n`;
    xml += `    <title lang="el">${escapeXML(p.title || "No Title")}</title>\n`;

    if (p.description) {
      xml += `    <desc lang="el">${escapeXML(p.description)}</desc>\n`;
    }
    
    if (p.category) {
      xml += `    <category lang="el">${escapeXML(p.category)}</category>\n`;
    }

    xml += `  </programme>\n\n`;
    usedPrograms++;
  }
}

xml += `</tv>`;

fs.writeFileSync("data/epg.xml", xml, "utf-8");

console.log("Σύνολο Καναλιών:", channelCount);
console.log("Σύνολο Προγραμμάτων:", usedPrograms);
