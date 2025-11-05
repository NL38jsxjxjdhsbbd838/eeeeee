import puppeteer from "puppeteer";
import fs from "fs";

const COOKIE_PATH = "./cookies.json";
const PROFILE_URL = "https://funpay.com/users/2694790/";
const INTERVAL_MIN = parseInt(process.env.INTERVAL_MIN || "10", 10);
const HEADLESS = process.env.HEADLESS !== "false";

// Функция для загрузки cookies
function loadCookies() {
    if (!fs.existsSync(COOKIE_PATH)) {
        console.error("⚠ Cookies не найдены!");
        return [];
    }
    const cookies = JSON.parse(fs.readFileSync(COOKIE_PATH, "utf8"));
    console.log("✅ Cookies загружены");
    return cookies;
}

// Получение всех ссылок на лоты с профиля
async function getAllLotLinks(page) {
    console.log(`🌐 Получаем все лоты с профиля ${PROFILE_URL}...`);
    await page.goto(PROFILE_URL, { waitUntil: "networkidle2" });

    const links = await page.$$eval("a[href*='/lots/']", anchors =>
        anchors.map(a => a.href)
    );
    const uniqueLinks = [...new Set(links)];

    if (!uniqueLinks.length) throw new Error("❌ Лоты не найдены!");
    console.log(`✅ Найдено лотов: ${uniqueLinks.length}`);
    return uniqueLinks;
}

// Поднятие предложения на одном лоте
async function raiseOffer(page, lotUrl) {
    try {
        await page.goto(lotUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

        // Селектор кнопки "Поднять предложение"
        const buttonSelector = "button:contains('Поднять предложение'), button[data-action='raise']";

        const button = await page.$(buttonSelector);

        if (!button) {
            console.log(`⚠️ Кнопка 'Поднять предложение' не найдена на ${lotUrl}`);
            return;
        }

        // Hover + click через evaluate для надёжности
        await page.evaluate(btn => {
            btn.scrollIntoView({ behavior: "smooth", block: "center" });
            btn.click();
        }, button);

        // Проверка модального окна подтверждения
        try {
            await page.waitForSelector(".modal button.confirm", { timeout: 5000 });
            await page.click(".modal button.confirm");
        } catch {
            // Если модального окна нет — пропускаем
        }

        console.log(`✅ Предложение поднято на лоте ${lotUrl}`);
    } catch (err) {
        console.error(`❌ Ошибка на лоте ${lotUrl}:`, err.message || err);
    }
}

async function main() {
    const cookies = loadCookies();
    if (!cookies.length) return;

    const browser = await puppeteer.launch({
        headless: HEADLESS,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setCookie(...cookies);

    let lotLinks;
    try {
        lotLinks = await getAllLotLinks(page);
    } catch (err) {
        console.error(err.message);
        await browser.close();
        return;
    }

    for (const lotUrl of lotLinks) {
        await raiseOffer(page, lotUrl);
    }

    console.log("🎉 Все лоты обработаны!");
    await browser.close();
}

main().catch(err => console.error("Ошибка при запуске бота:", err));
