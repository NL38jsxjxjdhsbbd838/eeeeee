import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const URL = "https://funpay.com/my/ads";
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
  console.log("✅ Cookies загружены. Открываем страницу...");

  await page.goto(URL, { waitUntil: "networkidle2" });

  async function refreshOffers() {
    try {
      console.log("🔄 Обновляем предложения...");
      await page.reload({ waitUntil: "networkidle2" });

      // 👇 Вставь точный селектор кнопки «Обновить» (подсмотрим далее)
      const refreshButton = await page.$(#content > div > div > div.col-md-10.col-sm-9 > div.page-content > div.row > div.col-lg-6.col-md-7 > div > div:nth-child(1) > button);
      if (refreshButton) {
        await refreshButton.click();
        console.log("✅ Предложения обновлены!");
      } else {
        console.log("⚠️ Кнопка 'Обновить' не найдена!");
      }
    } catch (err) {
      console.error("Ошибка при обновлении:", err);
    }
  }

  // Первое обновление сразу
  await refreshOffers();

  // Цикл каждые INTERVAL_MIN минут
  setInterval(refreshOffers, INTERVAL_MIN * 60 * 1000);
}

main().catch(console.error);
