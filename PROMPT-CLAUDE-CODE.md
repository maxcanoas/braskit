# Prompt para o Claude Code — Braskit

> Abra o Claude Code na raiz `D:\Clientes\braskit-novo` e cole o bloco abaixo inteiro.
> Sugestão: rode em modo plano primeiro (`shift+tab` até "plan mode") para revisar o plano antes de deixar editar.

---

Você é o diretor de arte e o front-end lead de uma agência de marketing. Recebeu um site
institucional que **funciona**, mas que qualquer pessoa da área identifica em cinco segundos
como "site gerado por IA". Sua tarefa é levá-lo ao padrão visual de um trabalho de agência
— aquele nível em que o cliente sente que pagou por design, não por template.

O projeto está nesta pasta. Leia `README.md` antes de qualquer coisa: ele explica a
arquitetura (HTML estático, CSS utilitário pré-compilado em `css/tw.css`, tema em
`css/style.css`, JS vanilla, sem framework em runtime, sem servidor).

## Regras invioláveis

1. **Não invente informação de negócio.** Nada de CNPJ, razão social, ano de fundação exato,
   depoimentos, nomes de clientes, número de kits vendidos, prazos ou preços. Onde faltar
   dado real, use um marcador visível `<!-- PENDENTE BRASKIT: ... -->` e liste tudo em
   `PENDENCIAS.md` na raiz. Preferir um bloco a menos a um bloco inventado.
2. **Não quebre o fluxo comercial.** Todos os caminhos terminam no WhatsApp `5551993011327`
   (não use nenhum outro número; o site antigo tinha um errado). O orçamento por seleção do
   catálogo, o `localStorage` `braskit.orcamento.v1` e o kit mínimo obrigatório continuam
   funcionando exatamente como hoje.
3. **Continua estático.** Duplo clique em `index.html` tem que abrir. Sem framework em
   runtime, sem build obrigatório para editar texto. Se usar uma classe utilitária nova,
   rode `node build/compilar-css.mjs` e comite o `css/tw.css` regenerado.
4. **Nada de gambiarra visual.** Não adicione emoji, não adicione glassmorphism novo, não
   adicione mais um grid de três cards com ícone, não adicione gradiente colorido, não use
   ícone de biblioteca genérica onde já existe SVG desenhado à mão.
5. **Trabalhe em commits pequenos**, um por fase, com mensagem descrevendo o que mudou
   visualmente. Não faça um commit monolítico.

## Diagnóstico já feito — parta daqui, mas confirme cada item no código

### A. Bugs de layout que destroem a percepção de qualidade (prioridade máxima)

- **`catalogo.html` estoura na horizontal entre 1024 e 1440 px.** `document.scrollWidth`
  chega a **1764 px** num viewport de 1440. Causa: na barra de filtros
  (`catalogo.html`, div `.filtros-sticky`), o container dos chips tem
  `lg:overflow-visible` e nenhum `min-w-0`, então o flex item não encolhe e empurra o bloco
  de busca para fora da tela. **O campo de busca aparece cortado pela metade no desktop** —
  é a primeira coisa que o cliente vê ao clicar em "Catálogo". Corrija com `min-w-0` +
  estratégia de wrap/scroll que aguente 8 chips.
- **`index.html` estoura ~12 px em 390 px e 1 px em 768 px** (`scrollWidth` 402 e 769).
  Vem do losango decorativo `-left-5 -top-5` e da caixa `tilt-3d` na seção Sobre. Hoje isso
  é mascarado por `body { overflow-x: hidden }` em `css/style.css` — que é justamente o
  curativo que esconde o problema. Corrija na origem e **remova o `overflow-x: hidden`**,
  para que qualquer estouro futuro apareça em vez de ser escondido.
- **A pilha de fonte de reserva quebra o layout.** Os títulos usam Barlow Condensed com
  reserva `Arial Narrow, system-ui`. Em Linux/Android não há Arial Narrow: cai em system-ui,
  que é ~30% mais largo. Com `display=swap` isso acontece em toda primeira visita e no
  offline. Resultado observado: em 390 px o card de categoria "SINALIZAÇÃO" fica cortado e
  "ACESSÓRIOS PARA CAMINHÃO" quebra em três linhas, desalinhando o grid. Corrija com um
  `@font-face` de fallback usando `size-adjust` / `ascent-override` / `descent-override`
  calibrado para o Barlow Condensed, e garanta que nenhum título dependa de largura exata.

### B. Imagens — o maior delator de "feito por IA"

- **As 4 fotos de ambiente (`assets/img/`) são geradas por IA** (os prompts estão em
  `gemini-prompts-imagens.txt`) e **têm os defeitos clássicos**: em `sobre-kit.jpg` as luvas
  têm costura impossível, o extintor está preso na bolsa de um jeito que não existe, as
  ferramentas no painel de fundo flutuam; em `faixa-noturna.jpg` os cones estão numa fila
  geometricamente perfeita, as faixas refletivas são inconsistentes entre cones e os rastros
  de luz não batem com a direção do tráfego. **Nenhuma delas mostra a Braskit.**
- **Estão simultaneamente pesadas demais e pequenas demais.** Medidas reais:
  `hero-rodovia.jpg` 1408×768 / 857 KB; `faixa-rodovia.jpg` 1376×768 / 748 KB;
  `sobre-kit.jpg` 1376×768 / 715 KB; `faixa-noturna.jpg` 1376×768 / 621 KB. Isso é
  0,6–0,8 byte por pixel, cerca de 4× o alvo. O próprio `README.md` pede 2400×1350 e 380 KB
  para o hero. Em tela 1440 a foto já é ampliada; em retina é borrão.
- **As proporções estão erradas.** A caixa do Sobre é 4:3 e a foto é 16:9; as faixas são
  12:5 e as fotos são 16:9. O CSS corta na marra e a composição se perde.
- **Os recortes verticais não existem.** `hero-rodovia-mobile.jpg`,
  `faixa-rodovia-mobile.jpg` e `faixa-noturna-mobile.jpg` são referenciados em `<picture>`
  mas não estão em `assets/img/`. Toda visita mobile faz uma requisição perdida e um segundo
  download pela cascata de reserva do `js/main.js`.
- **As 34 fotos de produto são reais, e esse é o problema.** São fotos de celular tiradas no
  estoque: prateleira de aço, caixas de papelão, sacos plásticos, banquinho de madeira,
  capacete no chão, flash duro. Estão em 730×487 (paisagem) e o card do catálogo é 1:1 —
  o corte quadrado joga fora um terço da largura e frequentemente descentraliza o produto.
  O tratamento duotone laranja em `.produto-foto` é um curativo que uniformiza o caos, mas
  entrega um catálogo alaranjado e ilegível onde deveria haver produto.

**O que fazer com imagem:**

- Fotos de produto: **recorte o fundo** dos 34 arquivos (o objetivo é produto sobre chapado
  neutro da marca, com sombra suave e enquadramento consistente). Se você não puder rodar
  remoção de fundo aqui, **não invente**: monte o pipeline (script + instruções em
  `PENDENCIAS.md`), padronize o slot para uma proporção que respeite o material existente
  (3:2, e não 1:1) e **reduza drasticamente o duotone** para que a cor real apareça.
- Fotos de ambiente: reduza a dependência delas. Reescreva o hero e as faixas para
  funcionarem com **menos foto e mais tipografia + linguagem gráfica da marca** (faixa
  zebrada, losango de risco, cor petróleo). Onde a foto ficar, gere `webp` + `avif`,
  `srcset` em 768/1280/1920 com `sizes`, `width`/`height` reais em todo `<img>`, e crie os
  recortes verticais ou remova os `<source>` que apontam para arquivos inexistentes.
- Registre em `PENDENCIAS.md`, em destaque: **foto real da fachada, do balcão, da equipe e
  de um kit montado pela Braskit vale mais que tudo isso junto.**

### C. O sistema visual está genérico

Sintomas concretos, todos verificáveis no código:

- **Uma única forma para tudo.** Card com borda `1px rgba(255,255,255,.08)`, raio `1rem`,
  ícone em quadrado arredondado de 3rem, `translateY(-6px)` no hover — repetido em
  `.cartao-escuro`, `.card-categoria`, `.segmento-card`, `.item-kit`, `.faq-item`,
  `.produto-card`. Seis componentes, um desenho só.
- **Um único ritmo.** Oito seções seguidas com o mesmo molde: losango laranja + olho em
  caixa-alta com `letter-spacing: .22em` + H2 + parágrafo de duas linhas + grid. O olho de
  caixa-alta aparece 8 vezes só na home.
- **Uma única cor de destaque.** `--hazmat-500: #ff6b00` em absolutamente todo acento:
  olho, ícone, número, borda de hover, botão, link, chip ativo, sublinhado. Sem hierarquia,
  o laranja deixa de significar "aqui" e vira ruído.
- **Alternância mecânica claro/escuro** a cada seção, sem nenhuma variação de densidade,
  largura de coluna ou escala tipográfica.
- **Escala tipográfica achatada.** Fora dos H2, quase todo texto é `text-sm` ou `text-base`;
  as descrições de card são todas `0.875rem`; os "olhos" todos `0.75rem`. Falta contraste de
  tamanho, peso e cor — é o que dá aparência de "gerado".

**O que fazer:** construa um **sistema**, não mais componentes.

- Uma escala tipográfica com degraus reais (mínimo 5 níveis usados de fato), definida em
  tokens no `:root` e aplicada consistentemente. Um `measure` (largura de leitura) máximo de
  ~68 caracteres nos parágrafos longos — hoje eles atravessam a coluna inteira.
- Uma escala de espaçamento em variáveis, com **ritmo vertical variável entre seções** (nem
  toda seção merece o mesmo `padding-block`). Seções de respiro curtas, seções de conteúdo
  largas.
- Hierarquia de acento: defina 3 papéis para o laranja (ação primária, dado numérico,
  destaque tipográfico) e **tire-o de todo o resto**. Traga o amarelo `--alerta-400` e o
  petróleo claro para os papéis secundários. Hoje `--alerta-400` e `--perigo-500` estão
  declarados e praticamente não são usados.
- **Diferencie os componentes.** Card de serviço, card de segmento, item de kit e card de
  produto precisam ter desenhos distintos — peso de borda, densidade, tratamento de ícone,
  comportamento no hover. Escolha um deles para ser o "herói" da seção em vez de três iguais
  lado a lado.
- Layout: quebre a simetria. Grids assimétricos, um item em destaque, alinhamento óptico,
  sobreposição controlada de elementos entre seções. Hoje é um empilhamento de faixas.
- Movimento: hoje tudo entra igual (`translateY(28px)`, 0.7s, delays de 60/80/90 ms em
  cascata em quase toda seção). Reduza o número de elementos animados, varie a intenção e
  **respeite `prefers-reduced-motion`** (já respeitado no parallax, estenda ao reveal).

### D. Copy — o texto também entrega

Achados literais para corrigir (o texto está nos dois HTML e em `js/produtos.js`):

- **"Segurança que acompanha cada quilômetro"** (H1) serve para pneu, seguro e rastreador.
  Zero informação. Substitua por promessa concreta e verificável.
- **"Protegendo vidas, preservando o futuro"** aparece 3 vezes (JSON-LD `slogan`, H2 da
  seção Sobre, rodapé das duas páginas). É o H2 de "Quem somos" — a empresa se apresenta
  sem dizer uma única coisa sobre si.
- **"Falar com um especialista"** repetido palavra por palavra nos 3 cards de serviço, mais
  uma 4ª variante no catálogo. Dê a cada card um CTA que corresponda ao serviço.
- **A barra de números é decorativa.** "34 produtos em linha" e "8 categorias" são taxonomia
  interna do site, não benefício. **"100% CONTRAN/ABNT" com contador animado subindo de 0 a
  100 é promessa fantasiada de estatística** — remova. Substitua por dados reais quando a
  Braskit fornecer (marque como pendência).
- **"mais de 30 anos" aparece 5 vezes** e nunca vira um ano; e conflita com "desde os anos
  90 na estrada". Escolha um lugar, use o ano exato (pendência) e corte os outros quatro.
- **Frases quebradas:** *"…para a emergência que ela existe para evitar"* (o "ela" não tem
  antecedente); *"A Braskit é uma revenda que existe há mais de 30 anos e somos
  especializados…"* (troca de pessoa na mesma frase); *"aprendeu as necessidades de cada uma
  delas"* (antecedente no singular); *"das normas do CONTRAN e ABNT"* (falta o "da", que o
  próprio site acerta em outros quatro pontos).
- **Uniformidade sobrenatural:** as 34 `descricao` de `js/produtos.js` têm **exatamente uma
  frase cada** (9 a 13 palavras) e as 34 `aplicacao` também. Desvio-padrão zero é assinatura
  de máquina. Varie: alguns produtos merecem quatro linhas, a maioria merece nome + medida.
- **Falta o que fecha venda:** zero ocorrência de "preço" e "garantia"; nenhum prazo em dias;
  nenhum número de CA nos EPIs (primeira pergunta de qualquer frotista); nenhuma prova
  social. Crie o espaço no layout e marque como pendência.
- **Taxonomia do catálogo é a planilha do fornecedor**, não a cabeça do caminhoneiro:
  "Injetados" e "Têxtil" são processos de fabricação; existe uma categoria chamada
  "Produtos" dentro de um catálogo de produtos; o extintor está em "Acessórios para
  caminhão". Proponha (sem aplicar sozinho) uma taxonomia por uso e registre a proposta em
  `PENDENCIAS.md` para a Braskit aprovar.
- **SEO:** o H1 do catálogo é a palavra "Catálogo". O site diz "cargas perigosas" 15 vezes e
  "produtos perigosos" só 2 — mas a norma e a busca usam "produtos perigosos". "NBR 9735" só
  aparece dentro do marquee, que é `aria-hidden="true"`. Falta `FAQPage` no schema apesar do
  FAQ existir pronto.

**Regra de voz:** a única frase do site que soa a gente de verdade é *"a loja fica em Canoas
e o café está sempre passado"*. Use esse registro como referência: revenda gaúcha de balcão
falando com caminhoneiro — direta, específica, sem marketês, sem gerúndio de slogan.

### E. Acessibilidade e performance (um site de agência não reprova nisso)

- **Contraste do CTA principal reprova AA: `#ff6b00` com texto branco dá 2,85:1** (mínimo
  4,5:1). Afeta todos os botões primários e o chip ativo do catálogo. Corrija escurecendo o
  laranja de texto para ~`#c24f00` **ou** usando texto `--petroleo-950` sobre o laranja
  (~10:1). O `#ff6b00` continua válido como cor de ícone, borda e elemento gráfico.
- Rodapé com `text-white/40` e `text-white/35` sobre `--petroleo-950` em corpo de 12 px:
  3,7:1 e 3,2:1. Mínimo `white/55`.
- **Não há skip link**, apesar de existir `<main id="conteudo">`.
- **O menu mobile não prende o foco**: `main` e `footer` não recebem `inert` quando abre.
- **Alvos de toque abaixo de 44 px**: botões de quantidade (28×28), remover item (32×32),
  chips de filtro (~40 px de altura), hambúrguer.
- `aria-live` do contador de resultados está no elemento `hidden sm:block` — região viva
  dentro de `display:none` não anuncia. O elemento mobile, que é o único visível abaixo de
  640 px, não tem `aria-live`.
- Nenhum `<img>` tem `width`/`height` → CLS garantido.
- **Sem JS, o catálogo é uma página em branco** e não há `<noscript>` em lugar nenhum.
- O grid inteiro é recriado via `innerHTML` a cada tecla digitada na busca (34 `<article>`,
  34 `<img>`, 34 listeners) — troque por render único + filtro por classe.
- Dois laços `requestAnimationFrame` concorrentes em `js/main.js` (o do parallax e o da
  interpolação de mouse) e as camadas do hero continuam recebendo `transform` mesmo fora da
  viewport.
- `will-change: transform` permanente em `.camada-parallax`, `.faixa-parallax__fundo` e
  `[data-parallax]` mantém camadas na GPU a sessão inteira.
- `window.open()` no envio do formulário não verifica o retorno: se o popup for bloqueado
  (comum no iOS), o usuário vê "Mensagem pronta!" **e o formulário é apagado** — lead perdido
  em silêncio. O `<textarea>` também não tem `maxlength`.
- Valide o embed do Google Maps em `index.html`: a `src` usa um `pb` curto montado à mão
  (`?pb=!1m2!2m1!1sRua%20Uruguai...`) em vez do gerado pelo próprio Maps. Confirme no
  navegador; se não renderizar, troque pelo embed real ou por imagem estática com link.

### F. Pendência de negócio que não é design

`js/produtos.js` trava um `KIT_MINIMO` de 3 itens (extintor, 1 cone, 1 par de calços) e o
próprio comentário no arquivo admite que é sugestão não validada. A NBR 9735 pede quatro
dispositivos de sinalização. **Isso chega ao cliente como se fosse informação oficial da
Braskit.** Não corrija por conta própria: destaque no topo do `PENDENCIAS.md` e, se for
apresentar antes da validação, coloque uma nota visível de "sugestão a confirmar" na
interface do kit mínimo.

## Ordem de trabalho

1. **Fase 1 — Estabilizar.** Todos os estouros horizontais, o fallback de fonte, o contraste
   AA e os `width`/`height` das imagens. Sem isso, nada mais importa. Commit.
2. **Fase 2 — Sistema.** Tokens de tipografia, espaçamento e cor; hierarquia de acento;
   diferenciação dos seis componentes-clones. Commit.
3. **Fase 3 — Composição.** Reescrever o layout das seções que hoje são "faixa + grid":
   hero, Sobre, Serviços, Categorias, Quem atendemos. Quebrar simetria, variar densidade,
   reduzir o número de seções se duas disserem a mesma coisa. Commit.
4. **Fase 4 — Imagem.** Pipeline de produto, formatos modernos, `srcset`, recortes que
   faltam ou remoção dos `<source>` órfãos, redução do duotone. Commit.
5. **Fase 5 — Copy.** Aplicar as reescritas da seção D e registrar as pendências. Commit.
6. **Fase 6 — Acessibilidade, performance e limpeza de JS.** Commit.
7. **Fase 7 — Verificação.** Ver abaixo.

## Verificação obrigatória (não me diga que está pronto sem isso)

Escreva um script Playwright em `build/verificar.mjs` que, para `index.html` e
`catalogo.html`, nos viewports **390, 768, 1024, 1440 e 1920**:

- afirme que `document.documentElement.scrollWidth <= viewport.width` (hoje falha em 3 dos
  10 casos);
- liste todo elemento cujo `getBoundingClientRect().right` ultrapasse a viewport, ignorando
  os que têm ancestral com `overflow: hidden`;
- capture screenshot de página inteira em `build/screens/` **com e sem as webfonts**
  (bloqueie `fonts.googleapis.com` na segunda rodada) e compare se algum bloco quebra;
- calcule a razão de contraste de todo par texto/fundo visível e falhe abaixo de 4,5:1 para
  corpo e 3:1 para texto grande;
- confirme que todo `<img>` tem `width` e `height`;
- confirme que nenhuma `src`/`srcset` aponta para arquivo inexistente;
- rode uma navegação só por teclado no `index.html` e reporte a ordem de foco.

**Olhe os screenshots você mesmo antes de me responder.** Se algum ficar feio, conserte e
rode de novo. Não me entregue "os testes passaram" com uma tela ruim.

## Critérios de aceite

- Zero estouro horizontal em 390/768/1024/1440/1920, com `overflow-x: hidden` removido do
  `body`.
- Layout íntegro com e sem webfont carregada.
- Todo texto passa AA; CTA principal passa AA.
- Nenhum `<img>` sem `width`/`height`; nenhuma referência a arquivo inexistente.
- Peso total da home abaixo de **1,2 MB** na primeira visita (hoje só as 4 fotos de ambiente
  somam ~2,9 MB) e do catálogo abaixo de **1,5 MB**.
- Os seis componentes de card não são mais variações do mesmo desenho.
- O laranja `#ff6b00` aparece em no máximo três papéis definidos, não em todo acento.
- Nenhuma frase nova inventada sobre a empresa; `PENDENCIAS.md` existe e está preenchido.
- O fluxo de orçamento do catálogo (seleção → bandeja → WhatsApp) funciona idêntico ao de
  hoje, incluindo persistência no `localStorage`.
- `git log` mostra um commit por fase.

## Entregável final

Ao terminar, escreva `RELATORIO.md` na raiz com: o antes/depois em números (peso, contraste,
scrollWidth por viewport), a lista do que mudou por fase, o que ficou pendente da Braskit, e
**três decisões de design que você tomou e o motivo** — em uma frase cada. Nada de resumo
genérico.

---

*Análise-base: Claude (Cowork), 24/08/2026.*
