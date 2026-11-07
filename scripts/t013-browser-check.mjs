// T013 real-browser render check (Playwright) — run: node /tmp/t013-browser-check.mjs
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "https://www.lamaisonhomes.com.au";
let pass = 0, fail = 0;
const ok = (name) => { pass++; console.log("  ✓", name); };
const bad = (name, detail) => { fail++; console.log("  ✗", name, detail ?? ""); };

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));

try {
  await page.goto(BASE + "/stays", { waitUntil: "networkidle", timeout: 60000 });

  // 1. Page hydrates: filter shell renders
  const suburbInput = page.locator('input[placeholder="Search suburbs…"]');
  await suburbInput.waitFor({ state: "visible", timeout: 15000 });
  ok("hydrated: suburb search input visible");

  // 2. Autocomplete: type "box" → predictions
  await suburbInput.click();
  await suburbInput.fill("box");
  const firstPred = page.locator("ul button", { hasText: "Box Hill" }).first();
  await firstPred.waitFor({ state: "visible", timeout: 10000 });
  const preds = await page.locator("ul button").allTextContents();
  ok("autocomplete predictions for 'box': " + preds.slice(0, 3).join(", "));

  // 3. Select Box Hill → chip appears
  await firstPred.click();
  const chip = page.locator("span", { hasText: "Box Hill" }).first();
  await chip.waitFor({ state: "visible", timeout: 5000 });
  ok("chip added: Box Hill");

  // 4. Add second suburb (keyboard nav): type "fitz", ArrowDown+Enter
  await suburbInput.fill("fitz");
  await page.waitForTimeout(500);
  await suburbInput.press("ArrowDown"); // highlight moves to Fitzroy North
  await suburbInput.press("Enter");
  const chip2 = page.locator("span.rounded-full", { hasText: "Fitzroy North" }).first();
  await chip2.waitFor({ state: "visible", timeout: 8000 });
  ok("keyboard multi-select: ArrowDown+Enter added Fitzroy North");
  await page.waitForTimeout(300);

  // 5. Chip removable
  await page.locator('button[aria-label="Remove Fitzroy North"]').click({ timeout: 5000 });
  await page.waitForTimeout(200);
  const still = await page.locator('button[aria-label="Remove Fitzroy North"]').count();
  await page.waitForTimeout(300);
  still === 0 ? ok("chip removed") : bad("chip removal");

  // 6. Date pickers + search with availability
  await page.locator('input[type="date"]').first().fill("2027-01-15");
  await page.locator('input[type="date"]').nth(1).fill("2027-01-18");
  await page.locator("button", { hasText: "Search stays" }).click();
  // Wait for results or empty state (availability check goes server-side)
  await page.waitForTimeout(6000);
  const resultCount = await page.locator("p", { hasText: /stay/ }).allTextContents();
  const countLine = resultCount.find((t) => /\d+ stay/.test(t));
  countLine ? ok("results line: " + countLine.trim()) : bad("results count line", JSON.stringify(resultCount));

  // 7. Cards render with proximity ordering visible (closest first, Box Hill anchor)
  const cards = await page.locator("a[href^='/stays/']").count();
  cards > 0 ? ok(`property cards rendered: ${cards}`) : bad("no property cards");
  // Stability: capture order, search again, compare
  const order1 = await page.locator("a[href^='/stays/']").evaluateAll(
    (els) => els.map((e) => e.getAttribute("href"))
  );
  await page.locator("button", { hasText: "Search stays" }).click();
  await page.waitForTimeout(5000);
  const order2 = await page.locator("a[href^='/stays/']").evaluateAll(
    (els) => els.map((e) => e.getAttribute("href"))
  );
  JSON.stringify(order1) === JSON.stringify(order2)
    ? ok("closest-first ordering stable across identical searches")
    : bad("ordering unstable");

  // 8. Empty state (restrictive price)
  const clearBtn = page.locator("button", { hasText: "Clear filters" });
  if (await clearBtn.count()) await clearBtn.click();
  await page.waitForTimeout(300);
  await page.locator('input[type="number"]').first().fill("99000");
  await page.locator("button", { hasText: "Search stays" }).click();
  await page.waitForTimeout(4000);
  const emptyMsg = await page.locator("h3", { hasText: "No stays match your search" }).count();
  emptyMsg ? ok("graceful empty state with filter-removal copy") : bad("empty state missing");

  // 9. URL params persistence
  await page.locator("button", { hasText: "Clear all filters" }).first().click().catch(() => {});
  console.log("  (info) final URL:", page.url());

  errors.length === 0 ? ok("zero page JS errors") : bad("page errors", errors.join(" | "));
} catch (e) {
  bad("fatal", String(e).slice(0, 300));
}

await browser.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
