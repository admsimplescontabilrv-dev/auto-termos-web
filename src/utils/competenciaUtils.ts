import { subMonths } from 'date-fns';

/**
 * Regra de Competência da Folha de Pagamento:
 * O ciclo vai do dia 16 do mês de competência até o dia 15 do mês seguinte.
 * Exemplos:
 * - 16 de Setembro a 15 de Outubro => Competência de Setembro (09)
 * - 16 de Outubro a 15 de Novembro => Competência de Outubro (10)
 * - 16 de Novembro a 15 de Dezembro => Competência de Novembro (11)
 * 
 * Se o dia atual for >= 16: competência é o mês atual (ex: 24/09 pertence à competência 09 - Setembro).
 * Se o dia atual for <= 15: competência é o mês anterior (ex: 10/10 pertence à competência 09 - Setembro, pois o ciclo 16/09 a 15/10 ainda está ativo).
 */
export function getCompetenciaAtual(date: Date = new Date()): Date {
  const dia = date.getDate();
  const target = dia >= 16 ? date : subMonths(date, 1);
  return new Date(target.getFullYear(), target.getMonth(), 1);
}
