/**
 * Playwright script that opens the Mermaid editor with a mock diagram
 * and takes a demo screenshot for the README.
 *
 * Usage:
 *   1. Start a static server: cd dist/editor && python3 -m http.server 4999
 *   2. Run: npx playwright test docs/take-demo-screenshot.mjs
 *
 * Or run directly if playwright is installed:
 *   node docs/take-demo-screenshot.mjs
 *
 * Requires: npx playwright install chromium
 */

// Try to resolve playwright from npx cache or global install
let playwright;
try {
  playwright = await import("playwright");
} catch {
  // If playwright is not installed as a dep, try playwright-core
  try {
    playwright = await import("playwright-core");
  } catch {
    console.error("Please install playwright: npm install -D playwright");
    process.exit(1);
  }
}

const { chromium } = playwright;

const EDITOR_URL = "http://localhost:4999/";
const OUTPUT_PATH = "docs/editor-demo.png";

// Sample Mermaid diagram to show in the editor
const SAMPLE_MERMAID = `graph TD
    A[User Request] --> B{API Gateway}
    B --> C[Auth Service]
    B --> D[Rate Limiter]
    C --> E((Session Store))
    D --> F[Request Handler]
    F --> G[(Database)]
    F --> H[Cache Layer]
    H --> G
    subgraph Backend Services
        C
        D
        F
    end
    subgraph Data Layer
        G
        H
        E
    end`;

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  // Intercept /api/diagram to provide mock diagram data
  let requestCount = 0;
  await page.route("**/api/diagram", (route) => {
    requestCount++;
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: 1,
        mermaid_code: SAMPLE_MERMAID,
        title: "System Architecture",
        description: "API gateway with backend services and data layer",
      }),
    });
  });

  // Also intercept /api/submission to prevent errors
  await page.route("**/api/submission", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto(EDITOR_URL, { waitUntil: "networkidle" });

  // Wait for the diagram to be loaded and rendered
  await page.waitForTimeout(4000);

  // Take screenshot
  await page.screenshot({ path: OUTPUT_PATH });
  console.log(`Screenshot saved to ${OUTPUT_PATH}`);
  console.log(`API requests intercepted: ${requestCount}`);

  await browser.close();
}

main().catch(console.error);
