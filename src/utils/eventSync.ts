import { db, auth } from '../lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { CalendarEvent } from '../types';

export interface EventCompletionResult {
  completed: boolean;
  completedAt?: number | null;
}

/**
 * Checa de maneira unificada e determinística se um evento está concluído
 * para uma dada empresa e competência (monthKey).
 */
export function checkIsEventCompleted(
  event: CalendarEvent,
  empresaId: string,
  monthKey: string,
  completionsMap: Record<string, { completedAt?: number } | number>
): EventCompletionResult {
  const idA = event.originalEventId || event.id;
  const idB = event.id;

  const key1 = `${idA}_${empresaId}_${monthKey}`;
  const key2 = `${idA}_${empresaId}`;
  const key3 = `${idA}_GERAL_${monthKey}`;
  const key4 = `${idA}_GERAL`;
  const keySind1 = event.empresaId ? `${idA}_${event.empresaId}_${monthKey}` : '';
  const keySind2 = event.empresaId ? `${idA}_${event.empresaId}` : '';

  const keyB1 = `${idB}_${empresaId}_${monthKey}`;
  const keyB2 = `${idB}_${empresaId}`;
  const keyB3 = `${idB}_GERAL_${monthKey}`;
  const keyB4 = `${idB}_GERAL`;
  const keyBSind1 = event.empresaId ? `${idB}_${event.empresaId}_${monthKey}` : '';
  const keyBSind2 = event.empresaId ? `${idB}_${event.empresaId}` : '';

  const comp = completionsMap[key1] || completionsMap[key2] || completionsMap[key3] || completionsMap[key4]
    || (keySind1 ? completionsMap[keySind1] : undefined) || (keySind2 ? completionsMap[keySind2] : undefined)
    || completionsMap[keyB1] || completionsMap[keyB2] || completionsMap[keyB3] || completionsMap[keyB4]
    || (keyBSind1 ? completionsMap[keyBSind1] : undefined) || (keyBSind2 ? completionsMap[keyBSind2] : undefined)
    || completionsMap[idA] || completionsMap[idB];
  if (comp) {
    const ts = typeof comp === 'number' ? comp : comp.completedAt;
    return { completed: true, completedAt: ts || Date.now() };
  }

  // Se for evento pontual (não recorrente), verifica se status no evento é CONCLUIDO
  if (!event.isRecurrent && event.status === 'CONCLUIDO') {
    const fallbackDate = typeof event.date === 'number' ? event.date : new Date(event.date).getTime();
    return { completed: true, completedAt: event.completedAt || fallbackDate || Date.now() };
  }

  return { completed: false, completedAt: null };
}

/**
 * Alterna de forma centralizada e atômica o estado de conclusão de qualquer evento
 * (recorrente ou pontual/aviso/prazo), sincronizando:
 * 1. recurrentCompletions
 * 2. calendarEvents (status + completedAt para eventos pontuais)
 * 3. fechamentoFolha (coluna correspondente se houver vínculo)
 * 4. Google Sheets (em background)
 */
export async function toggleUnifiedEventCompletion({
  eventId,
  empresaId,
  monthKey,
  isCompleted,
  event,
}: {
  eventId: string;
  empresaId: string;
  monthKey: string;
  isCompleted: boolean; // Se true, o evento JÁ está concluído e será DESMARCADO. Se false, será CONCLUÍDO.
  event?: CalendarEvent | null;
}) {
  const targetCompleted = !isCompleted;
  const now = Date.now();
  const entityId = empresaId || 'GERAL';
  const docId = `${eventId}_${entityId}_${monthKey}`;

  // 1. Atualizar recurrentCompletions
  if (targetCompleted) {
    await setDoc(doc(db, 'recurrentCompletions', docId), {
      eventId,
      monthKey,
      entityId,
      completedAt: now,
      createdAt: now,
    });
  } else {
    await deleteDoc(doc(db, 'recurrentCompletions', docId)).catch(() => {});
    // Tenta apagar docId alternativo sem monthKey se existir
    await deleteDoc(doc(db, 'recurrentCompletions', `${eventId}_${entityId}`)).catch(() => {});
  }

  // 2. Se o evento for pontual/aviso ou foi passado como objeto pontual, atualizar calendarEvents
  const isRecurrent = event ? !!event.isRecurrent : false;
  if (!isRecurrent && eventId) {
    try {
      await updateDoc(doc(db, 'calendarEvents', eventId), {
        status: targetCompleted ? 'CONCLUIDO' : 'ATIVO',
        completedAt: targetCompleted ? now : null,
        updatedAt: now,
      });
    } catch (err) {
      // Documento pode não existir caso seja ID virtual ou herdado
      console.warn('Could not update calendarEvents status directly:', err);
    }
  }

  // 3. Sincronizar com Fechamento de Folha se o título for compatível
  if (entityId && entityId !== 'GERAL' && event?.title) {
    let fechamentoField = '';
    const upperTitle = event.title.toUpperCase();

    const isLaboral =
      upperTitle.includes('ASSISTENCIAL') ||
      upperTitle.includes('LABORAL') ||
      upperTitle.includes('SINDICATO') ||
      upperTitle.includes('SINDICAL') ||
      upperTitle.includes('NEGOCIAL') ||
      upperTitle.includes('CONFEDERATIVA');

    if (upperTitle.includes('FGTS')) fechamentoField = 'fgts';
    else if (upperTitle.includes('DCTF')) fechamentoField = 'dctf';
    else if (isLaboral) fechamentoField = 'guiaSindicatoLaboral';
    else if (upperTitle.includes('RECIBO')) fechamentoField = 'recibo';
    else if (upperTitle.includes('ADIANTAMENTO')) fechamentoField = 'adiantamento';
    else if (upperTitle.includes('EMPRÉSTIMO') || upperTitle.includes('EMPRESTIMO') || upperTitle.includes('CONSIGNADO')) fechamentoField = 'consignado';
    else if (upperTitle.includes('LANÇAMENTO') || upperTitle.includes('LANCAMENTO') || upperTitle.includes('PONTO') || upperTitle.includes('COMISSÃO') || upperTitle.includes('COMISSAO')) fechamentoField = 'lancamento';
    else if (upperTitle.includes('VERIFICAR ENVIO') || upperTitle.includes('VERIFICAR')) fechamentoField = 'verificarEnvio';

    if (fechamentoField) {
      let okValue = 'OK';
      let pendingValue = 'PENDENTE';

      if (fechamentoField === 'consignado' || fechamentoField === 'adiantamento') {
        pendingValue = 'A CONSULTAR';
      } else if (fechamentoField === 'lancamento') {
        pendingValue = 'PENDENTE (PONTO/COMISSÃO)';
      }

      const newStatus = targetCompleted ? okValue : pendingValue;

      const updateCompanyFechamento = async (targetEmpresaId: string) => {
        const fechamentoDocId = `${monthKey}_${targetEmpresaId}`;
        const updatePayload: Record<string, any> = {
          [fechamentoField]: newStatus,
          monthKey,
          empresaId: targetEmpresaId,
          updatedAt: now,
        };

        if (fechamentoField === 'guiaSindicatoLaboral' || fechamentoField === 'guiaSindicato') {
          updatePayload.guiaSindicatoLaboral = newStatus;
          updatePayload.guiaSindicato = newStatus;
        }

        await setDoc(doc(db, 'fechamentoFolha', fechamentoDocId), updatePayload, { merge: true });
      };

      await updateCompanyFechamento(entityId);

      // Se entityId for um Sindicato, propaga para todas as empresas associadas
      try {
        const empDocsMap = new Map<string, any>();
        const empSnap = await getDocs(query(collection(db, 'empresas'), where('sindicatoId', '==', entityId)));
        empSnap.docs.forEach(d => empDocsMap.set(d.id, d));

        // Tenta achar pelo documento de sindicatos para obter o código ou nome
        const sindDoc = await getDoc(doc(db, 'sindicatos', entityId)).catch(() => null);
        if (sindDoc && sindDoc.exists()) {
          const sData = sindDoc.data();
          if (sData?.codigo) {
            const empByCode = await getDocs(query(collection(db, 'empresas'), where('sindicatoId', '==', sData.codigo)));
            empByCode.docs.forEach(d => empDocsMap.set(d.id, d));
          }
          if (sData?.nome) {
            const empByName = await getDocs(query(collection(db, 'empresas'), where('sindicatoNome', '==', sData.nome)));
            empByName.docs.forEach(d => empDocsMap.set(d.id, d));
          }
        }

        for (const [empId] of empDocsMap.entries()) {
          const empCompDocId = `${eventId}_${empId}_${monthKey}`;
          if (targetCompleted) {
            await setDoc(doc(db, 'recurrentCompletions', empCompDocId), {
              eventId,
              monthKey,
              entityId: empId,
              completedAt: now,
              createdAt: now,
            });
          } else {
            await deleteDoc(doc(db, 'recurrentCompletions', empCompDocId)).catch(() => {});
            await deleteDoc(doc(db, 'recurrentCompletions', `${eventId}_${empId}`)).catch(() => {});
          }
          await updateCompanyFechamento(empId);
        }
      } catch (err) {
        // Ignora caso não seja sindicato ou sem empresas vinculadas
      }

      // Sincronizar com Google Sheets em background se houver token
      try {
        const token = await auth.currentUser?.getIdToken();
        if (token) {
          const columnMap: Record<string, string> = {
            fgts: 'FGTS',
            dctf: 'DCTF',
            guiaSindicato: 'Guia Sindicato',
            recibo: 'Recibo',
            adiantamento: 'Adiantamento',
            consignado: 'Empréstimo',
            lancamento: 'Inf. Lançamento',
            verificarEnvio: 'Verificar Envio',
          };
          const coluna = columnMap[fechamentoField] || fechamentoField;

          fetch('/api/sheets/update', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              empresaId: entityId,
              coluna,
              novoStatus: targetCompleted ? okValue : pendingValue,
            }),
          }).catch((err) => console.error('Error syncing to sheets', err));
        }
      } catch (err) {
        // Ignora falha de sheets
      }
    }
  }
}
