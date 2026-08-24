# Braskit — o que mudou, em números

Reforma de design do site institucional, em sete fases, com um commit por fase.
Todos os números abaixo foram **medidos**, não estimados: saíram de
`build/verificar.mjs`, que roda as duas páginas em cinco viewports, e de
`build/verificar-fluxo.mjs`, que exercita o caminho que vende.

O estado inicial está congelado em `build/baseline.json` e no primeiro commit.

---

## Antes e depois

### Estouro horizontal

`document.documentElement.scrollWidth` com o `body { overflow-x: hidden }` removido,
que é o número real — com o curativo ligado, três destes casos mentiam.

| | 390 | 768 | 1024 | 1440 | 1920 |
|---|---|---|---|---|---|
| `index.html` antes | **402** | **769** | 1024 | 1440 | 1920 |
| `index.html` depois | 390 | 768 | 1024 | 1440 | 1920 |
| `catalogo.html` antes | 390 | 768 | **1645** | **1732** | **1972** |
| `catalogo.html` depois | 390 | 768 | 1024 | 1440 | 1920 |

**Cinco casos estouravam, não três.** E o culpado no `index.html` não era o que o
diagnóstico apontava: o losango decorativo sangra para a **esquerda**, e em leitura
da esquerda para a direita isso não cria barra nenhuma. Quem estourava era o
`translateX(+32px)` de `[data-reveal="direita"]`, que só existe antes de o bloco ser
revelado. Em 390 px o container tem 20 px de respiro, 32 − 20 = **12 px** — exatamente
o excesso medido.

No catálogo, a régua de nove chips não encolhia por falta de `min-width: 0` e
empurrava o bloco de busca para fora: **+621 px** em 1024.

### Peso da página

Sem rolar / depois de rolar a página inteira.

| | antes | depois | limite |
|---|---|---|---|
| `index.html` | 2.635 / **3.333 KB** | 457 / **643 KB** | 1.229 KB |
| `catalogo.html` | 2.741 / **3.270 KB** | 552 / **587 KB** | 1.536 KB |

O hero sozinho caiu de **857 KB** (jpg) para **62 KB** (avif, mesma largura). As quatro
fotos de ambiente somavam 2.941 KB; as versões avif nos tamanhos máximos somam 155 KB.

### Contraste

Todo par texto/fundo visível, com composição de alfa, medido nas duas páginas em
390 e 1440.

| | antes | depois |
|---|---|---|
| `index.html` | **14 reprovam** de 56 pares | **0** de 105 |
| `catalogo.html` | **11 reprovam** de 29 pares | **0** de 50 |

O detector encontrou quase o dobro de pares depois porque ele mesmo estava cego: o
Tailwind v4 serializa `text-white/60` como `oklab(...)` e `color-mix()` como
`color(srgb ...)`, e o parser inicial só entendia `rgb()`. Trocado por leitura de
pixel em canvas, que aceita qualquer formato — foi assim que o rodapé apareceu, com
os 3,71:1 e 3,15:1 que o diagnóstico previa.

O caso principal: o CTA primário passou de **2,85:1** (branco sobre `#ff6b00`) para
**5,82:1** (petróleo sobre o mesmo laranja). O diagnóstico estimava ~10:1 para essa
combinação; o valor real é 5,82:1 — passa AA com folga, mas o número estava errado.
E `#c24f00` sobre `--neutro-50` dá **4,47:1**, reprovando por pouco: o laranja de
texto em fundo claro ficou em `#b34900` (5,09:1).

### Imagens e referências

| | antes | depois |
|---|---|---|
| `<img>` sem `width`/`height` | **43** (4 + 39) | 0 |
| `src`/`srcset` apontando para arquivo inexistente | **4** | 0 |

Os quatro `<source>` órfãos custavam uma requisição perdida em toda visita mobile — e
no hero isso atrasava o LCP, porque a imagem carrega com `fetchpriority="high"`.

### Layout sem webfont

Blocos com variação de altura acima de 8% entre a rodada com e sem webfont:
**5 antes, 1 depois** (14% num bloco, em 390 px — refluxo de uma linha, sem nada
cortado nem sobreposto).

O `size-adjust` das faces de reserva foi **medido**, não chutado: Barlow Condensed
ocupa **66,89%** da largura da Arial no peso 700, e Inter **105,80%** no peso 400.
`build/metricas-fonte.mjs` mede as strings reais do site em caixa alta — medir em
minúsculas daria um número errado para uma display condensada.

### Verificações

| | antes | depois |
|---|---|---|
| `build/verificar.mjs` | **86 falhas** | 0 |
| `build/verificar-fluxo.mjs` | — | **34/34** |

---

## O que mudou, por fase

**Fase 0 — o build não era reproduzível.** `build/compilar-css.mjs` nunca carregava
`js/orcamento.js`, então `montarCard()` quebrava em `ReferenceError`, o grid do
catálogo saía vazio e o próximo rebuild teria apagado seis utilitários que só existem
no card gerado por JS. O `corpo()` também fatiava o HTML depois do `>` que fecha
`<body …>`, então as classes da própria tag nunca eram escaneadas. Corrigidos, mais
dois guardas: o build falha se o grid não renderizar 34 cartões e se o `tw.css`
encolher mais de 5%.

**Fase 1 — estabilizar.** Estouro horizontal zerado nos dez casos com o
`overflow-x: hidden` removido; faces de reserva calibradas; contraste em AA;
`width`/`height` em toda imagem.

**Fase 2 — sistema.** Sete degraus de tipografia, escala de espaço, três densidades de
seção e tokens de estrutura no `:root` — antes eram 42 `font-size` soltos em 16 valores
e oito trackings diferentes só para rótulo, hoje três. Os seis componentes que eram o
mesmo cartão (borda de 1px, raio de 1rem, `translateY(-6px)` no hover) viraram seis
desenhos; nenhum `translateY(-6px)` restou no CSS.

**Fase 3 — composição.** Doze seções viraram dez, por fusão: "quem atendemos" com
"onde atendemos", e "composição do kit" com "categorias". A barra de contadores saiu.
Grades assimétricas (5/7 no Sobre, 1,35/1/1 nos serviços) e a grade de categorias com o
carro-chefe ocupando quatro células. Os `data-reveal` caíram de 84 para 40.

**Fase 4 — imagem.** avif/webp com `srcset`, recorte pensado por slot, slot de produto
de 1:1 para 3:2 e o duotone laranja trocado por correção leve.

**Fase 5 — copy.** H1 concreto, slogan de quatro ocorrências para duas, "mais de 30
anos" removido das nove, quatro frases quebradas corrigidas, `FAQPage` no schema e as
34 fichas de produto com variação real de tamanho.

**Fase 6 — acessibilidade, performance e JS.** Skip link, foco preso no menu, alvos de
44 px, `<noscript>`, render único no catálogo, `window.open` trocado por clique
programático e `will-change` permanente removido.

**Fase 7 — verificação.** Os dois scripts, os screenshots nos dez casos com e sem
webfont, e este relatório.

---

## Três decisões de design, e o motivo

1. **O laranja saiu de tudo o que não é ação, dado numérico ou destaque tipográfico, e
   o amarelo — que estava declarado no tema e quase sem uso — assumiu norma e estado**,
   porque um acento que aparece em todo lugar deixa de significar "aqui" e vira ruído:
   eram 44 declarações espalhadas pelo CSS, hoje são 22 elementos na home, todos
   mapeáveis num dos três papéis.

2. **Dos seis componentes que eram o mesmo cartão, só o de produto continuou sendo
   cartão**, porque é o único objeto de merchandising da página e é justamente a
   moldura que faz 34 fotos tiradas de celular no estoque lerem como um conjunto — os
   outros cinco viraram bloco editorial, ladrilho, lista, chip e documento.

3. **No celular a foto do hero virou uma faixa de 34% no pé, em vez de ganhar o recorte
   9:16 que faltava**, porque derivar um vertical de uma foto 16:9 produziria um close
   sem composição: na faixa a caixa fica em 1,44:1 e a foto aparece com quase 80% da
   largura, contra os 31% que o recorte em tela cheia mostrava.

---

## O que ficou pendente da Braskit

Detalhado em **`PENDENCIAS.md`**. Em resumo, e em ordem de impacto:

1. **A composição real do kit mínimo obrigatório.** O catálogo trava três itens no
   orçamento de todo visitante, e essa composição é uma sugestão técnica que ninguém da
   empresa validou. A NBR 9735 trata da quantidade de dispositivos de sinalização, então
   é provável que a quantidade do cone não seja 1. Até lá, há uma nota visível na janela
   do orçamento dizendo que a composição é sugerida.
2. **Fotos de verdade** — kit montado, fachada, balcão, equipe. Vale mais que tudo o
   resto desta lista junto.
3. **Ano de fundação, CNPJ e razão social.** O ano saiu de nove lugares porque
   "mais de 30 anos" e "desde os anos 90" são afirmações diferentes.
4. **Número de CA de cada EPI, faixa de preço, prazo em dias, garantia e prova
   social** — nada disso existe hoje no site, e todos são perguntas que o cliente faz.
   O espaço está reservado com marcadores no HTML.
5. **A proposta de taxonomia por uso**, registrada e **não aplicada**: os `slug` são
   chave de 14 links e os `id` dos produtos são chave da lista de orçamento salva no
   navegador de quem já visitou.

---

## O que eu decidi não fazer, e por quê

- **As quatro fotos geradas por IA continuam no site**, por decisão sua. Elas foram
  reotimizadas, recortadas na proporção certa de cada espaço e a do Sobre teve o
  enquadramento deslocado para a parte crível da imagem (a bolsa e o extintor), mas os
  defeitos continuam lá. Está em destaque no `PENDENCIAS.md`.
- **São dez seções, não nove.** Duas fusões eram genuínas e foram feitas. A terceira
  candidata — a faixa "desde os anos 90" — tinha problema de texto, não de existência:
  uma faixa full-bleed entre duas seções densas está fazendo trabalho real de respiro, e
  enfiá-la dentro de uma seção com padding sairia pior. A Fase 5 deu a ela uma mensagem
  que não repete nenhuma outra.
- **O recorte de fundo das 34 fotos de produto não foi executado.** O script está
  pronto em `build/recortar-fundos.mjs`. Recorte automático em foto de estoque com flash
  duro produz halo na borda e come a ponta fina do cone; 34 arquivos sem revisão humana
  sairiam piores que os atuais.
- **A taxonomia do catálogo não foi mexida.** É decisão comercial, e mexer nos `slug`
  quebraria links e mexer nos `id` mudaria a lista salva de quem já visitou.

---

## Como conferir

```
npm install                        # playwright e sharp, só para o build
npx playwright install chromium

node build/verificar.mjs           # 2 páginas x 5 viewports, com e sem webfont
node build/verificar-fluxo.mjs     # 34 verificações do caminho que vende
node build/fatiar.mjs atual        # corta os screenshots em fatias legíveis
```

O site publicado continua **100% estático**: duplo clique em `index.html` abre, sem
npm, sem servidor e sem framework em runtime. As dependências servem apenas ao build e
à verificação, e não vão para o servidor.

Para regerar o CSS depois de usar uma classe utilitária nova:
`node build/compilar-css.mjs`. Para regerar as imagens depois de trocar uma foto:
`node build/imagens.mjs`.
