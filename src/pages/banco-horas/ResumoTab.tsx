import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFirestore } from '../../hooks/useFirestore';
import { Colaborador, BancoHorasLancamento } from '../../types';
import { formatMinutesToPdfTime, minutesToTime } from '../../utils/timeFormat';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Loader2, Printer, AlertTriangle, ChevronLeft, ChevronRight, Calendar, Info, Layers } from 'lucide-react';
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
  // selecionar automaticamente o mês mais recente com dados para o usuário não achar que sumiu
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
    document.title = `Controle de Banco de horas - SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL`;
    
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
    return [...colaboradores].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [colaboradores]);

  const mesesDisponiveis = Object.keys(monthsWithData).sort().reverse();
  const mesAtualTemDados = (monthsWithData[mesAno] || 0) > 0;

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
            <Info className="w-5 h-5 text-indigo-400 shrink-0" />
            <div className="text-sm">
              <span className="text-slate-300">
                A competência de <strong className="text-white capitalize">{formatMesAnoDisplay(mesAno)}</strong> não possui horas lançadas.
              </span>
              <p className="text-slate-400 text-xs mt-0.5">
                Seus lançamentos salvos estão no histórico dos meses anteriores.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {mesesDisponiveis.map(m => (
              <button
                key={m}
                onClick={() => setMesAno(m)}
                className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 rounded-lg text-xs font-medium transition-colors capitalize"
              >
                Ir para {formatMesAnoDisplay(m)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Controles e Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-700/50 p-4 rounded-xl print:hidden">
        {/* Seletor de Mês e Navegação */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1">
            <button
              onClick={() => changeMonth(-1)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <input
              type="month"
              value={mesAno}
              onChange={e => setMesAno(e.target.value)}
              className="bg-transparent text-slate-200 text-sm font-medium px-2 py-1 focus:outline-none cursor-pointer"
            />

            <button
              onClick={() => changeMonth(1)}
              className="p-1.5 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <span className="text-xs text-slate-400 capitalize hidden sm:inline-block">
            {formatMesAnoDisplay(mesAno)}
          </span>

          {loadingLancamentos && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
        </div>

        {/* Alternador de Modo e Botão de Impressão */}
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
            <button
              onClick={() => setModoExibicao('mes')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                modoExibicao === 'mes'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mês Selecionado
            </button>
            <button
              onClick={() => setModoExibicao('acumulado')}
              className={`px-3 py-1.5 rounded-md font-medium transition-colors ${
                modoExibicao === 'acumulado'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Acumulado Geral
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors whitespace-nowrap shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimir Relatório (PDF)
          </button>
        </div>
      </div>

      {/* Tabela do Resumo no Dashboard */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden print:hidden shadow-lg">
        <div className="px-6 py-3 border-b border-slate-800 flex justify-between items-center bg-slate-800/40">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            {modoExibicao === 'mes'
              ? `Relatório da Competência: ${formatMesAnoDisplay(mesAno)}`
              : 'Relatório: Saldo Acumulado Geral (Histórico Completo)'}
          </span>
          <span className="text-xs text-slate-500">
            {sortedColaboradores.length} Colaboradores
          </span>
        </div>

        <table className="w-full text-left text-sm text-slate-300">
          <thead className="bg-[#1e293b] text-slate-200 font-bold border-b border-slate-700/60">
            <tr>
              <th className="px-6 py-3.5">Colaborador</th>
              <th className="px-6 py-3.5 text-center">Total Horas Positivas</th>
              <th className="px-6 py-3.5 text-center">Total Horas Negativas</th>
              <th className="px-6 py-3.5 text-center">Saldo Geral</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedColaboradores.map(colab => {
              const stats = getColabStats(colab.id!);
              
              if (colab.ativo === false && stats.horasPositivas === 0 && stats.horasNegativas === 0 && stats.saldoGeral === 0) {
                return null;
              }
              
              return (
                <tr key={colab.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-3.5 font-medium text-slate-200 uppercase">
                    {colab.nome}
                  </td>
                  <td className="px-6 py-3.5 text-center text-emerald-400 font-mono">
                    {formatMinutesToPdfTime(stats.horasPositivas)}
                  </td>
                  <td className="px-6 py-3.5 text-center text-red-400 font-mono">
                    {formatMinutesToPdfTime(stats.horasNegativas)}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    <span className={`px-3 py-1 rounded-md font-mono font-bold text-xs ${
                      stats.saldoGeral > 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : stats.saldoGeral < 0
                        ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                        : 'bg-slate-800 text-slate-400'
                    }`}>
                      {formatMinutesToPdfTime(stats.saldoGeral)}
                    </span>
                  </td>
                </tr>
              );
            })}
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

      {/* Componente de Impressão (Landscape, 100% Branco, Cabeçalho Azul) */}
      <LayoutPrintBancoHoras 
        mesAno={mesAno} 
        colaboradores={sortedColaboradores} 
        allLancamentos={allLancamentos}
        modoExibicao={modoExibicao}
      />
    </div>
  );
}
