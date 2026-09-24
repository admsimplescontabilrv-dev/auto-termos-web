import React, { useState, useEffect, useMemo } from 'react';
import { Empresa, Sindicato, CalendarEvent } from '../types';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { 
  Printer, 
  Loader2, 
  AlertTriangle, 
  Search, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Building2, 
  CalendarDays, 
  CheckSquare, 
  Square, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import { format, addMonths, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import LayoutPrintRelatorioChecklist from '../LayoutPrintRelatorioChecklist';
import { checkIsEventCompleted, toggleUnifiedEventCompletion } from '../utils/eventSync';
import { getCompetenciaAtual } from '../utils/competenciaUtils';

interface RelatoriosChecklistTabProps {
  empresas: Empresa[];
}

interface ProcessedReportItem {
  id: string; // event id
  originalEventId?: string;
  titulo: string;
  tipo: 'Fixo' | 'Aviso';
  status: 'Concluído' | 'Pendente';
  dataConclusao?: number | null;
  empresaNome: string;
  empresaId: string;
  eventRaw: CalendarEvent;
  isRecurrent: boolean;
  dataEventoStr?: string;
}

export default function RelatoriosChecklistTab({ empresas }: RelatoriosChecklistTabProps) {
  const [currentDate, setCurrentDate] = useState<Date>(() => getCompetenciaAtual(new Date()));

  const reportMonth = useMemo(() => format(currentDate, 'yyyy-MM'), [currentDate]);

  // Sindicatos e Eventos
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [recurrentCompletions, setRecurrentCompletions] = useState<Record<string, { completedAt?: number }>>({});
  const [loading, setLoading] = useState(true);

  // Filtros
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [empresaSearchTerm, setEmpresaSearchTerm] = useState('');
  const [globalSearchTerm, setGlobalSearchTerm] = useState('');
  const [filterTipo, setFilterTipo] = useState<'ALL' | 'FIXAS' | 'AVISOS'>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'PENDENTES' | 'CONCLUIDOS'>('ALL');
  const [printWarning, setPrintWarning] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Inicializa empresas selecionadas com todas as empresas disponíveis
  useEffect(() => {
    if (empresas.length > 0 && selectedEmpresas.length === 0) {
      setSelectedEmpresas(empresas.map(e => e.id));
    }
  }, [empresas]);

  // Listener para Sindicatos
  useEffect(() => {
    const unsubSind = onSnapshot(collection(db, 'sindicatos'), (snap) => {
      setSindicatos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Sindicato)));
    });
    return () => unsubSind();
  }, []);

  // Listener em tempo real para CalendarEvents
  useEffect(() => {
    const unsubEvents = onSnapshot(collection(db, 'calendarEvents'), (snap) => {
      setCalendarEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as CalendarEvent)));
      setLoading(false);
    });
    return () => unsubEvents();
  }, []);

  // Listener em tempo real para RecurrentCompletions no mês selecionado
  useEffect(() => {
    const qCompletions = query(collection(db, 'recurrentCompletions'), where('monthKey', '==', reportMonth));
    const unsubComp = onSnapshot(qCompletions, (snap) => {
      const map: Record<string, { completedAt?: number }> = {};
      snap.docs.forEach(d => {
        const data = d.data();
        map[`${data.eventId}_${data.entityId}_${data.monthKey}`] = { completedAt: data.completedAt };
        map[`${data.eventId}_${data.entityId}`] = { completedAt: data.completedAt };
        map[d.id] = { completedAt: data.completedAt };
      });
      setRecurrentCompletions(map);
    });
    return () => unsubComp();
  }, [reportMonth]);

  // Processamento e unificação dos itens do relatório
  const reportData = useMemo(() => {
    const [anoStr, mesStr] = reportMonth.split('-');
    const currentYear = parseInt(anoStr);
    const currentMonth = parseInt(mesStr) - 1;

    const padraoSindicato = sindicatos.find(s => s.nome?.toUpperCase().includes('PADRÃO'));
    const padraoId = padraoSindicato?.id;

    const items: ProcessedReportItem[] = [];
    const empresasToProcess = empresas.filter(e => selectedEmpresas.includes(e.id));

    empresasToProcess.forEach(empresa => {
      const sindicatoId = empresa.sindicatoId;
      const sindicatoNome = sindicatos.find(s => s.id === sindicatoId)?.nome?.toUpperCase() || '';
      const isProLabore = sindicatoNome.includes('PRO LABORE') || sindicatoNome.includes('PRÓ LABORE') || sindicatoNome.includes('PRÓ-LABORE');

      // 1. Obrigações Fixas / Recorrentes
      if (filterTipo === 'ALL' || filterTipo === 'FIXAS') {
        const fixedEvents = calendarEvents.filter(e => {
          if (!e.isRecurrent) return false;
          // Evento atribuído à empresa, ao sindicato da empresa ou ao padrão
          return (
            e.empresaId === empresa.id ||
            (sindicatoId && e.empresaId === sindicatoId) ||
            (padraoId && !isProLabore && e.empresaId === padraoId)
          );
        });

        fixedEvents.forEach(event => {
          // Checa se evento anual se aplica a este mês
          if (event.recurrentRule === 'YEARLY' && event.recurrentMonth !== undefined && event.recurrentMonth !== currentMonth) {
            return;
          }

          const completion = checkIsEventCompleted(event, empresa.id, reportMonth, recurrentCompletions);

          items.push({
            id: event.id,
            originalEventId: event.originalEventId || event.id,
            titulo: event.title,
            tipo: 'Fixo',
            status: completion.completed ? 'Concluído' : 'Pendente',
            dataConclusao: completion.completedAt,
            empresaNome: empresa.nome,
            empresaId: empresa.id,
            eventRaw: event,
            isRecurrent: true,
          });
        });
      }

      // 2. Avisos Prévios, Prazos e Inclusões Pontuais do Mês
      if (filterTipo === 'ALL' || filterTipo === 'AVISOS') {
        const oneOffEvents = calendarEvents.filter(e => {
          if (e.isRecurrent) return false;
          const isEntityMatch = (
            e.empresaId === empresa.id ||
            (sindicatoId && e.empresaId === sindicatoId) ||
            (padraoId && !isProLabore && e.empresaId === padraoId)
          );
          if (!isEntityMatch) return false;

          const d = new Date(e.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        oneOffEvents.forEach(event => {
          const completion = checkIsEventCompleted(event, empresa.id, reportMonth, recurrentCompletions);
          const d = new Date(event.date);

          items.push({
            id: event.id,
            originalEventId: event.originalEventId || event.id,
            titulo: event.title,
            tipo: 'Aviso',
            status: completion.completed ? 'Concluído' : 'Pendente',
            dataConclusao: completion.completedAt,
            empresaNome: empresa.nome,
            empresaId: empresa.id,
            eventRaw: event,
            isRecurrent: false,
            dataEventoStr: format(d, 'dd/MM/yyyy'),
          });
        });
      }
    });

    // Filtro adicional por Status
    let filtered = items;
    if (filterStatus === 'PENDENTES') {
      filtered = filtered.filter(i => i.status === 'Pendente');
    } else if (filterStatus === 'CONCLUIDOS') {
      filtered = filtered.filter(i => i.status === 'Concluído');
    }

    // Filtro por texto global (busca na empresa ou na obrigação)
    if (globalSearchTerm.trim()) {
      const term = globalSearchTerm.toLowerCase();
      filtered = filtered.filter(i => 
        i.empresaNome.toLowerCase().includes(term) || 
        i.titulo.toLowerCase().includes(term)
      );
    }

    // Ordenação: Empresa -> Status (Pendentes primeiro) -> Título
    return filtered.sort((a, b) => {
      if (a.empresaNome !== b.empresaNome) return a.empresaNome.localeCompare(b.empresaNome);
      if (a.status !== b.status) return a.status === 'Pendente' ? -1 : 1;
      return a.titulo.localeCompare(b.titulo);
    });
  }, [calendarEvents, recurrentCompletions, empresas, sindicatos, selectedEmpresas, reportMonth, filterTipo, filterStatus, globalSearchTerm]);

  // Estatísticas do Relatório
  const stats = useMemo(() => {
    const total = reportData.length;
    const concluidos = reportData.filter(i => i.status === 'Concluído').length;
    const pendentes = total - concluidos;
    const percentual = total > 0 ? Math.round((concluidos / total) * 100) : 0;
    return { total, concluidos, pendentes, percentual };
  }, [reportData]);

  // Agrupamento por Empresa
  const groupedData = useMemo(() => {
    return reportData.reduce((acc, item) => {
      if (!acc[item.empresaId]) acc[item.empresaId] = [];
      acc[item.empresaId].push(item);
      return acc;
    }, {} as Record<string, ProcessedReportItem[]>);
  }, [reportData]);

  // Alterna conclusão diretamente no Relatório
  const handleToggleItem = async (item: ProcessedReportItem) => {
    setActionLoadingId(item.id + '_' + item.empresaId);
    try {
      const isCurrentlyCompleted = item.status === 'Concluído';
      await toggleUnifiedEventCompletion({
        eventId: item.id,
        empresaId: item.empresaId,
        monthKey: reportMonth,
        isCompleted: isCurrentlyCompleted,
        event: item.eventRaw,
      });
    } catch (err) {
      console.error('Erro ao alternar conclusão no relatório:', err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleEmpresa = (id: string) => {
    setSelectedEmpresas(prev => 
      prev.includes(id) ? prev.filter(e => e !== id) : [...prev, id]
    );
  };

  const toggleAllEmpresas = () => {
    if (selectedEmpresas.length === empresas.length) {
      setSelectedEmpresas([]);
    } else {
      setSelectedEmpresas(empresas.map(e => e.id));
    }
  };

  const handlePrint = () => {
    if (window.self !== window.top) {
      setPrintWarning(true);
      setTimeout(() => setPrintWarning(false), 8000);
    }
    
    const originalTitle = document.title;
    const mesFormatado = format(currentDate, 'MMMM yyyy', { locale: ptBR });
    document.title = `RELATORIO DE OBRIGACOES - ${mesFormatado.toUpperCase()}`;
    
    setTimeout(() => {
      window.print();
      document.title = originalTitle;
    }, 100);
  };

  const filteredEmpresasList = useMemo(() => {
    if (!empresaSearchTerm.trim()) return empresas;
    return empresas.filter(e => e.nome.toLowerCase().includes(empresaSearchTerm.toLowerCase()));
  }, [empresas, empresaSearchTerm]);

  return (
    <div className="flex-1 w-full bg-slate-900 border border-slate-700/50 rounded-2xl p-4 md:p-6 shadow-xl flex flex-col h-full animate-in fade-in zoom-in-95 duration-200 print:bg-white print:border-none print:shadow-none print:p-0">
      
      {printWarning && (
        <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl flex items-start gap-3 mb-6 print:hidden animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-amber-500 font-bold text-sm">Aviso de Impressão (Modo Preview)</h4>
            <p className="text-amber-400/90 text-sm mt-1">
              Para salvar ou imprimir em alta definição, abra o sistema em uma <strong>nova guia</strong> clicando no ícone do navegador.
            </p>
          </div>
        </div>
      )}

      {/* PAINEL DE CONTROLE E FILTROS */}
      <div className="space-y-4 mb-6 print:hidden">
        
        {/* Linha Superior: Navegador de Mês + Estatísticas Rápidas + Botão Imprimir */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 bg-slate-950/70 p-4 rounded-xl border border-slate-800">
          
          {/* Navegador de Mês */}
          <div className="flex items-center space-x-3 bg-slate-900 border border-slate-700/60 p-1.5 rounded-xl">
            <button 
              onClick={() => setCurrentDate(subMonths(currentDate, 1))} 
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Mês Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center min-w-[170px]">
              <span className="text-base font-bold text-slate-100 capitalize">
                {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
              </span>
              <span className="text-[10px] text-indigo-400 font-medium tracking-wide">
                Ciclo: 16/{format(currentDate, 'MM')} a 15/{format(addMonths(currentDate, 1), 'MM')}
              </span>
            </div>
            <button 
              onClick={() => setCurrentDate(addMonths(currentDate, 1))} 
              className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
              title="Próximo Mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Cards de Métricas Rápidas */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 flex-1 max-w-2xl">
            <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 text-center">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Total</span>
              <p className="text-lg font-black text-white">{stats.total}</p>
            </div>
            <div className="bg-emerald-950/40 border border-emerald-800/40 rounded-lg p-2.5 text-center">
              <span className="text-[10px] font-bold text-emerald-400 uppercase">Concluídos</span>
              <p className="text-lg font-black text-emerald-400">{stats.concluidos}</p>
            </div>
            <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-2.5 text-center">
              <span className="text-[10px] font-bold text-amber-400 uppercase">Pendentes</span>
              <p className="text-lg font-black text-amber-400">{stats.pendentes}</p>
            </div>
            <div className="bg-indigo-950/40 border border-indigo-800/40 rounded-lg p-2.5 text-center">
              <span className="text-[10px] font-bold text-indigo-400 uppercase">Conclusão</span>
              <p className="text-lg font-black text-indigo-300">{stats.percentual}%</p>
            </div>
          </div>

          {/* Botão de Impressão */}
          <button 
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-600/20 shrink-0 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir PDF</span>
          </button>
        </div>

        {/* Linha de Filtros: Tipo + Status + Busca Global */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          
          {/* Busca por Obrigação / Empresa */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Buscar por obrigação ou empresa (ex: Emilly, FGTS)..."
              value={globalSearchTerm}
              onChange={e => setGlobalSearchTerm(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Filtro por Tipo de Obrigação */}
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterTipo('ALL')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterTipo === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Todas as Obrigações
            </button>
            <button
              onClick={() => setFilterTipo('FIXAS')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterTipo === 'FIXAS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Fixas
            </button>
            <button
              onClick={() => setFilterTipo('AVISOS')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterTipo === 'AVISOS' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Avisos & Prazos
            </button>
          </div>

          {/* Filtro por Status */}
          <div className="flex bg-slate-950 border border-slate-800 p-1 rounded-xl">
            <button
              onClick={() => setFilterStatus('ALL')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterStatus === 'ALL' ? 'bg-slate-800 text-slate-200' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterStatus('PENDENTES')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterStatus === 'PENDENTES' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Somente Pendentes
            </button>
            <button
              onClick={() => setFilterStatus('CONCLUIDOS')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-colors ${filterStatus === 'CONCLUIDOS' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Concluídos
            </button>
          </div>
        </div>

        {/* Gaveta / Seletor de Empresas */}
        <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-3.5 custom-scrollbar">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5 pb-2 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-indigo-400" />
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Filtrar Empresas ({selectedEmpresas.length}/{empresas.length} selecionadas)
              </label>
            </div>
            <div className="flex items-center space-x-3">
              <input 
                type="text" 
                placeholder="Filtrar empresas..." 
                value={empresaSearchTerm}
                onChange={e => setEmpresaSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-700/60 text-slate-200 rounded-lg px-2.5 py-1 text-xs focus:outline-none focus:border-indigo-500 w-44"
              />
              <button 
                onClick={toggleAllEmpresas} 
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
              >
                {selectedEmpresas.length === empresas.length ? 'Desmarcar Todas' : 'Marcar Todas'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-36 overflow-y-auto custom-scrollbar pr-1">
            {filteredEmpresasList.map(emp => {
              const isChecked = selectedEmpresas.includes(emp.id);
              return (
                <label 
                  key={emp.id} 
                  className={`flex items-center space-x-2 p-1.5 rounded-lg cursor-pointer transition-colors text-xs ${isChecked ? 'bg-slate-900 text-slate-200 font-medium' : 'text-slate-500 hover:bg-slate-900/50'}`}
                >
                  <input 
                    type="checkbox" 
                    checked={isChecked}
                    onChange={() => toggleEmpresa(emp.id)}
                    className="w-3.5 h-3.5 rounded text-indigo-500 bg-slate-950 border-slate-700 focus:ring-indigo-500"
                  />
                  <span className="truncate" title={emp.nome}>{emp.nome}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* LISTA DE OBRIGAÇÕES POR EMPRESA */}
      <div className="flex-1 overflow-auto bg-slate-950 rounded-xl border border-slate-800 custom-scrollbar print:hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400 gap-3">
            <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="text-sm font-medium">Carregando relatório e sincronizando dados...</p>
          </div>
        ) : reportData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-2 p-6 text-center">
            <AlertCircle className="w-10 h-10 opacity-30 text-slate-400" />
            <p className="text-base font-semibold text-slate-300">Nenhuma obrigação encontrada para este filtro.</p>
            <p className="text-xs text-slate-500 max-w-md">
              Verifique se as empresas estão selecionadas ou se há eventos programados para o mês de {format(currentDate, 'MMMM yyyy', { locale: ptBR })}.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {Object.entries(groupedData).map(([empId, empItems]: [string, ProcessedReportItem[]]) => {
              const empPendentes = empItems.filter(i => i.status === 'Pendente').length;
              const empConcluidos = empItems.filter(i => i.status === 'Concluído').length;

              return (
                <div key={empId} className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
                  {/* Cabeçalho do Card da Empresa */}
                  <div className="bg-slate-800/60 px-4 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2.5">
                      <Building2 className="w-5 h-5 text-indigo-400 shrink-0" />
                      <h3 className="font-bold text-slate-100 text-base">{empItems[0].empresaNome}</h3>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-950 border border-slate-700 text-slate-300">
                        {empItems.length} {empItems.length === 1 ? 'obrigação' : 'obrigações'}
                      </span>
                      {empPendentes > 0 ? (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {empPendentes} pendente{empPendentes > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Tudo Concluído
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tabela de Obrigações da Empresa */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-300">
                      <thead className="bg-slate-950/50 text-slate-400 text-xs font-semibold uppercase tracking-wider">
                        <tr>
                          <th className="px-4 py-2.5 w-12 text-center">Ação</th>
                          <th className="px-4 py-2.5">Obrigação / Processo</th>
                          <th className="px-4 py-2.5 text-center w-28">Tipo</th>
                          <th className="px-4 py-2.5 text-center w-36">Status</th>
                          <th className="px-4 py-2.5 text-center w-40">Data Conclusão</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/50">
                        {empItems.map((item, idx) => {
                          const isCompleted = item.status === 'Concluído';
                          const isItemLoading = actionLoadingId === `${item.id}_${item.empresaId}`;

                          return (
                            <tr 
                              key={item.id + '_' + idx} 
                              className={`hover:bg-slate-800/30 transition-colors ${isCompleted ? 'bg-emerald-500/[0.02]' : ''}`}
                            >
                              {/* Checkbox de Ação Rápida */}
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleToggleItem(item)}
                                  disabled={isItemLoading}
                                  title={isCompleted ? 'Marcar como pendente' : 'Marcar como concluído'}
                                  className={`w-6 h-6 rounded flex items-center justify-center transition-all cursor-pointer ${
                                    isCompleted 
                                      ? 'bg-emerald-500 border border-emerald-400 text-white shadow-sm' 
                                      : 'border border-slate-600 hover:border-indigo-400 text-transparent hover:text-slate-400'
                                  }`}
                                >
                                  {isItemLoading ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                                  ) : isCompleted ? (
                                    <CheckSquare className="w-4 h-4" />
                                  ) : (
                                    <Square className="w-4 h-4" />
                                  )}
                                </button>
                              </td>

                              {/* Título da Obrigação */}
                              <td className="px-4 py-3">
                                <div className="flex items-center space-x-2">
                                  <span className={`font-medium ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-100'}`}>
                                    {item.titulo}
                                  </span>
                                  {item.dataEventoStr && (
                                    <span className="text-[10px] text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
                                      {item.dataEventoStr}
                                    </span>
                                  )}
                                </div>
                              </td>

                              {/* Tipo */}
                              <td className="px-4 py-3 text-center">
                                <span className={`text-[11px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                                  item.tipo === 'Fixo' 
                                    ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20' 
                                    : 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/20'
                                }`}>
                                  {item.tipo}
                                </span>
                              </td>

                              {/* Status Badge Interativo */}
                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleToggleItem(item)}
                                  disabled={isItemLoading}
                                  className={`px-3 py-1 text-xs font-bold rounded-full transition-all flex items-center justify-center gap-1.5 mx-auto cursor-pointer ${
                                    isCompleted
                                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
                                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                  }`}
                                >
                                  {isCompleted ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Concluído</span>
                                    </>
                                  ) : (
                                    <>
                                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Pendente</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Data de Resolução / Conclusão */}
                              <td className="px-4 py-3 text-center text-xs text-slate-400 font-mono">
                                {item.dataConclusao ? (
                                  <span className="text-emerald-400 font-medium">
                                    {format(new Date(item.dataConclusao), "dd/MM/yyyy 'às' HH:mm")}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* COMPONENTE DE IMPRESSÃO (A4) */}
      <LayoutPrintRelatorioChecklist 
        items={reportData.map(i => ({
          titulo: i.titulo,
          tipo: i.tipo,
          status: i.status,
          dataConclusao: i.dataConclusao,
          empresaNome: i.empresaNome,
          empresaId: i.empresaId,
        }))} 
        mesAno={reportMonth}
        empresas={empresas}
        empresaFiltro={selectedEmpresas.join(',')}
      />
    </div>
  );
}
