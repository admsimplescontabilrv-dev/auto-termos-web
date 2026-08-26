import { auth } from '../lib/firebase';
import React, { useState, useEffect, useRef } from 'react';
import { Empresa, Sindicato, ScheduleFrequency } from '../types';
import { X, Search, Briefcase, Building2, Upload, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { getTrimmedPdfBase64 } from '../pdfUtils';

interface UnifiedAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  empresas: Empresa[];
  sindicatos: Sindicato[];
  initialEmpresaId?: string;
  initialProcessType?: string;
  processTabs: { id: string, label: string }[];
  onSaveProcess: (data: any) => Promise<void>;
  onSaveFixo: (data: any) => Promise<void>;
  onSaveCalendario: (data: any) => Promise<void>;
  onSaveAviso: (data: any) => Promise<void>;
}

export default function UnifiedAddModal({
  isOpen, onClose, empresas, sindicatos, initialEmpresaId, initialProcessType, processTabs,
  onSaveProcess, onSaveFixo, onSaveCalendario, onSaveAviso
}: UnifiedAddModalProps) {
  const [addType, setAddType] = useState<'processo' | 'fixo' | 'calendario' | 'aviso'>('processo');
  
  const [empresaId, setEmpresaId] = useState(initialEmpresaId || '');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [taskName, setTaskName] = useState('');
  
  // Processo specific
  const [processType, setProcessType] = useState(initialProcessType || (processTabs.length > 0 ? processTabs[0].id : 'RESCISAO'));
  
  // Fixo specific
  const [frequency, setFrequency] = useState<ScheduleFrequency>('MONTHLY_EXACT');
  const [dayValue, setDayValue] = useState(5);
  const [monthValue, setMonthValue] = useState(0);
  
  // Calendario specific
  const [calendarDateType, setCalendarDateType] = useState<'EXATA' | 'CALCULADA'>('EXATA');
  const [specificDate, setSpecificDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [calcDay, setCalcDay] = useState(5);
  const [calcMonth, setCalcMonth] = useState(new Date().getMonth());
  const [calcYear, setCalcYear] = useState(new Date().getFullYear());
  const [errorMsg, setErrorMsg] = useState('');

  // Aviso specific
  const [avisoData, setAvisoData] = useState({ 
    nome: '',
    dataInicio: format(new Date(), 'yyyy-MM-dd'),
    tipoCalculo: 'DIAS' as 'DIAS' | 'DATA',
    dias: 30,
    dataFim: ''
  });
  const [isExtractingAviso, setIsExtractingAviso] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setEmpresaId(initialEmpresaId || '');
      setProcessType(initialProcessType || (processTabs.length > 0 ? processTabs[0].id : 'RESCISAO'));
    }
  }, [isOpen, initialEmpresaId, initialProcessType, processTabs]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePdfUploadAviso = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsExtractingAviso(true);
      const base64Pdf = await getTrimmedPdfBase64(file, 2);
      
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({ pdfBase64: base64Pdf, type: 'aviso_previo' })
      });
      
      if (!response.ok) throw new Error('Falha na extração');

      const data = await response.json();
      
      let foundEmpresaId = empresaId;
      if (data.nomeEmpresa && !foundEmpresaId && empresas.length > 0) {
        const found = empresas.find(emp => 
          emp.nome.toLowerCase().includes(data.nomeEmpresa.toLowerCase()) || 
          data.nomeEmpresa.toLowerCase().includes(emp.nome.toLowerCase())
        );
        if (found) foundEmpresaId = found.id;
      }

      let parsedDataTermino = data.dataTermino;
      let calculatedTipo = 'DIAS' as 'DIAS' | 'DATA';
      
      // Se não veio data término mas veio dias, mantem DIAS
      if (parsedDataTermino && parsedDataTermino.trim() !== '') {
         calculatedTipo = 'DATA';
      }

      setEmpresaId(foundEmpresaId);
      setAvisoData(prev => ({
        ...prev,
        nome: data.nomeColaborador || prev.nome,
        dataInicio: data.dataAviso || prev.dataInicio,
        tipoCalculo: calculatedTipo,
        dias: data.duracaoDias && data.duracaoDias > 0 ? parseInt(data.duracaoDias) : prev.dias,
        dataFim: parsedDataTermino || prev.dataFim
      }));

    } catch (error) {
      console.error("Erro extraindo PDF de Aviso Prévio:", error);
      alert("Não foi possível extrair dados automaticamente deste aviso.");
    } finally {
      setIsExtractingAviso(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (addType !== 'calendario' && !empresaId) {
      setErrorMsg('Por favor, selecione uma Empresa ou Sindicato.');
      return;
    }
    
    if (addType !== 'aviso' && !taskName) {
      setErrorMsg('Por favor, informe a descrição da tarefa.');
      return;
    }
    if (addType === 'aviso' && !avisoData.nome) {
      setErrorMsg('Por favor, informe o nome do colaborador.');
      return;
    }

    try {
      if (addType === 'processo') {
        await onSaveProcess({ taskName, processType, empresaId });
      } else if (addType === 'fixo') {
        await onSaveFixo({ taskName, frequency, dayValue, monthValue, empresaId });
      } else if (addType === 'calendario') {
        await onSaveCalendario({ taskName, calendarDateType, specificDate, calcDay, calcMonth, calcYear, empresaId });
      } else if (addType === 'aviso') {
        await onSaveAviso({ ...avisoData, empresaId });
      }
      onClose();
      // Reset form
      setTaskName('');
      setAvisoData({ nome: '', dataInicio: format(new Date(), 'yyyy-MM-dd'), tipoCalculo: 'DIAS', dias: 30, dataFim: '' });
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  if (!isOpen) return null;

  const filteredEmpresas = empresas.filter(e => e.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredSindicatos = sindicatos.filter(s => s.nome.toLowerCase().includes(searchTerm.toLowerCase()));
  const selectedEntityObj = empresas.find(e => e.id === empresaId) || sindicatos.find(s => s.id === empresaId);

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-800 flex justify-between items-center shrink-0">
          <h2 className="text-lg font-medium text-slate-200">Adicionar Item</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-300 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto custom-scrollbar p-6">
          <form id="unified-add-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Empresa Selection (if not pre-selected or if allowed to change) */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">
                Entidade (Empresa/Sindicato) {addType === 'calendario' ? '(Opcional)' : '*'}
              </label>
              {!initialEmpresaId ? (
                <div className="relative" ref={dropdownRef}>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text"
                      placeholder={selectedEntityObj ? selectedEntityObj.nome : "Buscar empresa..."}
                      value={searchTerm}
                      onFocus={() => setIsDropdownOpen(true)}
                      onChange={(e) => {
                        setSearchTerm(e.target.value);
                        setIsDropdownOpen(true);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg pl-9 pr-8 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                    {empresaId && !searchTerm && (
                      <button 
                        type="button"
                        onClick={() => { setEmpresaId(''); setSearchTerm(''); }}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {isDropdownOpen && (
                    <div className="absolute top-full mt-1 left-0 w-full bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar">
                      {filteredEmpresas.length > 0 && (
                        <div className="p-2">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-1">Empresas</div>
                          {filteredEmpresas.map((emp) => (
                            <button
                              key={emp.id} type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex items-center space-x-2"
                              onClick={() => {
                                setEmpresaId(emp.id!);
                                setIsDropdownOpen(false);
                                setSearchTerm('');
                              }}
                            >
                              <Briefcase className="w-4 h-4 text-indigo-400 shrink-0" />
                              <span className="truncate">{emp.nome}</span>
                            </button>
                          ))}
                        </div>
                      )}
                      {filteredSindicatos.length > 0 && (
                        <div className="p-2 border-t border-slate-700/50">
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 py-1">Sindicatos</div>
                          {filteredSindicatos.map((sind) => (
                            <button
                              key={sind.id} type="button"
                              className="w-full text-left px-3 py-2 hover:bg-slate-700 rounded-lg text-slate-200 transition-colors flex items-center space-x-2"
                              onClick={() => {
                                setEmpresaId(sind.id!);
                                setIsDropdownOpen(false);
                                setSearchTerm('');
                              }}
                            >
                              <Building2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="truncate">{sind.nome}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 opacity-80 cursor-not-allowed flex items-center">
                   {selectedEntityObj ? selectedEntityObj.nome : "Empresa Selecionada"}
                </div>
              )}
            </div>

            {/* Main Tabs */}
            <div className="bg-slate-950 rounded-xl p-1 border border-slate-800 flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setAddType('processo')}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${addType === 'processo' ? 'bg-slate-800 text-emerald-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Checklist de Processo
              </button>
              <button
                type="button"
                onClick={() => setAddType('fixo')}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${addType === 'fixo' ? 'bg-slate-800 text-indigo-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Obrigação Fixa
              </button>
              <button
                type="button"
                onClick={() => setAddType('calendario')}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${addType === 'calendario' ? 'bg-slate-800 text-amber-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Calendário
              </button>
              <button
                type="button"
                onClick={() => setAddType('aviso')}
                className={`flex-1 py-2 px-2 text-xs font-bold rounded-lg transition-all whitespace-nowrap ${addType === 'aviso' ? 'bg-slate-800 text-orange-400 shadow-md' : 'text-slate-500 hover:text-slate-300'}`}
              >
                Aviso Prévio
              </button>
            </div>

            {/* Description (Shared for all except Aviso, which has Nome do Colaborador) */}
            {addType !== 'aviso' && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Descrição da Tarefa / Conferência *</label>
                <input type="text" autoFocus required placeholder="Ex: Verificar FGTS" value={taskName} onChange={e => setTaskName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors" />
              </div>
            )}

            {/* Specific Fields */}
            {addType === 'processo' && (
              <div className="bg-emerald-900/10 border border-emerald-500/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-emerald-400 uppercase tracking-widest mb-2">Processo</label>
                  <select 
                    value={processType}
                    onChange={e => setProcessType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-emerald-500"
                  >
                    {processTabs.map((tab, i) => (
                      <option key={tab.id || `opt-${i}`} value={tab.id}>{tab.label}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {addType === 'fixo' && (
              <div className="bg-indigo-900/10 border border-indigo-500/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                <div>
                  <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Frequência (Recorrente)</label>
                  <select 
                    value={frequency}
                    onChange={e => setFrequency(e.target.value as ScheduleFrequency)}
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="MONTHLY_EXACT">Todo dia X do Mês</option>
                    <option value="YEARLY">Anual (Uma vez ao ano)</option>
                    <option value="NEAR_5">Sempre próximo ao Dia 05</option>
                    <option value="NEAR_20">Sempre próximo ao Dia 20</option>
                    <option value="NEAR_30">Sempre próximo ao Dia 30</option>
                    <option value="WEEKLY">Semanal (Toda semana)</option>
                    <option value="DAILY">Diário</option>
                  </select>
                </div>

                {(frequency === 'MONTHLY_EXACT' || frequency === 'YEARLY') && (
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Dia do Mês</label>
                      <input 
                        type="number" min="1" max="31" required 
                        value={dayValue} 
                        onChange={e => setDayValue(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                    {frequency === 'YEARLY' && (
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Mês</label>
                        <select 
                          value={monthValue} 
                          onChange={e => setMonthValue(parseInt(e.target.value))}
                          className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-indigo-500"
                        >
                          <option value={0}>Janeiro</option>
                          <option value={1}>Fevereiro</option>
                          <option value={2}>Março</option>
                          <option value={3}>Abril</option>
                          <option value={4}>Maio</option>
                          <option value={5}>Junho</option>
                          <option value={6}>Julho</option>
                          <option value={7}>Agosto</option>
                          <option value={8}>Setembro</option>
                          <option value={9}>Outubro</option>
                          <option value={10}>Novembro</option>
                          <option value={11}>Dezembro</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {addType === 'calendario' && (
              <div className="bg-amber-900/10 border border-amber-500/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                <div className="flex space-x-4 mb-4">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" checked={calendarDateType === 'EXATA'} onChange={() => setCalendarDateType('EXATA')} className="text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700" />
                    <span className="text-sm text-slate-300">Data Exata</span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input type="radio" checked={calendarDateType === 'CALCULADA'} onChange={() => setCalendarDateType('CALCULADA')} className="text-amber-500 focus:ring-amber-500 bg-slate-900 border-slate-700" />
                    <span className="text-sm text-slate-300">Data Calculada</span>
                  </label>
                </div>

                {calendarDateType === 'EXATA' ? (
                  <div>
                    <label className="block text-xs font-bold text-amber-400 uppercase tracking-widest mb-2">Data do Evento</label>
                    <input 
                      type="date" required 
                      value={specificDate} 
                      onChange={e => setSpecificDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-2.5 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-xs text-amber-400/80 italic">O sistema irá antecipar o vencimento caso caia em fim de semana.</p>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Dia</label>
                        <input type="number" min="1" max="31" value={calcDay} onChange={e => setCalcDay(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Mês</label>
                        <select value={calcMonth} onChange={e => setCalcMonth(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-2 py-2 focus:outline-none focus:border-amber-500 text-sm">
                          {[...Array(12)].map((_, i) => <option key={i} value={i}>{format(new Date(2024, i, 1), 'MMM')}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-amber-400 uppercase tracking-widest mb-1">Ano</label>
                        <input type="number" min="2020" max="2100" value={calcYear} onChange={e => setCalcYear(parseInt(e.target.value))} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-amber-500" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {addType === 'aviso' && (
              <div className="bg-orange-900/10 border border-orange-500/20 rounded-xl p-4 space-y-4 animate-in slide-in-from-top-2">
                <div className="border border-dashed border-orange-500/50 rounded-xl p-4 flex flex-col items-center justify-center relative cursor-pointer group mb-2 hover:bg-orange-900/20 transition-colors">
                  <div className="absolute inset-0 w-full h-full opacity-0">
                    <input 
                      type="file" 
                      accept="application/pdf"
                      onChange={handlePdfUploadAviso}
                      className="w-full h-full cursor-pointer"
                      disabled={isExtractingAviso}
                    />
                  </div>
                  {isExtractingAviso ? (
                    <div className="flex flex-col items-center text-orange-500">
                      <Loader2 className="w-8 h-8 animate-spin mb-2" />
                      <span className="text-sm font-bold">Extraindo dados...</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-orange-500 group-hover:text-orange-400">
                      <Upload className="w-8 h-8 mb-2" />
                      <span className="text-sm font-bold uppercase tracking-wider text-center">Anexar PDF do Aviso</span>
                      <span className="text-xs opacity-70 mt-1 text-center">Preenchimento automático via IA</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Colaborador *</label>
                  <input type="text" required placeholder="Ex: João da Silva" value={avisoData.nome} onChange={e => setAvisoData({...avisoData, nome: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Data de Início *</label>
                  <input type="date" required value={avisoData.dataInicio} onChange={e => setAvisoData({...avisoData, dataInicio: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors" />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Calcular término por</label>
                  <select 
                    value={avisoData.tipoCalculo} 
                    onChange={e => setAvisoData({...avisoData, tipoCalculo: e.target.value as any})} 
                    className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors"
                  >
                    <option value="DIAS">Quantidade de Dias</option>
                    <option value="DATA">Data Específica</option>
                  </select>
                </div>

                {avisoData.tipoCalculo === 'DIAS' ? (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Duração (Dias)</label>
                    <input type="number" min="1" required value={avisoData.dias} onChange={e => setAvisoData({...avisoData, dias: parseInt(e.target.value)})} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors" />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Data Final</label>
                    <input type="date" required value={avisoData.dataFim} onChange={e => setAvisoData({...avisoData, dataFim: e.target.value})} className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-orange-500 transition-colors" />
                  </div>
                )}
              </div>
            )}

          </form>
        </div>
        
        <div className="p-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between items-center space-y-4 sm:space-y-0 shrink-0">
          <div className="flex-1 text-red-400 text-sm font-medium">
            {errorMsg && <p>{errorMsg}</p>}
          </div>
          <div className="flex space-x-3 w-full sm:w-auto justify-end">
            <button type="button" onClick={onClose} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors">Cancelar</button>
            <button type="submit" form="unified-add-form" className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-emerald-500/20">Salvar Item</button>
          </div>
        </div>
      </div>
    </div>
  );
}
