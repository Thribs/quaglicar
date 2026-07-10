// Medição de visitas e de intenção de orçamento da Quaglicar.
//
// Objetivo: além das visitas de página (medidas pelo script do Vercel Web
// Analytics), registrar cada clique num botão que abre o WhatsApp como um evento
// nomeado — é o sinal mais próximo de "pedido de orçamento" que o site consegue
// observar. A venda em si é fechada dentro do WhatsApp e não é visível aqui.
//
// Este arquivo é servido do próprio domínio, então passa na CSP estrita
// (script-src 'self') sem precisar afrouxar nada.

// Fila provisória do Vercel Web Analytics. Enfileira um evento (tipo + dados)
// para o script de coleta (/_vercel/insights/script.js) processar assim que
// carregar. Os parâmetros são nomeados e explícitos — não dependemos do objeto
// implícito `arguments`, e a fila é criada por cláusula de guarda em vez do
// operador OR.
function enfileirarEventoDeAnalise(tipoDeEvento, dadosDoEvento) {
  if (!window.vaq) {
    window.vaq = [];
  }
  window.vaq.push([tipoDeEvento, dadosDoEvento]);
}

// Só instala a fila provisória se o Vercel ainda não tiver colocado a função
// real de coleta no lugar (guarda em vez do operador OR).
if (!window.va) {
  window.va = enfileirarEventoDeAnalise;
}

// Registra um clique num botão de orçamento (que abre o WhatsApp).
function registrarCliqueDeOrcamento() {
  window.va("event", {
    name: "clicou-orcamento",
    pagina: window.location.pathname
  });
}

// Liga o rastreio a todos os links que abrem o WhatsApp, cobrindo tanto o
// formato curto (wa.me/<numero>) quanto o formato completo de envio
// (api.whatsapp.com/send e web.whatsapp.com/send). Em páginas sem esses links,
// o laço simplesmente não faz nada.
function ligarRastreioDosBotoesDeOrcamento() {
  var botoesDeOrcamento = document.querySelectorAll('a[href*="wa.me/"], a[href*="whatsapp.com/send"]');
  var indice = 0;
  for (indice = 0; indice < botoesDeOrcamento.length; indice = indice + 1) {
    botoesDeOrcamento[indice].addEventListener("click", registrarCliqueDeOrcamento);
  }
}

// Com o atributo defer o DOM já está pronto quando este arquivo roda; ainda
// assim protegemos contra o caso de ainda estar carregando.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ligarRastreioDosBotoesDeOrcamento);
} else {
  ligarRastreioDosBotoesDeOrcamento();
}
