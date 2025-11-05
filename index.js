import puppeteer from "puppeteer";

// ------------------------- Настройки -------------------------
const PROFILE_URL = "https://funpay.com/users/2694790/";
const INTERVAL_MS = 5000; // Интервал между поднятиями лотов
const SCROLL_DELAY = 1000; // Задержка между скроллами

// ------------------------- Cookies -------------------------
const COOKIES = [
  {"domain":".funpay.com","name":"_ga","value":"GA1.1.1316438856.1759053809","path":"/","httpOnly":false,"secure":false},
  {"domain":".funpay.com","name":"_ga_STVL2Q8BNQ","value":"GS2.1.s1762363325$o225$g1$t1762365394$j58$l0$h507574261","path":"/","httpOnly":false,"secure":false},
  {"domain":".funpay.com","name":"_gcl_au","value":"1.1.2128603045.1759053809.1411724305.1761321023.1761321023","path":"/","httpOnly":false,"secure":false},
  {"domain":".funpay.com","name":"_ym_d","value":"1759053808","path":"/","httpOnly":false,"secure":true},
  {"domain":".funpay.com","name":"_ym_isad","value":"1","path":"/","httpOnly":false,"secure":true},
  {"domain":".funpay.com","name":"_ym_uid","value":"1759053808194800855","path":"/","httpOnly":false,"secure":true},
  {"domain":".funpay.com","name":"fav_games","value":"220-141-343-6","path":"/","httpOnly":true,"secure":true},
  {"domain":".funpay.com","name":"golden_key","value":"a8lpun44zgk940cfpxn0t45ruv2pknun","path":"/","httpOnly":true,"secure":true},
  {"domain":"funpay.com","name":"cookie_prefs","value":"1","path":"/","httpOnly":false,"secure":false},
  {"domain":"funpay.com","name":"PHPSESSID","value":"cqLIj7qHEUVdVPPgWNVmclL5ZaIKDPdb","path":"/","httpOnly":true,"secure":true}
];

// ------------------------- Функции -------------------------
async function setCookies(page) {
  console.log("✅ Загружаем cookies...");
  await page.setCookie(...COOKIES);
}

async function scrollToBottom(page) {
  console.log("🌐 Скроллим страницу, чтобы загрузились все лоты...");
  let previousHeight = 0;
  while (true) {
    const height = await page.evaluate(() => document.body.scrollHeight);
    if (height === previousHeight) break;
    previousHeight = height;
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(SCROLL_DELAY);
  }
}

async function getAllLotLinks(page) {
  console.log("🌐 Получаем все лоты с профиля...");
  try {
    await page.waitForSelector('a[href^="/lots/"]', { timeout: 10000 });
  } catch {
    throw new Error("❌ Не удалось найти лоты на странице — проверьте куки или страницу профиля!");
  }

  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll('a[href^="/lots/"]'));
    const uniqueLinks = [...new Set(anchors.map(a => a.href))];
    return uniqueLinks;
  });

  console.log(`✅ Найдено ${links.length} лотов`);
  return links;
}

async function raiseLot(page, url) {
  console.log(`⬆️ Поднимаем лот: ${url}`);
  await page.goto(url, { waitUntil: "networkidle2" });

  try {
    await page.waitForSelector('button:has-text("Поднять предложение")', { timeout: 5000 });
    await page.click('button:has-text("Поднять предложение")');
    console.log("✅ Лот поднят!");
  } catch {
    console.log("⚠️ Кнопка 'Поднять предложение' не найдена или уже поднят");
  }
}

async function refreshAllLots() {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  await setCookies(page);

  console.log(`🌐 Открываем профиль: ${PROFILE_URL}`);
  await page.goto(PROFILE_URL, { waitUntil: "networkidle2" });

  await scrollToBottom(page);

  const lotLinks = await getAllLotLinks(page);

  for (const link of lotLinks) {
    await raiseLot(page, link);
    await page.waitForTimeout(INTERVAL_MS);
  }

  console.log("🎉 Все лоты обработаны!");
  await browser.close();
}

// ------------------------- Старт -------------------------
refreshAllLots().catch(err => {
  console.error("Ошибка при обновлении всех лотов:", err.message);
});
