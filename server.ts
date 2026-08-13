import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from 'exceljs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';


// --- Middlewares de Segurança ---

// 3. RATE LIMITING: 50 requisições a cada 15 minutos por IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50, 
  message: { error: 'Muitas requisições originadas deste IP, tente novamente mais tarde.' }
});

// --- Schemas de Validação (Zod) ---

const ExtractPdfSchema = z.object({
  pdfBase64: z.string().min(1, "PDF não enviado."),
  type: z.enum(['cnpj', 'recibo', 'admissional', 'trct', 'custom']).default('admissional'),
  globalVars: z.array(z.string()).optional(),
  collabVars: z.array(z.string()).optional()
});

const GerarReciboSchema = z.object({
  dadosEmpresa: z.object({
    mesAno: z.string().regex(/^\d{4}-\d{2}$/, "Formato inválido para mesAno. Esperado YYYY-MM."),
  }).passthrough(),
}).passthrough();

// async function startServer() { // Remover encapsulamento de startServer() completo
const app = express();
const PORT = process.env.PORT || 3000;

// Habilita a confiança no proxy (X-Forwarded-For) pois o app roda atrás do reverse proxy do Cloud Run.
// Isso resolve o aviso do express-rate-limit e garante que as requisições sejam bloqueadas pelo IP do usuário, não do proxy.
app.set('trust proxy', 1);

  // 6. HEADERS DE SEGURANÇA: Helmet para adicionar headers de proteção,
  // mas configurado para permitir a visualização do app via iframe no AI Studio.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: { action: 'sameorigin' } // PROTEÇÃO ATIVADA
  }));

  // 2. PROTEÇÃO CONTRA DoS: Limite do body para 5mb
  app.use(express.json({ limit: "5mb" })); // PDFs comuns não passam de 2-3MB
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  // Middleware de Autenticação de API Key Interna
  const requireApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientKey = req.headers['x-api-key'];
    const serverKey = process.env.API_SECRET_KEY; // Você deve criar essa variável na Vercel
    
    if (!serverKey) return next(); // Bypass se não estiver configurado (dev local)
    if (clientKey !== serverKey) {
      return res.status(401).json({ error: 'Acesso negado. Chave de API ausente ou inválida.' });
    }
    next();
  };

  // (Error handler moved after routes)

  // Aplica o Rate Limiting em todas as rotas de API
  app.use('/api/', apiLimiter);

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post('/api/extract-pdf', requireApiKey, async (req, res) => {
    try {
      // 5. VALIDAÇÃO DE DADOS: Valida o payload de entrada com Zod
      const parseResult = ExtractPdfSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.issues[0].message });
      }

      const { pdfBase64, type, globalVars = [], collabVars = [] } = parseResult.data;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Chave da API do Gemini não configurada no servidor (GEMINI_API_KEY).' });
      }
      const ai = new GoogleGenAI({ apiKey });
      
      // 4. MITIGAÇÃO DE PROMPT INJECTION: Instrução do sistema (System Prompt) blindada no backend
      let systemInstruction = "";
      if (type === 'cnpj') {
        systemInstruction = `Este é um Comprovante de Inscrição e de Situação Cadastral (Cartão CNPJ) emitido pela Receita Federal do Brasil.
Extraia os seguintes campos e retorne APENAS um JSON válido, sem markdown, sem explicação:
{
  "razaoSocial": "nome empresarial completo",
  "cnpj": "CNPJ formatado com pontos e traço, ex: XX.XXX.XXX/XXXX-XX",
  "logradouro": "nome da rua/avenida",
  "numero": "número do endereço",
  "complemento": "complemento se existir",
  "bairro": "bairro",
  "municipio": "cidade",
  "uf": "sigla do estado com 2 letras",
  "cep": "CEP formatado"
}
Se algum campo não existir, use string vazia. Retorne SOMENTE o JSON.`;
      } else if (type === 'recibo') {
        systemInstruction = `Este é um Recibo de Pagamento de Salário (Holerite/Contracheque) de um funcionário.
Extraia TODOS os dados e retorne APENAS um JSON válido, sem markdown, sem explicação, com esta estrutura exata:
{
  "empresa": {
    "nome": "razão social da empresa",
    "cnpj": "CNPJ formatado",
    "endereco": "endereço completo da empresa"
  },
  "funcionario": {
    "codigo": "código do funcionário (ex: 001)",
    "nome": "nome completo do funcionário",
    "funcao": "cargo/função"
  },
  "mesAno": "YYYY-MM (ex: 2026-03 para março de 2026)",
  "rubricas": [
    {
      "codigo": 1000,
      "descricao": "SALÁRIO MENSAL",
      "referencia": "30",
      "valor": 1500.00,
      "tipo": "provento"
    },
    {
      "codigo": 998,
      "descricao": "I.N.S.S.",
      "referencia": "8,01",
      "valor": 120.00,
      "tipo": "desconto"
    }
  ]
}

REGRAS IMPORTANTES:
- "tipo" deve ser "provento" para vencimentos/proventos e "desconto" para descontos.
- NÃO inclua nas rubricas os campos de INSS e IRRF (códigos 998 e 999), pois eles são calculados automaticamente pelo sistema. Inclua apenas as rubricas base (salário, horas extras, adicionais, vale transporte, etc).
- "codigo" da rubrica deve ser numérico.
- "valor" deve ser numérico (sem R$, sem pontos de milhar, usar ponto como decimal).
- Se não encontrar um campo, use string vazia ou array vazio.
Retorne SOMENTE o JSON.`;
      } else if (type === 'trct') {
        systemInstruction = `Extraia os dados deste TRCT para o seguinte esquema JSON estrito.
Retorne APENAS o objeto JSON. Se o campo não existir, use "".
{
  "cnpj": "CNPJ da empresa (formatado)",
  "razaoSocial": "Razão social ou nome da empresa",
  "enderecoEmpresa": "Endereço da empresa (Logradouro, número, complemento)",
  "bairroEmpresa": "Bairro da empresa",
  "municipioEmpresa": "Município da empresa",
  "ufEmpresa": "UF da empresa (sigla com 2 letras)",
  "cepEmpresa": "CEP da empresa (formatado)",
  "pis": "PIS/PASEP do trabalhador",
  "nome": "Nome completo do trabalhador",
  "enderecoTrabalhador": "Endereço do trabalhador",
  "bairroTrabalhador": "Bairro do trabalhador",
  "municipioTrabalhador": "Município do trabalhador",
  "ufTrabalhador": "UF do trabalhador (sigla com 2 letras)",
  "cepTrabalhador": "CEP do trabalhador",
  "ctps": "Número e série da CTPS",
  "cpf": "CPF do trabalhador (formatado)",
  "dataNascimento": "Data de nascimento (YYYY-MM-DD)",
  "nomeMae": "Nome da mãe do trabalhador",
  "tipoContrato": "Tipo de contrato",
  "causaAfastamento": "Causa do afastamento ou rescisão",
  "remuneracaoMesAnterior": 0.00,
  "dataAdmissao": "Data de admissão (YYYY-MM-DD)",
  "dataAvisoPrevio": "Data do aviso prévio (YYYY-MM-DD)",
  "dataAfastamento": "Data de afastamento/demissão (YYYY-MM-DD)",
  "codigoAfastamento": "Código de afastamento",
  "sindicato": "Nome do sindicato da categoria profissional",
  "cnpjSindicato": "CNPJ do sindicato"
}`;
      } else if (type === 'custom') {
        const globals = (globalVars || []).join(', ');
        const collabs = (collabVars || []).join(', ');
        systemInstruction = `Analise este documento em PDF. Extraia os dados solicitados e retorne APENAS um JSON válido (sem markdown, sem explicação).
Se houver mais de uma pessoa/colaborador no documento, retorne um ARRAY de objetos JSON, onde cada objeto contém os dados daquela pessoa (podendo repetir os dados globais/da empresa em cada objeto).
Se houver apenas uma pessoa, pode retornar um único objeto JSON ou um array de um elemento.

Preciso extrair valores para as seguintes variáveis/chaves:
Variáveis Globais da Empresa/Contrato:
${globals}

Variáveis Individuais do Colaborador:
${collabs}

MUITO IMPORTANTE: Use EXATAMENTE os nomes dessas chaves no JSON. Retorne apenas o JSON, nada mais.`;
      } else {
        systemInstruction = `Analise este relatório admissional em PDF. Extraia TODOS os dados que encontrar e retorne APENAS um JSON válido (sem markdown, sem explicação) com as chaves sendo o nome do campo em MAIÚSCULAS como apareceriam em um documento trabalhista brasileiro.
Use estas chaves padronizadas quando possível:
- "NOME DA EMPRESA"
- "CNPJ DA EMPRESA"
- "NOME DO COLABORADOR"
- "CPF DO COLABORADOR"
- "CARGO"
- "SALÁRIO"
- "DATA DE ADMISSÃO"
- "CIDADE/UF" (ATENÇÃO: Extraia a cidade e o estado (UF) obrigatoriamente do endereço do EMPREGADOR/EMPRESA. Não use a cidade de residência do colaborador/empregado. Exemplo: se o empregador tem endereço em RIO VERDE e o empregado reside em SAO SIMAO, o correto é "RIO VERDE - GO".)
- "DATA" (data do documento, formato DD/MM/AAAA)
- "ENDEREÇO DO COLABORADOR"
- "RG DO COLABORADOR"
- "PIS/PASEP"
- "CTPS"
- "ESTADO CIVIL"
- "DEPARTAMENTO"
- "HORÁRIO DE TRABALHO"
- "TIPO DE CONTRATO"
Se não encontrar um campo, simplesmente não inclua no JSON.
Retorne SOMENTE o JSON, sem nenhum texto adicional.`;
      }

      let extractedData = null;
      let lastError = null;
      let totalAttempts = 0;
      let successfulModel = '';

      const modelsToTry = ['gemini-3.5-flash', 'gemini-3.5-flash-lite'];
      for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        const currentModel = modelsToTry[attempt];
        totalAttempts = attempt + 1;
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    inlineData: {
                      mimeType: 'application/pdf',
                      data: pdfBase64,
                    },
                  }
                ],
              },
            ],
            config: {
              systemInstruction: systemInstruction,
              // ISSO ACELERA A RESPOSTA E GARANTE QUE NÃO VOLTE MARKDOWN:
              responseMimeType: "application/json",
            }
          });
          
          // Como usamos responseMimeType, o response.text já é 100% JSON validado.
          const text = response.text || '{}';
          extractedData = JSON.parse(text);
          successfulModel = currentModel;
          break; // Sucesso, sai do loop
        } catch (err: any) {
          console.log(`Tentativa ${attempt + 1} (modelo: ${currentModel}) falhou:`, err.message);
          lastError = err;
          // Se for a última tentativa, lança o erro para o catch externo
          if (attempt === modelsToTry.length - 1) throw lastError;
          // Espera antes de tentar o próximo modelo (backoff)
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        }
      }

      res.json({ data: extractedData, attempts: totalAttempts, modelUsed: successfulModel });
      
    } catch (error: any) {
      console.error('Erro ao extrair dados do PDF:', error);
      
      let errorMessage = 'Não foi possível extrair os dados do PDF.';
      if (error?.message?.includes('API key not valid') || error?.status === 'INVALID_ARGUMENT') {
        errorMessage = 'A chave da API do Gemini (GEMINI_API_KEY) configurada é inválida. Por favor, verifique a chave nas configurações do AI Studio (Settings > Secrets).';
      } else if (error?.status === 'UNAVAILABLE' || error?.status === 503 || error?.message?.includes('high demand') || error?.message?.includes('503')) {
        errorMessage = 'O serviço de inteligência artificial está temporariamente indisponível devido à alta demanda. Por favor, tente novamente em alguns instantes.';
      } else if (error?.message) {
        errorMessage = `Não foi possível extrair os dados: ${error.message}`;
      }
      
      res.status(422).json({ error: errorMessage });
    }
  });

  app.post('/api/gerar-recibo-sheets', async (req, res) => {
    try {
      // 5. VALIDAÇÃO DE DADOS: Protege contra crash na manipulação de strings (ex: erro no split() se mesAno faltar)
      const parseResult = GerarReciboSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.issues[0].message });
      }

      const { dadosEmpresa, dadosFuncionario, rubricas, resultados } = req.body;
      
      // Helper para garantir que apenas a célula mestre de uma mesclagem receba o estilo,
      // prevenindo corrupção no arquivo OOXML gerado pelo exceljs.
      const getSafeCell = (sheet: ExcelJS.Worksheet, r: number, c: number | string) => {
        const cell = typeof c === 'number' ? sheet.getCell(r, c) : sheet.getCell(`${c}${r}`);
        return cell.isMerged ? cell.master : cell;
      };

      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Import Studio';
      // Cria a aba já configurada para impressão retrato na A4
      const sheet = workbook.addWorksheet('Recibo', {
        pageSetup: { paperSize: 9, orientation: 'portrait', fitToPage: true, fitToWidth: 1, fitToHeight: 1, margins: { left: 0.2, right: 0.2, top: 0.2, bottom: 0.2, header: 0, footer: 0 } }
      });

      // Ajuste das larguras das colunas para replicar o grid de 14 colunas
      sheet.columns = [
        { width: 12 }, { width: 30 }, { width: 12 }, { width: 12 },
        { width: 5 },  { width: 12 }, { width: 12 }, { width: 15 },
        { width: 15 }, { width: 15 }, { width: 5 },  { width: 5 },
        { width: 5 },  { width: 15 }
      ];

      const mesAnoFormatado = (() => {
        if (!dadosEmpresa.mesAno) return '';
        const [year, month] = dadosEmpresa.mesAno.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        const mStr = date.toLocaleString('pt-BR', { month: 'long' });
        const yStr = year.slice(2);
        return `${mStr}-${yStr}`.toUpperCase();
      })();

      const titulo = dadosEmpresa.tipoRecibo === 'salario' ? 'Recibo de Pagamento de Salário' : 'Recibo de Pagamento de Pró-labore';
      
      // Ajuste das larguras com a Coluna A vazia atuando como Margem (Shift +1)
      sheet.columns = [
        { width: 2 },  // A (Espaço em branco)
        { width: 12 }, // B (Cód - antigo A)
        { width: 6 },  // C (Desc start - antigo B)
        { width: 18 }, // D 
        { width: 9 },  // E 
        { width: 9 },  // F 
        { width: 7 },  // G 
        { width: 7 },  // H (Desc end)
        { width: 18 }, // I (Referência - antigo H)
        { width: 15 }, // J (Proventos - antigo I)
        { width: 6 },  // K (Descontos start - antigo J)
        { width: 6 },  // L 
        { width: 6 },  // M 
        { width: 7 },  // N (Descontos end)
        { width: 8 },  // O (Declaração)
        { width: 8 }   // P (Assinatura)
      ];

      // Adicionando a margem superior, começamos da linha 2
      let startRow = 2;

      for (let via = 1; via <= 2; via++) {
        const R = startRow;
        const rTitle = R;
        const rEmpNome = R+1;
        const rEmpEnd = R+2;
        const rEmpCnpj = R+3;
        const rFuncHead = R+4;
        const rFuncData = R+5;
        const rRubHead = R+6;
        const rRubStart = R+7;
        const MIN_RUBRICAS_ROWS = 12; // Garante o tamanho da via igual ao PDF
        const totalRubricas = Math.max(rubricas.length, MIN_RUBRICAS_ROWS);
        const rRubEnd = rRubStart + totalRubricas - 1; 
        const rMensagens = rRubEnd + 1;
        const rSum = rRubEnd + 2;
        const rLiquido = rRubEnd + 3;
        const rFootHead = rRubEnd + 4;
        const rFootData = rRubEnd + 5;
        const rViaId = rRubEnd + 6;

        // Configurar altura padrão
        for (let i = startRow; i <= rViaId; i++) {
          sheet.getRow(i).height = 14; 
        }
        sheet.getRow(rFuncData).height = 16; 
        sheet.getRow(rLiquido).height = 18;  

        // --- POPULANDO DADOS ---
        sheet.getCell(`B${rTitle}`).value = 'EMPREGADOR';
        
        // Título centralizado perfeitamente
        sheet.getCell(`E${rTitle}`).value = titulo;
        
        sheet.getCell(`K${rTitle}`).value = 'Referente ao Mês / Ano';
        
        sheet.getCell(`B${rEmpNome}`).value = 'Nome';
        sheet.getCell(`D${rEmpNome}`).value = dadosEmpresa.nome;

        sheet.getCell(`B${rEmpEnd}`).value = 'Endereço';
        sheet.getCell(`D${rEmpEnd}`).value = dadosEmpresa.endereco;
        
        sheet.getCell(`K${rEmpNome}`).value = mesAnoFormatado;

        sheet.getCell(`B${rEmpCnpj}`).value = 'CNPJ';
        sheet.getCell(`D${rEmpCnpj}`).value = dadosEmpresa.cnpj;

        sheet.getCell(`B${rFuncHead}`).value = 'CÓDIGO';
        sheet.getCell(`C${rFuncHead}`).value = 'NOME DO FUNCIONÁRIO';
        // Sem CBO
        sheet.getCell(`J${rFuncHead}`).value = 'FUNÇÃO';

        sheet.getCell(`B${rFuncData}`).value = String(dadosFuncionario.codigo || '1').padStart(3, '0');
        sheet.getCell(`C${rFuncData}`).value = dadosFuncionario.nome;
        sheet.getCell(`J${rFuncData}`).value = dadosFuncionario.funcao;

        sheet.getCell(`B${rRubHead}`).value = 'Cód.';
        sheet.getCell(`C${rRubHead}`).value = 'Descrição';
        sheet.getCell(`I${rRubHead}`).value = 'Referência';
        sheet.getCell(`J${rRubHead}`).value = 'Proventos';
        sheet.getCell(`K${rRubHead}`).value = 'Descontos';

        // Loop de Rubricas
        for (let idx = 0; idx < totalRubricas; idx++) {
          const rR = rRubStart + idx;
          if (idx < rubricas.length) {
            const r = rubricas[idx];
            sheet.getCell(`B${rR}`).value = r.codigo;
            sheet.getCell(`C${rR}`).value = r.descricao;
            sheet.getCell(`I${rR}`).value = r.referencia;
            if (r.tipo === 'provento' && r.valor > 0) sheet.getCell(`J${rR}`).value = r.valor;
            if (r.tipo === 'desconto' && r.valor > 0) sheet.getCell(`K${rR}`).value = r.valor;
          }
        }

        sheet.getCell(`B${rMensagens}`).value = 'MENSAGENS';
        sheet.getCell(`J${rMensagens}`).value = 'Total dos Vencimentos';
        sheet.getCell(`K${rMensagens}`).value = 'Total dos Descontos';

        sheet.getCell(`J${rSum}`).value = { formula: `SUM(J${rRubStart}:J${rRubEnd})` };
        sheet.getCell(`K${rSum}`).value = { formula: `SUM(K${rRubStart}:K${rRubEnd})` };

        sheet.getCell(`B${rLiquido}`).value = 'Líquido a Receber ➔';
        sheet.getCell(`K${rLiquido}`).value = { formula: `J${rSum}-K${rSum}` };

        sheet.getCell(`B${rFootHead}`).value = 'Salário Base';
        sheet.getCell(`D${rFootHead}`).value = 'Base Cálc. INSS';
        sheet.getCell(`E${rFootHead}`).value = 'Base Calc. FGTS';
        sheet.getCell(`G${rFootHead}`).value = 'FGTS do Mês';
        sheet.getCell(`I${rFootHead}`).value = 'Base Cálc. IRRF';
        sheet.getCell(`J${rFootHead}`).value = 'Faixa IRRF';

        sheet.getCell(`B${rFootData}`).value = resultados.salarioBase > 0 ? resultados.salarioBase : '';
        sheet.getCell(`D${rFootData}`).value = dadosEmpresa.calcularTributos ? resultados.baseINSS : '';
        sheet.getCell(`E${rFootData}`).value = (dadosEmpresa.calcularTributos && dadosEmpresa.tipoRecibo === 'salario') ? resultados.baseFGTS : '';
        sheet.getCell(`G${rFootData}`).value = (dadosEmpresa.calcularTributos && dadosEmpresa.tipoRecibo === 'salario') ? resultados.valorFGTS : '';
        sheet.getCell(`I${rFootData}`).value = dadosEmpresa.calcularTributos ? resultados.baseIRRF : '';
        sheet.getCell(`J${rFootData}`).value = dadosEmpresa.calcularTributos ? (resultados.faixaIRRF || 'Isento') : '';

        sheet.getCell(`B${rViaId}`).value = via === 1 ? '1ª VIA — EMPREGADOR' : '2ª VIA — EMPREGADO';

        // --- COLUNAS O e P (Declaração e Assinaturas) ---
        
        // 1. Mensagem de Declaração (Coluna O)
        const celDeclara = sheet.getCell(`O${rTitle}`);
        celDeclara.value = 'DECLARO TER RECEBIDO A IMPORTÂNCIA LÍQUIDA DISCRIMINADA NESTE RECIBO';
        celDeclara.font = { size: 8 };
        celDeclara.alignment = { textRotation: 90, wrapText: false, horizontal: 'left', vertical: 'bottom' };

        // 2. Assinatura do Funcionário (Coluna P topo)
        const celAssinatura = sheet.getCell(`P${rTitle}`);
        celAssinatura.value = 'ASSINATURA DO FUNCIONÁRIO';
        celAssinatura.font = { size: 8, bold: true };
        celAssinatura.alignment = { textRotation: 90, wrapText: false, horizontal: 'right', vertical: 'bottom' };

        // 3. Data (Coluna P base)
        const celData = sheet.getCell(`P${rSum}`);
        celData.value = 'DATA: ___/___/___';
        celData.font = { size: 8, bold: true };
        celData.alignment = { textRotation: 90, wrapText: false, horizontal: 'center', vertical: 'middle' };

        // --- ESTILOS E FONTES (NEGRITO/TAMANHO) ---
        sheet.getCell(`E${rTitle}`).font = { bold: true, size: 14 };
        sheet.getCell(`D${rEmpNome}`).font = { bold: true, size: 11 };
        sheet.getCell(`D${rEmpEnd}`).font = { bold: true };
        sheet.getCell(`D${rEmpCnpj}`).font = { bold: true };
        
        sheet.getCell(`K${rTitle}`).font = { size: 9 };
        sheet.getCell(`K${rEmpNome}`).font = { bold: true, size: 12 };

        sheet.getCell(`B${rFuncData}`).font = { bold: true, size: 12 };
        sheet.getCell(`C${rFuncData}`).font = { bold: true, size: 12 };
        sheet.getCell(`J${rFuncData}`).font = { bold: true, size: 12 };

        sheet.getCell(`B${rLiquido}`).font = { bold: true, size: 12 };
        sheet.getCell(`K${rLiquido}`).font = { bold: true, size: 13 };

        sheet.getCell(`B${rMensagens}`).font = { size: 9 };
        sheet.getCell(`J${rMensagens}`).font = { size: 9 };
        sheet.getCell(`K${rMensagens}`).font = { size: 9 };
        sheet.getCell(`J${rSum}`).font = { size: 11 };
        sheet.getCell(`K${rSum}`).font = { size: 11 };
        
        [2, 3, 10].forEach(c => sheet.getCell(rFuncHead, c).font = { size: 9 });
        [2, 3, 9, 10, 11].forEach(c => sheet.getCell(rRubHead, c).font = { size: 10 });
        [2, 4, 5, 7, 9, 10].forEach(c => sheet.getCell(rFootHead, c).font = { size: 9 });

        // --- ALINHAMENTO ---
        sheet.getCell(`E${rTitle}`).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell(`K${rTitle}`).alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getCell(`K${rEmpNome}`).alignment = { horizontal: 'center', vertical: 'middle' };
        
        [2, 3, 9, 10, 11].forEach(c => sheet.getCell(rRubHead, c).alignment = { horizontal: 'center', vertical: 'middle' });
        sheet.getCell(`B${rRubHead}`).alignment = { horizontal: 'left', vertical: 'middle' };

        for (let r = rRubStart; r <= rRubEnd; r++) {
          sheet.getCell(`B${r}`).alignment = { horizontal: 'right' };
          sheet.getCell(`I${r}`).alignment = { horizontal: 'right' };
          sheet.getCell(`J${r}`).alignment = { horizontal: 'right' };
          sheet.getCell(`K${r}`).alignment = { horizontal: 'right' };
        }

        sheet.getCell(`J${rMensagens}`).alignment = { horizontal: 'center' };
        sheet.getCell(`K${rMensagens}`).alignment = { horizontal: 'center' };
        sheet.getCell(`J${rSum}`).alignment = { horizontal: 'right', vertical: 'middle' };
        sheet.getCell(`K${rSum}`).alignment = { horizontal: 'right', vertical: 'middle' };

        sheet.getCell(`B${rLiquido}`).alignment = { horizontal: 'right', vertical: 'middle' };
        sheet.getCell(`K${rLiquido}`).alignment = { horizontal: 'right', vertical: 'middle' };

        for (let r = rFootHead; r <= rFootData; r++) {
          for(let c = 2; c <= 14; c++) {
            getSafeCell(sheet, r, c).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
          }
        }

        // --- CORES DE FUNDO ---
        const greyFill: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };
        for(let c = 2; c <= 14; c++) {
          getSafeCell(sheet, rLiquido, c).fill = greyFill;
        }

        // --- BORDAS (Reutilizando a função segura getSafeCell) ---
        const borderThin: Partial<ExcelJS.Border> = { style: 'thin' };
        const borderMedium: Partial<ExcelJS.Border> = { style: 'medium' };

        const setBorder = (r: number, c: number, edges: Partial<ExcelJS.Borders>) => {
          const targetCell = getSafeCell(sheet, r, c);
          targetCell.border = { ...(targetCell.border || {}), ...edges };
        };

        // Caixa externa (B..P)
        for(let r = rTitle; r <= rFootData; r++) {
          setBorder(r, 2, { left: borderMedium });
          setBorder(r, 16, { right: borderMedium });
        }
        for(let c = 2; c <= 16; c++) {
          setBorder(rTitle, c, { top: borderMedium });
          setBorder(rFootData, c, { bottom: borderMedium });
        }

        // Separadores horizontais internos (B..N)
        for(let c = 2; c <= 14; c++) {
          setBorder(rEmpCnpj, c, { bottom: borderThin });
          setBorder(rFuncData, c, { bottom: borderThin });
          setBorder(rRubHead, c, { top: borderThin, bottom: borderThin });
          setBorder(rMensagens, c, { top: borderThin });
        }

        // Topo do footer (B..P)
        for(let c = 2; c <= 16; c++) {
          setBorder(rFootHead, c, { top: borderThin });
        }

        // Borda Assinatura O e P (esquerda)
        for(let r = rTitle; r <= rLiquido; r++) {
          setBorder(r, 15, { left: borderThin }); // O
          setBorder(r, 16, { left: borderThin }); // P
        }

        // Box Referente Mês Ano (Bordas completas K3..N5)
        for (let r = rTitle; r <= rEmpCnpj; r++) {
            setBorder(r, 11, { left: borderThin });
            setBorder(r, 14, { right: borderThin });
        }
        for (let c = 11; c <= 14; c++) {
            setBorder(rTitle, c, { top: borderThin, bottom: borderThin });
            setBorder(rEmpNome, c, { top: borderThin }); // Linha superior do bloco da data K3
            setBorder(rEmpCnpj, c, { bottom: borderThin });
        }

        // Tabela Rubricas verticais
        for (let r = rRubHead; r <= rSum; r++) {
          if (r <= rRubEnd) {
             setBorder(r, 2, { right: borderThin }); // B
             setBorder(r, 8, { right: borderThin }); // H
             setBorder(r, 9, { right: borderThin }); // I
             setBorder(r, 10, { right: borderThin }); // J
             setBorder(r, 14, { right: borderThin }); // N
          } else {
             // Área de Mensagens
             setBorder(r, 9, { right: borderThin });
             setBorder(r, 10, { right: borderThin });
             setBorder(r, 14, { right: borderThin });
          }
        }
        
        setBorder(rMensagens, 10, { bottom: borderThin });
        setBorder(rMensagens, 11, { bottom: borderThin });
        setBorder(rLiquido, 10, { right: borderThin });
        setBorder(rLiquido, 14, { right: borderThin });

        // Rodapé verticais
        for (let r = rFootHead; r <= rFootData; r++) {
           setBorder(r, 3, { right: borderThin }); // C
           setBorder(r, 4, { right: borderThin, left: borderThin }); // D
           setBorder(r, 5, { left: borderThin }); // E
           setBorder(r, 6, { right: borderThin }); // F
           setBorder(r, 7, { left: borderThin }); // G
           setBorder(r, 8, { right: borderThin }); // H
           setBorder(r, 9, { right: borderThin, left: borderThin }); // I
           setBorder(r, 10, { left: borderThin }); // J
           // A borda direita de P (16) já é coberta pela caixa externa média.
        }

        // --- FORMATO MOEDA ---
        for (let r = rRubStart; r <= rSum; r++) {
          if (sheet.getCell(`J${r}`).value) getSafeCell(sheet, r, 10).numFmt = '"R$" #,##0.00'; 
          if (sheet.getCell(`K${r}`).value) getSafeCell(sheet, r, 11).numFmt = '"R$" #,##0.00'; 
        }
        getSafeCell(sheet, rLiquido, 11).numFmt = '"R$" #,##0.00'; 

        ['B', 'D', 'E', 'G', 'I'].forEach(col => {
            const colNums = { 'B': 2, 'D': 4, 'E': 5, 'G': 7, 'I': 9 };
            if (sheet.getCell(`${col}${rFootData}`).value) {
                getSafeCell(sheet, rFootData, colNums[col as keyof typeof colNums]).numFmt = '"R$" #,##0.00';
            }
        });

        // --- MESCLAGENS (MERGE) ---
        sheet.mergeCells(`E${rTitle}:J${rTitle}`); // Título Centralizado
        sheet.mergeCells(`K${rTitle}:N${rTitle}`); // Rótulo "Referente"
        sheet.mergeCells(`K${rEmpNome}:N${rEmpCnpj}`); // Valor "Referente"
        
        sheet.mergeCells(`B${rEmpNome}:C${rEmpNome}`);
        sheet.mergeCells(`B${rEmpEnd}:C${rEmpEnd}`);
        sheet.mergeCells(`B${rEmpCnpj}:C${rEmpCnpj}`);
        
        sheet.mergeCells(`D${rEmpNome}:J${rEmpNome}`);
        sheet.mergeCells(`D${rEmpEnd}:J${rEmpEnd}`);
        sheet.mergeCells(`D${rEmpCnpj}:J${rEmpCnpj}`);

        sheet.mergeCells(`C${rFuncHead}:I${rFuncHead}`); // Nome
        sheet.mergeCells(`C${rFuncData}:I${rFuncData}`);
        sheet.mergeCells(`J${rFuncHead}:N${rFuncHead}`); // Função
        sheet.mergeCells(`J${rFuncData}:N${rFuncData}`);

        for (let r = rRubHead; r <= rRubEnd; r++) {
          sheet.mergeCells(`C${r}:H${r}`); 
          sheet.mergeCells(`K${r}:N${r}`); 
        }

        sheet.mergeCells(`B${rMensagens}:I${rSum}`); // Área de Mensagens
        sheet.mergeCells(`K${rMensagens}:N${rMensagens}`); // Label Total Descontos
        sheet.mergeCells(`K${rSum}:N${rSum}`); // Valor Total Descontos

        sheet.mergeCells(`B${rLiquido}:J${rLiquido}`); 
        sheet.mergeCells(`K${rLiquido}:N${rLiquido}`); 
        
        sheet.mergeCells(`B${rFootHead}:C${rFootHead}`);
        sheet.mergeCells(`B${rFootData}:C${rFootData}`);
        sheet.mergeCells(`E${rFootHead}:F${rFootHead}`);
        sheet.mergeCells(`E${rFootData}:F${rFootData}`);
        sheet.mergeCells(`G${rFootHead}:H${rFootHead}`);
        sheet.mergeCells(`G${rFootData}:H${rFootData}`);
        sheet.mergeCells(`J${rFootHead}:P${rFootHead}`);
        sheet.mergeCells(`J${rFootData}:P${rFootData}`);

        sheet.mergeCells(`O${rTitle}:O${rLiquido}`);
        sheet.mergeCells(`P${rTitle}:P${rMensagens}`); // rMensagens fica acima do rSum
        sheet.mergeCells(`P${rSum}:P${rLiquido}`); // Data
        sheet.mergeCells(`B${rViaId}:P${rViaId}`); // Merge da via

        startRow = rViaId + 3; // Pula linhas p/ próxima via
      }

      // Enviar como anexo para download direto
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="Recibo_${dadosFuncionario.nome?.trim() || 'Pagamento'}.xlsx"`);

      await workbook.xlsx.write(res);
      res.end();

    } catch (error: any) {
      console.error('Erro ao gerar planilha ExcelJS:', error);
      res.status(500).json({ error: error.message || 'Falha ao gerar a planilha.' });
    }
  });

  // Global Error Handler para requisições com payload muito grande (evita que o Express retorne HTML 413 padrão)
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (err && err.type === 'entity.too.large') {
      return res.status(413).json({ error: 'O arquivo PDF enviado é muito grande (acima do limite de 50MB suportado).' });
    }
    if (err && err instanceof SyntaxError && 'body' in err && (err as any).status === 400) {
      return res.status(400).json({ error: 'Formato JSON inválido.' });
    }
    next(err);
  });

  // Catch-all error handler para rotas de API para garantir que sempre retornem JSON
  app.use('/api', (err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('API Error:', err);
    const status = (err.status && err.status !== 500) ? err.status : 422;
    res.status(status).json({ error: err.message || 'Falha no processamento (interceptado de 500).' });
  });

  // Inicia o servidor apenas em ambiente de desenvolvimento local (NÃO na Vercel)
  if (!process.env.VERCEL) {
    (async () => {
      try {
        if (process.env.NODE_ENV !== 'production') {
          const { createServer: createViteServer } = await import('vite');
          const vite = await createViteServer({
            server: { middlewareMode: true },
            appType: 'spa',
          });
          app.use(vite.middlewares);
        } else {
          const distPath = path.join(process.cwd(), 'dist');
          app.use(express.static(distPath));
          app.get('*', (req, res) => {
            res.sendFile(path.join(distPath, 'index.html'));
          });
        }

        app.listen(PORT, () => {
          console.log(`Server running on http://localhost:${PORT}`);
        });
      } catch (err) {
        console.error('Erro ao inicializar o servidor dev:', err);
      }
    })();
  }

  export default app;
