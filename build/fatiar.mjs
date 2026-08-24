/* Corta os screenshots de pagina inteira em fatias legiveis.

   Um screenshot de pagina inteira do index em 1440 tem 9180 px de altura.
   Aberto de uma vez, vira um borrao. Este script fatia cada PNG em pedacos de
   no maximo 1400 px de altura, reduzidos para no maximo 1100 px de largura, e
   salva em build/screens/<rotulo>/fatias/.

   Uso:
     node build/fatiar.mjs <rotulo> [filtro]

     rotulo   pasta em build/screens (ex.: 00-antes)
     filtro   substring opcional do nome do arquivo (ex.: index-1440) */

import sharp from "sharp";
import { readdirSync, mkdirSync, existsSync, rmSync } from "node:fs";
import { resolve, join, basename } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const rotulo = process.argv[2] || "atual";
const filtro = process.argv[3] || "";

const origem = resolve(raiz, "build/screens", rotulo);
const destino = join(origem, "fatias");

const ALTURA_FATIA = 1400;
const LARGURA_MAX = 1100;

if (!existsSync(origem)) {
  console.error("nao existe: " + origem);
  process.exit(1);
}
if (existsSync(destino)) rmSync(destino, { recursive: true, force: true });
mkdirSync(destino, { recursive: true });

const arquivos = readdirSync(origem)
  .filter((f) => f.endsWith(".png"))
  .filter((f) => !filtro || f.includes(filtro))
  .sort();

for (const arquivo of arquivos) {
  const caminho = join(origem, arquivo);
  const meta = await sharp(caminho).metadata();
  const nome = basename(arquivo, ".png");
  const total = Math.ceil(meta.height / ALTURA_FATIA);

  for (let i = 0; i < total; i++) {
    const topo = i * ALTURA_FATIA;
    const altura = Math.min(ALTURA_FATIA, meta.height - topo);
    let pipeline = sharp(caminho).extract({ left: 0, top: topo, width: meta.width, height: altura });
    if (meta.width > LARGURA_MAX) pipeline = pipeline.resize({ width: LARGURA_MAX });
    const saida = join(destino, `${nome}--${String(i + 1).padStart(2, "0")}de${total}.png`);
    await pipeline.png({ compressionLevel: 9 }).toFile(saida);
  }
  console.log(`${arquivo}  ${meta.width}x${meta.height}  -> ${total} fatias`);
}

console.log("\nfatias em: build/screens/" + rotulo + "/fatias/");
