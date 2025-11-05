import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const HEADLESS = process.env.HEADLESS !== "false";
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || "10", 10);

async function loadCookies(page) {
  if (!fs.existsSync(COOKIE_PATH)) {
    throw new Error("❌ Файл cookies.json не найден!");
  }
  const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
  await page.setCookie(...cookies);
  console.log("✅ Cookies загружены.");
}

async function getAllLotLinks(page) {
  console.log("🌐 Получаем все лоты с профиля...");
  await page.goto("https://funpay.com/profile/lots/", { waitUntil: "networkidle2" });

  // Ждём, пока загрузятся ссылки на лоты
  await page.waitForSelector('a[href^="/lots/"]', { timeout: 10000 });

  const links = await page.$$eval('a[href^="/lots/"]', els => {
    // Берём уникальные ссылки на лоты
    return Array.from(new Set(els.map(el => el.href)));
  });

  console.log(`✅ Найдено ${links.length} лотов.`);
  return links;
}

async function raiseLot(page, url) {
  try {
    await page.goto(url, { waitUntil: "networkidle2" });

    // Подбираем кнопку "Поднять предложения"
    const button = await page.$('button:has-text("Поднять предложения")');

    if (button) {
      await button.click();
      console.log(`✅ Предложения подняты для: ${url}`);
    } else {
      console.log(`⚠️ Кнопка 'Поднять предложения' не найдена: ${url}`);
    }
  } catch (err) {
    console.error(`Ошибка при поднятии предложений для ${url}:`, err.message);
  }
}

async function refreshAllLots(page) {
  try {
    const lotLinks = await getAllLotLinks(page);
    for (const link of lotLinks) {
      await raiseLot(page, link);
      // Небольшая задержка между лотами, чтобы не банили
      await new Promise(r => setTimeout(r, 1500));
    }
  } catch (err) {
    console.error("Ошибка при обновлении всех лотов:", err.message);
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await loadCookies(page);

  // Первое обновление сразу
  await refreshAllLots(page);

  // Дальше по интервалу
  setInterval(() => refreshAllLots(page), INTERVAL_MIN * 60 * 1000);
}

main().catch(err => console.error("Ошибка при запуске бота:", err));
