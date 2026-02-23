import { chromium } from 'playwright';

(async () => {
    console.log('Starting browser...');
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on('console', msg => {
        if (msg.type() === 'error') {
            console.log('BROWSER ERROR:', msg.text());
        } else {
            console.log('BROWSER LOG:', msg.text());
        }
    });

    page.on('pageerror', err => {
        console.log('PAGE ERROR:', err.message);
    });

    try {
        await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });
        console.log('Page loaded.');
    } catch (e) {
        console.error('Failed to load page:', e);
    }

    await browser.close();
})();
