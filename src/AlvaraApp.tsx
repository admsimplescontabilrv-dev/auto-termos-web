import React, { useState, useMemo } from 'react';
import { useFirestore } from './hooks/useFirestore';
import { Empresa, Alvara, AlvaraSituacao } from './types';
import { db } from './lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Printer,
  FileSpreadsheet,
  Building2,
  Calendar,
  Filter,
  Check
} from 'lucide-react';

export default function AlvaraApp() {
  const currentRealYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentRealYear);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('TODOS');
  const [savingField, setSavingField] = useState<string | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Local state for observações input values to allow smooth typing before onBlur
  const [localObs, setLocalObs] = useState<Record<string, string>>({});

  // 1. Fetch Alvarás and Empresas from Firestore
  const { data: alvaras, loading: loadingAlvaras } = useFirestore<Alvara>('alvaras');
  const { data: empresas, loading: loadingEmpresas } = useFirestore<Empresa>('empresas');

  // 2. Filter companies: show ONLY those that contain "LEGALIZAÇÃO" in modulosResponsavel
  const legalizacaoEmpresas = useMemo(() => {
    return empresas.filter((emp) => {
      if (!emp.modulosResponsavel || !Array.isArray(emp.modulosResponsavel)) return false;
      return emp.modulosResponsavel.some((mod) => {
        const normalized = (mod || '')
          .toUpperCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .trim();
        return normalized === 'LEGALIZACAO';
      });
    });
  }, [empresas]);

  // Map alvarás for easy lookup by `${empresaId}_${ano}`
  const alvarasMap = useMemo(() => {
    const map = new Map<string, Alvara>();
    alvaras.forEach((alvara) => {
      if (alvara.empresaId && alvara.ano) {
        map.set(`${alvara.empresaId}_${alvara.ano}`, alvara);
      }
    });
    return map;
  }, [alvaras]);

  // Combined rows for the selected year
  const rows = useMemo(() => {
    return legalizacaoEmpresas.map((emp) => {
      const key = `${emp.id}_${selectedYear}`;
      const record = alvarasMap.get(key);
      const situacao: AlvaraSituacao | string = record?.situacao || 'PENDENTE';
      const observacoes = localObs[emp.id] !== undefined ? localObs[emp.id] : (record?.observacoes || '');

      return {
        empresa: emp,
        alvaraId: record?.id || key,
        situacao,
        observacoes,
        updatedAt: record?.updatedAt
      };
    });
  }, [legalizacaoEmpresas, alvarasMap, selectedYear, localObs]);

  // Filtered rows by search and status
  const filteredRows = useMemo(() => {
    return rows.filter((row) => {
      const query = searchTerm.toLowerCase().trim();
      const matchSearch =
        !query ||
        row.empresa.nome?.toLowerCase().includes(query) ||
        row.empresa.cnpj?.toLowerCase().includes(query) ||
        row.empresa.codigo?.toLowerCase().includes(query) ||
        row.empresa.cidade?.toLowerCase().includes(query) ||
        row.observacoes?.toLowerCase().includes(query);

      const matchStatus =
        statusFilter === 'TODOS' ||
        (statusFilter === 'EMITIDO_CONCLUIDO' && (row.situacao === 'EMITIDO' || row.situacao === 'CONCLUÍDO')) ||
        row.situacao === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [rows, searchTerm, statusFilter]);

  // KPI Metrics for the selected year
  const metrics = useMemo(() => {
    let pendente = 0;
    let emAndamento = 0;
    let naoPago = 0;
    let paralisado = 0;
    let emitidoConcluido = 0;

    rows.forEach((r) => {
      if (r.situacao === 'EMITIDO' || r.situacao === 'CONCLUÍDO') emitidoConcluido++;
      else if (r.situacao === 'EM ANDAMENTO') emAndamento++;
      else if (r.situacao === 'NÃO PAGO') naoPago++;
      else if (r.situacao === 'PARALISADO') paralisado++;
      else pendente++;
    });

    return {
      total: rows.length,
      pendente,
      emAndamento,
      naoPago,
      paralisado,
      emitidoConcluido
    };
  }, [rows]);

  // Save changes to Firestore
  const handleSaveAlvara = async (
    empresa: Empresa,
    field: 'situacao' | 'observacoes',
    value: string
  ) => {
    const docId = `${empresa.id}_${selectedYear}`;
    const existing = alvarasMap.get(docId);

    setSavingField(`${empresa.id}_${field}`);

    const newSituacao = field === 'situacao' ? value : (existing?.situacao || 'PENDENTE');
    const newObservacoes = field === 'observacoes' ? value : (existing?.observacoes || '');

    const docData: Alvara = {
      empresaId: empresa.id,
      empresaNome: empresa.nome,
      cnpj: empresa.cnpj || '',
      codigo: empresa.codigo || '',
      ano: selectedYear,
      situacao: newSituacao,
      observacoes: newObservacoes,
      updatedAt: Date.now()
    };

    try {
      await setDoc(doc(db, 'alvaras', docId), docData, { merge: true });
      setSaveSuccessMsg(`Salvo com sucesso`);
      setTimeout(() => setSaveSuccessMsg(null), 2500);
    } catch (err) {
      console.error('Erro ao salvar alvará:', err);
    } finally {
      setSavingField(null);
    }
  };

  // Color mapping matching DP & RH system
  const getSituacaoColorClass = (situacao: string) => {
    switch (situacao) {
      case 'EMITIDO':
      case 'CONCLUÍDO':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/30';
      case 'EM ANDAMENTO':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/50 hover:bg-amber-500/30';
      case 'NÃO PAGO':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/50 hover:bg-rose-500/30';
      case 'PARALISADO':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/50 hover:bg-orange-500/30';
      case 'PENDENTE':
      default:
        return 'bg-slate-900/80 text-slate-400 border-slate-700/80 hover:bg-slate-800';
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Controle de Alvarás - ${selectedYear}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 20px; color: #111; }
            h1 { font-size: 18px; margin-bottom: 4px; text-transform: uppercase; }
            p.sub { font-size: 12px; color: #666; margin-top: 0; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; }
            th { background-color: #f3f4f6; font-weight: bold; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-weight: bold; font-size: 10px; }
            .EMITIDO, .CONCLUÍDO { background-color: #d1fae5; color: #065f46; }
            .EM_ANDAMENTO { background-color: #fef3c7; color: #92400e; }
            .NÃO_PAGO { background-color: #fee2e2; color: #991b1b; }
            .PARALISADO { background-color: #ffedd5; color: #9a3412; }
            .PENDENTE { background-color: #f3f4f6; color: #374151; }
          </style>
        </head>
        <body>
          <h1>Controle de Alvarás - Exercício ${selectedYear}</h1>
          <p class="sub">Simples Assessoria Contábil • Gerado em ${new Date().toLocaleDateString('pt-BR')}</p>
          <table>
            <thead>
              <tr>
                <th style="width: 30px;">#</th>
                <th>EMPRESA</th>
                <th>CIDADE</th>
                <th>CNPJ / CÓDIGO</th>
                <th>SITUAÇÃO</th>
                <th>OBSERVAÇÕES</th>
              </tr>
            </thead>
            <tbody>
              ${filteredRows
                .map(
                  (r, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td><strong>${r.empresa.nome}</strong></td>
                  <td>${r.empresa.cidade || '—'}</td>
                  <td>${r.empresa.cnpj || '—'} ${r.empresa.codigo ? `(Cód: ${r.empresa.codigo})` : ''}</td>
                  <td><span class="badge ${r.situacao.replace(/\s+/g, '_')}">${r.situacao}</span></td>
                  <td>${r.observacoes || '—'}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  const handleOpenDrive = (emp: Empresa) => {
    if (emp.linkDrive && emp.linkDrive.trim()) {
      window.open(emp.linkDrive.trim(), '_blank');
    } else {
      alert(`A empresa "${emp.nome}" não possui o link do Google Drive cadastrado. Você pode adicioná-lo no Cadastro de Empresas.`);
    }
  };

  const yearsOptions = [
    selectedYear - 2,
    selectedYear - 1,
    selectedYear,
    selectedYear + 1,
    selectedYear + 2
  ];

  return (
    <div className="w-full max-w-[1600px] mx-auto p-4 md:p-8 flex flex-col gap-6 animate-in fade-in duration-200">
      
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-700/50 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div>
          <div className="flex items-center gap-2.5 text-amber-400 text-xs font-bold uppercase tracking-widest mb-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>MÓDULO DE LEGALIZAÇÃO</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
            <span>Controle de Alvarás</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono">
              {selectedYear}
            </span>
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Acompanhamento anual dos alvarás de funcionamento, vigilância sanitária e bombeiros para empresas sob legalização.
          </p>
        </div>

        {/* Year Selector & Print Button */}
        <div className="flex items-center flex-wrap gap-3 z-10">
          {/* Year Navigator */}
          <div className="flex items-center bg-slate-950 border border-slate-700/70 rounded-xl p-1 shadow-inner">
            <button
              onClick={() => setSelectedYear((prev) => prev - 1)}
              title="Ano anterior"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-transparent text-white font-bold text-sm px-3 py-1 cursor-pointer focus:outline-none appearance-none text-center"
            >
              {yearsOptions.map((yr) => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  Ano {yr}
                </option>
              ))}
            </select>

            <button
              onClick={() => setSelectedYear((prev) => prev + 1)}
              title="Próximo ano"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {selectedYear !== currentRealYear && (
            <button
              onClick={() => setSelectedYear(currentRealYear)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 rounded-xl border border-slate-700 transition-colors"
            >
              Ano Atual ({currentRealYear})
            </button>
          )}

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl border border-slate-700 font-semibold text-xs tracking-wider transition-colors shadow-sm"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>IMPRIMIR</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Empresas</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-white">{metrics.total}</span>
            <Building2 className="w-4 h-4 text-slate-500" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Com módulo Legalização</span>
        </div>

        <div className="bg-slate-900 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pendentes</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-slate-300">{metrics.pendente}</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <span className="text-[10px] text-slate-500 mt-1">A iniciar no ano</span>
        </div>

        <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wider">Em Andamento</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-400">{metrics.emAndamento}</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-[10px] text-amber-500/70 mt-1">Protocolados / tramitando</span>
        </div>

        <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">Não Pago</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-400">{metrics.naoPago}</span>
            <AlertCircle className="w-4 h-4 text-rose-400" />
          </div>
          <span className="text-[10px] text-rose-500/70 mt-1">Taxas pendentes</span>
        </div>

        <div className="bg-orange-950/20 border border-orange-500/30 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[11px] font-bold text-orange-300 uppercase tracking-wider">Paralisado</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-orange-400">{metrics.paralisado}</span>
            <AlertCircle className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-[10px] text-orange-500/70 mt-1">Exigência ou travado</span>
        </div>

        <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 flex flex-col justify-between shadow-lg">
          <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">Emitido / Concluído</span>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-400">{metrics.emitidoConcluido}</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-[10px] text-emerald-500/70 mt-1">Alvará regular</span>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar por empresa, CNPJ, código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700/60 text-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-amber-500 placeholder:text-slate-600 transition-colors"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-2.5 text-xs text-slate-500 hover:text-slate-300"
            >
              Limpar
            </button>
          )}
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 md:pb-0">
          <span className="text-xs text-slate-500 font-semibold mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" />
            Filtrar:
          </span>
          {[
            { id: 'TODOS', label: 'Todos' },
            { id: 'PENDENTE', label: 'Pendentes' },
            { id: 'EM ANDAMENTO', label: 'Em Andamento' },
            { id: 'NÃO PAGO', label: 'Não Pago' },
            { id: 'PARALISADO', label: 'Paralisado' },
            { id: 'EMITIDO_CONCLUIDO', label: 'Emitidos' }
          ].map((pill) => (
            <button
              key={pill.id}
              onClick={() => setStatusFilter(pill.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors border ${
                statusFilter === pill.id
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                  : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Table Card (Planilha de Alvarás) */}
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Table Header / Subbar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <h2 className="text-white font-bold text-sm tracking-wider uppercase">
              Planilha de Alvarás ({filteredRows.length} {filteredRows.length === 1 ? 'empresa' : 'empresas'})
            </h2>
          </div>

          {saveSuccessMsg && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {saveSuccessMsg}
            </span>
          )}
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead>
              <tr className="bg-slate-950/80 text-slate-400 text-[11px] font-bold tracking-wider uppercase border-b border-slate-800">
                <th className="py-3 px-3 w-12 text-center border-r border-slate-800">#</th>
                <th className="py-3 px-4 min-w-[260px] border-r border-slate-800">Empresa</th>
                <th className="py-3 px-4 min-w-[160px] border-r border-slate-800">Cidade</th>
                <th className="py-3 px-4 w-52 border-r border-slate-800">Situação do Alvará ({selectedYear})</th>
                <th className="py-3 px-4 min-w-[300px] border-r border-slate-800">Observações</th>
                <th className="py-3 px-4 w-36 text-center">Ações / Drive</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-sm">
              {loadingAlvaras || loadingEmpresas ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <div className="inline-flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                      <span>Carregando dados de alvarás e empresas...</span>
                    </div>
                  </td>
                </tr>
              ) : legalizacaoEmpresas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <div className="max-w-md mx-auto flex flex-col items-center gap-3 text-slate-400">
                      <ShieldCheck className="w-12 h-12 text-slate-600 mb-1" />
                      <p className="font-bold text-white text-base">Nenhuma empresa com módulo "LEGALIZAÇÃO"</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        Para que uma empresa conste nesta planilha, acesse o <strong>Cadastro de Empresas</strong>, edite o cadastro desejado e marque a opção <strong>"LEGALIZAÇÃO"</strong> em Módulos Responsáveis.
                      </p>
                      <button
                        onClick={() => {
                          window.dispatchEvent(new CustomEvent('navigate-module', { detail: 'empresas' }));
                        }}
                        className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold tracking-wider transition-colors"
                      >
                        Ir para Cadastro de Empresas
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 text-sm">
                    Nenhuma empresa encontrada com os filtros informados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => {
                  const emp = row.empresa;
                  const isSavingThis = savingField?.startsWith(emp.id);

                  return (
                    <tr
                      key={emp.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* # Index */}
                      <td className="py-3 px-3 text-center text-xs font-mono text-slate-500 border-r border-slate-800/60 bg-slate-900/40">
                        {index + 1}
                      </td>

                      {/* Empresa Nome, CNPJ e Código */}
                      <td className="py-3 px-4 border-r border-slate-800/60">
                        <div className="flex flex-col">
                          <span className="font-bold text-white group-hover:text-amber-300 transition-colors">
                            {emp.nome}
                          </span>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                            {emp.codigo && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700/60 text-[10px] font-bold">
                                CÓD: {emp.codigo}
                              </span>
                            )}
                            <span>{emp.cnpj || 'CNPJ não informado'}</span>
                          </div>
                        </div>
                      </td>

                      {/* Cidade da Empresa */}
                      <td className="py-3 px-4 border-r border-slate-800/60">
                        {emp.cidade ? (
                          <span className="text-xs font-semibold text-slate-300">
                            {emp.cidade}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-600 italic">—</span>
                        )}
                      </td>

                      {/* Situação do Alvará */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60">
                        <div className="relative">
                          <select
                            value={row.situacao}
                            onChange={(e) => handleSaveAlvara(emp, 'situacao', e.target.value)}
                            className={`w-full text-xs font-bold rounded-lg px-3 py-2 border cursor-pointer focus:outline-none transition-all shadow-sm ${getSituacaoColorClass(
                              row.situacao
                            )}`}
                          >
                            <option value="PENDENTE" className="bg-slate-900 text-slate-300">
                              PENDENTE
                            </option>
                            <option value="EM ANDAMENTO" className="bg-slate-900 text-amber-300">
                              EM ANDAMENTO
                            </option>
                            <option value="NÃO PAGO" className="bg-slate-900 text-rose-300">
                              NÃO PAGO
                            </option>
                            <option value="PARALISADO" className="bg-slate-900 text-orange-300">
                              PARALISADO
                            </option>
                            <option value="EMITIDO" className="bg-slate-900 text-emerald-300">
                              EMITIDO
                            </option>
                            <option value="CONCLUÍDO" className="bg-slate-900 text-emerald-300">
                              CONCLUÍDO
                            </option>
                          </select>
                        </div>
                      </td>

                      {/* Observações com salvamento onBlur */}
                      <td className="py-2.5 px-3 border-r border-slate-800/60">
                        <div className="relative">
                          <input
                            type="text"
                            value={row.observacoes}
                            placeholder="Digitar observação sobre o alvará..."
                            onChange={(e) => {
                              const val = e.target.value;
                              setLocalObs((prev) => ({ ...prev, [emp.id]: val }));
                            }}
                            onBlur={(e) => {
                              handleSaveAlvara(emp, 'observacoes', e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            className="w-full bg-slate-950/60 border border-slate-800 text-slate-200 text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500 placeholder:text-slate-600 transition-colors"
                          />
                          {isSavingThis && (
                            <span className="absolute right-2.5 top-2.5 text-[10px] text-amber-400 flex items-center gap-1 font-mono">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              Salvando...
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ações / Drive */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleOpenDrive(emp)}
                          title={emp.linkDrive ? 'Abrir pasta no Google Drive' : 'Sem link de Drive cadastrado'}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            emp.linkDrive && emp.linkDrive.trim()
                              ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 hover:bg-indigo-600/30 hover:text-white'
                              : 'bg-slate-800/50 text-slate-500 border border-slate-800 hover:text-slate-400'
                          }`}
                        >
                          <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span>Abrir Pasta</span>
                          {emp.linkDrive && <ExternalLink className="w-3 h-3 text-slate-400 ml-0.5" />}
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 px-4">
          <span>
            Mostrando {filteredRows.length} de {legalizacaoEmpresas.length} empresas com módulo Legalização no ano de {selectedYear}
          </span>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            As alterações de situação e observações são salvas instantaneamente no Firestore
          </span>
        </div>
      </div>
    </div>
  );
}
