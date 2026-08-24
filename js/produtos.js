/* ==========================================================================
   BRASKIT | dados do catálogo
   34 produtos em 8 categorias. As fotos vieram do acervo da empresa e são
   exibidas com tratamento (ver .produto-midia em css/style.css).
   ========================================================================== */

/* Cada categoria tem uma cor de fundo própria, usada no tratamento das fotos.
   Todas ficam na mesma família (petróleo e tons queimados) para o grid do
   catálogo ler como um conjunto só. */
var CATEGORIAS = [
  { slug: "produtos",            nome: "Produtos",                cor: "#155E63" },
  { slug: "suportes",            nome: "Suportes",                cor: "#0F3B3F" },
  { slug: "sinalizacao",         nome: "Sinalização",             cor: "#9A4A05" },
  { slug: "textil",              nome: "Têxtil",                  cor: "#123C4A" },
  { slug: "injetados",           nome: "Injetados",               cor: "#7A3B00" },
  { slug: "acessorios-caminhao", nome: "Acessórios para caminhão", cor: "#0B3136" },
  { slug: "epis",                nome: "EPIs",                    cor: "#1A5A5F" },
  { slug: "kits-protecao",       nome: "Kits de proteção",        cor: "#8A3A00" }
];

var PRODUTOS = [
  {
    id: 1, nome: "Abafa Chamas", categoria: "produtos", slug: "abafa-chamas",
    descricao: "Lona tratada. Abafa o fogo sem molhar a carga.",
    aplicacao: "Princípio de incêndio em líquido inflamável, onde a água espalharia as chamas.",
    img: "assets/produtos/abafa-chamas.jpg"
  },
  {
    id: 2, nome: "Balde de Alumínio com Cabo Terra", categoria: "produtos", slug: "balde-aluminio-cabo-terra",
    descricao: "Alumínio com cabo de aterramento, que descarrega a estática antes de ela virar faísca.",
    aplicacao: "Coleta e transferência de combustível e solvente.",
    img: "assets/produtos/balde-aluminio-cabo-terra.jpg"
  },
  {
    id: 3, nome: "Lanternas", categoria: "produtos", slug: "lanternas",
    descricao: "Feixe direcionado, autonomia para uma parada inteira.",
    aplicacao: "Parada de emergência e conferência da carga à noite.",
    img: "assets/produtos/lanternas.jpg"
  },
  {
    id: 4, nome: "Caixa de Plástico para Extintor", categoria: "suportes", slug: "caixa-plastico-extintor",
    descricao: "Caixa injetada. Guarda o extintor fora da cabine, protegido de sol, chuva e batida.",
    aplicacao: "Instalação externa no veículo.",
    img: "assets/produtos/caixa-plastico-extintor.jpg"
  },
  {
    id: 5, nome: "Suporte de Ferro para Extintor", categoria: "suportes", slug: "suporte-ferro-extintor",
    descricao: "Ferro com pintura eletrostática e cinta de fixação.",
    aplicacao: "Prende o extintor ao chassi ou à lateral da carroceria.",
    img: "assets/produtos/suporte-ferro-extintor.jpg"
  },
  {
    id: 6, nome: "Suporte de Ferro para Cone", categoria: "suportes", slug: "suporte-ferro-cone",
    descricao: "Mantém os cones empilhados e presos no trajeto.",
    aplicacao: "Transporte dos cones sem eles rolarem pela carroceria.",
    img: "assets/produtos/suporte-ferro-cone.jpg"
  },
  {
    id: 7, nome: "Suporte de Ferro para Placa", categoria: "suportes", slug: "suporte-ferro-placa",
    descricao: "Metálico, para painel e rótulo de risco.",
    aplicacao: "Sinalização fixa exigida no transporte de produtos perigosos.",
    img: "assets/produtos/suporte-ferro-placa.jpg"
  },
  {
    id: 8, nome: "Suporte de Plástico para Placa Retangular", categoria: "suportes", slug: "suporte-plastico-placa-retangular",
    descricao: "Injetado, de encaixe rápido, para o painel retangular.",
    aplicacao: "Troca do painel quando muda o produto transportado.",
    img: "assets/produtos/suporte-plastico-placa-retangular.jpg"
  },
  {
    id: 9, nome: "Suporte de Plástico para Placa Quadrada", categoria: "suportes", slug: "suporte-plastico-placa-quadrada",
    descricao: "Injetado, para o rótulo de risco montado no losango.",
    aplicacao: "Classe de risco na lateral e na traseira.",
    img: "assets/produtos/suporte-plastico-placa-quadrada.jpg"
  },
  {
    id: 10, nome: "Placa Perigo", categoria: "sinalizacao", slug: "placa-perigo",
    descricao: "Chapa rígida com impressão de alto contraste. É a placa Afaste-se.",
    aplicacao: "Isolamento da área em acidente ou vazamento.",
    img: "assets/produtos/placa-perigo.jpg"
  },
  {
    id: 11, nome: "Placa Laranja com Números", categoria: "sinalizacao", slug: "placa-laranja-numeros",
    descricao: "Painel de segurança laranja com número de risco e número ONU já aplicados.",
    aplicacao: "Identificação obrigatória do produto transportado.",
    detalhe: "O par de números muda conforme o produto: diga o que você transporta e a placa sai pronta. Para frota que alterna entre produtos existe a versão lisa, com numeração removível.",
    img: "assets/produtos/placa-laranja-numeros.jpg"
  },
  {
    id: 12, nome: "Placa Laranja", categoria: "sinalizacao", slug: "placa-laranja",
    descricao: "Laranja lisa, sem numeração, em plástico resistente.",
    aplicacao: "Carga fracionada e uso com numeração removível.",
    img: "assets/produtos/placa-laranja.jpg"
  },
  {
    id: 13, nome: "Placa Líquido Inflamável", categoria: "sinalizacao", slug: "placa-liquido-inflamavel",
    descricao: "Rótulo de risco da classe 3.",
    aplicacao: "Combustível, solvente e álcool.",
    img: "assets/produtos/placa-liquido-inflamavel.jpg"
  },
  {
    id: 14, nome: "Placa Material Corrosivo", categoria: "sinalizacao", slug: "placa-material-corrosivo",
    descricao: "Rótulo de risco da classe 8.",
    aplicacao: "Ácido, soda cáustica e demais corrosivos.",
    img: "assets/produtos/placa-material-corrosivo.jpg"
  },
  {
    id: 15, nome: "Bastão Sinalizador", categoria: "sinalizacao", slug: "bastao-sinalizador",
    descricao: "Bastão luminoso para orientar o tráfego e marcar onde o veículo parou.",
    aplicacao: "Parada em trecho de pouca visibilidade e desvio de trânsito.",
    img: "assets/produtos/bastao-sinalizador.jpg"
  },
  {
    id: 16, nome: "Faixa Refletiva", categoria: "sinalizacao", slug: "faixa-refletiva",
    descricao: "Adesiva, para contorno de carroceria e para-choque.",
    aplicacao: "Visibilidade do veículo à noite.",
    img: "assets/produtos/faixa-refletiva.jpg"
  },
  {
    id: 17, nome: "Bolsa de Lona para Kit", categoria: "textil", slug: "bolsa-lona-kit",
    descricao: "Lona reforçada, com alça e fechamento. Cabe o kit inteiro num lugar só.",
    aplicacao: "Guarda e transporte dos itens de emergência.",
    detalhe: "Item solto pela cabine é item que some — e o que some é justamente o que falta na hora da conferência.",
    img: "assets/produtos/bolsa-lona-kit.jpg"
  },
  {
    id: 18, nome: "Capa de Cone", categoria: "textil", slug: "capa-cone",
    descricao: "Tecido, com área para identificação.",
    aplicacao: "Sinalização com o nome da frota ou aviso próprio.",
    img: "assets/produtos/capa-cone.jpg"
  },
  {
    id: 19, nome: "Colete Refletivo", categoria: "textil", slug: "colete-refletivo",
    descricao: "Faixas refletivas e fecho ajustável.",
    aplicacao: "Uso obrigatório ao descer do veículo na via.",
    img: "assets/produtos/colete-refletivo.jpg"
  }
  ,
  {
    id: 20, nome: "Cone Flexível com Faixa (NBR 15071)", categoria: "injetados", slug: "cone-flexivel-nbr-15071",
    descricao: "Cone flexível com faixa refletiva, no padrão da NBR 15071.",
    aplicacao: "Sinalização em parada de emergência na rodovia.",
    detalhe: "Flexível porque cone rígido atropelado quebra e sai do kit; este volta ao formato. A quantidade de dispositivos de sinalização que o veículo precisa levar é tratada pela NBR 9735 — confirme com a gente quantos a sua operação exige.",
    img: "assets/produtos/cone-flexivel-nbr-15071.jpg"
  },
  {
    id: 21, nome: "Cone Pequeno Preto e Amarelo", categoria: "injetados", slug: "cone-pequeno-preto-amarelo",
    descricao: "Compacto, leve, fácil de guardar.",
    aplicacao: "Pátio, doca e área interna de carga.",
    img: "assets/produtos/cone-pequeno-preto-amarelo.jpg"
  },
  {
    id: 22, nome: "Pedestal", categoria: "injetados", slug: "pedestal",
    descricao: "Base reforçada, para uso com fita ou corrente.",
    aplicacao: "Delimitação de área de risco durante a operação.",
    img: "assets/produtos/pedestal.jpg"
  },
  {
    id: 23, nome: "Fitas Zebradas", categoria: "injetados", slug: "fitas-zebradas",
    descricao: "Amarelo e preto, para isolar o perímetro rápido.",
    aplicacao: "Contenção de área em vazamento e ocorrência.",
    img: "assets/produtos/fitas-zebradas.jpg"
  },
  {
    id: 24, nome: "Pá e Enxada", categoria: "injetados", slug: "pa-enxada",
    descricao: "Cabo curto, para caber no kit.",
    aplicacao: "Contenção e recolhimento de produto derramado.",
    img: "assets/produtos/pa-enxada.jpg"
  },
  {
    id: 25, nome: "Extintor ABC", categoria: "acessorios-caminhao", slug: "extintor-abc",
    descricao: "Pó químico ABC, com manômetro, lacre e carga na validade.",
    aplicacao: "Obrigatório em todo veículo de carga.",
    detalhe: "É o primeiro item que a fiscalização olha e o que mais vence sem ninguém perceber. Confira o manômetro na faixa verde e a data no lacre; se estiver fora, a gente troca o item na renovação do kit.",
    img: "assets/produtos/extintor-abc.jpg"
  },
  {
    id: 26, nome: "Par de Calço de Borracha", categoria: "acessorios-caminhao", slug: "calco-borracha",
    descricao: "Borracha maciça, com aderência no piso.",
    aplicacao: "Travar as rodas em parada e durante carga e descarga.",
    img: "assets/produtos/calco-borracha.jpg"
  },
  {
    id: 27, nome: "Respirador Semifacial com Filtro", categoria: "epis", slug: "respirador-semifacial",
    descricao: "Semifacial com filtro para vapor orgânico e gás ácido.",
    aplicacao: "Aproximação em vazamento de produto volátil.",
    detalhe: "O filtro é escolhido pelo produto, não pelo respirador: diga o que você transporta que a gente confere o cartucho certo.",
    img: "assets/produtos/respirador-semifacial.jpg"
  },
  {
    id: 28, nome: "Máscara Panorâmica com Filtro", categoria: "epis", slug: "mascara-panoramica",
    descricao: "Facial inteira, visor panorâmico. Protege também os olhos.",
    aplicacao: "Emergência com produto irritante ou corrosivo.",
    img: "assets/produtos/mascara-panoramica.jpg"
  },
  {
    id: 29, nome: "Luvas Nitrílica e Multitato", categoria: "epis", slug: "luvas-nitrilica-multitato",
    descricao: "Aderência e resistência química no mesmo par.",
    aplicacao: "Manuseio geral da carga e dos itens do kit.",
    img: "assets/produtos/luvas-nitrilica-multitato.jpg"
  },
  {
    id: 30, nome: "Luvas de Raspa e Vaqueta", categoria: "epis", slug: "luvas-raspa-vaqueta",
    descricao: "Raspa e vaqueta, para proteção mecânica e contra calor.",
    aplicacao: "Amarração de carga e manuseio de peça áspera.",
    img: "assets/produtos/luvas-raspa-vaqueta.jpg"
  },
  {
    id: 31, nome: "Luvas PVC (27, 35 e 45 cm)", categoria: "epis", slug: "luvas-pvc",
    descricao: "PVC em três comprimentos de punho: 27, 35 e 45 cm.",
    aplicacao: "Contato com ácido, solvente e produto corrosivo.",
    img: "assets/produtos/luvas-pvc.jpg"
  },
  {
    id: 32, nome: "Bota de PVC", categoria: "epis", slug: "bota-pvc",
    descricao: "Impermeável, cano alto, solado antiderrapante.",
    aplicacao: "Área alagada por produto derramado.",
    img: "assets/produtos/bota-pvc.jpg"
  },
  {
    id: 33, nome: "Kit Cargas Perigosas", categoria: "kits-protecao", slug: "kit-cargas-perigosas",
    descricao: "O kit completo, montado aqui, dentro das normas do CONTRAN e da ABNT.",
    aplicacao: "Composição conforme a classe de risco do produto transportado.",
    detalhe: "A composição não é uma só: muda conforme a classe de risco. Traga o número ONU e o perfil da frota que a gente monta a lista e confere item por item antes de fechar a bolsa.",
    img: "assets/produtos/kit-cargas-perigosas.jpg"
  },
  {
    id: 34, nome: "Kit de Ferramentas", categoria: "kits-protecao", slug: "kit-ferramentas",
    descricao: "Ferramentas para o atendimento na via.",
    aplicacao: "Reparo simples e contenção até chegar o socorro.",
    img: "assets/produtos/kit-ferramentas.jpg"
  }
];

/* --------------------------------------------------------------------------
   AUXILIARES
   -------------------------------------------------------------------------- */

/* Dados da categoria pelo slug. */
function categoriaPorSlug(slug) {
  for (var i = 0; i < CATEGORIAS.length; i++) {
    if (CATEGORIAS[i].slug === slug) return CATEGORIAS[i];
  }
  return { slug: slug, nome: slug, cor: "#0F3B3F" };
}

/* Texto sem acento e em minúsculas, para a busca não ser acento-sensível:
   digitar "calco" precisa encontrar "Par de Calço de Borracha". */
function normalizarTexto(texto) {
  return String(texto)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

/* Iniciais do produto, para o placeholder (no máximo duas letras). */
function iniciaisDe(nome) {
  var palavras = String(nome)
    .replace(/[()]/g, " ")
    .split(/\s+/)
    .filter(function (p) { return p.length > 2; });

  if (!palavras.length) return "BK";
  if (palavras.length === 1) return palavras[0].slice(0, 2).toUpperCase();
  return (palavras[0][0] + palavras[1][0]).toUpperCase();
}

/* Imagem de reserva, usada pelo onerror do card caso a foto não carregue.
   Devolve um data-URI SVG com a cor da categoria, um losango de risco e as
   iniciais do produto, e assim o grid nunca fica com buraco.

   Precisa ser percent-encoded: btoa quebraria com acento, e o "#" das cores
   hexadecimais cortaria o data-URI silenciosamente. */
function placeholderProduto(nome, categoria) {
  var cor = categoriaPorSlug(categoria).cor;
  var iniciais = iniciaisDe(nome);

  var svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">' +
      '<rect width="400" height="400" fill="' + cor + '"/>' +
      '<g stroke="#ffffff" stroke-opacity=".14" fill="none" stroke-width="2">' +
        '<rect x="112" y="112" width="176" height="176" transform="rotate(45 200 200)"/>' +
        '<rect x="148" y="148" width="104" height="104" transform="rotate(45 200 200)"/>' +
      '</g>' +
      '<text x="200" y="200" fill="#ffffff" fill-opacity=".82" font-family="Arial, Helvetica, sans-serif" ' +
        'font-size="86" font-weight="bold" text-anchor="middle" dominant-baseline="central">' + iniciais + '</text>' +
      '<rect x="0" y="384" width="400" height="16" fill="#FFC300"/>' +
      '<g fill="#101617">' +
        '<rect x="0" y="384" width="20" height="16"/><rect x="40" y="384" width="20" height="16"/>' +
        '<rect x="80" y="384" width="20" height="16"/><rect x="120" y="384" width="20" height="16"/>' +
        '<rect x="160" y="384" width="20" height="16"/><rect x="200" y="384" width="20" height="16"/>' +
        '<rect x="240" y="384" width="20" height="16"/><rect x="280" y="384" width="20" height="16"/>' +
        '<rect x="320" y="384" width="20" height="16"/><rect x="360" y="384" width="20" height="16"/>' +
      '</g>' +
    '</svg>';

  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

/* Link de WhatsApp com a mensagem já preenchida para um produto. */
function linkOrcamento(nomeProduto) {
  var texto = "Olá! Tenho interesse no produto: " + nomeProduto +
              ". Poderia me enviar um orçamento?";
  return "https://wa.me/" + WHATSAPP_BRASKIT + "?text=" + encodeURIComponent(texto);
}

/* --------------------------------------------------------------------------
   KIT MÍNIMO OBRIGATÓRIO
   Itens que entram marcados no orçamento assim que a pessoa abre o catálogo
   e que ela não consegue desmarcar. A regra inteira mora nesta lista: para
   trocar a composição, mexa só aqui (id conforme PRODUTOS, acima).

   ATENÇÃO, PENDÊNCIA COM A BRASKIT: a composição abaixo é uma sugestão
   técnica, montada a partir do que a fiscalização mais cobra (extintor e
   cones pela NBR 9735, calço de roda pelo CONTRAN). Confirme com a empresa
   qual é o kit mínimo real. A quantidade inicial também é editável: a NBR
   9735 pede quatro dispositivos de sinalização, por exemplo, então "qtd: 4"
   no cone é uma troca de um caractere.
   -------------------------------------------------------------------------- */
var KIT_MINIMO = [
  { id: 25, qtd: 1 },  /* Extintor ABC */
  { id: 20, qtd: 1 },  /* Cone Flexível com Faixa (NBR 15071) */
  { id: 26, qtd: 1 }   /* Par de Calço de Borracha */
];

/* Número da loja, usado por todos os links de WhatsApp montados no JS. */
var WHATSAPP_BRASKIT = "5551993011327";

/* --------------------------------------------------------------------------
   AUXILIARES DO ORÇAMENTO
   -------------------------------------------------------------------------- */

/* Produto pelo id, ou null se o id não existir mais no catálogo. */
function produtoPorId(id) {
  for (var i = 0; i < PRODUTOS.length; i++) {
    if (PRODUTOS[i].id === id) return PRODUTOS[i];
  }
  return null;
}

/* O item faz parte do kit mínimo? */
function ehItemObrigatorio(id) {
  for (var i = 0; i < KIT_MINIMO.length; i++) {
    if (KIT_MINIMO[i].id === id) return true;
  }
  return false;
}

/* Texto seguro para entrar em HTML montado com string (nome de produto com
   aspas ou "&" não pode quebrar o atributo). */
function escaparHtml(texto) {
  return String(texto)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* Liga a imagem de reserva em todas as fotos de produto dentro de um trecho
   do DOM. Vale para o grid, para a bandeja e para a janela do orçamento:
   qualquer <img> com data-nome e data-cat cai no placeholder da categoria se
   a foto não carregar. */
/* Monta o <picture> de uma foto de produto: avif, depois webp, e o jpg
   original como ultimo degrau antes do placeholder desenhado.

   As versoes modernas seguem o nome do arquivo original, entao nao ha dado
   novo em PRODUTOS: assets/produtos/extintor-abc.jpg vira
   assets/produtos/extintor-abc-400.avif e -720.avif. Se o pipeline de imagem
   nao tiver rodado, os <source> falham e o <img> jpg assume. */
function fontesProduto(caminhoJpg, tamanhos) {
  var base = caminhoJpg.replace(/.jpg$/, "");
  var html = "";
  ["avif", "webp"].forEach(function (tipo) {
    html += '<source type="image/' + tipo + '" sizes="' + tamanhos + '" srcset="' +
            base + "-400." + tipo + " 400w, " + base + "-720." + tipo + ' 720w">';
  });
  return html;
}

function protegerFotos(raiz) {
  Array.prototype.forEach.call(raiz.querySelectorAll("img[data-nome][data-cat]"), function (img) {
    if (img.dataset.protegida === "1") return;
    img.dataset.protegida = "1";

    img.addEventListener("error", function () {
      if (img.dataset.reserva === "1") return;
      img.dataset.reserva = "1";

      /* Dentro de um <picture>, o <source> vence o src: sem remove-los o
         placeholder nunca apareceria e a foto quebrada viraria caixa vazia.
         E o mesmo cuidado que reservaDeAmbiente() ja toma em js/main.js. */
      var caixa = img.parentElement;
      if (caixa && caixa.tagName === "PICTURE") {
        Array.prototype.forEach.call(caixa.querySelectorAll("source"), function (fonte) {
          caixa.removeChild(fonte);
        });
      }
      img.removeAttribute("srcset");
      img.src = placeholderProduto(img.getAttribute("data-nome"), img.getAttribute("data-cat"));
    });
  });
}

/* Link de WhatsApp com a lista inteira do orçamento já escrita na mensagem.
   Recebe o que Orcamento.lista() devolve: [{ produto, qtd, obrigatorio }].
   O kit mínimo vai separado do resto para a Braskit ler de bate-pronto o que
   é obrigatório e o que a pessoa escolheu por conta. */
function linkOrcamentoLista(registros) {
  var obrigatorios = [];
  var escolhidos = [];
  var unidades = 0;

  registros.forEach(function (registro) {
    var linha = registro.qtd + "x " + registro.produto.nome;
    unidades += registro.qtd;
    (registro.obrigatorio ? obrigatorios : escolhidos).push(linha);
  });

  var linhas = ["Olá! Montei a minha lista no site e gostaria de um orçamento.", ""];

  if (obrigatorios.length) {
    linhas.push("*Kit mínimo obrigatório*");
    linhas = linhas.concat(obrigatorios, "");
  }
  if (escolhidos.length) {
    linhas.push("*Outros itens que escolhi*");
    linhas = linhas.concat(escolhidos, "");
  }

  var total = registros.length + (registros.length === 1 ? " item" : " itens");
  if (unidades !== registros.length) total += ", " + unidades + " unidades no total";
  linhas.push(total + ".");

  return "https://wa.me/" + WHATSAPP_BRASKIT + "?text=" + encodeURIComponent(linhas.join("\n"));
}
