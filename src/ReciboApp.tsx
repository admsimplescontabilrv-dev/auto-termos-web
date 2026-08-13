import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Plus, Trash2, ArrowRight, ArrowLeft, Download, ExternalLink, Printer, Activity, FileText } from 'lucide-react';
import { Rubrica, DadosEmpresa, DadosFuncionario, ResultadoCalculo } from './types';
import { LayoutRecibo } from './LayoutRecibo';
import { CurrencyInput } from './CurrencyInput';
import { getTrimmedPdfBase64 } from './pdfUtils';
import { ErrorLogViewer } from './ErrorLogViewer';

export default function ReciboApp() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtractingRecibo, setIsExtractingRecibo] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [cnpjStatus, setCnpjStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [reciboStatus, setReciboStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa>({
    nome: '',
    cnpj: '',
    endereco: '',
    mesAno: '',
    mesAnoFinal: '',
    geracaoEmLote: false,
    tipoRecibo: 'salario',
    calcularTributos: true
  });

  const [dadosFuncionario, setDadosFuncionario] = useState<DadosFuncionario>({
    codigo: '',
    nome: '',
    funcao: '',
    cbo: '',
    numeroDependentes: 0
  });

  const [rubricas, setRubricas] = useState<Rubrica[]>([
    { codigo: 1, descricao: 'SALÁRIO', referencia: '30', valor: 0, tipo: 'provento' }
  ]);

  useEffect(() => {
    if (!dadosFuncionario.salarioBaseContratual) return;
    
    setRubricas(prev => prev.map(r => {
      if (r.descricao.toLowerCase().includes('salário') || r.descricao.toLowerCase().includes('salario')) {
        const dias = parseInt(r.referencia) || 30;
        const valorProporcional = (dadosFuncionario.salarioBaseContratual! / 30) * dias;
        return { ...r, valor: valorProporcional };
      }
      return r;
    }));
  }, [dadosFuncionario.salarioBaseContratual, rubricas.map(r => r.referencia).join(',')]);

  const handleCnpjUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files?.[0];
    } else if (e.target && 'files' in e.target) {
      file = (e.target as HTMLInputElement).files?.[0];
    }
    if (!file) return;
    setIsExtracting(true);
    try {
      const base64 = await getTrimmedPdfBase64(file as File, 2); // 2 pages max for CNPJ
      
      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: base64,
          type: 'cnpj'
        })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        setErrorLog(`Erro ao extrair CNPJ: A Vercel (ou o servidor) retornou um conteúdo que não é JSON.
Status da Resposta: ${res.status} ${res.statusText}
Content-Type recebido: ${contentType || 'Nenhum'}

--- CORPO DA RESPOSTA (HTML ou Texto) ---
${text}`);
        throw new SyntaxError("O servidor retornou HTML. O arquivo pode ser muito grande para o proxy ou ocorreu timeout.");
      }

      const resData = await res.json();
      if (!res.ok || resData.error) {
        showToast(resData.error || 'Erro na extração dos dados do CNPJ.', 'error');
        setCnpjStatus({ message: `EXTRAÇÃO FALHOU APÓS ${resData.attempts || 1} TENTATIVA(S)`, type: 'error' });
        return;
      }
      if (resData && resData.data) {
        showToast('Dados do CNPJ extraídos com sucesso!', 'success');
        setCnpjStatus({ message: `EXTRAÇÃO CONCLUÍDA APÓS ${resData.attempts || 1} TENTATIVA(S) VIA ${resData.modelUsed || 'GEMINI'}`, type: 'success' });
        const d = resData.data;
        const partes = [
          d.logradouro,
          d.numero ? `Nº ${d.numero}` : '',
          d.complemento,
          d.bairro,
          d.municipio && d.uf ? `${d.municipio} - ${d.uf}` : (d.municipio || d.uf),
          d.cep ? `CEP ${d.cep}` : ''
        ].filter(Boolean);
        const enderecoMontado = partes.join(', ');

        setDadosEmpresa(prev => ({
          ...prev,
          nome: (d.razaoSocial || d['NOME EMPRESARIAL'] || d.nome || d.NOME || prev.nome).toUpperCase(),
          cnpj: (d.cnpj || d['NÚMERO DE INSCRIÇÃO'] || d.CNPJ || prev.cnpj).toUpperCase(),
          endereco: (enderecoMontado || d.endereco || d.ENDERECO || prev.endereco).toUpperCase()
        }));
      }
    } catch (error) {
      console.error('Erro ao extrair CNPJ:', error);
      setErrorLog(prev => prev ? prev : `Erro de Código/Rede (CNPJ):
Tipo de Erro: ${error instanceof Error ? error.name : 'Unknown'}
Mensagem: ${error instanceof Error ? error.message : String(error)}

Stack Trace:
${error instanceof Error ? error.stack : 'N/A'}`);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        showToast('A IA demorou muito para responder (timeout) ou falha de rede. Tente novamente.', 'error');
      } else if (error instanceof SyntaxError) {
        showToast('Resposta inválida do servidor. Isso pode ocorrer por timeout da hospedagem (ex: Vercel). Tente novamente.', 'error');
      } else {
        showToast('Ocorreu um erro inesperado ao extrair os dados do CNPJ.', 'error');
      }
      setCnpjStatus({ message: `EXTRAÇÃO FALHOU`, type: 'error' });
    } finally {
      setIsExtracting(false);
      if (e.target && 'value' in e.target) {
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const handleReciboUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files?.[0];
    } else if (e.target && 'files' in e.target) {
      file = (e.target as HTMLInputElement).files?.[0];
    }
    if (!file) return;
    setIsExtractingRecibo(true);
    try {
      const base64 = await getTrimmedPdfBase64(file as File, 3); // 3 pages max for Recibo

      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          pdfBase64: base64,
          type: 'recibo'
        })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        setErrorLog(`Erro ao extrair RECIBO: A Vercel (ou o servidor) retornou um conteúdo que não é JSON.
Status da Resposta: ${res.status} ${res.statusText}
Content-Type recebido: ${contentType || 'Nenhum'}

--- CORPO DA RESPOSTA (HTML ou Texto) ---
${text}`);
        throw new SyntaxError("O servidor retornou HTML. O arquivo pode ser muito grande para o proxy ou ocorreu timeout.");
      }

      const resData = await res.json();
      if (!res.ok || resData.error) {
        showToast(resData.error || 'Erro na extração do recibo.', 'error');
        setReciboStatus({ message: `EXTRAÇÃO FALHOU APÓS ${resData.attempts || 1} TENTATIVA(S)`, type: 'error' });
        return;
      }
      if (resData?.data) {
        showToast('Dados do recibo extraídos com sucesso!', 'success');
        setReciboStatus({ message: `EXTRAÇÃO CONCLUÍDA APÓS ${resData.attempts || 1} TENTATIVA(S) VIA ${resData.modelUsed || 'GEMINI'}`, type: 'success' });
        const d = resData.data;
        if (d.empresa) {
          setDadosEmpresa(prev => ({
            ...prev,
            nome: (d.empresa.nome || '').toUpperCase(),
            cnpj: (d.empresa.cnpj || '').toUpperCase(),
            endereco: (d.empresa.endereco || '').toUpperCase(),
            mesAno: d.mesAno || prev.mesAno
          }));
        }
        if (d.funcionario) {
          setDadosFuncionario(prev => ({
            ...prev,
            codigo: d.funcionario.codigo || '001',
            nome: (d.funcionario.nome || '').toUpperCase(),
            funcao: (d.funcionario.funcao || '').toUpperCase()
          }));
        }
        if (d.rubricas && Array.isArray(d.rubricas) && d.rubricas.length > 0) {
          setRubricas(d.rubricas.map((r: any) => ({
            codigo: Number(r.codigo) || 2001,
            descricao: (r.descricao || '').toUpperCase(),
            referencia: String(r.referencia || ''),
            valor: Number(r.valor) || 0,
            tipo: r.tipo === 'desconto' ? 'desconto' : 'provento'
          })));
        }
      }
    } catch (error) {
      console.error('Erro ao extrair recibo:', error);
      setErrorLog(prev => prev ? prev : `Erro de Código/Rede (RECIBO):
Tipo de Erro: ${error instanceof Error ? error.name : 'Unknown'}
Mensagem: ${error instanceof Error ? error.message : String(error)}

Stack Trace:
${error instanceof Error ? error.stack : 'N/A'}`);
      
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        showToast('A IA demorou muito para responder (timeout) ou falha de rede. Tente novamente.', 'error');
      } else if (error instanceof SyntaxError) {
        showToast('Resposta inválida do servidor. Isso pode ocorrer por timeout da hospedagem (ex: Vercel). Tente novamente.', 'error');
      } else {
        showToast('Ocorreu um erro inesperado ao processar o recibo.', 'error');
      }
      setReciboStatus({ message: `EXTRAÇÃO FALHOU`, type: 'error' });
    } finally {
      setIsExtractingRecibo(false);
      if (e.target && 'value' in e.target) {
        (e.target as HTMLInputElement).value = '';
      }
    }
  };

  const calcularINSS_CLT = (base: number): number => {
    const teto = 8475.55;
    const salario = Math.min(base, teto);
    let inss = 0;
    if (salario > 4354.27) inss += (Math.min(salario, 8475.55) - 4354.27) * 0.14;
    if (salario > 2902.84) inss += (Math.min(salario, 4354.27) - 2902.84) * 0.12;
    if (salario > 1621.00) inss += (Math.min(salario, 2902.84) - 1621.00) * 0.09;
    if (salario > 0)       inss += Math.min(salario, 1621.00) * 0.075;
    return Math.round(inss * 100) / 100;
  };

  const calcularINSS_ProLabore = (base: number): number => Math.round(Math.min(base, 8475.55) * 0.11 * 100) / 100;

  const calcularIRRF = (baseIRRF: number): { valor: number; faixa: string } => {
    if (baseIRRF <= 2428.80) return { valor: 0, faixa: 'Isento' };
    let imposto = 0;
    let faixa = '';
    if (baseIRRF <= 2826.65) { imposto = baseIRRF * 0.075 - 182.16; faixa = '7,5%'; }
    else if (baseIRRF <= 3751.05) { imposto = baseIRRF * 0.15 - 394.16; faixa = '15%'; }
    else if (baseIRRF <= 4664.68) { imposto = baseIRRF * 0.225 - 675.49; faixa = '22,5%'; }
    else { imposto = baseIRRF * 0.275 - 908.73; faixa = '27,5%'; }
    
    if (baseIRRF <= 5000.00) { imposto = 0; faixa = faixa ? `${faixa} (Isento pelo Redutor 2026)` : 'Isento'; }
    else if (baseIRRF <= 7350.00) { imposto = Math.max(0, imposto - (978.62 - (0.133145 * baseIRRF))); }
    return { valor: Math.max(0, Math.round(imposto * 100) / 100), faixa };
  };

  const getResultados = (rubs: Rubrica[]): ResultadoCalculo => {
    const baseINSS = rubs.filter(r => r.tipo === 'provento').reduce((a, c) => a + c.valor, 0);
    
    // SE calcularTributos FOR FALSE, ZERA TUDO
    const valorINSS = (!dadosEmpresa.calcularTributos) ? 0 : 
      (dadosEmpresa.tipoRecibo === 'salario' ? calcularINSS_CLT(baseINSS) : calcularINSS_ProLabore(baseINSS));
    
    const baseIRRF = Math.max(0, baseINSS - valorINSS - (dadosFuncionario.numeroDependentes * 189.59));
    const resIRRF = (!dadosEmpresa.calcularTributos) ? { valor: 0, faixa: '' } : calcularIRRF(baseIRRF);
    
    const descontosManuais = rubs.filter(r => r.tipo === 'desconto').reduce((a, c) => a + c.valor, 0);
    const totalDescontos = descontosManuais + valorINSS + resIRRF.valor;
    const liquidoReceber = Math.max(0, baseINSS - totalDescontos);
    
    const proventos = rubs.filter(r => r.tipo === 'provento');
    return {
      totalVencimentos: baseINSS, 
      totalDescontos, 
      liquidoReceber,
      baseINSS: dadosEmpresa.calcularTributos ? baseINSS : 0, 
      valorINSS, 
      baseIRRF: dadosEmpresa.calcularTributos ? baseIRRF : 0, 
      valorIRRF: resIRRF.valor, 
      faixaIRRF: resIRRF.faixa,
      salarioBase: dadosFuncionario.salarioBaseContratual || 0,
      baseFGTS: (dadosEmpresa.calcularTributos && dadosEmpresa.tipoRecibo === 'salario') ? baseINSS : 0,
      valorFGTS: (dadosEmpresa.calcularTributos && dadosEmpresa.tipoRecibo === 'salario') ? Math.round(baseINSS * 0.08 * 100) / 100 : 0
    };
  };

  const resultados = getResultados(rubricas);

  const todasRubricas = [
    ...rubricas,
    ...(dadosEmpresa.calcularTributos && resultados.valorINSS > 0 
        ? [{ codigo: 998, descricao: 'I.N.S.S.', referencia: dadosEmpresa.tipoRecibo === 'prolabore' ? '11%' : '8,01', valor: resultados.valorINSS, tipo: 'desconto' as const }] 
        : []),
    ...(dadosEmpresa.calcularTributos && resultados.valorIRRF > 0 
        ? [{ codigo: 999, descricao: 'I.R.R.F.', referencia: resultados.faixaIRRF, valor: resultados.valorIRRF, tipo: 'desconto' as const }] 
        : [])
  ];

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  const getMesesLote = () => {
    if (!dadosEmpresa.geracaoEmLote || !dadosEmpresa.mesAnoFinal) return [dadosEmpresa.mesAno];
    const start = new Date(dadosEmpresa.mesAno + '-01T00:00:00');
    const end = new Date(dadosEmpresa.mesAnoFinal + '-01T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [dadosEmpresa.mesAno];
    const months = [];
    let cur = new Date(start);
    while (cur <= end) {
      months.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
      cur.setMonth(cur.getMonth() + 1);
    }
    return months;
  };

  const mesesToRender = getMesesLote();

  const gerarPlanilha = async () => {
    setIsGeneratingSheet(true);
    try {

      const res = await fetch('/api/gerar-recibo-sheets', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          dadosEmpresa,
          dadosFuncionario,
          rubricas: todasRubricas,
          resultados
        })
      });
      
      if (!res.ok) {
        let errorMsg = 'Falha ao gerar planilha';
        try { const errorData = await res.json(); errorMsg = errorData.error; } catch(e) {}
        showToast('Erro: ' + errorMsg, 'error');
        return;
      }

      // Captura os dados como Blob e aciona o download
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RECIBO EXTRACONTABIL ${dadosFuncionario.nome?.trim() || 'FUNCIONARIO'} - ${dadosEmpresa.geracaoEmLote ? 'LOTE' : dadosEmpresa.mesAno}.xlsx`.toUpperCase();
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      showToast('Download do Excel concluído com sucesso!', 'success');

    } catch (e) {
      showToast('Erro ao gerar planilha', 'error');
    } finally {
      setIsGeneratingSheet(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#380E1C] overflow-hidden uppercase font-sans relative">
      {toast && (
        <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-bold ${toast.type === 'success' ? 'bg-[#117C43] text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <div className="px-6 py-4 border-b border-[#4A1828] bg-[#1E0810] flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4 text-xs md:text-sm overflow-x-auto whitespace-nowrap pb-2 md:pb-0 w-full custom-scrollbar">
          {[1, 2, 3, 4].map(s => (
            <button
              key={s}
              onClick={() => setStep(s as 1 | 2 | 3 | 4)}
              className={`flex items-center cursor-pointer hover:opacity-100 transition-opacity ${step === s ? 'text-[#C49B4A]' : step > s ? 'text-[#D1A751] opacity-70' : 'text-[#A68759] opacity-60'}`}
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 border text-xs font-bold ${step === s ? 'border-[#C49B4A] bg-[#C49B4A] bg-opacity-20' : step > s ? 'border-[#D1A751] bg-[#D1A751] bg-opacity-10' : 'border-[#A68759] border-opacity-40'}`}>{s}</div>
              {s === 1 ? 'EMPRESA' : s === 2 ? 'FUNCIONÁRIO & RUBRICAS' : s === 3 ? 'REVISÃO' : 'EXPORTAR'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {step === 1 && (
            <div className="bg-[#1E0810] border border-[#4A1828] p-6 rounded-xl space-y-6">
              <h2 className="text-xl font-bold text-[#C49B4A]">Dados da Empresa</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 border border-[#4A1828] border-dashed rounded-lg bg-[#380E1C] bg-opacity-30">
                  <label 
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleCnpjUpload}
                    className="flex flex-col items-center text-center space-y-3 cursor-pointer"
                  >
                    <div className="p-2 bg-[#4A1828] rounded-lg">
                      {isExtracting ? <Loader2 className="w-5 h-5 text-[#C49B4A] animate-spin" /> : <Upload className="w-5 h-5 text-[#C49B4A]" />}
                    </div>
                    <div>
                      <div className="text-[#D1A751] font-medium text-sm">Extrair do Cartão CNPJ (PDF)</div>
                      <div className="text-xs text-[#A68759]">Preenchimento automático inteligente</div>
                    </div>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleCnpjUpload} disabled={isExtracting} />
                  </label>
                  {cnpjStatus && (
                    <div className={`mt-3 text-center text-xs font-bold ${cnpjStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {cnpjStatus.message}
                    </div>
                  )}
                </div>

                <div className="p-4 border border-[#4A1828] border-dashed rounded-lg bg-[#380E1C] bg-opacity-30">
                  <label 
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleReciboUpload}
                    className="flex flex-col items-center text-center space-y-3 cursor-pointer"
                  >
                    <div className="p-2 bg-[#4A1828] rounded-lg">
                      {isExtractingRecibo ? <Loader2 className="w-5 h-5 text-[#C49B4A] animate-spin" /> : <FileText className="w-5 h-5 text-[#C49B4A]" />}
                    </div>
                    <div>
                      <div className="text-[#D1A751] font-medium text-sm">Importar de um Recibo Existente (PDF)</div>
                      <div className="text-xs text-[#A68759]">Extrai empresa, funcionário e rubricas automaticamente</div>
                    </div>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleReciboUpload} disabled={isExtractingRecibo} />
                  </label>
                  {reciboStatus && (
                    <div className={`mt-3 text-center text-xs font-bold ${reciboStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {reciboStatus.message}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#D1A751] mb-1">Nome da Empresa</label>
                  <input type="text" value={dadosEmpresa.nome} onChange={e => setDadosEmpresa({...dadosEmpresa, nome: e.target.value.toUpperCase()})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-3 text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-[#D1A751] mb-1">CNPJ</label>
                  <input type="text" value={dadosEmpresa.cnpj} onChange={e => setDadosEmpresa({...dadosEmpresa, cnpj: e.target.value.toUpperCase()})} placeholder="XX.XXX.XXX/XXXX-XX" className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-3 text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm text-[#D1A751] mb-1">Endereço</label>
                  <input type="text" value={dadosEmpresa.endereco} onChange={e => setDadosEmpresa({...dadosEmpresa, endereco: e.target.value.toUpperCase()})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-3 text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                </div>
                
                <div className="col-span-1 md:col-span-2 flex items-center mt-2">
                  <input type="checkbox" id="geracaoEmLote" checked={dadosEmpresa.geracaoEmLote} onChange={e => setDadosEmpresa({...dadosEmpresa, geracaoEmLote: e.target.checked})} className="mr-2 w-4 h-4 accent-[#C49B4A]" />
                  <label htmlFor="geracaoEmLote" className="text-sm font-bold text-[#D1A751]">GERAÇÃO EM LOTE (VÁRIOS MESES)</label>
                </div>

                <div>
                  <label className="block text-sm text-[#D1A751] mb-1">{dadosEmpresa.geracaoEmLote ? 'Mês/Ano Inicial' : 'Mês/Ano de Referência'}</label>
                  <input type="month" value={dadosEmpresa.mesAno} onChange={e => setDadosEmpresa({...dadosEmpresa, mesAno: e.target.value})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-3 text-[#D1A751] focus:border-[#C49B4A] focus:outline-none" />
                </div>

                {dadosEmpresa.geracaoEmLote && (
                  <div>
                    <label className="block text-sm text-[#D1A751] mb-1">Mês/Ano Final</label>
                    <input type="month" value={dadosEmpresa.mesAnoFinal || ''} onChange={e => setDadosEmpresa({...dadosEmpresa, mesAnoFinal: e.target.value})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-3 text-[#D1A751] focus:border-[#C49B4A] focus:outline-none" />
                  </div>
                )}

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm text-[#D1A751] mb-1">Tipo de Recibo</label>
                  <div className="flex space-x-2">
                    <button onClick={() => setDadosEmpresa({...dadosEmpresa, tipoRecibo: 'salario'})} className={`flex-1 py-3 rounded-lg border font-medium ${dadosEmpresa.tipoRecibo === 'salario' ? 'bg-[#4A1828] border-[#C49B4A] text-[#D1A751]' : 'bg-[#380E1C] border-[#4A1828] text-[#A68759]'}`}>SALÁRIO</button>
                    <button onClick={() => setDadosEmpresa({...dadosEmpresa, tipoRecibo: 'prolabore'})} className={`flex-1 py-3 rounded-lg border font-medium ${dadosEmpresa.tipoRecibo === 'prolabore' ? 'bg-[#4A1828] border-[#C49B4A] text-[#D1A751]' : 'bg-[#380E1C] border-[#4A1828] text-[#A68759]'}`}>PRÓ-LABORE</button>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 flex items-center mt-4 p-4 border border-[#4A1828] rounded-lg bg-[#380E1C] bg-opacity-30">
                  <input 
                    type="checkbox" 
                    id="calcularTributos" 
                    checked={dadosEmpresa.calcularTributos} 
                    onChange={e => setDadosEmpresa({...dadosEmpresa, calcularTributos: e.target.checked})} 
                    className="mr-3 w-5 h-5 accent-[#C49B4A]" 
                  />
                  <label htmlFor="calcularTributos" className="text-sm font-bold text-[#D1A751] cursor-pointer">
                    CALCULAR E EXIBIR TRIBUTOS FEDERAIS (INSS, IRRF E FGTS)
                  </label>
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={() => setStep(2)} className="w-full md:w-auto flex justify-center items-center px-6 py-3 bg-[#4A1828] text-[#C49B4A] rounded-lg font-medium hover:bg-[#5A1C30] transition-colors">
                  PRÓXIMA ETAPA <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 space-y-6 w-full">
                <div className="bg-[#1E0810] border border-[#4A1828] p-6 rounded-xl space-y-4">
                  <h2 className="text-xl font-bold text-[#C49B4A]">Dados do Funcionário</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-[#D1A751] mb-1">Código</label>
                        <input type="text" value={dadosFuncionario.codigo} onChange={e => setDadosFuncionario({...dadosFuncionario, codigo: e.target.value.toUpperCase()})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-2.5 text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm text-[#D1A751] mb-1">Nome</label>
                        <input type="text" value={dadosFuncionario.nome} onChange={e => setDadosFuncionario({...dadosFuncionario, nome: e.target.value.toUpperCase()})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-2.5 text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm text-[#D1A751] mb-1">Função</label>
                        <input type="text" value={dadosFuncionario.funcao} onChange={e => setDadosFuncionario({...dadosFuncionario, funcao: e.target.value.toUpperCase()})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-2.5 text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm text-[#D1A751] mb-1">Salário Base Contratual (Integral)</label>
                        <CurrencyInput value={dadosFuncionario.salarioBaseContratual || 0} onChangeValue={val => setDadosFuncionario({...dadosFuncionario, salarioBaseContratual: val})} className="w-full bg-[#380E1C] border border-[#4A1828] rounded-lg p-2.5 text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                      </div>
                    </div>
                </div>

                <div className="bg-[#1E0810] border border-[#4A1828] p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-[#C49B4A]">Rubricas Base</h2>
                    <button onClick={() => setRubricas(prev => [...prev, { codigo: 2001 + prev.length, descricao: '', referencia: '', valor: 0, tipo: 'provento' }])} className="flex items-center text-sm px-3 py-1.5 bg-[#4A1828] text-[#C49B4A] rounded hover:bg-[#5A1C30]">
                      <Plus className="w-4 h-4 mr-1" /> ADICIONAR
                    </button>
                  </div>
                  {dadosEmpresa.geracaoEmLote && (
                    <div className="text-sm text-[#D1A751] mb-4 bg-[#380E1C] p-3 rounded-lg border border-[#4A1828]">
                      Nota: Em geração em lote, estas rubricas baseadas serão replicadas para todos os meses ({mesesToRender.length} meses). Valores podem ser ajustados individualmente após exportar.
                    </div>
                  )}
                  <div className="space-y-3">
                    {rubricas.map((rubrica, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-4 md:gap-2 items-start md:items-center bg-[#380E1C] p-3 rounded-lg border border-[#4A1828]">
                        <div className="w-full md:w-16">
                          <label className="block text-xs text-[#A68759] mb-1">Cód</label>
                          <input type="number" value={rubrica.codigo} onChange={e => {
                            const newR = [...rubricas]; newR[index].codigo = parseInt(e.target.value) || 0; setRubricas(newR);
                          }} className="w-full bg-[#1E0810] border border-[#4A1828] rounded p-1.5 text-sm text-[#D1A751] focus:border-[#C49B4A] focus:outline-none" />
                        </div>
                        <div className="w-full md:flex-1">
                          <label className="block text-xs text-[#A68759] mb-1">Descrição</label>
                          <input type="text" value={rubrica.descricao} onChange={e => {
                            const newR = [...rubricas]; newR[index].descricao = e.target.value.toUpperCase(); setRubricas(newR);
                          }} className="w-full bg-[#1E0810] border border-[#4A1828] rounded p-1.5 text-sm text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                        </div>
                        <div className="w-full md:w-24">
                          <label className="block text-xs text-[#A68759] mb-1">Ref.</label>
                          <input type="text" value={rubrica.referencia} onChange={e => {
                            const newR = [...rubricas]; newR[index].referencia = e.target.value.toUpperCase(); setRubricas(newR);
                          }} className="w-full bg-[#1E0810] border border-[#4A1828] rounded p-1.5 text-sm text-[#D1A751] uppercase focus:border-[#C49B4A] focus:outline-none" />
                        </div>
                        <div className="w-full md:w-32">
                          <label className="block text-xs text-[#A68759] mb-1">Valor (R$)</label>
                          <CurrencyInput value={rubrica.valor} onChangeValue={val => {
                            const newR = [...rubricas]; newR[index].valor = val; setRubricas(newR);
                          }} className="w-full bg-[#1E0810] border border-[#4A1828] rounded p-1.5 text-sm text-[#D1A751] focus:border-[#C49B4A] focus:outline-none" />
                        </div>
                        <div className="w-full md:w-28">
                          <label className="block text-xs text-[#A68759] mb-1">Tipo</label>
                          <select value={rubrica.tipo} onChange={e => {
                            const newR = [...rubricas]; newR[index].tipo = e.target.value as any; setRubricas(newR);
                          }} className="w-full bg-[#1E0810] border border-[#4A1828] rounded p-1.5 text-sm text-[#D1A751] appearance-none">
                            <option value="provento">PROVENTO</option>
                            <option value="desconto">DESCONTO</option>
                          </select>
                        </div>
                        <div className="pt-0 md:pt-5 w-full flex justify-end md:w-auto">
                          <button onClick={() => { if (rubricas.length > 1) setRubricas(rubricas.filter((_, i) => i !== index)); }} disabled={rubricas.length === 1} className="p-1.5 text-[#A68759] hover:text-red-400 disabled:opacity-30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col-reverse md:flex-row justify-between gap-4">
                  <button onClick={() => setStep(1)} className="w-full md:w-auto flex justify-center items-center px-4 py-3 bg-[#380E1C] text-[#A68759] border border-[#4A1828] rounded-lg hover:bg-[#4A1828] transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> VOLTAR
                  </button>
                  <button onClick={() => setStep(3)} className="w-full md:w-auto flex justify-center items-center px-6 py-3 bg-[#4A1828] text-[#C49B4A] rounded-lg font-medium hover:bg-[#5A1C30] transition-colors">
                    PRÓXIMA ETAPA <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {(step === 3 || step === 4) && (
            <div className={step === 4 ? "hidden" : "space-y-6 pb-20"}>
              <div className="flex flex-col md:flex-row justify-between items-center bg-[#1E0810] border border-[#4A1828] p-4 rounded-xl gap-4">
                <button onClick={() => setStep(2)} className="w-full md:w-auto flex justify-center items-center px-4 py-2 bg-[#380E1C] text-[#A68759] border border-[#4A1828] rounded-lg hover:bg-[#4A1828] transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" /> EDITAR
                </button>
                <div className="flex flex-col items-center">
                  <div className="text-[#C49B4A] font-bold">PRÉVIA DO RECIBO</div>
                  <button onClick={() => {
                    const jsonEl = document.getElementById('json-viewer');
                    if (jsonEl) {
                      jsonEl.style.display = jsonEl.style.display === 'none' ? 'block' : 'none';
                    }
                  }} className="text-[#A68759] text-xs underline mt-1 hover:text-[#D1A751]">
                    Ver JSON (Jason)
                  </button>
                </div>
                <button onClick={() => setStep(4)} className="w-full md:w-auto flex justify-center items-center px-4 py-2 bg-[#4A1828] text-[#C49B4A] rounded-lg font-medium hover:bg-[#5A1C30] transition-colors">
                  GERAR / EXPORTAR <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
              
              <div id="json-viewer" className="hidden">
                <pre className="bg-[#110408] border border-[#4A1828] text-[#D1A751] p-4 rounded-xl overflow-x-auto text-xs">
                  {JSON.stringify({ dadosEmpresa, dadosFuncionario, rubricas, resultados }, null, 2)}
                </pre>
              </div>

              <div id="print-area" className="bg-white overflow-x-auto p-4 md:p-8 rounded-lg" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                {mesesToRender.map((mes, idx) => (
                  <div key={idx} style={{ pageBreakAfter: idx < mesesToRender.length - 1 ? 'always' : 'auto' }}>
                    <LayoutRecibo 
                      dadosEmpresa={dadosEmpresa}
                      dadosFuncionario={dadosFuncionario}
                      todasRubricas={todasRubricas}
                      resultados={resultados}
                      mesAnoRef={mes}
                    />
                    <div style={{
                      width: '100%',
                      borderTop: '1px dashed #999',
                      margin: '12px 0',
                      pageBreakInside: 'avoid'
                    }}></div>
                    <LayoutRecibo 
                      dadosEmpresa={dadosEmpresa}
                      dadosFuncionario={dadosFuncionario}
                      todasRubricas={todasRubricas}
                      resultados={resultados}
                      mesAnoRef={mes}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-8">
                <h2 className="text-2xl font-bold text-[#C49B4A]">Exportar Recibo</h2>
                <button onClick={() => setStep(1)} className="text-[#A68759] hover:text-[#D1A751] text-sm underline">Criar Novo Recibo</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="bg-[#1E0810] border-2 border-[#4A1828] rounded-xl p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-[#380E1C] rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-[#C49B4A]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#D1A751] mb-2">Exportar para Excel (.xlsx)</h3>
                  <p className="text-[#A68759] text-sm mb-8 flex-1">
                    Gera um arquivo Excel com as fórmulas preenchidas e formatação idêntica ao modelo, pronto para download seguro.
                  </p>
                  
                  <button 
                    onClick={gerarPlanilha} 
                    disabled={isGeneratingSheet}
                    className="w-full flex items-center justify-center px-6 py-4 bg-[#4A1828] text-[#C49B4A] rounded-lg font-bold hover:bg-[#5A1C30] transition-colors disabled:opacity-50"
                  >
                    {isGeneratingSheet ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> GERANDO EXCEL...</>
                    ) : (
                      <><Download className="w-5 h-5 mr-2" /> BAIXAR EXCEL</>
                    )}
                  </button>
                </div>

                <div className="bg-[#1E0810] border border-[#4A1828] rounded-xl p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-[#380E1C] rounded-full flex items-center justify-center mb-4">
                    <Printer className="w-8 h-8 text-[#C49B4A]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#D1A751] mb-2">Impressão Direta</h3>
                  <p className="text-[#A68759] text-sm mb-8 flex-1">Gera a prévia para impressão ou PDF.</p>
                  <button onClick={() => {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) return alert('Permita pop-ups.');
                    printWindow.document.write(`
                      <!DOCTYPE html><html><head><title>RECIBO EXTRACONTABIL ${dadosFuncionario.nome || 'FUNCIONARIO'} - ${dadosEmpresa.geracaoEmLote ? 'LOTE' : dadosEmpresa.mesAno}</title>
                      <style>@media print { @page { size: A4 portrait; margin: 5mm; } body { margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, Helvetica, sans-serif; } }</style>
                      </head><body><div style="display:flex; flex-direction:column; gap:16px;">
                      ${document.getElementById('print-area')?.innerHTML}
                      </div></body></html>
                    `);
                    printWindow.document.close();
                  }} className="w-full flex items-center justify-center px-6 py-4 bg-[#380E1C] border border-[#4A1828] text-[#D1A751] rounded-lg font-bold hover:bg-[#4A1828]">
                    <Printer className="w-5 h-5 mr-2" /> IMPRIMIR / SALVAR PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <ErrorLogViewer errorLog={errorLog} onClose={() => setErrorLog(null)} />
    </div>
  );
}
