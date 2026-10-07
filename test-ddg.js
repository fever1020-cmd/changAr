const axios = require('axios');
const cheerio = require('cheerio');

async function testDDG(title) {
    try {
        const query = `site:arbookfind.com "${title}" "ATOS Book Level"`;
        console.log(`Searching DDG: ${query}`);
        const response = await axios.get(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });
        const $ = cheerio.load(response.data);
        const results = [];
        $('.result').each((i, el) => {
            const text = $(el).find('.result__snippet').text();
            const titleText = $(el).find('.result__title').text().trim();
            if (text) {
                let arLevel = 'N/A';
                const arMatch = text.match(/ATOS Book Level:\s*([\d.]+)/i);
                if (arMatch) arLevel = arMatch[1];
                
                let points = 'N/A';
                const ptsMatch = text.match(/AR Points:\s*([\d.]+)/i);
                if (ptsMatch) points = ptsMatch[1];

                results.push({ title: titleText.replace(/ - AR BookFinder/g, ''), arLevel, points, snippet: text });
            }
        });
        console.log(results);
    } catch (e) {
        console.error(e.message);
    }
}
testDDG('Harry Potter and the Sorcerer');
