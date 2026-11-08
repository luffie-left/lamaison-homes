import { chromium } from "playwright";
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1400 } });
const errors = []; page.on("pageerror", e => errors.push(String(e)));
let pass=0, fail=0; const ok=n=>{pass++;console.log("  ✓",n)}; const bad=(n,d)=>{fail++;console.log("  ✗",n,d??"")};
try {
  await page.goto("https://www.lamaisonhomes.com.au/stays/north-sentinel-apartment", { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(3000);
  const dayCells = page.locator("div.grid div.w-8.h-8");
  const cnt = await dayCells.count();
  console.log("  (info) day cells:", cnt);
  const cells = await dayCells.allTextContents();
  const idx10 = cells.findIndex((t,i) => i > 35 && t.trim() === "10");
  if (idx10 < 0) throw new Error("day 10 not found");
  await dayCells.nth(idx10).click(); await page.waitForTimeout(200);
  await dayCells.nth(idx10 + 1).click(); await page.waitForTimeout(600);
  const reserve = page.locator("button", { hasText: "Reserve" }).first();
  if (await reserve.isDisabled()) throw new Error("Reserve disabled (listing minStay set?) — listing-level cue case");
  await reserve.click(); await page.waitForTimeout(500);
  // enquiry form: fill name, email, phone
  await page.locator('input[placeholder="Full name"]').fill("Test Guest");
  await page.locator('input[placeholder="Email address"]').fill("test@example.com");
  const dial = await page.locator("select#phone-dial").count();
  dial ? ok("A3 dial select present") : bad("A3 dial select missing");
  if (dial) {
    await page.locator("select#phone-dial").selectOption("+64");
    await page.locator('input[placeholder*="phone" i], input[type="tel"]').first().fill("211234567");
    await page.waitForTimeout(300);
    const bad2 = await page.locator("text=/Enter a valid phone/").count();
    bad2 === 0 ? ok("A3 valid NZ number accepted") : bad("A3 valid number rejected");
    // invalid phone check
    await page.locator('input[placeholder*="phone" i], input[type="tel"]').first().fill("123");
    await page.waitForTimeout(300);
    (await page.locator("text=/Enter a valid phone/").count()) ? ok("A3 invalid number warned") : bad("A3 no warning for short number");
    await page.locator('input[placeholder*="phone" i], input[type="tel"]').first().fill("211234567");
  }
  // Pay Now (1-night range → server MIN_STAY_NOT_MET expected)
  const payBtn = page.locator("button", { hasText: "Pay $" }).first();
  await payBtn.click();
  // wait for error message
  await page.waitForTimeout(6000);
  const errText = await page.locator("text=/Minimum stay is/").first().textContent().catch(()=>null);
  errText ? ok("A1 real server error surfaced: " + errText.trim()) : bad("A1 min-stay server message not surfaced", JSON.stringify(await page.locator("[class*=red], [class*=amber], [role=alert]").allTextContents().catch(()=>[])));
  const reassurance = await page.locator("text=/secure payment link/").count();
  reassurance ? ok("A4 reassurance copy shown") : bad("A4 reassurance copy missing");
  errors.length===0 ? ok("zero JS errors") : bad("JS errors", errors.join("|").slice(0,150));
} catch (e) { bad("fatal", String(e).slice(0,250)); }
await browser.close();
console.log(`${pass} passed, ${fail} failed`);
