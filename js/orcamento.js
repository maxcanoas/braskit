/* ==========================================================================
   BRASKIT | orçamento por seleção
   Guarda os itens que a pessoa marca no catálogo, mantém o kit mínimo
   sempre dentro, desenha a bandeja fixa e a janela da lista, e monta o link
   de WhatsApp com tudo escrito. Depende de js/produtos.js.

   Nada vai para servidor: a lista mora no localStorage do próprio aparelho e
   só sai dali quando a pessoa manda a mensagem.

   O catálogo (js/catalogo.js) conversa com este módulo apenas pela API em
   window.Orcamento. Quem desenha card e checkbox é ele; quem manda no estado
   é aqui.
   ========================================================================== */
(function () {
  "use strict";

  var CHAVE = "braskit.orcamento.v1";
  var QTD_MAX = 99;
  var MINIS = 3; /* miniaturas mostradas na bandeja antes do "+N" */

  var itens = [];    /* [{ id, qtd }], na ordem em que entraram */
  var ouvintes = [];

  var bandeja = document.getElementById("bandejaOrcamento");
  var bandejaContagem = document.getElementById("bandejaContagem");
  var bandejaMinis = document.getElementById("bandejaMinis");
  var bandejaEnviar = document.getElementById("btnEnviarBandeja");
  var botaoVerLista = document.getElementById("btnVerLista");

  var janela = document.getElementById("modalOrcamento");
  var corpoLista = document.getElementById("listaOrcamento");
  var resumoLista = document.getElementById("resumoOrcamento");
  var listaEnviar = document.getElementById("btnEnviarLista");
  var botaoLimpar = document.getElementById("btnLimparEscolhidos");
  var botaoFechar = document.getElementById("btnFecharOrcamento");

  /* Ícones. Ficam aqui como texto para o HTML da lista sair de uma vez só. */
  var CADEADO = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/></svg>';
  var FECHAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="round" aria-hidden="true"><path d="M18 6L6 18M6 6l12 12"/></svg>';
  var MENOS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M5 12h14"/></svg>';
  var MAIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';

  /* Os avisos do site vivem fora da janela, e o <dialog> nativo sobe para o
     top layer: com a lista aberta o aviso ficaria atrás do fundo escurecido.
     Por isso só avisamos com a janela fechada; dentro dela o retorno é a
     própria lista, que muda na hora. */
  function avisar(mensagem) {
    if (janela && janela.open) return;
    if (window.Braskit && typeof window.Braskit.toast === "function") {
      window.Braskit.toast(mensagem);
    }
  }

  /* ------------------------------------------------------------------------
     ESTADO
     ------------------------------------------------------------------------ */
  function indiceDe(id) {
    for (var i = 0; i < itens.length; i++) {
      if (itens[i].id === id) return i;
    }
    return -1;
  }

  function normalizarQtd(valor) {
    var n = parseInt(valor, 10);
    if (isNaN(n) || n < 1) return 1;
    return n > QTD_MAX ? QTD_MAX : n;
  }

  /* O kit mínimo entra sempre, e na frente, mesmo que a composição tenha
     mudado depois da última visita ou que alguém mexa no armazenamento. */
  function garantirKitMinimo() {
    for (var i = KIT_MINIMO.length - 1; i >= 0; i--) {
      var fixo = KIT_MINIMO[i];
      if (!produtoPorId(fixo.id)) continue; /* id sem par em PRODUTOS: ignora */
      if (indiceDe(fixo.id) !== -1) continue;
      itens.unshift({ id: fixo.id, qtd: normalizarQtd(fixo.qtd) });
    }
  }

  /* localStorage pode estar bloqueado (janela anônima, restrição em file://)
     ou trazer lixo de uma versão antiga. Em qualquer um dos casos a lista
     começa do zero e o site segue funcionando, só sem lembrar da escolha. */
  function carregar() {
    var salvos = [];
    try {
      var bruto = window.localStorage.getItem(CHAVE);
      var dados = bruto ? JSON.parse(bruto) : null;
      if (Array.isArray(dados)) salvos = dados;
    } catch (erro) {
      salvos = [];
    }

    itens = [];
    salvos.forEach(function (registro) {
      if (!registro || typeof registro !== "object") return;
      var id = parseInt(registro.id, 10);
      if (isNaN(id) || !produtoPorId(id) || indiceDe(id) !== -1) return;
      itens.push({ id: id, qtd: normalizarQtd(registro.qtd) });
    });

    garantirKitMinimo();
  }

  function salvar() {
    try {
      window.localStorage.setItem(CHAVE, JSON.stringify(itens));
    } catch (erro) {
      /* Sem espaço ou sem permissão: a lista continua valendo nesta visita. */
    }
  }

  /* Itens prontos para exibir, com o kit mínimo sempre no topo. */
  function lista() {
    var fixos = [];
    var escolhidos = [];

    itens.forEach(function (item) {
      var produto = produtoPorId(item.id);
      if (!produto) return;

      var registro = {
        produto: produto,
        qtd: item.qtd,
        obrigatorio: ehItemObrigatorio(item.id)
      };
      (registro.obrigatorio ? fixos : escolhidos).push(registro);
    });

    return fixos.concat(escolhidos);
  }

  function unidadesTotais() {
    var soma = 0;
    for (var i = 0; i < itens.length; i++) soma += itens[i].qtd;
    return soma;
  }

  /* Toda mudança passa por aqui: grava, redesenha e avisa o catálogo. */
  function aplicar(motivo) {
    salvar();
    desenhar(motivo);
    for (var i = 0; i < ouvintes.length; i++) ouvintes[i](motivo);
  }

  function adicionar(id) {
    if (!produtoPorId(id) || indiceDe(id) !== -1) return false;
    itens.push({ id: id, qtd: 1 });
    aplicar("itens");
    pulsar();
    return true;
  }

  function remover(id) {
    if (ehItemObrigatorio(id)) return false;
    var pos = indiceDe(id);
    if (pos === -1) return false;
    itens.splice(pos, 1);
    aplicar("itens");
    return true;
  }

  function alternar(id) {
    return indiceDe(id) === -1 ? adicionar(id) : remover(id);
  }

  function definirQtd(id, valor) {
    var pos = indiceDe(id);
    if (pos === -1) return;

    var nova = normalizarQtd(valor);
    if (itens[pos].qtd === nova) return;
    itens[pos].qtd = nova;
    aplicar("qtd");
  }

  function limparEscolhidos() {
    var antes = itens.length;
    itens = itens.filter(function (item) { return ehItemObrigatorio(item.id); });
    if (itens.length === antes) return;
    aplicar("itens");
  }

  /* ------------------------------------------------------------------------
     BANDEJA FIXA
     ------------------------------------------------------------------------ */
  function pulsar() {
    if (!bandeja) return;
    bandeja.classList.remove("is-pulsando");
    void bandeja.offsetWidth; /* reinicia a animação em adições seguidas */
    bandeja.classList.add("is-pulsando");
  }

  function desenharBandeja() {
    if (!bandeja) return;

    var registros = lista();
    var total = registros.length;

    bandeja.classList.toggle("is-visivel", total > 0);
    document.body.classList.toggle("com-bandeja", total > 0);

    if (bandejaContagem) {
      bandejaContagem.textContent = total + (total === 1 ? " item" : " itens");
    }

    if (bandejaMinis) {
      bandejaMinis.innerHTML = registros.slice(0, MINIS).map(function (registro) {
        return '<img src="' + registro.produto.img + '" alt="" loading="lazy" decoding="async" ' +
               'data-nome="' + escaparHtml(registro.produto.nome) + '" ' +
               'data-cat="' + registro.produto.categoria + '">';
      }).join("") +
      (total > MINIS ? '<span class="bandeja__mais">+' + (total - MINIS) + "</span>" : "");
      protegerFotos(bandejaMinis);
    }

    atualizarLinks(registros);
  }

  function atualizarLinks(registros) {
    var endereco = registros.length
      ? linkOrcamentoLista(registros)
      : "https://wa.me/" + WHATSAPP_BRASKIT;

    if (bandejaEnviar) bandejaEnviar.href = endereco;
    if (listaEnviar) listaEnviar.href = endereco;
  }

  /* ------------------------------------------------------------------------
     JANELA DA LISTA
     ------------------------------------------------------------------------ */
  function montarLinha(registro) {
    var produto = registro.produto;
    var nome = escaparHtml(produto.nome);
    var categoria = categoriaPorSlug(produto.categoria).nome;

    var quantidade =
      '<div class="contador-qtd">' +
        '<button type="button" class="contador-qtd__botao" data-acao="menos" data-id="' + produto.id + '" ' +
                'aria-label="Diminuir a quantidade de ' + nome + '"' +
                (registro.qtd <= 1 ? " disabled" : "") + ">" + MENOS + "</button>" +
        '<input type="text" class="contador-qtd__valor" inputmode="numeric" maxlength="2" ' +
               'value="' + registro.qtd + '" data-id="' + produto.id + '" ' +
               'aria-label="Quantidade de ' + nome + '">' +
        '<button type="button" class="contador-qtd__botao" data-acao="mais" data-id="' + produto.id + '" ' +
                'aria-label="Aumentar a quantidade de ' + nome + '"' +
                (registro.qtd >= QTD_MAX ? " disabled" : "") + ">" + MAIS + "</button>" +
      "</div>";

    var fim = registro.obrigatorio
      ? '<span class="linha-orcamento__cadeado" title="Item do kit mínimo obrigatório">' + CADEADO + "</span>"
      : '<button type="button" class="linha-orcamento__remover" data-acao="remover" data-id="' + produto.id + '" ' +
                'aria-label="Remover ' + nome + ' do orçamento">' + FECHAR + "</button>";

    return '' +
      '<li class="linha-orcamento' + (registro.obrigatorio ? " linha-orcamento--fixa" : "") + '">' +
        '<img class="linha-orcamento__foto" src="' + produto.img + '" alt="" loading="lazy" decoding="async" ' +
             'data-nome="' + nome + '" data-cat="' + produto.categoria + '">' +
        '<div class="linha-orcamento__info">' +
          '<p class="linha-orcamento__nome">' + nome + "</p>" +
          '<p class="linha-orcamento__cat">' + escaparHtml(categoria) +
            (registro.obrigatorio ? " · Obrigatório" : "") +
          "</p>" +
        "</div>" +
        quantidade +
        fim +
      "</li>";
  }

  function montarGrupo(titulo, apoio, registros) {
    if (!registros.length) return "";
    return '' +
      '<section class="grupo-orcamento">' +
        '<h3 class="grupo-orcamento__titulo">' + titulo +
          '<span class="grupo-orcamento__contagem">' + registros.length + "</span>" +
        "</h3>" +
        (apoio ? '<p class="grupo-orcamento__apoio">' + apoio + "</p>" : "") +
        '<ul class="grupo-orcamento__lista">' + registros.map(montarLinha).join("") + "</ul>" +
      "</section>";
  }

  function desenharLista() {
    if (!corpoLista) return;

    var registros = lista();
    var fixos = registros.filter(function (r) { return r.obrigatorio; });
    var escolhidos = registros.filter(function (r) { return !r.obrigatorio; });

    var html =
      montarGrupo("Kit mínimo obrigatório", "Estes itens acompanham todo pedido e não saem da lista.", fixos) +
      montarGrupo("Itens que você escolheu", "", escolhidos);

    if (!escolhidos.length) {
      html += '<p class="orcamento-vazio">Marque no catálogo os produtos que você precisa: ' +
              "eles entram aqui, junto do kit obrigatório.</p>";
    }

    corpoLista.innerHTML = html;
    protegerFotos(corpoLista);
    atualizarResumo(registros);
    if (botaoLimpar) botaoLimpar.disabled = escolhidos.length === 0;
  }

  function atualizarResumo(registros) {
    if (!resumoLista) return;

    var total = registros.length;
    var unidades = unidadesTotais();
    var texto = total + (total === 1 ? " item" : " itens");
    if (unidades !== total) texto += " · " + unidades + " unidades";
    resumoLista.textContent = texto;
  }

  function desenhar(motivo) {
    desenharBandeja();
    if (!janela || !janela.open) return;

    if (motivo === "itens") desenharLista();
    else atualizarResumo(lista());
  }

  function abrir() {
    if (!janela) return;
    desenharLista();
    if (typeof janela.showModal === "function") janela.showModal();
    else janela.setAttribute("open", "");
  }

  /* ------------------------------------------------------------------------
     EVENTOS
     ------------------------------------------------------------------------ */
  if (botaoVerLista) {
    botaoVerLista.addEventListener("click", abrir);
  }

  if (botaoFechar && janela) {
    botaoFechar.addEventListener("click", function () { janela.close(); });
  }

  if (botaoLimpar) {
    botaoLimpar.addEventListener("click", limparEscolhidos);
  }

  /* Atualiza só o contador daquela linha: redesenhar a lista inteira faria o
     campo perder o foco no meio da digitação. */
  function sincronizarContador(id) {
    if (!corpoLista) return;

    var pos = indiceDe(id);
    if (pos === -1) return;

    var quantidade = itens[pos].qtd;
    var campo = corpoLista.querySelector('.contador-qtd__valor[data-id="' + id + '"]');
    if (campo && campo.value !== String(quantidade)) campo.value = quantidade;

    var menos = corpoLista.querySelector('[data-acao="menos"][data-id="' + id + '"]');
    var mais = corpoLista.querySelector('[data-acao="mais"][data-id="' + id + '"]');
    if (menos) menos.disabled = quantidade <= 1;
    if (mais) mais.disabled = quantidade >= QTD_MAX;
  }

  /* Um ouvinte só para a lista inteira: as linhas são remontadas a cada
     mudança de itens. */
  if (corpoLista) {
    corpoLista.addEventListener("click", function (evento) {
      var botao = evento.target.closest("[data-acao]");
      if (!botao) return;

      var id = parseInt(botao.getAttribute("data-id"), 10);
      var acao = botao.getAttribute("data-acao");

      if (acao === "remover") {
        remover(id);
        /* A linha que tinha o foco deixou de existir: devolve o foco para a
           lista, senão ele volta para o começo do documento. */
        corpoLista.focus();
        return;
      }

      var pos = indiceDe(id);
      if (pos === -1) return;

      definirQtd(id, acao === "mais" ? itens[pos].qtd + 1 : itens[pos].qtd - 1);
      sincronizarContador(id);
    });

    /* Digitação direta no campo de quantidade (mais rápido que clicar doze
       vezes no "+"). O campo aceita só dígito; o valor final é acertado
       quando o campo perde o foco. */
    corpoLista.addEventListener("input", function (evento) {
      var campo = evento.target.closest(".contador-qtd__valor");
      if (!campo) return;

      var limpo = campo.value.replace(/\D/g, "").slice(0, 2);
      if (limpo !== campo.value) campo.value = limpo;
      if (!limpo) return; /* deixa apagar para digitar outro número */

      var id = parseInt(campo.getAttribute("data-id"), 10);
      definirQtd(id, limpo);
      sincronizarContador(id);
    });

    corpoLista.addEventListener("blur", function (evento) {
      var campo = evento.target.closest(".contador-qtd__valor");
      if (!campo) return;
      sincronizarContador(parseInt(campo.getAttribute("data-id"), 10));
    }, true);
  }

  /* Mandar a lista fecha a janela: quando a pessoa voltar do WhatsApp, o
     catálogo está do jeito que ela deixou, com a seleção intacta. O aviso vem
     depois de fechar, senão ficaria escondido atrás da janela. */
  function aoEnviar() {
    if (janela && janela.open) janela.close();
    avisar("Sua lista foi para o WhatsApp. É só enviar a mensagem.");
  }

  if (bandejaEnviar) bandejaEnviar.addEventListener("click", aoEnviar);
  if (listaEnviar) listaEnviar.addEventListener("click", aoEnviar);

  /* ------------------------------------------------------------------------
     API PÚBLICA
     ------------------------------------------------------------------------ */
  window.Orcamento = {
    tem: function (id) { return indiceDe(id) !== -1; },
    obrigatorio: function (id) { return ehItemObrigatorio(id); },
    quantidade: function (id) {
      var pos = indiceDe(id);
      return pos === -1 ? 0 : itens[pos].qtd;
    },
    total: function () { return itens.length; },
    lista: lista,
    adicionar: adicionar,
    remover: remover,
    alternar: alternar,
    limpar: limparEscolhidos,
    abrir: abrir,
    aoMudar: function (fn) { if (typeof fn === "function") ouvintes.push(fn); }
  };

  /* ------------------------------------------------------------------------
     PARTIDA
     ------------------------------------------------------------------------ */
  carregar();
  salvar();      /* grava o kit mínimo já na primeira visita */
  desenharBandeja();
})();
