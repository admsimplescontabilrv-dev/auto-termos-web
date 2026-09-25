import React, { useState, useEffect, useMemo } from 'react';
import { 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  Plus, 
  Trash2, 
  HelpCircle, 
  Calendar, 
  ArrowDownRight
} from 'lucide-react';
import { CurrencyInput } from '../CurrencyInput';
import { 
  calcularCalendarioDSR, 
  hhMmToDecimal, 
  decimalToHhMm, 
  calcularSalarioHora, 
  calcularValorHoraExtra, 
  calcularTotalHorasExtras, 
  calcularDSR,
  FeriadoInfo
} from '../utils/dsrCalendarUtils';
import { Rubrica } from '../types';

export interface ItemHoraExtra {
  id: string;
  modoInput: 'hhmm' | 'decimal';
  valorInputHhMm: string;
  valorInputDecimal: number;
  percentual: number;
}

interface CalculadoraHorasExtrasReciboProps {
  salarioBaseContratual?: number;
  rubricasAtuais: Rubrica[];
  mesAnoReferencia: string;
  onAdicionarRubricas: (novasRubricas: Rubrica[]) => void;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const CalculadoraHorasExtrasRecibo: React.FC<CalculadoraHorasExtrasReciboProps> = ({
  salarioBaseContratual = 0,
  rubricasAtuais,
  mesAnoReferencia,
  onAdicionarRubricas,
  showToast
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showAjudaCLT, setShowAjudaCLT] = useState(false);

  // 1. Base Salarial
  const totalProventosAtuais = useMemo(() => {
    return rubricasAtuais
      .filter(r => r.tipo === 'provento')
      .reduce((acc, curr) => acc + (curr.valor || 0), 0);
  }, [rubricasAtuais]);

  const [origemBase, setOrigemBase] = useState<'contratual' | 'proventos' | 'manual'>('contratual');
  const [salarioBaseManual, setSalarioBaseManual] = useState<number>(salarioBaseContratual || 0);

  useEffect(() => {
    if (salarioBaseContratual > 0 && origemBase === 'contratual') {
      setSalarioBaseManual(salarioBaseContratual);
    }
  }, [salarioBaseContratual, origemBase]);

  const salarioBaseCalculo = useMemo(() => {
    if (origemBase === 'proventos') return totalProventosAtuais;
    if (origemBase === 'contratual') return salarioBaseContratual > 0 ? salarioBaseContratual : salarioBaseManual;
    return salarioBaseManual;
  }, [origemBase, totalProventosAtuais, salarioBaseContratual, salarioBaseManual]);

  // 2. Divisor de Jornada
  const [divisorJornada, setDivisorJornada] = useState<number>(220);

  // 3. Linhas de Horas Extras
  const [linhasHE, setLinhasHE] = useState<ItemHoraExtra[]>([
    {
      id: '1',
      modoInput: 'hhmm',
      valorInputHhMm: '10:00',
      valorInputDecimal: 10,
      percentual: 50
    }
  ]);

  // 4. Parâmetros DSR
  const [incluirDSR, setIncluirDSR] = useState(true);
  const [sabadoComoDiaUtil, setSabadoComoDiaUtil] = useState(true);
  const [diasUteis, setDiasUteis] = useState<number>(25);
  const [domingosEFeriados, setDomingosEFeriados] = useState<number>(5);
  const [feriadosIdentificados, setFeriadosIdentificados] = useState<FeriadoInfo[]>([]);

  useEffect(() => {
    const cal = calcularCalendarioDSR(mesAnoReferencia, sabadoComoDiaUtil);
    setDiasUteis(cal.diasUteis);
    setDomingosEFeriados(cal.domingosEFeriados);
    setFeriadosIdentificados(cal.listaFeriados);
  }, [mesAnoReferencia, sabadoComoDiaUtil]);

  const recalcularCalendario = () => {
    const cal = calcularCalendarioDSR(mesAnoReferencia, sabadoComoDiaUtil);
    setDiasUteis(cal.diasUteis);
    setDomingosEFeriados(cal.domingosEFeriados);
    setFeriadosIdentificados(cal.listaFeriados);
    showToast('Dias úteis e domingos/feriados recalculados.', 'success');
  };

  const salarioHora = useMemo(() => {
    return calcularSalarioHora(salarioBaseCalculo, divisorJornada);
  }, [salarioBaseCalculo, divisorJornada]);

  const calculoLinhas = useMemo(() => {
    return linhasHE.map(item => {
      const horasDecimais = item.modoInput === 'hhmm' 
        ? hhMmToDecimal(item.valorInputHhMm)
        : (item.valorInputDecimal || 0);

      const valorHoraExtraUnitario = calcularValorHoraExtra(salarioHora, item.percentual);
      const totalHE = calcularTotalHorasExtras(horasDecimais, valorHoraExtraUnitario);
      const valorDSR = incluirDSR ? calcularDSR(totalHE, diasUteis, domingosEFeriados) : 0;

      return {
        ...item,
        horasDecimais,
        horasFormatadasHhMm: item.modoInput === 'hhmm' ? item.valorInputHhMm : decimalToHhMm(horasDecimais),
        valorHoraExtraUnitario,
        totalHE,
        valorDSR
      };
    });
  }, [linhasHE, salarioHora, incluirDSR, diasUteis, domingosEFeriados]);

  const totalHEGeral = useMemo(() => {
    return calculoLinhas.reduce((acc, curr) => acc + curr.totalHE, 0);
  }, [calculoLinhas]);

  const totalDSRGeral = useMemo(() => {
    if (!incluirDSR) return 0;
    return calculoLinhas.reduce((acc, curr) => acc + curr.valorDSR, 0);
  }, [incluirDSR, calculoLinhas]);

  const impactoTotalGeral = totalHEGeral + totalDSRGeral;

  const atualizarLinha = (id: string, updates: Partial<ItemHoraExtra>) => {
    setLinhasHE(prev => prev.map(l => {
      if (l.id !== id) return l;
      const novo = { ...l, ...updates };

      if (updates.modoInput && updates.modoInput !== l.modoInput) {
        if (updates.modoInput === 'decimal') {
          novo.valorInputDecimal = hhMmToDecimal(novo.valorInputHhMm);
        } else {
          novo.valorInputHhMm = decimalToHhMm(novo.valorInputDecimal);
        }
      } else if (updates.valorInputHhMm !== undefined) {
        novo.valorInputDecimal = hhMmToDecimal(updates.valorInputHhMm);
      } else if (updates.valorInputDecimal !== undefined) {
        novo.valorInputHhMm = decimalToHhMm(updates.valorInputDecimal);
      }

      return novo;
    }));
  };

  const adicionarLinha = () => {
    const novaLinha: ItemHoraExtra = {
      id: Date.now().toString(),
      modoInput: 'hhmm',
      valorInputHhMm: '05:00',
      valorInputDecimal: 5,
      percentual: 100
    };
    setLinhasHE(prev => [...prev, novaLinha]);
  };

  const removerLinha = (id: string) => {
    if (linhasHE.length <= 1) {
      showToast('Mantenha pelo menos uma faixa de horas extras.', 'error');
      return;
    }
    setLinhasHE(prev => prev.filter(l => l.id !== id));
  };

  const [substituirExistentes, setSubstituirExistentes] = useState(true);

  const handleLancarNoRecibo = () => {
    if (salarioBaseCalculo <= 0) {
      showToast('O salário base para cálculo precisa ser maior que zero.', 'error');
      return;
    }
    if (totalHEGeral <= 0) {
      showToast('Preencha a quantidade de horas extras.', 'error');
      return;
    }

    const novasRubricas: Rubrica[] = [];
    let proximoCodigo = rubricasAtuais.length > 0 
      ? Math.max(2000, ...rubricasAtuais.map(r => Number(r.codigo) || 0)) + 1 
      : 2010;

    calculoLinhas.forEach(linha => {
      if (linha.totalHE > 0) {
        novasRubricas.push({
          codigo: proximoCodigo++,
          descricao: `HORAS EXTRAS ${linha.percentual}% (${linha.horasFormatadasHhMm}H)`,
          referencia: `${linha.horasFormatadasHhMm}`,
          valor: Number(linha.totalHE.toFixed(2)),
          tipo: 'provento'
        });

        if (incluirDSR && linha.valorDSR > 0) {
          novasRubricas.push({
            codigo: proximoCodigo++,
            descricao: `DSR S/ HORAS EXTRAS ${linha.percentual}% (${domingosEFeriados} DSR / ${diasUteis} UT)`,
            referencia: `${domingosEFeriados}/${diasUteis}`,
            valor: Number(linha.valorDSR.toFixed(2)),
            tipo: 'provento'
          });
        }
      }
    });

    if (novasRubricas.length === 0) {
      showToast('Nenhuma rubrica com valor positivo para lançar.', 'error');
      return;
    }

    let listaFinal: Rubrica[];
    if (substituirExistentes) {
      const limpas = rubricasAtuais.filter(r => 
        !r.descricao.includes('HORAS EXTRA') && 
        !r.descricao.includes('HORA EXTRA') && 
        !r.descricao.includes('DSR S/ HORA') &&
        !r.descricao.includes('DSR SOBRE HORA')
      );
      listaFinal = [...limpas, ...novasRubricas];
    } else {
      listaFinal = [...rubricasAtuais, ...novasRubricas];
    }

    onAdicionarRubricas(listaFinal);
    showToast(`${novasRubricas.length} rubricas de Horas Extras e DSR lançadas no recibo com sucesso.`, 'success');
  };

  return (
    <div className="bg-slate-900 border border-slate-700/80 rounded-xl overflow-hidden shadow-lg transition-all">
      {/* Cabeçalho do Card */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-800/60 transition-colors border-b border-slate-700/60 select-none"
      >
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600/20 text-indigo-400 rounded-lg border border-indigo-500/30 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-sm tracking-wide uppercase">
              Calculadora de Horas Extras & DSR
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cálculo com adicionais, apuração de DSR e entrada em minutos (HH:MM) ou decimais.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {impactoTotalGeral > 0 && (
            <div className="text-right hidden sm:block">
              <span className="text-[11px] text-slate-400 block uppercase tracking-wider">Total Calculado</span>
              <span className="text-sm font-bold text-emerald-400">
                {impactoTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}
          <div 
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            {isOpen ? <ChevronUp className="w-5 h-5 text-indigo-400" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {/* Conteúdo Expansível */}
      {isOpen && (
        <div className="p-5 space-y-5 bg-slate-950/70">
          {/* Seção 1: Base de Cálculo e Divisor */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 bg-slate-900/70 p-4 rounded-lg border border-slate-800">
            {/* Base Salarial */}
            <div className="md:col-span-7 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Base de Cálculo do Salário
                </label>
                <div className="flex items-center bg-slate-950 p-0.5 border border-slate-700/80 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setOrigemBase('contratual')}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                      origemBase === 'contratual' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Contratual
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrigemBase('proventos')}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                      origemBase === 'proventos' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Total Proventos
                  </button>
                  <button
                    type="button"
                    onClick={() => setOrigemBase('manual')}
                    className={`h-7 px-3 rounded-md text-xs font-medium transition-colors ${
                      origemBase === 'manual' 
                        ? 'bg-indigo-600 text-white' 
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Digitar Livre
                  </button>
                </div>
              </div>

              <div>
                <CurrencyInput
                  value={salarioBaseCalculo}
                  disabled={origemBase === 'proventos'}
                  onChangeValue={val => {
                    setSalarioBaseManual(val);
                    if (origemBase !== 'manual') setOrigemBase('manual');
                  }}
                  className={`w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-slate-100 font-medium focus:border-indigo-500 focus:outline-none ${
                    origemBase === 'proventos' ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                />
              </div>
              <p className="text-[11px] text-slate-400">
                {origemBase === 'contratual' && 'Salário base informado no cadastro do funcionário.'}
                {origemBase === 'proventos' && `Soma dos proventos cadastrados no recibo (R$ ${totalProventosAtuais.toFixed(2)}).`}
                {origemBase === 'manual' && 'Valor customizado digitado manualmente para a base das horas.'}
              </p>
            </div>

            {/* Divisor de Jornada */}
            <div className="md:col-span-5 space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300 block">
                Divisor de Jornada
              </label>
              <div>
                <input
                  type="number"
                  min={1}
                  max={400}
                  placeholder="Ex: 220"
                  value={divisorJornada || ''}
                  onChange={e => setDivisorJornada(parseInt(e.target.value) || 0)}
                  className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-slate-100 font-bold focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
                <span>Salário-Hora Normal:</span>
                <span className="font-mono font-bold text-slate-200">
                  {salarioHora.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}/h
                </span>
              </div>
            </div>
          </div>

          {/* Seção 2: Linhas de Horas Extras */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                Faixas de Horas Extras
              </h4>
              <button
                type="button"
                onClick={adicionarLinha}
                className="h-8 flex items-center text-xs px-3 bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 rounded-lg hover:bg-indigo-600 hover:text-white transition-colors font-medium"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar Faixa
              </button>
            </div>

            <div className="space-y-2.5">
              {calculoLinhas.map((item) => (
                <div 
                  key={item.id} 
                  className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
                    {/* Modo de Entrada */}
                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">Modo</label>
                      <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-950 border border-slate-700 rounded-lg h-10 items-center">
                        <button
                          type="button"
                          onClick={() => atualizarLinha(item.id, { modoInput: 'hhmm' })}
                          className={`h-8 text-xs font-semibold rounded-md transition-colors ${
                            item.modoInput === 'hhmm' 
                              ? 'bg-indigo-600 text-white' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          HH:MM
                        </button>
                        <button
                          type="button"
                          onClick={() => atualizarLinha(item.id, { modoInput: 'decimal' })}
                          className={`h-8 text-xs font-semibold rounded-md transition-colors ${
                            item.modoInput === 'decimal' 
                              ? 'bg-indigo-600 text-white' 
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          Decimal
                        </button>
                      </div>
                    </div>

                    {/* Quantidade */}
                    <div className="md:col-span-3">
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                        {item.modoInput === 'hhmm' ? 'Qtd (Horas:Min)' : 'Qtd (Horas Decimais)'}
                      </label>
                      {item.modoInput === 'hhmm' ? (
                        <input
                          type="text"
                          placeholder="Ex: 10:30"
                          value={item.valorInputHhMm}
                          onChange={e => atualizarLinha(item.id, { valorInputHhMm: e.target.value })}
                          className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-sm text-slate-100 font-mono text-center focus:border-indigo-500 focus:outline-none"
                        />
                      ) : (
                        <input
                          type="number"
                          step="0.25"
                          placeholder="Ex: 10.5"
                          value={item.valorInputDecimal || ''}
                          onChange={e => atualizarLinha(item.id, { valorInputDecimal: parseFloat(e.target.value) || 0 })}
                          className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-sm text-slate-100 font-mono text-center focus:border-indigo-500 focus:outline-none"
                        />
                      )}
                    </div>

                    {/* Adicional (%) */}
                    <div className="md:col-span-2">
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                        Adicional CCT (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          min={0}
                          max={500}
                          placeholder="Ex: 50"
                          value={item.percentual || ''}
                          onChange={e => atualizarLinha(item.id, { percentual: parseFloat(e.target.value) || 0 })}
                          className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 pr-7 text-sm text-slate-100 font-bold text-center focus:border-indigo-500 focus:outline-none"
                        />
                        <span className="absolute right-2.5 top-2.5 text-slate-400 text-xs font-bold">%</span>
                      </div>
                    </div>

                    {/* Valores da Faixa */}
                    <div className="md:col-span-3 bg-slate-950 h-10 px-3 rounded-lg border border-slate-800 flex items-center justify-between">
                      <div className="text-left leading-tight">
                        <span className="text-[10px] text-slate-400 block">
                          Hora: {item.valorHoraExtraUnitario.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                        {incluirDSR && item.valorDSR > 0 && (
                          <span className="text-[10px] text-indigo-400 block">
                            DSR: {item.valorDSR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </span>
                        )}
                      </div>
                      <span className="text-sm font-bold text-slate-100">
                        {item.totalHE.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>

                    {/* Remover */}
                    <div className="md:col-span-1 flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => removerLinha(item.id)}
                        disabled={linhasHE.length === 1}
                        className="w-10 h-10 flex items-center justify-center text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-950 disabled:opacity-30 transition-colors"
                        title="Remover faixa"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção 3: DSR */}
          <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-800 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="chk_incluir_dsr"
                  checked={incluirDSR}
                  onChange={e => setIncluirDSR(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded cursor-pointer"
                />
                <label htmlFor="chk_incluir_dsr" className="text-xs font-bold text-slate-200 uppercase tracking-wider cursor-pointer">
                  Calcular DSR sobre Horas Extras
                </label>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <button
                  type="button"
                  onClick={recalcularCalendario}
                  className="h-8 px-3 rounded-md bg-slate-950 border border-slate-800 hover:border-slate-700 flex items-center text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  <Calendar className="w-3.5 h-3.5 mr-1.5" />
                  Sincronizar Calendário ({mesAnoReferencia || 'Mês Atual'})
                </button>
              </div>
            </div>

            {incluirDSR && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 items-end">
                  {/* Dias Úteis */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Dias Úteis do Mês
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={diasUteis || ''}
                      onChange={e => setDiasUteis(parseInt(e.target.value) || 0)}
                      className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-center text-sm font-bold text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Domingos e Feriados */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Domingos e Feriados (DSRs)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={31}
                      value={domingosEFeriados || ''}
                      onChange={e => setDomingosEFeriados(parseInt(e.target.value) || 0)}
                      className="w-full h-10 bg-slate-950 border border-slate-700 rounded-lg px-3 text-center text-sm font-bold text-slate-100 focus:border-indigo-500 focus:outline-none"
                    />
                  </div>

                  {/* Opção Sábado como Dia Útil */}
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">Regra do Sábado</label>
                    <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer bg-slate-950 h-10 px-3 rounded-lg border border-slate-800">
                      <input
                        type="checkbox"
                        checked={sabadoComoDiaUtil}
                        onChange={e => setSabadoComoDiaUtil(e.target.checked)}
                        className="w-4 h-4 accent-indigo-500 rounded"
                      />
                      <span>Sábado é dia útil</span>
                    </label>
                  </div>

                  {/* Total DSR */}
                  <div className="bg-indigo-950/30 border border-indigo-500/30 h-10 px-3 rounded-lg flex items-center justify-between text-right">
                    <span className="text-[11px] uppercase font-bold text-indigo-300">
                      Total DSR
                    </span>
                    <span className="text-sm font-bold text-indigo-200">
                      {totalDSRGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  </div>
                </div>

                {feriadosIdentificados.length > 0 && (
                  <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400">
                    <span className="font-semibold text-slate-300">Feriados considerados: </span>
                    {feriadosIdentificados.map(f => `${f.nome} (${f.data.split('-')[2]}/${f.data.split('-')[1]})`).join(' • ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Seção 4: Resumo e Ação */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center sm:text-left">
              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-0.5">
                  Total Horas Extras
                </span>
                <span className="text-lg font-bold text-slate-100">
                  {totalHEGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-lg border border-slate-800">
                <span className="text-[11px] uppercase tracking-wider text-slate-400 block mb-0.5">
                  Total DSR
                </span>
                <span className="text-lg font-bold text-indigo-400">
                  {totalDSRGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="p-3 bg-indigo-950/40 rounded-lg border border-indigo-500/40">
                <span className="text-[11px] uppercase tracking-wider text-indigo-300 block mb-0.5 font-bold">
                  Impacto no Recibo
                </span>
                <span className="text-xl font-black text-emerald-400">
                  {impactoTotalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
              <label className="flex items-center space-x-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={substituirExistentes}
                  onChange={e => setSubstituirExistentes(e.target.checked)}
                  className="w-4 h-4 accent-indigo-500 rounded"
                />
                <span>Substituir rubricas anteriores de horas extras e DSR</span>
              </label>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => setShowAjudaCLT(!showAjudaCLT)}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-slate-200 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors"
                  title="Ver regras de cálculo"
                >
                  <HelpCircle className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleLancarNoRecibo}
                  disabled={impactoTotalGeral <= 0}
                  className="h-10 flex-1 sm:flex-none flex items-center justify-center px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <ArrowDownRight className="w-4 h-4 mr-2" />
                  Lançar no Recibo (Adicionar Rubricas)
                </button>
              </div>
            </div>

            {showAjudaCLT && (
              <div className="mt-3 p-4 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-300 space-y-2 leading-relaxed">
                <h5 className="font-bold text-indigo-400 text-sm">
                  Regras e Fórmulas de Cálculo
                </h5>
                <ul className="list-disc pl-4 space-y-1 text-slate-400">
                  <li>
                    <strong className="text-slate-200">Salário-Hora:</strong> Salário Base dividido pelo Divisor de Jornada.
                  </li>
                  <li>
                    <strong className="text-slate-200">Hora Extra:</strong> Salário-Hora multiplicado por (1 + Adicional% / 100).
                  </li>
                  <li>
                    <strong className="text-slate-200">DSR sobre Horas Extras:</strong> (Total das Horas Extras ÷ Dias Úteis) × (Domingos + Feriados).
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
