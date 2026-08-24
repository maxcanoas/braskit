/* ==========================================================================
   BRASKIT | verificacao do fluxo comercial
   ==========================================================================

   O catalogo pode ficar lindo e estar quebrado. Este script exercita o
   caminho que vende: selecao -> bandeja -> lista -> WhatsApp, mais o kit
   minimo travado e a persistencia no localStorage.

   Roda em file://, que e como o cliente abre o site (duplo clique).

   Uso: node build/verificar-fluxo.mjs
   ========================================================================== */

import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const raiz = resolve(import.meta.dirname, "..");
const url = pathToFileURL(resolve(raiz, "catalogo.html")).href;
const WHATSAPP = "5551993011327";

const resultados = [];
function checar(nome, condicao, detalhe = "") {
  resultados.push({ nome, ok: !!condicao, detalhe });
  console.log(`  ${condicao ? "ok  " : "FALHA"}  ${nome}${detalhe ? "  — " + detalhe : ""}`);
}

const navegador = await chromium.launch();
const contexto = await navegador.newContext({ viewport: { width: 1280, height: 900 } });
const aba = await contexto.newPage();

const errosJs = [];
aba.on("pageerror", (e) => errosJs.push(e.message));

await aba.goto(url, { waitUntil: "load" });
await aba.waitForTimeout(600);

/* ---- 1. carga inicial ---- */
const cartoes = await aba.locator(".produto-card").count();
checar("34 cartoes no grid", cartoes === 34, cartoes + " encontrados");

const fixos = await aba.locator(".produto-card.is-fixo").count();
checar("3 itens do kit minimo travados no grid", fixos === 3, fixos + " encontrados");

const contagemInicial = await aba.locator("#bandejaContagem").textContent();
checar("bandeja abre com 3 itens", /3\s*it/i.test(contagemInicial || ""), (contagemInicial || "").trim());

const bandejaVisivel = await aba.locator("#bandejaOrcamento").evaluate((el) => el.classList.contains("is-visivel"));
checar("bandeja visivel na carga", bandejaVisivel);

/* ---- 2. localStorage ---- */
const salvo = await aba.evaluate(() => localStorage.getItem("braskit.orcamento.v1"));
let lista = [];
try { lista = JSON.parse(salvo); } catch { /* segue */ }
checar("chave braskit.orcamento.v1 gravada", Array.isArray(lista) && lista.length === 3, salvo || "vazio");
checar("formato [{id,qtd}] preservado",
  Array.isArray(lista) && lista.every((i) => typeof i.id === "number" && typeof i.qtd === "number"));
checar("kit minimo e o esperado (25, 20, 26)",
  Array.isArray(lista) && [25, 20, 26].every((id) => lista.some((i) => i.id === id)));

/* ---- 3. filtro por categoria ---- */
const CATEGORIAS = { produtos: 3, suportes: 6, sinalizacao: 7, textil: 3, injetados: 5,
                     "acessorios-caminhao": 2, epis: 6, "kits-protecao": 2 };
let filtrosOk = true;
for (const [slug, esperado] of Object.entries(CATEGORIAS)) {
  await aba.locator(`.chip-filtro[data-cat="${slug}"]`).evaluate((el) => el.click());
  await aba.waitForTimeout(150);
  const visiveis = await aba.locator(".produto-card:visible").count();
  if (visiveis !== esperado) { filtrosOk = false; console.log(`         ${slug}: ${visiveis} != ${esperado}`); }
}
checar("as 8 categorias filtram a contagem certa", filtrosOk);

await aba.locator('.chip-filtro[data-cat="todos"]').evaluate((el) => el.click());
await aba.waitForTimeout(120);
checar("filtro Todos volta aos 34", (await aba.locator(".produto-card:visible").count()) === 34);

/* ---- 4. busca com e sem acento ---- */
await aba.fill("#campoBusca", "sinalizacao");
await aba.waitForTimeout(300);
const semAcento = await aba.locator(".produto-card:visible").count();
await aba.fill("#campoBusca", "sinalização");
await aba.waitForTimeout(300);
const comAcento = await aba.locator(".produto-card:visible").count();
checar("busca ignora acento", semAcento === comAcento && semAcento > 0, `${semAcento} = ${comAcento}`);

await aba.fill("#campoBusca", "");
await aba.waitForTimeout(300);

/* ---- 5. selecionar item avulso ---- */
const primeiroLivre = aba.locator(".produto-card:not(.is-fixo) .selecao__campo").first();
await primeiroLivre.evaluate((el) => el.click());
await aba.waitForTimeout(300);
checar("selecionar item avulso atualiza a bandeja",
  /4\s*it/i.test((await aba.locator("#bandejaContagem").textContent()) || ""));

await primeiroLivre.evaluate((el) => el.click());
await aba.waitForTimeout(300);
checar("desmarcar volta para 3",
  /3\s*it/i.test((await aba.locator("#bandejaContagem").textContent()) || ""));

/* ---- 6. janela da lista, quantidade e item travado ---- */
await aba.locator("#btnVerLista").evaluate((el) => el.click());
await aba.waitForTimeout(350);
checar("janela da lista abre", await aba.locator("#modalOrcamento").evaluate((el) => el.open));

const linhas = await aba.locator(".linha-orcamento").count();
checar("3 linhas na lista", linhas === 3, linhas + " encontradas");

const cadeados = await aba.locator(".linha-orcamento__cadeado").count();
checar("itens do kit minimo tem cadeado e nao botao de remover", cadeados === 3, cadeados + " cadeados");
checar("nenhum item obrigatorio pode ser removido",
  (await aba.locator(".linha-orcamento--fixa .linha-orcamento__remover").count()) === 0);

const menos = aba.locator('.linha-orcamento .contador-qtd__botao[data-acao="menos"]').first();
checar("botao de diminuir trava em 1", await menos.isDisabled());

const mais = aba.locator('.linha-orcamento .contador-qtd__botao[data-acao="mais"]').first();
await mais.evaluate((el) => el.click());
await aba.waitForTimeout(200);
const qtd = await aba.locator(".linha-orcamento .contador-qtd__valor").first().inputValue();
checar("botao de aumentar funciona", qtd === "2", "qtd = " + qtd);

/* ---- 7. link final do WhatsApp ---- */
const href = await aba.locator("#btnEnviarLista").getAttribute("href");
checar("link da lista aponta para o numero certo", (href || "").includes("wa.me/" + WHATSAPP));
const texto = decodeURIComponent((href || "").split("?text=")[1] || "");
checar("mensagem separa o kit minimo dos outros itens", texto.includes("*Kit mínimo obrigatório*"));
checar("mensagem lista o extintor", /Extintor ABC/i.test(texto));
checar("mensagem conta as unidades", /unidades no total/.test(texto) || /\ditens?\./.test(texto));

await aba.locator("#btnFecharOrcamento").evaluate((el) => el.click());
await aba.waitForTimeout(250);

/* ---- 8. persistencia entre recargas ---- */
await aba.reload({ waitUntil: "load" });
await aba.waitForTimeout(600);
const depois = await aba.evaluate(() => localStorage.getItem("braskit.orcamento.v1"));
const listaDepois = JSON.parse(depois || "[]");
checar("lista sobrevive a recarga com a quantidade ajustada",
  listaDepois.length === 3 && listaDepois.some((i) => i.qtd === 2));

/* ---- 9. localStorage adulterado ---- */
await aba.evaluate(() => localStorage.setItem("braskit.orcamento.v1",
  JSON.stringify([{ id: 9999, qtd: 3 }, { id: 25, qtd: "abc" }, null, "lixo"])));
await aba.reload({ waitUntil: "load" });
await aba.waitForTimeout(600);
const saneado = JSON.parse(await aba.evaluate(() => localStorage.getItem("braskit.orcamento.v1")) || "[]");
checar("id inexistente e descartado em silencio", !saneado.some((i) => i.id === 9999));
checar("quantidade invalida vira 1", saneado.every((i) => i.qtd >= 1 && i.qtd <= 99));
checar("kit minimo e reposto apos adulteracao",
  [25, 20, 26].every((id) => saneado.some((i) => i.id === id)));

await aba.evaluate(() => localStorage.setItem("braskit.orcamento.v1", "{isto nao e json"));
await aba.reload({ waitUntil: "load" });
await aba.waitForTimeout(600);
checar("json quebrado nao derruba a pagina",
  (await aba.locator(".produto-card").count()) === 34);

/* ---- 10. janela de detalhe ---- */
await aba.locator(".produto-abrir").first().evaluate((el) => el.click());
await aba.waitForTimeout(300);
checar("janela de detalhe abre", await aba.locator("#modalProduto").evaluate((el) => el.open));
const hrefItem = await aba.locator("#modalWhatsapp").getAttribute("href");
checar("'perguntar so sobre este item' usa o numero certo",
  (hrefItem || "").includes("wa.me/" + WHATSAPP));
await aba.keyboard.press("Escape");
await aba.waitForTimeout(250);
checar("detalhe fecha no Esc", !(await aba.locator("#modalProduto").evaluate((el) => el.open)));

/* ---- 11. nenhum numero divergente em lugar nenhum ---- */
for (const pagina of ["index.html", "catalogo.html"]) {
  const p = await contexto.newPage();
  await p.goto(pathToFileURL(resolve(raiz, pagina)).href, { waitUntil: "load" });
  await p.waitForTimeout(400);
  const numeros = await p.evaluate(() => {
    const achados = new Set();
    for (const a of document.querySelectorAll('a[href*="wa.me"]')) {
      const m = a.getAttribute("href").match(/wa\.me\/(\d+)/);
      if (m) achados.add(m[1]);
    }
    return [...achados];
  });
  checar(`${pagina}: todo wa.me usa ${WHATSAPP}`,
    numeros.length === 1 && numeros[0] === WHATSAPP, numeros.join(", "));
  await p.close();
}

/* ---- 12. sem erros de JS ---- */
checar("nenhum erro de JavaScript", errosJs.length === 0, errosJs.join(" | "));

await navegador.close();

const falhas = resultados.filter((r) => !r.ok);
console.log(`\n${resultados.length - falhas.length}/${resultados.length} verificacoes passaram.`);
if (falhas.length) {
  console.log("\nFALHAS:");
  falhas.forEach((f) => console.log("  " + f.nome + (f.detalhe ? "  — " + f.detalhe : "")));
  process.exitCode = 1;
}
