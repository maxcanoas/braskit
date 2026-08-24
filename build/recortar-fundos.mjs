/* ==========================================================================
   BRASKIT | recorte de fundo das fotos de produto  (NAO EXECUTADO)
   ==========================================================================

   ESTE SCRIPT NAO FOI RODADO. Ele esta aqui pronto, com as instrucoes, para
   quando a Braskit aprovar o passo. Ver PENDENCIAS.md, item "Fotos de
   produto".

   POR QUE NAO RODOU
   As 34 fotos sao reais, tiradas de celular dentro do estoque: prateleira de
   aco, caixas de papelao, sacos plasticos, banquinho de madeira, capacete no
   chao e flash duro. Recorte automatico nesse tipo de material produz halo na
   borda, come a ponta fina do cone e confunde o cabo preto da ferramenta com
   o fundo escuro. Aplicar em 34 arquivos sem revisao humana entrega um
   catalogo pior do que o atual, nao melhor.

   Enquanto isso nao acontece, o site ja melhorou o que dependia so de CSS: o
   slot passou de 1:1 para 3:2 (a proporcao nativa das fotos, o que devolveu
   um terco da largura que o corte quadrado jogava fora) e o duotone laranja
   pesado virou uma correcao leve, que deixa a cor real do produto aparecer.

   O QUE ESTE SCRIPT FAZ
   Para cada foto em assets/produtos/, remove o fundo com o modelo ONNX do
   @imgly/background-removal-node e recompoe o produto sobre chapado neutro da
   marca, com respiro constante e uma sombra suave por baixo. A saida vai para
   assets/produtos-recortados/, NUNCA por cima do original.

   COMO RODAR
     npm i -D @imgly/background-removal-node
     node build/recortar-fundos.mjs                 # todas as 34
     node build/recortar-fundos.mjs extintor-abc    # so uma, para avaliar

   DEPOIS DE RODAR, O TRABALHO HUMANO QUE FALTA
     1. Abrir as 34 lado a lado e reprovar as que tiverem halo, borda comida
        ou sombra descolada. Espere reprovar entre um quarto e um terco.
     2. As reprovadas voltam para recorte manual, ou entram na lista de fotos
        a refazer com o fotografo.
     3. So depois: mover de assets/produtos-recortados/ para assets/produtos/
        e rodar `node build/imagens.mjs` de novo para gerar avif e webp.
     4. Com fundo recortado, o veu de categoria em .produto-midia::after perde
        a funcao (ele existe para amarrar 34 fundos diferentes) e deve ir a
        zero em css/style.css.

   E A ALTERNATIVA QUE VALE MAIS QUE TUDO ISSO
   Uma tarde de fotografia com o produto sobre fundo infinito branco. Custa
   menos que o retrabalho de revisar 34 recortes automaticos e resolve de vez.
   Esta em PENDENCIAS.md.
   ========================================================================== */

import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync, writeFileSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const origem = resolve(raiz, "assets/produtos");
const destino = resolve(raiz, "assets/produtos-recortados");

/* Chapado neutro da marca e respiro do enquadramento. */
const FUNDO = { r: 246, g: 248, b: 248 };   /* --neutro-50 */
const LARGURA = 1200;
const ALTURA = 800;                          /* 3:2, a proporcao do slot */
const RESPIRO = 0.1;                         /* 10% de margem em volta */

let removerFundo;
try {
  ({ removeBackground: removerFundo } = await import("@imgly/background-removal-node"));
} catch {
  console.error(
    "Falta a dependencia. Rode:\n" +
    "  npm i -D @imgly/background-removal-node\n" +
    "Ela baixa um modelo ONNX de cerca de 40 MB na primeira execucao."
  );
  process.exit(1);
}

if (!existsSync(destino)) mkdirSync(destino, { recursive: true });

const filtro = process.argv[2];
const arquivos = readdirSync(origem)
  .filter((f) => /^[a-z0-9-]+\.jpg$/.test(f))       /* so os originais, nao as versoes -400/-720 */
  .filter((f) => !filtro || f.includes(filtro))
  .sort();

console.log(`${arquivos.length} foto(s) para recortar.\n`);

const relatorio = [];

for (const arquivo of arquivos) {
  const nome = basename(arquivo, ".jpg");
  const caminho = join(origem, arquivo);

  /* 1. Recorte do fundo: devolve um PNG com canal alfa. */
  const blob = await removerFundo(caminho, { output: { format: "image/png", quality: 1 } });
  const recortado = Buffer.from(await blob.arrayBuffer());

  /* 2. Apara o alfa para achar o produto de verdade e medir o enquadramento. */
  const aparado = await sharp(recortado).trim({ threshold: 8 }).toBuffer({ resolveWithObject: true });
  const { width: pw, height: ph } = aparado.info;

  /* 3. Enquadramento constante: o produto ocupa sempre a mesma fracao da
        caixa, independentemente de ter sido fotografado de perto ou de longe.
        E isso, mais que o recorte em si, que faz 34 fotos lerem como serie. */
  const caixaW = Math.round(LARGURA * (1 - RESPIRO * 2));
  const caixaH = Math.round(ALTURA * (1 - RESPIRO * 2));
  const escala = Math.min(caixaW / pw, caixaH / ph);
  const alvoW = Math.round(pw * escala);
  const alvoH = Math.round(ph * escala);

  const produto = await sharp(aparado.data).resize(alvoW, alvoH).png().toBuffer();

  /* 4. Sombra suave: o proprio alfa borrado, deslocado para baixo. Sem ela o
        produto parece colado; com ela, apoiado. */
  const sombra = await sharp(produto)
    .extractChannel("alpha")
    .blur(18)
    .linear(0.34, 0)
    .toBuffer();

  const sombraColorida = await sharp({
    create: { width: alvoW, height: alvoH, channels: 4, background: { r: 6, g: 34, b: 38, alpha: 1 } }
  })
    .composite([{ input: sombra, blend: "dest-in" }])
    .png()
    .toBuffer();

  const esquerda = Math.round((LARGURA - alvoW) / 2);
  const topo = Math.round((ALTURA - alvoH) / 2);

  await sharp({ create: { width: LARGURA, height: ALTURA, channels: 3, background: FUNDO } })
    .composite([
      { input: sombraColorida, left: esquerda, top: topo + 14 },
      { input: produto, left: esquerda, top: topo }
    ])
    .jpeg({ quality: 88, mozjpeg: true })
    .toFile(join(destino, arquivo));

  relatorio.push({ arquivo, produtoOriginal: `${pw}x${ph}`, escala: escala.toFixed(2) });
  console.log(`  ${arquivo}  produto ${pw}x${ph}  escala ${escala.toFixed(2)}`);
}

writeFileSync(join(destino, "_relatorio.json"), JSON.stringify(relatorio, null, 2));

console.log(
  `\nPronto: ${relatorio.length} em assets/produtos-recortados/.\n` +
  "NAO copie por cima de assets/produtos/ sem antes olhar as 34 uma por uma.\n" +
  "Procure halo claro na borda, ponta de cone comida e sombra descolada do objeto."
);
