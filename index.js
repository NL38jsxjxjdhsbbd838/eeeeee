// index.js
import puppeteer from 'puppeteer';
import fs from 'fs';

// --- Настройки ---
const PROFILE_URL = 'https://funpay.com/users/2694790/';
const COOKIES_FILE = './cookies.json';
const REFRESH_INTERVAL_MS = 10000; // интервал между обновлениями

// --- Логирование ---
function log(msg) {
    const time = new Date().toISOString();
    console.log(`[${time}] ${msg}`);
}

// --- Загрузка cookies ---
async function loadCookies(page) {
    if (!fs.existsSync(COOKIES_FILE)) {
        throw new Error('Файл cookies не найден!');
    }
    const cookies = JSON.parse(fs.readFileSync(COOKIES_FILE, 'utf8'));
    await page.setCookie(...cookies);
    log('✅ Cookies загружены');
}

// --- Получаем все лоты с профиля ---
async function getAllLotLinks(page) {
    log('🌐 Получаем все лоты с профиля...');
    await page.goto(PROFILE_URL, { waitUntil: 'networkidle2' });

    // Скроллим страницу, чтобы подгрузились все лоты
    await autoScroll(page);

    const links = await page.$$eval('a[href^="/lots/"]', els =>
        els.map(el => el.href)
    );

    if (!links.length) throw new Error('❌ Лоты не найдены — проверьте куки или страницу профиля!');
    log(`✅ Найдено ${links.length} лотов`);
    return links;
}

// --- Автоскролл страницы ---
async function autoScroll(page) {
    await page.evaluate(async () => {
        await new Promise(resolve => {
            let totalHeight = 0;
            const distance = 200;
            const timer = setInterval(() => {
                const scrollHeight = document.body.scrollHeight;
                window.scrollBy(0, distance);
                totalHeight += distance;
                if (totalHeight >= scrollHeight) clearInterval(timer, resolve());
            }, 100);
        });
    });
}

// --- Поднимаем один лот ---
async function refreshLot(page, url) {
    await page.goto(url, { waitUntil: 'networkidle2' });

    try {
        const button = await page.$('button:has-text("Поднять предложение")');
        if (!button) {
            log(`⚠ Кнопка "Поднять предложение" не найдена на ${url}`);
            return false;
        }
        await button.click();
        log(`✅ Лот обновлен: ${url}`);
        return true;
    } catch (e) {
        log(`❌ Ошибка при обновлении лота ${url}: ${e.message}`);
        return false;
    }
}

// --- Обновляем все лоты ---
async function refreshAllLots(page) {
    try {
        const links = await getAllLotLinks(page);
        for (const link of links) {
            await refreshLot(page, link);
            await page.waitForTimeout(1000); // пауза между лотами
        }
        log('✅ Все лоты обновлены');
    } catch (e) {
        log(`Ошибка при обновлении всех лотов: ${e.message}`);
    }
}

// --- Основная функция ---
async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();

    try {
        await loadCookies(page);
        await refreshAllLots(page);
    } catch (e) {
        log(`❌ ${e.message}`);
    } finally {
        await browser.close();
        log('🌐 Браузер закрыт');
    }
}

// Запуск
main();
