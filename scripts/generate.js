const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

const channels = raw.channels || [];
const programmes = raw.programmes || raw.events || [];

// escape XML special chars
function escapeXML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// ISO -> XMLTV format
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

// ---------------- PROGRAMMES ----------------
for (const p of programmes) {
  if (!p?.channelUuid || !p?.since || !p?.till) continue;

  xml += `  <programme start="${fmt(p.since)}" stop="${fmt(p.till)}" channel="${escapeXML(p.channelUuid)}">\n`;

  // title (fallback αν είναι άδειο)
  xml += `    <title>${escapeXML(p.title || "Πρόγραμμα")}</title>\n`;

  // description optional
  if (p.description) {
    xml += `    <desc>${escapeXML(p.description)}</desc>\n`;
  }

  // category optional (πολλές φορές είναι generic)
  if (p.category) {
    xml += `    <category>${escapeXML(p.category)}</category>\n`;
  }

  xml += `  </programme>\n\n`;
}

xml += `</tv>`;

// write file
fs.writeFileSync("data/epg.xml", xml, "utf-8");
