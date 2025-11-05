import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const PROFILE_URL = "https://funpay.com/users/me/lots";
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

    // Проверяем, что мы авторизованы
    const loggedIn = await page.$('a[href^="/users/"]');
    if (!loggedIn) {
      throw new Error("❌ Не удалось войти в аккаунт — проверь cookies!");
    }

    // Ждём лоты (до 30 секунд)
    try {
      await page.waitForSelector('a[href^="/lots/"]', { timeout: 30000 });
    } catch {
      console.log("⚠️ Не удалось найти лоты. Возможно, их нет или страница не прогрузилась.");
      return [];
    }

    // Получаем все ссылки
    const links = await page.evaluate(() => {
      const anchors = Array.from(document.querySelectorAll('a[href^="/lots/"]'));
      return anchors.map(a => a.href);
    });

    const uniqueLinks = [...new Set(links)];
    console.log(`🔹 Найдено лотов: ${uniqueLinks.length}`);
    return uniqueLinks;
  }

  async function refreshLot(url) {
    try {
      console.log(`🌐 Открываем лот: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      const timestamp = new Date().toLocaleString();

      // Ищем кнопку "Поднять предложения"
      const buttons = await page.$$('button');
      let found = false;

      for (const btn of buttons) {
        const text = await page.evaluate(el => el.innerText, btn);
        if (text.includes("Поднять предложения")) {
          await btn.click();
          console.log(`✅ [${timestamp}] Поднял предложения на ${url}`);
          found = true;
          break;
        }
      }

      if (!found) {
        console.log(`⚠️ [${timestamp}] Кнопка 'Поднять предложения' не найдена на ${url}`);
      }

      await page.waitForTimeout(2000);
    } catch (err) {
      console.error(`❌ Ошибка при обновлении лота (${url}):`, err.message);
    }
  }

  async function refreshAllLots() {
    const lotLinks = await getAllLotLinks();
    if (lotLinks.length === 0) {
      console.log("⚠️ Лоты не найдены. Пропускаем цикл.");
      return;
    }

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
