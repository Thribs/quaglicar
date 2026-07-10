if (typeof window === "undefined") {
  throw new Error(
    "parâmetro window ausente. Verifique se o programa está sendo executado em navegador de Internet",
  )
}

const vercelAnalytics = window.va ?? null

function enfileirarEvento(tipo, corpo) {
  if (typeof tipo !== "string") {
    throw new Error(
      "parâmetro tipo inválido. Verifique se o programa está sendo executado em navegador de Internet",
    )
  }
  if (typeof corpo !== "object") {
    throw new Error(
      "parâmetro corpo inválido. Verifique se o programa está sendo executado em navegador de Internet",
    )
  }
  if (Array.isArray(window.vaq) === false) {
    window.vaq = []
  }
  window.vaq.push([tipo, corpo])
}

if (typeof vercelAnalytics !== "function") {
  window.va = enfileirarEvento
}

function registrarEvento(evento) {
  const acao = evento?.currentTarget?.dataset?.acao ?? null
  if (acao === null) {
    throw new Error(
      "parâmetro acao ausente. Verifique se o programa está sendo executado em navegador de Internet",
    )
  }
  const caminho = window.location?.pathname ?? null
  if (caminho === null) {
    throw new Error(
      "parâmetro caminho ausente. Verifique se o programa está sendo executado em navegador de Internet",
    )
  }
  window.va("event", {
    name: "clique" + "-" + acao,
    caminho,
  })
}

if (typeof document === "undefined") {
  throw new Error(
    "parâmetro document ausente. Verifique se o programa está sendo executado em navegador de Internet",
  )
}

function ligarRastreioDosEventos() {
  const botoesEvento = document.querySelectorAll("[data-acao]")
  for (let indice = 0; indice < botoesEvento.length; indice++) {
    botoesEvento[indice].addEventListener("click", registrarEvento)
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ligarRastreioDosEventos)
} else {
  ligarRastreioDosEventos()
}
