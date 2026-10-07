const puppeteer = require('puppeteer');
const fs = require('fs');

(async () => {
    const browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await page.setCookie(
        { name: 'BFUserType', value: 'Parent', domain: 'www.arbookfind.com' },
        { name: 'BFLexile', value: 'False', domain: 'www.arbookfind.com' }
    );

    await page.setRequestInterception(true);
    page.on('request', (req) => {
        if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) req.abort();
        else req.continue();
    });

    await page.goto('https://www.arbookfind.com/default.aspx', { waitUntil: 'domcontentloaded', timeout: 20000 });

    await page.waitForSelector('#ctl00_ContentPlaceHolder1_txtKeyWords', { timeout: 10000 });
    await page.type('#ctl00_ContentPlaceHolder1_txtKeyWords', 'Charlotte Web');
    
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
        page.click('#ctl00_ContentPlaceHolder1_btnDoIt'),
    ]);

    await new Promise(r => setTimeout(r, 1000));
    
    const html = await page.content();
    fs.writeFileSync('result_page.html', html, 'utf-8');
    console.log('Saved result_page.html. Length:', html.length);
    
    // Find BookTitle
    const idx = html.indexOf('BookTitle');
    console.log('BookTitle found at index:', idx);
    if (idx >= 0) {
        console.log('Context:\n', html.substring(Math.max(0, idx-100), idx+600));
    } else {
        // Print some text around possible results
        const textOnly = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
        const noResults = textOnly.match(/no results|no books|0 results|Your search/i);
        console.log('No results message?', noResults);
        console.log('Page text preview:', textOnly.substring(500, 3000));
    }

    await browser.close();
})().catch(e => console.error('ERR:', e.message));
