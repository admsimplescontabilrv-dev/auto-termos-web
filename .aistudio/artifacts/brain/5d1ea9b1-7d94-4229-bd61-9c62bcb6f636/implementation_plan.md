# Plano de Implementação: Parametrização da Data de Pagamento da Assistencial Laboral

Parametrização da regra e data de pagamento da **Contribuição Assistencial Laboral** no Cadastro de Sindicatos e exibição contextualizada do vencimento na coluna **ASSISTENCIAL LABORAL** da planilha de Fechamento de Folha.

---

## 1. Decisões Alinhadas com o Usuário

- **Exibição na Folha**:
  - Exibir a data/dia de pagamento integrada **diretamente na coluna "Assistencial Laboral"** como detalhe informativo (badge com a data ou dia de recolhimento, ex: `📅 Venc: 10/10` ou `📅 Dia 10 do mês seguinte`), sem criar colunas extras.
- **Configuração no Cadastro de Sindicatos**:
  - Campo no Sindicato para o **Dia de Vencimento / Pagamento** (ex: `10`, `5º dia útil`, `30`, etc.).
  - Seletor da regra do vencimento: **Mês seguinte ao desconto (subsequente)** ou **Mesmo mês**.
- **Comportamento Padrão**:
  - Quando não houver regra estipulada em CCT ou cadastrada para o sindicato, deixar o campo **em branco**, respeitando a particularidade de cada categoria.

---

## 2. Dados Identificados nas CCTs da Base

A partir da leitura dos instrumentos coletivos (CCTs vigentes na base do projeto):
- **Metalúrgica Rio Verde (SIMESGO)**: Até o **dia 10 do mês subsequente** ao desconto.
- **SINDCOB (Comerciários Oeste BA)**: Até o **dia 10 de cada mês subsequente**.
- **SINAT (Comércio Atacadista Distribuidor)**: Até o **dia 10 de cada mês subsequente**.
- **SECOVI (Imobiliárias e Condomínios)**: Até o **10º dia do mês subsequente**.
- **Construção Civil Goiás**: Até o **5º dia útil do mês subsequente**.
- **Comércio de Itapema / Porto Belo**: Até o **dia 30 de novembro**.

---

## 3. Alterações Técnicas e Arquitetura

### A. Tipos TypeScript (`src/types.ts`)
- Estender `Sindicato`:
  ```ts
  export interface Sindicato {
    // ...
    diaVencimentoLaboral?: string; // Ex: '10', '5º dia útil', '30'
    regraVencimentoLaboral?: 'MES_SEGUINTE' | 'MESMO_MES'; // Padrão MES_SEGUINTE
  }
  ```

### B. Cadastro de Sindicatos (`src/EmpresasApp.tsx`)
- **No Modal de Sindicato**:
  - Inserir campo para "Dia de Vencimento / Pagamento da Guia" (com atalhos rápidos: `Dia 10`, `Dia 20`, `5º dia útil`, ou valor numérico/texto livre).
  - Seletor de período: "Mês Subsequente" (padrão CCT) ou "Mesmo Mês".
  - Resumo legível em tempo real (ex: `Vencimento: até dia 10 do mês seguinte ao desconto`).
- **Nos Cards de Sindicato**:
  - Exibir a data/dia de pagamento configurada no resumo do sindicato.

### C. Fechamento de Folha (`src/components/FechamentoFolhaTab.tsx`)
- Na coluna **ASSISTENCIAL LABORAL**:
  - Para a competência atual (ex: 09/2026), se o sindicato possui data de pagamento configurada:
    - Se for numérico (ex: `10`) e `MES_SEGUINTE`: calcula a data exata daquele vencimento (ex: `10/10/2026`).
    - Exibe um badge de detalhe abaixo do seletor de status: `📅 Venc: 10/10` (ou o texto configurado, ex: `📅 5º dia útil`).
  - No relatório de impressão (`handlePrint`) e no layout mobile, incluir o vencimento calculado como detalhe da linha/card.

---

## 4. Critérios de Aceite e Verificação

- [x] Campo de data/dia de pagamento disponível no modal de Sindicato.
- [x] O valor persiste corretamente no Firestore e é exibido nos cards de sindicato.
- [x] Na planilha de Fechamento de Folha, a coluna **ASSISTENCIAL LABORAL** exibe o vencimento da guia de forma compacta e legível.
- [x] Sindicatos sem data definida permanecem em branco sem erros visuais.
- [x] Compilação (`compile_applet`) e checagem de tipos (`tsc`) aprovadas com sucesso.
