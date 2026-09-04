/* Gera o sitemap.xml a partir do que existe no disco.

   As 43 URLs saem de js/produtos.js pelo mesmo carregador que o gerador de
   paginas usa, entao o sitemap nunca lista uma pagina que nao foi gerada nem
   esquece uma que foi. build/verificar-paginas.mjs confere os dois conjuntos.

   O lastmod sai do mtime de cada arquivo -- e por isso o gerador de paginas so
   reescreve arquivo cujo conteudo mudou de verdade. Um lastmod que muda a cada
   build ensina o Google a ignorar o campo, e lastmod e o unico dos tres
   (lastmod, changefreq, priority) que ele ainda usa.

   Uso: node build/sitemap.mjs */
import { readFileSync, writeFileSync, statSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { carregarCatalogo } from "./dados.mjs";

const raiz = resolve(import.meta.dirname, "..");
const SITE = "https://braskitcargasperigosas.com.br";

const { PRODUTOS, CATEGORIAS } = carregarCatalogo();

function quando(arquivo) {
  const abs = resolve(raiz, arquivo);
  if (!existsSync(abs)) {
    console.error("sitemap: " + arquivo + " nao existe. Rode antes: node build/gerar-paginas.mjs");
    process.exit(1);
  }
  return statSync(abs).mtime.toISOString().slice(0, 10);
}

function xmlEscape(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const entradas = [
  { loc: SITE + "/", arquivo: "index.html", prioridade: "1.0" },
  { loc: SITE + "/catalogo.html", arquivo: "catalogo.html", prioridade: "0.9" },

  ...CATEGORIAS.map((c) => ({
    loc: SITE + "/categorias/" + c.slug + ".html",
    arquivo: "categorias/" + c.slug + ".html",
    prioridade: "0.8"
  })),

  /* Cada ficha declara a propria foto. Sao 33 fotos de estudio, e num catalogo
     visual a extensao de imagem custa quase nada e abre o Google Imagens. */
  ...PRODUTOS.map((p) => ({
    loc: SITE + "/produtos/" + p.slug + ".html",
    arquivo: "produtos/" + p.slug + ".html",
    prioridade: "0.7",
    imagem: { url: SITE + "/" + p.img, titulo: p.nome }
  }))
];

const corpo = entradas.map((e) => {
  const img = e.imagem
    ? "\n    <image:image>\n" +
      "      <image:loc>" + xmlEscape(e.imagem.url) + "</image:loc>\n" +
      "      <image:title>" + xmlEscape(e.imagem.titulo) + "</image:title>\n" +
      "    </image:image>"
    : "";

  return "  <url>\n" +
         "    <loc>" + e.loc + "</loc>\n" +
         "    <lastmod>" + quando(e.arquivo) + "</lastmod>\n" +
         "    <changefreq>monthly</changefreq>\n" +
         "    <priority>" + e.prioridade + "</priority>" + img + "\n" +
         "  </url>";
}).join("\n");

const xml = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"\n' +
  '        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n' +
  corpo + "\n</urlset>\n";

const destino = resolve(raiz, "sitemap.xml");
if (existsSync(destino) && readFileSync(destino, "utf-8") === xml) {
  console.log("sitemap.xml sem mudanca (" + entradas.length + " URLs).");
} else {
  writeFileSync(destino, xml);
  console.log("sitemap.xml gerado com " + entradas.length + " URLs.");
}
