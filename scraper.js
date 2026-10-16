const puppeteer = require('puppeteer');

let browserInstance = null;

async function getBrowser() {
    if (!browserInstance || !browserInstance.connected) {
        console.log('[Scraper] Launching persistent browser instance...');

        // Render.com (Linux) requires these args for Puppeteer to work
        const args = [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--single-process',
            '--no-zygote',
        ];

        browserInstance = await puppeteer.launch({
            headless: 'new',
            args,
        });
    }
    return browserInstance;
}


async function searchARLevel(title) {
    const browser = await getBrowser();
    const page = await browser.newPage();

    try {
        // Inject cookies to bypass UserType selection screen
        await page.setCookie(
            { name: 'BFUserType', value: 'Parent', domain: 'www.arbookfind.com' },
            { name: 'BFLexile', value: 'False', domain: 'www.arbookfind.com' }
        );

        // Block images/media to speed up loading
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            const t = req.resourceType();
            if (t === 'image' || t === 'stylesheet' || t === 'font' || t === 'media') {
                req.abort();
            } else {
                req.continue();
            }
        });

        console.log(`[Scraper] Searching for: "${title}"`);

        await page.goto('https://www.arbookfind.com/default.aspx', {
            waitUntil: 'domcontentloaded',
            timeout: 20000,
        });

        // Exact IDs from live page inspection
        const INPUT_SEL = '#ctl00_ContentPlaceHolder1_txtKeyWords';
        const BTN_SEL   = '#ctl00_ContentPlaceHolder1_btnDoIt';

        await page.waitForSelector(INPUT_SEL, { timeout: 10000 });
        await page.click(INPUT_SEL, { clickCount: 3 });
        await page.keyboard.press('Backspace');
        await page.type(INPUT_SEL, title, { delay: 20 });

        console.log('[Scraper] Submitting search...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }),
            page.click(BTN_SEL),
        ]);

        await new Promise(r => setTimeout(r, 500));

        // Parse using the actual HTML structure discovered:
        // - Book title: <a id="book-title" ...>Title</a> inside <td class="book-detail">
        // - BL and AR Pts are in <strong> tags within the same td
        // - Author is in <p> tag text
        const results = await page.evaluate(() => {
            const books = [];

            // Each book result is in a <td class="book-detail"> element
            const bookCells = document.querySelectorAll('td.book-detail');

            for (const cell of bookCells) {
                const titleEl = cell.querySelector('a[id="book-title"]');
                if (!titleEl) continue;

                const bookTitle = (titleEl.innerText || titleEl.textContent).trim();
                if (!bookTitle) continue;

                // Get all text with strong tags replaced by markers
                const cellHtml = cell.innerHTML;

                // Extract BL (Book Level / AR Level)
                let arLevel = 'N/A';
                const blMatch = cellHtml.match(/BL:\s*<strong>([\d.]+)<\/strong>/i);
                if (blMatch) arLevel = blMatch[1];

                // Extract AR Points
                let points = 'N/A';
                const ptMatch = cellHtml.match(/AR Pts:\s*<strong>([\d.]+)<\/strong>/i);
                if (ptMatch) points = ptMatch[1];

                // Extract author from the first <p> text content
                let author = 'Unknown';
                const pEl = cell.querySelector('p');
                if (pEl) {
                    const pText = (pEl.innerText || pEl.textContent).trim();
                    // Author is the first line before any newline or quiz info
                    const authorLine = pText.split('\n')[0].trim();
                    if (authorLine && !authorLine.startsWith('AR Quiz')) {
                        author = authorLine;
                    }
                }

                // Extract Interest Level
                let interestLevel = 'N/A';
                const ilMatch = cellHtml.match(/IL:\s*<strong>([^<]+)<\/strong>/i);
                if (ilMatch) interestLevel = ilMatch[1].trim();

                books.push({ title: bookTitle, author, arLevel, points, interestLevel });
                if (books.length >= 5) break;
            }

            return books;
        });

        console.log(`[Scraper] Found ${results.length} result(s).`);
        return results;

    } catch (error) {
        console.error('[Scraper] Error:', error.message);
        try { await page.close(); } catch (e) {}
        try { await browserInstance.close(); } catch (e) {}
        browserInstance = null;
        throw error;
    } finally {
        try { await page.close(); } catch (e) {}
    }
}

module.exports = { searchARLevel };
