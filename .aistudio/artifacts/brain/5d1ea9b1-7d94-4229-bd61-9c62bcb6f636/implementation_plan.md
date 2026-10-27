# Evolução do Relatório de 13º Salário — Colunas de FGTS e Tributos (INSS/IRRF)

Atualização da planilha interativa e do relatório A4 em Papel Timbrado de **13º Salário** para adicionar duas novas colunas: **FGTS** (apenas extraído do PDF/imagem, permanecendo em branco quando não enviado) e **INSS / IRRF** (calculado automaticamente pelas tabelas vigentes do sistema, descontado na 2ª Parcela e acompanhado de nota técnica no PDF).

## User Review & Critical Decisions

> [!IMPORTANT]
> As decisões abaixo foram confirmadas diretamente na etapa de alinhamento:

- **Desconto de INSS e IRRF na 2ª Parcela**: O valor apurado de tributos (`INSS + IRRF`) será descontado automaticamente do valor da **2ª Parcela**, mantendo a **1ª Parcela** em 50% do 13º bruto (sem descontos) e entregando a **2ª Parcela** líquida.
- **Unificação de INSS + IRRF na Mesma Coluna e Observação no PDF**: Quando o 13º bruto atingir faixa tributável de IRRF, o valor será somado junto ao INSS na mesma coluna de tributos (`INSS / IRRF`), acompanhado de observação destacada no PDF informando que se trata de um valor aproximado de tributos (entre INSS e IRRF), sujeito a variações conforme a tabela vigente.
- **Coluna FGTS Sem Cálculo Automático**: O campo de **FGTS** nunca será calculado pelo sistema; ele será preenchido exclusivamente quando extraído do relatório enviado (PDF/print). Caso o colaborador seja inserido manualmente ou o arquivo não traga a coluna de FGTS, o campo ficará **em branco** (`—` ou vazio), continuando livre para edição manual caso o usuário deseje preencher ou limpar.

---

## 1. Overview & Core Concept

- **What It Does**: Amplia o Gerador de Relatório de 13º Salário com a extração da coluna **FGTS** do relatório contábil original e a apuração automática de **INSS + IRRF** sobre o 13º proporcional + médias, abatendo os tributos diretamente na **2ª Parcela** e exibindo aviso explícito no PDF timbrado sobre a natureza estimada dos encargos.
- **Target Audience / Persona**: Analistas e gestores de Departamento Pessoal da **Simples Assessoria Contábil**.
- **Key Value**: Entrega ao cliente final uma visão completa e transparente do desembolso de 13º salário (1ª parcela integral de 50%, tributos estimados de INSS/IRRF, 2ª parcela líquida já deduzida de encargos do empregado e o FGTS extraído do relatório de provisão).

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Extração por IA (PDF, Imagem ou Ctrl+V)**: A IA passa a extrair também o valor da coluna `FGTS` (dentro de `Encargos` no relatório original). Se o valor constar no documento, preenche a coluna `FGTS`; caso contrário (ou em linhas criadas manualmente), mantém o campo em branco.
  2. **Cálculo Automático e Reativo de INSS/IRRF e 2ª Parcela**:
     - Base do 13º Bruto = `((Salário Base / 12) × Avos) + Médias`.
     - **1ª Parcela** = `50%` do 13º Bruto (sem descontos).
     - **INSS / IRRF** = `calcularINSS_CLT(Base 13º) + calcularIRRF(Base 13º, INSS, 0).valor`.
     - **2ª Parcela (Líquida)** = `Base 13º - 1ª Parcela - (INSS + IRRF)`.
     - Qualquer alteração em **Data de Admissão**, **Avos**, **Salário Base** ou **Médias** recalcula instantaneamente a **1ª Parcela**, o **INSS/IRRF** e a **2ª Parcela**, sem alterar nem calcular o **FGTS**.
     - Se o usuário editar manualmente o campo de **INSS/IRRF**, a **2ª Parcela** reage descontando o novo valor informado.
  3. **Exportação em PDF com Papel Timbrado**:
     - A tabela A4 passa a contemplar as colunas separadas: **Nome**, **Admissão**, **Avos**, **Salário**, **Médias**, **1ª Parcela**, **2ª Parcela**, **INSS/IRRF** e **FGTS**.
     - Linha de **Total Geral** soma Salário, Médias, 1ª Parcela, 2ª Parcela, INSS/IRRF e FGTS (somando apenas as linhas que possuem FGTS preenchido).
     - Box de **Observação Importante** no rodapé da tabela A4 (com CSS 100% inline) destacando que *os valores de INSS e IRRF são aproximados e calculados com base na tabela vigente, podendo sofrer variações no fechamento oficial da folha*.

- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Utilitário contábil de alta precisão na interface dark (`#020617` / `#0F172A`) e documento executivo clássico no Papel Timbrado A4 (`#FFFFFF`, azul-marinho `#0F172A` e dourado `#D1A751`).
  - *Typography & Hierarchy*: Valores monetários, datas e avos em fonte monoespaçada com algarismos tabulares (`font-mono tabular-nums`) para alinhamento decimal rigoroso.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: FGTS Estritamente Extraído ou em Branco (`number | null`)**
  - *Chosen Approach*: Representar o FGTS como `number | null` no estado de cada linha. Quando `null`, o input na planilha exibe vazio (`""` com placeholder `"EM BRANCO"`) e no PDF exibe `—` (ou espaço em branco), sem nunca rodar `base * 0.08`.
  - *Why*: Atende literalmente à regra de negócio solicitada pelo usuário de não calcular FGTS automaticamente e deixá-lo em branco caso não venha do PDF/imagem.
- **Decision 2: Cálculo de Tributos com a Tabela Oficial do Sistema (`tributos.ts`)**
  - *Chosen Approach*: Reutilizar `calcularINSS_CLT` (tabela progressiva 2026 com teto de R$ 8.475,55) e `calcularIRRF` (tabela progressiva com desconto simplificado/legal e redutor da Lei 15.270/2025) já homologados no módulo de recibos.
  - *Why*: Garante consistência absoluta entre os cálculos de holerite e o relatório de 13º salário.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Data Flow Diagram

```
┌────────────────────────────────────────────────────────────────────────────┐
│                   Upload PDF / Imagem / Colar (Ctrl+V)                     │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│              Backend (/api/extract-pdf -> type: 'relatorio_13')            │
│  Extrai: nome, dataAdmissao, avos, salario13Proporcional, medias, fgts     │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│               Motor Reativo de Cálculo (ReciboApp.tsx)                     │
│  1. Salário Base = (salario13Proporcional * 12) / avos                     │
│  2. Total 13º Bruto = ((Salário Base / 12) * avos) + Médias                │
│  3. 1ª Parcela = 50% do Total 13º Bruto                                    │
│  4. INSS/IRRF = calcularINSS_CLT(Total 13º) + calcularIRRF(Total 13º)      │
│  5. 2ª Parcela = Total 13º Bruto - 1ª Parcela - INSS/IRRF                  │
│  6. FGTS = valor extraído do PDF (ou null / em branco se não enviado)      │
└─────────────────────────────────────┬──────────────────────────────────────┘
                                      │
                                      ▼
┌────────────────────────────────────────────────────────────────────────────┐
│      Planilha Editável + Impressão A4 Timbrada com Nota de Tributos        │
└────────────────────────────────────────────────────────────────────────────┘
```

### Interactive Component & State Mapping
- **Edição de `dataAdmissao`**: Atualiza `avos` -> recalcula `parcela1`, `inssIrrf` e `parcela2` (mantendo `fgts` intocado).
- **Edição de `avos`, `salarioBase` ou `medias`**: Recalcula `parcela1`, `inssIrrf` e `parcela2` (mantendo `fgts` intocado).
- **Edição de `inssIrrf`**: Atualiza o desconto de tributos e recalcula `parcela2 = max(0, totalBruto - parcela1 - novoInssIrrf)`.
- **Edição de `fgts`**: Permite digitar um valor manual ou apagar tudo para voltar ao estado em branco (`null`).
