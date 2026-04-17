const fs = require("fs");
const { create } = require("xmlbuilder2");

const raw = JSON.parse(fs.readFileSync("data/raw.json", "utf-8"));

const channels = raw.channels || [];
const programmes = raw.programmes || raw.events || [];

// debug timestamp
const time_now = new Date().toISOString();
fs.writeFileSync("data/time_now.txt", time_now);

// convert ISO → XMLTV format
function toXMLTV(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + " +0000";
}

// ---------------- XMLTV ----------------
const root = create({ version: "1.0" }).ele("tv");

// channels
channels.forEach(ch => {
  root.ele("channel", { id: ch.uuid })
    .ele("display-name").txt(ch.name).up()
    .up();
});

// programmes
programmes.forEach(p => {
  root.ele("programme", {
    start: toXMLTV(p.since),
    stop: toXMLTV(p.till),
    channel: p.channelUuid
  })
    .ele("title").txt(p.title || "").up()
    .ele("desc").txt(p.description || "").up()
    .up();
});

const xml = root.end({ prettyPrint: false });
fs.writeFileSync("data/epg.xml", xml);

// ---------------- DEMO M3U ----------------
let m3u = "#EXTM3U\n";

channels.forEach(ch => {
  m3u += `#EXTINF:-1 tvg-id="${ch.uuid}" tvg-name="${ch.name}" tvg-logo="${ch.logo || ""}",${ch.name}\n`;
  m3u += `http://dummy.stream/${ch.uuid}\n`;
});

fs.writeFileSync("data/channels.m3u", m3u);
