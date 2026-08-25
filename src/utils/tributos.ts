export const calcularINSS_CLT = (base: number): number => {
  const teto = 8475.55;
  const salario = Math.min(base, teto);
  let inss = 0;
  if (salario > 4354.27) inss += (Math.min(salario, 8475.55) - 4354.27) * 0.14;
  if (salario > 2902.84) inss += (Math.min(salario, 4354.27) - 2902.84) * 0.12;
  if (salario > 1621.00) inss += (Math.min(salario, 2902.84) - 1621.00) * 0.09;
  if (salario > 0)       inss += Math.min(salario, 1621.00) * 0.075;
  return Math.round(inss * 100) / 100;
};

export const calcularINSS_ProLabore = (base: number): number => {
  return Math.round(Math.min(base, 8475.55) * 0.11 * 100) / 100;
};

export const calcularIRRF = (baseBruta: number, valorINSS: number, dependentes: number = 0): { valor: number; faixa: string; baseCalculo: number } => {
  // Lógica do desconto mais vantajoso (Legal vs Simplificado)
  const descontoLegal = valorINSS + (dependentes * 189.59);
  const descontoSimplificado = 607.20;
  const descontoAplicado = Math.max(descontoLegal, descontoSimplificado);
  
  const baseIRRF = Math.max(0, baseBruta - descontoAplicado);

  if (baseIRRF <= 2428.80) return { valor: 0, faixa: 'Isento', baseCalculo: baseIRRF };
  
  let imposto = 0;
  let faixa = '';
  
  if (baseIRRF <= 2826.65) { imposto = baseIRRF * 0.075 - 182.16; faixa = '7,5%'; }
  else if (baseIRRF <= 3751.05) { imposto = baseIRRF * 0.15 - 394.16; faixa = '15%'; }
  else if (baseIRRF <= 4664.68) { imposto = baseIRRF * 0.225 - 675.49; faixa = '22,5%'; }
  else { imposto = baseIRRF * 0.275 - 908.73; faixa = '27,5%'; }
  
  // Aplicação do Redutor da Lei 15.270/2025
  if (baseIRRF <= 5000.00) { 
    imposto = 0; 
    faixa = faixa ? `${faixa} (Isento Redutor 2026)` : 'Isento'; 
  } else if (baseIRRF <= 7350.00) { 
    const redutor = 978.62 - (0.133145 * baseIRRF);
    imposto = Math.max(0, imposto - redutor);
  }
  
  return { valor: Math.max(0, Math.round(imposto * 100) / 100), faixa, baseCalculo: baseIRRF };
};
