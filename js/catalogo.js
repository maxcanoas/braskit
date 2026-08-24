/* ==========================================================================
   BRASKIT | catálogo
   Renderiza o grid, filtra por categoria, busca sem acento-sensibilidade,
   lê o parâmetro ?cat= da URL e abre a janela de detalhe do produto.
   Também desenha o seletor de cada card e mantém tudo em dia com a lista de
   orçamento. Depende de js/produtos.js e de js/orcamento.js.
   ========================================================================== */
(function () {
  "use strict";

  var grid = document.getElementById("gridProdutos");
  if (!grid) return;

  var listaChips = document.getElementById("listaChips");
  var campoBusca = document.getElementById("campoBusca");
  var contador = document.getElementById("contadorResultados");
  var contadorMobile = document.getElementById("contadorResultadosMobile");
  var estadoVazio = document.getElementById("estadoVazio");
  var botaoLimpar = document.getElementById("btnLimparFiltros");

  var modal = document.getElementById("modalProduto");
  var modalImagem = document.getElementById("modalImagem");
  var modalTitulo = document.getElementById("modalTitulo");
  var modalCategoria = document.getElementById("modalCategoria");
  var modalDescricao = document.getElementById("modalDescricao");
  var modalAplicacao = document.getElementById("modalAplicacao");
  var modalWhatsapp = document.getElementById("modalWhatsapp");
  var modalAdicionar = document.getElementById("modalAdicionar");
  var botaoFecharModal = document.getElementById("btnFecharModal");

  var filtro = { categoria: "todos", termo: "" };
  var produtoAberto = null; /* produto na janela de detalhe, se houver */

  var CHECK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
  var CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';
  var MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  /* ------------------------------------------------------------------------
     UTILIDADES
     escaparHtml, produtoPorId, ehItemObrigatorio e protegerFotos moram em
     js/produtos.js, ao lado dos dados que servem.
     ------------------------------------------------------------------------ */
  function avisar(mensagem) {
    if (window.Braskit && typeof window.Braskit.toast === "function") {
      window.Braskit.toast(mensagem);
    }
  }

  function contarPorCategoria(slug) {
    return PRODUTOS.filter(function (p) { return p.categoria === slug; }).length;
  }

  /* ------------------------------------------------------------------------
     CHIPS DE CATEGORIA
     ------------------------------------------------------------------------ */
  function montarChips() {
    var html = '<button type="button" class="chip-filtro is-ativo" data-cat="todos" aria-pressed="true">' +
                 "Todos" +
                 '<span class="chip-filtro__contagem">' + PRODUTOS.length + "</span>" +
               "</button>";

    CATEGORIAS.forEach(function (categoria) {
      html += '<button type="button" class="chip-filtro" data-cat="' + categoria.slug + '" aria-pressed="false">' +
                escaparHtml(categoria.nome) +
                '<span class="chip-filtro__contagem">' + contarPorCategoria(categoria.slug) + "</span>" +
              "</button>";
    });

    listaChips.innerHTML = html;
  }

  function marcarChipAtivo(slug) {
    Array.prototype.forEach.call(listaChips.querySelectorAll(".chip-filtro"), function (chip) {
      var ativo = chip.getAttribute("data-cat") === slug;
      chip.classList.toggle("is-ativo", ativo);
      chip.setAttribute("aria-pressed", ativo ? "true" : "false");
    });
  }

  /* ------------------------------------------------------------------------
     GRID
     ------------------------------------------------------------------------ */
  /* Seletor do rodapé do card. Para os itens livres é uma caixa de seleção
     de verdade, com o id no próprio campo; para o kit mínimo é um aviso
     travado, sem controle nenhum: não há o que marcar ou desmarcar ali. */
  function montarSeletor(produto) {
    if (ehItemObrigatorio(produto.id)) {
      return '' +
        '<span class="selecao selecao--fixa" data-fixo="1">' +
          '<span class="selecao__caixa is-marcada" aria-hidden="true">' + CHECK + "</span>" +
          '<span class="selecao__texto">Sempre incluído' +
            "<small>Item do kit mínimo</small>" +
          "</span>" +
          '<span class="selecao__cadeado" aria-hidden="true">' + CADEADO + "</span>" +
        "</span>";
    }

    var marcado = Orcamento.tem(produto.id);
    return '' +
      '<label class="selecao' + (marcado ? " is-marcado" : "") + '">' +
        '<input type="checkbox" class="selecao__campo" data-id="' + produto.id + '"' +
               (marcado ? " checked" : "") + ">" +
        '<span class="selecao__caixa" aria-hidden="true">' + CHECK + "</span>" +
        '<span class="selecao__texto">' +
          (marcado ? "No orçamento" : "Adicionar ao orçamento") +
        "</span>" +
      "</label>";
  }

  function montarCard(produto, indice) {
    var categoria = categoriaPorSlug(produto.categoria);
    var atraso = Math.min(indice, 11) * 45; /* cascata que não atrasa demais o fim do grid */

    /* O card marcado ganha o anel laranja; o do kit mínimo, o anel petróleo,
       para a diferença entre escolha e obrigação valer também de longe. */
    var estado = ehItemObrigatorio(produto.id) ? " is-selecionado is-fixo"
               : Orcamento.tem(produto.id) ? " is-selecionado"
               : "";

    return '' +
      '<article class="produto-card produto-card--entrando' + estado +
               '" style="animation-delay:' + atraso + 'ms">' +
        '<button type="button" class="produto-abrir block w-full text-left" data-id="' + produto.id + '" ' +
                'aria-label="Ver detalhes de ' + escaparHtml(produto.nome) + '">' +
          '<div class="produto-midia" style="--cat-cor:' + categoria.cor + '">' +
            '<img class="produto-foto" src="' + produto.img + '" ' +
                 'alt="' + escaparHtml(produto.nome) + ' | Braskit" width="730" height="487" loading="lazy" decoding="async" ' +
                 'data-nome="' + escaparHtml(produto.nome) + '" data-cat="' + produto.categoria + '">' +
          "</div>" +
        "</button>" +
        '<div class="flex flex-1 flex-col p-5">' +
          '<span class="mb-3 inline-flex w-fit rounded-full bg-petroleo-900/8 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-petroleo-700">' +
            escaparHtml(categoria.nome) +
          "</span>" +
          '<h2 class="mb-2 text-lg leading-tight text-neutro-900">' + escaparHtml(produto.nome) + "</h2>" +
          '<p class="mb-5 flex-1 text-sm leading-relaxed text-neutro-900/60">' + escaparHtml(produto.descricao) + "</p>" +
          montarSeletor(produto) +
        "</div>" +
      "</article>";
  }

  function filtrarProdutos() {
    var termo = normalizarTexto(filtro.termo);

    return PRODUTOS.filter(function (produto) {
      if (filtro.categoria !== "todos" && produto.categoria !== filtro.categoria) return false;
      if (!termo) return true;

      var nomeCategoria = categoriaPorSlug(produto.categoria).nome;
      var alvo = normalizarTexto(produto.nome + " " + nomeCategoria + " " + produto.descricao);
      return alvo.indexOf(termo) !== -1;
    });
  }

  function renderizar() {
    var resultados = filtrarProdutos();

    grid.innerHTML = resultados.map(montarCard).join("");
    protegerFotos(grid); /* foto que não carrega cai no placeholder da categoria */

    var rotulo = resultados.length === 1 ? "1 produto encontrado"
                                         : resultados.length + " produtos encontrados";
    if (contador) contador.textContent = rotulo;
    if (contadorMobile) contadorMobile.textContent = rotulo;

    var vazio = resultados.length === 0;
    grid.classList.toggle("hidden", vazio);
    if (estadoVazio) {
      estadoVazio.classList.toggle("hidden", !vazio);
      estadoVazio.classList.toggle("flex", vazio);
    }
  }

  /* ------------------------------------------------------------------------
     JANELA DE DETALHE
     ------------------------------------------------------------------------ */
  function abrirDetalhe(id) {
    var produto = produtoPorId(id);
    if (!produto || !modal) return;
    produtoAberto = produto;

    var categoria = categoriaPorSlug(produto.categoria);

    modalImagem.src = produto.img;
    modalImagem.alt = produto.nome + " | Braskit";
    modalImagem.onerror = function () {
      modalImagem.onerror = null;
      modalImagem.src = placeholderProduto(produto.nome, produto.categoria);
    };

    modalTitulo.textContent = produto.nome;
    modalCategoria.textContent = categoria.nome;
    modalDescricao.textContent = produto.descricao;
    modalAplicacao.textContent = produto.aplicacao;
    modalWhatsapp.href = linkOrcamento(produto.nome);
    sincronizarModal();

    if (typeof modal.showModal === "function") modal.showModal();
    else modal.setAttribute("open", "");
  }

  /* O botão principal da janela reflete o estado do item na lista. */
  function sincronizarModal() {
    if (!modalAdicionar || !produtoAberto) return;

    var fixo = ehItemObrigatorio(produtoAberto.id);
    var dentro = Orcamento.tem(produtoAberto.id);
    var rotulo = fixo ? "Sempre incluído no orçamento"
               : dentro ? "No orçamento, tirar da lista"
               : "Adicionar ao orçamento";

    modalAdicionar.disabled = fixo;
    modalAdicionar.classList.toggle("is-dentro", dentro && !fixo);
    modalAdicionar.classList.toggle("is-fixo", fixo);
    modalAdicionar.innerHTML = (fixo ? CADEADO : dentro ? CHECK : MAIS) +
                               "<span>" + rotulo + "</span>";
  }

  if (modalAdicionar) {
    modalAdicionar.addEventListener("click", function () {
      if (!produtoAberto || ehItemObrigatorio(produtoAberto.id)) return;
      Orcamento.alternar(produtoAberto.id); /* o resto acompanha por aoMudar */
    });
  }

  if (botaoFecharModal && modal) {
    botaoFecharModal.addEventListener("click", function () { modal.close(); });
  }

  if (modal) {
    modal.addEventListener("close", function () { produtoAberto = null; });
  }

  /* ------------------------------------------------------------------------
     EVENTOS
     ------------------------------------------------------------------------ */

  /* Abrir detalhe e explicar o item travado (delegação: o grid é remontado
     a cada filtro) */
  grid.addEventListener("click", function (evento) {
    if (evento.target.closest("[data-fixo]")) {
      avisar("Este item faz parte do kit mínimo obrigatório e acompanha todo pedido.");
      return;
    }

    var gatilho = evento.target.closest(".produto-abrir");
    if (!gatilho) return;
    abrirDetalhe(parseInt(gatilho.getAttribute("data-id"), 10));
  });

  /* Marcar e desmarcar. Quem confirma é a bandeja, que pulsa e reconta;
     um aviso a cada clique atrapalharia quem escolhe vários itens seguidos. */
  grid.addEventListener("change", function (evento) {
    var campo = evento.target.closest(".selecao__campo");
    if (!campo) return;
    Orcamento.alternar(parseInt(campo.getAttribute("data-id"), 10));
  });

  /* A lista também muda de fora (janela do orçamento, botão de limpar):
     os cards que estão na tela acompanham. */
  function sincronizarSelecao() {
    Array.prototype.forEach.call(grid.querySelectorAll(".selecao__campo"), function (campo) {
      var marcado = Orcamento.tem(parseInt(campo.getAttribute("data-id"), 10));
      var rotulo = campo.closest(".selecao");
      var card = campo.closest(".produto-card");
      var texto = rotulo ? rotulo.querySelector(".selecao__texto") : null;

      campo.checked = marcado;
      if (rotulo) rotulo.classList.toggle("is-marcado", marcado);
      if (card) card.classList.toggle("is-selecionado", marcado);
      if (texto) texto.textContent = marcado ? "No orçamento" : "Adicionar ao orçamento";
    });

    sincronizarModal();
  }

  Orcamento.aoMudar(function (motivo) {
    if (motivo === "itens") sincronizarSelecao();
  });

  /* Trocar de categoria */
  listaChips.addEventListener("click", function (evento) {
    var chip = evento.target.closest(".chip-filtro");
    if (!chip) return;

    filtro.categoria = chip.getAttribute("data-cat");
    marcarChipAtivo(filtro.categoria);
    renderizar();
    atualizarEndereco();
  });

  /* Busca instantânea, com pequena espera para não remontar a cada tecla */
  if (campoBusca) {
    var esperaBusca;
    campoBusca.addEventListener("input", function () {
      window.clearTimeout(esperaBusca);
      esperaBusca = window.setTimeout(function () {
        filtro.termo = campoBusca.value;
        renderizar();
      }, 140);
    });
  }

  /* Limpar tudo, a partir do estado vazio */
  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", function () {
      filtro.categoria = "todos";
      filtro.termo = "";
      if (campoBusca) campoBusca.value = "";
      marcarChipAtivo("todos");
      renderizar();
      atualizarEndereco();
    });
  }

  /* ------------------------------------------------------------------------
     ENDEREÇO (?cat=)
     Mantém o filtro na URL, para os links vindos da página inicial abrirem
     na categoria certa e o botão voltar do navegador funcionar.
     ------------------------------------------------------------------------ */
  function atualizarEndereco() {
    if (!window.history || !window.history.replaceState) return;

    var url = window.location.pathname;
    if (filtro.categoria !== "todos") url += "?cat=" + filtro.categoria;
    window.history.replaceState({ cat: filtro.categoria }, "", url);
  }

  function lerCategoriaDaUrl() {
    var busca = window.location.search;
    if (!busca) return "todos";

    var partes = busca.replace(/^\?/, "").split("&");
    for (var i = 0; i < partes.length; i++) {
      var par = partes[i].split("=");
      if (par[0] !== "cat") continue;

      var valor = decodeURIComponent(par[1] || "");
      var existe = CATEGORIAS.some(function (c) { return c.slug === valor; });
      return existe ? valor : "todos";
    }
    return "todos";
  }

  /* ------------------------------------------------------------------------
     PARTIDA
     ------------------------------------------------------------------------ */
  montarChips();
  filtro.categoria = lerCategoriaDaUrl();
  marcarChipAtivo(filtro.categoria);
  renderizar();
})();
