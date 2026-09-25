/**
 * Utilitários para apuração de Horas Extras e DSR (Descanso Semanal Remunerado)
 * Fundamentação:
 * - CLT Art. 59 (Duração do trabalho e horas extras)
 * - CF/88 Art. 7º, XV e XVI (DSR e Adicional de Horas Extras)
 * - Lei nº 605/1949 (Repouso semanal remunerado e dias de feriados)
 * - Súmula nº 172 do TST: "Computam-se no cálculo do repouso remunerado as horas extras habitualmente prestadas"
 * - Lei nº 14.759/2023: Feriado nacional do Dia da Consciência Negra (20 de novembro)
 */

export interface FeriadoInfo {
  data: string; // YYYY-MM-DD
  nome: string;
}

export interface CalendarioMesDSR {
  totalDias: number;
  diasUteis: number;
  domingosEFeriados: number;
  domingos: number;
  feriadosEmDiasUteis: number;
  listaFeriados: FeriadoInfo[];
}

/**
 * Calcula a data da Páscoa (Algoritmo de Butcher / Meeus)
 */
function calcularDataPascoa(ano: number): Date {
  const a = ano % 19;
  const b = Math.floor(ano / 100);
  const c = ano % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31); // 3 = Março, 4 = Abril
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(ano, mes - 1, dia);
}

/**
 * Retorna os feriados nacionais oficiais brasileiros para um determinado ano
 */
export function getFeriadosNacionais(ano: number): FeriadoInfo[] {
  const pad = (n: number) => String(n).padStart(2, '0');
  const format = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;

  const pascoa = calcularDataPascoa(ano);
  const addDays = (base: Date, days: number): Date => {
    const d = new Date(base);
    d.setDate(d.getDate() + days);
    return d;
  };

  const carnaval = addDays(pascoa, -47); // Terça-feira de Carnaval
  const sextaSanta = addDays(pascoa, -2); // Sexta-feira Santa (Paixão de Cristo)
  const corpusChristi = addDays(pascoa, 60); // Corpus Christi

  const feriados: FeriadoInfo[] = [
    { data: format(ano, 1, 1), nome: 'Confraternização Universal' },
    { data: format(ano, carnaval.getMonth() + 1, carnaval.getDate()), nome: 'Carnaval' },
    { data: format(ano, sextaSanta.getMonth() + 1, sextaSanta.getDate()), nome: 'Sexta-feira Santa (Paixão de Cristo)' },
    { data: format(ano, pascoa.getMonth() + 1, pascoa.getDate()), nome: 'Páscoa' },
    { data: format(ano, 4, 21), nome: 'Tiradentes' },
    { data: format(ano, 5, 1), nome: 'Dia do Trabalho' },
    { data: format(ano, corpusChristi.getMonth() + 1, corpusChristi.getDate()), nome: 'Corpus Christi' },
    { data: format(ano, 9, 7), nome: 'Independência do Brasil' },
    { data: format(ano, 10, 12), nome: 'Nossa Senhora Aparecida' },
    { data: format(ano, 11, 2), nome: 'Finados' },
    { data: format(ano, 11, 15), nome: 'Proclamação da República' },
    { data: format(ano, 11, 20), nome: 'Dia Nacional de Zumbi e da Consciência Negra' },
    { data: format(ano, 12, 25), nome: 'Natal' }
  ];

  return feriados;
}

/**
 * Apura os dias úteis e DSRs (domingos e feriados) de um mês/ano (MM/AAAA ou YYYY-MM)
 * Regra CLT padrão: Sábado é dia útil remunerado (salvo norma coletiva estipulando sábado como DSR).
 */
export function calcularCalendarioDSR(mesAnoStr: string, sabadoComoDiaUtil: boolean = true): CalendarioMesDSR {
  let mes = new Date().getMonth() + 1;
  let ano = new Date().getFullYear();

  if (mesAnoStr && mesAnoStr.includes('/')) {
    const parts = mesAnoStr.split('/');
    if (parts.length === 2) {
      const m = parseInt(parts[0], 10);
      const y = parseInt(parts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) mes = m;
      if (!isNaN(y) && y >= 1900 && y <= 2100) ano = y;
    }
  } else if (mesAnoStr && mesAnoStr.includes('-')) {
    const parts = mesAnoStr.split('-');
    if (parts.length === 2) {
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      if (!isNaN(m) && m >= 1 && m <= 12) mes = m;
      if (!isNaN(y) && y >= 1900 && y <= 2100) ano = y;
    }
  }

  const feriadosAno = getFeriadosNacionais(ano);
  const pad = (n: number) => String(n).padStart(2, '0');
  const totalDias = new Date(ano, mes, 0).getDate();

  let domingos = 0;
  let feriadosEmDiasUteis = 0;
  let diasUteis = 0;
  const listaFeriados: FeriadoInfo[] = [];

  for (let dia = 1; dia <= totalDias; dia++) {
    const dataStr = `${ano}-${pad(mes)}-${pad(dia)}`;
    const dataObj = new Date(ano, mes - 1, dia);
    const diaSemana = dataObj.getDay(); // 0 = Domingo, 6 = Sábado

    const feriado = feriadosAno.find(f => f.data === dataStr);

    if (feriado) {
      listaFeriados.push(feriado);
    }

    if (diaSemana === 0) {
      // Domingo sempre é DSR
      domingos++;
    } else if (feriado) {
      // Feriado que cai de segunda a sábado
      feriadosEmDiasUteis++;
    } else if (diaSemana === 6) {
      // Sábado
      if (sabadoComoDiaUtil) {
        diasUteis++;
      } else {
        // Se a CCT estipular sábado como repouso semanal
        feriadosEmDiasUteis++;
      }
    } else {
      // Segunda a Sexta
      diasUteis++;
    }
  }

  const domingosEFeriados = domingos + feriadosEmDiasUteis;

  return {
    totalDias,
    diasUteis,
    domingosEFeriados,
    domingos,
    feriadosEmDiasUteis,
    listaFeriados
  };
}

/**
 * Converte string no formato "HH:MM", "HHhMM" ou número em decimal de horas
 * Ex: "10:30" -> 10.5
 * Ex: "02:45" -> 2.75
 */
export function hhMmToDecimal(input: string): number {
  if (!input || typeof input !== 'string') return 0;
  const trimmed = input.trim();
  
  if (trimmed.includes(':') || trimmed.includes('h')) {
    const separator = trimmed.includes(':') ? ':' : 'h';
    const parts = trimmed.split(separator);
    const horas = parseInt(parts[0], 10) || 0;
    const minutos = parseInt(parts[1], 10) || 0;
    return Number((horas + minutos / 60).toFixed(4));
  }

  // Se o usuário digitou com vírgula ou ponto (ex: "10,5" ou "10.5")
  const normalized = parseFloat(trimmed.replace(',', '.'));
  return isNaN(normalized) ? 0 : Number(normalized.toFixed(4));
}

/**
 * Converte horas decimais para formato visual "HH:MM"
 * Ex: 10.5 -> "10:30"
 * Ex: 2.75 -> "02:45"
 */
export function decimalToHhMm(decimalVal: number): string {
  if (isNaN(decimalVal) || decimalVal <= 0) return '00:00';
  const totalMinutos = Math.round(decimalVal * 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/**
 * Fórmulas Oficiais Trabalhistas:
 */

// 1. Salário-Hora: Salário / Divisor
export function calcularSalarioHora(salario: number, divisor: number): number {
  if (!salario || !divisor || divisor <= 0) return 0;
  return Number((salario / divisor).toFixed(4));
}

// 2. Valor Unitário da Hora Extra com adicional
export function calcularValorHoraExtra(salarioHora: number, percentualAdicional: number): number {
  if (!salarioHora || salarioHora <= 0) return 0;
  const fator = 1 + (percentualAdicional / 100);
  return Number((salarioHora * fator).toFixed(4));
}

// 3. Valor Total das Horas Extras
export function calcularTotalHorasExtras(qtdHorasDecimais: number, valorHoraExtra: number): number {
  if (!qtdHorasDecimais || !valorHoraExtra) return 0;
  return Number((qtdHorasDecimais * valorHoraExtra).toFixed(2));
}

// 4. DSR sobre Horas Extras (Súmula 172/TST e Lei 605/49)
// DSR = (Total Horas Extras / Dias Úteis) * (Domingos + Feriados)
export function calcularDSR(totalHorasExtras: number, diasUteis: number, domingosEFeriados: number): number {
  if (!totalHorasExtras || !diasUteis || diasUteis <= 0 || !domingosEFeriados) return 0;
  return Number(((totalHorasExtras / diasUteis) * domingosEFeriados).toFixed(2));
}
