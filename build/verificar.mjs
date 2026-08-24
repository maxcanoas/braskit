/* ==========================================================================
   BRASKIT | verificacao automatica das duas paginas
   ==========================================================================

   Roda index.html e catalogo.html em cinco viewports e afirma:

     1. document.documentElement.scrollWidth <= largura da viewport
     2. quem CAUSA o estouro, por prova: esconde o candidato, remede o
        scrollWidth e so reporta quem, sumindo, encolhe o documento. Ignora
        ancestral que recorta e ancestral fixed. Mede em quatro estados:
        antes de rolar, depois de rolar, e com/sem o body{overflow-x:hidden}
     3. screenshot de pagina inteira COM e SEM as webfonts, e comparacao de
        altura dos blocos entre as duas rodadas para achar quebra de layout
     4. razao de contraste de todo par texto/fundo visivel (AA: 4,5:1 corpo,
        3:1 texto grande)
     5. todo <img> tem width e height
     6. nenhuma src/srcset aponta para arquivo inexistente
     7. peso da pagina, sem rolar e depois de rolar tudo
     8. ordem de foco na navegacao so por teclado (index.html)

   Uso:
     node build/verificar.mjs [rotulo]      rotulo default: "atual"

   As paginas rodam em file://, entao "peso" nao vem de transferSize (que e
   zero em file://): cada requisicao e somada pelo tamanho real do arquivo em
   disco, e as de rede pelo corpo da resposta.

   Contraste, screenshots e peso rodam com reducedMotion=reduce, que deixa a
   pagina em estado final e deterministico. O teste de estouro roda com
   movimento NORMAL de proposito: com reduce o site zera o transform de
   [data-reveal] (css/style.css:1916) e o translateX(+32px) de
   [data-reveal="direita"], que so existe antes da revelacao, desapareceria.
   ========================================================================== */

import { chromium, devices } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync, rmSync } from "node:fs";
import { resolve, dirname, join, normalize } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const raiz = resolve(import.meta.dirname, "..");
const rotulo = process.argv[2] || "atual";
const pastaScreens = resolve(raiz, "build/screens", rotulo);

const VIEWPORTS = [
  { largura: 390, altura: 844 },
  { largura: 768, altura: 1024 },
  { largura: 1024, altura: 768 },
  { largura: 1440, altura: 900 },
  { largura: 1920, altura: 1080 }
];

const PAGINAS = [
  { arquivo: "index.html", limitePeso: 1.2 * 1024 * 1024 },
  { arquivo: "catalogo.html", limitePeso: 1.5 * 1024 * 1024 }
];

/* -------------------------------------------------------------------------
   Cor: luminancia relativa e razao de contraste (WCAG 2.1)
   ------------------------------------------------------------------------- */

function canalLinear(v) {
  const c = v / 255;
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function luminancia([r, g, b]) {
  return 0.2126 * canalLinear(r) + 0.7152 * canalLinear(g) + 0.0722 * canalLinear(b);
}

function razaoContraste(frente, fundo) {
  const a = luminancia(frente);
  const b = luminancia(fundo);
  const claro = Math.max(a, b);
  const escuro = Math.min(a, b);
  return (claro + 0.05) / (escuro + 0.05);
}

/* -------------------------------------------------------------------------
   Codigo injetado na pagina
   ------------------------------------------------------------------------- */

/* Descreve um elemento de forma reconhecivel no relatorio. */
const FN_DESCRITOR = `
function descrever(el) {
  var partes = el.tagName.toLowerCase();
  if (el.id) partes += "#" + el.id;
  var cls = (el.getAttribute("class") || "").trim().split(/\\s+/).filter(Boolean).slice(0, 3);
  if (cls.length) partes += "." + cls.join(".");
  var texto = (el.textContent || "").trim().replace(/\\s+/g, " ").slice(0, 40);
  if (texto) partes += ' "' + texto + '"';
  return partes;
}`;

/* Sobe a arvore ate achar um ancestral que recorte no eixo X. */
const FN_RECORTADO = `
function temAncestralQueRecorta(el) {
  var p = el.parentElement;
  while (p) {
    var cs = getComputedStyle(p);
    var ox = cs.overflowX;
    if (ox === "hidden" || ox === "clip" || ox === "auto" || ox === "scroll") return true;
    if (cs.contain && cs.contain.indexOf("paint") !== -1) return true;
    p = p.parentElement;
  }
  return false;
}`;

/* Acha quem realmente cria a barra horizontal.

   Duas etapas. A primeira lista candidatos: elemento cujo retangulo passa da
   borda direita e que nao tem ancestral que recorte nem ancestral fixed (fixed
   nao entra na area rolavel, entao nunca cria barra). A segunda PROVA cada
   candidato: esconde, remede o scrollWidth e restaura. So sobra quem, sumindo,
   encolhe o documento. E o que transforma 25 suspeitos em 3 culpados.

   Mede contra documentElement.clientWidth, nunca window.innerWidth: a
   diferenca entre os dois e exatamente a barra de rolagem. */
async function medirEstouros(page, opcoes = {}) {
  const { semCurativo = false } = opcoes;
  return page.evaluate(
    ([fnDesc, tirarCurativo]) => {
      eval(fnDesc);

      let estilo = null;
      if (tirarCurativo) {
        estilo = document.createElement("style");
        estilo.textContent = "html,body{overflow-x:visible !important}";
        document.head.appendChild(estilo);
      }

      const L = document.documentElement.clientWidth;
      const antes = document.documentElement.scrollWidth;

      const candidatos = [];
      for (const el of document.querySelectorAll("body *")) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) continue;
        if (r.right <= L + 1) continue;

        let descartar = false;
        for (let a = el; a && a !== document.documentElement; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (cs.position === "fixed") { descartar = true; break; }
          if (a !== el && cs.overflowX !== "visible") { descartar = true; break; }
          if (a !== el && cs.contain && cs.contain.indexOf("paint") !== -1) { descartar = true; break; }
        }
        if (descartar) continue;
        candidatos.push(el);
      }

      /* Prova: esconde um por vez e ve se o documento encolhe. */
      const provados = [];
      for (const el of candidatos) {
        const anterior = el.style.getPropertyValue("display");
        const prioridade = el.style.getPropertyPriority("display");
        el.style.setProperty("display", "none", "important");
        const depois = document.documentElement.scrollWidth;
        if (anterior) el.style.setProperty("display", anterior, prioridade);
        else el.style.removeProperty("display");

        if (depois < antes) {
          const r = el.getBoundingClientRect();
          provados.push({
            el,
            dados: {
              elemento: descrever(el),
              right: Math.round(r.right * 10) / 10,
              excesso: Math.round((r.right - L) * 10) / 10,
              encolhePara: depois,
              position: getComputedStyle(el).position
            }
          });
        }
      }

      /* Se pai e filho aparecem os dois, reporta so o pai: esconder o pai
         esconde o filho, entao o filho e consequencia, nao causa. */
      const externos = provados
        .filter((p) => !provados.some((o) => o.el !== p.el && o.el.contains(p.el)))
        .map((p) => p.dados);

      if (estilo) estilo.remove();

      return {
        clientWidth: L,
        scrollWidth: antes,
        estoura: antes > L,
        candidatos: candidatos.length,
        culpados: externos.sort((a, b) => b.excesso - a.excesso).slice(0, 12)
      };
    },
    [FN_DESCRITOR, semCurativo]
  );
}

/* Coleta pares texto/fundo. A composicao de alfa e feita aqui e o calculo da
   razao fica no Node, para nao duplicar a formula. */
async function coletarPares(page) {
  return page.evaluate((fnDesc) => {
    eval(fnDesc);

    function parseCor(str) {
      const m = String(str).match(/rgba?\(([^)]+)\)/);
      if (!m) return null;
      const p = m[1].split(",").map((s) => parseFloat(s.trim()));
      return { r: p[0], g: p[1], b: p[2], a: p.length > 3 ? p[3] : 1 };
    }

    function sobrepor(frente, fundo) {
      const a = frente.a;
      return {
        r: frente.r * a + fundo.r * (1 - a),
        g: frente.g * a + fundo.g * (1 - a),
        b: frente.b * a + fundo.b * (1 - a),
        a: 1
      };
    }

    /* Sobe a arvore acumulando fundos ate achar um opaco. Se encontrar
       background-image pelo caminho, o par nao e calculavel. */
    function fundoEfetivo(el) {
      const pilha = [];
      let p = el;
      let sobreImagem = false;
      while (p) {
        const cs = getComputedStyle(p);
        if (cs.backgroundImage && cs.backgroundImage !== "none") sobreImagem = true;
        const c = parseCor(cs.backgroundColor);
        if (c && c.a > 0) {
          pilha.push(c);
          if (c.a >= 0.999) break;
        }
        p = p.parentElement;
      }
      let base = { r: 255, g: 255, b: 255, a: 1 };
      for (let i = pilha.length - 1; i >= 0; i--) base = sobrepor(pilha[i], base);
      return { cor: base, sobreImagem };
    }

    const pares = [];
    const vistos = new Set();
    const todos = document.querySelectorAll("body *");

    for (const el of todos) {
      /* So elementos com no de texto direto e nao vazio. */
      let texto = "";
      for (const no of el.childNodes) {
        if (no.nodeType === 3) texto += no.nodeValue;
      }
      texto = texto.trim().replace(/\s+/g, " ");
      if (!texto) continue;

      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;

      const cs = getComputedStyle(el);
      if (cs.visibility === "hidden" || cs.display === "none" || parseFloat(cs.opacity) < 0.1) continue;
      /* Ignora o padrao de esconder visualmente mantendo para leitor de tela. */
      if (cs.clipPath && cs.clipPath.indexOf("inset(50%") !== -1) continue;
      if (r.width <= 1 && r.height <= 1) continue;

      const corTexto = parseCor(cs.color);
      if (!corTexto || corTexto.a === 0) continue;

      const { cor: fundo, sobreImagem } = fundoEfetivo(el);
      const frente = corTexto.a < 1 ? sobrepor(corTexto, fundo) : corTexto;

      const tamanho = parseFloat(cs.fontSize);
      const peso = parseInt(cs.fontWeight, 10) || 400;
      /* WCAG: texto grande = >=24px, ou >=18.66px em negrito. */
      const grande = tamanho >= 24 || (tamanho >= 18.66 && peso >= 700);

      const chave = [
        Math.round(frente.r), Math.round(frente.g), Math.round(frente.b),
        Math.round(fundo.r), Math.round(fundo.g), Math.round(fundo.b),
        grande, sobreImagem
      ].join("|");
      if (vistos.has(chave)) continue;
      vistos.add(chave);

      pares.push({
        elemento: descrever(el),
        amostra: texto.slice(0, 40),
        frente: [Math.round(frente.r), Math.round(frente.g), Math.round(frente.b)],
        fundo: [Math.round(fundo.r), Math.round(fundo.g), Math.round(fundo.b)],
        tamanho: Math.round(tamanho * 10) / 10,
        peso,
        grande,
        sobreImagem
      });
    }
    return pares;
  }, FN_DESCRITOR);
}

async function coletarImagens(page) {
  return page.evaluate((fnDesc) => {
    eval(fnDesc);
    const out = [];
    for (const img of document.querySelectorAll("img")) {
      const r = img.getBoundingClientRect();
      out.push({
        elemento: descrever(img),
        src: img.getAttribute("src") || "",
        temLargura: img.hasAttribute("width"),
        temAltura: img.hasAttribute("height"),
        visivel: r.width > 0 && r.height > 0
      });
    }
    return out;
  }, FN_DESCRITOR);
}

/* Todas as referencias declaradas no DOM, inclusive as que estao atras de uma
   media query que nunca dispara (que o runtime jamais pediria). */
async function coletarReferencias(page) {
  return page.evaluate(() => {
    const refs = [];
    function juntarSrcset(valor, origem) {
      if (!valor) return;
      for (const item of valor.split(",")) {
        const url = item.trim().split(/\s+/)[0];
        if (url) refs.push({ url, origem });
      }
    }
    for (const img of document.querySelectorAll("img")) {
      const s = img.getAttribute("src");
      if (s) refs.push({ url: s, origem: "img[src]" });
      juntarSrcset(img.getAttribute("srcset"), "img[srcset]");
      const reserva = img.getAttribute("data-reserva");
      if (reserva) refs.push({ url: reserva, origem: "img[data-reserva]" });
    }
    for (const src of document.querySelectorAll("source")) {
      juntarSrcset(src.getAttribute("srcset"), "source[srcset]");
    }
    for (const link of document.querySelectorAll('link[rel="stylesheet"], link[rel="icon"], link[rel="apple-touch-icon"]')) {
      const h = link.getAttribute("href");
      if (h) refs.push({ url: h, origem: "link" });
    }
    for (const s of document.querySelectorAll("script[src]")) {
      refs.push({ url: s.getAttribute("src"), origem: "script" });
    }
    return refs;
  });
}

/* Alturas dos blocos de primeiro nivel, para comparar com e sem webfont. */
async function medirBlocos(page) {
  return page.evaluate(() => {
    const out = {};
    const alvos = document.querySelectorAll("main > *, header, footer");
    let i = 0;
    for (const el of alvos) {
      const r = el.getBoundingClientRect();
      const chave = (el.id || el.tagName.toLowerCase()) + "#" + i++;
      out[chave] = Math.round(r.height);
    }
    out.__paginaInteira = Math.round(document.documentElement.scrollHeight);
    return out;
  });
}

async function rolarTudo(page) {
  await page.evaluate(async () => {
    const passo = Math.round(window.innerHeight * 0.8);
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += passo) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 120));
  });
}

/* -------------------------------------------------------------------------
   Peso: soma o tamanho real de cada recurso pedido
   ------------------------------------------------------------------------- */

function tamanhoLocal(url) {
  try {
    const caminho = fileURLToPath(url.split("?")[0].split("#")[0]);
    return statSync(caminho).size;
  } catch {
    return 0;
  }
}

function criarContadorDePeso(page) {
  const estado = { bytes: 0, porRecurso: [], marcado: 0 };
  page.on("response", async (resposta) => {
    const url = resposta.url();
    let tamanho = 0;
    if (url.startsWith("file://")) {
      tamanho = tamanhoLocal(url);
    } else {
      const cl = resposta.headers()["content-length"];
      if (cl) tamanho = parseInt(cl, 10) || 0;
      else {
        try { tamanho = (await resposta.body()).length; } catch { tamanho = 0; }
      }
    }
    estado.bytes += tamanho;
    estado.porRecurso.push({ url: url.replace(pathToFileURL(raiz).href + "/", ""), tamanho });
  });
  return estado;
}

/* -------------------------------------------------------------------------
   Ordem de foco
   ------------------------------------------------------------------------- */

async function ordemDeFoco(page, limite = 22) {
  const ordem = [];
  await page.evaluate(() => { document.body.focus(); window.scrollTo(0, 0); });
  for (let i = 0; i < limite; i++) {
    await page.keyboard.press("Tab");
    const descricao = await page.evaluate((fnDesc) => {
      eval(fnDesc);
      const el = document.activeElement;
      if (!el || el === document.body) return "(body)";
      const r = el.getBoundingClientRect();
      return descrever(el) + (r.width === 0 && r.height === 0 ? "  [invisivel]" : "");
    }, FN_DESCRITOR);
    ordem.push(descricao);
    if (descricao === "(body)") break;
  }
  return ordem;
}

/* -------------------------------------------------------------------------
   Execucao
   ------------------------------------------------------------------------- */

function urlDaPagina(arquivo) {
  return pathToFileURL(resolve(raiz, arquivo)).href;
}

async function novaAba(navegador, viewport, bloquearFontes, movimento = "reduce") {
  const contexto = await navegador.newContext({
    viewport: { width: viewport.largura, height: viewport.altura },
    deviceScaleFactor: 1,
    reducedMotion: movimento
  });
  const page = await contexto.newPage();
  if (bloquearFontes) {
    await page.route("**://fonts.googleapis.com/**", (r) => r.abort());
    await page.route("**://fonts.gstatic.com/**", (r) => r.abort());
  }
  return { contexto, page };
}

const relatorio = {
  rotulo,
  gerado: new Date().toISOString(),
  paginas: {},
  falhas: []
};

function falhar(mensagem) {
  relatorio.falhas.push(mensagem);
}

async function main() {
  if (existsSync(pastaScreens)) rmSync(pastaScreens, { recursive: true, force: true });
  mkdirSync(pastaScreens, { recursive: true });

  const navegador = await chromium.launch({ args: ["--allow-file-access-from-files"] });

  for (const pagina of PAGINAS) {
    const nome = pagina.arquivo.replace(".html", "");
    const url = urlDaPagina(pagina.arquivo);
    const dadosPagina = { viewports: {}, contraste: [], imagens: null, referencias: null, peso: null };

    for (const viewport of VIEWPORTS) {
      const chave = String(viewport.largura);
      const linha = {};

      /* --- rodada COM webfont --- */
      const { contexto, page } = await novaAba(navegador, viewport, false);
      const peso = criarContadorDePeso(page);
      await page.goto(url, { waitUntil: "load" });
      await page.waitForTimeout(500);
      try { await page.evaluate(() => document.fonts.ready); } catch { /* segue */ }
      await page.waitForTimeout(200);

      linha.pesoSemRolar = peso.bytes;

      /* Estouro horizontal em quatro estados.

         Movimento normal e obrigatorio: com prefers-reduced-motion o proprio
         site zera o transform de [data-reveal] (style.css:1916), e o
         translateX(+32px) de [data-reveal="direita"] — que so existe antes da
         revelacao — nunca apareceria.

         "semCurativo" forca overflow-x:visible para medir o estado real, sem o
         body{overflow-x:hidden} que hoje esconde o problema. */
      const abaMov = await novaAba(navegador, viewport, false, "no-preference");
      await abaMov.page.goto(url, { waitUntil: "load" });
      await abaMov.page.waitForTimeout(450);
      try { await abaMov.page.evaluate(() => document.fonts.ready); } catch { /* segue */ }

      linha.estouroAntesDeRolar = await medirEstouros(abaMov.page, { semCurativo: false });
      linha.estouroSemCurativo = await medirEstouros(abaMov.page, { semCurativo: true });
      await rolarTudo(abaMov.page);
      linha.estouroDepoisDeRolar = await medirEstouros(abaMov.page, { semCurativo: true });
      await abaMov.contexto.close();

      linha.scrollWidth = linha.estouroAntesDeRolar.scrollWidth;
      linha.clientWidth = linha.estouroAntesDeRolar.clientWidth;
      linha.scrollWidthReal = Math.max(
        linha.estouroSemCurativo.scrollWidth,
        linha.estouroDepoisDeRolar.scrollWidth
      );
      linha.estoura = linha.scrollWidthReal > viewport.largura;

      if (linha.estoura) {
        const culpados = [
          ...linha.estouroSemCurativo.culpados,
          ...linha.estouroDepoisDeRolar.culpados
        ];
        const unicos = [...new Map(culpados.map((c) => [c.elemento, c])).values()]
          .sort((a, b) => b.excesso - a.excesso);
        falhar(
          `${pagina.arquivo} @${viewport.largura}: scrollWidth real ${linha.scrollWidthReal} > ` +
          `${viewport.largura}` +
          (unicos.length ? ` — culpado: ${unicos[0].elemento} (+${unicos[0].excesso}px)` : "")
        );
        linha.culpados = unicos;
      } else {
        linha.culpados = [];
      }

      /* Contraste e imagens so uma vez por pagina, no viewport de 1440 e no de 390
         (o layout muda o bastante entre eles para valer os dois). */
      if (viewport.largura === 1440 || viewport.largura === 390) {
        const pares = await coletarPares(page);
        for (const par of pares) {
          const razao = razaoContraste(par.frente, par.fundo);
          const minimo = par.grande ? 3 : 4.5;
          const registro = {
            ...par,
            viewport: viewport.largura,
            razao: Math.round(razao * 100) / 100,
            minimo,
            passa: par.sobreImagem ? null : razao >= minimo
          };
          dadosPagina.contraste.push(registro);
          if (registro.passa === false) {
            falhar(
              `${pagina.arquivo} @${viewport.largura}: contraste ${registro.razao}:1 (min ${minimo}) — ` +
              `${par.elemento} — "${par.amostra}"`
            );
          }
        }
      }

      if (viewport.largura === 1440) {
        dadosPagina.imagens = await coletarImagens(page);
        for (const img of dadosPagina.imagens) {
          if (!img.temLargura || !img.temAltura) {
            falhar(`${pagina.arquivo}: <img> sem width/height — ${img.elemento}`);
          }
        }

        const refs = await coletarReferencias(page);
        const baseDir = dirname(resolve(raiz, pagina.arquivo));
        const quebradas = [];
        for (const ref of refs) {
          if (/^(https?:|data:|#|mailto:|tel:)/i.test(ref.url)) continue;
          const alvo = normalize(resolve(baseDir, ref.url.split("?")[0]));
          if (!existsSync(alvo)) quebradas.push({ ...ref, resolvido: alvo });
        }
        dadosPagina.referencias = { total: refs.length, quebradas };
        for (const q of quebradas) {
          falhar(`${pagina.arquivo}: referencia inexistente (${q.origem}) — ${q.url}`);
        }

        /* Peso apos rolar a pagina inteira (dispara lazy). */
        await rolarTudo(page);
        await page.waitForTimeout(400);
        dadosPagina.peso = {
          semRolar: linha.pesoSemRolar,
          completo: peso.bytes,
          limite: pagina.limitePeso,
          maiores: peso.porRecurso.sort((a, b) => b.tamanho - a.tamanho).slice(0, 12)
        };
        if (peso.bytes > pagina.limitePeso) {
          falhar(
            `${pagina.arquivo}: peso completo ${(peso.bytes / 1024).toFixed(0)} KB > ` +
            `limite ${(pagina.limitePeso / 1024).toFixed(0)} KB`
          );
        }
      }

      await rolarTudo(page);
      const blocosCom = await medirBlocos(page);
      await page.screenshot({
        path: join(pastaScreens, `${nome}-${viewport.largura}-comfonte.png`),
        fullPage: true
      });
      await contexto.close();

      /* --- rodada SEM webfont --- */
      const semFonte = await novaAba(navegador, viewport, true);
      await semFonte.page.goto(url, { waitUntil: "load" });
      await semFonte.page.waitForTimeout(500);
      const medidaSem = await medirEstouros(semFonte.page, { semCurativo: true });
      linha.scrollWidthSemFonte = medidaSem.scrollWidth;
      if (medidaSem.scrollWidth > viewport.largura) {
        falhar(
          `${pagina.arquivo} @${viewport.largura} SEM webfont: scrollWidth ` +
          `${medidaSem.scrollWidth} > ${viewport.largura}`
        );
      }
      linha.estourosSemFonte = (await medirEstouros(semFonte.page, { semCurativo: true })).culpados;

      await rolarTudo(semFonte.page);
      const blocosSem = await medirBlocos(semFonte.page);
      await semFonte.page.screenshot({
        path: join(pastaScreens, `${nome}-${viewport.largura}-semfonte.png`),
        fullPage: true
      });
      await semFonte.contexto.close();

      /* Comparacao de blocos: variacao acima de 12% denuncia quebra. */
      const desvios = [];
      for (const chaveBloco of Object.keys(blocosCom)) {
        const a = blocosCom[chaveBloco];
        const b = blocosSem[chaveBloco];
        if (!a || !b) continue;
        const variacao = Math.abs(b - a) / Math.max(a, 1);
        if (variacao > 0.12 && Math.abs(b - a) > 24) {
          desvios.push({ bloco: chaveBloco, comFonte: a, semFonte: b, variacao: Math.round(variacao * 100) + "%" });
        }
      }
      linha.desviosSemFonte = desvios;
      for (const d of desvios) {
        falhar(
          `${pagina.arquivo} @${viewport.largura}: bloco "${d.bloco}" muda ${d.variacao} ` +
          `sem webfont (${d.comFonte}px -> ${d.semFonte}px)`
        );
      }

      dadosPagina.viewports[chave] = linha;
      console.log(
        `  ${pagina.arquivo} @${String(viewport.largura).padStart(4)}  ` +
        `real ${String(linha.scrollWidthReal).padStart(4)}  ` +
        `${linha.estoura ? "ESTOURA" : "ok     "}  ` +
        `culpados: ${linha.culpados.length}`
      );
    }

    relatorio.paginas[pagina.arquivo] = dadosPagina;
  }

  /* --- ordem de foco, so no index --- */
  const focoCtx = await novaAba(navegador, VIEWPORTS[3], false);
  await focoCtx.page.goto(urlDaPagina("index.html"), { waitUntil: "load" });
  await focoCtx.page.waitForTimeout(400);
  relatorio.ordemDeFoco = await ordemDeFoco(focoCtx.page);
  await focoCtx.contexto.close();

  await navegador.close();

  writeFileSync(resolve(raiz, "build/relatorio.json"), JSON.stringify(relatorio, null, 2));

  /* --- resumo --- */
  console.log("\n===== RESUMO (" + rotulo + ") =====\n");
  for (const [arquivo, dados] of Object.entries(relatorio.paginas)) {
    console.log(arquivo);
    for (const [vw, linha] of Object.entries(dados.viewports)) {
      console.log(
        `  ${vw.padStart(4)}  como esta ${String(linha.scrollWidth).padStart(4)}  ` +
        `real ${String(linha.scrollWidthReal).padStart(4)}  ` +
        `sem fonte ${String(linha.scrollWidthSemFonte).padStart(4)}  ` +
        `culpados: ${linha.culpados.length}  desvios: ${linha.desviosSemFonte.length}`
      );
      for (const e of linha.culpados.slice(0, 4)) {
        console.log(`         +${e.excesso}px  ${e.elemento}`);
      }
    }
    if (dados.peso) {
      console.log(
        `  peso: ${(dados.peso.semRolar / 1024).toFixed(0)} KB sem rolar, ` +
        `${(dados.peso.completo / 1024).toFixed(0)} KB completo ` +
        `(limite ${(dados.peso.limite / 1024).toFixed(0)} KB)`
      );
    }
    const reprovados = dados.contraste.filter((c) => c.passa === false);
    const sobreImagem = dados.contraste.filter((c) => c.passa === null);
    console.log(
      `  contraste: ${dados.contraste.length} pares, ${reprovados.length} reprovam, ` +
      `${sobreImagem.length} sobre imagem (nao calculavel)`
    );
    for (const r of reprovados.slice(0, 8)) {
      console.log(`         ${r.razao}:1 (min ${r.minimo})  ${r.elemento}  "${r.amostra}"`);
    }
    if (dados.imagens) {
      const semDim = dados.imagens.filter((i) => !i.temLargura || !i.temAltura);
      console.log(`  imagens: ${dados.imagens.length} <img>, ${semDim.length} sem width/height`);
    }
    if (dados.referencias) {
      console.log(
        `  referencias: ${dados.referencias.total} declaradas, ` +
        `${dados.referencias.quebradas.length} apontam para arquivo inexistente`
      );
      for (const q of dados.referencias.quebradas) {
        console.log(`         ${q.origem}  ${q.url}`);
      }
    }
    console.log("");
  }

  console.log("ordem de foco (index.html):");
  relatorio.ordemDeFoco.forEach((d, i) => console.log(`  ${String(i + 1).padStart(2)}. ${d}`));

  console.log(`\nscreenshots: build/screens/${rotulo}/`);
  console.log(`relatorio:   build/relatorio.json`);

  if (relatorio.falhas.length) {
    console.log(`\n===== ${relatorio.falhas.length} FALHAS =====`);
    const porTipo = {};
    for (const f of relatorio.falhas) {
      const tipo = f.includes("contraste") ? "contraste"
        : f.includes("scrollWidth") ? "estouro"
        : f.includes("width/height") ? "img sem dimensao"
        : f.includes("referencia inexistente") ? "referencia quebrada"
        : f.includes("peso") ? "peso"
        : f.includes("sem webfont") ? "quebra sem webfont"
        : "outras";
      (porTipo[tipo] = porTipo[tipo] || []).push(f);
    }
    for (const [tipo, lista] of Object.entries(porTipo)) {
      console.log(`\n-- ${tipo} (${lista.length})`);
      lista.slice(0, 12).forEach((f) => console.log("   " + f));
      if (lista.length > 12) console.log(`   ... e mais ${lista.length - 12}`);
    }
    process.exitCode = 1;
  } else {
    console.log("\nTudo passou.");
  }
}

main().catch((erro) => {
  console.error(erro);
  process.exit(1);
});
