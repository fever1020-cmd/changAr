const puppeteer = require('puppeteer');

async function run() {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.goto('https://www.arbookfind.com/UserType.aspx', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'step1.png' });
    try {
        await page.click('#radParent');
        await page.click('#btnSubmitUserType');
        await page.waitForNavigation({ waitUntil: 'networkidle2' });
    } catch(e) {}
    await page.screenshot({ path: 'step2.png' });
    await page.goto('https://www.arbookfind.com/default.aspx', { waitUntil: 'networkidle2' });
    await page.screenshot({ path: 'step3.png' });
    await browser.close();
    console.log('Screenshots saved');
}
run();
