import puppeteer from "puppeteer";
import fs from "fs";

// Загружаем куки
const cookies = JSON.parse(fs.readFileSync("./cookies.json", "utf-8"));

// Ссылка на профиль
const profileUrl = "https://funpay.com/users/2694790/";

async function getAllLotLinks(page) {
  console.log(`🌐 Получаем все лоты с профиля ${profileUrl}...`);
  await page.goto(profileUrl, { waitUntil: "networkidle2" });

  // Получаем все ссылки на лоты
  const links = await page.$$eval('a[href^="/lots/"]', anchors => anchors.map(a => a.href));
  
  // Убираем дубли
  return [...new Set(links)];
}

async function updateLot(page, url) {
  try {
    console.log(`🌐 Открываем лот: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2" });

    const updateSelector = 'button:has-text("Обновить")';
    await page.waitForSelector(updateSelector, { timeout: 5000 });
    await page.click(updateSelector);

    console.log(`✅ Лот обновлен: ${url}`);
    await page.waitForTimeout(1000);
  } catch (error) {
    console.log(`❌ Не удалось обновить лот ${url}: ${error.message}`);
  }
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();
  await page.setCookie(...cookies);
  console.log(`✅ Cookies загружены`);

  const lotLinks = await getAllLotLinks(page);
  console.log(`✅ Найдено лотов: ${lotLinks.length}`);

  for (const url of lotLinks) {
    await updateLot(page, url);
  }

  console.log("🎉 Все лоты обработаны!");
  await browser.close();
}

main();
