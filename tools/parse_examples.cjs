const fs = require('fs');
const path = require('path');

const INPUT_FILE = path.join(__dirname, '../public/examples');
const OUTPUT_FILE = path.join(__dirname, '../parsed_examples.json');

function parseExamples() {
  try {
    const html = fs.readFileSync(INPUT_FILE, 'utf8');
    const items = [];
    
    // Split by feed row to isolate cards
    // Using a regex to find the start of each card/row
    const rowRegex = /<div[^>]*data-testid="feed-row"[^>]*>([\s\S]*?)data-testid="feed-row"/g;
    
    // We need to capture the last item too, so let's just split by the delimiter
    const parts = html.split('data-testid="feed-row"');
    
    // Skip the first part if it's just container start
    for (let i = 1; i < parts.length; i++) {
      const block = parts[i];
      
      // 1. Link
      const linkMatch = block.match(/href="(https:\/\/dzen\.ru\/a\/[^"]+)"/);
      const link = linkMatch ? linkMatch[1] : null;
      
      // 2. Views
      const viewsMatch = block.match(/<span>([\d,\.]+\s*тыс\s+читали)<\/span>/);
      const views = viewsMatch ? viewsMatch[1] : null;
      
      // 3. Date
      const dateMatch = block.match(/<span>&nbsp;·\s*([^<]+)<\/span>/);
      const date = dateMatch ? dateMatch[1] : null;
      
      // 4. Image
      const imgMatch = block.match(/<img[^>]*class="channel--zen-image-cover__image-[^"]*"[^>]*src="([^"]+)"/);
      const image = imgMatch ? imgMatch[1] : null;
      
      // 5. Title (Short Cyrillic text)
      // We look for the first significant Cyrillic string which is usually the title in this layout
      const titleMatch = block.match(/>([^<]*[А-Яа-я]{3,}[^<]*)<\/div>/); // Titles are often in divs
      // Fallback: look for any tag content
      const titleMatch2 = block.match(/>\s*([А-Яа-я][^<]{2,50})\s*</);
      
      let title = titleMatch ? titleMatch[1].trim() : (titleMatch2 ? titleMatch2[1].trim() : 'No title');
      
      // 6. Excerpt (Long text)
      // Look for a longer block of text (e.g. > 50 chars) that contains Cyrillic
      // The excerpt is usually the LEDE of the story
      const excerptMatch = block.match(/>([^<]*[А-Яа-я]{20,}[^<]*)<\/div>/g);
      let excerpt = null;
      
      if (excerptMatch) {
         // Find the longest match that isn't the title or garbage
         excerpt = excerptMatch.map(m => m.replace(/^>|<\/div>$/g, '').trim())
                             .sort((a, b) => b.length - a.length)[0];
      }
      
      if (!excerpt) {
         // Try a broader search for long text
         const looseMatch = block.match(/>([^<]{50,})</);
         if (looseMatch) excerpt = looseMatch[1].trim();
      }

      if (link) {
        items.push({
          id: i,
          title: title,
          excerpt: excerpt ? excerpt.substring(0, 300) + '...' : null,
          views,
          date,
          link,
          image
        });
      }
    }

    console.log(`✅ Parsed ${items.length} items.`);
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(items, null, 2));
    console.log(`💾 Saved to ${OUTPUT_FILE}`);
    
    // Print first 3 for verification
    console.log('--- Preview ---');
    console.log(JSON.stringify(items.slice(0, 3), null, 2));

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

parseExamples();
