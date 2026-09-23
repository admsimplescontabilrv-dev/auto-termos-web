import { Empresa } from '../types';

/**
 * Retorna se uma empresa possui a situação 'BAIXADA' ou 'TRANSFERIDA'.
 * Empresas com essas situações devem ser omitidas de todos os módulos operacionais
 * (Fechamento de Folha, Checklists, Calendário, Alvarás, Termos, Chat AI),
 * ficando visíveis exclusivamente no Cadastro de Empresas.
 */
export function isEmpresaBaixadaOuTransferida(empresa?: Partial<Empresa> | null): boolean {
  if (!empresa) return false;
  const sit = (empresa.situacao || '').trim().toUpperCase();
  return sit === 'BAIXADA' || sit === 'TRANSFERIDA';
}

/**
 * Retorna se a empresa está apta para visualização e operação nos módulos internos do sistema.
 */
export function isEmpresaAtivaNosModulos(empresa?: Partial<Empresa> | null): boolean {
  return !isEmpresaBaixadaOuTransferida(empresa);
}

/**
 * Converte strings de data de vários formatos (DD/MM/AAAA, YYYY-MM-DD, etc.)
 * para timestamp numérico para ordenação cronológica precisa.
 */
export function parseDateToTimestamp(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const s = String(dateStr).trim();
  if (!s) return 0;

  // Formato DD/MM/AAAA ou DD/MM/YY
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(s)) {
    const [d, m, y] = s.split('/');
    const day = parseInt(d, 10);
    const month = parseInt(m, 10) - 1;
    let year = parseInt(y, 10);
    if (year < 100) year += 2000;
    const dt = new Date(year, month, day);
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  // Formato ISO YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const dt = new Date(s);
    return isNaN(dt.getTime()) ? 0 : dt.getTime();
  }

  const dt = new Date(s);
  return isNaN(dt.getTime()) ? 0 : dt.getTime();
}
