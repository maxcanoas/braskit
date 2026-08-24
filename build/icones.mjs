import { resolve } from "node:path";
import { readFileSync, writeFileSync } from "node:fs";
import { chromium } from "playwright";
const raiz = resolve(import.meta.dirname, "..");
const nav = await chromium.launch();

// OG 1200x630
let aba = await nav.newPage({ viewport: { width: 1200, height: 630 } });
await aba.goto("file://" + resolve(raiz, "build/og.html"));
await aba.waitForTimeout(300);
await aba.screenshot({ path: resolve(raiz, "assets/og-braskit.png") });

// Apple touch icon 180x180 a partir do favicon
const svg = readFileSync(resolve(raiz, "assets/favicon.svg"), "utf-8");
const pagina = `<!DOCTYPE html><html><head><style>*{margin:0}body{width:180px;height:180px}svg{width:180px;height:180px;display:block}</style></head><body>${svg}</body></html>`;
writeFileSync(resolve(raiz, "build/icone.html"), pagina);
let aba2 = await nav.newPage({ viewport: { width: 180, height: 180 } });
await aba2.goto("file://" + resolve(raiz, "build/icone.html"));
await aba2.waitForTimeout(200);
await aba2.screenshot({ path: resolve(raiz, "assets/apple-touch-icon.png") });

await nav.close();
console.log("icones gerados");
