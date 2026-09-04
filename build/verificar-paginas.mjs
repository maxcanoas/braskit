/* Verificacao das paginas geradas, sem navegador.

   build/verificar.mjs abre Chromium em cinco viewports e e caro: roda numa
   amostra. Este aqui e o oposto -- le HTML como texto e cobre TODAS as 43
   paginas em milissegundos. Um pega layout, o outro pega estrutura.

   O que ele afirma, e por que cada coisa importa:
     - um <h1> por pagina                 outline previsivel para o rastreador
     - <title> unico e ate 60 chars       titulo repetido canibaliza a propria pagina
     - description unica, 110-165 chars   fora disso o Google corta ou reescreve
     - canonical absoluto e correto       canonical errado tira a pagina do indice
     - <main id="conteudo"> presente      sem ele o link de pular vira link morto
     - toda referencia local resolve      404 silencioso em imagem e CSS
     - todo JSON-LD faz parse             schema quebrado e schema ignorado
     - nenhum data-reveal                 nasce opacity:0 e depende do observer
     - nenhum id colidindo com as originais  ver o gridProdutos em compilar-css.mjs
     - malha de links                     produto orfao nao e rastreavel
     - palavras unicas por ficha          o limite que segura o thin content

   Uso: node build/verificar-paginas.mjs */
import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { carregarCatalogo } from "./dados.mjs";

const raiz = resolve(import.meta.dirname, "..");
const SITE = "https://braskitcargasperigosas.com.br";

/* Piso de texto proprio por ficha, descontado tudo o que se repete entre as
   paginas (cabecalho, rodape, chamada). Comeca baixo porque hoje cada produto
   tem so descricao + aplicacao; sobe conforme a PENDENCIAS.md 3.4 for
   respondida. Subir este numero e a forma de cobrar o conteudo que falta. */
const PALAVRAS_MINIMAS = 40;

const { PRODUTOS, CATEGORIAS } = carregarCatalogo();

const falhas = [];
function exigir(condicao, mensagem) {
  if (!condicao) falhas.push(mensagem);
}

/* -------------------------------------------------------------------------
   Inventario
   ------------------------------------------------------------------------- */

const paginas = [
  ...CATEGORIAS.map((c) => ({
    arquivo: "categorias/" + c.slug + ".html",
    canonical: SITE + "/categorias/" + c.slug + ".html",
    tipo: "categoria",
    schemas: ["CollectionPage", "BreadcrumbList", "ItemList"]
  })),
  ...PRODUTOS.map((p) => ({
    arquivo: "produtos/" + p.slug + ".html",
    canonical: SITE + "/produtos/" + p.slug + ".html",
    tipo: "produto",
    schemas: ["Product", "BreadcrumbList"],
    produto: p
  }))
];

/* Ids das duas paginas escritas a mao. Uma pagina gerada nao pode repetir
   nenhum deles: alem da regra geral de id unico por documento, o
   getElementById("gridProdutos") de build/compilar-css.mjs derrubaria o build
   com uma mensagem que nao faz sentido nenhum. */
const idsOriginais = new Set();
for (const arq of ["index.html", "catalogo.html"]) {
  const html = readFileSync(resolve(raiz, arq), "utf-8");
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) idsOriginais.add(id);
}
/* Estes sao herdados do recorte do cabecalho e do rodape, entao aparecem nas
   duas pontas de proposito. */
const idsHerdados = new Set(["conteudo", "header", "btnMenu", "menuMobile", "btnTopo", "areaToast"]);

/* -------------------------------------------------------------------------
   Por pagina
   ------------------------------------------------------------------------- */

const titulos = new Map();
const descricoes = new Map();

for (const pag of paginas) {
  const abs = resolve(raiz, pag.arquivo);
  if (!existsSync(abs)) { falhas.push(pag.arquivo + ": nao foi gerada"); continue; }
  const html = readFileSync(abs, "utf-8");
  const onde = pag.arquivo + ": ";

  /* Um <h1>, e so um. */
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)];
  exigir(h1.length === 1, onde + "tem " + h1.length + " <h1> (esperado 1)");

  /* Title. */
  const t = (html.match(/<title>([\s\S]*?)<\/title>/) || [, ""])[1].trim();
  exigir(t.length > 0, onde + "sem <title>");
  exigir(t.length <= 60, onde + "<title> com " + t.length + " chars (limite 60): " + t);
  if (titulos.has(t)) falhas.push(onde + "<title> repetido, igual ao de " + titulos.get(t));
  else titulos.set(t, pag.arquivo);

  /* Description. */
  const d = (html.match(/<meta name="description" content="([^"]*)"/) || [, ""])[1];
  exigir(d.length >= 110 && d.length <= 165,
    onde + "description com " + d.length + " chars (esperado 110-165)");
  if (descricoes.has(d)) falhas.push(onde + "description repetida, igual a de " + descricoes.get(d));
  else descricoes.set(d, pag.arquivo);

  /* Canonical e og:url apontando para o mesmo lugar. */
  const can = (html.match(/<link rel="canonical" href="([^"]*)"/) || [, ""])[1];
  exigir(can === pag.canonical, onde + "canonical e " + can + ", esperado " + pag.canonical);
  const og = (html.match(/<meta property="og:url" content="([^"]*)"/) || [, ""])[1];
  exigir(og === pag.canonical, onde + "og:url diverge do canonical");

  /* O alvo do link de pular para o conteudo. */
  exigir(html.includes('<main id="conteudo">'), onde + 'sem <main id="conteudo">');

  /* Cabecalho e rodape vieram do recorte. */
  exigir(html.includes('id="header"'), onde + "sem cabecalho");
  exigir(html.includes("<footer"), onde + "sem rodape");

  /* Nada de reveal no conteudo gerado: o elemento nasce opacity:0 e so aparece
     se o IntersectionObserver rodar, o que numa pagina gerada e risco de tela
     branca sem aviso. Procura so dentro do <main> e fora de <style>, porque o
     seletor [data-reveal] do <noscript> herdado do cabecalho e justamente a
     protecao contra isso -- nao pode ser confundido com o problema. */
  const dentroDoMain = (html.match(/<main id="conteudo">([\s\S]*?)<\/main>/) || [, ""])[1]
    .replace(/<style[\s\S]*?<\/style>/g, " ");
  exigir(!/\sdata-reveal[\s=>]/.test(dentroDoMain), onde + "usa data-reveal no conteudo");

  /* Colisao de id. */
  for (const [, id] of html.matchAll(/\bid="([^"]+)"/g)) {
    if (idsOriginais.has(id) && !idsHerdados.has(id)) {
      falhas.push(onde + 'id "' + id + '" ja existe em index.html ou catalogo.html');
    }
  }

  /* JSON-LD: faz parse e traz os tipos esperados. */
  const tipos = [];
  for (const [, corpo] of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { tipos.push(JSON.parse(corpo)["@type"]); }
    catch (e) { falhas.push(onde + "JSON-LD invalido: " + e.message); }
  }
  for (const esperado of pag.schemas) {
    exigir(tipos.includes(esperado), onde + "falta o schema " + esperado);
  }

  /* Referencias locais. */
  const dir = dirname(abs);
  const refs = [];
  for (const [, , v] of html.matchAll(/\b(href|src|data-reserva)="([^"]*)"/g)) refs.push(v);
  for (const [, lista] of html.matchAll(/\bsrcset="([^"]*)"/g)) {
    for (const c of lista.split(",")) refs.push(c.trim().split(/\s+/)[0]);
  }
  for (const r of refs) {
    if (!r || /^(https?:|\/\/|#|tel:|mailto:|data:|javascript:)/i.test(r)) continue;
    if (!existsSync(resolve(dir, r.split("#")[0].split("?")[0]))) {
      falhas.push(onde + "referencia inexistente: " + r);
    }
  }

  /* Texto proprio da ficha: o corpo do <main>, menos o que se repete em toda
     pagina gerada (o hero e a chamada final). E a medida honesta do que esta
     pagina tem de conteudo que nenhuma outra tem. */
  if (pag.tipo === "produto") {
    const main = (html.match(/<main id="conteudo">([\s\S]*?)<\/main>/) || [, ""])[1];
    const texto = main
      .replace(/<script[\s\S]*?<\/script>/g, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&[a-z]+;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const unicas = new Set(texto.toLowerCase().match(/[a-zà-ú0-9]{3,}/gi) || []).size;
    exigir(unicas >= PALAVRAS_MINIMAS,
      onde + "so " + unicas + " palavras distintas no conteudo (minimo " + PALAVRAS_MINIMAS + ")");
  }
}

/* -------------------------------------------------------------------------
   Classes sem regra

   As paginas geradas NAO entram na varredura do Tailwind: build/compilar-css.mjs
   compila css/tw.css a partir do DOM de index.html e catalogo.html apenas. Uma
   classe utilitaria inedita numa pagina gerada sairia sem regra nenhuma, e o
   estrago e invisivel -- a pagina simplesmente desmonta um pouco. Dai a regra:
   nas paginas geradas so entram classes que ja existem no CSS.
   ------------------------------------------------------------------------- */

const folhas = readFileSync(resolve(raiz, "css/tw.css"), "utf-8") +
               readFileSync(resolve(raiz, "css/style.css"), "utf-8");

/* No CSS gerado pelo Tailwind o seletor vem escapado: a classe md:py-20 vira
   .md\:py-20 e text-white/75 vira .text-white\/75. */
function temRegra(classe) {
  const escapada = "." + classe.replace(/([.:/[\]()#%,+*>~!])/g, "\\$1");
  return folhas.includes(escapada);
}

/* Ganchos de JS e de dado, que existem para o script achar o elemento e nao
   precisam de regra propria. */
const SEM_ESTILO = new Set(["produto-abrir"]);

const semRegra = new Map();
for (const pag of paginas) {
  const abs = resolve(raiz, pag.arquivo);
  if (!existsSync(abs)) continue;
  const main = (readFileSync(abs, "utf-8").match(/<main id="conteudo">([\s\S]*?)<\/main>/) || [, ""])[1];
  for (const [, lista] of main.matchAll(/\sclass="([^"]*)"/g)) {
    for (const classe of lista.split(/\s+/)) {
      if (!classe || SEM_ESTILO.has(classe) || temRegra(classe)) continue;
      if (!semRegra.has(classe)) semRegra.set(classe, pag.arquivo);
    }
  }
}
for (const [classe, onde] of semRegra) {
  falhas.push(onde + ': classe "' + classe + '" nao tem regra em tw.css nem em style.css');
}

/* -------------------------------------------------------------------------
   Malha de links
   ------------------------------------------------------------------------- */

for (const prod of PRODUTOS) {
  const alvo = "produtos/" + prod.slug + ".html";
  const donos = paginas
    .filter((pag) => pag.tipo === "categoria")
    .filter((pag) => existsSync(resolve(raiz, pag.arquivo)))
    .filter((pag) => readFileSync(resolve(raiz, pag.arquivo), "utf-8").includes("../" + alvo));

  exigir(donos.length >= 1, alvo + ": nenhuma pagina de categoria linka para ela (produto orfao)");
}

for (const cat of CATEGORIAS) {
  const alvo = "categorias/" + cat.slug + ".html";
  const daHome = readFileSync(resolve(raiz, "index.html"), "utf-8").includes(alvo);
  const doCatalogo = readFileSync(resolve(raiz, "catalogo.html"), "utf-8").includes(alvo);
  exigir(daHome || doCatalogo, alvo + ": nao e linkada nem pela home nem pelo catalogo");
}

/* -------------------------------------------------------------------------
   Sitemap
   ------------------------------------------------------------------------- */

const caminhoSitemap = resolve(raiz, "sitemap.xml");
if (existsSync(caminhoSitemap)) {
  const xml = readFileSync(caminhoSitemap, "utf-8");
  const noSitemap = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
  const esperadas = new Set([SITE + "/", SITE + "/catalogo.html", ...paginas.map((p) => p.canonical)]);

  for (const u of esperadas) if (!noSitemap.has(u)) falhas.push("sitemap.xml: falta " + u);
  for (const u of noSitemap) if (!esperadas.has(u)) falhas.push("sitemap.xml: sobra " + u);
}

/* -------------------------------------------------------------------------
   Resultado
   ------------------------------------------------------------------------- */

if (falhas.length) {
  console.error("\n" + falhas.length + " problema(s):\n");
  for (const f of falhas) console.error("  " + f);
  process.exit(1);
}

console.log(paginas.length + " paginas geradas verificadas: estrutura, schema, referencias e malha de links.");
console.log("  " + CATEGORIAS.length + " categorias + " + PRODUTOS.length + " produtos");
console.log("  " + titulos.size + " titles distintos, " + descricoes.size + " descriptions distintas");
