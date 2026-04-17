const fs = require("fs");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

const channels = raw.channels || [];
const programmes = raw.programmes || raw.events || [];

// helper: ISO -> XMLTV format (+0300)
function toXMLTV(dateStr) {
  const d = new Date(dateStr);

  const pad = (n) => String(n).padStart(2, "0");

  return (
    d.getUTCFullYear() +
    pad(d.getUTCMonth() + 1) +
    pad(d.getUTCDate()) +
    pad(d.getUTCHours()) +
    pad(d.getUTCMinutes()) +
    pad(d.getUTCSeconds()) +
    " +0300"
  );
}

let xml = `<?xml version="1.0" encoding="UTF-8"?>\n<tv>\n\n`;

// CHANNELS
channels.forEach(ch => {
  xml += `  <channel id="${ch.uuid}">\n`;
  xml += `    <display-name>${ch.name}</display-name>\n`;
  xml += `  </channel>\n\n`;
});

// PROGRAMMES
programmes.forEach(p => {
  xml += `  <programme start="${toXMLTV(p.since)}" stop="${toXMLTV(p.till)}" channel="${p.channelUuid}">\n`;
  xml += `    <title>${p.title}</title>\n`;
  xml += `    <category>${p.title}</category>\n`;
  xml += `  </programme>\n\n`;
});

xml += `</tv>`;

fs.writeFileSync("data/epg.xml", xml);
