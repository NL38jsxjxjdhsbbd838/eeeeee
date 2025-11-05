import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const PROFILE_URL = "https://funpay.com/profile/lots/";
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || "10", 10);
const HEADLESS = process.env.HEADLESS !== "false";

async function loadCookies(page) {
  try {
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
    await page.setCookie(...cookies);
    console.log("✅ Cookies загружены");
  } catch (err) {
    console.error("❌ Ошибка загрузки cookies:", err);
    process.exit(1);
  }
}

async function getAllLotLinks(page) {
  console.log("🌐 Получаем все лоты с профилем...");

  await page.goto(PROFILE_URL, { waitUntil: "networkidle2" });

  // Ждём контейнеры лотов
  try {
    await page.waitForSelector(".my-lot", { timeout: 15000 });
  } catch {
    throw new Error("❌ Не удалось загрузить лоты — проверьте куки или страницу профиля!");
  }

  // Скроллим, чтобы подгрузить все лоты
  let previousHeight;
  do {
    previousHeight = await page.evaluate("document.body.scrollHeight");
    await page.evaluate("window.scrollTo(0, document.body.scrollHeight)");
    await page.waitForTimeout(1000);
  } while ((await page.evaluate("document.body.scrollHeight")) > previousHeight);

  // Получаем ссылки на все лоты
  const links = await page.$$eval(".my-lot a[href^='/lots/']", els =>
    Array.from(new Set(els.map(el => el.href)))
  );

  console.log(`✅ Найдено ${links.length} лотов`);
  return links;
}

async function raiseOffer(page, lotUrl) {
  try {
    await page.goto(lotUrl, { waitUntil: "networkidle2" });

    // Ждём кнопку "Поднять предложение"
    const button = await page.$('button:has-text("Поднять предложение")');
    if (button) {
      await button.click();
      console.log(`✅ Предложение на ${lotUrl} поднято`);
    } else {
      console.log(`⚠️ Кнопка "Поднять предложение" не найдена на ${lotUrl}`);
    }
  } catch (err) {
    console.error(`Ошибка при обновлении лота ${lotUrl}:`, err);
  }
}

async function refreshAllLots(page) {
  const links = await getAllLotLinks(page);

  for (const link of links) {
    await raiseOffer(page, link);
    // Ждём 1–2 сек, чтобы не перегружать сервер
    await page.waitForTimeout(1500);
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

  // Цикл по интервалу
  setInterval(async () => {
    try {
      await refreshAllLots(page);
    } catch (err) {
      console.error("Ошибка при обновлении всех лотов:", err);
    }
  }, INTERVAL_MIN * 60 * 1000);
}

main().catch(console.error);
