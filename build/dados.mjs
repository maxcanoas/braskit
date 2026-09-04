/* Leitor do catalogo para os scripts de build.

   js/produtos.js e script classico (var PRODUTOS = [...]), nao modulo: import
   nao funciona nele. As alternativas seriam regex, que quebra no primeiro
   acento dentro de um campo detalhe, ou abrir um Chromium so para ler um
   array. O node:vm resolve sem nenhum dos dois -- e, o que importa mais,
   traz junto as FUNCOES do arquivo. A pagina estatica monta o <picture> com
   o mesmo fontesProduto() que o card do catalogo usa em runtime, entao nao
   existem duas implementacoes podendo divergir.

   As guardas no fim do arquivo derrubam o build. Sao elas que transformam
   "nao mude os id" de comentario no README em assercao: os id sao chave do
   orcamento salvo no navegador de quem ja visitou o site, e os slug viram
   URL publica assim que as paginas de produto existirem. */
import { readFileSync, existsSync } from "node:fs";
import { createContext, runInContext } from "node:vm";
import { resolve, basename } from "node:path";

const raiz = resolve(import.meta.dirname, "..");

/* Nomes que ja sao arquivo ou pasta do site. Um produto com slug "catalogo"
   geraria produtos/catalogo.html, que confunde mais do que quebra -- melhor
   barrar na entrada. */
const RESERVADOS = ["index", "catalogo", "produtos", "categorias", "assets", "css", "js"];

export function carregarCatalogo() {
  const fonte = readFileSync(resolve(raiz, "js/produtos.js"), "utf-8");

  /* Contexto vazio de proposito. Sem window, o WHATSAPP_BRASKIT cai no
     literal, que e o comportamento correto fora do navegador, e o
     protegerFotos() nunca e chamado -- ele so toca no DOM quando executado. */
  const ctx = createContext({});
  runInContext(fonte, ctx, { filename: "js/produtos.js" });

  const erros = [];
  const { PRODUTOS, CATEGORIAS, KIT_MINIMO } = ctx;

  if (!Array.isArray(PRODUTOS) || !PRODUTOS.length) erros.push("PRODUTOS vazio ou ausente");
  if (!Array.isArray(CATEGORIAS) || !CATEGORIAS.length) erros.push("CATEGORIAS vazio ou ausente");

  if (!erros.length) {
    const slugsCategoria = new Set(CATEGORIAS.map((c) => c.slug));
    const idsVistos = new Map();
    const slugsVistos = new Map();

    for (const p of PRODUTOS) {
      const onde = 'produto "' + p.nome + '"';

      if (!Number.isInteger(p.id) || p.id < 1) erros.push(onde + ": id nao e inteiro positivo (" + p.id + ")");
      else if (idsVistos.has(p.id)) erros.push("id " + p.id + " repetido: " + idsVistos.get(p.id) + " e " + p.nome);
      else idsVistos.set(p.id, p.nome);

      if (!/^[a-z0-9-]+$/.test(p.slug || "")) erros.push(onde + ': slug fora de [a-z0-9-]: "' + p.slug + '"');
      else if (slugsVistos.has(p.slug)) erros.push('slug "' + p.slug + '" repetido: ' + slugsVistos.get(p.slug) + " e " + p.nome);
      else if (RESERVADOS.includes(p.slug)) erros.push('slug "' + p.slug + '" colide com arquivo ou pasta do site');
      else slugsVistos.set(p.slug, p.nome);

      if (!slugsCategoria.has(p.categoria)) erros.push(onde + ': categoria "' + p.categoria + '" nao existe em CATEGORIAS');

      /* O slug precisa ser o nome do arquivo da foto: e assim que a pagina
         gerada acha as versoes -400 e -720 sem nenhum dado novo. */
      if (p.img && basename(p.img, ".jpg") !== p.slug) {
        erros.push(onde + ": slug e nome do arquivo divergem (" + p.slug + " vs " + basename(p.img, ".jpg") + ")");
      }

      /* A foto e os quatro derivados do pipeline de imagem. */
      const base = resolve(raiz, (p.img || "").replace(/\.jpg$/, ""));
      for (const sufixo of [".jpg", "-400.avif", "-400.webp", "-720.avif", "-720.webp"]) {
        if (!existsSync(base + sufixo)) erros.push(onde + ": falta " + p.slug + sufixo);
      }
    }

    for (const c of CATEGORIAS) {
      if (!/^[a-z0-9-]+$/.test(c.slug || "")) erros.push('categoria com slug invalido: "' + c.slug + '"');
      if (!PRODUTOS.some((p) => p.categoria === c.slug)) erros.push('categoria "' + c.slug + '" nao tem nenhum produto');
    }

    for (const item of KIT_MINIMO || []) {
      if (!idsVistos.has(item.id)) erros.push("KIT_MINIMO aponta para o id " + item.id + ", que nao existe em PRODUTOS");
    }
  }

  if (erros.length) {
    console.error("js/produtos.js nao passou nas guardas:");
    for (const e of erros) console.error("  - " + e);
    process.exit(1);
  }

  return ctx;
}

/* Rodado direto (node build/dados.mjs), serve de conferencia rapida. */
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const { PRODUTOS, CATEGORIAS, KIT_MINIMO } = carregarCatalogo();
  console.log(PRODUTOS.length + " produtos em " + CATEGORIAS.length + " categorias, sem violacao.");
  console.log("kit minimo: " + KIT_MINIMO.map((i) => i.id).join(", "));
  for (const c of CATEGORIAS) {
    console.log("  " + String(PRODUTOS.filter((p) => p.categoria === c.slug).length).padStart(2) + "  " + c.nome);
  }
}
