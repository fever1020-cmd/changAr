const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const fs = require('fs');

const baseURL = 'https://www.arbookfind.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36';

async function test() {
    const sessionCookies = 'BFUserType=Parent; BFLexile=False';

    // Step 1: get the search page with proper cookies (no need for UserType form!)
    const s1 = await axios.get(baseURL + '/default.aspx', {
        headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Cookie': sessionCookies,
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
    });
    const p1 = cheerio.load(s1.data);
    console.log('Search page title:', p1('title').text().trim());
    console.log('Has txtKeyWords:', s1.data.includes('txtKeyWords'));

    // Get new cookies from response
    const newCookies = (s1.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
    const allCookies = newCookies ? newCookies + '; ' + sessionCookies : sessionCookies;

    const hf = {};
    p1('input[type="hidden"]').each((i, e) => {
        const n = p1(e).attr('name'); if (n) hf[n] = p1(e).attr('value') || '';
    });
    console.log('Hidden fields:', Object.keys(hf));

    // Step 2: POST search
    const fd = new URLSearchParams({ ...hf, txtKeyWords: 'Charlotte Web', btnSearch: 'Search' });
    const s2 = await axios.post(baseURL + '/default.aspx', fd.toString(), {
        headers: {
            'User-Agent': UA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Content-Type': 'application/x-www-form-urlencoded',
            'Referer': baseURL + '/default.aspx',
            'Cookie': allCookies,
        },
        httpsAgent: new https.Agent({ rejectUnauthorized: false }),
        maxRedirects: 5,
    });

    const p2 = cheerio.load(s2.data);
    console.log('Result page title:', p2('title').text().trim());
    fs.writeFileSync('search_result.html', s2.data, 'utf-8');

    const idx = s2.data.indexOf('BookTitle');
    if (idx >= 0) {
        console.log('\n=== FOUND RESULTS ===');
        console.log(s2.data.substring(Math.max(0, idx - 100), idx + 1000));
    } else {
        console.log('BookTitle NOT found. Checking page content...');
        // Check for "no results" message
        const noResults = s2.data.match(/no (books?|results?|match)/gi);
        console.log('No-results keywords:', noResults);
        const bodySnip = s2.data.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').substring(0, 2000);
        console.log('Text content:', bodySnip);
    }
}

test().catch(e => {
    console.error('ERROR:', e.message);
    if (e.response) console.error('HTTP:', e.response.status);
});
