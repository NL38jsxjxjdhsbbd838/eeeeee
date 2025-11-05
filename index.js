import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const PROFILE_URL = "https://funpay.com/users/2694790/"; // твой профиль
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || "10", 10);
const HEADLESS = process.env.HEADLESS !== "false";

async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Загружаем cookies
  const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
  await page.setCookie(...cookies);
  console.log("✅ Cookies загружены.");

  async function getAllLotLinks() {
    console.log("🌐 Получаем все лоты с профиля...");
    await page.goto(PROFILE_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Ждём загрузки списка лотов
    await page.waitForSelector('a[href^="/lots/"]', { timeout: 10000 });

    // Получаем все ссылки на лоты
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href^="/lots/"]'));
      return anchors.map(a => a.href);
    });

    // Убираем дубли
    const uniqueLinks = [...new Set(links)];
    console.log(`🔹 Найдено лотов: ${uniqueLinks.length}`);
    return uniqueLinks;
  }

  async function refreshLot(url) {
    try {
      console.log(`🌐 Открываем лот: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      // Ждём кнопку "Поднять предложения"
      await page.waitForSelector('button', { timeout: 10000 });
      const raiseButton = await page.$('button:has-text("Поднять предложения")');

      const timestamp = new Date().toLocaleString();

      if (raiseButton) {
        await raiseButton.click();
        console.log(`✅ [${timestamp}] Предложения подняты!`);
      } else {
        console.log(`⚠️ [${timestamp}] Кнопка 'Поднять предложения' не найдена!`);
      }

      // Даем FunPay обработать клик
      await page.waitForTimeout(2000);
    } catch (err) {
      console.error(`Ошибка при обновлении лота (${url}):`, err);
    }
  }

  async function refreshAllLots() {
    const lotLinks = await getAllLotLinks();
    for (const url of lotLinks) {
      await refreshLot(url);
    }
    console.log(`⏱ Следующее обновление через ${INTERVAL_MIN} минут.`);
  }

  // Первое обновление сразу
  await refreshAllLots();

  // Цикл каждые INTERVAL_MIN минут
  setInterval(refreshAllLots, INTERVAL_MIN * 60 * 1000);
}

main().catch(console.error);
