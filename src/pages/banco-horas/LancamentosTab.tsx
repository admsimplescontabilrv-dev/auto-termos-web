import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Colaborador, BancoHorasLancamento } from '../../types';
import { timeToMinutes, minutesToTime } from '../../utils/timeFormat';
import { collection, query, where, getDocs, updateDoc, doc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, ChevronLeft, ChevronRight, Calendar, Check, X, Info, Sparkles, CheckCircle2 } from 'lucide-react';

interface RowDraft {
  positivos: string;
  negativos: string;
  observacoes: string;
  isDirty: boolean;
}

export default function LancamentosTab() {
  const [mesAno, setMesAno] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const { data: colaboradores, loading: loadingColabs } = useFirestore<Colaborador>('colaboradores');
  const [lancamentos, setLancamentos] = useState<Record<string, BancoHorasLancamento>>({});
  const [drafts, setDrafts] = useState<Record<string, RowDraft>>({});
  const [allAvailableMonths, setAllAvailableMonths] = useState<string[]>([]);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [savingStatus, setSavingStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const hasCheckedInitialMonth = useRef(false);

  // Carregar todos os meses que já possuem dados cadastrados
  useEffect(() => {
    const checkMonths = async () => {
      try {
        const snap = await getDocs(collection(db, 'banco_horas_lancamentos'));
        const monthsSet = new Set<string>();
        snap.docs.forEach(d => {
          const data = d.data();
          if (data.mesAno && ((data.minutosPositivos || 0) > 0 || (data.minutosNegativos || 0) > 0)) {
            monthsSet.add(data.mesAno);
          }
        });
        const sorted = Array.from(monthsSet).sort().reverse();
        setAllAvailableMonths(sorted);

        // Se o mês atual não tiver nada e houver mês anterior com dados, sugerir ou ir para ele
        if (!hasCheckedInitialMonth.current && sorted.length > 0) {
          hasCheckedInitialMonth.current = true;
          const currentHasData = snap.docs.some(d => d.data().mesAno === mesAno);
          if (!currentHasData) {
            setMesAno(sorted[0]);
          }
        }
      } catch (err) {
        console.error('Erro ao verificar meses com lançamentos:', err);
      }
    };
    checkMonths();
  }, []);

  // Carregar lançamentos do mês selecionado
  useEffect(() => {
    const fetchLancamentos = async () => {
      if (!mesAno) return;
      setLoadingLancamentos(true);
      try {
        const q = query(
          collection(db, 'banco_horas_lancamentos'),
          where('mesAno', '==', mesAno)
        );
        const snap = await getDocs(q);
        const lMap: Record<string, BancoHorasLancamento> = {};
        const dMap: Record<string, RowDraft> = {};

        snap.docs.forEach(d => {
          const data = d.data() as BancoHorasLancamento;
          lMap[data.colaboradorId] = { id: d.id, ...data };
          dMap[data.colaboradorId] = {
            positivos: minutesToTime(data.minutosPositivos || 0).replace('-', ''),
            negativos: minutesToTime(data.minutosNegativos || 0).replace('-', ''),
            observacoes: data.observacoes || '',
            isDirty: false
          };
        });

        // Preencher drafts para colaboradores que ainda não têm lançamento salvo neste mês
        colaboradores.forEach(c => {
          if (c.id && !dMap[c.id]) {
            dMap[c.id] = {
              positivos: '00:00',
              negativos: '00:00',
              observacoes: '',
              isDirty: false
            };
          }
        });

        setLancamentos(lMap);
        setDrafts(dMap);
      } catch (err) {
        console.error('Erro ao carregar lançamentos:', err);
      } finally {
        setLoadingLancamentos(false);
      }
    };
    fetchLancamentos();
  }, [mesAno, colaboradores]);

  const changeMonth = (offset: number) => {
    const [yearStr, monthStr] = mesAno.split('-');
    const date = new Date(parseInt(yearStr), parseInt(monthStr) - 1 + offset, 1);
    const newYear = date.getFullYear();
    const newMonth = String(date.getMonth() + 1).padStart(2, '0');
    setMesAno(`${newYear}-${newMonth}`);
  };

  const formatMesAnoDisplay = (isoMesAno: string) => {
    const [ano, mes] = isoMesAno.split('-');
    const date = new Date(parseInt(ano), parseInt(mes) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const ativos = useMemo(() => {
    return colaboradores
      .filter(c => c.ativo)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [colaboradores]);

  // Atualizar campo no rascunho da linha
  const handleDraftChange = (colabId: string, field: 'positivos' | 'negativos' | 'observacoes', value: string) => {
    setDrafts(prev => {
      const current = prev[colabId] || {
        positivos: '00:00',
        negativos: '00:00',
        observacoes: '',
        isDirty: false
      };
      return {
        ...prev,
        [colabId]: {
          ...current,
          [field]: value,
          isDirty: true
        }
      };
    });
  };

  // Formatar saída de hora no blur (ex: '2932' -> '29:32', '5' -> '05:00', '29:32' -> '29:32')
  const handleDurationBlur = (colabId: string, field: 'positivos' | 'negativos') => {
    const draft = drafts[colabId];
    if (!draft) return;
    const raw = draft[field].trim();
    if (!raw) {
      handleDraftChange(colabId, field, '00:00');
      return;
    }
    const minutes = timeToMinutes(raw);
    const formatted = minutesToTime(minutes).replace('-', '');
    handleDraftChange(colabId, field, formatted);
  };

  // Cancelar alterações da linha (restaurar o que estava gravado)
  const handleCancelRow = (colabId: string) => {
    const saved = lancamentos[colabId];
    setDrafts(prev => ({
      ...prev,
      [colabId]: {
        positivos: saved ? minutesToTime(saved.minutosPositivos || 0).replace('-', '') : '00:00',
        negativos: saved ? minutesToTime(saved.minutosNegativos || 0).replace('-', '') : '00:00',
        observacoes: saved ? saved.observacoes || '' : '',
        isDirty: false
      }
    }));
  };

  // Confirmar e salvar alterações da linha [V]
  const handleConfirmRow = async (colabId: string) => {
    const draft = drafts[colabId];
    if (!draft) return;

    setSavingStatus(prev => ({ ...prev, [colabId]: 'saving' }));

    const minutosPos = timeToMinutes(draft.positivos);
    const minutosNeg = timeToMinutes(draft.negativos);
    const observacoes = draft.observacoes.trim();

    try {
      const current = lancamentos[colabId];
      if (current && current.id) {
        await updateDoc(doc(db, 'banco_horas_lancamentos', current.id), {
          minutosPositivos: minutosPos,
          minutosNegativos: minutosNeg,
          observacoes
        });
        setLancamentos(prev => ({
          ...prev,
          [colabId]: {
            ...current,
            minutosPositivos: minutosPos,
            minutosNegativos: minutosNeg,
            observacoes
          }
        }));
      } else {
        const newRecord: Omit<BancoHorasLancamento, 'id'> = {
          colaboradorId: colabId,
          mesAno,
          minutosPositivos: minutosPos,
          minutosNegativos: minutosNeg,
          observacoes
        };
        const docRef = await addDoc(collection(db, 'banco_horas_lancamentos'), newRecord);
        setLancamentos(prev => ({
          ...prev,
          [colabId]: { id: docRef.id, ...newRecord }
        }));
      }

      setDrafts(prev => ({
        ...prev,
        [colabId]: {
          ...draft,
          positivos: minutesToTime(minutosPos).replace('-', ''),
          negativos: minutesToTime(minutosNeg).replace('-', ''),
          isDirty: false
        }
      }));

      setSavingStatus(prev => ({ ...prev, [colabId]: 'saved' }));
      setTimeout(() => {
        setSavingStatus(prev => ({ ...prev, [colabId]: undefined as any }));
      }, 3000);
    } catch (err) {
      console.error('Erro ao salvar lançamento:', err);
      setSavingStatus(prev => ({ ...prev, [colabId]: 'error' }));
    }
  };

  // Calcular saldo da linha com base no rascunho atual
  const getDraftSaldo = (colabId: string) => {
    const draft = drafts[colabId];
    if (!draft) return 0;
    const pos = timeToMinutes(draft.positivos);
    const neg = timeToMinutes(draft.negativos);
    return pos - neg;
  };

  const hasDataThisMonth = Object.values(lancamentos).some(
    l => (l.minutosPositivos || 0) > 0 || (l.minutosNegativos || 0) > 0
  );

  if (loadingColabs) return <div className="text-slate-400 p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* SELETOR DE MÊS COM ALTO CONTRASTE E VISIBILIDADE MÁXIMA */}
      <div className="bg-slate-900 border-2 border-indigo-500/70 p-5 rounded-2xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
            <Calendar className="w-4 h-4 text-amber-400" />
            COMPETÊNCIA / MÊS DE REFERÊNCIA
          </label>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeMonth(-1)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2.5 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 text-xs sm:text-sm"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4 text-indigo-400" />
              <span className="hidden sm:inline">Anterior</span>
            </button>

            {/* Input com Alto Contraste e Ícone de Calendário Invertido (100% visível) */}
            <div className="relative flex items-center">
              <input
                type="month"
                value={mesAno}
                onChange={e => setMesAno(e.target.value)}
                className="bg-slate-950 border-2 border-indigo-400 hover:border-amber-400 focus:border-amber-400 text-white font-black text-base sm:text-lg px-4 py-2 rounded-xl shadow-inner cursor-pointer transition-all uppercase tracking-wide [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:scale-125"
                title="Clique para escolher o Mês e Ano"
              />
            </div>

            <button
              onClick={() => changeMonth(1)}
              className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2.5 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95 text-xs sm:text-sm"
              title="Próximo Mês"
            >
              <span className="hidden sm:inline">Próximo</span>
              <ChevronRight className="w-4 h-4 text-indigo-400" />
            </button>
          </div>
        </div>

        <div className="flex flex-col md:items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Visualizando:</span>
            <span className="px-3.5 py-1.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 rounded-lg text-sm font-black uppercase tracking-wide">
              {formatMesAnoDisplay(mesAno)}
            </span>
          </div>

          {allAvailableMonths.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
              <span className="font-semibold text-slate-500">Meses com lançamentos:</span>
              {allAvailableMonths.slice(0, 4).map(m => (
                <button
                  key={m}
                  onClick={() => setMesAno(m)}
                  className={`px-2.5 py-1 rounded-md font-bold uppercase transition-all ${
                    mesAno === m
                      ? 'bg-amber-500 text-slate-950 shadow-md scale-105'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  }`}
                >
                  {formatMesAnoDisplay(m)}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!hasDataThisMonth && allAvailableMonths.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sm text-slate-300 animate-in fade-in">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <span>Nenhum lançamento efetuado ainda em <strong className="text-white capitalize">{formatMesAnoDisplay(mesAno)}</strong>.</span>
              <p className="text-slate-400 text-xs mt-0.5">Se você deseja editar os dados anteriores, eles estão salvos em outros meses.</p>
            </div>
          </div>
          <button
            onClick={() => setMesAno(allAvailableMonths[0])}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold whitespace-nowrap transition-colors flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            Ver Lançamentos de {formatMesAnoDisplay(allAvailableMonths[0])}
          </button>
        </div>
      )}

      {/* TABELA DE LANÇAMENTOS COM CONFIRMAÇÃO POR LINHA (V e X) */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl overflow-x-auto shadow-2xl">
        <div className="px-6 py-3.5 bg-slate-800/80 border-b border-slate-700/80 flex items-center justify-between">
          <span className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2">
            Lançamento Mensal de Horas • {formatMesAnoDisplay(mesAno)}
          </span>
          <span className="text-xs text-slate-400 font-medium">
            Dica: Digite as horas no formato <strong>HH:MM</strong> (suporta mais de 24h, ex: <strong>29:32</strong>) e clique no botão verde <strong>[V]</strong> para salvar.
          </span>
        </div>

        <table className="w-full text-left text-sm text-slate-300 min-w-[850px]">
          <thead className="bg-[#1e293b] text-slate-100 font-bold border-b border-slate-700">
            <tr>
              <th className="px-6 py-4 w-1/4">Colaborador</th>
              <th className="px-6 py-4 w-40 text-center">Horas Extras (+)</th>
              <th className="px-6 py-4 w-40 text-center">Faltas/Atrasos (-)</th>
              <th className="px-6 py-4 w-36 text-center">Saldo Mês</th>
              <th className="px-6 py-4">Observações</th>
              <th className="px-6 py-4 w-36 text-center">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {ativos.map(colab => {
              const draft = drafts[colab.id!] || {
                positivos: '00:00',
                negativos: '00:00',
                observacoes: '',
                isDirty: false
              };
              const saldo = getDraftSaldo(colab.id!);
              const status = savingStatus[colab.id!];
              const isDirty = draft.isDirty;

              return (
                <tr
                  key={colab.id}
                  className={`transition-colors ${
                    isDirty
                      ? 'bg-indigo-950/20 border-l-4 border-l-amber-400'
                      : 'hover:bg-slate-800/20'
                  }`}
                >
                  <td className="px-6 py-4 font-bold text-slate-200 uppercase">
                    {colab.nome}
                  </td>

                  {/* Input de Horas Positivas (Sem limite de 23h - aceita 29:32, etc.) */}
                  <td className="px-6 py-4 text-center">
                    <input
                      type="text"
                      value={draft.positivos}
                      onChange={e => handleDraftChange(colab.id!, 'positivos', e.target.value)}
                      onBlur={() => handleDurationBlur(colab.id!, 'positivos')}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmRow(colab.id!);
                      }}
                      placeholder="00:00"
                      className="bg-slate-950 border-2 border-emerald-500/50 hover:border-emerald-400 focus:border-emerald-400 text-emerald-400 font-mono font-bold text-base rounded-xl px-3 py-2 w-full text-center focus:outline-none transition-all"
                    />
                  </td>

                  {/* Input de Horas Negativas (Sem limite de 23h - aceita 29:32, etc.) */}
                  <td className="px-6 py-4 text-center">
                    <input
                      type="text"
                      value={draft.negativos}
                      onChange={e => handleDraftChange(colab.id!, 'negativos', e.target.value)}
                      onBlur={() => handleDurationBlur(colab.id!, 'negativos')}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmRow(colab.id!);
                      }}
                      placeholder="00:00"
                      className="bg-slate-950 border-2 border-red-500/50 hover:border-red-400 focus:border-red-400 text-red-400 font-mono font-bold text-base rounded-xl px-3 py-2 w-full text-center focus:outline-none transition-all"
                    />
                  </td>

                  {/* Saldo Calculado ao Vivo */}
                  <td className="px-6 py-4 text-center">
                    <span
                      className={`inline-block px-3 py-1.5 rounded-lg font-mono font-black text-sm ${
                        saldo > 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : saldo < 0
                          ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {minutesToTime(saldo)}
                    </span>
                  </td>

                  {/* Observações */}
                  <td className="px-6 py-4">
                    <input
                      type="text"
                      value={draft.observacoes}
                      onChange={e => handleDraftChange(colab.id!, 'observacoes', e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleConfirmRow(colab.id!);
                      }}
                      placeholder="Observações do mês..."
                      className="bg-slate-950 border border-slate-700 hover:border-slate-500 focus:border-indigo-500 rounded-lg w-full px-3 py-1.5 text-xs text-slate-300 focus:outline-none transition-colors"
                    />
                  </td>

                  {/* AÇÕES: BOTÕES DE CONFIRMAR [V] E CANCELAR [X] */}
                  <td className="px-6 py-4 text-center">
                    {status === 'saving' ? (
                      <div className="flex items-center justify-center gap-1.5 text-indigo-400 text-xs font-bold">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Salvando...</span>
                      </div>
                    ) : status === 'saved' ? (
                      <div className="flex items-center justify-center gap-1 text-emerald-400 text-xs font-bold animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Salvo!</span>
                      </div>
                    ) : status === 'error' ? (
                      <span className="text-red-400 text-xs font-bold">Erro ao salvar</span>
                    ) : isDirty ? (
                      <div className="flex items-center justify-center gap-2 animate-in zoom-in-95">
                        {/* Botão V de Confirmar */}
                        <button
                          onClick={() => handleConfirmRow(colab.id!)}
                          title="Confirmar e Salvar Lançamento (V)"
                          className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 rounded-lg font-black text-xs flex items-center justify-center gap-1 shadow-md hover:scale-105 active:scale-95 transition-all"
                        >
                          <Check className="w-4 h-4 stroke-[3]" />
                          <span className="hidden sm:inline">V</span>
                        </button>

                        {/* Botão X de Cancelar */}
                        <button
                          onClick={() => handleCancelRow(colab.id!)}
                          title="Cancelar e Desfazer Alterações (X)"
                          className="bg-slate-800 hover:bg-red-600 text-slate-300 hover:text-white p-2 rounded-lg font-black text-xs flex items-center justify-center gap-1 border border-slate-700 hover:border-red-500 hover:scale-105 active:scale-95 transition-all"
                        >
                          <X className="w-4 h-4 stroke-[3]" />
                          <span className="hidden sm:inline">X</span>
                        </button>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 font-medium">Gravado</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {ativos.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  Nenhum colaborador ativo cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
