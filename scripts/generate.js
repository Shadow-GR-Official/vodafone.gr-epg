const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

const channels = raw.channels || [];
const programmes = raw.programmes || raw.events || [];

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

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n`;

// CHANNELS
for (const ch of channels) {
  xml += `  <channel id="${ch.uuid}">\n`;
  xml += `    <display-name>${ch.name}</display-name>\n`;
  xml += `  </channel>\n`;
}

// PROGRAMMES
for (const p of programmes) {
  xml += `  <programme start="${fmt(p.since)}" stop="${fmt(p.till)}" channel="${p.channelUuid}">\n`;
  xml += `    <title>${p.title}</title>\n`;

  if (p.description) {
    xml += `    <desc>${p.description}</desc>\n`;
  }

  if (p.category) {
    xml += `    <category>${p.category}</category>\n`;
  }

  xml += `  </programme>\n`;
}

xml += `</tv>`;

fs.writeFileSync("data/epg.xml", xml);
