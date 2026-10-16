import { Empresa } from '../types';
import { isCompanyInExcludedDprhList } from '../data/excludedDprhCompanies';

export const MODULOS_VALIDOS = ['DP & RH', 'LEGALIZAÇÃO'] as const;

/**
 * Remove artefatos inexistentes (como 'FISCAL' ou 'FICAL') do array modulosResponsavel
 * e garante que apenas os módulos válidos ('DP & RH' e 'LEGALIZAÇÃO') sejam mantidos.
 */
export function sanitizeModulosResponsavel(
  modulos?: string[] | null,
  empresa?: Partial<Empresa> | null
): string[] {
  // REGRA PADRONIZADA: Se a empresa possui situação diferente de 'ATIVA',
  // ela é automaticamente desmarcada de todos os módulos (array vazio).
  if (empresa && empresa.situacao) {
    const sit = empresa.situacao.trim().toUpperCase();
    if (sit !== 'ATIVA') {
      return [];
    }
  }

  if (!modulos || !Array.isArray(modulos)) {
    return empresa && isCompanyInExcludedDprhList(empresa) ? [] : ['DP & RH'];
  }

  const filtered = modulos
    .map(m => (m || '').trim())
    .filter(m => {
      const upper = m.toUpperCase();
      if (upper.includes('FISC') || upper.includes('FICAL')) return false;
      return upper === 'DP & RH' || upper === 'LEGALIZACAO' || upper === 'LEGALIZAÇÃO';
    })
    .map(m => {
      const norm = m.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      return norm === 'LEGALIZACAO' ? 'LEGALIZAÇÃO' : 'DP & RH';
    });

  const unique = Array.from(new Set(filtered));

  // Se a empresa ficou sem módulos válidos
  if (unique.length === 0) {
    return empresa && isCompanyInExcludedDprhList(empresa) ? [] : ['DP & RH'];
  }

  // Se a empresa estiver na lista oficial de excluídas do DP & RH, garanta que DP & RH não permaneça
  if (empresa && isCompanyInExcludedDprhList(empresa)) {
    return unique.filter(m => m !== 'DP & RH');
  }

  return unique;
}

/**
 * Retorna se uma empresa possui situação diferente de 'ATIVA' (como INATIVA, SUSPENSA, BAIXADA, TRANSFERIDA).
 * Empresas com essas situações devem ser omitidas de todos os módulos operacionais
 * (Fechamento de Folha, Checklists, Calendário, Alvarás, Termos, Chat AI),
 * ficando visíveis exclusivamente no Cadastro de Empresas.
 */
export function isEmpresaBaixadaOuTransferida(empresa?: Partial<Empresa> | null): boolean {
  if (!empresa) return false;
  const sit = (empresa.situacao || 'ATIVA').trim().toUpperCase();
  return sit !== 'ATIVA';
}

/**
 * Retorna se a empresa está ativa e apta para visualização e operação nos módulos internos do sistema.
 * REGRA PADRONIZADA: Apenas empresas com situação 'ATIVA' aparecem nos módulos operacionais.
 * Qualquer situação diferente de 'ATIVA' faz com que a empresa seja omitida de todos os módulos.
 */
export function isEmpresaAtivaNosModulos(empresa?: Partial<Empresa> | null): boolean {
  if (!empresa) return false;
  const sit = (empresa.situacao || 'ATIVA').trim().toUpperCase();
  return sit === 'ATIVA';
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
