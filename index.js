import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const URL = "https://funpay.com/lots/696/trade";
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || "10", 10);
const HEADLESS = process.env.HEADLESS !== "false";

async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Загружаем cookies
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
    await page.setCookie(...cookies);
    console.log("✅ Cookies загружены.");
  } catch (err) {
    console.error("⚠️ Не удалось загрузить cookies:", err);
    return;
  }

  // Переходим на страницу с увеличенным таймаутом
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    console.log("✅ Страница открыта.");
  } catch (err) {
    console.warn("⚠️ Таймаут при загрузке страницы, пробуем продолжить:", err.message);
  }

  async function refreshOffers() {
    try {
      console.log("🔄 Обновляем предложения...");
      await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 });

      // Проверяем iframe, если контент подгружается в нем
      const frame = page.frames().find(f => f.url().includes('/lots/696/trade')) || page;

      // Ждём появления кнопки «Обновить» до 20 секунд
      const refreshButton = await frame.waitForSelector('button:has-text("Обновить")', { timeout: 20000 });

      if (refreshButton) {
        await refreshButton.click();
        console.log("✅ Предложения обновлены!");
      } else {
        console.log("⚠️ Кнопка 'Обновить' не найдена!");
      }
    } catch (err) {
      console.error("Ошибка при обновлении:", err.message || err);
    }
  }

  // Первое обновление сразу
  await refreshOffers();

  // Цикл каждые INTERVAL_MIN минут
  setInterval(refreshOffers, INTERVAL_MIN * 60 * 1000);
}

main().catch(err => console.error("Ошибка при запуске бота:", err));

