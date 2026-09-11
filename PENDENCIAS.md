# O que ainda depende da Braskit

Este arquivo lista tudo o que o site **não** afirma porque a informação não foi
confirmada pela empresa. Nada aqui foi inventado para preencher espaço: onde faltou
dado, o bloco saiu ou ficou com um marcador `<!-- PENDENTE BRASKIT: ... -->` no HTML.

Ordenado por impacto. Os três primeiros mudam o que o visitante lê; o resto melhora.

---

## 1. Qual é, de verdade, o kit mínimo obrigatório — resolvido em 2026-09-11

A Braskit mandou o **kit básico** que ela monta conforme a NBR 9735 (documento
"KIT BASICO", de 07/09/2026), e ele virou o `KIT_MINIMO` de `js/produtos.js`:

| Item | Quantidade |
|---|---|
| Respirador Semifacial com Filtro VO/GA (id 27) | 1 |
| Luvas PVC, com forro (id 31) | 1 |
| Bota de PVC (id 32) | 1 |
| Colete Refletivo tipo X (id 19) | 1 |
| Bolsa de Lona para Kit (id 17) | 1 |
| Cone Flexível com Faixa, NBR 15071 (id 20) | **4** |
| Kit de Ferramentas (id 34) | 1 |
| Par de Calço de Borracha (id 26) | 1 |

O `qtd` é também o mínimo: o botão de diminuir do cone para em 4, e a lista salva de
quem visitou antes sobe para 4 na carga. A seção "Composição" da home mostra o kit
inteiro, e a nota da janela do orçamento e o selo das fichas deixaram de falar em
"sugestão".

O que ainda depende da empresa:

- **Capacete e óculos ampla visão** estão no kit, mas não no catálogo: falta foto
  para virarem produto. Os CAs já vieram no documento (capacete 31469, óculos
  11285) e entram na ficha junto. Quando entrarem, vão também para o `KIT_MINIMO`.
- A "bolsa de EPI" do documento foi tomada como a **Bolsa de Lona para Kit**
  (id 17). Confirmar.
- **Extintor (8 kg ABC) e capa de cone** o documento lista à parte, como "outros
  equipamentos", e por isso ficaram opcionais no orçamento.

---

## 2. Fotos de verdade — vale mais que tudo o que está aqui

**Uma tarde de fotografia resolve mais do que todo o resto desta lista.**

As fotos de ambiente (`assets/img/`) foram geradas por IA e têm os defeitos
clássicos: em `faixa-noturna.jpg` os cones estão numa fila geometricamente perfeita e
as faixas refletivas não batem entre um cone e outro. **Nenhuma delas mostra a
Braskit.**

A exceção é `sobre-kit.jpg`, trocada em 2026-09-11 por uma foto do kit montado:
bolsa, botas, capacete, cones, capa de cone, extintor, calços, ferramentas e colete.
Mas os textos impressos nela saem deformados (o extintor lê "ERYINPEL" em vez de
Extinpel, e o logo na bolsa e no estojo sai incompleto), o que é típico de imagem
gerada ou retocada. Se a Braskit fotografar o próprio kit, essa é a primeira a trocar.

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
4. Somar 1 às contagens (hoje 37), e Kits de proteção de 1 para 2 itens. Em
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

### 3.1 Ano de fundação — resolvido

**1985**, informado pela Braskit e confirmado pela abertura do CNPJ (05/09/1985).
Está no selo da seção Sobre ("Desde 1985"), no texto do Sobre, no rodapé e no
JSON-LD (`foundingDate`).

### 3.2 CNPJ e razão social — resolvido

Razão social **J C Rodrigues-O Canha ME**, nome fantasia Braskit Comércio de
Material de Segurança, **CNPJ 90.402.959/0001-46**: ativo, conferido na Receita
(BrasilAPI), mesmo CEP do site. Estão no rodapé e no JSON-LD (`legalName`,
`taxID`). O outro CNPJ que circulava, 08.432.867/0001-28, está **baixado** e não
deve aparecer em lugar nenhum.

### 3.3 Telefone — resolvido

O principal é o celular **(51) 99301-1327**, que também é o WhatsApp: está no
header, no JSON-LD e em primeiro no contato e no rodapé. O fixo (51) 3051-7997
segue como secundário. O WhatsApp continua sendo o único número dos links de
conversa.

### 3.4 O que fecha venda e não existe em lugar nenhum do site

Nenhuma destas informações aparece hoje, e todas são perguntas que o cliente faz:

| Informação | Por quê |
|---|---|
| **Faixa de preço do kit** | é a primeira pergunta de todo mundo |
| **Prazo de entrega em dias** | hoje o site só diz "frete e prazo fechados no orçamento" |
| **Garantia dos itens** | zero menção no site inteiro |
| **Número de CA dos EPIs que faltam** | primeira pergunta de qualquer frotista, e obrigatório para uso profissional. Já estão nas fichas os do respirador (37401), da luva PVC (21420 / 41917) e da bota (36025 / 51112). Faltam luvas nitrílica e de raspa, colete, máscara panorâmica, máscara de fuga e calçado de segurança |
| **Prova social** | nenhum depoimento, nenhum cliente citado, nenhuma avaliação |

O espaço está reservado no layout com marcadores `<!-- PENDENTE BRASKIT -->` em
`catalogo.html`. É só preencher quando a informação chegar.

Formas de pagamento (Pix, débito, crédito em até 5x, dinheiro e boleto para
empresa) e o atendimento de sábado, que também faltavam, vieram nos textos de
2026-09-11 e estão no FAQ da home e no JSON-LD.

### 3.5 Revisão técnica das 37 fichas de produto

As descrições e aplicações foram reescritas para variar de tamanho e falar como
balcão, mas **nenhuma especificação nova foi inventada** — não há medida, capacidade,
material ou norma que já não estivesse no texto anterior. Alguém que conheça o
produto precisa revisar, e é aí que entram as medidas reais (litragem do extintor,
altura do cone, espessura da luva).

Os três itens que entraram em setembro de 2026 — **Calçado de Segurança (id 35),
Lanterna de Cabeça (id 36) e Máscara de Fuga (id 37)** — foram escritos só a partir da
foto, sem ficha do fornecedor. Precisam da mesma revisão.

**Placa Perigoso ao Meio Ambiente (id 38)**, também de setembro de 2026. A foto
chegou como `placa-produto-toxico.jpg`, mas a placa não é de tóxico: tóxico é a
classe 6.1, com a caveira. Árvore seca e peixe é a marca de substância perigosa ao
meio ambiente, e o site a trata assim. Material e fabricação própria foram
estendidos das outras placas, porque a Braskit disse que as placas são produção
dela; vale confirmar que esta também é, e nos mesmos três materiais.

**A foto da Lanterna de Cabeça mostra a caixa de um modelo intrinsecamente seguro**
(Class I Div 1, Zone 0: não gera faísca em atmosfera com vapor inflamável). Para quem
transporta inflamável, é o melhor argumento do item, e o site não o usa porque a Braskit
não confirmou que vende esse modelo. Se confirmar, a informação entra como `detalhe` do
id 36 em `js/produtos.js`.

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
| 3 | **Placas e rótulos de risco** | placa laranja, placa laranja com números, líquido inflamável, material corrosivo, perigoso ao meio ambiente, placa perigo |
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
- **`priceRange` diverge** entre as duas páginas escritas à mão: `"$$"` na home e
  `"$"` no catálogo.

---

## 6. Dos textos da Braskit (2026-09-11): o que ficou de fora ou pede confirmação

Os documentos "Perguntas Braskit" e "KIT BASICO" resolveram os itens 1, 3.1, 3.2 e
3.3. O que sobrou deles:

- **Entrega.** A resposta ficou ambígua ("dependendo do valor, é sem custo" e
  "entregamos encomendas a partir de R$ 500", por aplicativo ou transportadora). Por
  decisão, **nada disso foi publicado**; o site segue com "frete e prazo fechados no
  orçamento".
- **"CONTRAN 5998".** A Braskit citou assim, mas a 5.998/2022 é **resolução da ANTT**
  (o regulamento do transporte rodoviário de produtos perigosos). O FAQ cita a ANTT.
  Vale confirmar com a empresa que é essa a norma que ela quis dizer.
- **Edição da NBR 9735.** O documento do kit diz "NBR 9735/2025". O site não cita
  ano de edição de norma nenhuma até alguém confirmar.
- **CAs.** Publicados só com o número, sem a validade (que vence e desatualizaria o
  site). Não foi possível conferi-los no CAEPI de forma automática: vale a Braskit
  conferir respirador 37401, luva PVC 21420 / 41917 e bota 36025 / 51112.
- **Marcas.** A resposta diz "luvas e óculos: Kalipso", e a marca foi aplicada às três
  luvas do catálogo. Confirmar se vale para todas. Extintor (Extinpel) e respirador
  (Destra) vieram sem ambiguidade.
- **Ficha de emergência.** Vários textos do site dizem que "a ficha de emergência da
  carga" indica EPI e filtro. Até onde se sabe, a regulamentação da ANTT deixou de
  exigir a ficha em 2016, mas a composição ainda depende do produto. Revisar com a
  Braskit se o termo continua certo antes de reescrever.
- **Feriados, Natal, Ano Novo e férias coletivas** são informação para o Perfil da
  Empresa no Google, não para o site.
- **Quem responde o WhatsApp** foi informado, mas não é citado no site, por decisão.
- **Mais vendidos** (placas, cones e kits): subsídio para a taxonomia da seção 4, que
  não se aplica junto com outra mudança.
