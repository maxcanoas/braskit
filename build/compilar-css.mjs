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

/* Devolve o conteudo do <body> e, separadamente, as classes da propria tag
   <body>. Sem isso as classes escritas em <body class="..."> nunca sao
   escaneadas pelo Tailwind, e utilitarios como .bg-neutro-50 e .font-corpo
   somem do tw.css. */
function corpo(arquivo) {
  const html = readFileSync(resolve(raiz, arquivo), "utf-8");
  const inicio = html.indexOf("<body");
  const aberto = html.indexOf(">", inicio) + 1;
  const fim = html.lastIndexOf("</body>");
  const tag = html.slice(inicio, aberto);
  const classes = (tag.match(/class="([^"]*)"/) || [, ""])[1];
  return { html: html.slice(aberto, fim), classes };
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

const paginaIndex = corpo("index.html");
const paginaCatalogo = corpo("catalogo.html");

/* Classes que so aparecem em runtime (toggles do JS) e as da propria tag
   <body>, que o fatiamento acima deixa de fora do conteudo. */
const listaSegura =
  '<div class="hidden py-2 py-4 ' + paginaIndex.classes + " " + paginaCatalogo.classes + '"></div>';

const pagina = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<style type="text/tailwindcss">${tema}</style>
<script src="../vendor/tailwind-browser.js"></script>
</head>
<body>
${listaSegura}
${paginaIndex.html}
${paginaCatalogo.html}
<script src="../js/main.js"></script>
<script src="../js/produtos.js"></script>
<script src="../js/orcamento.js"></script>
<script src="../js/catalogo.js"></script>
</body>
</html>`;

writeFileSync(resolve(raiz, "build/compile.html"), pagina);

const navegador = await chromium.launch();
const aba = await navegador.newPage();
await aba.addInitScript(() => {
  window.__errosDeConsole = [];
  window.addEventListener("error", (e) => window.__errosDeConsole.push(String(e.message)));
});
aba.on("pageerror", (e) => console.error("erro na pagina: " + e.message));
await aba.goto("file://" + resolve(raiz, "build/compile.html"), { waitUntil: "load" });

/* O grid do catalogo e montado por js/catalogo.js. Se ele nao renderizar, as
   classes que so existem no card gerado (px-2.5, bg-petroleo-900/8,
   tracking-[0.12em], text-petroleo-700, leading-tight, text-left) somem do
   tw.css sem nenhum erro visivel. Falhar aqui e melhor que descobrir depois. */
await aba.waitForTimeout(600);
const cartoes = await aba.evaluate(() => {
  const grid = document.getElementById("gridProdutos");
  return grid ? grid.children.length : -1;
});
if (cartoes < 34) {
  const erros = await aba.evaluate(() => window.__errosDeConsole || []);
  console.error("Grid do catalogo nao renderizou: " + cartoes + " cartoes (esperado 34).");
  if (erros.length) console.error(erros.join(String.fromCharCode(10)));
  await navegador.close();
  process.exit(1);
}

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

/* O build reescreve tw.css inteiro a partir do DOM daquele instante. Uma queda
   grande de tamanho quase sempre quer dizer que algo nao renderizou. */
try {
  const anteriorCss = readFileSync(resolve(raiz, "css/tw.css"), "utf-8");
  const queda = 1 - css.length / anteriorCss.length;
  if (queda > 0.05) {
    console.error(
      "Compilacao suspeita: tw.css encolheria " + Math.round(queda * 100) + "% " +
      "(" + anteriorCss.length + " -> " + css.length + " bytes). " +
      "Rode com FORCAR_CSS=1 se a reducao for intencional."
    );
    if (!process.env.FORCAR_CSS) process.exit(1);
  }
} catch { /* primeira geracao: nao ha anterior */ }

const cabecalho = `/* ==========================================================================
   BRASKIT | utilitarios compilados (gerado por build/compilar-css.mjs)
   Nao edite este arquivo a mao. Para classes novas no HTML, rode:
   node build/compilar-css.mjs
   ========================================================================== */
`;
writeFileSync(resolve(raiz, "css/tw.css"), cabecalho + css);
console.log("css/tw.css gerado com " + css.length + " bytes");
