#!/usr/bin/env node
// Take a screenshot of a poster HTML file using Playwright
// Usage: node scripts/screenshot.js posters/my-poster.html [output.png]

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function screenshot(htmlPath, outputPath) {
  const absoluteHtml = path.resolve(htmlPath);

  if (!fs.existsSync(absoluteHtml)) {
    console.error(`File not found: ${absoluteHtml}`);
    process.exit(1);
  }

  // Default output to exports/ directory (same as export.js)
  const basename = path.basename(htmlPath, '.html');
  const defaultOutput = outputPath || path.join('exports', `${basename}-preview.png`);
  const absoluteOutput = path.resolve(defaultOutput);

  fs.mkdirSync(path.dirname(absoluteOutput), { recursive: true });

  // Read HTML to detect poster dimensions from body style
  const html = fs.readFileSync(absoluteHtml, 'utf-8');
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

  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  await page.goto(`file://${absoluteHtml}`, { waitUntil: 'networkidle' });

  // Disable the fit-to-window scaling for screenshot
  await page.evaluate(() => {
    document.body.style.transform = 'none';
    document.documentElement.style.background = 'transparent';
  });

  // Wait for fonts to load
  await page.evaluate(() => document.fonts.ready);

  await page.screenshot({ path: absoluteOutput, fullPage: false, clip: { x: 0, y: 0, width, height }, omitBackground: hasTransparentBg });
  await browser.close();

  console.log(`Screenshot saved: ${absoluteOutput} (${width}×${height})`);
  return absoluteOutput;
}

const args = process.argv.slice(2);
if (!args[0]) {
  console.error('Usage: node scripts/screenshot.js <poster.html> [output.png]');
  process.exit(1);
}

screenshot(args[0], args[1]).catch(err => {
  console.error(err);
  process.exit(1);
});
