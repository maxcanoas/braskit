/* ==========================================================================
   BRASKIT | pipeline de imagem
   ==========================================================================

   Gera as versoes modernas (avif e webp) das fotos, nos recortes que os
   espacos do site realmente pedem.

   REGRA QUE NAO SE QUEBRA: nunca ampliar. As fotos de ambiente tem 1376 a
   1408 px no lado maior e as de produto tem 730. Fazer upscale so aumentaria
   o arquivo fingindo nitidez que nao existe. Onde a fonte nao alcanca o
   tamanho ideal do README, isso fica registrado em PENDENCIAS.md.

   FOTOS DE AMBIENTE. Cada espaco tem uma proporcao diferente da fonte, entao
   cada uma tem um recorte pensado, nao centralizado por acidente:

     hero-rodovia    16:9   sem recorte (a fonte ja e 16:9)
     faixa-rodovia   12:5   corta mais do asfalto que do ceu, para o horizonte
                            nao subir demais
     faixa-noturna   12:5   corta mais do ceu, porque o assunto (os cones)
                            esta na metade de baixo
     sobre-kit        4:3   desloca para a esquerda, onde estao a bolsa e o
                            extintor -- a parte critivel da imagem. A fileira
                            de miudezas da direita sai do quadro.

   Os dois recortes verticais que faltavam sao derivados do panoramico, com a
   estrategia de atencao do sharp. Nao substituem um recorte composto de
   verdade: ver PENDENCIAS.md.

   FOTOS DE PRODUTO. 730x487 e exatamente 3:2, que passa a ser a proporcao do
   slot do card -- por isso 32 das 34 saem sem corte nenhum. As duas em
   retrato (capa-cone e pedestal) sao reduzidas pela altura e ficam contidas
   no slot, sobre chapado neutro, em vez de cortadas ao meio.

   Uso: node build/imagens.mjs
   ========================================================================== */

import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync, statSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const dirAmbiente = resolve(raiz, "assets/img");
const dirProdutos = resolve(raiz, "assets/produtos");

const QUALIDADE_AVIF = 50;
const QUALIDADE_WEBP = 74;

let gerados = 0;
let bytes = 0;

async function escrever(pipeline, destino) {
  await pipeline.toFile(destino);
  gerados++;
  bytes += statSync(destino).size;
  return statSync(destino).size;
}

/* Gera avif + webp de uma pipeline ja recortada/redimensionada. */
async function doisFormatos(fabricar, destinoSemExtensao) {
  const a = await escrever(fabricar().avif({ quality: QUALIDADE_AVIF, effort: 6 }), destinoSemExtensao + ".avif");
  const w = await escrever(fabricar().webp({ quality: QUALIDADE_WEBP, effort: 5 }), destinoSemExtensao + ".webp");
  return { avif: a, webp: w };
}

const kb = (n) => (n / 1024).toFixed(0) + " KB";

/* -------------------------------------------------------------------------
   FOTOS DE AMBIENTE
   ------------------------------------------------------------------------- */

/* recorte: { proporcao, ancoraX, ancoraY } com ancoras de 0 a 1 indicando
   onde fica o centro do recorte dentro da imagem original. */
const AMBIENTE = [
  {
    arquivo: "hero-rodovia.jpg",
    recorte: null,                       /* ja e 16:9 */
    larguras: [768, 1152, 1408]
  },
  {
    arquivo: "faixa-rodovia.jpg",
    recorte: { proporcao: 12 / 5, ancoraY: 0.42 },
    larguras: [768, 1152, 1376],
    vertical: { nome: "faixa-rodovia-mobile", proporcao: 4 / 5, larguras: [614] }
  },
  {
    arquivo: "faixa-noturna.jpg",
    recorte: { proporcao: 12 / 5, ancoraY: 0.62 },
    larguras: [768, 1152, 1376],
    vertical: { nome: "faixa-noturna-mobile", proporcao: 4 / 5, larguras: [614] }
  },
  {
    arquivo: "sobre-kit.jpg",
    recorte: { proporcao: 4 / 3, ancoraX: 0.42 },
    larguras: [512, 768, 1024]
  }
];

function calcularRecorte(largura, altura, { proporcao, ancoraX = 0.5, ancoraY = 0.5 }) {
  let w = largura;
  let h = Math.round(w / proporcao);
  if (h > altura) { h = altura; w = Math.round(h * proporcao); }
  const left = Math.max(0, Math.min(largura - w, Math.round((largura - w) * ancoraX)));
  const top = Math.max(0, Math.min(altura - h, Math.round((altura - h) * ancoraY)));
  return { left, top, width: w, height: h };
}

console.log("FOTOS DE AMBIENTE\n");

for (const item of AMBIENTE) {
  const origem = join(dirAmbiente, item.arquivo);
  if (!existsSync(origem)) { console.log(`  ${item.arquivo}: ausente, pulando`); continue; }
  const meta = await sharp(origem).metadata();
  const nome = basename(item.arquivo, ".jpg");

  const area = item.recorte ? calcularRecorte(meta.width, meta.height, item.recorte) : null;
  const base = () => (area ? sharp(origem).extract(area) : sharp(origem));
  const larguraDisponivel = area ? area.width : meta.width;

  console.log(`  ${item.arquivo}  ${meta.width}x${meta.height}` +
    (area ? `  -> recorte ${area.width}x${area.height} em (${area.left},${area.top})` : "  (sem recorte)"));

  let maiorGerada = 0;
  for (const largura of item.larguras) {
    if (largura > larguraDisponivel) { console.log(`     ${largura}w: acima da fonte, pulado (nunca ampliar)`); continue; }
    const alvo = join(dirAmbiente, `${nome}-${largura}`);
    const t = await doisFormatos(() => base().resize({ width: largura }), alvo);
    maiorGerada = Math.max(maiorGerada, largura);
    console.log(`     ${largura}w  avif ${kb(t.avif)}  webp ${kb(t.webp)}`);
  }

  /* Um jpg no recorte certo, para o <img> de reserva ter a mesma proporcao do
     slot. O arquivo original fica intocado, como fonte do pipeline. */
  if (maiorGerada) {
    const j = await escrever(
      base().resize({ width: maiorGerada }).jpeg({ quality: 78, mozjpeg: true }),
      join(dirAmbiente, `${nome}-${maiorGerada}.jpg`));
    console.log(`     ${maiorGerada}w  jpg  ${kb(j)}  (reserva, no recorte do slot)`);
  }

  /* Recorte vertical derivado, para os espacos que o pedem no celular. */
  if (item.vertical) {
    const v = item.vertical;
    for (const largura of v.larguras) {
      const altura = Math.round(largura / v.proporcao);
      const fabricar = () => sharp(origem).resize({
        width: largura, height: altura, fit: "cover", position: sharp.strategy.attention
      });
      const alvo = join(dirAmbiente, `${v.nome}-${largura}`);
      const t = await doisFormatos(fabricar, alvo);
      /* O jpg tambem, porque e o ultimo degrau da reserva. */
      const j = await escrever(fabricar().jpeg({ quality: 78, mozjpeg: true }), join(dirAmbiente, `${v.nome}.jpg`));
      console.log(`     vertical ${largura}x${altura}  avif ${kb(t.avif)}  webp ${kb(t.webp)}  jpg ${kb(j)}`);
    }
  }
}

/* -------------------------------------------------------------------------
   FOTOS DE PRODUTO
   ------------------------------------------------------------------------- */

console.log("\nFOTOS DE PRODUTO\n");

const LARGURAS_PRODUTO = [400, 720];
const arquivosProduto = readdirSync(dirProdutos).filter((f) => f.endsWith(".jpg")).sort();
let retratos = [];

for (const arquivo of arquivosProduto) {
  const origem = join(dirProdutos, arquivo);
  const meta = await sharp(origem).metadata();
  const nome = basename(arquivo, ".jpg");
  const ehRetrato = meta.height > meta.width;
  if (ehRetrato) retratos.push(arquivo);

  for (const largura of LARGURAS_PRODUTO) {
    /* No retrato, a medida que manda e a altura: reduzir pela largura o
       deixaria com o dobro da altura das outras. */
    const opcoes = ehRetrato
      ? { height: Math.round(largura / (3 / 2)), withoutEnlargement: true }
      : { width: largura, withoutEnlargement: true };
    await doisFormatos(() => sharp(origem).resize(opcoes), join(dirProdutos, `${nome}-${largura}`));
  }
}

console.log(`  ${arquivosProduto.length} produtos, ${LARGURAS_PRODUTO.length} larguras, avif + webp`);
console.log(`  em retrato (exibidos contidos, nao cortados): ${retratos.join(", ")}`);

/* -------------------------------------------------------------------------
   LOGO
   ------------------------------------------------------------------------- */

const logo = resolve(raiz, "assets/logo-braskit.png");
if (existsSync(logo)) {
  const t = await doisFormatos(() => sharp(logo), resolve(raiz, "assets/logo-braskit"));
  console.log(`\nLOGO  avif ${kb(t.avif)}  webp ${kb(t.webp)}`);
}

console.log(`\n${gerados} arquivos gerados, ${(bytes / 1024 / 1024).toFixed(1)} MB no disco.`);
