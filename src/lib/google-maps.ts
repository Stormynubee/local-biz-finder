import chromium from "@sparticuz/chromium";
import { existsSync } from "node:fs";
import puppeteer from "puppeteer-core";
import type { Browser } from "puppeteer-core";
import type { BusinessData } from "@/lib/api";

type ScrapedBusiness = Omit<BusinessData, "id"> & {
  mapsUrl: string;
};

const localExecutablePaths = [
  process.env.CHROME_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
  "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
].filter((path): path is string => Boolean(path));

function hashId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

async function getBrowser() {
  const isVercel = Boolean(process.env.VERCEL);
  const executablePath = isVercel
    ? await chromium.executablePath()
    : localExecutablePaths.find((path) => existsSync(path));

  if (!executablePath) {
    throw new Error("No local Chrome or Edge executable was found for Google Maps scraping.");
  }

  return puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      ...chromium.args,
      "--disable-blink-features=AutomationControlled",
      "--disable-dev-shm-usage",
      "--disable-web-security",
      "--no-sandbox",
      "--disable-setuid-sandbox",
    ],
    defaultViewport: { width: 1366, height: 900 },
  });
}

export async function scrapeGoogleMapsBusinesses(location: string, businessType: string): Promise<BusinessData[]> {
  let browser: Browser | undefined;
  const queryType = businessType === "all" || !businessType ? "businesses" : businessType;
  const query = `${queryType} in ${location}`;
  const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;

  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    page.setDefaultTimeout(12000);
    page.setDefaultNavigationTimeout(18000);

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36"
    );
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 18000 });

    await page
      .waitForFunction(
        () => document.querySelectorAll('a[href*="/maps/place/"]').length > 0 || Boolean(document.querySelector('div[role="feed"]')),
        { timeout: 12000 }
      )
      .catch(() => undefined);

    await page.evaluate(async () => {
      const feed = document.querySelector('div[role="feed"]');
      for (let index = 0; index < 4; index += 1) {
        if (feed) {
          feed.scrollBy(0, 1200);
        } else {
          window.scrollBy(0, 1200);
        }
        await new Promise((resolve) => window.setTimeout(resolve, 650));
      }
    });

    const scraped = await page.evaluate(() => {
      const parseCoordinate = (href: string, marker: string) => {
        const match = href.match(new RegExp(`${marker}([-0-9.]+)`));
        return match?.[1] ? Number.parseFloat(match[1]) : 0;
      };

      const looksLikePhone = (value: string) => /(?:\+?\d[\d\s().-]{6,}\d)/.test(value);
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href*="/maps/place/"]'));
      const results: ScrapedBusiness[] = [];

      for (const link of links) {
        const href = link.href;
        const name = link.getAttribute("aria-label")?.trim() || link.textContent?.trim();
        if (!name || !href) continue;

        const card = link.closest<HTMLElement>('[role="article"], .Nv2PK') ?? link.parentElement;
        const lines = (card?.innerText ?? "")
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);
        const phone = lines.find(looksLikePhone);
        const websiteLink = card?.querySelector<HTMLAnchorElement>(
          'a[data-value="Website"], a[aria-label*="Website"], a[href^="http"]:not([href*="google."]):not([href*="gstatic."])'
        );
        const lat = parseCoordinate(href, "!3d") || Number((href.match(/@([-0-9.]+),/) ?? [])[1] ?? 0);
        const lon = parseCoordinate(href, "!4d") || Number((href.match(/@[-0-9.]+,([-0-9.]+)/) ?? [])[1] ?? 0);

        results.push({
          name,
          type: "Google Maps Business",
          lat,
          lon,
          address: lines.find((line) => line !== name && !looksLikePhone(line) && line.length > 8) ?? "Open in Maps for address",
          phone,
          website: websiteLink?.href,
          hasWebsite: Boolean(websiteLink?.href),
          source: "google",
          mapsUrl: href,
        });
      }

      return results;
    });

    const uniqueBusinesses = Array.from(
      new Map(
        scraped.map((business) => [
          business.name.toLowerCase(),
          {
            id: hashId(`${business.name}-${business.mapsUrl}`),
            ...business,
          },
        ])
      ).values()
    );

    if (uniqueBusinesses.length === 0) {
      throw new Error("Google Maps did not return visible business results. Try a more specific location or business type.");
    }

    return uniqueBusinesses.slice(0, 40);
  } finally {
    await browser?.close();
  }
}
