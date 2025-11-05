import puppeteer from 'puppeteer';
import fs from 'fs';

// Загрузка куки из файла
const cookiesPath = './cookies.json';
let cookies = [];
if (fs.existsSync(cookiesPath)) {
    cookies = JSON.parse(fs.readFileSync(cookiesPath));
    console.log('✅ Cookies загружены');
} else {
    console.log('⚠ Cookies не найдены!');
}

// Функция для получения всех ссылок на лоты с профиля
async function getAllLotLinks(profileUrl, page) {
    console.log(`🌐 Получаем все лоты с профиля ${profileUrl}...`);
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });

    // Собираем все ссылки, которые содержат "/lots/"
    const links = await page.$$eval('a[href*="/lots/"]', anchors =>
        anchors.map(a => a.href)
    );

    // Убираем дубли
    const uniqueLinks = [...new Set(links)];

    if (!uniqueLinks.length) {
        throw new Error('❌ Лоты не найдены — проверьте куки или страницу профиля!');
    }

    console.log(`✅ Найдено лотов: ${uniqueLinks.length}`);
    uniqueLinks.forEach((link, i) => console.log(`${i + 1}: ${link}`));
    return uniqueLinks;
}

// Основная функция
async function main() {
    const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();

    // Устанавливаем куки
    if (cookies.length) {
        await page.setCookie(...cookies);
    }

    try {
        const profileUrl = 'https://funpay.com/users/2694790/';
        const lotLinks = await getAllLotLinks(profileUrl, page);

        console.log('🎉 Все лоты обработаны!');
        // Здесь можно добавить дальнейшую обработку лотов
    } catch (err) {
        console.error('Ошибка при обновлении всех лотов:', err.message);
    } finally {
        await browser.close();
        console.log('🌐 Браузер закрыт');
    }
}

main();
