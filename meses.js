// ==========================================================
// CONFIGURAÇÃO CENTRAL DO SISTEMA - CONTROLE SIMPLES NACIONAL
// ==========================================================
// Edite apenas os valores abaixo quando precisar atualizar algo.
// Não é necessário mexer no script.js.

const CONFIG = {
  // Senha de acesso ao site
  SENHA_ACESSO: "Aguia2025@",

  // Link direto para abrir a planilha no Google Sheets
  SPREADSHEET_URL: "https://docs.google.com/spreadsheets/d/1GAlQCwr5Ru95rb8Qc0E_S-ieppfBhswXP14tiraUjN4/edit?gid=0#gid=0",

  // ID da planilha (extraído do link acima)
  SPREADSHEET_ID: "1GAlQCwr5Ru95rb8Qc0E_S-ieppfBhswXP14tiraUjN4",

  // URL do Web App do Apps Script (termina em /exec)
  APPS_SCRIPT_URL: "https://script.google.com/macros/s/AKfycbyHKEZUL-5ovPpeW3iWAsZNrGwAnk1tZeX7E6WT_AXXjFHr6hAooAYb0Bx3eciJcRMT/exec",

  // Mês que abre por padrão ao entrar no site
  MES_PADRAO: "AGOSTO",

  // Categorias (abas) dentro de cada mês - NÃO ALTERAR os "sufixo"
  // pois eles precisam bater com o nome das abas na planilha (MES_SUFIXO)
  CATEGORIAS: [
    { nome: "Serviço", sufixo: "SERV" },
    { nome: "Comércio", sufixo: "COM" },
    { nome: "MEI", sufixo: "MEI" },
    { nome: "Sem Movimento", sufixo: "SEMMOV" }
  ]
};
