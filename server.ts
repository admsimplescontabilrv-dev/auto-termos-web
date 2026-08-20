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

const AiCommandSchema = z.object({
  prompt: z.string(),
  context: z.object({
    empresas: z.array(z.any()),
    sindicatos: z.array(z.any())
  })
});

const ChatSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
      text: z.string()
    }))
  })),
  context: z.object({
    empresas: z.array(z.any()).optional(),
    sindicatos: z.array(z.any()).optional()
  }).optional()
});

const ExtractPdfSchema = z.object({
  pdfBase64: z.string().min(1, "PDF não enviado."),
  type: z.enum(['cnpj', 'recibo', 'admissional', 'trct', 'custom', 'aviso_previo']).default('admissional'),
  globalVars: z.array(z.string()).optional(),
  collabVars: z.array(z.string()).optional(),
  registeredCompanies: z.array(z.object({
    id: z.string(),
    nome: z.string(),
    cnpj: z.string().optional().nullable()
  })).optional()
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
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  // Middleware de Autenticação de API Key Interna
  const requireApiKey = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const clientKey = req.headers['x-api-key'];
    const serverKey = process.env.API_SECRET_KEY; // Você deve criar essa variável na Vercel
    
    if (!serverKey) {
      return res.status(500).json({ error: 'Erro: API_SECRET_KEY ausente.' });
    }
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

  app.post('/api/ai-command', requireApiKey, async (req, res) => {
    try {
      const parseResult = AiCommandSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.issues[0].message });
      }

      const { prompt, context } = parseResult.data;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY não configurada.' });
      }
      
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `Você é um assistente de inteligência artificial de Departamento Pessoal ("Assistente IA do DP").
Sua função é interpretar a intenção do usuário e estruturar os dados para que o frontend crie regras de checklist ou eventos no calendário.

EMPRESAS DISPONÍVEIS: ${JSON.stringify(context.empresas)}
SINDICATOS DISPONÍVEIS: ${JSON.stringify(context.sindicatos)}

INSTRUÇÕES:
Retorne APENAS um JSON válido.
Formato de saída estrito:
{
  "message": "Mensagem amigável confirmando a ação (ex: Entendido! Criei um lembrete...)",
  "details": {
    "intent": "CREATE_CALENDAR_EVENT" | "CREATE_CHECKLIST_RULE" | "UNKNOWN",
    "parameters": { ... } // Dados extraídos
  }
}

Se intent = "CREATE_CALENDAR_EVENT", parameters deve ter:
- title: string (resumo)
- type: "MEETING" | "DEADLINE" | "REMINDER" | "HOLIDAY"
- date: timestamp em milissegundos (gere uma data baseada no que o usuário pedir. Use o dia especificado no mês atual, ou adicione dias, considere o Timestamp do JS)

Se intent = "CREATE_CHECKLIST_RULE", parameters deve ter:
- taskName: string
- targetType: "ALL" | "SPECIFIC_EMPRESA" | "SPECIFIC_SINDICATO"
- targetId: string (ID da empresa ou sindicato se aplicável)
- dueDateRule: "FIXED_DAY" | "LAST_DAY_OF_MONTH" | "FIFTH_BUSINESS_DAY"
- dayValue: number (apenas se FIXED_DAY)

Sempre tente associar as entidades pedidas aos IDs dos dados disponíveis.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          { role: 'user', parts: [{ text: prompt }] }
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2
        }
      });

      let text = response.text || '{}';
      text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
      const output = JSON.parse(text);

      res.json(output);
    } catch (error: any) {
      console.error('AI Command Error:', error);
      res.status(500).json({ error: 'Erro ao processar comando com IA: ' + error.message });
    }
  });

  app.post('/api/chat', requireApiKey, async (req, res) => {
    try {
      const parseResult = ChatSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.issues[0].message });
      }

      const { history, context } = parseResult.data;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY não configurada.' });
      }
      
      const ai = new GoogleGenAI({ apiKey });

      const systemInstruction = `Você é um assistente de inteligência artificial de Departamento Pessoal ("Assistente IA do DP").
Sua função é tirar dúvidas do usuário, ajudá-lo com dados do sistema, e também interpretar comandos para registrar coisas no sistema.

DADOS DISPONÍVEIS DO SISTEMA DO USUÁRIO:
EMPRESAS: ${JSON.stringify(context?.empresas || [])}
SINDICATOS: ${JSON.stringify(context?.sindicatos || [])}

Se o usuário fizer uma pergunta geral, responda de forma amigável e concisa.
Se o usuário pedir para realizar uma ação no sistema (criar um lembrete no calendário, um evento, ou uma regra de checklist), você DEVE primeiro pedir confirmação. 
Exemplo de text: "Você gostaria de adicionar um lembrete para a empresa X no dia Y para falar sobre Z?"
E estruture a ação proposta no campo "proposedAction" do JSON de saída.

INSTRUÇÕES DE SAÍDA:
Retorne SEMPRE um JSON válido, no seguinte formato estrito:
{
  "text": "Sua resposta amigável e conversacional para o usuário (pode usar markdown). Se for uma ação, pergunte se o usuário deseja confirmar a criação.",
  "proposedAction": {
    "intent": "CREATE_CALENDAR_EVENT" | "CREATE_CHECKLIST_RULE" | "UNKNOWN",
    "parameters": { ... } // Parâmetros extraídos, se aplicável
  }
}

Se a intent for "CREATE_CALENDAR_EVENT", parameters deve ter:
- title: string (resumo)
- type: "MEETING" | "DEADLINE" | "REMINDER" | "HOLIDAY"
- date: timestamp em milissegundos (calcule corretamente: se o usuário pedir "dia 23", retorne o timestamp correspondente ao dia 23 do mês e ano atuais: ${new Date().toISOString()})
- empresaId: string (se aplicável, envie o ID exato da empresa ou sindicato correspondente. É muito importante associar o ID para que apareça no calendário da empresa)

Se a intent for "CREATE_CHECKLIST_RULE", parameters deve ter:
- taskName: string
- targetType: "ALL" | "SPECIFIC_EMPRESA" | "SPECIFIC_SINDICATO"
- targetId: string (ID da empresa ou sindicato se aplicável)
- dueDateRule: "FIXED_DAY" | "LAST_DAY_OF_MONTH" | "FIFTH_BUSINESS_DAY"
- dayValue: number (apenas se FIXED_DAY)

Sempre tente associar as entidades pedidas aos IDs dos dados disponíveis.
Se não houver nenhuma ação a ser proposta, não envie o campo "proposedAction" ou envie "intent": "UNKNOWN".`;

      const modelsToTry = [
        'gemini-3.5-flash-lite', 
        'gemini-3.5-flash', 
        'gemini-3.7-flash', 
        'gemini-flash-latest'
      ];

      let responseText = '';
      let lastError = null;
      let usedModel = '';
      let usedAttempts = 0;

      for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        const currentModel = modelsToTry[attempt];
        usedModel = currentModel;
        usedAttempts = attempt + 1;
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: history,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
              responseMimeType: "application/json"
            }
          });
          responseText = response.text || '{}';
          break; // Sucesso, sai do loop
        } catch (err: any) {
          console.log(`Chat - Tentativa ${attempt + 1} (modelo: ${currentModel}) falhou:`, err.message);
          lastError = err;
          if (attempt === modelsToTry.length - 1) throw lastError;
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        }
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        parsedResponse = { text: responseText, proposedAction: { intent: "UNKNOWN" } };
      }

      res.json({
        ...parsedResponse,
        metadata: {
          model: usedModel,
          attempts: usedAttempts
        }
      });
    } catch (error: any) {
      console.error('Chat AI Error:', error);
      res.status(500).json({ error: 'Erro ao processar conversa com IA: ' + error.message });
    }
  });

  app.post('/api/extract-pdf', requireApiKey, async (req, res) => {
    try {
      // 5. VALIDAÇÃO DE DADOS: Valida o payload de entrada com Zod
      const parseResult = ExtractPdfSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.issues[0].message });
      }

      const { pdfBase64, type, globalVars = [], collabVars = [], registeredCompanies = [] } = parseResult.data;
      
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'Chave da API do Gemini não configurada no servidor (GEMINI_API_KEY).' });
      }
      const ai = new GoogleGenAI({ 
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });
      
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
        systemInstruction = `Extraia os dados deste Termo de Rescisão de Contrato de Trabalho (TRCT) para o seguinte esquema JSON estrito.
Retorne APENAS o objeto JSON. Se o campo não existir, use "".
{
  "cnpj": "CNPJ do Empregador (formatado)",
  "razaoSocial": "Razão Social/Nome do Empregador",
  "enderecoEmpresa": "Endereço do Empregador",
  "bairroEmpresa": "Bairro do Empregador",
  "municipioEmpresa": "Município do Empregador",
  "ufEmpresa": "UF do Empregador",
  "cepEmpresa": "CEP do Empregador",
  "cnae": "CNAE do Empregador",
  "pis": "PIS/PASEP do Trabalhador",
  "nome": "Nome do Trabalhador",
  "enderecoTrabalhador": "Endereço do Trabalhador",
  "bairroTrabalhador": "Bairro do Trabalhador",
  "municipioTrabalhador": "Município do Trabalhador",
  "ufTrabalhador": "UF do Trabalhador",
  "cepTrabalhador": "CEP do Trabalhador",
  "ctps": "CTPS (Número, Série, UF)",
  "cpf": "CPF do Trabalhador",
  "dataNascimento": "Data de Nascimento (YYYY-MM-DD)",
  "nomeMae": "Nome da Mãe do Trabalhador",
  "tipoContrato": "Tipo de Contrato",
  "causaAfastamento": "Causa do Afastamento",
  "remuneracaoMesAnterior": 0.00,
  "dataAdmissao": "Data de Admissão (YYYY-MM-DD)",
  "dataAvisoPrevio": "Data do Aviso Prévio (YYYY-MM-DD)",
  "dataAfastamento": "Data de Afastamento (YYYY-MM-DD)",
  "codigoAfastamento": "Código de Afastamento",
  "pensaoAlimenticia": 0.00,
  "pensaoAlimenticiaFGTS": 0.00,
  "sindicato": "Sindicato da Categoria",
  "cnpjSindicato": "CNPJ do Sindicato"
}`;
      } else if (type === 'aviso_previo') {
        systemInstruction = `Extraia os dados deste Aviso Prévio e retorne EXATAMENTE este JSON:
{
  "dataAviso": "YYYY-MM-DD",
  "dataTermino": "YYYY-MM-DD",
  "duracaoDias": 30,
  "nomeEmpresa": "Razão Social",
  "nomeColaborador": "Nome Completo"
}
INSTRUÇÕES CRÍTICAS PARA O AVISO PRÉVIO:
1. Encontre a data em que o aviso foi assinado/entregue (geralmente no rodapé ou cabeçalho). Preencha em "dataAviso".
2. Encontre a quantidade de dias do aviso (ex: 30 dias, 33 dias). Preencha em "duracaoDias" como número.
3. Se não encontrar a data de término explícita no documento, DEIXE EM BRANCO (""). NÃO TENTE CALCULAR.
4. Extraia o nome da empresa e do funcionário exatamente como constam no documento.
Se algum campo não existir, use string vazia. Retorne SOMENTE o JSON válido.`;
      } else if (type === 'custom') {
        const globals = (globalVars || []).join(', ');
        const collabs = (collabVars || []).join(', ');
        
        let companiesInstruction = '';
        if (registeredCompanies && registeredCompanies.length > 0) {
          companiesInstruction = `\nPara identificar a empresa do documento com mais precisão, aqui está a lista de empresas cadastradas no sistema do usuário:
${registeredCompanies.map(c => `- ID: "${c.id}" | Nome: "${c.nome}" | CNPJ: "${c.cnpj || 'N/A'}"`).join('\n')}

IMPORTANTE: Ao analisar o documento (especialmente relatórios admissionais), cruze o nome ou o CNPJ da empresa encontrada no PDF com esta lista. Se houver correspondência, TENTE SEMPRE retornar a chave extra "EMPRESA_ID" contendo o ID exato da empresa correspondente, e retorne também a chave "CNPJ DA EMPRESA" formatada.`;
        }

        systemInstruction = `Analise este documento em PDF. Extraia os dados solicitados e retorne APENAS um JSON válido (sem markdown, sem explicação).
Se houver mais de uma pessoa/colaborador no documento, retorne um ARRAY de objetos JSON, onde cada objeto contém os dados daquela pessoa (podendo repetir os dados globais/da empresa em cada objeto).
Se houver apenas uma pessoa, pode retornar um único objeto JSON ou um array de um elemento.

Além de extrair as variáveis especificadas, se for um documento ou relatório admissional, TENTE SEMPRE localizar e retornar também as seguintes chaves (mesmo que não estejam na lista de variáveis):
- "DATA DE ADMISSÃO" (formato DD/MM/AAAA)
- "DIAS DE EXPERIENCIA" (número de dias do 1º período de experiência)
- "DIAS DE PRORROGACAO" (Número de dias da prorrogação da experiência. ATENÇÃO: Leia o documento até o final, inclusive a segunda página ou anexos, pois a prorrogação costuma ficar separada com a nova data de término. Se achar a data de término da prorrogação, calcule os dias baseando-se no término da experiência inicial, ou simplesmente busque pelo número de dias).${companiesInstruction}

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
- "DIAS DE EXPERIENCIA" (quantidade de dias do primeiro período de experiência, ex: 30)
- "DIAS DE PRORROGACAO" (quantidade de dias da prorrogação da experiência, ex: 60)
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

      const modelsToTry = [
        'gemini-3.5-flash-lite', 
        'gemini-3.5-flash', 
        'gemini-3.7-flash', 
        'gemini-flash-latest'
      ];
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
            }
          });
          
          let text = response.text || '{}';
          // Clean markdown JSON wrapper if present
          text = text.replace(/^```(json)?\n?/, '').replace(/\n?```$/, '').trim();
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
      return res.status(413).json({ error: 'O arquivo PDF enviado é muito grande (acima do limite de 5MB suportado).' });
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
