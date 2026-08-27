import express from "express";
import path from "path";
import { GoogleGenAI } from "@google/genai";
import ExcelJS from 'exceljs';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { Resend } from 'resend';
import { format, isSameDay, getDay, subDays, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import fs from 'fs';
import cron from 'node-cron';

let firestoreDatabaseId = process.env.FIREBASE_DATABASE_ID || 'ai-studio-documentautomato-5d1ea9b1-7d94-4229-bd61-9c62bcb6f636';
let firestoreProjectId = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0268052290';

try {
  // Try to get it from firebase.ts directly since that's what the client uses
  const firebaseTsPath = path.join(process.cwd(), 'src', 'lib', 'firebase.ts');
  if (fs.existsSync(firebaseTsPath)) {
    const firebaseTsContent = fs.readFileSync(firebaseTsPath, 'utf-8');
    
    const projectIdMatch = firebaseTsContent.match(/projectId:\s*["']([^"']+)["']/);
    if (projectIdMatch) firestoreProjectId = projectIdMatch[1];
    
    const databaseIdMatch = firebaseTsContent.match(/firestoreDatabaseId:\s*["']([^"']+)["']/);
    if (databaseIdMatch) firestoreDatabaseId = databaseIdMatch[1];
  } else {
    const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
    if (fs.existsSync(configPath)) {
      const configContent = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configContent);
      if (config.projectId) firestoreProjectId = config.projectId;
      if (config.databaseId) firestoreDatabaseId = config.databaseId;
    }
  }
} catch (e) {
  console.error('Could not load firebase config:', e);
}

// Initialize Firebase Admin for token verification
if (getApps().length === 0) {
  const adminConfig: any = { projectId: firestoreProjectId };
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
      adminConfig.credential = cert(serviceAccount);
    } catch (e) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY', e);
    }
  }
  initializeApp(adminConfig);
}


// --- Middlewares de Segurança ---

// 3. RATE LIMITING: 50 requisições a cada 15 minutos por IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 50, 
  message: { error: 'Muitas requisições originadas deste IP, tente novamente mais tarde.' }
});

// --- Schemas de Validação (Zod) ---

const AiCommandSchema = z.object({
  message: z.string(),
  pdfBase64: z.string().optional().nullable(),
  pdfName: z.string().optional().nullable(),
  history: z.array(z.any()).optional().nullable(),
  context: z.object({
    empresas: z.array(z.any()),
    sindicatos: z.array(z.any()),
    kanbanTasks: z.array(z.any()).optional().nullable()
  }),
  cctText: z.string().optional().nullable()
});

const ChatSchema = z.object({
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    parts: z.array(z.object({
      text: z.string().optional().nullable(),
      inlineData: z.any().optional().nullable()
    }))
  })),
  context: z.object({
    empresas: z.array(z.any()).optional().nullable(),
    sindicatos: z.array(z.any()).optional().nullable(),
    kanbanTasks: z.array(z.any()).optional().nullable()
  }).optional().nullable(),
  cctText: z.string().optional().nullable(),
  kanbanTasks: z.array(z.any()).optional().nullable(),
  calendarEvents: z.array(z.any()).optional().nullable(),
  pdfBase64: z.string().optional().nullable(),
  pdfName: z.string().optional().nullable()
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
const PORT = 3000;

// Habilita a confiança no proxy (X-Forwarded-For) pois o app roda atrás do reverse proxy do Cloud Run.
// Isso resolve o aviso do express-rate-limit e garante que as requisições sejam bloqueadas pelo IP do usuário, não do proxy.
app.set('trust proxy', 1);

  // 6. HEADERS DE SEGURANÇA: Helmet para adicionar headers de proteção,
  // mas configurado para permitir a visualização do app via iframe no AI Studio.
  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: false,
    frameguard: false // <-- DESATIVE AQUI
  }));

  // 2. PROTEÇÃO CONTRA DoS: Limite do body para 5mb
  app.use(express.json({ limit: "5mb" }));
  app.use(express.urlencoded({ limit: "5mb", extended: true }));

  // Middleware de Autenticação via Firebase Auth Token
  const requireApiKey = async (req: express.Request, res: express.Response, next: express.NextFunction): Promise<any> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Acesso negado. Token de autenticação ausente.' });
    }
    
    const token = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await getAuth().verifyIdToken(token);
      (req as any).user = decodedToken;
      next();
    } catch (error) {
      console.error("Auth erro:", error);
      return res.status(401).json({ error: 'Acesso negado. Token inválido.' });
    }
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

      const { message, pdfBase64, pdfName, history, context, cctText } = parseResult.data;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY não configurada.' });
      }
      
      const ai = new GoogleGenAI({ apiKey });

      let baseInstruction = `Você é um Centro de Comando Universal (Omnichannel) do Departamento Pessoal ("Assistente IA do DP").
Sua função é tirar dúvidas, analisar arquivos PDF (se fornecidos) e tomar ações em múltiplos módulos do sistema, como Calendário, Checklists e Kanban.

DADOS DISPONÍVEIS DO SISTEMA:
EMPRESAS: ${JSON.stringify(context.empresas)}
SINDICATOS: ${JSON.stringify(context.sindicatos)}
TAREFAS KANBAN ATUAIS: ${JSON.stringify(context.kanbanTasks || [])}

Se o usuário enviar um arquivo PDF, extraia as informações necessárias para criar tarefas, documentos ou termos baseados no conteúdo.

INSTRUÇÕES DE SAÍDA:
Retorne SEMPRE um JSON válido, no seguinte formato estrito:
{
  "reply": "Sua resposta amigável e conversacional para o usuário (pode usar markdown). Se houver ações a tomar, confirme o que será feito.",
  "intents": [
    {
      "action": "CREATE_CALENDAR_EVENT" | "CREATE_CHECKLIST_RULE" | "CREATE_KANBAN_TASK" | "UPDATE_KANBAN_TASK" | "UPDATE_FECHAMENTO_FOLHA" | "GENERATE_TERMO",
      "payload": { ... } // Dados extraídos
    }
  ]
}

Se a action for "UPDATE_FECHAMENTO_FOLHA", payload deve ter:
- empresaId: string (ID da empresa a atualizar, extraído do contexto de EMPRESAS)
- monthKey: string (Chave do mês a atualizar, ex: "2026-08", ou a própria string literal "ATUAL" para o sistema calcular o mês atual)
- field: string (Um dentre: "lancamento", "consignado", "adiantamento", "fgts", "dctf", "guiaSindicato", "verificarEnvio", "observacoes", "tipoFolha")
- value: string (Novo valor do campo)

Se a action for "CREATE_KANBAN_TASK", payload deve ter:
- title: string
- status: string ("URGENTE", "PENDENTE", "CONCLUIDO", ou baseado nas colunas do Kanban atual, padrão é "TODO")
- description: string (opcional)

Se a action for "UPDATE_KANBAN_TASK", payload deve ter:
- id: string (ID da tarefa extraído das TAREFAS KANBAN ATUAIS)
- status: string (novo status)

Se a action for "GENERATE_TERMO", payload deve ter:
- termoId: string (ID obrigatório do modelo. Use UM DOS SEGUINTES: "tpl-nda" (Acordo Confidencialidade), "tpl-banco-horas", "tpl-etica-digital" (Política de Internet/Celular), "tpl-imagem" (Uso de Imagem), "tpl-equipamentos" (Responsabilidade de Equipamentos/Materiais), "tpl-monitoramento" (Câmeras), "tpl-veiculo" (Uso de Veículo). Se não for nenhum desses, use "tpl-custom".)
- extractedData: objeto com chaves (ex: "NOME DO COLABORADOR", "CPF DO COLABORADOR", "NOME DA EMPRESA", "CNPJ DA EMPRESA", "ENDEREÇO DA EMPRESA", "TELEFONE DA EMPRESA", "EMAIL DA EMPRESA", "VEÍCULO", "PLACA DO VEÍCULO") extraídas do PDF ou do contexto da conversa. As chaves devem estar em MAIÚSCULO sem colchetes ou chaves.

Sempre tente associar as entidades pedidas aos IDs dos dados disponíveis.
Se não houver nenhuma ação a ser tomada, retorne "intents": []
`;

      let systemInstruction = baseInstruction;
      const dataAtualFormatada = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'America/Sao_Paulo' }).format(new Date());

      if (cctText) {
        systemInstruction = `Você é o Centro de Comando Universal do 'Simples Contábil'.
DATA ATUAL DO SISTEMA: ${dataAtualFormatada} (${new Date().toISOString().slice(0, 10)})

Abaixo, forneço o texto integral e atualizado da Convenção Coletiva de Trabalho (CCT) do sindicato aplicável a este contexto:
---
${cctText}
---
**SUAS REGRAS DE CONDUTA E VERIFICAÇÃO DE VIGÊNCIA (OBRIGATÓRIO):**
1. **SAÍDA PADRONIZADA E CONCISA DA VIGÊNCIA (SEM TEXTOS LONGOS OU NOTAS PROLIXAS):** 
   - Sempre identifique no texto a cláusula de vigência (ex: "CLÁUSULA PRIMEIRA - VIGÊNCIA E DATA-BASE", períodos como "01/XX/YYYY a 31/XX/YYYY").
   - Compare o período de vigência com a DATA ATUAL DO SISTEMA (${dataAtualFormatada}).
   - Se a CCT estiver **VENCIDA** perante a data atual: inicie obrigatoriamente a resposta com o alerta em destaque no formato:
     ⚠️ **ALERTA CCT VENCIDA DESDE DD/MM/AAAA**
   - Se a CCT estiver **VIGENTE**: inclua a vigência de forma simples e direta em uma única linha (ao final da resposta ou após a citação):
     **VIGÊNCIA CCT:** DD/MM/AAAA a DD/MM/AAAA
2. **FIDELIDADE E ZERO ALUCINAÇÃO:** Responda à dúvida do usuário baseando-se **EXCLUSIVAMENTE** nas cláusulas do texto da CCT acima. Cite o número da cláusula sempre que possível.
3. **POSTURA CONSULTIVA CASO NÃO CONSTE:** Se a regra solicitada não constar expressamente no texto fornecido, **NÃO INVENTE** nem presuma regras. Adote uma postura consultiva, respondendo: *'Analisei a Convenção Coletiva anexada, mas não encontrei regras específicas sobre [Tema]...'*

Além disso, siga estas instruções gerais de estruturação de resposta JSON (com 'reply' e 'intents'):
${baseInstruction}`;
      }

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

      // Montar os conteúdos (parts) da mensagem atual
      const userParts: any[] = [];
      if (pdfBase64) {
        userParts.push({
          inlineData: {
            mimeType: 'application/pdf',
            data: pdfBase64
          }
        });
        userParts.push({ text: `Arquivo anexado: ${pdfName || 'documento.pdf'}` });
      }
      userParts.push({ text: message });

      const requestContents = [];
      
      // Adicionar history se houver, convertendo para o formato do GenAI
      if (history && Array.isArray(history)) {
         for (const msg of history) {
            requestContents.push({
               role: msg.role === 'user' ? 'user' : 'model',
               parts: msg.parts.map((p: any) => ({ text: p.text || '' }))
            });
         }
      }
      
      requestContents.push({
         role: 'user',
         parts: userParts
      });

      for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        const currentModel = modelsToTry[attempt];
        usedModel = currentModel;
        usedAttempts = attempt + 1;
        
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: requestContents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.2,
              responseMimeType: "application/json"
            }
          });
          
          responseText = response.text || '{}';
          break; // Sucesso
        } catch (err: any) {
          lastError = err;
          if (attempt === modelsToTry.length - 1) {
            console.error(`AI-Command - Todas as tentativas falharam. Último erro:`, err.message);
            throw lastError;
          }
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        }
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        parsedResponse = { reply: responseText, intents: [] };
      }

      res.json({
        ...parsedResponse,
        metadata: {
          model: usedModel,
          attempts: usedAttempts
        }
      });
    } catch (error: any) {
      console.error('AI Command Error:', error);
      console.error(error);
      res.status(500).json({ error: 'Erro interno ao processar comando com IA.' });
    }
  });

  app.post('/api/chat', requireApiKey, async (req, res) => {
    try {
      const parseResult = ChatSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ error: parseResult.error.issues[0].message });
      }

      const { history, context, cctText, kanbanTasks, calendarEvents, pdfBase64, pdfName } = parseResult.data;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: 'GEMINI_API_KEY não configurada.' });
      }
      
      const ai = new GoogleGenAI({ apiKey });

      let baseInstruction = `Você é o "Assistente IA do DP", o centro de comando inteligente do sistema "DP - Simples Contábil".
Você tem poderes para EXECUTAR AÇÕES no sistema do usuário através de intenções JSON.
DATA E HORA ATUAL DO SISTEMA: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}

═══════════════════════════════════════════════
DADOS DO SISTEMA DO USUÁRIO (CONTEXTO INJETADO):
═══════════════════════════════════════════════
EMPRESAS CADASTRADAS: ${JSON.stringify(context?.empresas || [])}
SINDICATOS CADASTRADOS: ${JSON.stringify(context?.sindicatos || [])}
CARTÕES DO KANBAN (TAREFAS ABERTAS): ${JSON.stringify(kanbanTasks || context?.kanbanTasks || [])}
EVENTOS DO CALENDÁRIO: ${JSON.stringify(calendarEvents || [])}

═══════════════════════════════════════════════
CATÁLOGO DE TERMOS DISPONÍVEIS NO SISTEMA:
═══════════════════════════════════════════════
Os seguintes modelos de documento podem ser gerados automaticamente. Use o "termoId" exato ao gerar:

| termoId           | Nome do Documento                                                  |
|--------------------|--------------------------------------------------------------------|
| tpl-nda            | Acordo de Confidencialidade, Não Aliciamento e Não Concorrência   |
| tpl-banco-horas    | Acordo Individual de Banco de Horas                                |
| tpl-etica-digital  | Política de Ferramentas Digitais e Conduta                         |
| tpl-imagem         | Autorização de Uso de Imagem e Voz                                 |
| tpl-equipamentos   | Termo de Responsabilidade pela Guarda e Uso de Equipamentos        |
| tpl-monitoramento  | Termo de Consentimento para Monitoramento por Câmeras              |
| tpl-veiculo        | Termo de Responsabilidade e Condições de Uso de Veículo Corporativo|

Variáveis GLOBAIS (preenchidas pela IA): [NOME DA EMPRESA], [CNPJ DA EMPRESA], [CIDADE/UF], [DATA], [ENDEREÇO DA EMPRESA], [TELEFONE DA EMPRESA], [EMAIL DA EMPRESA]
Variáveis específicas do tpl-equipamentos: [ITEM 1], [ITEM 2]
Variáveis específicas do tpl-veiculo: [VEÍCULO], [PLACA DO VEÍCULO], [RENAVAM DO VEÍCULO]
Variáveis de COLABORADOR (A IA DEVE EXTRAIR SE O USUÁRIO FORNECER NO CHAT): [NOME DO COLABORADOR], [CPF DO COLABORADOR], [RG DO COLABORADOR]

═══════════════════════════════════════════════
COLUNAS DO KANBAN:
═══════════════════════════════════════════════
O Kanban possui as seguintes colunas:
- "ENTRADA DE DEMANDAS" (tarefas novas)
- "URGENTE" (tarefas prioritárias)
- "CONCLUIDO" (tarefas finalizadas)

═══════════════════════════════════════════════
CATEGORIAS DE CHECKLIST:
═══════════════════════════════════════════════
- FOLHA (Folha de Pagamento)
- FERIAS (Férias)
- RESCISAO (Rescisão)
- MONTHLY (Obrigações Mensais)
- (O usuário pode ter criado categorias customizadas adicionais)

═══════════════════════════════════════════════
TIPOS DE EVENTO DO CALENDÁRIO:
═══════════════════════════════════════════════
- "DEADLINE" (Prazo / Vencimento)
- "MEETING" (Reunião)
- "REMINDER" (Lembrete)
- "HOLIDAY" (Feriado)

═══════════════════════════════════════════════
REGRAS DE EXTRAÇÃO PARA TERMOS (CRÍTICO):
═══════════════════════════════════════════════
Se o usuário pedir para gerar um termo/documento:
1. Se ele anexou um PDF: retorne APENAS o intent GENERATE_TERMO com o "termoId" correto. Você NÃO precisa se preocupar em extrair os dados no "extractedData", pois o sistema fará a extração avançada completa do funcionário e da empresa automaticamente assim que redirecionar o usuário (apenas deixe extractedData vazio ou preencha o que conseguir identificar de imediato).
2. Se ele NÃO anexou um PDF e NÃO digitou os dados completos: NÃO gere o intent GENERATE_TERMO ainda. Ao invés disso, responda amigavelmente pedindo para o usuário anexar o PDF do documento (ex: ficha de registro, holerite, etc.) para que a extração dos dados do funcionário ocorra com o máximo de qualidade.
3. Se o usuário informar que quer usar a empresa X (ex: "Aromas Grill"), você pode preencher os dados da empresa no "extractedData" buscando do contexto de EMPRESAS CADASTRADAS.

═══════════════════════════════════════════════
SUAS INTENÇÕES (AÇÕES QUE VOCÊ PODE EXECUTAR):
═══════════════════════════════════════════════

Você pode propor UMA ou MAIS ações simultâneas. Use o campo "intents" (array) para isso.

INTENT: CLEAN_BOLETO
  Quando usar: O usuário pede para limpar, formatar, ou processar um boleto, guia, DARF, ou PDF de pagamento.
  Payload: {}

INTENT: GENERATE_TERMO
  Quando usar: O usuário pede para gerar/criar um termo, acordo, autorização ou documento.
  Campos a preencher no Payload (se souber, ou pergunte o que faltar):
  {
    "termoId": "tpl-nda",  // ID exato do catálogo acima (ex: tpl-banco-horas se pediu banco de horas)
    "extractedData": {
      "NOME DA EMPRESA": "Razão Social extraída ou do sistema",
      "CNPJ DA EMPRESA": "XX.XXX.XXX/XXXX-XX",
      "ENDEREÇO DA EMPRESA": "Endereço extraído ou do sistema",
      "TELEFONE DA EMPRESA": "Telefone extraído ou do sistema",
      "EMAIL DA EMPRESA": "Email extraído ou do sistema",
      "NOME DO COLABORADOR": "Nome extraído",
      "CPF DO COLABORADOR": "CPF extraído",
      "DATA": "Data extraída (ex: 25/08/2026)",
      "CIDADE/UF": "Cidade - UF"
    }
  }
  REGRA: O frontend processará o PDF avançado. Se o usuário enviar PDF, deixe extractedData vazio e apenas acione a intenção. Se ele enviar texto livre (ex: "Gere termo de banco de horas pro Joao da empresa X"), extraia e preencha "extractedData" com NOME DO COLABORADOR e CPF DO COLABORADOR (buscando dados da empresa no contexto) e informe o termoId correto. MANTENHA AS CHAVES EXATAS EM CAIXA ALTA (ex: "NOME DO COLABORADOR").

INTENT: CREATE_KANBAN_TASK
  Quando usar: O usuário pede para criar um cartão, tarefa, demanda ou registrar algo no Kanban/quadro.
  Payload:
  {
    "title": "Descrição da tarefa",
    "status": "ENTRADA DE DEMANDAS"  // ou "URGENTE"
  }

INTENT: UPDATE_KANBAN_TASK
  Quando usar: O usuário pede para mover, concluir, arquivar ou editar um cartão existente.
  Payload:
  {
    "taskId": "ID do cartão (obtido do contexto CARTÕES DO KANBAN)",
    "updates": {
      "status": "CONCLUIDO",     // ou outra coluna
      "title": "Novo título",    // opcional
      "archived": true           // opcional, para arquivar
    }
  }

INTENT: UPDATE_FECHAMENTO_FOLHA
  Quando usar: O usuário pede para atualizar o status do fechamento de folha de uma empresa, como enviar DCTF, marcar FGTS como OK, alterar observações, etc.
  Payload:
  {
    "empresaId": "ID da empresa (busque no contexto de EMPRESAS)",
    "monthKey": "Chave do mês a atualizar, ex: '2026-08', ou a string literal 'ATUAL' se referir ao mês atual",
    "field": "Campo a ser modificado. Escolha UM: 'lancamento', 'consignado', 'adiantamento', 'fgts', 'dctf', 'guiaSindicato', 'verificarEnvio', 'observacoes', 'tipoFolha'",
    "value": "O novo valor. Ex: 'OK', 'PENDENTE', 'NÃO TEM', etc. Se for observação, o texto livre."
  }

INTENT: CREATE_CALENDAR_EVENT
  Quando usar: O usuário pede para criar um lembrete, agendar reunião, marcar prazo ou evento.
  Payload:
  {
    "title": "Descrição do evento",
    "type": "REMINDER",
    "date": 1724500800000,
    "empresaId": "ID da empresa (se aplicável)"
  }

INTENT: CREATE_CHECKLIST_RULE
  Quando usar: O usuário pede para criar uma regra de checklist, obrigação recorrente ou tarefa fixa.
  Payload:
  {
    "taskName": "Nome da tarefa",
    "type": "FOLHA",
    "targetType": "SPECIFIC_EMPRESA",
    "targetId": "ID da empresa",
    "dueDateRule": "FIXED_DAY",
    "dayValue": 5
  }

INTENT: GENERATE_RECIBO
  Quando usar: O usuário pede para gerar um recibo (pagamento, pró-labore, adiantamento, etc).
  Campos a preencher no Payload (se souber, ou pergunte o que faltar):
  {
    "nomeFuncionario": "Nome do favorecido/funcionário",
    "empresaNome": "Nome da empresa pagadora",
    "mesAno": "Ex: 2026-04 (MANDATÓRIO usar formato YYYY-MM para Competência/Mês)",
    "salarioBaseContratual": 1548.80 (Opcional: O salário mensal integral APENAS NUMÉRICO, sem R$),
    "diasTrabalhados": 30 (Opcional: Quantos dias trabalhou no mês),
    "valor": 1548.80 (Opcional: O valor específico a pagar APENAS NUMÉRICO, se diferente do salário),
    "referenteA": "Ex: Salário de Abril"
  }

INTENT: GENERATE_TRCT
  Quando usar: O usuário pede para gerar um Termo de Rescisão (TRCT).
  Campos a preencher no Payload (se souber, ou pergunte o que faltar):
  {
    "cnpj": "XX.XXX.XXX/XXXX-XX (Busque na lista de EMPRESAS CADASTRADAS se tiver o nome)",
    "razaoSocial": "Nome da empresa empregadora",
    "enderecoEmpresa": "Endereço",
    "municipioEmpresa": "Município",
    "cpf": "CPF do trabalhador",
    "pis": "PIS do trabalhador",
    "ctps": "CTPS do trabalhador",
    "nome": "Nome completo do trabalhador",
    "dataAdmissao": "YYYY-MM-DD",
    "dataAfastamento": "YYYY-MM-DD",
    "causaAfastamento": "Ex: Dispensa sem justa causa",
    "remuneracaoMesAnterior": 1500.00 (Numérico),
    "descontarINSS": true,
    "rescisaoAntecipada": false
  }

═══════════════════════════════════════════════
CATÁLOGO DE MÓDULOS E CAMPOS DO SISTEMA
═══════════════════════════════════════════════
O sistema possui os seguintes módulos e campos que podem ser preenchidos:

1. RECIBOS (GENERATE_RECIBO):
   - Dados da Empresa: Nome, CNPJ, Endereço, Mês/Ano de Referência, Tipo de Recibo (Salário, Pró-Labore).
   - Dados do Funcionário: Código, Nome, Função, Salário Integral, Dias Trabalhados.
   - Rubricas: Descrição, Valor.

2. TRCT - RESCISÃO (GENERATE_TRCT):
   - Dados do Empregador: CNPJ, Razão Social, Endereço, Município. (IMPORTANTE: Se o usuário informar a empresa, busque o CNPJ nas EMPRESAS CADASTRADAS).
   - Dados do Trabalhador: CPF, Nome Completo, PIS, CTPS.
   - Dados do Contrato: Admissão, Afastamento, Causa do Afastamento, Remuneração Base (Mês Anterior).
   - Detalhes: Rescisão Antecipada (Sim/Não)? Calcular e Descontar INSS (Sim/Não)?

3. TERMOS E ACORDOS (GENERATE_TERMO):
   - Varia conforme o termo, mas geralmente exige: Nome da Empresa, CNPJ, Nome do Funcionário, CPF, Cidade e Data.

4. KANBAN (CREATE_KANBAN_TASK):
   - Campos: Título/Descrição da Tarefa, Status/Coluna de destino.

5. CALENDÁRIO (CREATE_CALENDAR_EVENT):
   - Campos: Título, Descrição, Data, Tipo de Evento (Lembrete, Prazo, Fechamento).

═══════════════════════════════════════════════
FLUXO INTERATIVO DE ATENDIMENTO (OBRIGATÓRIO)
═══════════════════════════════════════════════
1. Quando o usuário pedir para gerar algo (um recibo, TRCT, termo, etc), VOCÊ NÃO DEVE GERAR O INTENT DE IMEDIATO se ele não fornecer os dados.
2. PRIMEIRO: Faça um resumo amigável do que ele pediu.
3. SEGUNDO: Liste claramente quais informações você JÁ TEM baseadas no pedido dele.
4. TERCEIRO: Liste quais campos importantes do Catálogo de Módulos (acima) estão FALTANDO.
5. QUARTO: Pergunte se ele quer informar esses dados agora no chat, OU se ele prefere que você envie os dados incompletos para o sistema para que ele mesmo preencha o resto diretamente na tela.
6. SOMENTE QUANDO O USUÁRIO CONFIRMAR (ex: "pode gerar assim mesmo", "pode enviar pro sistema", "sim", "confirmo") ou informar todos os dados necessários, é que você deve emitir o bloco "intents" preenchido. Enquanto estiver na fase de questionamento, deixe "intents": [] vazio.

═══════════════════════════════════════════════
FORMATO DE SAÍDA (JSON ESTRITO E OBRIGATÓRIO):
═══════════════════════════════════════════════

Retorne SEMPRE e APENAS um JSON válido neste formato:
{
  "text": "Sua resposta amigável e conversacional (Markdown permitido). Se propondo ações ou questionando dados faltantes, faça isso aqui.",
  "intents": [
    {
      "action": "CLEAN_BOLETO | GENERATE_TERMO | CREATE_KANBAN_TASK | UPDATE_KANBAN_TASK | CREATE_CALENDAR_EVENT | CREATE_CHECKLIST_RULE | GENERATE_RECIBO | GENERATE_TRCT",
      "payload": { ... }
    }
  ]
}

REGRAS:
- ANÁLISE DE DADOS FALTANTES (MUITO IMPORTANTE): Ao perceber que o usuário quer executar uma ação no sistema, siga o FLUXO INTERATIVO acima. Resuma, liste o que tem, liste o que falta daquele módulo, e PERGUNTE. SÓ GERE O INTENT QUANDO o usuário confirmar ou prover tudo.
- Se o usuário confirmar continuar faltando dados, gere o intent com os campos que você tem e deixe os outros em branco ou nulos. O sistema preencherá a tela com os que você enviar.
- REGRA DE REINÍCIO (MUITO IMPORTANTE): Sempre que o usuário pedir para gerar um novo termo, recibo ou TRCT (mesmo que ele já tenha pedido um antes na mesma conversa), VOCÊ DEVE IGNORAR COMPLEMENTAMENTE os dados da solicitação anterior. Comece a extração ou o preenchimento do zero apenas com os dados fornecidos na solicitação atual. Nunca misture dados de um pedido antigo no novo.
- EXTRAÇÃO DE PDF (TRCT, RECIBO, TERMO): Se o usuário anexar um arquivo PDF no chat e pedir para gerar qualquer documento (TRCT, Recibo, Termos, etc), você NÃO DEVE extrair ou ler os dados do PDF. Apenas gere o INTENT correspondente (ex: GENERATE_TRCT, GENERATE_RECIBO, GENERATE_TERMO) deixando os campos de payload vazios ou com os dados que o usuário digitou no texto. O frontend do sistema possui um motor interno potente que fará a extração do PDF na respectiva tela automaticamente.
- Se o usuário só faz uma pergunta sem pedir ação, retorne "intents": [] (array vazio).
- Se o usuário pedir múltiplas ações (ex: "gere o termo E crie um cartão no kanban"), inclua TODAS no array "intents".
- Sempre peça confirmação antes de executar ações destrutivas (mover, arquivar, excluir).
- Para dúvidas sobre CLT, responda baseado no seu conhecimento. Para CCTs, use APENAS o texto fornecido.
- Ao gerar termos, se o usuário mencionar uma empresa pelo nome, cruze com a lista de EMPRESAS CADASTRADAS para obter CNPJ e dados corretos.
`;

      let systemInstruction = baseInstruction;
      const dataAtualFormatada = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'full', timeZone: 'America/Sao_Paulo' }).format(new Date());

      if (cctText) {
        systemInstruction = `Você é o Centro de Comando Universal do 'Simples Contábil'.
DATA ATUAL DO SISTEMA: ${dataAtualFormatada} (${new Date().toISOString().slice(0, 10)})

Abaixo, forneço o texto integral e atualizado da Convenção Coletiva de Trabalho (CCT) do sindicato aplicável a este contexto:
---
${cctText}
---
**SUAS REGRAS DE CONDUTA E VERIFICAÇÃO DE VIGÊNCIA (OBRIGATÓRIO):**
1. **SAÍDA PADRONIZADA E CONCISA DA VIGÊNCIA (SEM TEXTOS LONGOS OU NOTAS PROLIXAS):** 
   - Sempre identifique no texto a cláusula de vigência (ex: "CLÁUSULA PRIMEIRA - VIGÊNCIA E DATA-BASE", períodos como "01/XX/YYYY a 31/XX/YYYY").
   - Compare o período de vigência com a DATA ATUAL DO SISTEMA (${dataAtualFormatada}).
   - Se a CCT estiver **VENCIDA** perante a data atual: inicie obrigatoriamente a resposta com o alerta em destaque no formato:
     ⚠️ **ALERTA CCT VENCIDA DESDE DD/MM/AAAA**
   - Se a CCT estiver **VIGENTE**: inclua a vigência de forma simples e direta em uma única linha (ao final da resposta ou após a citação):
     **VIGÊNCIA CCT:** DD/MM/AAAA a DD/MM/AAAA
   - **IMPORTANTE:** É ESTRITAMENTE PROIBIDO gerar parágrafos longos, notas explicativas, justificativas ou comentários discursivos sobre a vigência (como "Nota sobre a vigência: Conforme a Cláusula Primeira...", "Como a data atual do sistema é..."). A informação de vigência deve se limitar unicamente à linha padrão especificada.
2. **FIDELIDADE E ZERO ALUCINAÇÃO:** Responda à dúvida do usuário baseando-se **EXCLUSIVAMENTE** nas cláusulas do texto da CCT acima. Cite o número da cláusula sempre que possível.
3. **POSTURA CONSULTIVA CASO NÃO CONSTE:** Se a regra solicitada não constar expressamente no texto fornecido, **NÃO INVENTE** nem presuma regras. Adote uma postura consultiva, respondendo: *'Analisei a Convenção Coletiva anexada, mas não encontrei regras específicas sobre [Tema]. Essa dúvida refere-se a algo fora do escopo desta convenção? Posso consultar as regras gerais da CLT para você, se desejar.'*

Além disso, siga estas instruções gerais para a formatação da sua resposta JSON:
${baseInstruction}`;
      }

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

      // Handle PDF and history correctly
      let requestContents = history;
      if (pdfBase64 && requestContents.length > 0) {
        // Encontra a última mensagem do user e avisa que um PDF foi anexado,
        // mas NÃO passamos o binário do PDF para a IA para economizar tokens e tempo,
        // pois a extração pesada ocorrerá no frontend via /api/extract-pdf
        const lastUserMessage = requestContents[requestContents.length - 1];
        if (lastUserMessage.role === 'user') {
          lastUserMessage.parts.push({ text: `[AVISO DE SISTEMA: O usuário anexou um arquivo PDF chamado "${pdfName || 'documento.pdf'}", mas o conteúdo não foi enviado para você ler. Siga as instruções de gerar o INTENT sem extrair os dados.]` });
        }
      }

      for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
        const currentModel = modelsToTry[attempt];
        usedModel = currentModel;
        usedAttempts = attempt + 1;
        try {
          const response = await ai.models.generateContent({
            model: currentModel,
            contents: requestContents,
            config: {
              systemInstruction: systemInstruction,
              temperature: 0.3,
              responseMimeType: "application/json"
            }
          });
          responseText = response.text || '{}';
          break; // Sucesso, sai do loop
        } catch (err: any) {
          lastError = err;
          if (attempt === modelsToTry.length - 1) {
             console.error(`Chat - Todas as tentativas falharam. Último erro:`, err.message);
             throw lastError;
          }
          await new Promise(resolve => setTimeout(resolve, (attempt + 1) * 2000));
        }
      }

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (e) {
        parsedResponse = { text: responseText, intents: [] };
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
      console.error(error);
      res.status(500).json({ error: 'Erro interno ao processar conversa com IA.' });
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
  "telefone": "telefone formatado",
  "email": "email se existir",
  "enderecoCompleto": "endereço completo contendo logradouro, número, complemento, bairro, município/UF e CEP"
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
          lastError = err;
          // Se for a última tentativa, lança o erro para o catch externo
          if (attempt === modelsToTry.length - 1) {
             console.error(`Extract-PDF - Todas as tentativas falharam. Último erro:`, err.message);
             throw lastError;
          }
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
      console.error(error);
      res.status(500).json({ error: 'Falha interna ao gerar a planilha.' });
    }
  });

  // --- Função Central de Envio de Lembretes Cron ---
  const processCronReminders = async (force: boolean = false) => {
    try {
      if (!process.env.RESEND_API_KEY || !process.env.USER_EMAIL) {
        console.error('Cron Error: Configurações de e-mail ausentes no servidor.');
        return { success: false, message: 'Configurações de e-mail ausentes no servidor.' };
      }

      const resend = new Resend(process.env.RESEND_API_KEY);
      const db = getFirestore(firestoreDatabaseId);

      // Helpers para lidar com timezone de Brasília sem depender de bibliotecas extras
      const getBrtDate = (date = new Date()) => {
        const brtString = date.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" });
        return new Date(brtString);
      };

      const today = getBrtDate();
      
      // Checa a configuração do usuário no banco
      const configDoc = await db.collection('config').doc('settings').get();
      const configData = configDoc.data() || {};
      const targetHour = configData.cronHour !== undefined ? Number(configData.cronHour) : 7; // Default 07:00
      
      if (!force && today.getHours() !== targetHour) {
         console.log(`Cron check skipped. Current BRT hour (${today.getHours()}) !== targetHour (${targetHour}).`);
         return { success: true, count: 0, message: `Horário não corresponde. Atual: ${today.getHours()}, Esperado: ${targetHour}` };
      }

      const isFriday = today.getDay() === 5;
      
      const targetDays = [today];
      if (isFriday) {
        targetDays.push(addDays(today, 1));
        targetDays.push(addDays(today, 2));
      }

      const snapshot = await db.collection('calendarEvents').get();
      const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      let reminders: any[] = [];

      targetDays.forEach(targetDay => {
         events.forEach((e: any) => {
            let matchDate = false;
            if (e.isRecurrent) {
                if (e.recurrentRule === 'DAILY') {
                  matchDate = true;
                } else if (e.recurrentRule === 'WEEKLY') {
                  const eventBrtDate = getBrtDate(new Date(e.date));
                  matchDate = targetDay.getDay() === eventBrtDate.getDay();
                } else if (e.recurrentRule === 'NEAR_5' || e.recurrentRule === 'NEAR_20' || e.recurrentRule === 'NEAR_30') {
                  let target = e.recurrentRule === 'NEAR_5' ? 5 : (e.recurrentRule === 'NEAR_20' ? 20 : 30);
                  let targetD = new Date(targetDay.getFullYear(), targetDay.getMonth(), target);
                  
                  let dayOfWeek = targetD.getDay();
                  if (dayOfWeek === 6) targetD = subDays(targetD, 1);
                  else if (dayOfWeek === 0) targetD = subDays(targetD, 2);
                  
                  matchDate = targetD.getDate() === targetDay.getDate();
                } else if (e.recurrentRule === 'YEARLY') {
                  matchDate = (e.recurrentDay === targetDay.getDate() && e.recurrentMonth === targetDay.getMonth());
                } else {
                  // MONTHLY_EXACT or fallback
                  matchDate = (e.recurrentDay === targetDay.getDate());
                }
            } else {
               const eventBrtDate = getBrtDate(new Date(e.date));
               matchDate = isSameDay(eventBrtDate, targetDay);
            }

            if (matchDate) {
               reminders.push({ ...e, targetDay });
            }
         });
      });

      // --- BUSCAR TAREFAS URGENTES DO KANBAN ---
      const kanbanSnapshot = await db.collection('kanban_tasks').get();
      const urgentTasks = kanbanSnapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() } as any))
        .filter(t => t.status === 'URGENTE' && t.archived !== true);

      if (reminders.length === 0 && urgentTasks.length === 0) {
        console.log('Cron Job Executado: Nenhum lembrete encontrado para envio.');
        return { success: true, count: 0, message: 'Nenhum lembrete encontrado para envio.' };
      }

      const uniqueReminders = reminders.filter((v, i, a) => a.findIndex(t => (t.id === v.id && t.targetDay.getTime() === v.targetDay.getTime())) === i);
      uniqueReminders.sort((a, b) => a.targetDay.getTime() - b.targetDay.getTime() || (a.title || '').localeCompare(b.title || ''));

      let html = `
        <div style="font-family: Arial, sans-serif; color: #333333; max-width: 600px; line-height: 1.6;">
          <h2 style="color: #2563eb; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 0;">Lembretes Diários</h2>
          <p>Bom dia! Aqui estão as tarefas programadas para <strong>${isFriday ? 'este fim de semana' : 'hoje'}</strong>:</p>
          <ul style="padding-left: 20px;">
      `;
      
      uniqueReminders.forEach(r => {
         const dateStr = format(r.targetDay, "dd 'de' MMMM", { locale: ptBR });
         html += `
            <li style="margin-bottom: 12px;">
              <strong>${r.title}</strong><br>
              ${r.empresaNome ? `<span style="color: #4b5563;">Empresa: ${r.empresaNome}</span><br>` : ''}
              <span style="color: #6b7280; font-size: 0.9em;">📅 Data: ${dateStr}</span>
            </li>
         `;
      });
      
      html += `
        </ul>
      `;

      // --- INJETAR TAREFAS URGENTES NO HTML ---
      if (urgentTasks.length > 0) {
        html += `
          <h2 style="color: #dc2626; border-bottom: 1px solid #e5e7eb; padding-bottom: 8px; margin-top: 32px;">Demandas Urgentes (Kanban)</h2>
          <ul style="padding-left: 20px;">
        `;
        
        urgentTasks.forEach(t => {
          html += `
            <li style="margin-bottom: 8px;"><strong>${t.title}</strong></li>
          `;
        });

        html += `</ul>`;
      }

      html += `
          <p style="margin-top: 32px; font-size: 0.9em; color: #6b7280; border-top: 1px solid #e5e7eb; padding-top: 16px;">
            Para mais detalhes, acesse o painel do sistema.
          </p>
        </div>
      `;

      const { data, error } = await resend.emails.send({
        from: 'DP Simples <onboarding@resend.dev>',
        to: [process.env.USER_EMAIL],
        subject: `Lembretes de DP - ${format(today, "dd/MM/yyyy")}`,
        html: html
      });

      if (error) {
        console.error('Resend Validation Error details:', error);
        return { success: false, error: error.message || 'Erro da API do Resend', details: error };
      }

      console.log('Cron Job Executado: E-mail de lembretes enviado com sucesso.', uniqueReminders.length, 'eventos.');
      return { success: true, count: uniqueReminders.length, message: 'E-mail enviado com sucesso.', data };

    } catch (error: any) {
      console.error('Process Cron Reminders Error:', error);
      return { success: false, error: error.message || 'Falha ao processar Cron Job.' };
    }
  };

  // Schedule internal background cron job (Runs on server, not reliant on external vercel cron)
  // Run every hour on weekdays (Monday-Friday) in America/Sao_Paulo timezone
  cron.schedule('0 * * * 1-5', async () => {
    console.log('Running scheduled hourly cron reminders check (BRT)...');
    await processCronReminders();
  }, {
    timezone: "America/Sao_Paulo"
  });

  app.post('/api/webhook/admissao', async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return res.status(401).json({ error: 'Acesso não autorizado.' });
      }

      const { nome, empresa } = req.body;
      const db = getFirestore(firestoreDatabaseId);

      await db.collection('kanban_tasks').add({
        title: `Nova Admissão Trello: ${empresa || 'Empresa'} - ${nome || 'Candidato'}`,
        status: 'URGENTE',
        order: Date.now(),
        createdAt: Date.now(),
        archived: false
      });

      res.json({ success: true });
    } catch (error: any) {
      console.error('Webhook Error:', error);
      res.status(500).json({ error: 'Erro no webhook' });
    }
  });

  app.get('/api/cron-reminders', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return res.status(401).json({ error: 'Acesso não autorizado.' });
    }

    const result = await processCronReminders(true); // Always force run when hit via API
    if (result.success) {
      return res.json(result);
    } else {
      return res.status(500).json(result);
    }
  });

  app.post('/api/test-email', requireApiKey, async (req, res) => {
    try {
      if (!process.env.RESEND_API_KEY || !process.env.USER_EMAIL) {
        return res.status(500).json({ error: 'Configurações de e-mail ausentes no servidor (RESEND_API_KEY ou USER_EMAIL).' });
      }

      const resend = new Resend(process.env.RESEND_API_KEY);

      const { data, error } = await resend.emails.send({
        from: 'DP Simples <onboarding@resend.dev>',
        to: [process.env.USER_EMAIL],
        subject: 'Email Teste - DP Simples',
        html: '<p>Este é um email de teste enviado do sistema. Tudo está funcionando corretamente!</p>'
      });

      if (error) {
        console.error('Resend Validation Error details:', error);
        return res.status(400).json({ error: error.message || 'Erro da API do Resend', details: error });
      }

      res.json({ success: true, message: 'E-mail de teste enviado com sucesso.', data });
    } catch (error: any) {
      console.error('Test Email Error:', error);
      console.error(error);
      res.status(500).json({ error: 'Falha interna ao processar E-mail Teste.' });
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
          const vitePkg = 'vite';
          const { createServer: createViteServer } = await import(/* @vite-ignore */ vitePkg);
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

        app.listen(PORT, "0.0.0.0", () => {
          console.log(`Server running on http://localhost:${PORT}`);
        });
      } catch (err) {
        console.error('Erro ao inicializar o servidor dev:', err);
      }
    })();
  }

  export default app;
