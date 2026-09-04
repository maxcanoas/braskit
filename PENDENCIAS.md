# O que ainda depende da Braskit

Este arquivo lista tudo o que o site **não** afirma porque a informação não foi
confirmada pela empresa. Nada aqui foi inventado para preencher espaço: onde faltou
dado, o bloco saiu ou ficou com um marcador `<!-- PENDENTE BRASKIT: ... -->` no HTML.

Ordenado por impacto. Os três primeiros mudam o que o visitante lê; o resto melhora.

---

## 1. Qual é, de verdade, o kit mínimo obrigatório

**Onde afeta:** o catálogo trava três itens no orçamento de todo visitante, e eles
chegam ao cliente com cara de informação oficial da Braskit.

Hoje `KIT_MINIMO`, no fim de `js/produtos.js`, trava:

| Item | Quantidade |
|---|---|
| Extintor ABC (id 25) | 1 |
| Cone Flexível com Faixa, NBR 15071 (id 20) | 1 |
| Par de Calço de Borracha (id 26) | 1 |

**Essa composição é uma sugestão técnica, montada pelo que a fiscalização mais cobra.
Ninguém da Braskit validou.** O próprio comentário no arquivo já dizia isso. Duas
coisas precisam de resposta:

1. **Quais itens** entram no kit mínimo obrigatório.
2. **Quantos de cada um.** A NBR 9735 trata da quantidade de dispositivos de
   sinalização que o veículo precisa levar, e é provável que a quantidade do cone
   não seja 1.

Enquanto não vier a resposta, a janela do orçamento mostra uma nota discreta dizendo
que a composição é sugerida e que a Braskit confirma o kit exato junto com o
orçamento. Trocar item, quantidade ou número de itens é mexer só naquela lista: o
resto (card travado, cadeado na janela, grupo separado na mensagem do WhatsApp)
acompanha sozinho.

---

## 2. Fotos de verdade — vale mais que tudo o que está aqui

**Uma tarde de fotografia resolve mais do que todo o resto desta lista.**

As quatro fotos de ambiente (`assets/img/`) foram geradas por IA e têm os defeitos
clássicos: em `sobre-kit.jpg` a costura da luva não fecha, o extintor está preso na
bolsa de um jeito que não existe e as ferramentas do painel de fundo flutuam; em
`faixa-noturna.jpg` os cones estão numa fila geometricamente perfeita e as faixas
refletivas não batem entre um cone e outro. **Nenhuma das quatro mostra a Braskit.**

O que vale mais, em ordem:

1. **Um kit montado pela Braskit**, fotografado em cima do balcão. É o produto.
2. **A fachada e o balcão.** É o que prova que a loja existe e fica em Canoas.
3. **A equipe.** É o que faz o site parar de parecer catálogo de fornecedor.
4. **Um caminhão de cliente com a sinalização instalada**, se algum cliente deixar.

Os arquivos entram com os mesmos nomes em `assets/img/` e depois é só rodar
`node build/imagens.mjs` — os recortes, o avif e o webp saem sozinhos.

### 2.1 Fotos de produto: fundo branco — resolvido, falta a do kit

Foi feito o que esta seção pedia: **as fotos de produto foram refeitas em estúdio,
sobre fundo branco**, e substituíram as antigas em `assets/produtos/`. Chegam com
1264x843 e são normalizadas para 730x487, a medida que o pipeline já usava. O catálogo
ficou mais leve pela metade, porque fundo liso comprime melhor que prateleira.

A única que não foi refeita era a do **Kit Cargas Perigosas**, e a substituta está
prevista. **A saída dele do site é temporária**: em vez de ficar como a única foto de
prateleira no meio de 33 limpas, o produto sai até a foto nova chegar. Saiu de
`PRODUTOS`, os cinco arquivos saíram de `assets/produtos/`, o `data-reserva` da seção
Sobre em `index.html` ficou sem ele e a categoria Kits de proteção passou de 2 itens
para 1. As contagens visíveis do site foram de 34 para 33.

O **id 33 fica reservado para ele**. Os id são chave do orçamento salvo no navegador de
quem já visitou (ver seção 4), então nenhum outro produto pode ocupar o 33 — mas o
próprio Kit Cargas Perigosas volta com esse número, porque é o mesmo produto de sempre.

#### Como devolver o kit quando a foto nova chegar

1. Salve a foto como `assets/produtos/kit-cargas-perigosas.jpg`. Se vier em 1264x843,
   como as outras, reduza antes para **730x487** — `sharp(origem).resize({ width: 730 })`
   com `jpeg({ quality: 92, mozjpeg: true })`. O pipeline nunca amplia, e o slot é 3:2.
2. `node build/imagens.mjs` — o avif e o webp em 400 e 720 saem sozinhos.
3. Devolva o bloco do produto a `PRODUTOS`, em `js/produtos.js`, com **id 33** e
   `categoria: "kits-protecao"`. O texto original está no commit `e72d49b`
   (`git show e72d49b:js/produtos.js`).
4. Contagens de volta para 34, e Kits de proteção de 1 para 2 itens. Em
   `catalogo.html`: meta description, og:description, olho do hero, os dois
   contadores e as duas linhas do `noscript`. Em `index.html`: título da seção
   Catálogo, card da categoria e card "Ver o catálogo completo". Os chips de filtro
   se ajustam sozinhos, porque saem de `contarPorCategoria()`.
5. Se quiser, devolva o `data-reserva` da foto na seção Sobre do `index.html`.
6. `node build/verificar.mjs` para fechar: ele acusa referência para arquivo
   inexistente e imagem sem `width`/`height`.

Com o fundo resolvido já na fotografia, `build/recortar-fundos.mjs` perdeu a função:
ele existia para recortar o cenário das fotos de estoque. Segue sem nunca ter rodado.

O véu da cor da categoria sobre a foto (`.produto-midia::after`) também saiu. Ele
existia para amarrar 34 fundos de estoque diferentes; com os fundos já brancos e
iguais, só tingia esse branco — em Sinalização o branco puro saía como
rgb(237,241,233). Ficou só a vinheta discreta das bordas.

### 2.2 Resolução das fotos de ambiente

O `README.md` pede 2400×1350 para o hero. O que existe tem 1408×768, porque o Gemini
entrega no máximo ~1408 px no lado maior. O pipeline **nunca amplia** — upscale só
engorda o arquivo fingindo nitidez. Em tela de 1920 a foto do hero é esticada.

Os dois recortes verticais (`faixa-rodovia-mobile`, `faixa-noturna-mobile`) foram
**derivados do panorâmico**, não compostos. Para ficarem certos, regerar com os
prompts verticais que estão em `gemini-prompts-imagens.txt` — eles pedem o assunto
mais para baixo e céu livre em cima.

---

## 3. Dados cadastrais e o que fecha venda

### 3.1 Ano de fundação

O site antigo dizia **"mais de 30 anos"** em cinco lugares e também **"desde os anos
90"**. Em 2026 isso vai de 26 a 36 anos — são afirmações diferentes. Todas foram
retiradas. Confirmado o ano, ele volta em **um** lugar, com a data exata, e o selo da
seção Sobre volta a ser um número.

### 3.2 CNPJ e razão social

Não constam no site antigo e não foram inventados. Faltam no rodapé. **Existem dois
CNPJs em aberto** — é preciso confirmar qual é o correto.

### 3.3 Telefone fixo

O site usa **(51) 3051-7997** no header, no rodapé e no JSON-LD. Confirmar se ainda
está ativo. O WhatsApp `5551993011327` está certo e é o único número usado em todos
os 19 links de conversa.

### 3.4 O que fecha venda e não existe em lugar nenhum do site

Nenhuma destas informações aparece hoje, e todas são perguntas que o cliente faz:

| Informação | Por quê |
|---|---|
| **Faixa de preço do kit** | é a primeira pergunta de todo mundo |
| **Prazo de entrega em dias** | hoje o site só diz "frete e prazo fechados no orçamento" |
| **Garantia dos itens** | zero menção no site inteiro |
| **Número de CA de cada EPI** | primeira pergunta de qualquer frotista, e obrigatório para uso profissional. Vale para luvas, colete, respirador, máscara panorâmica e bota |
| **Prova social** | nenhum depoimento, nenhum cliente citado, nenhuma avaliação |

O espaço está reservado no layout com marcadores `<!-- PENDENTE BRASKIT -->` em
`catalogo.html`. É só preencher quando a informação chegar.

### 3.5 Revisão técnica das 33 fichas de produto

As descrições e aplicações foram reescritas para variar de tamanho e falar como
balcão, mas **nenhuma especificação nova foi inventada** — não há medida, capacidade,
material ou norma que já não estivesse no texto anterior. Alguém que conheça o
produto precisa revisar, e é aí que entram as medidas reais (litragem do extintor,
altura do cone, espessura da luva).

### 3.6 Avaliações no Google

A seção "Quem atendemos" aponta para o perfil da empresa no Google. Isso faz parte do
plano de gestão do Google Meu Negócio e depende do acesso ao perfil.

---

## 4. Proposta de taxonomia do catálogo — para aprovar, não aplicada

**Nada disso foi mexido.** A ordem e os nomes das 8 categorias continuam exatamente
como estavam, porque mexer nisso é decisão comercial da Braskit, não de design. Os
`slug` também são chave de link (há 14 links `catalogo.html?cat=...` no site) e os
`id` dos produtos são chave do orçamento salvo no navegador de quem já visitou — os
dois só devem mudar de propósito.

### O problema

A taxonomia atual é a planilha do fornecedor, não a cabeça de quem compra:

- **"Injetados"** e **"Têxtil"** são processos de fabricação. Ninguém procura um cone
  em "injetados".
- Existe uma categoria chamada **"Produtos"** dentro de um catálogo de produtos.
- O **extintor** está em "Acessórios para caminhão", e não junto do que combate fogo.
- O **Kit Cargas Perigosas**, que é o carro-chefe, é a última categoria da lista.
  (Na home ele já foi promovido a destaque da grade; no catálogo continua onde estava.)

### A proposta

Reagrupar por uso, na ordem em que a pessoa decide:

| # | Categoria proposta | O que entra hoje |
|---|---|---|
| 1 | **Kit completo** | Kit Cargas Perigosas, Kit de Ferramentas |
| 2 | **Sinalização da via** | cones (os dois), pedestal, fita zebrada, bastão sinalizador, faixa refletiva, capa de cone |
| 3 | **Placas e rótulos de risco** | placa laranja, placa laranja com números, líquido inflamável, material corrosivo, placa perigo |
| 4 | **Combate a incêndio** | extintor ABC, abafa chamas, caixa plástica para extintor, suporte de ferro para extintor |
| 5 | **Proteção do operador (EPI)** | luvas (as três), bota, colete, respirador, máscara panorâmica |
| 6 | **Contenção e limpeza** | pá e enxada, balde de alumínio com cabo terra |
| 7 | **Suportes e fixação** | suportes de ferro e de plástico para placa e cone |
| 8 | **Guarda e transporte** | bolsa de lona, lanternas |

Se a Braskit aprovar, a mudança é em `CATEGORIAS` e no campo `categoria` de cada
produto, em `js/produtos.js`. Os `id` ficam como estão — eles são a chave da lista de
orçamento salva no navegador de quem já visitou o site.

---

## 5. Coisas pequenas

- **O embed do Google Maps** usa um parâmetro `pb` montado à mão em vez do gerado
  pelo próprio Maps. Renderiza, mas o ideal é trocar pelo embed oficial, gerado a
  partir do perfil da empresa — o que só dá para fazer com acesso ao Google Meu
  Negócio.
- **O peso 500 do Barlow Condensed** é baixado do Google Fonts e não é usado por
  nada. Sai da URL quando alguém confirmar que nenhum texto novo vai precisar dele.
