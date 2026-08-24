/* ==========================================================================
   BRASKIT | metricas da fonte de reserva
   ==========================================================================

   Gera os @font-face de reserva calibrados para Barlow Condensed e Inter.

   Por que isso existe: os titulos usavam a pilha
   "Barlow Condensed", "Arial Narrow", system-ui. Em Linux e Android nao ha
   Arial Narrow, entao cai em system-ui, que e cerca de 30% mais larga. Com
   display=swap isso acontece em TODA primeira visita, antes da webfont
   chegar -- o texto quebra em mais linhas, o bloco muda de altura e o layout
   pula.

   O que este script faz: mede, no proprio navegador, a largura de avanco das
   strings REAIS do site nas duas fontes e no doador (Arial), e deriva
   size-adjust. Mede tambem fontBoundingBoxAscent/Descent para os overrides
   verticais.

   Observacao honesta sobre o peso de cada ajuste: quase todo texto do site tem
   line-height numerico (body 1.7, h1-h6 0.98, .titulo-secao 0.95), e com
   numero a altura da linha nao depende das metricas da fonte. Entao
   ascent-override e descent-override mudam pouco aqui -- so a posicao da
   baseline dentro da caixa. Quem realmente elimina o pulo e o size-adjust,
   porque muda a largura dos glifos e, com ela, onde o texto quebra.

   O doador e Arial, e um so: um unico conjunto de overrides nao pode servir a
   doadores com metricas diferentes. Onde nao houver Arial, o @font-face nao
   carrega e a pilha simplesmente segue para o proximo nome.

   Uso: node build/metricas-fonte.mjs
   ========================================================================== */

import { chromium } from "playwright";

/* Strings reais do site. Os titulos so aparecem em caixa alta
   (text-transform: uppercase em css/style.css), entao medir em minusculas
   daria um size-adjust errado para uma display condensada. */
const AMOSTRAS_TITULO = [
  "SEGURANÇA QUE ACOMPANHA CADA QUILÔMETRO",
  "PROTEGENDO VIDAS, PRESERVANDO O FUTURO",
  "KIT PARA TRANSPORTE DE CARGAS PERIGOSAS",
  "ACESSÓRIOS PARA CAMINHÃO",
  "SINALIZAÇÃO",
  "CONTRAN ABNT NBR 9735 ANTT NBR 15071",
  "CATÁLOGO",
  "COMPOSIÇÃO DO KIT MÍNIMO OBRIGATÓRIO"
];

const AMOSTRAS_CORPO = [
  "Kits, EPIs e sinalização para o transporte de cargas perigosas, sempre dentro das normas do CONTRAN e da ABNT.",
  "Extintor de pó químico ABC, com manômetro, lacre e carga na validade.",
  "Se preferir resolver pessoalmente, a loja fica em Canoas e o café está sempre passado.",
  "Cada operação pede uma composição diferente de kit."
];

const ALVOS = [
  { familia: "Barlow Condensed", pesos: [600, 700], amostras: AMOSTRAS_TITULO, apelido: "Barlow Condensed Reserva" },
  { familia: "Inter", pesos: [400, 600], amostras: AMOSTRAS_CORPO, apelido: "Inter Reserva" }
];

const DOADOR = "Arial";

const paginaHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@500;600;700&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
</head><body></body></html>`;

const navegador = await chromium.launch();
const aba = await navegador.newPage();
await aba.setContent(paginaHtml, { waitUntil: "networkidle" });

const resultado = await aba.evaluate(
  async ([alvos, doador]) => {
    const tela = document.createElement("canvas");
    const pincel = tela.getContext("2d");
    const EM = 1000;

    async function garantirCarga(familia, peso) {
      await document.fonts.load(`${peso} ${EM}px "${familia}"`);
      return document.fonts.check(`${peso} ${EM}px "${familia}"`);
    }

    function medir(familia, peso, amostras) {
      pincel.font = `${peso} ${EM}px "${familia}"`;
      const larguras = amostras.map((t) => pincel.measureText(t).width);
      const m = pincel.measureText("HÁQgjpÇ");
      return {
        larguras,
        soma: larguras.reduce((a, b) => a + b, 0),
        ascent: m.fontBoundingBoxAscent / EM,
        descent: m.fontBoundingBoxDescent / EM
      };
    }

    const saida = [];
    for (const alvo of alvos) {
      for (const peso of alvo.pesos) {
        const carregou = await garantirCarga(alvo.familia, peso);
        const a = medir(alvo.familia, peso, alvo.amostras);
        const d = medir(doador, peso, alvo.amostras);
        /* Razao por amostra, para saber se o ajuste unico serve a todas. */
        const razoes = a.larguras.map((w, i) => w / d.larguras[i]);
        saida.push({
          familia: alvo.familia,
          apelido: alvo.apelido,
          peso,
          carregou,
          sizeAdjust: a.soma / d.soma,
          razaoMin: Math.min(...razoes),
          razaoMax: Math.max(...razoes),
          ascentAlvo: a.ascent,
          descentAlvo: a.descent,
          ascentDoador: d.ascent,
          descentDoador: d.descent
        });
      }
    }
    return saida;
  },
  [ALVOS, DOADOR]
);

await navegador.close();

const pct = (n) => (n * 100).toFixed(2) + "%";

console.log("\nMEDIDO (em = 1000px, doador = " + DOADOR + ")\n");
for (const r of resultado) {
  if (!r.carregou) console.log(`  AVISO: ${r.familia} ${r.peso} nao carregou; numeros sem valor.`);
  console.log(
    `  ${r.familia} ${r.peso}\n` +
    `    size-adjust      ${pct(r.sizeAdjust)}   (por amostra: ${pct(r.razaoMin)} a ${pct(r.razaoMax)})\n` +
    `    ascent  alvo ${r.ascentAlvo.toFixed(4)}  doador ${r.ascentDoador.toFixed(4)}\n` +
    `    descent alvo ${r.descentAlvo.toFixed(4)}  doador ${r.descentDoador.toFixed(4)}`
  );
}

console.log("\n\nCSS PARA css/style.css\n");
console.log("/* Reserva metrica calibrada. Numeros medidos por");
console.log("   build/metricas-fonte.mjs; nao edite a mao. */");
for (const r of resultado) {
  /* As percentagens de override resolvem contra o em JA ajustado por
     size-adjust, entao dividem por ele. */
  const ascent = r.ascentAlvo / r.sizeAdjust;
  const descent = r.descentAlvo / r.sizeAdjust;
  console.log(`@font-face {
  font-family: "${r.apelido}";
  font-style: normal;
  font-weight: ${r.peso};
  src: local("${DOADOR}"), local("Helvetica"), local("Liberation Sans");
  size-adjust: ${pct(r.sizeAdjust)};
  ascent-override: ${pct(ascent)};
  descent-override: ${pct(descent)};
  line-gap-override: 0%;
}`);
}
