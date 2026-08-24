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
js/produtos.js      os 34 produtos, as 8 categorias, o kit minimo e a imagem de reserva
js/orcamento.js     lista de orcamento: estado, bandeja fixa e janela da lista
js/catalogo.js      render do grid, filtros, busca e janela de detalhe
assets/             SVGs, icones, OG e as 34 fotos de produto
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
npm i -D playwright
npx playwright install chromium
node build/compilar-css.mjs
```

O script monta uma pagina temporaria com o corpo das duas paginas, compila com
a copia local do Tailwind (`vendor/tailwind-browser.js`, usada so no build) e
salva `css/tw.css`.

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

As 34 fotos de produto sao reais, do acervo da empresa, exibidas com o
tratamento duotone (em repouso a foto assume o tom da categoria; no hover volta
a cor natural).

As fotos de ambiente ficam em `assets/img/` e sao **sete**: quatro para tela
larga e tres recortes verticais, usados no celular. Nenhum espaco do site e
16:9, entao cada arquivo tem a sua propria proporcao:

| Arquivo | Onde aparece | Proporcao | Ideal | Minimo | Peso |
|---|---|---|---|---|---|
| `hero-rodovia.jpg` | hero, tela larga | 16:9 | 2400 x 1350 | 2000 x 1125 | 380 KB |
| `hero-rodovia-mobile.jpg` | hero, tela em pe | 9:16 | 1080 x 1920 | 768 x 1366 | 220 KB |
| `faixa-rodovia.jpg` | faixa "Mais de 30 anos" | 12:5 | 2400 x 1000 | 1680 x 700 | 320 KB |
| `faixa-rodovia-mobile.jpg` | idem, ate 640 px | 4:5 | 1080 x 1350 | 864 x 1080 | 200 KB |
| `faixa-noturna.jpg` | faixa "Kit fora da norma" e topo do catalogo | 12:5 | 2400 x 1000 | 1680 x 700 | 320 KB |
| `faixa-noturna-mobile.jpg` | idem, ate 640 px | 4:5 | 1080 x 1350 | 864 x 1080 | 200 KB |
| `sobre-kit.jpg` | foto da secao Sobre, em qualquer tela | 4:3 | 1600 x 1200 | 1200 x 900 | 280 KB |

A secao Sobre nao tem versao vertical: a caixa da foto e 4:3 em toda largura.

Os prompts prontos para gerar essas imagens no Gemini estao em
`gemini-prompts-imagens.txt`, na raiz do projeto, com a mesma tabela e um
aviso importante: o Gemini entrega no maximo cerca de 1408 px no lado maior,
entao para chegar ao ideal e preciso um upscale de 2x depois.

**Como o recorte e escolhido.** O hero, as duas faixas e o topo do catalogo
usam `<picture>`: o recorte vertical entra em tela em pe (hero) ou abaixo de
640 px (faixas), e a foto larga vale para o resto. Sem isso, um celular
mostrava so 25% da largura da foto do hero, ampliada.

**Se um arquivo faltar, o site nao quebra.** `js/main.js` desce a reserva um
degrau por vez, sozinho:

```
recorte vertical  ->  foto panoramica  ->  SVG de reserva
```

E o que permite subir as fotos aos poucos: enquanto os `-mobile` nao existirem,
o celular continua recebendo a panoramica, como antes.

## O que ainda depende da Braskit

1. **Quais sao os itens do kit minimo obrigatorio.** O catalogo hoje trava
   extintor, cone NBR 15071 e par de calcos, escolhidos pelo que a
   fiscalizacao mais cobra. Confirmar com a proprietaria e ajustar
   `KIT_MINIMO` em `js/produtos.js`. Vale confirmar tambem se alguma
   quantidade ja deve vir maior que 1 (a NBR 9735 pede quatro cones).
2. **CNPJ e razao social** para o rodape. Nao constam no site antigo e nao
   foram inventados.
3. **Foto real da fachada ou da equipe** para a secao Sobre, quando houver.
   Vale mais que qualquer imagem gerada.
4. **Revisao tecnica das descricoes** dos 34 produtos em `js/produtos.js`.
5. **Confirmar o ano de fundacao**. O site usa "desde os anos 90", derivado de
   "mais de 30 anos".
6. **Avaliacoes no Google**: a secao Quem Atendemos aponta para o perfil da
   empresa no Google. Faz parte do plano de gestao do Google Meu Negocio.

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
