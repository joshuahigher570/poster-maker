#!/usr/bin/env node

// Usage: node scripts/export.js posters/my-poster.html [--pdf]
// Exports to exports/ folder as PNG (default, 2x resolution) or PDF

const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");

async function main() {
  const args = process.argv.slice(2);
  const pdfMode = args.includes("--pdf");
  const htmlFile = args.find((a) => a.endsWith(".html"));

  if (!htmlFile) {
    console.error("Usage: node scripts/export.js <path-to-poster.html> [--pdf]");
    process.exit(1);
  }

  const absolutePath = path.resolve(htmlFile);
  if (!fs.existsSync(absolutePath)) {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  // Read HTML to detect poster dimensions from body style
  const html = fs.readFileSync(absolutePath, "utf-8");
  let width = 1080;
  let height = 1920;

  // Match dimensions in the body { ... } block to avoid matching nested elements
  const bodyBlock = html.match(/body\s*\{[^}]*\}/);
  if (bodyBlock) {
    const widthMatch = bodyBlock[0].match(/width\s*:\s*(\d+)px/);
    const heightMatch = bodyBlock[0].match(/height\s*:\s*(\d+)px/);
    if (widthMatch) width = parseInt(widthMatch[1]);
    if (heightMatch) height = parseInt(heightMatch[1]);
  }

  // Detect transparent background on body
  const hasTransparentBg = bodyBlock && /background\s*:\s*transparent/.test(bodyBlock[0]);

  const basename = path.basename(htmlFile, ".html");
  const ext = pdfMode ? "pdf" : "png";
  const outputPath = path.join("exports", `${basename}.${ext}`);

  fs.mkdirSync("exports", { recursive: true });

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`file://${absolutePath}`, { waitUntil: "networkidle" });

  // Disable the fit-to-window scaling for export
  await page.evaluate(() => {
    document.body.style.transform = "none";
    document.documentElement.style.background = "transparent";
  });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  if (pdfMode) {
    await page.pdf({
      path: outputPath,
      width: `${width}px`,
      height: `${height}px`,
      printBackground: true,
    });
  } else {
    await page.screenshot({
      path: outputPath,
      fullPage: false,
      clip: { x: 0, y: 0, width, height },
      omitBackground: hasTransparentBg,
    });
  }

  await browser.close();
  console.log(`Exported: ${outputPath} (${width}×${height})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
