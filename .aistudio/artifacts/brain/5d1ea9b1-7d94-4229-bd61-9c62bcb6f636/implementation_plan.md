# Plano de Implementação: Calculadora de Horas Extras & DSR no Gerador de Recibos

Implementação de uma calculadora expansível de **Horas Extras** e **Descanso Semanal Remunerado (DSR)** diretamente na tela de rubricas do `ReciboApp`, fundamentada na legislação trabalhista brasileira (CLT, CF/88, Lei nº 605/1949 e Súmula 172 do TST), com suporte a múltiplos adicionais (50%, 100%, 150%, 200% ou manual), preenchimento flexível (HH:MM ou Decimal), contagem inteligente de calendário com ajuste manual e injeção automática nas rubricas do recibo em 1 clique.

---

## 1. Fundamentação Jurídica & Fórmulas Oficiais (CLT & TST)

1. **Horas Extras (Art. 59 da CLT e Art. 7º, XVI da CF/88):**
   - **Salário-Hora:** $V_h = \frac{\text{Salário Base}}{\text{Divisor de Jornada}}$ (Divisor padrão 220 para 44h semanais, 200 para 40h semanais, 180 para 36h semanais, com campo livre para digitação).
   - **Adicional de Hora Extra:** Mínimo constitucional de 50% em dias úteis/sábados (CF/88 Art. 7º, XVI); 100% em domingos e feriados civis/religiosos não compensados (Lei 605/49, Art. 9º); percentuais superiores conforme Convenção Coletiva de Trabalho - CCT (ex: 60%, 70%, 150%, 200%).
   - **Valor Unitário da Hora Extra:** $V_{he} = V_h \times \left(1 + \frac{\text{Percentual}}{100}\right)$
   - **Total de Horas Extras:** $T_{he} = V_{he} \times \text{Quantidade de Horas (em decimais)}$

2. **DSR sobre Horas Extras (Lei nº 605/1949 e Súmula nº 172 do TST):**
   - *"Computam-se no cálculo do repouso remunerado as horas extras habitualmente prestadas"* (Súmula 172/TST).
   - **Regra de Cálculo Oficial:**
     $$\text{DSR} = \left( \frac{\text{Valor Total das Horas Extras}}{\text{Número de Dias Úteis do Mês}} \right) \times (\text{Número de Domingos e Feriados do Mês})$$
   - **Nota sobre dias úteis:** De acordo com a doutrina e jurisprudência do TST, o sábado é considerado dia útil não trabalhado (salvo quando feriado), devendo somar aos dias úteis na fórmula de apuração do DSR, exceto quando norma coletiva (CCT) dispuser expressamente o sábado como dia de repouso semanal. O componente fornecerá tanto o cálculo automático padrão quanto a edição manual livre dos campos.

---

## 2. Arquitetura da Solução & Componentes

### 2.1. Utilitário de Calendário e Feriados (`src/utils/dsrCalendarUtils.ts`)
- Cálculo automático para qualquer mês/ano de competência:
  - Total de dias do mês.
  - Feriados nacionais fixos e móveis no Brasil (Ano Novo, Tiradentes, Dia do Trabalho, Independência, N. Sra. Aparecida, Finados, Proclamação da República, Consciência Negra, Natal; e móveis calculados por algoritmo de Páscoa: Carnaval, Sexta-feira Santa, Corpus Christi).
  - Identificação de sábados e domingos.
  - Retorno sugerido: `diasUteis` e `domingosFeriados`.

### 2.2. Componente de Painel Expansível de HE & DSR (`src/components/CalculadoraHorasExtrasRecibo.tsx`)
- Integrado na seção de Rubricas/Proventos de `src/ReciboApp.tsx`, com botão de alternância/abertura visual elegante ("⚡ Calculadora de Horas Extras & DSR").
- **Opções de Base de Cálculo:**
  - Opção 1: Puxar automaticamente o Salário Base já digitado no recibo.
  - Opção 2: Puxar a soma dos proventos já cadastrados.
  - Opção 3: Digitação manual de um salário base específico para a apuração.
- **Divisor de Jornada:**
  - Campo livre numérico (com botões de atalho rápido: `220`, `200`, `180` ou qualquer número digitado).
- **Entrada Dual de Horas Extras:**
  - Seletor de Modo: `[ HH:MM ]` ou `[ Decimal ]`.
  - Se o usuário digita `10:30`, converte e exibe `10.50h`.
  - Se digita `10.5`, exibe `10:30`.
- **Percentual do Adicional:**
  - Seletor rápido: `50%`, `60%`, `70%`, `100%`, `150%`, `200%` + Campo livre para qualquer % estipulado pela CCT.
- **Parâmetros do DSR:**
  - Mês/Ano da competência sincronizado com a data do recibo.
  - Campos automáticos pré-preenchidos: **Dias Úteis** e **Domingos/Feriados**.
  - Possibilidade de alteração manual livre de qualquer dos dois campos a qualquer momento.
  - Checkbox opcional para ativar/desativar o cálculo do DSR.
- **Resumo em Tempo Real:**
  - Salário-hora: `R$ XX,XX`
  - Valor da hora extra unitária: `R$ XX,XX`
  - Total das Horas Extras: `R$ XX,XX`
  - Total do DSR: `R$ XX,XX`
  - Total Geral a Lançar: `R$ XX,XX`
- **Ação "Lançar no Recibo" (1 Clique):**
  - Adiciona automaticamente aos proventos:
    1. `Horas Extras XX% (Qtd: XXh)` $\rightarrow$ Valor calculado.
    2. `DSR sobre Horas Extras XX% (X DSRs / Y Dias Úteis)` $\rightarrow$ Valor calculado do DSR.
  - Atualiza o total do recibo imediatamente, sem travar navegação ou edição posterior.

### 2.3. Blindagem de Regras & AI-Ready
- **Segurança & Estabilidade:** Sem dependências desnecessárias; cálculo puramente determinístico em TypeScript com validação de entradas para evitar divisão por zero.
- **AI-Ready:** Exportação de funções e intents no contexto do assistente do DP para que o Chat interno também possa responder e calcular horas extras e DSR automaticamente quando solicitado via prompt.

---

## 3. Plano de Etapas

1. **Criar utilitário `src/utils/dsrCalendarUtils.ts`**:
   - Algoritmo de feriados nacionais brasileiros e cálculo de dias úteis / domingos e feriados por competência.
   - Funções de conversão bidirecional: `hhMmToDecimal` e `decimalToHhMm`.
   - Fórmulas de apuração de salário-hora, valor hora extra e DSR.

2. **Criar o componente `src/components/CalculadoraHorasExtrasRecibo.tsx`**:
   - Layout moderno com Tailwind CSS compatível com o design do sistema.
   - Painel retrátil / expansível no `ReciboApp.tsx`.
   - Suporte a múltiplas faixas de horas extras (ex: 50% em dias normais + 100% em domingos) com cálculo conjunto do DSR.
   - Botão de 1 clique "Inserir no Recibo".

3. **Integrar ao `src/ReciboApp.tsx`**:
   - Conectar o estado do recibo (salário, data/competência, proventos).
   - Inserção limpa como rubricas no array `recibo.proventos`.

4. **Verificação & Testes**:
   - Validar com múltiplos cenários (ex: 220h com 10h a 50%, divisor 200h a 100%, 150%, 200%, alteração manual de dias do DSR).
   - Executar `compile_applet` para certificar integridade do build.
