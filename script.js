// ==========================================================
// CONTROLE SIMPLES NACIONAL - SCRIPT PRINCIPAL
// ==========================================================

const APPS_SCRIPT_URL = CONFIG.APPS_SCRIPT_URL;

let mesAtual = null;
let categoriaAtual = null;
let mesesDisponiveis = [];
let headersAtuais = [];
let linhasAtuais = [];

// ---------------------------------------------------------
// LOGIN
// ---------------------------------------------------------

function verificarLogin() {
  const logado = sessionStorage.getItem("logado");
  if (logado === "true") {
    document.getElementById("tela-login").style.display = "none";
    document.getElementById("app").style.display = "block";
    iniciarApp();
  } else {
    document.getElementById("tela-login").style.display = "flex";
    document.getElementById("app").style.display = "none";
  }
}

function fazerLogin() {
  const senha = document.getElementById("input-senha").value;
  const erroLogin = document.getElementById("erro-login");

  if (senha === CONFIG.SENHA_ACESSO) {
    sessionStorage.setItem("logado", "true");
    erroLogin.style.display = "none";
    verificarLogin();
  } else {
    erroLogin.style.display = "block";
  }
}

function sair() {
  sessionStorage.removeItem("logado");
  verificarLogin();
}

// ---------------------------------------------------------
// CHAMADAS AO APPS SCRIPT
// ---------------------------------------------------------

function chamarBackend(acao, extras) {
  const corpo = Object.assign({ acao: acao }, extras || {});

  return fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(corpo)
  })
    .then(function (resposta) { return resposta.json(); })
    .then(function (json) {
      if (!json.ok) {
        throw new Error(json.erro || "Erro desconhecido no servidor.");
      }
      return json.dados;
    });
}

// ---------------------------------------------------------
// INICIALIZAÇÃO DO APP
// ---------------------------------------------------------

function iniciarApp() {
  document.getElementById("logo-empresa").src = "https://chrysx6.github.io/LinksAguiaContab/links/img/logo1.jpg";
  document.getElementById("btn-abrir-planilha").href = CONFIG.SPREADSHEET_URL;

  carregarMeses();
  montarAbasCategorias();
}

function carregarMeses() {
  chamarBackend("listarMeses")
    .then(function (meses) {
      if (!meses || meses.length === 0) {
        meses = [CONFIG.MES_PADRAO];
      }
      mesesDisponiveis = meses;
      montarBotoesMeses();

      if (mesesDisponiveis.indexOf(CONFIG.MES_PADRAO) > -1) {
        selecionarMes(CONFIG.MES_PADRAO);
      } else {
        selecionarMes(mesesDisponiveis[0]);
      }
    })
    .catch(function (erro) {
      console.error("Erro ao carregar meses:", erro);
      mesesDisponiveis = [CONFIG.MES_PADRAO];
      montarBotoesMeses();
      selecionarMes(CONFIG.MES_PADRAO);
    });
}

function montarBotoesMeses() {
  const container = document.getElementById("botoes-meses");
  container.innerHTML = "";

  mesesDisponiveis.forEach(function (mes) {
    const btn = document.createElement("button");
    btn.className = "btn-mes" + (mes === mesAtual ? " ativo" : "");
    btn.textContent = mes.charAt(0) + mes.slice(1).toLowerCase();
    btn.onclick = function () { selecionarMes(mes); };
    container.appendChild(btn);
  });
}

function selecionarMes(mes) {
  mesAtual = mes;
  montarBotoesMeses();

  if (!categoriaAtual) {
    categoriaAtual = CONFIG.CATEGORIAS[0].sufixo;
  }
  montarAbasCategorias();
  carregarDados();
}

function montarAbasCategorias() {
  const container = document.getElementById("abas-categorias");
  container.innerHTML = "";

  CONFIG.CATEGORIAS.forEach(function (cat) {
    const btn = document.createElement("button");
    btn.className = "btn-categoria" + (cat.sufixo === categoriaAtual ? " ativo" : "");
    btn.textContent = cat.nome;
    btn.onclick = function () {
      categoriaAtual = cat.sufixo;
      montarAbasCategorias();
      carregarDados();
    };
    container.appendChild(btn);
  });
}

// ---------------------------------------------------------
// CARREGAR E RENDERIZAR DADOS DA TABELA
// ---------------------------------------------------------

function nomeAbaAtual() {
  return mesAtual + "_" + categoriaAtual;
}

function carregarDados() {
  const container = document.getElementById("tabela-container");
  container.innerHTML = "<p class='carregando'>Carregando...</p>";

  chamarBackend("getDados", { aba: nomeAbaAtual() })
    .then(function (dados) {
      headersAtuais = dados.headers || [];
      linhasAtuais = dados.linhas || [];
      renderizarTabela();
      renderizarDashboard();
    })
    .catch(function (erro) {
      container.innerHTML = "<p class='erro-msg'>Erro ao carregar dados: " + erro.message + "</p>";
      const dash = document.getElementById("dashboard-container");
      if (dash) dash.innerHTML = "";
    });
}

// ---------------------------------------------------------
// DETECÇÃO DE COLUNAS DE TEXTO x STATUS (3 ESTADOS)
// ---------------------------------------------------------

const PALAVRAS_TEXTO = [
  "empresa", "anexo", "observ", "total de empresas", "feita", "feito",
  "enviada", "enviado", "valor emitido", "cnpj", "endereco", "telefone",
  "celular", "contato", "responsavel"
];

function normalizar(texto) {
  return String(texto || "").toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function headerEhTexto(colIndex) {
  const h = normalizar(headersAtuais[colIndex]);
  return PALAVRAS_TEXTO.some(function (p) { return h.indexOf(p) > -1; });
}

function colunaEhBinaria(colIndex) {
  return !headerEhTexto(colIndex);
}

function normalizarValorStatus(valorStr, valorNormalizado) {
  if (valorNormalizado === "sim" || valorStr === "1") return "Sim";
  if (valorNormalizado === "nao" || valorStr === "0") return "Não";
  if (valorNormalizado === "n/a" || valorNormalizado === "na" || valorNormalizado === "n.a" || valorNormalizado === "n.a.") return "N/A";
  return "";
}

function classeStatus(valor) {
  if (valor === "Sim") return "sim";
  if (valor === "Não") return "nao";
  if (valor === "N/A") return "na";
  return "vazio";
}

function renderizarTabela() {
  const container = document.getElementById("tabela-container");

  if (!headersAtuais || headersAtuais.length === 0) {
    container.innerHTML = "<p class='erro-msg'>Esta aba está vazia ou não foi encontrada.</p>";
    return;
  }

  let html = "<table class='tabela-dados'><thead><tr>";
  headersAtuais.forEach(function (h) {
    html += "<th>" + (h || "") + "</th>";
  });
  html += "<th>Ações</th></tr></thead><tbody>";

  if (linhasAtuais.length === 0) {
    html += "<tr><td colspan='" + (headersAtuais.length + 1) + "' class='vazio'>Nenhuma empresa cadastrada nesta aba.</td></tr>";
  }

  linhasAtuais.forEach(function (linhaObj) {
    html += "<tr data-linha='" + linhaObj.linha + "'>";
    linhaObj.valores.forEach(function (valor, colIndex) {
      const valorStr = (valor === null || valor === undefined) ? "" : String(valor).trim();
      const valorNormalizado = normalizar(valorStr);
      const colunaBinaria = colunaEhBinaria(colIndex);

      if (colunaBinaria) {
        const valorAtual = normalizarValorStatus(valorStr, valorNormalizado);

        html += "<td class='celula-status' data-col='" + colIndex + "'>" +
          "<select class='select-status status-" + classeStatus(valorAtual) + "' " +
          "onchange=\"this.className='select-status status-' + classeStatus(this.value); editarCelula(" + linhaObj.linha + ", " + colIndex + ", this.value); marcarSalvo(this);\">" +
          "<option value=''" + (valorAtual === "" ? " selected" : "") + ">-</option>" +
          "<option value='Sim'" + (valorAtual === "Sim" ? " selected" : "") + ">Sim</option>" +
          "<option value='Não'" + (valorAtual === "Não" ? " selected" : "") + ">Não</option>" +
          "<option value='N/A'" + (valorAtual === "N/A" ? " selected" : "") + ">N/A</option>" +
          "</select></td>";
      } else {
        html += "<td><input type='text' class='campo-texto' value=\"" + escaparHtml(valorStr) + "\" " +
          "onblur=\"editarCelula(" + linhaObj.linha + ", " + colIndex + ", this.value); marcarSalvo(this);\"></td>";
      }
    });

    html += "<td class='acoes'><button class='btn-remover' onclick=\"removerEmpresa(" + linhaObj.linha + ")\">🗑️</button></td>";
    html += "</tr>";
  });

  html += "</tbody></table>";
  container.innerHTML = html;
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

function marcarSalvo(elemento) {
  const celula = elemento.closest("td");
  if (!celula) return;
  celula.classList.add("celula-salva");
  setTimeout(function () { celula.classList.remove("celula-salva"); }, 900);
}

// ---------------------------------------------------------
// DASHBOARD DE INDICADORES
// ---------------------------------------------------------

function renderizarDashboard() {
  const container = document.getElementById("dashboard-container");
  if (!container) return;

  if (!headersAtuais || headersAtuais.length === 0 || linhasAtuais.length === 0) {
    container.innerHTML = "";
    return;
  }

  let html = "<div class='dashboard-cards'>";
  let algumCard = false;

  headersAtuais.forEach(function (header, colIndex) {
    if (!colunaEhBinaria(colIndex)) return;

    let totalSim = 0, totalNao = 0, totalNA = 0;

    linhasAtuais.forEach(function (linhaObj) {
      const valor = linhaObj.valores[colIndex];
      const valorStr = (valor === null || valor === undefined) ? "" : String(valor).trim();
      const valorNormalizado = normalizar(valorStr);
      const valorPadrao = normalizarValorStatus(valorStr, valorNormalizado);

      if (valorPadrao === "Sim") totalSim++;
      else if (valorPadrao === "Não") totalNao++;
      else if (valorPadrao === "N/A") totalNA++;
    });

    const totalConsiderado = totalSim + totalNao;
    if (totalConsiderado === 0) return;

    const percentual = Math.round((totalSim / totalConsiderado) * 100);
    let corBarra = "#c0392b";
    if (percentual >= 40) corBarra = "#e6a817";
    if (percentual >= 80) corBarra = "#2e7d32";

    algumCard = true;
    html += "<div class='card-indicador'>" +
      "<div class='card-titulo'>" + (header || "") + "</div>" +
      "<div class='card-numeros'>" + totalSim + " / " + totalConsiderado +
      (totalNA > 0 ? " <span class='card-na'>(" + totalNA + " N/A)</span>" : "") + "</div>" +
      "<div class='barra-progresso'><div class='barra-preenchida' style='width:" + percentual + "%; background:" + corBarra + ";'></div></div>" +
      "<div class='card-percentual'>" + percentual + "%</div>" +
      "</div>";
  });

  html += "</div>";
  container.innerHTML = algumCard ? html : "";
}

// ---------------------------------------------------------
// EDITAR / ADICIONAR / REMOVER
// ---------------------------------------------------------

function editarCelula(linha, coluna, valor) {
  mostrarStatusSalvando("Salvando...", null);

  chamarBackend("salvarCelula", {
    aba: nomeAbaAtual(),
    linha: linha,
    coluna: coluna,
    valor: valor
  })
    .then(function () {
      mostrarStatusSalvando("Salvo!", true);
      const linhaObj = linhasAtuais.find(function (l) { return l.linha === linha; });
      if (linhaObj) {
        linhaObj.valores[coluna] = valor;
        renderizarDashboard();
      }
    })
    .catch(function (erro) {
      mostrarStatusSalvando("Erro ao salvar: " + erro.message, false);
    });
}

function abrirModalAdicionar() {
  document.getElementById("modal-adicionar").style.display = "flex";
  const camposContainer = document.getElementById("campos-nova-empresa");
  camposContainer.innerHTML = "";

  headersAtuais.forEach(function (h, i) {
    camposContainer.innerHTML += "<label>" + (h || ("Coluna " + (i + 1))) +
      "</label><input type='text' id='novo-campo-" + i + "' class='campo-modal'>";
  });
}

function fecharModalAdicionar() {
  document.getElementById("modal-adicionar").style.display = "none";
}

function confirmarAdicionarEmpresa() {
  const dados = headersAtuais.map(function (h, i) {
    const el = document.getElementById("novo-campo-" + i);
    return el ? el.value : "";
  });

  chamarBackend("adicionarEmpresa", { aba: nomeAbaAtual(), dados: dados })
    .then(function () {
      fecharModalAdicionar();
      carregarDados();
    })
    .catch(function (erro) {
      alert("Erro ao adicionar empresa: " + erro.message);
    });
}

function removerEmpresa(linha) {
  if (!confirm("Tem certeza que deseja remover esta empresa?")) return;

  chamarBackend("removerEmpresa", { aba: nomeAbaAtual(), linha: linha })
    .then(function () { carregarDados(); })
    .catch(function (erro) { alert("Erro ao remover empresa: " + erro.message); });
}

// ---------------------------------------------------------
// CRIAR NOVO MÊS
// ---------------------------------------------------------

function abrirModalNovoMes() {
  document.getElementById("modal-novo-mes").style.display = "flex";
  document.getElementById("input-novo-mes").value = "";
}

function fecharModalNovoMes() {
  document.getElementById("modal-novo-mes").style.display = "none";
}

function confirmarNovoMes() {
  const nomeMes = document.getElementById("input-novo-mes").value.trim().toUpperCase();

  if (!nomeMes) {
    alert("Digite o nome do mês.");
    return;
  }

  chamarBackend("criarMes", { mes: nomeMes })
    .then(function (resultado) {
      fecharModalNovoMes();
      alert("Mês criado com sucesso: " + resultado.abas.join(", "));
      carregarMeses();
    })
    .catch(function (erro) {
      alert("Erro ao criar o novo mês: " + erro.message);
    });
}

// ---------------------------------------------------------
// DUPLICAR MÊS ANTERIOR
// ---------------------------------------------------------

function abrirModalDuplicarMes() {
  document.getElementById("modal-duplicar-mes").style.display = "flex";
  document.getElementById("input-mes-duplicado").value = "";

  const infoMesOrigem = document.getElementById("info-mes-origem");
  if (mesesDisponiveis && mesesDisponiveis.length > 0) {
    const mesOrigem = mesesDisponiveis[mesesDisponiveis.length - 1];
    infoMesOrigem.textContent = "As empresas serão copiadas de: " + mesOrigem.charAt(0) + mesOrigem.slice(1).toLowerCase();
  } else {
    infoMesOrigem.textContent = "Nenhum mês existente encontrado para duplicar.";
  }
}

function fecharModalDuplicarMes() {
  document.getElementById("modal-duplicar-mes").style.display = "none";
}

function confirmarDuplicarMes() {
  const nomeMes = document.getElementById("input-mes-duplicado").value.trim().toUpperCase();

  if (!nomeMes) {
    alert("Digite o nome do novo mês.");
    return;
  }

  if (!mesesDisponiveis || mesesDisponiveis.length === 0) {
    alert("Não há nenhum mês existente para duplicar.");
    return;
  }

  const mesOrigem = mesesDisponiveis[mesesDisponiveis.length - 1];

  chamarBackend("duplicarMes", { mesOrigem: mesOrigem, mesDestino: nomeMes })
    .then(function (resultado) {
      fecharModalDuplicarMes();
      alert("Mês duplicado com sucesso a partir de " + mesOrigem + ": " + resultado.abas.join(", "));
      carregarMeses();
    })
    .catch(function (erro) {
      alert("Erro ao duplicar o mês: " + erro.message);
    });
}

// ---------------------------------------------------------
// EXPORTAR (CSV/Excel e PDF)
// ---------------------------------------------------------

function toggleMenuExportar() {
  const menu = document.getElementById("menu-exportar");
  menu.style.display = menu.style.display === "block" ? "none" : "block";
}

function exportarCSV() {
  if (!headersAtuais || headersAtuais.length === 0) {
    alert("Não há dados para exportar.");
    return;
  }

  let conteudo = headersAtuais.join(";") + "\n";

  linhasAtuais.forEach(function (linhaObj) {
    const linhaFormatada = linhaObj.valores.map(function (valor, colIndex) {
      const valorStr = (valor === null || valor === undefined) ? "" : String(valor).trim();
      if (colunaEhBinaria(colIndex)) {
        const valorNormalizado = normalizar(valorStr);
        return normalizarValorStatus(valorStr, valorNormalizado) || "";
      }
      return valorStr.replace(/;/g, ",");
    });
    conteudo += linhaFormatada.join(";") + "\n";
  });

  const blob = new Blob(["\uFEFF" + conteudo], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nomeAbaAtual() + ".csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  document.getElementById("menu-exportar").style.display = "none";
}

function exportarPDF() {
  if (!headersAtuais || headersAtuais.length === 0) {
    alert("Não há dados para exportar.");
    return;
  }

  const catNome = CONFIG.CATEGORIAS.find(function (c) { return c.sufixo === categoriaAtual; });
  const dataGeracao = new Date().toLocaleString("pt-BR");

  let html = "<html><head><meta charset='UTF-8'><title>Relatório</title>";
  html += "<style>";
  html += "body{font-family:Arial, sans-serif; padding:20px;}";
  html += "h1{color:#0b1d3a; font-size:18px; margin-bottom:0;}";
  html += "p.info{color:#555; font-size:12px; margin-top:4px;}";
  html += "table{width:100%; border-collapse:collapse; margin-top:16px;}";
  html += "th{background:#0b1d3a; color:#fff; padding:6px; font-size:11px; text-align:left; border:1px solid #0b1d3a;}";
  html += "td{padding:6px; font-size:11px; border:1px solid #ccc;}";
  html += "</style></head><body>";
  html += "<h1>Controle Simples Nacional - " + mesAtual + " (" + (catNome ? catNome.nome : categoriaAtual) + ")</h1>";
  html += "<p class='info'>Gerado em: " + dataGeracao + "</p>";
  html += "<table><thead><tr>";
  headersAtuais.forEach(function (h) { html += "<th>" + (h || "") + "</th>"; });
  html += "</tr></thead><tbody>";

  linhasAtuais.forEach(function (linhaObj) {
    html += "<tr>";
    linhaObj.valores.forEach(function (valor, colIndex) {
      const valorStr = (valor === null || valor === undefined) ? "" : String(valor).trim();
      let exibir = valorStr;
      if (colunaEhBinaria(colIndex)) {
        const valorNormalizado = normalizar(valorStr);
        exibir = normalizarValorStatus(valorStr, valorNormalizado) || "-";
      }
      html += "<td>" + escaparHtml(exibir) + "</td>";
    });
    html += "</tr>";
  });

  html += "</tbody></table></body></html>";

  const janela = window.open("", "_blank");
  janela.document.write(html);
  janela.document.close();
  setTimeout(function () { janela.print(); }, 500);

  document.getElementById("menu-exportar").style.display = "none";
}

// ---------------------------------------------------------
// STATUS DE SALVAMENTO
// ---------------------------------------------------------

function mostrarStatusSalvando(texto, sucesso) {
  const status = document.getElementById("status-salvando");
  status.textContent = texto;
  status.className = sucesso === null ? "status-neutro" : (sucesso ? "status-sucesso" : "status-erro");
  status.style.display = "inline-block";

  if (sucesso !== null) {
    setTimeout(function () { status.style.display = "none"; }, 2500);
  }
}

document.addEventListener("click", function (e) {
  const menu = document.getElementById("menu-exportar");
  const btn = document.getElementById("btn-exportar");
  if (menu && btn && !menu.contains(e.target) && !btn.contains(e.target)) {
    menu.style.display = "none";
  }
});

// ---------------------------------------------------------
// START
// ---------------------------------------------------------

window.onload = verificarLogin;
