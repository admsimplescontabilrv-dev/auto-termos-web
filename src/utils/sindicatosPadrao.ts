import { db } from '../lib/firebase';
import { collection, doc, writeBatch, addDoc } from 'firebase/firestore';
import { Sindicato } from '../types';

export interface SindicatoParametroPadrao {
  codigo: string;
  nome: string;
  keywords: string[];
  validadeCCT: string; // YYYY-MM-DD
  assistencialLaboral: string;
  assistencialLaboralMeses: number[];
}

export const MESES_NOMES = [
  'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
  'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
];

export const LISTA_SINDICATOS_PADRAO: SindicatoParametroPadrao[] = [
  {
    codigo: '1',
    nome: 'METALURGICA MEC MAT ELETR. RIO VERDE (SIMESGO)',
    keywords: ['SIMESGO', 'METALURGICA'],
    validadeCCT: '2027-03-31',
    assistencialLaboral: 'ABRIL, MAIO, JUNHO, JULHO',
    assistencialLaboralMeses: [3, 4, 5, 6]
  },
  {
    codigo: '2',
    nome: 'SINDICATO DOS EMPREGADOS NO COMERCIO DE ITAPEMA - PORTO BELO SC',
    keywords: ['ITAPEMA', 'PORTO BELO'],
    validadeCCT: '2026-10-31',
    assistencialLaboral: 'JANEIRO, MAIO, SETEMBRO',
    assistencialLaboralMeses: [0, 4, 8]
  },
  {
    codigo: '3',
    nome: 'EMPREGADOS AGENTES AUTONOMOS (ADVOCACIA)',
    keywords: ['AGENTES AUTONOMOS', 'ADVOCACIA'],
    validadeCCT: '',
    assistencialLaboral: 'JULHO, JANEIRO, MAIO',
    assistencialLaboralMeses: [0, 4, 6]
  },
  {
    codigo: '4',
    nome: 'MEDICOS VETERINARIOS DO ESTADO DE GOIAS',
    keywords: ['MEDICOS VETERINARIOS', 'VETERINARIOS'],
    validadeCCT: '',
    assistencialLaboral: '',
    assistencialLaboralMeses: []
  },
  {
    codigo: '5',
    nome: 'COM ATACADISTA E VAREJISTA DOURADOS MS',
    keywords: ['DOURADOS'],
    validadeCCT: '',
    assistencialLaboral: 'AGOSTO, DEZEMBRO',
    assistencialLaboralMeses: [7, 11]
  },
  {
    codigo: '6',
    nome: 'BARREIRAS E REGIAO OESTE DA BAHIA - SINDCOB (Comerciários)',
    keywords: ['SINDCOB', 'BARREIRAS'],
    validadeCCT: '2028-03-31',
    assistencialLaboral: 'NOVEMBRO',
    assistencialLaboralMeses: [10]
  },
  {
    codigo: '7',
    nome: 'SETHORESG',
    keywords: ['SETHORESG'],
    validadeCCT: '2028-01-31',
    assistencialLaboral: 'MENSAL',
    assistencialLaboralMeses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  },
  {
    codigo: '8',
    nome: 'INDUSTRIA DA CONSTRUCAO NO ESTADO DE GOIAS',
    keywords: ['CONSTRUCAO', 'CONSTRUÇÃO'],
    validadeCCT: '2027-04-30',
    assistencialLaboral: 'MENSAL',
    assistencialLaboralMeses: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
  },
  {
    codigo: '9',
    nome: 'CONTABEIS E DAS EMPRESAS DE ASSESSORAMENTO (SESCON-GOIAS)',
    keywords: ['SESCON'],
    validadeCCT: '2027-06-30',
    assistencialLaboral: 'JULHO, JANEIRO, MAIO',
    assistencialLaboralMeses: [0, 4, 6]
  },
  {
    codigo: '10',
    nome: 'COMERCIO ATACADISTA DISTRIBUIDOR E ATACAREJO (SINAT)',
    keywords: ['SINAT', 'ATACAREJO'],
    validadeCCT: '2028-03-31',
    assistencialLaboral: 'JUNHO, OUTUBRO',
    assistencialLaboralMeses: [5, 9]
  },
  {
    codigo: '11',
    nome: 'TRANSPORTE RODOVIARIO DE PASSAGEIROS',
    keywords: ['PASSAGEIROS'],
    validadeCCT: '',
    assistencialLaboral: 'FEVEREIRO, ABRIL, JUNHO, AGOSTO, OUTUBRO, DEZEMBRO',
    assistencialLaboralMeses: [1, 3, 5, 7, 9, 11]
  },
  {
    codigo: '12',
    nome: 'COMPRA, VENDA, LOC.E ADM. IMOV.E DOS COND.HORIZ., VERT. E DE EDIF. RESID.E COM. (SECOVI)',
    keywords: ['SECOVI'],
    validadeCCT: '',
    assistencialLaboral: 'ABRIL, JULHO',
    assistencialLaboralMeses: [3, 6]
  },
  {
    codigo: '13',
    nome: 'SINDISAUDE-RV (Hospitais e Saúde)',
    keywords: ['SINDISAUDE'],
    validadeCCT: '2028-03-31',
    assistencialLaboral: 'ABRIL, JULHO, SETEMBRO, DEZEMBRO',
    assistencialLaboralMeses: [3, 6, 8, 11]
  },
  {
    codigo: '14',
    nome: 'TRANSPORTE RODOVIÁRIO RIO VERDE',
    keywords: ['TRANSPORTE RODOVIÁRIO RIO VERDE', 'RODOVIARIO RIO VERDE'],
    validadeCCT: '2026-04-30',
    assistencialLaboral: 'JUNHO, NOVEMBRO',
    assistencialLaboralMeses: [5, 10]
  },
  {
    codigo: '15',
    nome: 'SINDICATO RURAL',
    keywords: ['SINDICATO RURAL', 'RURAL'],
    validadeCCT: '',
    assistencialLaboral: '',
    assistencialLaboralMeses: []
  },
  {
    codigo: '16',
    nome: 'SECORV ALIMENTOS',
    keywords: ['SECORV ALIMENTOS'],
    validadeCCT: '2027-03-31',
    assistencialLaboral: 'OUTUBRO',
    assistencialLaboralMeses: [9]
  },
  {
    codigo: '17',
    nome: 'SECORV',
    keywords: ['SECORV'],
    validadeCCT: '2028-03-01',
    assistencialLaboral: 'OUTUBRO',
    assistencialLaboralMeses: [9]
  },
  {
    codigo: '18',
    nome: 'SINDIMACO',
    keywords: ['SINDIMACO'],
    validadeCCT: '2028-03-31',
    assistencialLaboral: 'OUTUBRO, JUNHO',
    assistencialLaboralMeses: [5, 9]
  },
  {
    codigo: '19',
    nome: 'SINDICATO DO COMERCIO VAREJISTA DE ITUMBIARA - SINDILOJAS',
    keywords: ['ITUMBIARA', 'SINDILOJAS'],
    validadeCCT: '2026-10-31',
    assistencialLaboral: 'JANEIRO, MAIO, SETEMBRO',
    assistencialLaboralMeses: [0, 4, 8]
  }
];

export function getSindicatoParametrosPadrao(codigoOuNome: string): SindicatoParametroPadrao | undefined {
  if (!codigoOuNome) return undefined;
  const clean = codigoOuNome.trim();
  const byCode = LISTA_SINDICATOS_PADRAO.find(p => p.codigo === clean);
  if (byCode) return byCode;

  const upper = clean.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return LISTA_SINDICATOS_PADRAO.find(p => {
    return p.keywords.some(kw => {
      const normKw = kw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return upper.includes(normKw);
    });
  });
}

/**
 * Converte um texto de meses (ex: "JANEIRO, MAIO, SETEMBRO" ou "MENSAL") em array de índices [0..11]
 */
export function parseMesesTexto(texto: string): number[] {
  if (!texto) return [];
  const upper = texto.toUpperCase();
  if (upper.includes('MENSAL')) {
    return [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
  }
  const encontrados: number[] = [];
  MESES_NOMES.forEach((nome, idx) => {
    if (upper.includes(nome)) {
      encontrados.push(idx);
    }
  });
  return encontrados;
}

/**
 * Garante que os 19 sindicatos padrão estejam cadastrados e parametrizados no Firestore.
 */
export function formatValidadeCCT(val?: string): string {
  if (!val || val === 'Não cadastrada' || val.trim() === '') return 'Não cadastrada';
  if (val.includes('-')) {
    const parts = val.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  }
  return val;
}

export interface ResolvedSindicatoInfo {
  sindicato?: Sindicato;
  codigo: string;
  nome: string;
  validadeCCT: string;
  assistencialLaboralTexto: string;
  assistencialLaboralMeses: number[];
  isMesExigivel: boolean;
}

/**
 * Resolve todas as informações do sindicato para uma dada empresa,
 * com fallback imediato aos 19 sindicatos padrão da CCT.
 */
export function resolveSindicatoForEmpresa(
  emp: { id: string; sindicatoId?: string; sindicatoNome?: string; fechamentoTemplate?: any },
  sindicatosList: Sindicato[],
  monthDate: Date
): ResolvedSindicatoInfo {
  // 1. Tenta achar pelo sindicatoId (ID do doc ou código) ou sindicatoNome
  let sindicato = sindicatosList.find(s => {
    if (emp.sindicatoId && s.id === emp.sindicatoId) return true;
    if (emp.sindicatoId && s.codigo && String(s.codigo).trim() === String(emp.sindicatoId).trim()) return true;
    if (emp.sindicatoNome && s.nome && s.nome.trim().toLowerCase() === emp.sindicatoNome.trim().toLowerCase()) return true;
    return false;
  });

  // Se não achou exato, tenta achar por includes no nome ou no ID
  if (!sindicato && (emp.sindicatoNome || emp.sindicatoId)) {
    const searchTarget = (emp.sindicatoNome || emp.sindicatoId || '').toLowerCase().trim();
    sindicato = sindicatosList.find(s => 
      s.nome.toLowerCase().includes(searchTarget) || searchTarget.includes(s.nome.toLowerCase())
    );
  }

  // 2. Busca parâmetros padrão correspondentes (por código ou palavra-chave no nome)
  const padrao = getSindicatoParametrosPadrao(
    sindicato?.codigo || sindicato?.nome || emp.sindicatoId || emp.sindicatoNome || ''
  );

  const codigo = sindicato?.codigo || padrao?.codigo || '-';
  const nome = sindicato?.nome || padrao?.nome || emp.sindicatoNome || '';
  const validadeCCT = sindicato?.validadeCCT !== undefined ? sindicato.validadeCCT : (padrao?.validadeCCT || '');

  const assistencialLaboralTexto =
    (sindicato?.assistencialLaboral?.trim()) ||
    (padrao?.assistencialLaboral?.trim()) ||
    (emp.fechamentoTemplate?.guiaSindicatoLaboralMeses?.trim()) ||
    '';

  let assistencialLaboralMeses: number[] = [];
  if (sindicato?.assistencialLaboralMeses && sindicato.assistencialLaboralMeses.length > 0) {
    assistencialLaboralMeses = sindicato.assistencialLaboralMeses;
  } else if (padrao?.assistencialLaboralMeses && padrao.assistencialLaboralMeses.length > 0) {
    assistencialLaboralMeses = padrao.assistencialLaboralMeses;
  } else if (assistencialLaboralTexto) {
    assistencialLaboralMeses = parseMesesTexto(assistencialLaboralTexto);
  }

  const mesAtualIdx = monthDate.getMonth();
  const mesNomeAtual = MESES_NOMES[mesAtualIdx];

  const isMesExigivel = Boolean(
    assistencialLaboralTexto && (
      assistencialLaboralTexto.toUpperCase().includes('MENSAL') ||
      assistencialLaboralMeses.includes(mesAtualIdx) ||
      assistencialLaboralTexto.toUpperCase().includes(mesNomeAtual)
    )
  );

  return {
    sindicato,
    codigo,
    nome,
    validadeCCT,
    assistencialLaboralTexto,
    assistencialLaboralMeses,
    isMesExigivel
  };
}

/**
 * Determina o status da Guia Assistencial Laboral conforme a regra de ouro do sistema:
 * - Se o evento/checklist foi marcado como concluído: fica 'OK'.
 * - Se o desconto da guia NÃO é para o mês em questão (!isMesExigivel): FICA 'OK' DIRETO.
 *   (Mesmo que estivesse 'PENDENTE' ou vazio no registro anterior, fica 'OK' direto).
 * - Se o desconto da guia = ao mês em questão (isMesExigivel): FICA 'PENDENTE' por padrão,
 *   a não ser que já tenha sido marcado como 'OK' ou outro status explícito não pendente.
 */
export function resolveGuiaLaboralStatus(
  isMesExigivel: boolean,
  isEventCompleted: boolean,
  rawStatus: string | undefined
): string {
  if (isEventCompleted) {
    return 'OK';
  }

  if (!isMesExigivel) {
    // Nos outros meses já fica OK direto!
    if (!rawStatus || rawStatus === 'PENDENTE') {
      return 'OK';
    }
    return rawStatus;
  } else {
    // Mês em questão com desconto da guia assistencial:
    // Deve ficar como PENDENTE por padrão
    return rawStatus ?? 'PENDENTE';
  }
}

/**
 * Garante que os 19 sindicatos padrão estejam cadastrados e parametrizados no Firestore
 * com seus vencimentos de CCT e regras de guia assistencial.
 */
export async function sincronizarSindicatosPadrao(existingSindicatos: Sindicato[]): Promise<boolean> {
  try {
    const batch = writeBatch(db);
    let hasChanges = false;

    for (const padrao of LISTA_SINDICATOS_PADRAO) {
      // Tenta achar pelo código ou pelo nome
      const existing = existingSindicatos.find(s => {
        if (s.codigo && String(s.codigo).trim() === padrao.codigo) return true;
        const upper = (s.nome || '').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        // Evita que SECORV (17) dê match com SECORV ALIMENTOS (16)
        if (padrao.codigo === '17' && upper.includes('ALIMENTO')) return false;
        return padrao.keywords.some(kw => {
          const normKw = kw.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return upper.includes(normKw);
        });
      });

      if (existing) {
        // Atualiza se houver campos faltantes ou desatualizados
        const updates: any = {};
        if (padrao.validadeCCT !== undefined && existing.validadeCCT !== padrao.validadeCCT) {
          updates.validadeCCT = padrao.validadeCCT;
        }
        if (
          existing.assistencialLaboral !== padrao.assistencialLaboral ||
          !existing.assistencialLaboralMeses ||
          JSON.stringify(existing.assistencialLaboralMeses) !== JSON.stringify(padrao.assistencialLaboralMeses)
        ) {
          updates.assistencialLaboral = padrao.assistencialLaboral;
          updates.assistencialLaboralMeses = padrao.assistencialLaboralMeses;
        }
        if (!existing.codigo || existing.codigo !== padrao.codigo) {
          updates.codigo = padrao.codigo;
        }

        if (Object.keys(updates).length > 0) {
          updates.updatedAt = Date.now();
          batch.update(doc(db, 'sindicatos', existing.id), updates);
          hasChanges = true;
        }
      } else {
        // Cria o sindicato padrão se não existir na base
        const newDocRef = doc(collection(db, 'sindicatos'));
        batch.set(newDocRef, {
          nome: padrao.nome,
          codigo: padrao.codigo,
          cnpj: '',
          regiaoAtuacao: '',
          validadeCCT: padrao.validadeCCT,
          assistencialLaboral: padrao.assistencialLaboral,
          assistencialLaboralMeses: padrao.assistencialLaboralMeses,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await batch.commit();
      console.log('[Sindicatos] Sincronização e cadastro preventivo dos 19 sindicatos concluídos com sucesso.');
    }
    return hasChanges;
  } catch (error) {
    console.warn('[Sindicatos] Erro na sincronização dos sindicatos padrão:', error);
    return false;
  }
}
