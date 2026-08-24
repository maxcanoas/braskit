/* Build do CSS utilitario.
   Monta uma pagina temporaria com o corpo das duas paginas do site, deixa o
   Tailwind de navegador (vendor/tailwind-browser.js) compilar contra o DOM
   real (incluindo o grid do catalogo, que e gerado por JS) e salva a folha
   resultante em css/tw.css. Depois disso as paginas nao carregam framework
   nenhum em runtime. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { chromium } from "playwright";

const raiz = resolve(import.meta.dirname, "..");

function corpo(arquivo) {
  const html = readFileSync(resolve(raiz, arquivo), "utf-8");
  const inicio = html.indexOf("<body");
  const aberto = html.indexOf(">", inicio) + 1;
  const fim = html.lastIndexOf("</body>");
  return html.slice(aberto, fim);
}

const tema = `
  @theme {
    --color-petroleo-950: #062226;
    --color-petroleo-900: #0b3136;
    --color-petroleo-800: #0f3b3f;
    --color-petroleo-700: #155e63;
    --color-hazmat-500: #ff6b00;
    --color-hazmat-400: #ff8a2b;
    --color-alerta-400: #ffc300;
    --color-perigo-500: #e2231a;
    --color-neutro-50: #f6f8f8;
    --color-neutro-900: #101617;
    --font-titulo: "Barlow Condensed", "Arial Narrow", system-ui, sans-serif;
    --font-corpo: "Inter", system-ui, -apple-system, sans-serif;
  }
`;

/* Classes que so aparecem em runtime (toggles do JS) e precisam existir. */
const listaSegura = '<div class="hidden py-2 py-4"></div>';

const pagina = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style type="text/tailwindcss">${tema}</style>
<script src="../vendor/tailwind-browser.js"></script>
</head>
<body>
${listaSegura}
${corpo("index.html")}
${corpo("catalogo.html")}
<script src="../js/main.js"></script>
<script src="../js/produtos.js"></script>
<script src="../js/catalogo.js"></script>
</body>
</html>`;

writeFileSync(resolve(raiz, "build/compile.html"), pagina);

const navegador = await chromium.launch();
const aba = await navegador.newPage();
await aba.goto("file://" + resolve(raiz, "build/compile.html"), { waitUntil: "load" });

/* Espera a folha injetada estabilizar. */
let anterior = -1;
let css = "";
for (let i = 0; i < 30; i++) {
  await aba.waitForTimeout(400);
  css = await aba.evaluate(() => {
    let maior = "";
    for (const s of document.querySelectorAll("style")) {
      if (s.textContent.length > maior.length) maior = s.textContent;
    }
    return maior;
  });
  if (css.length > 20000 && css.length === anterior) break;
  anterior = css.length;
}
await navegador.close();

if (css.length < 20000) {
  console.error("Compilacao suspeita: apenas " + css.length + " bytes.");
  process.exit(1);
}

const cabecalho = `/* ==========================================================================
   BRASKIT | utilitarios compilados (gerado por build/compilar-css.mjs)
   Nao edite este arquivo a mao. Para classes novas no HTML, rode:
   node build/compilar-css.mjs
   ========================================================================== */
`;
writeFileSync(resolve(raiz, "css/tw.css"), cabecalho + css);
console.log("css/tw.css gerado com " + css.length + " bytes");
