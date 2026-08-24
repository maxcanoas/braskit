/* ==========================================================================
   BRASKIT | comportamento da interface
   Parallax, profundidade 3D, scroll reveal, contadores, header, menu e
   formulario. Sem dependencias: apenas requestAnimationFrame e
   IntersectionObserver.
   ========================================================================== */
(function () {
  "use strict";

  var WHATSAPP = "5551993011327";

  var consultaMovimentoReduzido = window.matchMedia("(prefers-reduced-motion: reduce)");
  var consultaDesktop = window.matchMedia("(min-width: 1024px)");
  var consultaMouse = window.matchMedia("(hover: hover) and (pointer: fine)");

  /* Parallax so roda em telas grandes e para quem nao pediu menos movimento. */
  function parallaxPermitido() {
    return consultaDesktop.matches && !consultaMovimentoReduzido.matches;
  }

  /* Os efeitos de mouse (profundidade do hero e tilt dos cartoes) exigem,
     alem disso, um ponteiro de verdade. No toque, nada roda. */
  function mousePermitido() {
    return parallaxPermitido() && consultaMouse.matches;
  }

  var movimentoAtivo = parallaxPermitido();

  /* ------------------------------------------------------------------------
     FOTOS DE AMBIENTE
     As fotos do hero e das faixas tem duas versoes: o recorte vertical, que
     o <picture> escolhe em tela em pe, e a panoramica. Se o arquivo que o
     navegador escolheu nao existir no servidor, a reserva desce um degrau
     sozinha:

       recorte vertical  ->  foto panoramica  ->  SVG de reserva

     e a pagina nunca fica com buraco. E o mesmo espirito de protegerFotos()
     em js/produtos.js, com uma diferenca: aqui a imagem ja esta no HTML e
     pode ter falhado antes deste script rodar (o hero carrega com
     fetchpriority alto), por isso a checagem de naturalWidth alem do evento.
     ------------------------------------------------------------------------ */
  (function reservaDeAmbiente() {
    var fotos = document.querySelectorAll("img[data-reserva]");
    if (!fotos.length) return;

    function descerUmDegrau(img) {
      var caixa = img.parentElement;
      var ehPicture = caixa && caixa.tagName === "PICTURE" && caixa.querySelector("source");

      /* Degrau 1: o que falhou foi o recorte vertical. Tira os <source> e
         reatribui o src, o que refaz a escolha do navegador, agora sem eles.
         Se currentSrc ja aponta para o src, o recorte nem estava em uso e a
         reserva pula direto para o degrau 2. */
      if (ehPicture && img.currentSrc !== img.src) {
        Array.prototype.forEach.call(caixa.querySelectorAll("source"), function (fonte) {
          caixa.removeChild(fonte);
        });
        img.src = img.getAttribute("src");
        return;
      }

      /* Degrau 2: o SVG, que mora no repositorio e sempre existe. */
      if (img.dataset.reservaUsada === "1") return;
      img.dataset.reservaUsada = "1";
      img.src = img.getAttribute("data-reserva");
    }

    Array.prototype.forEach.call(fotos, function (img) {
      img.addEventListener("error", function () { descerUmDegrau(img); });
      if (img.complete && img.naturalWidth === 0) descerUmDegrau(img);
    });
  })();

  /* ------------------------------------------------------------------------
     HEADER E BOTAO DE TOPO
     ------------------------------------------------------------------------ */
  var header = document.getElementById("header");
  var botaoTopo = document.getElementById("btnTopo");

  function atualizarHeader(deslocamento) {
    if (!header) return;
    var fixo = deslocamento > 80;
    header.classList.toggle("is-fixo", fixo);
    header.classList.toggle("py-2", fixo);
    header.classList.toggle("py-4", !fixo);
  }

  function atualizarBotaoTopo(deslocamento) {
    if (!botaoTopo) return;
    botaoTopo.classList.toggle("is-visivel", deslocamento > 600);
  }

  /* ------------------------------------------------------------------------
     PARALLAX + PROFUNDIDADE AO MOUSE
     Um unico requestAnimationFrame serve todos os efeitos. So mexemos em
     transform, nunca em top ou background-position. As camadas do hero
     somam dois deslocamentos: o vertical, da rolagem, e um horizontal
     suave, interpolado, que segue o mouse (data-profundidade).
     ------------------------------------------------------------------------ */
  var camadasHero = [];    // presas ao topo da pagina
  var elementosFluxo = []; // deslocam em relacao ao centro da viewport
  var alturaHero = 0;      // usada para o esmaecimento do conteudo do hero

  /* Posicao alvo e posicao atual do mouse no hero, de -1 a 1. A atual
     persegue a alvo com interpolacao, para o movimento ter peso. */
  var mouseAlvoX = 0, mouseAlvoY = 0;
  var mouseAtualX = 0, mouseAtualY = 0;
  var animandoMouse = false;

  function registrarParallax() {
    camadasHero = [];
    elementosFluxo = [];

    Array.prototype.forEach.call(
      document.querySelectorAll("[data-parallax-hero]"),
      function (el) {
        camadasHero.push({
          el: el,
          velocidade: parseFloat(el.getAttribute("data-parallax-hero")) || 0,
          profundidade: parseFloat(el.getAttribute("data-profundidade")) || 0,
          /* O conteudo do hero some enquanto sobe, para nao esbarrar na
             barra de numeros que avanca por cima da secao. */
          esmaece: el.hasAttribute("data-hero-fade")
        });
      }
    );

    var seletorFluxo = "[data-parallax], [data-parallax-faixa]";
    Array.prototype.forEach.call(document.querySelectorAll(seletorFluxo), function (el) {
      var valor = el.getAttribute("data-parallax-faixa") || el.getAttribute("data-parallax");
      var retangulo = el.getBoundingClientRect();
      /* Fundos de faixa podem correr bastante; titulos e decorativos ficam
         presos a um limite curto, senao o deslocamento acumula e o bloco
         invade a secao seguinte. */
      var ehFaixa = el.hasAttribute("data-parallax-faixa");

      elementosFluxo.push({
        el: el,
        velocidade: parseFloat(valor) || 0,
        centro: retangulo.top + window.scrollY + retangulo.height / 2,
        limite: ehFaixa ? 260 : 26,
        visivel: true
      });
    });

    var hero = document.querySelector(".hero-braskit");
    alturaHero = hero ? hero.getBoundingClientRect().height : 0;

    observarVisibilidade();
  }

  /* Elementos fora da tela nao precisam ser recalculados a cada quadro. */
  var observadorVisibilidade = null;
  function observarVisibilidade() {
    if (!("IntersectionObserver" in window)) return;
    if (observadorVisibilidade) observadorVisibilidade.disconnect();

    var porElemento = new Map();
    elementosFluxo.forEach(function (item) { porElemento.set(item.el, item); });

    observadorVisibilidade = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (entrada) {
        var item = porElemento.get(entrada.target);
        if (item) item.visivel = entrada.isIntersecting;
      });
    }, { rootMargin: "20% 0px 20% 0px" });

    elementosFluxo.forEach(function (item) { observadorVisibilidade.observe(item.el); });
  }

  function atualizarParallax(deslocamento) {
    var i;
    for (i = 0; i < camadasHero.length; i++) {
      var camada = camadasHero[i];
      var desvioX = mouseAtualX * camada.profundidade;
      var desvioY = mouseAtualY * camada.profundidade * 0.45;
      camada.el.style.transform =
        "translate3d(" + desvioX.toFixed(2) + "px," +
        (deslocamento * camada.velocidade + desvioY).toFixed(2) + "px,0)";
      if (camada.esmaece && alturaHero > 0) {
        var restante = 1 - deslocamento / (alturaHero * 0.45);
        camada.el.style.opacity = Math.max(0, Math.min(1, restante)).toFixed(3);
      }
    }

    var centroViewport = deslocamento + window.innerHeight / 2;
    for (i = 0; i < elementosFluxo.length; i++) {
      var item = elementosFluxo[i];
      if (!item.visivel) continue;
      var diferenca = (centroViewport - item.centro) * item.velocidade;
      if (diferenca > item.limite) diferenca = item.limite;
      else if (diferenca < -item.limite) diferenca = -item.limite;
      item.el.style.transform = "translate3d(0," + diferenca.toFixed(2) + "px,0)";
    }
  }

  function limparParallax() {
    camadasHero.concat(elementosFluxo).forEach(function (item) {
      item.el.style.transform = "";
      item.el.style.opacity = "";
    });
  }

  /* Mouse sobre o hero: guarda o alvo e liga a interpolacao. */
  (function profundidadeHero() {
    var hero = document.querySelector(".hero-braskit");
    if (!hero) return;

    hero.addEventListener("pointermove", function (evento) {
      if (!mousePermitido()) return;
      var retangulo = hero.getBoundingClientRect();
      mouseAlvoX = ((evento.clientX - retangulo.left) / retangulo.width) * 2 - 1;
      mouseAlvoY = ((evento.clientY - retangulo.top) / retangulo.height) * 2 - 1;
      iniciarInterpolacao();
    });

    hero.addEventListener("pointerleave", function () {
      mouseAlvoX = 0;
      mouseAlvoY = 0;
      iniciarInterpolacao();
    });
  })();

  function iniciarInterpolacao() {
    if (animandoMouse) return;
    animandoMouse = true;
    window.requestAnimationFrame(passoInterpolacao);
  }

  function passoInterpolacao() {
    mouseAtualX += (mouseAlvoX - mouseAtualX) * 0.08;
    mouseAtualY += (mouseAlvoY - mouseAtualY) * 0.08;

    if (movimentoAtivo) atualizarParallax(window.scrollY || window.pageYOffset);

    var quieto = Math.abs(mouseAlvoX - mouseAtualX) < 0.001 &&
                 Math.abs(mouseAlvoY - mouseAtualY) < 0.001;
    if (quieto) {
      mouseAtualX = mouseAlvoX;
      mouseAtualY = mouseAlvoY;
      animandoMouse = false;
      return;
    }
    window.requestAnimationFrame(passoInterpolacao);
  }

  /* ------------------------------------------------------------------------
     TILT 3D DOS CARTOES [data-tilt]
     Inclinacao de poucos graus seguindo o cursor, com brilho que acompanha.
     So roda com mouse de verdade, em tela grande e sem movimento reduzido.
     ------------------------------------------------------------------------ */
  (function tiltCartoes() {
    var cartoes = document.querySelectorAll("[data-tilt]");
    if (!cartoes.length) return;

    var GRAUS_MAX = 6;

    Array.prototype.forEach.call(cartoes, function (cartao) {
      var aguardando = false;
      var ultimoEvento = null;

      function aplicar() {
        aguardando = false;
        if (!ultimoEvento) return;

        var retangulo = cartao.getBoundingClientRect();
        var px = (ultimoEvento.clientX - retangulo.left) / retangulo.width;
        var py = (ultimoEvento.clientY - retangulo.top) / retangulo.height;

        var giroY = (px - 0.5) * 2 * GRAUS_MAX;
        var giroX = (0.5 - py) * 2 * GRAUS_MAX;

        cartao.style.transform =
          "rotateX(" + giroX.toFixed(2) + "deg) rotateY(" + giroY.toFixed(2) +
          "deg) translateY(-6px)";
        cartao.style.setProperty("--brilho-x", (px * 100).toFixed(1) + "%");
        cartao.style.setProperty("--brilho-y", (py * 100).toFixed(1) + "%");
      }

      cartao.addEventListener("pointerenter", function () {
        if (!mousePermitido()) return;
        cartao.classList.add("is-inclinando");
      });

      cartao.addEventListener("pointermove", function (evento) {
        if (!mousePermitido()) return;
        ultimoEvento = evento;
        if (aguardando) return;
        aguardando = true;
        window.requestAnimationFrame(aplicar);
      });

      cartao.addEventListener("pointerleave", function () {
        ultimoEvento = null;
        cartao.classList.remove("is-inclinando");
        cartao.style.transform = "";
        cartao.style.removeProperty("--brilho-x");
        cartao.style.removeProperty("--brilho-y");
      });
    });
  })();

  /* ------------------------------------------------------------------------
     LACO UNICO DE ROLAGEM
     ------------------------------------------------------------------------ */
  var aguardandoQuadro = false;

  function processarQuadro() {
    aguardandoQuadro = false;
    var deslocamento = window.scrollY || window.pageYOffset;
    atualizarHeader(deslocamento);
    atualizarBotaoTopo(deslocamento);
    if (movimentoAtivo) atualizarParallax(deslocamento);
  }

  function aoRolar() {
    if (aguardandoQuadro) return;
    aguardandoQuadro = true;
    window.requestAnimationFrame(processarQuadro);
  }

  window.addEventListener("scroll", aoRolar, { passive: true });

  /* Recalcula posicoes quando a janela muda de tamanho. */
  var temporizadorResize;
  window.addEventListener("resize", function () {
    window.clearTimeout(temporizadorResize);
    temporizadorResize = window.setTimeout(function () {
      var deveAnimar = parallaxPermitido();
      if (deveAnimar !== movimentoAtivo) {
        movimentoAtivo = deveAnimar;
        if (!movimentoAtivo) limparParallax();
      }
      registrarParallax();
      processarQuadro();
    }, 180);
  }, { passive: true });

  /* Reage a quem liga o movimento reduzido com a pagina ja aberta. */
  if (typeof consultaMovimentoReduzido.addEventListener === "function") {
    consultaMovimentoReduzido.addEventListener("change", function () {
      movimentoAtivo = parallaxPermitido();
      if (!movimentoAtivo) limparParallax();
    });
  }

  /* ------------------------------------------------------------------------
     SCROLL REVEAL
     ------------------------------------------------------------------------ */
  (function revelarAoRolar() {
    var alvos = document.querySelectorAll("[data-reveal]");
    if (!alvos.length) return;

    /* Sem IntersectionObserver ou com movimento reduzido, tudo entra visivel. */
    if (!("IntersectionObserver" in window) || consultaMovimentoReduzido.matches) {
      Array.prototype.forEach.call(alvos, function (el) { el.classList.add("is-visible"); });
      return;
    }

    var observador = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        var el = entrada.target;
        var atraso = parseInt(el.getAttribute("data-reveal-delay"), 10) || 0;
        el.style.transitionDelay = atraso + "ms";
        el.classList.add("is-visible");
        obs.unobserve(el);
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -10% 0px" });

    Array.prototype.forEach.call(alvos, function (el) { observador.observe(el); });
  })();

  /* ------------------------------------------------------------------------
     CONTADORES
     Disparam uma unica vez, com desaceleracao no fim.
     ------------------------------------------------------------------------ */
  (function contadores() {
    var alvos = document.querySelectorAll("[data-contador]");
    if (!alvos.length) return;

    function mostrarFinal(el) {
      el.textContent = el.getAttribute("data-contador");
    }

    if (!("IntersectionObserver" in window) || consultaMovimentoReduzido.matches) {
      Array.prototype.forEach.call(alvos, mostrarFinal);
      return;
    }

    function animar(el) {
      var destino = parseInt(el.getAttribute("data-contador"), 10) || 0;
      var duracao = 1600;
      var inicio = null;

      function passo(agora) {
        if (inicio === null) inicio = agora;
        var progresso = Math.min(1, (agora - inicio) / duracao);
        var suavizado = progresso === 1 ? 1 : 1 - Math.pow(2, -10 * progresso);
        el.textContent = String(Math.round(suavizado * destino));
        if (progresso < 1) window.requestAnimationFrame(passo);
      }

      window.requestAnimationFrame(passo);
    }

    var observador = new IntersectionObserver(function (entradas, obs) {
      entradas.forEach(function (entrada) {
        if (!entrada.isIntersecting) return;
        animar(entrada.target);
        obs.unobserve(entrada.target);
      });
    }, { threshold: 0.5 });

    Array.prototype.forEach.call(alvos, function (el) { observador.observe(el); });
  })();

  /* ------------------------------------------------------------------------
     MENU EM TELA CHEIA
     ------------------------------------------------------------------------ */
  (function menuMobile() {
    var botao = document.getElementById("btnMenu");
    var painel = document.getElementById("menuMobile");
    if (!botao || !painel) return;

    function abrir() {
      painel.classList.add("is-aberto");
      painel.removeAttribute("inert");
      botao.classList.add("is-ativo");
      botao.setAttribute("aria-expanded", "true");
      botao.setAttribute("aria-label", "Fechar menu de navegação");
      document.body.classList.add("sem-rolagem");
    }

    function fechar() {
      painel.classList.remove("is-aberto");
      painel.setAttribute("inert", "");
      botao.classList.remove("is-ativo");
      botao.setAttribute("aria-expanded", "false");
      botao.setAttribute("aria-label", "Abrir menu de navegação");
      document.body.classList.remove("sem-rolagem");
    }

    botao.addEventListener("click", function () {
      if (painel.classList.contains("is-aberto")) fechar();
      else abrir();
    });

    /* Escolher um item fecha o menu. */
    painel.addEventListener("click", function (evento) {
      if (evento.target.closest("a")) fechar();
    });

    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && painel.classList.contains("is-aberto")) {
        fechar();
        botao.focus();
      }
    });
  })();

  /* ------------------------------------------------------------------------
     ROLAGEM SUAVE PARA ANCORAS
     Compensa a altura do header fixo.
     ------------------------------------------------------------------------ */
  (function rolagemAncoras() {
    document.addEventListener("click", function (evento) {
      var link = evento.target.closest('a[href*="#"]');
      if (!link) return;

      var href = link.getAttribute("href");
      var indice = href.indexOf("#");
      if (indice < 0) return;

      var id = href.slice(indice + 1);
      if (!id) return;

      /* Ignora links que apontam para outra pagina. */
      var caminho = href.slice(0, indice);
      if (caminho && caminho.indexOf(location.pathname.split("/").pop()) === -1 && caminho !== "") return;

      var destino = document.getElementById(id);
      if (!destino) return;

      evento.preventDefault();

      var alturaHeader = header ? header.offsetHeight : 0;
      var topo = destino.getBoundingClientRect().top + window.scrollY - alturaHeader - 12;

      window.scrollTo({
        top: topo,
        behavior: consultaMovimentoReduzido.matches ? "auto" : "smooth"
      });

      /* Mantem o foco coerente para quem navega pelo teclado. */
      destino.setAttribute("tabindex", "-1");
      destino.focus({ preventScroll: true });
    });
  })();

  /* Botao de voltar ao topo */
  (function voltarAoTopo() {
    if (!botaoTopo) return;
    botaoTopo.addEventListener("click", function () {
      window.scrollTo({
        top: 0,
        behavior: consultaMovimentoReduzido.matches ? "auto" : "smooth"
      });
    });
  })();

  /* ------------------------------------------------------------------------
     AVISOS
     ------------------------------------------------------------------------ */
  function mostrarToast(mensagem, tipo) {
    var area = document.getElementById("areaToast");
    if (!area) return;

    var caixa = document.createElement("div");
    caixa.className = "aviso " + (tipo === "erro" ? "aviso--erro" : "aviso--ok");
    caixa.setAttribute("role", "status");

    var texto = document.createElement("span");
    texto.textContent = mensagem;
    caixa.appendChild(texto);

    area.appendChild(caixa);
    window.setTimeout(function () {
      caixa.style.transition = "opacity .4s ease";
      caixa.style.opacity = "0";
      window.setTimeout(function () {
        if (caixa.parentNode) caixa.parentNode.removeChild(caixa);
      }, 420);
    }, 4200);
  }

  /* ------------------------------------------------------------------------
     FORMULARIO DE ORCAMENTO
     Nao envia nada para servidor: monta a mensagem e abre o WhatsApp.
     ------------------------------------------------------------------------ */
  (function formularioOrcamento() {
    var formulario = document.getElementById("formOrcamento");
    if (!formulario) return;

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();

      var nome = formulario.nome.value.trim();
      var empresa = formulario.empresa.value.trim();
      var telefone = formulario.telefone.value.trim();
      var carga = formulario.carga.value;
      var mensagem = formulario.mensagem.value.trim();

      if (!nome || !telefone) {
        mostrarToast("Preencha ao menos o nome e o telefone.", "erro");
        (nome ? formulario.telefone : formulario.nome).focus();
        return;
      }

      var linhas = ["Olá! Gostaria de solicitar um orçamento.", "", "Nome: " + nome];
      if (empresa) linhas.push("Empresa: " + empresa);
      linhas.push("Telefone: " + telefone);
      if (carga) linhas.push("Tipo de carga: " + carga);
      if (mensagem) linhas.push("", mensagem);

      var url = "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(linhas.join("\n"));
      window.open(url, "_blank", "noopener");

      mostrarToast("Mensagem pronta! Abrimos o WhatsApp para você enviar.");
      formulario.reset();
    });
  })();

  /* Disponivel para outras paginas (o catalogo reaproveita o mesmo aviso). */
  window.Braskit = { toast: mostrarToast, whatsapp: WHATSAPP };

  /* ------------------------------------------------------------------------
     PARTIDA
     ------------------------------------------------------------------------ */
  registrarParallax();
  processarQuadro();

  /* As imagens do parallax mudam de altura ao carregar: remede depois disso. */
  window.addEventListener("load", function () {
    registrarParallax();
    processarQuadro();
  });
})();
