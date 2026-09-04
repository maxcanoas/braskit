# Braskit | site institucional

Site da **Braskit, Kit para Transporte de Cargas Perigosas** (Canoas/RS).
Duas paginas, estaticas, sem framework em runtime e sem servidor.

## Como abrir

De duplo clique em `index.html`. Nao ha npm, build nem servidor para rodar o site.
Todo o CSS e JS e local. So as fontes do Google e o mapa precisam de internet, e
ambos tem reserva: sem rede, o texto cai para Arial Narrow e system-ui.

Conferido no Chrome em 390, 768, 1024 e 1440 px.

## Estrutura

```
index.html          landing one-page com parallax e profundidade 3D
catalogo.html       catalogo com filtros, busca, selecao e janela de detalhe
css/tw.css          utilitarios compilados no build (nao editar a mao)
css/style.css       tema da marca, parallax, animacoes e componentes
js/main.js          parallax, tilt 3D, reveal, contadores, header, menu, formulario
js/produtos.js      os 33 produtos, as 8 categorias, o kit minimo e a imagem de reserva
js/orcamento.js     lista de orcamento: estado, bandeja fixa e janela da lista
js/catalogo.js      render do grid, filtros, busca e janela de detalhe
assets/             SVGs, icones, OG e as 33 fotos de produto
assets/img/         pasta das fotos de ambiente (ver "Imagens" abaixo)
build/              ferramentas de build (CSS, OG e icones)
```

## Arquitetura do CSS (importante)

O site **nao** carrega mais o Tailwind de navegador nem o daisyUI. No lugar
deles, `css/tw.css` traz apenas os utilitarios que as paginas realmente usam,
gerados uma unica vez no build. Resultado: cerca de 47 KB de CSS utilitario
contra 1,4 MB de framework em runtime, sem tela de carregamento e sem
compilacao no celular do cliente.

Editar texto e conteudo nao exige rebuild. So gere o CSS de novo se voce
**usar uma classe utilitaria nova** no HTML ou no JS:

```
npm install
npx playwright install chromium
node build/compilar-css.mjs
```

O script monta uma pagina temporaria com o corpo das duas paginas, compila com
a copia local do Tailwind (`vendor/tailwind-browser.js`, usada so no build) e
salva `css/tw.css`.

**Duas coisas importantes sobre esse build.** Ele compila contra o DOM real,
entao uma classe que nao esteja renderizada naquele instante simplesmente nao
e emitida, sem erro nenhum. Por isso ele carrega tambem `js/orcamento.js` (sem
ele o grid do catalogo quebra em ReferenceError e sai vazio) e falha de
proposito em dois casos: se o grid nao tiver 34 cartoes, e se o `tw.css`
encolher mais de 5%. Se a reducao for intencional, rode com `FORCAR_CSS=1`.

**Regra que evita a armadilha:** dentro de markup gerado por JS, use apenas
classes de componente de `css/style.css`, nunca utilitario novo. O conteudo da
janela do orcamento so existe depois que ela abre, entao qualquer utilitario
usado la nao estaria no DOM na hora da amostragem.

## Cores da marca

O acento e o verde **#56980B**, informado pela Braskit. Ele vive em tres
lugares, e os tres precisam andar juntos:

```
css/style.css              :root  --hazmat-500 / --hazmat-400
build/compilar-css.mjs     @theme --color-hazmat-500 / --color-hazmat-400
css/tw.css                 GERADO -- sai do arquivo acima, nao edite a mao
```

Trocou a cor? Edite os dois primeiros e rode `node build/compilar-css.mjs`.

**O verde cheio so pinta FUNDO.** Com texto petroleo em cima ele da 4,66:1 e
passa AA; como texto ele reprova dos dois lados da pagina (3,34:1 sobre o claro,
3,91:1 sobre o petroleo). Por isso existem dois tons legiveis, e
`--acento-legivel` aponta para o do contexto:

| token | valor | onde | contraste |
|---|---|---|---|
| `--hazmat-500` | `#56980B` | fundo de botao, chip, anel de selecao | 4,66:1 com texto petroleo |
| `--hazmat-400` | `#6CBE0E` | hover de fundo e de texto | 7,12:1 sobre petroleo-950 |
| `--acento-sobre-escuro` | `#61AB0C` | texto e icone sobre petroleo | 4,87:1 sobre petroleo-900 |
| `--acento-sobre-claro` | `#3B6808` | texto e icone na `.secao-clara` | 6,22:1 sobre neutro-50 |

Os quatro foram derivados do matiz e da saturacao do #56980B, e espelham os
contrastes que o laranja anterior tinha -- a hierarquia da pagina nao mudou, so
o matiz. `node build/verificar.mjs` confere isso a cada rodada.

**Dois laranjas ficaram de proposito**, e nenhum dos dois e a marca:

- o **painel de seguranca** (numero de risco / numero ONU) e as **placas de
  risco** do catalogo sao laranja por norma. Estao nas fotos reais dos produtos
  e em `assets/hero-caminhao.svg`;
- o **entardecer** de `assets/faixa-rodovia.svg` e `assets/hero-ceu.svg` e luz,
  nao marca. Essas SVGs sao a reserva de fotos reais de por do sol: pintar o sol
  de verde brigaria com a foto que elas substituem.

O amarelo `--alerta-400: #FFC300` tambem fica: e a faixa zebrada de sinalizacao
rodoviaria, um segundo sinal ao lado do acento, nunca a marca.

## O logo

A marca no header e no rodape reproduz o logo da empresa: **BRAS** grande,
**KIT** menor na MESMA linha de base, e o infinito centrado logo acima do KIT.
As proporcoes nao foram estimadas -- saem medidas do arquivo original, onde
"BRAS" tem 62,5 px de altura de caixa alta:

| medida | no original | no CSS |
|---|---|---|
| KIT / BRAS | 40 / 62,5 px | `font-size: 0.64em` em `.marca-kit` |
| largura do infinito / do KIT | 81 / 70 px | `width: 116%` em `.marca-infinito` |
| folga entre o infinito e o KIT | 9 px = 0,225 da caixa alta | entra no `bottom` |
| proporcao do infinito | 81 x 36 px | `viewBox="0 0 81 36"` |

O `bottom: 1.06em` vem da metrica da Barlow Condensed, nao de tentativa e erro:
numa caixa inline a altura e ascent+descent (1,2em) e a linha de base fica a 1em
do topo, entao o topo da caixa alta esta a 1,2 - 1 + 0,7 = 0,9em do pe da caixa;
somando a folga de 0,225 x 0,7em chega-se a 1,0575em. **Se a fonte do titulo
mudar, esse numero muda junto** -- em `build/og.html`, que usa DejaVu, ele ja e
outro (1,107em).

O container usa `align-items: baseline`, e nao `items-end`: as caixas de texto
tem descida proporcional ao tamanho da fonte, entao alinhar pelo pe faria o KIT,
que e menor, afundar em relacao ao BRAS.

**A armadilha que custou tempo:** `css/style.css` tem um
`img, svg, video, iframe { max-width: 100% }` global. Ele cortava os 116% do
infinito em 100%, e o resultado ficava exatamente da largura do KIT, sem a
sobra dos lados -- sem erro nenhum, so um logo levemente errado. Por isso
`.marca-infinito` traz `max-width: none`.

O infinito e o unico desenho da marca em SVG: dois lacos simetricos com a cauda
inferior direita tracejada, como no original. O tracejado sai de um
`stroke-dasharray` de sete valores que soma o comprimento exato daquela curva.

## Orcamento por selecao (catalogo)

Cada card do catalogo tem uma caixa de selecao no rodape. O que a pessoa
marca entra numa lista que fica numa bandeja fixa no pe da pagina; de la ela
abre a janela da lista, ajusta a quantidade de cada item e manda tudo pelo
WhatsApp numa mensagem so, com o kit minimo separado do resto.

**Kit minimo obrigatorio.** Tres itens ja entram marcados e nao podem ser
tirados. A composicao esta em `KIT_MINIMO`, no fim de `js/produtos.js`:

```js
var KIT_MINIMO = [
  { id: 25, qtd: 1 },  /* Extintor ABC */
  { id: 20, qtd: 1 },  /* Cone Flexivel com Faixa (NBR 15071) */
  { id: 26, qtd: 1 }   /* Par de Calco de Borracha */
];
```

Trocar item, quantidade ou o numero de itens e mexer so nessa lista: o resto
(card travado, cadeado na janela, grupo separado na mensagem) acompanha
sozinho. **Esses tres itens sao uma sugestao tecnica e precisam da palavra
final da Braskit** (ver "O que ainda depende da Braskit").

Detalhes que importam:

- A lista mora no `localStorage` (`braskit.orcamento.v1`), entao sobrevive a
  recarga e a navegacao. Nada vai para servidor. Se o armazenamento estiver
  bloqueado, a lista vale so naquela visita.
- O kit minimo e reposto na carga, mesmo que o armazenamento venha adulterado
  ou de uma versao antiga. Ids que nao existem mais e quantidades invalidas
  sao descartados em silencio.
- Com a bandeja na tela, o botao redondo do WhatsApp some (ela ja tem o CTA) e
  o botao de voltar ao topo sobe.
- O pedido de um item so continua existindo, agora dentro da janela de
  detalhe do produto ("Perguntar so sobre este item").

## Efeitos

- **Parallax** no hero e nas faixas, com um unico requestAnimationFrame e
  apenas transform. Desligado abaixo de 1024 px e para quem ativou "reduzir
  movimento" no sistema.
- **Profundidade ao mouse**: as camadas do hero deslocam alguns pixels seguindo
  o cursor, com interpolacao. So em tela grande e com mouse de verdade.
- **Tilt 3D** nos cartoes de servico e na foto da secao Sobre: inclinacao de
  ate 6 graus com brilho que acompanha o cursor. Mesmas condicoes acima; no
  toque, nada roda e os cartoes mantem o hover simples.
- Scroll reveal, contadores e marquee como antes.

## Imagens

Tudo e gerado por `node build/imagens.mjs`, com sharp. **A regra e nunca
ampliar**: as fotos de ambiente tem 1376 a 1408 px no lado maior e as de
produto tem 730, e upscale so engorda o arquivo fingindo nitidez.

As 33 fotos de produto sao reais, do acervo da empresa, e **todas foram feitas
em estudio, sobre fundo branco**. Chegam com 1264x843 e sao normalizadas na
importacao para 730x487, que e o que o slot pede.

O slot do card e **3:2**, que e a proporcao nativa delas (730x487) -- por isso
31 das 33 aparecem sem corte nenhum, e as duas em retrato aparecem inteiras
sobre o chapado neutro em vez de cortadas na faixa central. O tratamento e
leve, so o suficiente para nao apagar a cor real do produto.

Cada foto tem versao **avif** e **webp** em duas larguras (400 e 720); o jpg
original continua sendo o ultimo degrau antes do placeholder desenhado.

As fotos de ambiente ficam em `assets/img/` e sao **sete**: quatro para tela
larga e tres recortes verticais, usados no celular. Nenhum espaco do site e
16:9, entao cada arquivo tem a sua propria proporcao:

**Voce so precisa colocar os quatro arquivos-fonte** em `assets/img/`, com estes
nomes. O recorte, os tamanhos e os formatos modernos saem do pipeline.

| Fonte | Onde aparece | Recorte que o pipeline aplica |
|---|---|---|
| `hero-rodovia.jpg` | hero | 16:9, sem recorte (a fonte ja e 16:9) |
| `faixa-rodovia.jpg` | faixa depois do Sobre | 12:5, cortando mais do asfalto que do ceu |
| `faixa-noturna.jpg` | faixa da conformidade e topo do catalogo | 12:5, cortando mais do ceu (os cones ficam embaixo) |
| `sobre-kit.jpg` | foto da secao Sobre | 4:3, deslocado para a esquerda |

Cada uma gera avif e webp em ate tres larguras, mais um jpg no recorte certo
para servir de reserva. As duas faixas geram tambem um recorte 4:5 para o
celular. **Nada disso e feito a mao** -- e so rodar `node build/imagens.mjs`
depois de trocar um arquivo.

O ideal ainda e 2400 px no lado maior para o hero. O que existe hoje tem 1408,
porque o Gemini nao entrega mais que isso; o pipeline nao amplia. Os dois
recortes verticais foram derivados do panoramico e nao substituem um recorte
composto -- ver `PENDENCIAS.md`.

A secao Sobre nao tem versao vertical: a caixa da foto e 4:3 em toda largura.

Os prompts prontos para gerar essas imagens no Gemini estao em
`gemini-prompts-imagens.txt`, na raiz do projeto, com a mesma tabela e um
aviso importante: o Gemini entrega no maximo cerca de 1408 px no lado maior,
entao para chegar ao ideal e preciso um upscale de 2x depois.

**Como o recorte e escolhido.** As duas faixas e o topo do catalogo usam
`<picture>`: abaixo de 640 px entra o recorte 4:5, e a panoramica vale para o
resto. O hero e diferente -- no celular ele nao troca de arquivo: a foto vira
uma faixa de 34% no pe, onde a caixa fica em 1,44:1 e a panoramica aparece com
quase 80% da largura. Um recorte 9:16 derivado dela mostraria um close sem
composicao.

**Se um arquivo faltar, o site nao quebra.** `js/main.js` desce a reserva um
degrau por vez, sozinho:

```
recorte vertical  ->  foto panoramica  ->  SVG de reserva
```

E o que permite subir as fotos aos poucos. O mesmo vale dentro do `<picture>`:
se o avif e o webp nao existirem, o jpg assume.

**Cuidado ao mexer nisso:** dentro de um `<picture>`, o `<source>` vence o
`src`. Por isso tanto `reservaDeAmbiente()` em `js/main.js` quanto
`protegerFotos()` em `js/produtos.js` removem os `<source>` ANTES de trocar o
`src` -- sem isso, uma foto faltando viraria caixa vazia em vez de reserva.

## O que ainda depende da Braskit

**A lista completa e detalhada esta em `PENDENCIAS.md`, na raiz.** Resumo:

1. **Quais sao os itens do kit minimo obrigatorio**, e quantos de cada um.
2. **Fotos de verdade** -- kit montado, fachada, balcao, equipe.
3. **Ano de fundacao, CNPJ e razao social.**
4. **Numero de CA de cada EPI, faixa de preco, prazo em dias, garantia e prova
   social** -- nada disso existe hoje no site.
5. **Revisao tecnica das 33 fichas de produto.**
6. **Aprovar (ou nao) a proposta de taxonomia por uso** registrada no
   `PENDENCIAS.md`.
7. **Avaliacoes no Google**, que dependem do acesso ao Meu Negocio.

## Verificacao

Dois scripts, ambos em Playwright, ambos rodando em `file://` -- que e como o
site e aberto:

```
node build/verificar.mjs        # 2 paginas x 5 viewports, com e sem webfont
node build/verificar-fluxo.mjs  # 34 verificacoes do caminho que vende
node build/fatiar.mjs atual     # corta os screenshots em fatias legiveis
```

O primeiro afirma: nenhum estouro horizontal (e, quando ha, PROVA quem causou,
escondendo o candidato e remedindo o scrollWidth), contraste AA de todo par
texto/fundo visivel, `width`/`height` em toda imagem, nenhuma referencia
quebrada, peso dentro do limite e a ordem de foco por teclado.

O segundo exercita selecao, filtro, busca com e sem acento, quantidade, kit
minimo travado, persistencia no `localStorage` (inclusive adulterado) e o link
final do WhatsApp.

`build/metricas-fonte.mjs` remede as fontes de reserva; so precisa rodar de
novo se a pilha de fontes mudar.

## Checklist de publicacao

1. Suba tudo, exceto `build/`, `vendor/` e `comercial/` (a pasta `vendor/` so
   serve ao build e pode ate ser apagada do servidor).
2. Confirme que o dominio final e `braskitcargasperigosas.com.br`. Ele esta
   fixado no canonical, no Open Graph, no JSON-LD e no `sitemap.xml`.
3. `robots.txt` e `sitemap.xml` vao na raiz do dominio.
4. Atencao ao WhatsApp: o site antigo tinha um link com o numero errado
   (faltava o 9). Aqui todos os links usam `5551993011327`. Nao reaproveite
   links do site antigo.
5. Depois de publicar, valide o compartilhamento (WhatsApp e Facebook usam
   `assets/og-braskit.png`, 1200 x 630).

## Notas de SEO local

- JSON-LD LocalBusiness com endereco, coordenadas, horario (com almoco),
  areaServed cobrindo o Rio Grande do Sul e sameAs para o Facebook.
- A secao Onde Atendemos lista as principais cidades do estado. Quando o plano
  de expansao avancar, o proximo passo natural sao paginas por cidade.
- O carro-chefe (Kit Cargas Perigosas) segue na ultima categoria do catalogo,
  como no catalogo fisico. Vale conversar com a Braskit sobre reorganizar.

Braskit, 2026. Site por DEVMRMORAES.
