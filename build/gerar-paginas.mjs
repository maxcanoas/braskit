/* Gera as paginas estaticas de categoria a partir de js/produtos.js.

   Por que existir: o catalogo e servido como uma <div> vazia -- os 33
   produtos so entram no DOM em runtime, por js/catalogo.js. Para busca, o
   catalogo inteiro nao existe. Estas paginas dao a cada categoria uma URL
   propria, com o texto ja no HTML, sem tocar no funcionamento do catalogo.

   Cabecalho e rodape NAO sao copiados para ca: sao recortados de
   catalogo.html a cada build, entre os marcadores braskit:. Existe uma copia
   so daquela marcacao, e as paginas geradas a herdam. E o mesmo idioma de
   build/compilar-css.mjs, que fatia o <body> dos arquivos reais em vez de
   manter uma segunda versao.

   Uso: node build/gerar-paginas.mjs */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { carregarCatalogo } from "./dados.mjs";
import { CATEGORIA_SEO } from "./conteudo-seo.mjs";

const raiz = resolve(import.meta.dirname, "..");
const SITE = "https://braskitcargasperigosas.com.br";
const WHATSAPP = "https://wa.me/5551993011327?text=Ol%C3%A1%21%20Gostaria%20de%20solicitar%20um%20or%C3%A7amento.";

/* ---------------------------------------------------------------------------
   FATIAMENTO
   --------------------------------------------------------------------------- */

function entreMarcadores(html, nome) {
  const abre = "<!-- braskit:inicio-" + nome + " -->";
  const fecha = "<!-- braskit:fim-" + nome + " -->";
  const i = html.indexOf(abre);
  const f = html.indexOf(fecha);
  if (i < 0 || f < 0 || f < i) {
    console.error("catalogo.html perdeu o marcador braskit:" + nome + ".");
    console.error("Sem ele o gerador emitiria pagina sem " + nome + " -- abortando.");
    process.exit(1);
  }
  return html.slice(i + abre.length, f).trim();
}

/* Reescreve os caminhos de um trecho recortado da raiz para uma pagina que
   mora um nivel abaixo. So mexe no que aponta para arquivo do proprio site:
   http(s), //, #, tel:, mailto: e data: passam intactos. Se algo escapar,
   build/verificar.mjs acusa "referencia inexistente" -- a checagem ja existe
   e ja varre source[srcset]. */
function reprofundar(html, prefixo) {
  const externo = /^(https?:|\/\/|#|tel:|mailto:|data:|javascript:)/i;
  const ajustar = (v) => {
    const t = v.trim();
    return externo.test(t) || t.startsWith(prefixo) || t === "" ? t : prefixo + t;
  };

  return html
    .replace(/\b(href|src|data-reserva)="([^"]*)"/g, (m, attr, valor) => attr + '="' + ajustar(valor) + '"')
    /* srcset e uma lista: "arquivo-400.avif 400w, arquivo-720.avif 720w".
       Cada candidato precisa do prefixo; o descritor de largura, nao. */
    .replace(/\bsrcset="([^"]*)"/g, (m, lista) =>
      'srcset="' + lista.split(",").map((c) => {
        const partes = c.trim().split(/\s+/);
        partes[0] = ajustar(partes[0]);
        return partes.join(" ");
      }).join(", ") + '"');
}

function esc(t) {
  return String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ---------------------------------------------------------------------------
   TEMPLATE
   --------------------------------------------------------------------------- */

function montarHead({ titulo, descricao, canonical, ogTitulo, jsonld }, p) {
  const blocos = jsonld
    .map((o) => '<script type="application/ld+json">\n' + JSON.stringify(o, null, 2) + "\n</" + "script>")
    .join("\n\n");

  return `<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">

<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descricao)}">
<meta name="theme-color" content="#0B3136">
<meta name="robots" content="index, follow, max-image-preview:large">
<link rel="canonical" href="${canonical}">

<meta property="og:type" content="website">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="Braskit">
<meta property="og:title" content="${esc(ogTitulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="${SITE}/assets/og-braskit.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">

<!-- Google Analytics (GA4). O gtag e injetado por script em vez de vir num
     <script async src>: assim ele NAO carrega em file://, e o site e aberto
     por duplo clique o tempo todo -- no desenvolvimento e nas duas
     verificacoes em Playwright. Cada abertura dessas entraria no relatorio
     como visita de hostname vazio e sujaria a medicao desde o primeiro dia. -->
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() { dataLayer.push(arguments); }
  if (location.protocol !== "file:") {
    gtag("js", new Date());
    gtag("config", "G-PBNV1K928G");
    var medicao = document.createElement("script");
    medicao.async = true;
    medicao.src = "https://www.googletagmanager.com/gtag/js?id=G-PBNV1K928G";
    document.head.appendChild(medicao);
  }
</script>

<link rel="icon" href="${p}assets/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="${p}assets/apple-touch-icon.png">

<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">

<link rel="stylesheet" href="${p}css/tw.css">
<link rel="stylesheet" href="${p}css/style.css">

${blocos}`;
}

function montarPagina({ cabecalho, rodape, head, corpo }, p) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
${head}
</head>

<body class="font-corpo antialiased">
${cabecalho}

<main id="conteudo">
${corpo}
</main>

${rodape}

<!-- Area de avisos. Vem do gerador, e nao do recorte, porque no catalogo ela
     fica depois da bandeja do orcamento, que estas paginas nao carregam. -->
<div class="aviso-area" id="areaToast" aria-live="polite" aria-atomic="true"></div>

<!-- So o main.js, como no index.html. O orcamento.js monta caminho de imagem
     cru (assets/produtos/...), que quebraria numa pagina em subpasta. -->
<script src="${p}js/main.js"></` + `script>
</body>
</html>
`;
}

/* Hero interno na mesma marcacao do catalogo: mesma foto, mesmas classes.
   Nenhum utilitario novo, entao css/tw.css nao precisa ser recompilado. */
function heroInterno({ trilha, olho, h1 }, p) {
  return `<section class="palco-parallax relative overflow-hidden bg-petroleo-900 pb-16 pt-32 md:pb-20 md:pt-40">
  <picture>
    <source type="image/avif" media="(max-width: 640px)" width="614" height="768" srcset="${p}assets/img/faixa-noturna-mobile-614.avif">
    <source type="image/webp" media="(max-width: 640px)" width="614" height="768" srcset="${p}assets/img/faixa-noturna-mobile-614.webp">
    <source media="(max-width: 640px)" width="614" height="768" srcset="${p}assets/img/faixa-noturna-mobile.jpg">
    <source type="image/avif" srcset="${p}assets/img/faixa-noturna-768.avif 768w, ${p}assets/img/faixa-noturna-1152.avif 1152w, ${p}assets/img/faixa-noturna-1376.avif 1376w" sizes="100vw">
    <source type="image/webp" srcset="${p}assets/img/faixa-noturna-768.webp 768w, ${p}assets/img/faixa-noturna-1152.webp 1152w, ${p}assets/img/faixa-noturna-1376.webp 1376w" sizes="100vw">
    <img class="camada-parallax opacity-35" data-parallax-hero="0.22"
         src="${p}assets/img/faixa-noturna-1376.jpg" width="1376" height="573" data-reserva="${p}assets/faixa-noturna.svg"
         alt="" aria-hidden="true">
  </picture>
  <div class="absolute inset-0 bg-gradient-to-r from-petroleo-950 via-petroleo-950/85 to-petroleo-950/45" aria-hidden="true"></div>
  <div class="losango-deco right-[6%] top-[18%] hidden h-32 w-32 lg:block" data-parallax="0.07" aria-hidden="true"></div>

  <div class="container-braskit relative z-10">
    <nav aria-label="Trilha de navegação" class="mb-6">
      <ol class="flex flex-wrap items-center gap-2 text-xs text-white/50">
${trilha}
      </ol>
    </nav>

    <p class="olho mb-4 flex items-center gap-3">
      <span class="losango losango-cheio h-2 w-2"></span> ${esc(olho)}
    </p>
    <h1 class="font-titulo text-4xl font-bold uppercase leading-[0.92] tracking-tight text-white sm:text-5xl lg:text-6xl">${esc(h1)}</h1>
  </div>
</section>`;
}

/* Card de produto na mesma marcacao do card do catalogo (js/catalogo.js), sem
   o seletor de orcamento e com <a> no lugar do <button>: aqui o card leva a
   uma pagina de verdade. */
function cardProduto(produto, p, ctx) {
  const cat = ctx.categoriaPorSlug(produto.categoria);
  const fontes = reprofundar(
    ctx.fontesProduto(produto.img, "(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 46vw"), p);

  return `      <article class="produto-card">
        <a href="${p}produtos/${produto.slug}.html" class="produto-abrir block w-full text-left">
          <div class="produto-midia" style="--cat-cor:${cat.cor}">
            <picture>${fontes}<img class="produto-foto" src="${p}${produto.img}" alt="${esc(produto.nome)} | Braskit" width="720" height="480" loading="lazy" decoding="async" data-nome="${esc(produto.nome)}" data-cat="${produto.categoria}"></picture>
          </div>
          <div class="flex flex-1 flex-col p-5">
            <span class="mb-3 inline-flex w-fit rounded-full bg-petroleo-900/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-petroleo-700">${esc(cat.nome)}</span>
            <h2 class="mb-2 text-lg leading-tight text-neutro-900">${esc(produto.nome)}</h2>
            <p class="flex-1 text-sm leading-relaxed text-neutro-900/60">${esc(produto.descricao)}</p>
          </div>
        </a>
      </article>`;
}

/* Meta description da ficha. Sai de descricao + aplicacao, que sao unicas por
   produto, entao nenhuma repete. A cauda leva a cidade, que e o que a busca
   local usa. Se a soma estourar o corte do Google, a aplicacao fica de fora. */
function descricaoProduto(prod) {
  const cheia = prod.descricao + " " + prod.aplicacao;
  /* Candidatos do mais completo ao mais enxuto. Vence o primeiro que cabe na
     janela que o Google mostra sem cortar nem completar por conta propria. */
  const candidatos = [
    cheia + " Braskit, loja em Canoas/RS, orçamento pelo WhatsApp.",
    cheia + " Braskit, Canoas/RS: orçamento pelo WhatsApp.",
    cheia + " Braskit, Canoas/RS.",
    prod.descricao + " Braskit, loja em Canoas/RS, orçamento pelo WhatsApp.",
    cheia
  ];
  const escolhido = candidatos.find((c) => c.length >= 110 && c.length <= 165);
  if (escolhido) return escolhido;

  /* Nenhum coube: corta o mais curto que ainda passa de 165 e fecha a frase. */
  const menor = candidatos.reduce((a, b) => (a.length <= b.length ? a : b));
  return menor.length > 165 ? menor.slice(0, 162).replace(/[\s,.;:]+$/, "") + "..." : menor;
}

/* Titulo: cabe a categoria junto quando o nome do produto e curto. */
function tituloProduto(prod, cat) {
  const comCategoria = prod.nome + " — " + cat.nome + " | Braskit";
  return comCategoria.length <= 60 ? comCategoria : prod.nome + " | Braskit";
}

/* Especificacao tecnica. Hoje nenhum produto tem estes campos em
   js/produtos.js, entao a tabela nao renderiza para ninguem -- e de proposito:
   o que falta e o DADO, nao o template. Preenchida a PENDENCIAS.md 3.4 (numero
   de CA, medida, material, norma), as 33 fichas crescem so com um novo
   `node build/gerar-paginas.mjs`. */
const CAMPOS_ESPECIFICACAO = [
  ["ca", "Certificado de Aprovação (CA)"],
  ["medidas", "Medidas"],
  ["material", "Material"],
  ["capacidade", "Capacidade"],
  ["norma", "Norma"]
];

function blocoEspecificacao(prod) {
  const linhas = CAMPOS_ESPECIFICACAO
    .filter(([campo]) => prod[campo])
    .map(([campo, rotulo]) => "          <tr><th scope=\"row\">" + esc(rotulo) + "</th><td>" + esc(prod[campo]) + "</td></tr>");

  if (!linhas.length) {
    return `      <!-- PENDENTE BRASKIT: numero de CA, medidas, material, capacidade e norma
           deste item. Ver PENDENCIAS.md 3.4. O template da tabela ja existe em
           build/gerar-paginas.mjs e o estilo em css/style.css: basta o dado
           entrar em js/produtos.js e a ficha cresce sozinha. -->`;
  }

  return `      <div class="ficha-bloco">
        <span class="ficha-bloco__rotulo">Especificação</span>
        <table class="ficha-especificacao">
          <tbody>
${linhas.join("\n")}
          </tbody>
        </table>
      </div>`;
}

function blocoChamada(p) {
  return `    <div class="ficha-chamada">
      <h2 class="titulo-secao">Não sabe qual composição o seu transporte exige?</h2>
      <p class="medida">A composição do kit muda conforme a classe de risco do produto transportado. Diga o que você transporta que a gente confere item por item.</p>
      <div class="ficha-botoes">
        <a href="${WHATSAPP}" target="_blank" rel="noopener"
           class="btn-brilho inline-flex items-center justify-center gap-2 rounded-lg bg-hazmat-500 px-8 py-4 text-base font-semibold text-white transition-colors duration-300 hover:bg-hazmat-400">Solicitar orçamento</a>
        <a href="${p}catalogo.html" class="btn-contorno btn-contorno--claro">Ver o catálogo completo</a>
      </div>
    </div>`;
}

/* ---------------------------------------------------------------------------
   ESCRITA
   --------------------------------------------------------------------------- */

let escritos = 0, iguais = 0;

/* Grava so quando o conteudo muda de verdade. Duas razoes, e as duas contam:
   o lastmod do sitemap sai do mtime, e um lastmod que muda a cada build
   ensina o Google a ignorar o campo; e rodar o gerador nao pode sujar
   dezenas de arquivos no git diff. */
function escreverSeMudou(caminho, conteudo) {
  const abs = resolve(raiz, caminho);
  if (existsSync(abs) && readFileSync(abs, "utf-8") === conteudo) { iguais++; return; }
  writeFileSync(abs, conteudo);
  escritos++;
  console.log("  escrito  " + caminho);
}

/* ---------------------------------------------------------------------------
   GERACAO
   --------------------------------------------------------------------------- */

const ctx = carregarCatalogo();
const { PRODUTOS, CATEGORIAS } = ctx;

const catalogo = readFileSync(resolve(raiz, "catalogo.html"), "utf-8");
const p = "../";
const cabecalho = reprofundar(entreMarcadores(catalogo, "cabecalho"), p);
const rodape = reprofundar(entreMarcadores(catalogo, "rodape"), p);

mkdirSync(resolve(raiz, "categorias"), { recursive: true });

for (const cat of CATEGORIAS) {
  const seo = CATEGORIA_SEO[cat.slug];
  if (!seo) {
    console.error("sem texto de SEO para a categoria " + cat.slug + " (build/conteudo-seo.mjs)");
    process.exit(1);
  }

  const itens = PRODUTOS.filter((x) => x.categoria === cat.slug);
  const canonical = SITE + "/categorias/" + cat.slug + ".html";

  const trilha =
`        <li><a href="${p}index.html" class="transition-colors hover:text-hazmat-500">Início</a></li>
        <li aria-hidden="true" class="text-white/55">/</li>
        <li><a href="${p}catalogo.html" class="transition-colors hover:text-hazmat-500">Catálogo</a></li>
        <li aria-hidden="true" class="text-white/55">/</li>
        <li aria-current="page" class="text-white/85">${esc(cat.nome)}</li>`;

  const corpo =
`${heroInterno({
    trilha,
    olho: itens.length + (itens.length === 1 ? " item" : " itens") + " · " + cat.nome,
    h1: seo.h1
  }, p)}

<section class="secao secao-clara">
  <div class="container-braskit">
    <p class="medida mb-10 text-base leading-relaxed text-neutro-900/75">${esc(seo.intro)}</p>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
${itens.map((x) => cardProduto(x, p, ctx)).join("\n")}
    </div>

${blocoChamada(p)}
  </div>
</section>`;

  const jsonld = [
    {
      "@context": "https://schema.org", "@type": "CollectionPage",
      "name": seo.h1, "description": seo.descricao, "url": canonical,
      "inLanguage": "pt-BR",
      "isPartOf": { "@id": SITE + "/#site" },
      "about": { "@id": SITE + "/#organizacao" }
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Início", "item": SITE + "/" },
        { "@type": "ListItem", "position": 2, "name": "Catálogo", "item": SITE + "/catalogo.html" },
        { "@type": "ListItem", "position": 3, "name": cat.nome, "item": canonical }
      ]
    },
    /* ItemList por URL, e nao com Product embutido: o Product mora na pagina
       do produto, e repetir a marcacao em duas URLs so confunde o rastreador. */
    {
      "@context": "https://schema.org", "@type": "ItemList",
      "name": seo.h1, "numberOfItems": itens.length,
      "itemListElement": itens.map((x, i) => ({
        "@type": "ListItem", "position": i + 1, "name": x.nome,
        "url": SITE + "/produtos/" + x.slug + ".html"
      }))
    }
  ];

  const head = montarHead({
    titulo: seo.titulo, descricao: seo.descricao, canonical,
    ogTitulo: seo.h1 + " | Braskit", jsonld
  }, p);

  escreverSeMudou("categorias/" + cat.slug + ".html",
    montarPagina({ cabecalho, rodape, head, corpo }, p));
}

/* ---------------------------------------------------------------------------
   FICHAS DE PRODUTO
   --------------------------------------------------------------------------- */

mkdirSync(resolve(raiz, "produtos"), { recursive: true });

for (const prod of PRODUTOS) {
  const cat = ctx.categoriaPorSlug(prod.categoria);
  const seoCat = CATEGORIA_SEO[prod.categoria];
  const canonical = SITE + "/produtos/" + prod.slug + ".html";
  const descricao = descricaoProduto(prod);
  const irmaos = PRODUTOS.filter((x) => x.categoria === prod.categoria && x.id !== prod.id);

  const trilha =
`        <li><a href="${p}index.html" class="transition-colors hover:text-hazmat-500">Início</a></li>
        <li aria-hidden="true" class="text-white/55">/</li>
        <li><a href="${p}catalogo.html" class="transition-colors hover:text-hazmat-500">Catálogo</a></li>
        <li aria-hidden="true" class="text-white/55">/</li>
        <li><a href="${p}categorias/${cat.slug}.html" class="transition-colors hover:text-hazmat-500">${esc(cat.nome)}</a></li>
        <li aria-hidden="true" class="text-white/55">/</li>
        <li aria-current="page" class="text-white/85">${esc(prod.nome)}</li>`;

  const fontes = reprofundar(ctx.fontesProduto(prod.img, "(min-width: 900px) 42vw, 92vw"), p);

  /* O selo do kit minimo repete a ressalva da janela do orcamento: e sugestao
     tecnica ate a Braskit confirmar (PENDENCIAS.md 1). */
  const kitMinimo = ctx.ehItemObrigatorio(prod.id)
    ? `      <div class="ficha-kit-minimo">
        <strong>Faz parte do kit mínimo sugerido</strong>
        <p>Este item entra marcado por padrão no orçamento do catálogo. A composição do kit mínimo é uma sugestão técnica, montada a partir do que a fiscalização mais cobra; a composição exata da sua operação é confirmada junto com o orçamento.</p>
      </div>`
    : "";

  const detalhe = prod.detalhe
    ? `      <div class="ficha-bloco">
        <span class="ficha-bloco__rotulo">Na prática</span>
        <p>${esc(prod.detalhe)}</p>
      </div>`
    : "";

  const relacionados = irmaos.length
    ? `
<section class="secao secao-clara">
  <div class="container-braskit">
    <h2 class="titulo-secao mb-8">Outros itens de ${esc(cat.nome)}</h2>
    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
${irmaos.map((x) => cardProduto(x, p, ctx)).join("\n")}
    </div>
  </div>
</section>`
    : `
<section class="secao secao-clara">
  <div class="container-braskit">
    <p class="medida text-base leading-relaxed text-neutro-900/75">Este é o único item de ${esc(cat.nome)} no catálogo. <a href="${p}catalogo.html" class="font-semibold text-hazmat-500 underline decoration-hazmat-500/30 underline-offset-4 transition-colors hover:text-hazmat-400">Ver os 33 produtos</a>.</p>
  </div>
</section>`;

  const corpo =
`${heroInterno({ trilha, olho: cat.nome, h1: prod.nome }, p)}

<section class="secao secao-clara ficha-secao">
  <div class="container-braskit">
    <div class="ficha-produto">
      <div class="ficha-produto__foto" style="--cat-cor:${cat.cor}">
        <picture>${fontes}<img src="${p}${prod.img}" alt="${esc(prod.nome)}, item para transporte de produtos perigosos" width="730" height="487" decoding="async" data-nome="${esc(prod.nome)}" data-cat="${prod.categoria}"></picture>
      </div>

      <div class="ficha-produto__corpo">
        <p class="ficha-produto__lead">${esc(prod.descricao)}</p>

      <div class="ficha-bloco">
        <span class="ficha-bloco__rotulo">Quando se usa</span>
        <p>${esc(prod.aplicacao)}</p>
      </div>
${[detalhe, kitMinimo, blocoEspecificacao(prod)].filter(Boolean).join("\n")}

        <div class="flex flex-wrap gap-3 pt-2">
          <a href="${ctx.linkOrcamento(prod.nome)}" target="_blank" rel="noopener"
             class="btn-brilho inline-flex items-center justify-center gap-2 rounded-lg bg-hazmat-500 px-8 py-4 text-base font-semibold text-white transition-colors duration-300 hover:bg-hazmat-400">Pedir orçamento deste item</a>
          <a href="${p}categorias/${cat.slug}.html" class="btn-contorno">Ver ${esc(cat.nome)}</a>
        </div>
      </div>
    </div>
  </div>
</section>
${relacionados}`;

  const jsonld = [
    /* Product sem offers de proposito: Offer exige price, e o modelo comercial
       e orcamento por WhatsApp -- nao ha preco e nao vai haver. Declarar zero
       seria afirmar o que a empresa nao confirmou. Sem brand tambem: a Braskit
       e revenda, e dizer brand: Braskit num extintor de terceiro seria
       afirmacao de fabricacao. Sem aggregateRating: nota auto-atribuida e das
       poucas coisas que o Google pune de fato. */
    {
      "@context": "https://schema.org", "@type": "Product",
      "name": prod.nome,
      "description": prod.descricao + " " + prod.aplicacao,
      "image": SITE + "/" + prod.img,
      "category": cat.nome,
      "url": canonical,
      "isRelatedTo": { "@id": SITE + "/#organizacao" }
    },
    {
      "@context": "https://schema.org", "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Início", "item": SITE + "/" },
        { "@type": "ListItem", "position": 2, "name": "Catálogo", "item": SITE + "/catalogo.html" },
        { "@type": "ListItem", "position": 3, "name": cat.nome, "item": SITE + "/categorias/" + cat.slug + ".html" },
        { "@type": "ListItem", "position": 4, "name": prod.nome, "item": canonical }
      ]
    }
  ];

  const head = montarHead({
    titulo: tituloProduto(prod, cat), descricao, canonical,
    ogTitulo: prod.nome + " | Braskit", jsonld
  }, p);

  escreverSeMudou("produtos/" + prod.slug + ".html",
    montarPagina({ cabecalho, rodape, head, corpo }, p));
}

/* ---------------------------------------------------------------------------
   404

   Gerada aqui, e nao escrita a mao, pelo mesmo motivo das outras: assim ela
   herda o cabecalho e o rodape de catalogo.html e nunca fica para tras quando
   o menu ou o contato mudarem. Fora do sitemap, de proposito.
   --------------------------------------------------------------------------- */

/* A 404 mora na raiz, entao o prefixo aqui e vazio -- as mesmas funcoes de
   template servem, so muda o nivel. */
const r = "";

const corpo404 =
`${heroInterno({
  trilha: `        <li><a href="${r}index.html" class="transition-colors hover:text-hazmat-500">Início</a></li>
        <li aria-hidden="true" class="text-white/55">/</li>
        <li aria-current="page" class="text-white/85">Página não encontrada</li>`,
  olho: "Erro 404",
  h1: "Esta página não existe"
}, r)}

<section class="secao secao-clara">
  <div class="container-braskit">
    <p class="medida mb-10 text-base leading-relaxed text-neutro-900/75">O endereço que você abriu não existe mais ou foi digitado com alguma diferença. O catálogo com os ${PRODUTOS.length} produtos continua no ar, e o atendimento pelo WhatsApp também.</p>

    <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
${CATEGORIAS.map((c) => `      <a href="${r}categorias/${c.slug}.html" class="card-categoria group">
        <h2 class="titulo-secao">${esc(c.nome)}</h2>
      </a>`).join("\n")}
    </div>

${blocoChamada(r)}
  </div>
</section>`;

escreverSeMudou("404.html", montarPagina({
  cabecalho: reprofundar(entreMarcadores(catalogo, "cabecalho"), ""),
  rodape: reprofundar(entreMarcadores(catalogo, "rodape"), ""),
  head: montarHead({
    titulo: "Página não encontrada | Braskit",
    /* Fora do indice: pagina de erro nao tem por que disputar busca. */
    descricao: "A página que você procurou não existe. Veja o catálogo de itens para transporte de produtos perigosos da Braskit, em Canoas/RS.",
    canonical: SITE + "/404.html",
    ogTitulo: "Página não encontrada | Braskit",
    jsonld: []
  }, "").replace('content="index, follow, max-image-preview:large"', 'content="noindex, follow"'),
  corpo: corpo404
}, ""));

console.log(CATEGORIAS.length + " categorias, " + PRODUTOS.length + " produtos e a 404 — " +
            escritos + " escritas, " + iguais + " sem mudanca.");
