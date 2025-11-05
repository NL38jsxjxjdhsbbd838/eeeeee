import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const PROFILE_URL = "https://funpay.com/users/2694790/";
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || "10", 10);
const HEADLESS = process.env.HEADLESS !== "false";

// Загружаем куки
let cookies = [];
if (fs.existsSync(COOKIE_PATH)) {
    cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
    console.log("✅ Cookies загружены");
} else {
    console.log("⚠ Cookies не найдены!");
}

// Получение всех ссылок на лоты с профиля
async function getAllLotLinks(page) {
    console.log(`🌐 Получаем все лоты с профиля ${PROFILE_URL}...`);
    await page.goto(PROFILE_URL, { waitUntil: "networkidle2" });

    const links = await page.$$eval('a[href*="/lots/"]', anchors => anchors.map(a => a.href));
    const uniqueLinks = [...new Set(links)];

    if (!uniqueLinks.length) {
        console.log("❌ Лоты не найдены!");
        return [];
    }

    console.log(`✅ Найдено лотов: ${uniqueLinks.length}`);
    uniqueLinks.forEach((link, i) => console.log(`${i + 1}: ${link}`));
    return uniqueLinks;
}

// Поднять предложение на лоте
async function raiseOffer(page, lotUrl) {
    try {
        await page.goto(lotUrl, { waitUntil: "networkidle2" });

        // Ищем кнопку "Поднять предложение"
        const [button] = await page.$x("//button[contains(text(), 'Поднять предложение')]");
        if (!button) {
            console.log(`⚠ Кнопка не найдена на лоте: ${lotUrl}`);
            return;
        }

        await button.click();
        console.log(`✅ Предложение поднято: ${lotUrl}`);
    } catch (err) {
        console.log(`❌ Ошибка на лоте ${lotUrl}: ${err.message}`);
    }
}

async function main() {
    const browser = await puppeteer.launch({
        headless: HEADLESS,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    if (cookies.length) await page.setCookie(...cookies);

    try {
        const lotLinks = await getAllLotLinks(page);
        if (!lotLinks.length) return;

        // Поднимаем предложения на всех лотах
        for (const lot of lotLinks) {
            await raiseOffer(page, lot);
        }

        console.log("🎉 Все лоты обработаны!");
    } catch (err) {
        console.error("Ошибка при обработке лотов:", err.message);
    } finally {
        await browser.close();
        console.log("🌐 Браузер закрыт");
    }
}

// Запуск основного цикла с интервалом
async function startLoop() {
    await main();
    setInterval(main, INTERVAL_MIN * 60 * 1000);
}

startLoop();
