const puppeteer = require('puppeteer');
const fs = require('fs');

const COOKIE_PATH = './cookies.json';
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || '10', 10);

let cookies = [];
if (fs.existsSync(COOKIE_PATH)) {
    cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
    console.log('✅ Cookies загружены');
} else {
    console.log('⚠ Cookies не найдены!');
}

// Список лотов с профиля
async function getAllLotLinks(profileUrl, page) {
    console.log(`🌐 Получаем все лоты с профиля ${profileUrl}...`);
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });

    const links = await page.$$eval('a[href*="/lots/"]', anchors =>
        anchors.map(a => a.href)
    );

    const uniqueLinks = [...new Set(links)];

    if (!uniqueLinks.length) {
        throw new Error('❌ Лоты не найдены — проверьте куки или страницу профиля!');
    }

    console.log(`✅ Найдено лотов: ${uniqueLinks.length}`);
    uniqueLinks.forEach((link, i) => console.log(`${i + 1}: ${link}`));
    return uniqueLinks;
}

// Поднять предложение на лоте
async function raiseOffer(page, url) {
    try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

        const buttons = await page.$$('button');
        let found = false;

        for (const btn of buttons) {
            const { text, action } = await page.evaluate(el => ({
                text: el.innerText,
                action: el.getAttribute('data-action')
            }), btn);

            if (text.includes('Поднять предложения') || action === 'raise') {
                await btn.click();
                console.log(`✅ Предложения подняты на лоте ${url}`);
                found = true;
                break;
            }
        }

        if (!found) {
            console.log(`⚠️ Кнопка "Поднять предложения" не найдена на лоте ${url}`);
        }
    } catch (err) {
        console.error(`❌ Ошибка на лоте ${url}:`, err.message || err);
    }
}

// Основная функция
async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    if (cookies.length) {
        await page.setCookie(...cookies);
    }

    try {
        const profileUrl = 'https://funpay.com/users/2694790/';
        const lotLinks = await getAllLotLinks(profileUrl, page);

        // Первый проход: поднимаем предложения на всех лотах
        for (const link of lotLinks) {
            await raiseOffer(page, link);
        }

        console.log('🎉 Все лоты обработаны!');

        // Далее повторяем каждые INTERVAL_MIN минут
        setInterval(async () => {
            console.log('🔄 Повторный проход по лотам...');
            for (const link of lotLinks) {
                await raiseOffer(page, link);
            }
        }, INTERVAL_MIN * 60 * 1000);

        console.log('🟢 Браузер остаётся открытым, бот работает в цикле');

    } catch (err) {
        console.error('Ошибка при обновлении всех лотов:', err.message);
    }
}

main();
