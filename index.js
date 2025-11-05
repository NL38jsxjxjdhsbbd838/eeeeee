import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const PROFILE_URL = "https://funpay.com/users/2694790/";
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || "10", 10);
const HEADLESS = process.env.HEADLESS !== "false";

async function main() {
  const browser = await puppeteer.launch({
    headless: HEADLESS,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  // Загружаем cookies
  if (!fs.existsSync(COOKIE_PATH)) {
    console.log("⚠️ Файл cookies не найден!");
    process.exit(1);
  }

  const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
  await page.setCookie(...cookies);
  console.log("✅ Cookies загружены.");

  async function autoScroll() {
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const timer = setInterval(() => {
          const scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
  }

  async function getAllLotLinks() {
    console.log("🌐 Получаем все лоты с профиля...");
    await page.goto(PROFILE_URL, { waitUntil: "networkidle2" });
    await autoScroll();

    const lotLinks = await page.$$eval('a[href^="/lots/"]', links =>
      links.map(link => link.href)
    );

    if (lotLinks.length === 0)
      throw new Error("❌ Не удалось загрузить лоты — проверьте куки или страницу профиля!");

    console.log(`✅ Найдено ${lotLinks.length} лотов`);
    return lotLinks;
  }

  async function refreshLot(lotUrl) {
    try {
      const lotPage = await browser.newPage();
      await lotPage.setCookie(...cookies);
      await lotPage.goto(lotUrl, { waitUntil: "networkidle2" });

      // Ждём кнопку «Поднять предложение»
      const buttonSelector = 'button:has-text("Поднять предложение")';
      await lotPage.waitForSelector(buttonSelector, { timeout: 5000 });

      await lotPage.click(buttonSelector);
      console.log(`✅ Лот обновлён: ${lotUrl}`);
      await lotPage.close();
    } catch (err) {
      console.error(`⚠️ Не удалось обновить лот: ${lotUrl}`, err.message);
    }
  }

  async function refreshAllLots() {
    try {
      const lotLinks = await getAllLotLinks();
      for (const link of lotLinks) {
        await refreshLot(link);
        await new Promise(r => setTimeout(r, 2000)); // пауза между лотами
      }
      console.log(`🔄 Все лоты обновлены. Следующий запуск через ${INTERVAL_MIN} минут.`);
    } catch (err) {
      console.error("Ошибка при обновлении всех лотов:", err.message);
    }
  }

  // Первое обновление сразу
  await refreshAllLots();

  // Запускаем цикл по интервалу
  setInterval(refreshAllLots, INTERVAL_MIN * 60 * 1000);
}

main().catch(console.error);
