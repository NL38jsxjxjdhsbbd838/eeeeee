import puppeteer from 'puppeteer-extra';
import fs from 'fs';

// Загружаем куки
const cookies = JSON.parse(fs.readFileSync('./cookies.json', 'utf8'));
const profileUrl = 'https://funpay.com/users/2694790/';

async function getAllLotLinks(page) {
    console.log(`🌐 Получаем все лоты с профиля ${profileUrl}...`);
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });

    // Ждем появления лотов
    await page.waitForSelector('a[href^="/lots/"]', { timeout: 5000 }).catch(() => {
        console.log('❌ Лоты не найдены на странице');
        return [];
    });

    const links = await page.$$eval('a[href^="/lots/"]', els => els.map(el => el.href));
    return [...new Set(links)]; // убираем дубликаты
}

async function raiseLot(page, lotUrl) {
    try {
        await page.goto(lotUrl, { waitUntil: 'networkidle2' });

        // Ищем кнопку "Поднять предложение"
        const button = await page.$('button:contains("Поднять предложение")');

        if (!button) {
            console.log(`⚠ Кнопка не найдена: ${lotUrl}`);
            return false;
        }

        await button.click();
        console.log(`✅ Предложение поднято: ${lotUrl}`);
        return true;

    } catch (err) {
        console.log(`❌ Ошибка на лоте ${lotUrl}:`, err.message);
        return false;
    }
}

async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setCookie(...cookies);
    console.log('✅ Cookies загружены');

    const lots = await getAllLotLinks(page);
    if (lots.length === 0) {
        console.log('❌ Лоты не найдены — проверьте куки или страницу профиля!');
        await browser.close();
        return;
    }

    console.log(`✅ Найдено лотов: ${lots.length}`);

    for (let i = 0; i < lots.length; i++) {
        console.log(`🔹 Обрабатываем лот ${i + 1}/${lots.length}`);
        await raiseLot(page, lots[i]);
        await page.waitForTimeout(1000); // пауза 1 сек между лотами
    }

    await browser.close();
    console.log('🌐 Все лоты обработаны, браузер закрыт');
}

main();
