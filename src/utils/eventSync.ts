import { db, auth } from '../lib/firebase';
import { doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
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
  const actualId = event.originalEventId || event.id;

  const key1 = `${actualId}_${empresaId}_${monthKey}`;
  const key2 = `${actualId}_${empresaId}`;
  const key3 = `${actualId}_GERAL_${monthKey}`;
  const key4 = `${actualId}_GERAL`;

  const comp = completionsMap[key1] || completionsMap[key2] || completionsMap[key3] || completionsMap[key4];
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

    if (upperTitle.includes('FGTS')) fechamentoField = 'fgts';
    else if (upperTitle.includes('DCTF')) fechamentoField = 'dctf';
    else if (upperTitle.includes('SINDICATO')) fechamentoField = 'guiaSindicato';
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

      const fechamentoDocId = `${monthKey}_${entityId}`;
      const updatePayload: Record<string, any> = {
        [fechamentoField]: targetCompleted ? okValue : pendingValue,
        monthKey,
        empresaId: entityId,
        updatedAt: now,
      };

      if (fechamentoField === 'guiaSindicato') {
        updatePayload.guiaSindicatoLaboral = targetCompleted ? okValue : pendingValue;
      }

      await setDoc(doc(db, 'fechamentoFolha', fechamentoDocId), updatePayload, { merge: true });

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
