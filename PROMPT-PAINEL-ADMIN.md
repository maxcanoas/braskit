# Prompt para o Claude Code: painel de conteúdo da Braskit

> Abra o Claude Code na raiz `D:\Clientes\braskit-novo`.
> Trabalhe **uma fase por vez**: cole apenas o bloco da fase, deixe terminar, revise, comite, só então cole a próxima.
> Entre em plan mode (`shift+tab`) antes de cada fase e leia o plano antes de liberar edição.

---

## Contexto comum (cole junto com qualquer fase)

Você vai criar um painel de conteúdo para a proprietária da Braskit, que **não tem nenhuma experiência com programação e não vai abrir editor de código nunca**. O painel precisa parecer um formulário simples de preencher, não uma ferramenta de desenvolvedor.

O site é estático, 43 páginas, publicado no Netlify a partir do repositório `maxcanoas/braskit`. As páginas de categoria e de produto são geradas por `build/gerar-paginas.mjs` a partir de `js/produtos.js` mais `build/conteudo-seo.mjs`. Hoje o Netlify **não roda build** (`command = ""`): as páginas são geradas na máquina e versionadas.

### Regras invioláveis

1. **O site continua estático e continua com o texto dentro do HTML.** Nada de buscar JSON em runtime para preencher a página. Todo o trabalho de SEO já feito depende do texto estar no HTML servido. Se você injetar conteúdo por JavaScript no navegador, o trabalho está errado.
2. **Não reescreva `index.html`, `catalogo.html` nem `js/produtos.js` do zero.** Faça edições cirúrgicas, inserindo marcadores. Um arquivo desses reescrito por inteiro é reprovado, mesmo que fique visualmente igual.
3. **Não toque em `produtos/*.html`, `categorias/*.html` nem `404.html`.** São gerados. Corrigir sintoma em arquivo gerado é erro.
4. **As guardas de `build/dados.mjs` continuam valendo e não podem ser afrouxadas.** Id de produto é chave de orçamento salvo no navegador de quem já visitou. Slug é URL pública. Nenhum dos dois muda, nem pelo painel.
5. **Todo texto vindo do painel é escapado antes de entrar no HTML.** Use a mesma `esc()` que o gerador já usa. Um campo de formulário que aceita `<script>` e publica no ar é falha de segurança, não detalhe.
6. **Zero dependência nova em runtime.** Nada de React, nada de bundler, nada de biblioteca de JWT. O painel é um HTML com JavaScript vanilla. As funções serverless usam só `node:crypto` e `fetch` nativo.
7. **Commits pequenos, um por fase**, com mensagem descrevendo o que mudou.

### Regras de economia (leia com atenção)

Este projeto é grande e a maior parte dele é irrelevante para a tarefa. Não gaste contexto à toa:

- **Não abra** `node_modules/`, `build/screens/`, `build/relatorio.json`, `build/compile.html`, `css/tw.css`, `vendor/`, `comercial/`, nem nenhum arquivo de imagem.
- **Não leia `index.html` inteiro** (78 KB). Use busca dirigida (`grep -n`) pelas seções e leia só os trechos ao redor.
- Não rode as verificações pesadas no meio da fase. Rode uma vez, no fim.
- Se precisar do inventário de produtos, use `node build/dados.mjs`, que imprime o resumo. Não leia os 33 objetos um a um.

---

## Arquitetura decidida (não proponha outra)

**Conteúdo sai do código e vira dado:**

- `dados/site.json`: textos institucionais, dados de contato e as quatro fotos grandes.
- `dados/produtos.json`: os 33 produtos (id, nome, slug, categoria, descricao, aplicacao, img, visivel).
- `dados/campos.json`: **o esquema**. Descreve cada campo editável com chave, rótulo em português, dica de preenchimento, tipo (`texto`, `textoLongo`, `lista`, `imagem`) e limite de caracteres. Este arquivo é a fonte única de verdade: o painel monta o formulário a partir dele e a função de salvar valida contra ele. Campo que não está aqui não pode ser gravado.

**O build aplica o dado no HTML:**

- `build/aplicar-conteudo.mjs` (novo) lê os JSONs e substitui o conteúdo entre marcadores em `index.html`, `catalogo.html` e no bloco de dados de `js/produtos.js`.
- Marcador em HTML: `<!-- braskit:campo:home.heroTitulo -->texto atual<!-- /braskit:campo -->`, no mesmo idioma dos marcadores `braskit:inicio-*` que `gerar-paginas.mjs` já usa.
- Marcador em `js/produtos.js`: `/* braskit:inicio-dados */ ... /* braskit:fim-dados */` em volta de `CATEGORIAS` e `PRODUTOS`. **As funções do arquivo ficam fora do bloco e não são tocadas**, porque `build/dados.mjs` as carrega por `node:vm` e depende delas.
- Ordem do build: `aplicar-conteudo` → `gerar-paginas` → `sitemap` → `imagens` (só os derivados que faltarem).

**O painel escreve nos JSONs, não no HTML:**

- Painel em `/admin/index.html`, com `noindex`, fora do sitemap e bloqueado no `robots.txt`.
- Login por usuário e senha em função serverless. Ela não precisa de conta em serviço nenhum.
- Salvar faz commit nos JSONs via API de conteúdo do GitHub. O Netlify detecta o commit, roda o build e publica em 1 a 2 minutos. Rollback e histórico saem de graça do Git.

---

## FASE 1: extrair o conteúdo para JSON

**Objetivo:** o site fica exatamente igual, mas todo texto editável passa a vir dos JSONs.

1. Faça o inventário do que é editável em `index.html` (seções `inicio`, `sobre`, `servicos`, `kits`, `atendimento`, `conformidade`, `onde-estamos`, `faq`, `contato`) e do cabeçalho e rodapé em `catalogo.html`. Entram: títulos, subtítulos, parágrafos, itens de lista, perguntas e respostas do FAQ, telefone, WhatsApp, endereço, bairro, cidade, horário. **Não entram**: classe CSS, estrutura, `alt` estrutural, JSON-LD, `title`, `meta description`, `canonical`. Metadados de SEO ficam fora do painel de propósito.
2. O número de WhatsApp aparece em pelo menos 12 lugares em `index.html`, 1 em `js/produtos.js` e 1 em `build/gerar-paginas.mjs`. Todos passam a ler do mesmo campo `contato.whatsapp`. Um número trocado em três lugares e esquecido no quarto é o defeito clássico aqui.
3. Escreva `dados/site.json`, `dados/produtos.json` e `dados/campos.json` com o conteúdo atual, sem alterar uma vírgula do texto.
4. Em `dados/campos.json`, defina o limite de caracteres de cada campo a partir do que o layout aguenta hoje, com folga de no máximo 20%. Título de hero que hoje tem 38 caracteres não pode aceitar 200: o layout quebra e quem vai ser chamado para consertar é você.
5. Escreva `build/aplicar-conteudo.mjs`, insira os marcadores nos arquivos e ligue no `package.json`: `"conteudo": "node build/aplicar-conteudo.mjs"` e `"build": "npm run conteudo && npm run gerar && npm run sitemap"`.
6. Se um marcador esperado sumir, o script **aborta com mensagem clara**, no mesmo padrão de `entreMarcadores()` em `gerar-paginas.mjs`. Nunca publique página com campo vazio.

**Critério de aceite da fase 1 (não diga que terminou sem isso):**

- `npm run build` com os JSONs intocados produz HTML **idêntico ao commit anterior**. Rode `git diff --stat` e mostre o resultado: fora os marcadores inseridos, tem que ser vazio.
- `node build/dados.mjs` continua imprimindo 33 produtos em 8 categorias, sem violação.
- `npm run verificar` e `npm run paginas` passam.
- Duplo clique em `index.html` continua abrindo o site funcionando.

Comite: `conteudo: extrai textos editáveis para dados/*.json`

---

## FASE 2: build no Netlify e funções de salvamento

1. Em `netlify.toml`, mude para `command = "npm run build"`, mantendo `publish = "."`.
2. Mova `sharp` de `devDependencies` para `dependencies` e mantenha `playwright` em `devDependencies`. No `netlify.toml`, defina `NPM_FLAGS = "--omit=dev"` para o runner não baixar os navegadores do Playwright a cada deploy.
3. **Corrija o cache das fotos grandes.** Hoje `/assets/*` é `immutable` por um ano. Se ela trocar a foto do banner mantendo o nome, quem já visitou continua vendo a antiga e vai jurar que o painel não funciona. Separe: `/assets/produtos/*` continua `immutable` (o nome já carrega a largura), e `/assets/img/*` passa a `public, max-age=86400, must-revalidate`.
4. Adicione `/admin` ao `robots.txt` e mantenha o painel fora do `sitemap.xml`.
5. Crie `netlify/functions/` com quatro funções, **sem nenhuma dependência externa**:
   - `login.mjs`: recebe usuário e senha, compara com `PAINEL_USUARIO` e `PAINEL_SENHA_HASH` (SHA-256 de senha + `PAINEL_SAL`, em hex), devolve um token assinado por HMAC com `PAINEL_SEGREDO`, válido por 8 horas. Comparação em tempo constante (`crypto.timingSafeEqual`). Resposta genérica em caso de erro, sem dizer se o usuário existe. Atraso fixo de 1 segundo em toda tentativa falha.
   - `conteudo.mjs`: exige token válido, lê `dados/site.json`, `dados/produtos.json` e `dados/campos.json` da API do GitHub na branch `main` e devolve conteúdo mais o `sha` de cada arquivo. Ler do GitHub, e não do site publicado, é o que impede ela salvar em cima de uma versão velha enquanto um deploy está no ar.
   - `salvar.mjs`: exige token, valida o corpo **contra `dados/campos.json`** (chave desconhecida é rejeitada, limite de caracteres é conferido, tipo é conferido), remonta o JSON a partir da allowlist em vez de confiar no que chegou, e faz `PUT` na API de conteúdo do GitHub usando o `sha` recebido. Se o `sha` estiver desatualizado, responda pedindo para recarregar, nunca force.
   - `imagem.mjs`: exige token, aceita apenas os quatro nomes fixos (`hero-rodovia`, `sobre-kit`, `faixa-rodovia`, `faixa-noturna`), apenas JPEG, no máximo 800 KB já redimensionado pelo navegador, e grava em `assets/img/<nome>.jpg`. Qualquer outro nome é rejeitado. Nada de nome livre vindo do formulário.
6. Variáveis de ambiente usadas: `GITHUB_TOKEN`, `GITHUB_REPO`, `PAINEL_USUARIO`, `PAINEL_SENHA_HASH`, `PAINEL_SAL`, `PAINEL_SEGREDO`. Nenhuma delas vai para o repositório. Crie `.env.exemplo` documentando cada uma, sem valores.
7. Confira se `build/imagens.mjs` é idempotente (só gera derivado que falta ou está mais velho que o original). Se não for, ajuste. Ele vai rodar em todo deploy.

**Critério de aceite:** `netlify dev` sobe, login com senha errada é recusado, login correto devolve token, `conteudo` responde com os três JSONs, `salvar` recusa campo fora do esquema e recusa texto acima do limite.

Comite: `painel: build no Netlify e funções de conteúdo`

---

## FASE 3: o painel

`admin/index.html`, arquivo único, HTML mais CSS mais JavaScript vanilla, sem framework, sem CDN.

**Quem vai usar é uma senhora que não mexe com computador. Projete para ela, não para você:**

- Fonte a partir de 18px, alvos de toque grandes, contraste alto. Funciona no celular.
- O formulário **se monta sozinho** a partir de `dados/campos.json`. Adicionar campo depois vira uma linha de JSON, não um dia de trabalho.
- Cada campo mostra o rótulo em português claro ("Frase grande da página inicial"), a dica de preenchimento e um contador de caracteres que fica vermelho e bloqueia o salvar ao passar do limite.
- Abas simples: **Página inicial**, **Contato**, **Produtos**, **Fotos**. Nada de menu lateral com dez níveis.
- Em Produtos: lista dos 33 com busca por nome. Editáveis apenas nome, descrição e aplicação, mais um botão de mostrar ou esconder do catálogo. Id, slug, categoria e foto aparecem **somente leitura**, com a explicação de que mudar isso quebra endereço de página e pedido de orçamento salvo, e que é serviço do desenvolvedor.
- Em Fotos: as quatro fotos grandes, cada uma com miniatura atual, botão de trocar e o texto do que aquela foto é. O navegador redimensiona para no máximo 1600px de largura e comprime para menos de 800 KB **antes** de enviar (canvas mais `toBlob`, qualidade 0.82). Recuse arquivo que não seja imagem.
- Botão único **Salvar e publicar**, com confirmação. Depois de salvar: "Pronto. As alterações aparecem no site em até 2 minutos", com link para abrir o site. Nada de jargão de deploy, commit ou build.
- Se der erro, mensagem em português explicando o que fazer, nunca código de erro cru.
- Aviso ao sair da página com alteração não salva.
- Sessão expira em 8 horas e o painel pede login de novo sem perder o que foi digitado.

**Critério de aceite:** uma pessoa que nunca viu o painel consegue trocar o telefone e a frase da home sem ajuda, no celular, em menos de dois minutos.

Comite: `painel: interface de edição`

---

## FASE 4: documentação

1. `comercial/MANUAL-PAINEL.html`: manual de uma página, escrito para quem não é da área, letra grande, para ela imprimir ou abrir no celular. Cobre: como entrar, como trocar um texto, como trocar uma foto, quanto tempo demora para aparecer, o que fazer se errar. Vai em `comercial/` porque essa pasta já está no `.gitignore` e já cai em 404 no Netlify, então o manual não vaza para o ar.
2. Na seção do `README.md`, documente: o novo fluxo de build, o papel de `dados/campos.json`, como adicionar campo novo ao painel, e **a lista explícita do que o painel não faz** (produto novo, foto de produto, categoria nova, layout, textos de SEO, formulário de orçamento, estrutura de página).
3. `CONFIGURACAO-PAINEL.md`: passo a passo para você, com a criação do token fine-grained do GitHub (escopo apenas neste repositório, permissão Contents leitura e escrita), a geração do hash da senha e o cadastro das variáveis no Netlify.

Comite: `docs: manual do painel e configuração`

---

## Fase 5 (opcional, só se as quatro primeiras estiverem sólidas)

Botão **Desfazer última alteração**: lista os últimos cinco commits que tocaram em `dados/` com data e hora em português, e restaura o conteúdo de um deles. É a funcionalidade que mais evita telefonema no domingo.
