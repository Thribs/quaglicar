// Chamada periódica que mantém o projeto Supabase do CONTROLE-CHAVEIRO ativo —
// evita a pausa por inatividade do plano gratuito.
//
// Contexto: cada cliente do controle-chaveiro roda num projeto Supabase gratuito,
// pausado após 7 dias sem atividade NO BANCO. Ao pausar, o app fica "sem conexão"
// e o cliente pensa que precisa reativar. Esta função faz uma leitura leve no banco
// de cada alvo — atividade que reinicia o contador de 7 dias. É disparada uma vez
// por dia pelo agendamento da Vercel (ver "crons" no vercel.json).
//
// Observação: previne a pausa; não ressuscita um projeto já pausado (esse exige
// "Restore" manual no painel do Supabase).
//
// Estilo (manifesto da casa): sem try/catch e sem arrow functions. Funções nomeadas
// com corpo explícito, cláusulas de guarda, erro tratado como valor.
//
// Variáveis de ambiente (definidas na Vercel):
//   SUPABASE_ALVOS  um alvo por LINHA, campos separados por espaço:
//                     nome url chave [tabela]
//                   (De propósito NÃO é JSON: assim o parsing é por cláusula de
//                    guarda, sem JSON.parse — que exigiria try/catch.)
//   SUPABASE_URL + SUPABASE_CHAVE   alternativa para um único alvo.
//   CRON_SECRET  segredo que o agendamento da Vercel envia como
//                "Authorization: Bearer <valor>" (nome fixado pela plataforma).
//                Se definido, a função só responde a quem apresentar o segredo.

const TABELA_PADRAO = "funcionarios"

// Lê a lista de alvos das variáveis de ambiente. Retorna { alvos, erro }.
function lerAlvos() {
  const listaBruta = process.env.SUPABASE_ALVOS
  if (listaBruta && listaBruta.trim().length > 0) {
    return lerAlvosDaLista(listaBruta)
  }
  return lerAlvoUnico()
}

// Interpreta o formato multi-linha de SUPABASE_ALVOS, linha a linha.
function lerAlvosDaLista(listaBruta) {
  const linhas = listaBruta.split("\n")
  const alvos = []
  let indice = 0
  while (indice < linhas.length) {
    const linha = linhas[indice].trim()
    indice = indice + 1
    if (linha.length === 0) {
      continue
    }
    const interpretacao = interpretarLinhaDeAlvo(linha)
    if (interpretacao.erro) {
      return { alvos: null, erro: interpretacao.erro }
    }
    alvos.push(interpretacao.alvo)
  }
  if (alvos.length === 0) {
    return { alvos: null, erro: "SUPABASE_ALVOS não tem nenhum alvo válido" }
  }
  return { alvos: alvos, erro: null }
}

// Converte uma linha "nome url chave [tabela]" num alvo. Erro como valor.
function interpretarLinhaDeAlvo(linha) {
  const campos = linha.split(/\s+/)
  if (campos.length < 3) {
    return { alvo: null, erro: "alvo inválido (esperado: nome url chave [tabela]): " + linha }
  }
  const alvo = {
    nome: campos[0],
    url: campos[1],
    chave: campos[2],
    tabela: campos[3] || TABELA_PADRAO,
  }
  return { alvo: alvo, erro: null }
}

// Alvo único como alternativa à lista.
function lerAlvoUnico() {
  const url = process.env.SUPABASE_URL
  const chave = process.env.SUPABASE_CHAVE
  if (!url || !chave) {
    return { alvos: null, erro: "nenhum alvo configurado: defina SUPABASE_ALVOS ou SUPABASE_URL + SUPABASE_CHAVE" }
  }
  const alvo = { nome: "principal", url: url, chave: chave, tabela: TABELA_PADRAO }
  return { alvos: [alvo], erro: null }
}

// Faz uma leitura leve num alvo. Sempre resolve com um resultado descritivo —
// nunca rejeita — para que a falha de um alvo não derrube os demais.
function verificarAlvo(alvo) {
  const urlBase = alvo.url.replace(/\/+$/, "")
  const enderecoConsulta = urlBase + "/rest/v1/" + alvo.tabela + "?select=id&limit=1"
  const requisicao = {
    method: "GET",
    headers: {
      apikey: alvo.chave,
      Authorization: "Bearer " + alvo.chave,
    },
  }
  function descreverResposta(resposta) {
    return { nome: alvo.nome, ok: resposta.ok, status: resposta.status }
  }
  function descreverFalha(falha) {
    return { nome: alvo.nome, ok: false, detalhe: falha.message }
  }
  return fetch(enderecoConsulta, requisicao).then(descreverResposta, descreverFalha)
}

// Registra um resultado nos logs da função, sem expor a chave.
function registrarResultado(resultado) {
  console.log("manter-controle-chaveiro-ativo " + resultado.nome + ":", JSON.stringify(resultado))
}

function alvoRespondeuOk(resultado) {
  return resultado.ok === true
}

// Confere o segredo do agendamento (se configurado). Cláusula de guarda.
function requisicaoAutorizada(req) {
  const segredo = process.env.CRON_SECRET
  if (!segredo) {
    return true
  }
  const cabecalho = req.headers["authorization"] || ""
  return cabecalho === "Bearer " + segredo
}

module.exports = function manterControleChaveiroAtivo(req, res) {
  if (!requisicaoAutorizada(req)) {
    res.status(401).json({ ok: false, erro: "não autorizado" })
    return undefined
  }
  const config = lerAlvos()
  if (config.erro) {
    res.status(500).json({ ok: false, erro: config.erro })
    return undefined
  }
  function responderComResultados(resultados) {
    resultados.forEach(registrarResultado)
    const todosOk = resultados.every(alvoRespondeuOk)
    res.status(todosOk ? 200 : 500).json({
      ok: todosOk,
      momento: new Date().toISOString(),
      total: resultados.length,
      resultados: resultados,
    })
  }
  return Promise.all(config.alvos.map(verificarAlvo)).then(responderComResultados)
}
