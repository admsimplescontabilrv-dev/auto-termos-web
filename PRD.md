# Product Requirements Document (PRD) - Sistema de Gestão Integrada

## 1. Visão Geral do Produto
O sistema é uma plataforma web full-stack desenvolvida para centralizar e otimizar as operações financeiras, de recursos humanos, operacionais e de comunicação de uma organização. O sistema permite a gestão multi-empresas e a emissão de documentos trabalhistas e financeiros, além de acompanhamento operacional via checklists e banco de horas.

## 2. Stack Tecnológico e Arquitetura
- **Frontend:** React 18+ (com Hooks e Functional Components), TypeScript, Vite, Tailwind CSS.
- **Backend/API:** Node.js com Express (`server.ts`).
- **Banco de Dados:** Firebase Firestore (`src/hooks/useFirestore.ts`, `src/lib/firebase.ts`).
- **Autenticação:** Firebase Auth (`src/auth.ts`).
- **Integrações de IA/Processamento:** Extração e processamento de PDFs via backend (`api/extract-pdf.ts`, `src/pdfUtils.ts`).

## 3. Módulos e Funcionalidades Principais (Features)

### 3.1. Dashboard (`DashboardApp.tsx`)
- Visão geral consolidada dos indicadores principais.
- Ponto de partida e navegação para os demais sub-aplicativos.

### 3.2. Gestão de Empresas (`EmpresasApp.tsx`)
- Cadastro e gerenciamento de múltiplas empresas e filiais.
- Base de dados estrutural para vincular colaboradores, recibos e checklists às respectivas entidades.

### 3.3. Recursos Humanos (Departamento Pessoal)
- **Banco de Horas (`BancoDeHorasApp.tsx`):**
  - Gestão de colaboradores (`ColaboradoresTab.tsx`).
  - Lançamento de horas trabalhadas, faltas e extras (`LancamentosTab.tsx`).
  - Resumo de saldos e relatórios (`ResumoTab.tsx`).
  - Layout para impressão de relatórios de banco de horas (`LayoutPrintBancoHoras.tsx`).
- **TRCT - Termo de Rescisão do Contrato de Trabalho (`TrctApp.tsx`):**
  - Cálculo e formatação de verbas rescisórias (`utils/tributos.ts`).
  - Geração de documento de rescisão para impressão (`LayoutTRCT.tsx`).

### 3.4. Financeiro
- **Recibos (`ReciboApp.tsx`):**
  - Emissão, controle e histórico de recibos de pagamento.
  - Layout específico de impressão (`LayoutRecibo.tsx`).
- **Boletos (`BoletoApp.tsx`):**
  - Geração, importação ou controle de boletos bancários.
  - Funcionalidade de parsing e leitura de dados financeiros.

### 3.5. Operacional e Produtividade
- **Checklists (`ChecklistsApp.tsx`):**
  - Criação, preenchimento e controle de checklists operacionais e de rotina.
  - Aba de relatórios analíticos (`RelatoriosChecklistTab.tsx`).
  - Impressão de resultados (`LayoutPrintRelatorioChecklist.tsx`).
- **Calendário (`CalendarioApp.tsx`):**
  - Agendamento de eventos, feriados e prazos importantes (ex: vencimento de boletos, férias).
- **Comunicação (`ChatApp.tsx`):**
  - Módulo de chat para comunicação interna entre usuários do sistema.

## 4. Requisitos Não Funcionais
- **Segurança:** Acesso protegido por Firebase Auth. As regras de banco de dados (`firestore.rules`) garantem que os dados só sejam acessados por usuários autenticados e autorizados.
- **Responsividade:** A interface web (desenvolvida com Tailwind CSS) deve se adaptar a diferentes tamanhos de tela (desktop, tablet, mobile).
- **Impressão e Exportação:** O sistema foca fortemente em layouts de impressão (`LayoutPrint*.tsx`) adequados para folhas A4, permitindo salvar como PDF via navegador.
- **Modularidade:** Aplicações separadas em módulos independentes (`App.tsx` servindo como orquestrador) para facilitar manutenção e escalabilidade.

## 5. Casos de Uso (Testes Recomendados)
Para a ferramenta de análise de código, recomenda-se focar nos seguintes fluxos:
1. **Autenticação:** Login de usuário e proteção das rotas.
2. **Cálculos de RH:** Validação das lógicas matemáticas em `utils/tributos.ts` e cálculo de saldos em `BancoDeHorasApp.tsx`.
3. **Persistência de Dados:** Fluxo de CRUD (Create, Read, Update, Delete) utilizando o hook customizado `useFirestore.ts`.
4. **Extração de PDF:** Envio de arquivo para `api/extract-pdf.ts` e tratamento do retorno pelo frontend.
5. **Renderização de Impressão:** Verificação de que os componentes `Layout*` renderizam de forma limpa, ocultando botões e menus durante o `window.print()`.

---
*Documento gerado automaticamente para fins de análise estrutural e de código.*
