/**
 * Playwright script to capture polished demo screenshots for the README.
 *
 * Produces:
 *   docs/demo-hero.png      — Main hero image: full editor with a rich diagram
 *   docs/demo-subgraphs.png — Subgraph & auto-layout showcase
 *   docs/demo-preview.png   — Live Mermaid preview panel close-up
 *
 * Usage:
 *   1. cd dist/editor && python3 -m http.server 4999
 *   2. node docs/take-screenshots.mjs
 *
 * Requires: npx playwright install chromium
 */

let playwright;
try {
  playwright = await import("playwright");
} catch {
  try {
    playwright = await import("playwright-core");
  } catch {
    console.error("Please install playwright: npm install -D playwright");
    process.exit(1);
  }
}

const { chromium } = playwright;
const EDITOR_URL = "http://localhost:4999/";

// ─── Diagram definitions ───────────────────────────────────────────

const HERO_DIAGRAM = `graph TD
    A([Client App]) --> B{API Gateway}
    B -->|auth| C[Auth Service]
    B -->|route| D[Request Router]
    C --> E((Token Store))
    D --> F[User Service]
    D --> G[Order Service]
    D --> H[Notification Service]
    F --> I[(User DB)]
    G --> J[(Order DB)]
    G --> K[Payment Gateway]
    H -.-> L[Email Provider]
    H -.-> M[Push Service]
    K ==> N((Ledger))
    subgraph Gateway Layer
        B
        C
        E
    end
    subgraph Core Services
        F
        G
        H
    end
    subgraph Data Layer
        I
        J
        N
    end
    subgraph External
        K
        L
        M
    end`;

const SUBGRAPH_DIAGRAM = `graph LR
    A([User]) --> B[Web App]
    B --> C{Load Balancer}
    C --> D[Server 1]
    C --> E[Server 2]
    C --> F[Server 3]
    D --> G[(Primary DB)]
    E --> G
    F --> G
    G -.-> H[(Read Replica)]
    D --> I((Cache))
    E --> I
    F --> I
    subgraph Frontend
        A
        B
    end
    subgraph Backend Cluster
        D
        E
        F
    end
    subgraph Storage
        G
        H
        I
    end`;

// ─── Helpers ───────────────────────────────────────────────────────

function mockRoutes(page, mermaidCode, title, description) {
  page.route("**/api/diagram", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        version: 1,
        mermaid_code: mermaidCode,
        title,
        description,
      }),
    });
  });
  page.route("**/api/submission", (route) => {
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });
}

// ─── Screenshot 1: Hero ────────────────────────────────────────────

async function captureHero(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  mockRoutes(page, HERO_DIAGRAM, "E-Commerce Platform", "Microservice architecture with gateway, core services, and data layer");
  await page.goto(EDITOR_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  // Click "fit view" button if available (the Controls component has it)
  try {
    await page.click('button[title="fit view"]', { timeout: 2000 });
    await page.waitForTimeout(1000);
  } catch {
    // Controls may not have the button accessible, that's fine
  }

  await page.screenshot({ path: "docs/demo-hero.png" });
  console.log("✓ docs/demo-hero.png (1440×900)");
  await page.close();
}

// ─── Screenshot 2: Subgraphs (LR layout) ──────────────────────────

async function captureSubgraphs(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  mockRoutes(page, SUBGRAPH_DIAGRAM, "Scalable Web Architecture", "Horizontal layout with load balancing and replication");
  await page.goto(EDITOR_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  try {
    await page.click('button[title="fit view"]', { timeout: 2000 });
    await page.waitForTimeout(1000);
  } catch {}

  await page.screenshot({ path: "docs/demo-subgraphs.png" });
  console.log("✓ docs/demo-subgraphs.png (1440×900)");
  await page.close();
}

// ─── Screenshot 3: Mermaid preview close-up ────────────────────────

async function capturePreview(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  mockRoutes(page, HERO_DIAGRAM, "E-Commerce Platform", "Microservice architecture");
  await page.goto(EDITOR_URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(5000);

  // Capture just the right-side preview panel
  const previewPanel = await page.$('div[style*="overflow"]');
  if (previewPanel) {
    await previewPanel.screenshot({ path: "docs/demo-preview.png" });
    console.log("✓ docs/demo-preview.png (preview panel)");
  } else {
    // Fallback: crop the right 35% of the screen
    await page.screenshot({
      path: "docs/demo-preview.png",
      clip: { x: 940, y: 60, width: 500, height: 700 },
    });
    console.log("✓ docs/demo-preview.png (cropped right panel)");
  }
  await page.close();
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
  const browser = await chromium.launch();
  console.log("Capturing demo screenshots...\n");

  await captureHero(browser);
  await captureSubgraphs(browser);
  await capturePreview(browser);

  await browser.close();
  console.log("\nDone! Update README image paths if needed.");
}

main().catch(console.error);
