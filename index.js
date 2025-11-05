import fs from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';

puppeteer.use(StealthPlugin());

const COOKIES_PATH = './cookies.json';
const PROFILE_URL = 'https://funpay.com/users/2694790/';

// Задержка между действиями
const delay = ms => new Promise(res => setTimeout(res, ms));

async function loadCookies(page) {
    const cookies = JSON.parse(fs.readFileSync(COOKIES_PATH, 'utf-8'));
    await page.setCookie(...cookies);
    console.log('✅ Cookies загружены');
}

async function getAllLotLinks(page) {
    console.log(`🌐 Получаем все лоты с профиля ${PROFILE_URL}...`);
    await page.goto(PROFILE_URL, { waitUntil: 'networkidle2' });

    // Получаем все ссылки на лоты
    const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href^="/lots/"]'));
        return anchors.map(a => a.href);
    });

    // Убираем дубли
    const uniqueLinks = [...new Set(links)];
    console.log(`✅ Найдено лотов: ${uniqueLinks.length}`);
    uniqueLinks.forEach((link, i) => console.log(`${i + 1}: ${link}`));

    return uniqueLinks;
}

async function refreshLot(page, url, index) {
    try {
        console.log(`🔄 Обновляем лот ${index + 1}: ${url}`);
        await page.goto(url, { waitUntil: 'networkidle2' });

        // Ищем кнопку обновления
        const updateBtn = await page.$('button:has-text("Обновить")');
        if (updateBtn) {
            await updateBtn.click();
            console.log(`✅ Лот ${index + 1} обновлён`);
        } else {
            console.log(`⚠ Лот ${index + 1} не имеет кнопки обновления`);
        }

        await delay(1000); // задержка 1 сек
    } catch (err) {
        console.log(`❌ Ошибка обновления лота ${index + 1}: ${err.message}`);
    }
}

async function main() {
    const browser = await puppeteer.launch({
        headless: false, 
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    await loadCookies(page);

    const lotLinks = await getAllLotLinks(page);

    for (let i = 0; i < lotLinks.length; i++) {
        await refreshLot(page, lotLinks[i], i);
    }

    console.log('🎉 Все лоты обработаны!');
    await browser.close();
}

main().catch(err => console.error(err));
