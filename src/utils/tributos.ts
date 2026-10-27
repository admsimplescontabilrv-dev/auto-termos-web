export const calcularINSS_CLT = (base: number): number => {
  if (!base || base <= 0) return 0;
  let inss = 0;
  if (base <= 1621.00) {
    inss = base * 0.075;
  } else if (base <= 2902.84) {
    inss = (base * 0.09) - 24.32;
  } else if (base <= 4354.27) {
    inss = (base * 0.12) - 111.40;
  } else if (base <= 8475.55) {
    inss = (base * 0.14) - 198.49;
  } else {
    inss = 988.09;
  }
  return Math.max(0, Math.round(inss * 100) / 100);
};

export const calcularINSS_ProLabore = (base: number): number => {
  return Math.round(Math.min(base, 8475.55) * 0.11 * 100) / 100;
};

export const calcularIRRF = (baseBruta: number, valorINSS: number, dependentes: number = 0, pensaoAlimenticia: number = 0): { valor: number; faixa: string; baseCalculo: number } => {
  if (!baseBruta || baseBruta <= 0) return { valor: 0, faixa: 'Isento', baseCalculo: 0 };

  // PASSO A - Base de Cálculo (BC_IRRF), optando pela maior dedução legal
  const deducoesLegais = valorINSS + (dependentes * 189.59) + pensaoAlimenticia;
  const descontoSimplificado = 607.20;
  const descontoAplicado = Math.max(deducoesLegais, descontoSimplificado);
  const baseIRRF = Math.max(0, Math.round((baseBruta - descontoAplicado) * 100) / 100);

  if (baseIRRF <= 2428.80) return { valor: 0, faixa: 'Isento', baseCalculo: baseIRRF };

  // PASSO B - Tabela Progressiva Mensal sobre BC_IRRF
  let irTabela = 0;
  let faixa = '';

  if (baseIRRF <= 2826.65) {
    irTabela = (Math.round(baseIRRF * 0.075 * 100) / 100) - 182.16;
    faixa = '7,5%';
  } else if (baseIRRF <= 3751.05) {
    irTabela = (Math.round(baseIRRF * 0.15 * 100) / 100) - 394.16;
    faixa = '15%';
  } else if (baseIRRF <= 4664.68) {
    irTabela = (Math.round(baseIRRF * 0.225 * 100) / 100) - 675.49;
    faixa = '22,5%';
  } else {
    irTabela = (Math.round(baseIRRF * 0.275 * 100) / 100) - 908.73;
    faixa = '27,5%';
  }
  irTabela = Math.max(0, Math.round(irTabela * 100) / 100);

  // PASSO C - Redutor da Lei nº 15.270/2025 com base no Rendimento Tributável Bruto (baseBruta)
  let redutor = 0;
  if (baseBruta <= 5000.00) {
    redutor = 312.89;
  } else if (baseBruta <= 7350.00) {
    redutor = Math.round((978.62 - (0.133145 * baseBruta)) * 100) / 100;
  } else {
    redutor = 0;
  }

  // PASSO D - Imposto Final Retido
  const impostoFinal = Math.max(0, Math.round((irTabela - redutor) * 100) / 100);
  if (impostoFinal === 0) {
    faixa = 'Isento';
  }

  return { valor: impostoFinal, faixa, baseCalculo: baseIRRF };
};

