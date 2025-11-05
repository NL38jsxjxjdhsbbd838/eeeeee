import puppeteer from 'puppeteer';
import fs from 'fs';

// Загрузка куки
async function loadCookies(page, path = './cookies.json') {
  if (fs.existsSync(path)) {
    const cookies = JSON.parse(fs.readFileSync(path));
    await page.setCookie(...cookies);
    console.log('✅ Cookies загружены');
  } else {
    console.log('⚠ Cookies файл не найден');
  }
}

// Получение всех лотов с профиля
async function getAllLotLinks(page, profileUrl) {
  console.log(`🌐 Получаем все лоты с профиля ${profileUrl}...`);
  try {
    await page.goto(profileUrl, { waitUntil: 'networkidle2' });

    // Ждем появления ссылок на лоты
    await page.waitForSelector('a[href*="/lots/"]', { timeout: 10000 });

    // Получаем все ссылки
    const lotLinks = await page.$$eval('a[href*="/lots/"]', els => els.map(el => el.href));

    if (!lotLinks.length) {
      throw new Error('❌ Лоты не найдены — проверьте куки или страницу профиля!');
    }

    console.log(`✅ Найдено лотов: ${lotLinks.length}`);
    lotLinks.forEach((link, idx) => console.log(`${idx + 1}: ${link}`));

    return lotLinks;
  } catch (err) {
    console.error('Ошибка при загрузке лотов:', err.message);
    return [];
  }
}

// Пример основного запуска
(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();

  await loadCookies(page);

  const profileUrl = 'https://funpay.com/users/2694790/';
  const lotLinks = await getAllLotLinks(page, profileUrl);

  await browser.close();
})();
