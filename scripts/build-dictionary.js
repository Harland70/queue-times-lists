const fs = require('fs');
const path = require('path');

const TEST_RIDES = [
  "Space Mountain",
  "Jurassic World VelociCoaster",
  "Mako",
  "Iron Gwazi",
  "The Twilight Zone Tower of Terror",
  "Hagrid's Magical Creatures Motorbike Adventure",
  "Avatar Flight of Passage",
  "Kraken",
  "SheiKra",
  "Guardians of the Galaxy: Cosmic Rewind"
];

const OUT_FILE = path.join(__dirname, '..', 'rideDetailsTest.json');

async function fetchWikiData(apiUrl, title) {
  const url = `${apiUrl}?action=query&prop=extracts|revisions&exintro&rvprop=content&rvslots=main&format=json&redirects=1&titles=${encodeURIComponent(title)}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'QueueTimesBot/1.0 (Testing)' } });
  if (!res.ok) return null;
  const data = await res.json();
  const pages = data.query?.pages;
  if (!pages || pages['-1']) return null; // Not found

  const page = Object.values(pages)[0];
  const extract = page.extract ? page.extract.replace(/<[^>]*>?/gm, '').trim() : '';
  const wikitext = page.revisions && page.revisions[0] && page.revisions[0].slots && page.revisions[0].slots.main ? page.revisions[0].slots.main['*'] : '';
  
  // Extract height requirement using regex
  let heightRequirement = null;
  const heightMatch = wikitext.match(/\|\s*height_requirement\s*=\s*(.*?)\n/i) || 
                      wikitext.match(/\|\s*height_req\s*=\s*(.*?)\n/i) ||
                      wikitext.match(/\|\s*height\s*=\s*(.*?)\n/i); // fallback if it mentions height, though could be coaster height

  if (heightMatch && heightMatch[1]) {
    // Clean up wiki links like [[48 in]] -> 48 in
    let raw = heightMatch[1].replace(/\[\[(.*?)\]\]/g, (match, p1) => {
      return p1.includes('|') ? p1.split('|')[1] : p1;
    }).replace(/<[^>]*>?/gm, '').replace(/&nbsp;/g, ' ').trim();
    
    // Strip wiki formatting like {{convert|48|in}}
    if (raw.includes('{{convert|')) {
      const match = raw.match(/\{\{convert\|([\d.]+)\|([a-zA-Z]+)/);
      if (match) {
        raw = `${match[1]} ${match[2]}`;
      }
    }
    
    if (raw && raw !== '') {
      heightRequirement = raw;
    }
  }

  return { extract, heightRequirement };
}

async function run() {
  const dictionary = {};

  for (const ride of TEST_RIDES) {
    console.log(`Processing: ${ride}`);
    
    // 1. Try Coasterpedia First
    let result = await fetchWikiData('https://coasterpedia.net/w/api.php', ride);
    let source = 'Coasterpedia';
    
    // 2. Fallback to Wikipedia
    if (!result || !result.extract) {
      result = await fetchWikiData('https://en.wikipedia.org/w/api.php', ride);
      source = 'Wikipedia';
    }

    if (result && result.extract) {
      // Get first paragraph of the extract
      let description = result.extract.split('\n')[0].trim();
      if (description.length > 500) {
        description = description.substring(0, 500) + '...';
      }
      
      dictionary[ride] = {
        description: description,
        height_requirement: result.heightRequirement || "Unknown",
        source: source
      };
      console.log(`  -> Found in ${source}. Height: ${dictionary[ride].height_requirement}`);
    } else {
      dictionary[ride] = { description: "Not found", height_requirement: "Unknown", source: "None" };
      console.log(`  -> Not found`);
    }

    // Delay 200ms
    await new Promise(r => setTimeout(r, 200));
  }

  fs.writeFileSync(OUT_FILE, JSON.stringify(dictionary, null, 2));
  console.log(`\nSaved test dictionary to ${OUT_FILE}`);
}

run().catch(console.error);
