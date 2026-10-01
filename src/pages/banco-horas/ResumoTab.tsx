import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Colaborador, BancoHorasLancamento } from '../../types';
import { formatMinutesToPdfTime, minutesToTime } from '../../utils/timeFormat';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, Printer, AlertTriangle, ChevronLeft, ChevronRight, Calendar, Info, Layers, Sparkles } from 'lucide-react';
import LayoutPrintBancoHoras from './LayoutPrintBancoHoras';

export default function ResumoTab() {
  const [mesAno, setMesAno] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [modoExibicao, setModoExibicao] = useState<'mes' | 'acumulado'>('mes');
  const { data: colaboradores, loading: loadingColabs } = useFirestore<Colaborador>('colaboradores');
  
  // Store all lancamentos
  const [allLancamentos, setAllLancamentos] = useState<BancoHorasLancamento[]>([]);
  const [loadingLancamentos, setLoadingLancamentos] = useState(false);
  const [printWarning, setPrintWarning] = useState(false);
  const hasAutoSelectedMonth = useRef(false);

  useEffect(() => {
    const fetchLancamentos = async () => {
      setLoadingLancamentos(true);
      try {
        const q = query(collection(db, 'banco_horas_lancamentos'));
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as BancoHorasLancamento));
        setAllLancamentos(data);
      } catch (err) {
        console.error('Erro ao carregar lançamentos:', err);
      } finally {
        setLoadingLancamentos(false);
      }
    };
    fetchLancamentos();
  }, []);

  // Mapear meses que possuem lançamentos
  const monthsWithData = useMemo(() => {
    const map: Record<string, number> = {};
    allLancamentos.forEach(l => {
      if (l.mesAno && ((l.minutosPositivos || 0) > 0 || (l.minutosNegativos || 0) > 0)) {
        map[l.mesAno] = (map[l.mesAno] || 0) + 1;
      }
    });
    return map;
  }, [allLancamentos]);

  // Se o mês atual estiver vazio no primeiro carregamento e houver dados em meses anteriores,
  // selecionar automaticamente o mês mais recente com dados para o usuário ver de imediato
  useEffect(() => {
    if (allLancamentos.length > 0 && !hasAutoSelectedMonth.current) {
      hasAutoSelectedMonth.current = true;
      const sorted = Object.keys(monthsWithData).sort().reverse();
      if (sorted.length > 0 && !monthsWithData[mesAno]) {
        setMesAno(sorted[0]);
      }
    }
  }, [allLancamentos, monthsWithData, mesAno]);

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

  const handlePrint = () => {
    if (window.self !== window.top) {
      setPrintWarning(true);
      setTimeout(() => setPrintWarning(false), 8000);
    }
    
    const originalTitle = document.title;
    document.title = `Controle de Banco de Horas - Simples Assessoria - ${mesAno}`;
    
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 150);
  };

  const getColabStats = (colabId: string) => {
    const colabRecords = allLancamentos.filter(l => l.colaboradorId === colabId);
    
    let totalPositivos = 0;
    let totalNegativos = 0;
    
    let mesPositivos = 0;
    let mesNegativos = 0;

    colabRecords.forEach(l => {
      totalPositivos += (l.minutosPositivos || 0);
      totalNegativos += (l.minutosNegativos || 0);
      
      if (l.mesAno === mesAno) {
        mesPositivos += (l.minutosPositivos || 0);
        mesNegativos += (l.minutosNegativos || 0);
      }
    });

    if (modoExibicao === 'acumulado') {
      return {
        horasPositivas: totalPositivos,
        horasNegativas: totalNegativos,
        saldoGeral: totalPositivos - totalNegativos,
        temLancamentosNoMes: mesPositivos > 0 || mesNegativos > 0
      };
    }

    return {
      horasPositivas: mesPositivos,
      horasNegativas: mesNegativos,
      saldoGeral: mesPositivos - mesNegativos,
      temLancamentosNoMes: mesPositivos > 0 || mesNegativos > 0
    };
  };

  const sortedColaboradores = useMemo(() => {
    return [...colaboradores]
      .filter(c => c.ativo !== false)
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [colaboradores]);

  const mesesDisponiveis = Object.keys(monthsWithData).sort().reverse();
  const mesAtualTemDados = (monthsWithData[mesAno] || 0) > 0;

  // Totais consolidados
  let totalSomaPositivas = 0;
  let totalSomaNegativas = 0;
  sortedColaboradores.forEach(c => {
    const s = getColabStats(c.id!);
    totalSomaPositivas += s.horasPositivas;
    totalSomaNegativas += s.horasNegativas;
  });
  const totalSaldoConsolidado = totalSomaPositivas - totalSomaNegativas;

  if (loadingColabs) return <div className="text-slate-400 p-8 text-center">Carregando...</div>;

  return (
    <div className="space-y-6">
      {printWarning && (
        <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3 print:hidden animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-500 font-bold text-sm">Aviso de Impressão (Modo Preview)</h4>
            <p className="text-amber-400/90 text-sm mt-1">
              Caso seu navegador bloqueie a caixa de impressão dentro do modo Preview, abra em uma <strong>nova guia</strong> clicando no ícone de nova janela no canto superior direito.
            </p>
          </div>
        </div>
      )}

      {/* Aviso informativo caso o mês selecionado não possua lançamentos */}
      {!mesAtualTemDados && mesesDisponiveis.length > 0 && (
        <div className="bg-indigo-950/40 border border-indigo-500/30 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden animate-in fade-in">
          <div className="flex items-center gap-3">
            <Info className="w-5 h-5 text-amber-400 shrink-0" />
            <div className="text-sm">
              <span className="text-slate-300">
                A competência de <strong className="text-white capitalize">{formatMesAnoDisplay(mesAno)}</strong> não possui horas lançadas.
              </span>
              <p className="text-slate-400 text-xs mt-0.5">
                Seus lançamentos anteriores estão salvos e disponíveis no histórico.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mesesDisponiveis.map(m => (
              <button
                key={m}
                onClick={() => setMesAno(m)}
                className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 capitalize"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Ir para {formatMesAnoDisplay(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SELETOR DE MÊS COM ALTO CONTRASTE E VISIBILIDADE MÁXIMA */}
      <div className="bg-slate-900 border-2 border-indigo-500/70 p-5 rounded-2xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-5 print:hidden">
        {/* Seletor de Mês e Navegação */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <label className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-1.5 mb-1.5">
              <Calendar className="w-4 h-4 text-amber-400" />
              Competência
            </label>

            <div className="flex items-center gap-2">
              <button
                onClick={() => changeMonth(-1)}
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                title="Mês Anterior"
              >
                <ChevronLeft className="w-4 h-4 text-indigo-400" />
                <span className="text-xs hidden sm:inline">Anterior</span>
              </button>
              
              <input
                type="month"
                value={mesAno}
                onChange={e => setMesAno(e.target.value)}
                className="bg-slate-950 border-2 border-indigo-400 hover:border-amber-400 focus:border-amber-400 text-white font-black text-base px-3.5 py-1.5 rounded-xl shadow-inner cursor-pointer transition-all uppercase tracking-wide [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200 [&::-webkit-calendar-picker-indicator]:opacity-100 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:scale-125"
              />

              <button
                onClick={() => changeMonth(1)}
                className="bg-slate-800 hover:bg-slate-700 text-white border border-slate-600 px-3 py-2 rounded-xl font-bold flex items-center gap-1 transition-all shadow-sm active:scale-95"
                title="Próximo Mês"
              >
                <span className="text-xs hidden sm:inline">Próximo</span>
                <ChevronRight className="w-4 h-4 text-indigo-400" />
              </button>
            </div>
          </div>

          <div className="sm:border-l sm:border-slate-800 sm:pl-4 flex flex-col justify-center">
            <span className="text-xs font-bold text-slate-400">Competência ativa:</span>
            <span className="text-sm font-black text-white uppercase tracking-wide">
              {formatMesAnoDisplay(mesAno)}
            </span>
          </div>

          {loadingLancamentos && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
        </div>

        {/* Alternador de Modo e Botão de Impressão */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setModoExibicao('mes')}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all ${
                modoExibicao === 'mes'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mês Selecionado
            </button>
            <button
              onClick={() => setModoExibicao('acumulado')}
              className={`px-3.5 py-2 rounded-lg font-bold transition-all ${
                modoExibicao === 'acumulado'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Acumulado Geral
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-black text-sm flex items-center gap-2 transition-all shadow-lg hover:shadow-blue-500/20 active:scale-95 whitespace-nowrap"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório Oficial (PDF)
          </button>
        </div>
      </div>

      {/* Tabela do Resumo no Dashboard */}
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl overflow-hidden print:hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/60">
          <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            {modoExibicao === 'mes'
              ? `Demonstrativo da Competência: ${formatMesAnoDisplay(mesAno)}`
              : 'Demonstrativo: Saldo Acumulado Geral (Histórico Completo)'}
          </span>
          <span className="text-xs font-bold text-slate-400">
            {sortedColaboradores.length} Colaboradores
          </span>
        </div>

        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#1e293b] text-slate-100 font-bold border-b border-slate-700">
            <tr>
              <th className="px-6 py-4">Colaborador</th>
              <th className="px-6 py-4 text-center">Total Horas Positivas</th>
              <th className="px-6 py-4 text-center">Total Horas Negativas</th>
              <th className="px-6 py-4 text-center">Saldo Geral</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/70">
            {sortedColaboradores.map(colab => {
              const stats = getColabStats(colab.id!);
              
              return (
                <tr key={colab.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-200 uppercase">
                    {colab.nome}
                  </td>
                  <td className="px-6 py-4 text-center text-emerald-400 font-mono font-bold">
                    {formatMinutesToPdfTime(stats.horasPositivas)}
                  </td>
                  <td className="px-6 py-4 text-center text-red-400 font-mono font-bold">
                    {formatMinutesToPdfTime(stats.horasNegativas)}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1.5 rounded-lg font-mono font-black text-xs ${
                      stats.saldoGeral > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : stats.saldoGeral < 0
                        ? 'bg-red-500/10 text-red-400 border border-red-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {formatMinutesToPdfTime(stats.saldoGeral)}
                    </span>
                  </td>
                </tr>
              );
            })}

            {sortedColaboradores.length > 0 && (
              <tr className="bg-slate-950 font-black border-t-2 border-slate-700">
                <td className="px-6 py-4 text-amber-400 uppercase tracking-wider text-xs">
                  Totais da Empresa
                </td>
                <td className="px-6 py-4 text-center text-emerald-400 font-mono text-sm">
                  {formatMinutesToPdfTime(totalSomaPositivas)}
                </td>
                <td className="px-6 py-4 text-center text-red-400 font-mono text-sm">
                  {formatMinutesToPdfTime(totalSomaNegativas)}
                </td>
                <td className="px-6 py-4 text-center">
                  <span className={`inline-block px-3.5 py-1.5 rounded-lg font-mono font-black text-xs ${
                    totalSaldoConsolidado > 0
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : totalSaldoConsolidado < 0
                      ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                      : 'bg-slate-800 text-slate-300'
                  }`}>
                    {formatMinutesToPdfTime(totalSaldoConsolidado)}
                  </span>
                </td>
              </tr>
            )}

            {sortedColaboradores.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                  Nenhum colaborador cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Componente de Impressão Oficial com Branding Simples Assessoria */}
      <LayoutPrintBancoHoras 
        mesAno={mesAno} 
        colaboradores={sortedColaboradores} 
        allLancamentos={allLancamentos}
        modoExibicao={modoExibicao}
      />
    </div>
  );
}
