import { auth, db } from './lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import React, { useState, useEffect } from 'react';
import { Upload, Loader2, Plus, Trash2, ArrowRight, ArrowLeft, Download, ExternalLink, Printer, Activity, FileText, FileSpreadsheet, Sparkles } from 'lucide-react';
import { Rubrica, DadosEmpresa, DadosFuncionario, ResultadoCalculo } from './types';
import { LayoutRecibo } from './LayoutRecibo';
import { CurrencyInput } from './CurrencyInput';
import { getTrimmedPdfBase64 } from './pdfUtils';
import { ErrorLogViewer } from './ErrorLogViewer';
import { calcularINSS_CLT, calcularINSS_ProLabore, calcularIRRF } from './utils/tributos';
import { CalculadoraHorasExtrasRecibo } from './components/CalculadoraHorasExtrasRecibo';
import { 
  calcularCalendarioDSR, 
  calcularSalarioHora, 
  calcularValorHoraExtra, 
  calcularTotalHorasExtras, 
  calcularDSR,
  hhMmToDecimal
} from './utils/dsrCalendarUtils';

export interface Funcionario13Row {
  id: string;
  codigo?: string;
  nome: string;
  dataAdmissao: string; // DD/MM/AAAA
  avos: number;         // 0..12
  salarioBase: number;  // Salário Base Integral (descoberto por cálculo reverso ou editado)
  medias: number;       // Média e vantagens
  parcela1: number;     // 1ª Parcela (50% sem descontos)
  inssIrrf: number;     // Estimativa aproximada de tributos (INSS + IRRF sobre o 13º bruto)
  parcela2: number;     // 2ª Parcela líquida (descontando INSS + IRRF)
  fgts: number | null;  // Apenas extraído do PDF; se não enviado, fica null (em branco)
}

export const calcularAvosPorAdmissao = (dataAdmissao: string, anoReferencia: number): number | null => {
  if (!dataAdmissao) return null;
  const clean = dataAdmissao.trim();
  let dia = 0, mes = 0, ano = 0;

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(clean)) {
    const parts = clean.split('/');
    dia = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    ano = parseInt(parts[2], 10);
  } else if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    const parts = clean.split('-');
    ano = parseInt(parts[0], 10);
    mes = parseInt(parts[1], 10);
    dia = parseInt(parts[2], 10);
  } else {
    return null;
  }

  if (isNaN(dia) || isNaN(mes) || isNaN(ano) || mes < 1 || mes > 12 || dia < 1 || dia > 31) {
    return null;
  }

  if (ano < anoReferencia) {
    return 12;
  }
  if (ano > anoReferencia) {
    return 0;
  }

  const diasNoMesAdmissao = new Date(ano, mes, 0).getDate();
  const diasTrabalhadosNoMes = diasNoMesAdmissao - dia + 1;
  const contaMesAdmissao = diasTrabalhadosNoMes >= 15 ? 1 : 0;
  const mesesRestantes = 12 - mes;
  const totalAvos = Math.max(0, Math.min(12, mesesRestantes + contaMesAdmissao));
  return totalAvos;
};

export const calcularSalarioBaseReverso = (salario13Proporcional: number, avos: number): number => {
  if (!salario13Proporcional || salario13Proporcional <= 0) return 0;
  if (!avos || avos <= 0 || avos >= 12) return Math.round(salario13Proporcional * 100) / 100;
  const rawBase = (salario13Proporcional * 12) / avos;
  return Math.round(rawBase * 100) / 100;
};

export const calcularParcelasETributos13 = (salarioBase: number, avos: number, medias: number) => {
  const avosValidos = Math.max(0, Math.min(12, Number(avos) || 0));
  const salarioProporcional = ((Number(salarioBase) || 0) / 12) * avosValidos;
  const totalDevido = Math.max(0, salarioProporcional + (Number(medias) || 0));
  const parcela1 = Math.round((totalDevido / 2) * 100) / 100;
  const valorINSS = totalDevido > 0 ? calcularINSS_CLT(totalDevido) : 0;
  const valorIRRF = totalDevido > 0 ? calcularIRRF(totalDevido, valorINSS, 0).valor : 0;
  const inssIrrf = Math.round((valorINSS + valorIRRF) * 100) / 100;
  const parcela2 = Math.max(0, Math.round((totalDevido - parcela1 - inssIrrf) * 100) / 100);
  return {
    parcela1,
    inssIrrf,
    parcela2
  };
};

export default function ReciboApp() {
  const [modoAtivo, setModoAtivo] = useState<'recibo' | 'relatorio13'>('recibo');
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtractingRecibo, setIsExtractingRecibo] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [isGeneratingSheet, setIsGeneratingSheet] = useState(false);
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [cnpjStatus, setCnpjStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [reciboStatus, setReciboStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  // --- Estados do Relatório de 13º Salário ---
  const [empresasCadastradas, setEmpresasCadastradas] = useState<Array<{ id: string; nome: string; cnpj: string }>>([]);
  const [empresa13, setEmpresa13] = useState({
    nome: '',
    cnpj: '',
    anoReferencia: String(new Date().getFullYear())
  });
  const [isExtracting13, setIsExtracting13] = useState(false);
  const [status13, setStatus13] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [rows13, setRows13] = useState<Funcionario13Row[]>([
    {
      id: 'row-1',
      codigo: '01',
      nome: '',
      dataAdmissao: '',
      avos: 12,
      salarioBase: 0,
      medias: 0,
      parcela1: 0,
      inssIrrf: 0,
      parcela2: 0,
      fgts: null
    }
  ]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  // Carregar empresas do Firestore para seleção rápida
  useEffect(() => {
    getDocs(collection(db, 'empresas'))
      .then(snap => {
        const list = snap.docs
          .map(d => {
            const data = d.data() as any;
            return {
              id: d.id,
              nome: (data.nome || data.razaoSocial || data.nomeFantasia || '').toUpperCase(),
              cnpj: data.cnpj || ''
            };
          })
          .filter(e => e.nome)
          .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
        setEmpresasCadastradas(list);
      })
      .catch(err => console.warn('Erro ao carregar empresas no ReciboApp:', err));
  }, []);

  const [dadosEmpresa, setDadosEmpresa] = useState<DadosEmpresa>({
    nome: '',
    cnpj: '',
    endereco: '',
    mesAno: '',
    mesAnoFinal: '',
    geracaoEmLote: false,
    tipoRecibo: 'salario',
    calcularTributos: false,
    calcularINSS: true,
    calcularIRRF: true,
    calcularFGTS: true
  });

  const [dadosFuncionario, setDadosFuncionario] = useState<DadosFuncionario>({
    codigo: '',
    nome: '',
    funcao: '',
    cbo: '',
    numeroDependentes: 0
  });

  const [rubricas, setRubricas] = useState<Rubrica[]>([
    { codigo: 2001, descricao: 'DIAS NORMAIS', referencia: '30', valor: 0, tipo: 'provento' }
  ]);

  const applyAdmissaoMask = (val: string) => {
    const clean = val.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split('-');
      return `${d}/${m}/${y}`;
    }
    const digits = clean.replace(/\D/g, '').slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
  };

  const processRelatorio13Extraction = async (base64: string, mimeType: string = 'application/pdf') => {
    setIsExtracting13(true);
    setStatus13(null);
    try {
      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
        },
        body: JSON.stringify({
          pdfBase64: base64,
          mimeType,
          type: 'relatorio_13'
        })
      });

      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        setErrorLog(`Erro ao extrair RELATÓRIO DE 13º: O servidor retornou conteúdo não-JSON.\nStatus: ${res.status} ${res.statusText}\n\n${text}`);
        throw new SyntaxError('Resposta inválida do servidor ao extrair Relatório de 13º.');
      }

      const resData = await res.json();
      if (!res.ok || resData.error) {
        showToast(resData.error || 'Erro na extração do Relatório de 13º.', 'error');
        setStatus13({ message: `EXTRAÇÃO FALHOU APÓS ${resData.attempts || 1} TENTATIVA(S)`, type: 'error' });
        return;
      }

      const data = resData.data;
      if (data) {
        const anoExtraido = String(data.anoReferencia || '').replace(/\D/g, '');
        let anoRefNum = parseInt(anoExtraido || empresa13.anoReferencia || String(new Date().getFullYear()), 10);
        if (isNaN(anoRefNum) || anoRefNum < 2000) anoRefNum = new Date().getFullYear();

        // Se não veio ano explícito no cabeçalho, tenta inferir pelas datas de admissão do próprio relatório
        if (!anoExtraido && Array.isArray(data.funcionarios)) {
          for (const f of data.funcionarios) {
            const adm = applyAdmissaoMask(String(f.dataAdmissao || ''));
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(adm)) {
              const y = parseInt(adm.split('/')[2], 10);
              if (y >= 2024 && y <= 2100) {
                anoRefNum = Math.max(anoRefNum, y);
              }
            }
          }
        }

        setEmpresa13(prev => ({
          nome: data.empresaNome ? String(data.empresaNome).toUpperCase() : prev.nome,
          cnpj: data.cnpj ? String(data.cnpj).toUpperCase() : prev.cnpj,
          anoReferencia: String(anoRefNum)
        }));

        if (Array.isArray(data.funcionarios) && data.funcionarios.length > 0) {
          const parsedRows: Funcionario13Row[] = data.funcionarios.map((f: any, idx: number) => {
            const admFormatted = applyAdmissaoMask(String(f.dataAdmissao || ''));
            let avosNum = Number(f.avos);
            if (isNaN(avosNum) || avosNum <= 0 || avosNum > 12) {
              const calcAvos = calcularAvosPorAdmissao(admFormatted, anoRefNum);
              avosNum = calcAvos !== null ? calcAvos : 12;
            }
            const salProp = Number(f.salario13Proporcional ?? f.salarioBase ?? 0) || 0;
            const salarioBaseCalculado = f.salarioBase && !f.salario13Proporcional
              ? Math.round(Number(f.salarioBase) * 100) / 100
              : calcularSalarioBaseReverso(salProp, avosNum);
            const mediasNum = Math.round((Number(f.medias) || 0) * 100) / 100;
            const { parcela1, inssIrrf, parcela2 } = calcularParcelasETributos13(salarioBaseCalculado, avosNum, mediasNum);
            const fgtsExtraido =
              f.fgts !== undefined && f.fgts !== null && String(f.fgts).trim() !== '' && !isNaN(Number(f.fgts))
                ? Math.round(Number(f.fgts) * 100) / 100
                : null;

            return {
              id: `row-${Date.now()}-${idx}`,
              codigo: String(f.codigo || idx + 1),
              nome: String(f.nome || '').toUpperCase(),
              dataAdmissao: admFormatted,
              avos: avosNum,
              salarioBase: salarioBaseCalculado,
              medias: mediasNum,
              parcela1,
              inssIrrf,
              parcela2,
              fgts: fgtsExtraido
            };
          });
          setRows13(parsedRows);
          showToast(`${parsedRows.length} colaborador(es) extraído(s) com cálculo reverso de salário!`, 'success');
          setStatus13({
            message: `EXTRAÇÃO CONCLUÍDA (${parsedRows.length} COLABORADORES) APÓS ${resData.attempts || 1} TENTATIVA(S) VIA ${resData.modelUsed || 'GEMINI'}`,
            type: 'success'
          });
        } else {
          showToast('Nenhum colaborador identificado na tabela enviada.', 'error');
          setStatus13({ message: 'NENHUM COLABORADOR ENCONTRADO NO ARQUIVO', type: 'error' });
        }
      }
    } catch (error: any) {
      console.error('Erro ao extrair Relatório 13º:', error);
      showToast(error?.message || 'Erro ao processar arquivo de 13º.', 'error');
      setStatus13({ message: 'ERRO NA EXTRAÇÃO', type: 'error' });
    } finally {
      setIsExtracting13(false);
    }
  };

  const handleRelatorio13File = async (file: File) => {
    if (!file) return;
    setIsExtracting13(true);
    try {
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        const base64 = await getTrimmedPdfBase64(file, 4);
        await processRelatorio13Extraction(base64, 'application/pdf');
      } else if (file.type.startsWith('image/')) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            resolve(result.includes(',') ? result.split(',')[1] : result);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await processRelatorio13Extraction(base64, file.type || 'image/png');
      } else {
        showToast('Envie uma imagem (PNG, JPG, WEBP) ou um arquivo PDF.', 'error');
        setIsExtracting13(false);
      }
    } catch (err: any) {
      console.error('Erro ao ler arquivo de 13º:', err);
      showToast('Falha ao ler o arquivo selecionado.', 'error');
      setIsExtracting13(false);
    }
  };

  const handleRelatorio13Upload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files?.[0];
    } else if (e.target && 'files' in e.target) {
      file = (e.target as HTMLInputElement).files?.[0];
    }
    if (!file) return;
    await handleRelatorio13File(file);
    if (e.target && 'value' in e.target) {
      (e.target as HTMLInputElement).value = '';
    }
  };

  // Suporte a Ctrl+V (colar print da área de transferência direto na aba Relatório de 13º)
  useEffect(() => {
    if (modoAtivo !== 'relatorio13') return;
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            showToast('Imagem colada! Extraindo dados do 13º por IA...', 'success');
            handleRelatorio13File(file);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [modoAtivo, empresa13.anoReferencia]);

  useEffect(() => {
    // Verificar se o Assistente IA enviou um Relatório de 13º
    const aiRelatorio13 = localStorage.getItem('@app:ai_generated_relatorio_13');
    if (aiRelatorio13) {
      try {
        const payload = JSON.parse(aiRelatorio13);
        setModoAtivo('relatorio13');
        const anoRef = String(payload.anoReferencia || new Date().getFullYear());
        setEmpresa13(prev => ({
          nome: payload.empresaNome ? String(payload.empresaNome).toUpperCase() : prev.nome,
          cnpj: payload.cnpj ? String(payload.cnpj).toUpperCase() : prev.cnpj,
          anoReferencia: anoRef
        }));
        if (payload.pdfBase64) {
          processRelatorio13Extraction(payload.pdfBase64, payload.mimeType || 'application/pdf');
        } else if (Array.isArray(payload.funcionarios) && payload.funcionarios.length > 0) {
          const anoNum = parseInt(anoRef, 10) || new Date().getFullYear();
          const rows: Funcionario13Row[] = payload.funcionarios.map((f: any, idx: number) => {
            const adm = applyAdmissaoMask(String(f.dataAdmissao || ''));
            const avos = Number(f.avos) || calcularAvosPorAdmissao(adm, anoNum) || 12;
            const salBase = Number(f.salarioBase) || calcularSalarioBaseReverso(Number(f.salario13Proporcional) || 0, avos);
            const medias = Number(f.medias) || 0;
            const { parcela1, inssIrrf, parcela2 } = calcularParcelasETributos13(salBase, avos, medias);
            const fgtsExtraido =
              f.fgts !== undefined && f.fgts !== null && String(f.fgts).trim() !== '' && !isNaN(Number(f.fgts))
                ? Math.round(Number(f.fgts) * 100) / 100
                : null;
            return {
              id: `row-ai-${idx}`,
              codigo: String(f.codigo || idx + 1),
              nome: String(f.nome || '').toUpperCase(),
              dataAdmissao: adm,
              avos,
              salarioBase: salBase,
              medias,
              parcela1,
              inssIrrf,
              parcela2,
              fgts: fgtsExtraido
            };
          });
          setRows13(rows);
        }
        localStorage.removeItem('@app:ai_generated_relatorio_13');
      } catch (e) {
        console.error('Erro ao ler payload de Relatório 13º da IA:', e);
      }
    }

    const aiPayload = localStorage.getItem('@app:ai_generated_recibo');
    if (aiPayload) {
      try {
        const payload = JSON.parse(aiPayload);
        setModoAtivo('recibo');
        
        // ZERAR DADOS PRIMEIRO
        const now = new Date();
        const defaultMesAno = `${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        setDadosEmpresa({ nome: '', cnpj: '', endereco: '', mesAno: defaultMesAno, geracaoEmLote: false, mesAnoFinal: '', tipoRecibo: 'salario', calcularTributos: false, calcularINSS: true, calcularIRRF: true, calcularFGTS: true });
        setDadosFuncionario({ codigo: '', nome: '', funcao: '', cbo: '', numeroDependentes: 0, salarioBaseContratual: undefined, diasTrabalhados: undefined });
        setRubricas([{ codigo: 2001, descricao: 'DIAS NORMAIS', referencia: '30', valor: 0, tipo: 'provento' }]);

        if (payload.pdfBase64) {
          processReciboPdfExtraction(payload.pdfBase64);
          if (payload.pdfName) showToast(`Extraindo dados do PDF: ${payload.pdfName}`, 'success');
        } else {
          const formattedMesAno = payload.mesAno ? applyMesAnoMask(payload.mesAno) : '';
          const payloadCnpj = payload.cnpj || payload.empresaCnpj || '';
          const payloadEndereco = payload.endereco || payload.empresaEndereco || '';

          // Pre-fill data
          setDadosEmpresa(prev => ({
            ...prev,
            nome: payload.empresaNome || prev.nome,
            cnpj: payloadCnpj || prev.cnpj,
            endereco: payloadEndereco || prev.endereco,
            mesAno: formattedMesAno || prev.mesAno
          }));

          // Se tiver empresaNome mas não tiver cnpj ou endereco, tenta buscar do banco de empresas
          if (payload.empresaNome && (!payloadCnpj || !payloadEndereco)) {
            getDocs(collection(db, 'empresas')).then(snap => {
              const term = payload.empresaNome.toLowerCase().trim();
              const found = snap.docs
                .map(d => ({ id: d.id, ...d.data() } as any))
                .find(e => 
                  (e.nome && (e.nome.toLowerCase().includes(term) || term.includes(e.nome.toLowerCase()))) ||
                  (e.razaoSocial && (e.razaoSocial.toLowerCase().includes(term) || term.includes(e.razaoSocial.toLowerCase()))) ||
                  (e.nomeFantasia && (e.nomeFantasia.toLowerCase().includes(term) || term.includes(e.nomeFantasia.toLowerCase())))
                );
              if (found) {
                const fullEnd = found.endereco || [found.logradouro, found.numero, found.bairro, found.cidade, found.uf].filter(Boolean).join(', ') || '';
                setDadosEmpresa(prev => ({
                  ...prev,
                  nome: found.nome || found.razaoSocial || prev.nome,
                  cnpj: prev.cnpj || found.cnpj || '',
                  endereco: prev.endereco || fullEnd
                }));
              }
            }).catch(err => console.warn('Erro ao auto-completar empresa do recibo:', err));
          }
          
          setDadosFuncionario(prev => ({
             ...prev,
             nome: payload.nomeFuncionario || prev.nome,
             salarioBaseContratual: payload.salarioBaseContratual ? Number(payload.salarioBaseContratual) : undefined,
             diasTrabalhados: payload.diasTrabalhados ? Number(payload.diasTrabalhados) : undefined
          }));
          
          const numSalario = typeof payload.salarioBaseContratual === 'string' 
             ? parseFloat(payload.salarioBaseContratual.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.')) 
             : payload.salarioBaseContratual;
            
          const numDias = payload.diasTrabalhados || 30;
          
          const numValor = typeof payload.valor === 'string'
            ? parseFloat(payload.valor.replace(/[^\d.,]/g, '').replace(/\./g, '').replace(',', '.'))
            : payload.valor;

          let rubricasIniciais: Rubrica[] = [];

          if (Array.isArray(payload.rubricas) && payload.rubricas.length > 0) {
            rubricasIniciais = payload.rubricas.map((r: any, idx: number) => ({
              codigo: Number(r.codigo) || (2001 + idx),
              descricao: String(r.descricao || '').toUpperCase(),
              referencia: String(r.referencia || ''),
              valor: Number(r.valor) || 0,
              tipo: (r.tipo === 'desconto' ? 'desconto' : 'provento') as 'provento' | 'desconto'
            }));
          } else if (numValor || payload.referenteA) {
            rubricasIniciais = [
              { 
                codigo: 2001, 
                descricao: payload.referenteA || 'DIAS NORMAIS', 
                referencia: numDias.toString(), 
                valor: numValor || (numSalario ? (numSalario / 30) * numDias : 0), 
                tipo: 'provento' 
              }
            ];
          }

          if (payload.horasExtras && Array.isArray(payload.horasExtras)) {
            const salBase = numSalario || numValor || 0;
            const divisor = Number(payload.divisorJornada) || 220;
            const salHora = calcularSalarioHora(salBase, divisor);
            const calDsr = calcularCalendarioDSR(formattedMesAno || defaultMesAno);
            let nextCod = rubricasIniciais.length > 0 ? Math.max(...rubricasIniciais.map(r => r.codigo)) + 1 : 2010;

            payload.horasExtras.forEach((he: any) => {
              const qtdDec = typeof he.qtdHoras === 'string' ? hhMmToDecimal(he.qtdHoras) : (Number(he.qtdHoras) || 0);
              const pct = Number(he.percentual) || 50;
              const valHoraHe = calcularValorHoraExtra(salHora, pct);
              const totHe = calcularTotalHorasExtras(qtdDec, valHoraHe);

              if (totHe > 0) {
                rubricasIniciais.push({
                  codigo: nextCod++,
                  descricao: `HORAS EXTRAS ${pct}%`,
                  referencia: `${qtdDec.toFixed(2)}H`,
                  valor: totHe,
                  tipo: 'provento'
                });

                if (he.calcularDsr !== false) {
                  const valDsr = calcularDSR(totHe, calDsr.diasUteis, calDsr.domingosEFeriados);
                  if (valDsr > 0) {
                    rubricasIniciais.push({
                      codigo: nextCod++,
                      descricao: `DSR S/ HORAS EXTRAS ${pct}%`,
                      referencia: `${calDsr.domingosEFeriados}/${calDsr.diasUteis}`,
                      valor: valDsr,
                      tipo: 'provento'
                    });
                  }
                }
              }
            });
          }

          if (rubricasIniciais.length > 0) {
            setRubricas(rubricasIniciais);
          }
          setStep(2);
          showToast('Dados pré-preenchidos pela IA.', 'success');
        }
        localStorage.removeItem('@app:ai_generated_recibo');
      } catch (e) {
        console.error('Erro ao ler payload da IA:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (dadosFuncionario.salarioBaseContratual !== undefined) {
      const salario = dadosFuncionario.salarioBaseContratual;
      const dias = dadosFuncionario.diasTrabalhados || 30; // 30 por padrão
      const valorCalculado = (salario / 30) * dias;
      setRubricas(prev => {
        const index = prev.findIndex(r => r.descricao === 'DIAS NORMAIS');
        if (index !== -1) {
          const novasRubricas = [...prev];
          novasRubricas[index] = { 
            ...novasRubricas[index], 
            referencia: dias.toString(), 
            valor: valorCalculado 
          };
          return novasRubricas;
        }
        return prev; // Se o usuário apagou a rubrica, respeitamos e não recriamos.
      });
    }
  }, [dadosFuncionario.salarioBaseContratual, dadosFuncionario.diasTrabalhados]);

  // Funções de atualização reativa das linhas da planilha de 13º
  const handleUpdateRow13 = (index: number, field: keyof Funcionario13Row, value: any) => {
    setRows13(prev => {
      const updated = [...prev];
      const current = { ...updated[index] };
      const anoRefNum = parseInt(empresa13.anoReferencia, 10) || new Date().getFullYear();

      if (field === 'nome') {
        current.nome = String(value).toUpperCase();
      } else if (field === 'dataAdmissao') {
        const masked = applyAdmissaoMask(String(value));
        current.dataAdmissao = masked;
        // Se completou DD/MM/AAAA, recalcula automaticamente os avos, tributos e parcelas! (FGTS permanece intocado)
        if (masked.length === 10) {
          const novosAvos = calcularAvosPorAdmissao(masked, anoRefNum);
          if (novosAvos !== null) {
            current.avos = novosAvos;
            const { parcela1, inssIrrf, parcela2 } = calcularParcelasETributos13(current.salarioBase, novosAvos, current.medias);
            current.parcela1 = parcela1;
            current.inssIrrf = inssIrrf;
            current.parcela2 = parcela2;
          }
        }
      } else if (field === 'avos') {
        const novosAvos = Math.max(0, Math.min(12, parseInt(String(value), 10) || 0));
        current.avos = novosAvos;
        const { parcela1, inssIrrf, parcela2 } = calcularParcelasETributos13(current.salarioBase, novosAvos, current.medias);
        current.parcela1 = parcela1;
        current.inssIrrf = inssIrrf;
        current.parcela2 = parcela2;
      } else if (field === 'salarioBase') {
        const novoSalario = Number(value) || 0;
        current.salarioBase = novoSalario;
        const { parcela1, inssIrrf, parcela2 } = calcularParcelasETributos13(novoSalario, current.avos, current.medias);
        current.parcela1 = parcela1;
        current.inssIrrf = inssIrrf;
        current.parcela2 = parcela2;
      } else if (field === 'medias') {
        const novasMedias = Number(value) || 0;
        current.medias = novasMedias;
        const { parcela1, inssIrrf, parcela2 } = calcularParcelasETributos13(current.salarioBase, current.avos, novasMedias);
        current.parcela1 = parcela1;
        current.inssIrrf = inssIrrf;
        current.parcela2 = parcela2;
      } else if (field === 'parcela1') {
        const novaParcela1 = Number(value) || 0;
        current.parcela1 = novaParcela1;
        const avosValidos = Math.max(0, Math.min(12, Number(current.avos) || 0));
        const totalDevido = ((Number(current.salarioBase) || 0) / 12) * avosValidos + (Number(current.medias) || 0);
        current.parcela2 = Math.max(0, Math.round((totalDevido - novaParcela1 - (Number(current.inssIrrf) || 0)) * 100) / 100);
      } else if (field === 'inssIrrf') {
        const novoInssIrrf = Number(value) || 0;
        current.inssIrrf = novoInssIrrf;
        const avosValidos = Math.max(0, Math.min(12, Number(current.avos) || 0));
        const totalDevido = ((Number(current.salarioBase) || 0) / 12) * avosValidos + (Number(current.medias) || 0);
        current.parcela2 = Math.max(0, Math.round((totalDevido - current.parcela1 - novoInssIrrf) * 100) / 100);
      } else if (field === 'parcela2') {
        current.parcela2 = Number(value) || 0;
      } else if (field === 'fgts') {
        if (value === null || value === undefined || String(value).trim() === '') {
          current.fgts = null;
        } else {
          const parsed = Number(value);
          current.fgts = isNaN(parsed) ? null : Math.round(parsed * 100) / 100;
        }
      }

      updated[index] = current;
      return updated;
    });
  };

  const handleAnoReferencia13Change = (novoAno: string) => {
    const cleanAno = novoAno.replace(/\D/g, '').slice(0, 4);
    setEmpresa13(prev => ({ ...prev, anoReferencia: cleanAno }));
    if (cleanAno.length === 4) {
      const anoNum = parseInt(cleanAno, 10);
      if (!isNaN(anoNum) && anoNum >= 2000) {
        setRows13(prev =>
          prev.map(row => {
            if (row.dataAdmissao && row.dataAdmissao.length === 10) {
              const novosAvos = calcularAvosPorAdmissao(row.dataAdmissao, anoNum);
              if (novosAvos !== null) {
                const { parcela1, inssIrrf, parcela2 } = calcularParcelasETributos13(row.salarioBase, novosAvos, row.medias);
                return { ...row, avos: novosAvos, parcela1, inssIrrf, parcela2 };
              }
            }
            return row;
          })
        );
      }
    }
  };

  const adicionarLinha13 = () => {
    setRows13(prev => [
      ...prev,
      {
        id: `row-${Date.now()}-${prev.length + 1}`,
        codigo: String(prev.length + 1).padStart(2, '0'),
        nome: '',
        dataAdmissao: '',
        avos: 12,
        salarioBase: 0,
        medias: 0,
        parcela1: 0,
        inssIrrf: 0,
        parcela2: 0,
        fgts: null
      }
    ]);
  };

  const removerLinha13 = (id: string) => {
    setRows13(prev => (prev.length > 1 ? prev.filter(r => r.id !== id) : prev));
  };

  const totais13 = rows13.reduce(
    (acc, r) => {
      acc.salarioBase += Number(r.salarioBase) || 0;
      acc.medias += Number(r.medias) || 0;
      acc.parcela1 += Number(r.parcela1) || 0;
      acc.inssIrrf += Number(r.inssIrrf) || 0;
      acc.parcela2 += Number(r.parcela2) || 0;
      if (r.fgts !== null && r.fgts !== undefined) {
        acc.fgts += Number(r.fgts) || 0;
        acc.hasFgts = true;
      }
      return acc;
    },
    { salarioBase: 0, medias: 0, parcela1: 0, inssIrrf: 0, parcela2: 0, fgts: 0, hasFgts: false }
  );

  const imprimirRelatorio13Pdf = () => {
    const printElement = document.getElementById('print-area-relatorio-13');
    if (!printElement) return;
    const empNome = empresa13.nome?.trim() || 'EMPRESA';
    const docTitle = `RELATORIO 13 SALARIO - ${empNome} - ${empresa13.anoReferencia || new Date().getFullYear()}`.toUpperCase();

    const printWindow = window.open('about:blank', '_blank');
    if (!printWindow) {
      showToast('Permita pop-ups no navegador para exportar o PDF.', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 0;
            }
            * {
              box-sizing: border-box;
            }
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: Arial, Helvetica, sans-serif !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            .timbrado-page {
              width: 210mm !important;
              min-height: 297mm !important;
              height: 297mm !important;
              position: relative !important;
              overflow: hidden !important;
              background-color: #ffffff !important;
              page-break-after: always !important;
              break-after: page !important;
              margin: 0 auto !important;
            }
            .timbrado-page:last-child {
              page-break-after: auto !important;
              break-after: auto !important;
            }
          </style>
        </head>
        <body>
          ${printElement.innerHTML}
          <script>
            window.onload = function() {
              setTimeout(function() {
                window.print();
              }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

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
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
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


  const processReciboPdfExtraction = async (base64: string) => {
    setIsExtractingRecibo(true);
    try {
      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
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

      const data = resData.data;
      if (data) {
        if (data.empresa) {
          setDadosEmpresa(prev => ({
            ...prev,
            nome: data.empresa.nome || prev.nome,
            cnpj: data.empresa.cnpj || prev.cnpj,
            endereco: data.empresa.endereco || prev.endereco
          }));
        }
        if (data.funcionario) {
          setDadosFuncionario(prev => ({
            ...prev,
            codigo: data.funcionario.codigo || prev.codigo,
            nome: data.funcionario.nome || prev.nome,
            funcao: data.funcionario.funcao || prev.funcao,
            cbo: data.funcionario.cbo || prev.cbo
          }));
        }
        if (data.rubricas && Array.isArray(data.rubricas) && data.rubricas.length > 0) {
          setRubricas(data.rubricas.map((r: any) => ({
            codigo: Number(r.codigo) || 0,
            descricao: String(r.descricao || '').toUpperCase(),
            referencia: String(r.referencia || ''),
            valor: Number(r.valor) || 0,
            tipo: (r.tipo === 'desconto' ? 'desconto' : 'provento') as 'provento'|'desconto'
          })));
        }
        if (data.mesAno) {
           setDadosEmpresa(prev => ({ ...prev, mesAno: applyMesAnoMask(data.mesAno) }));
        }

        showToast('Dados do recibo importados!', 'success');
        setReciboStatus({ message: `SUCESSO (${resData.attempts || 1} TENTATIVA(S))`, type: 'success' });
        setStep(2);
      }
    } catch (e: any) {
      console.error('Erro na extração:', e);
      showToast(e.message || 'Erro de Código/Rede. Tente anexar novamente.', 'error');
      setReciboStatus({ message: 'ERRO INTERNO', type: 'error' });
      setErrorLog(prev => prev ? prev : `Erro de Código/Rede (RECIBO):
Tipo de Erro: ${e?.name || 'Unknown'}
Mensagem: ${e?.message || String(e)}

Stack Trace:
${e?.stack || 'N/A'}`);
    } finally {
      setIsExtractingRecibo(false);
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
          'Authorization': `Bearer ${await auth.currentUser?.getIdToken()}`
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
            mesAno: d.mesAno ? applyMesAnoMask(d.mesAno) : prev.mesAno
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

  const getResultados = (rubs: Rubrica[]): ResultadoCalculo => {
    const baseINSS = rubs.filter(r => r.tipo === 'provento').reduce((a, c) => a + c.valor, 0);
    
    // SE calcularTributos FOR FALSE, ZERA TUDO
    const valorINSS = (!dadosEmpresa.calcularTributos || !dadosEmpresa.calcularINSS) ? 0 : 
      (dadosEmpresa.tipoRecibo === 'salario' ? calcularINSS_CLT(baseINSS) : calcularINSS_ProLabore(baseINSS));
    
    const resIRRF = (!dadosEmpresa.calcularTributos || !dadosEmpresa.calcularIRRF) 
      ? { valor: 0, faixa: '', baseCalculo: 0 } 
      : calcularIRRF(baseINSS, valorINSS, dadosFuncionario.numeroDependentes);
    const baseIRRF = resIRRF.baseCalculo;
    
    const descontosManuais = rubs.filter(r => r.tipo === 'desconto').reduce((a, c) => a + c.valor, 0);
    const totalDescontos = descontosManuais + valorINSS + resIRRF.valor;
    const liquidoReceber = Math.max(0, baseINSS - totalDescontos);
    
    return {
      totalVencimentos: baseINSS, 
      totalDescontos, 
      liquidoReceber,
      baseINSS: (dadosEmpresa.calcularTributos && dadosEmpresa.calcularINSS) ? baseINSS : 0, 
      valorINSS, 
      baseIRRF: (dadosEmpresa.calcularTributos && dadosEmpresa.calcularIRRF) ? baseIRRF : 0, 
      valorIRRF: resIRRF.valor, 
      faixaIRRF: resIRRF.faixa,
      salarioBase: dadosFuncionario.salarioBaseContratual || 0,
      baseFGTS: (dadosEmpresa.calcularTributos && dadosEmpresa.calcularFGTS && dadosEmpresa.tipoRecibo === 'salario') ? baseINSS : 0,
      valorFGTS: (dadosEmpresa.calcularTributos && dadosEmpresa.calcularFGTS && dadosEmpresa.tipoRecibo === 'salario') ? Math.round(baseINSS * 0.08 * 100) / 100 : 0
    };
  };

  const resultados = getResultados(rubricas);

  const todasRubricas = [
    ...rubricas,
    ...(dadosEmpresa.calcularTributos && dadosEmpresa.calcularINSS && resultados.valorINSS > 0 
        ? [{ codigo: 998, descricao: 'I.N.S.S.', referencia: dadosEmpresa.tipoRecibo === 'prolabore' ? '11%' : '8,01', valor: resultados.valorINSS, tipo: 'desconto' as const }] 
        : []),
    ...(dadosEmpresa.calcularTributos && dadosEmpresa.calcularIRRF && resultados.valorIRRF > 0 
        ? [{ codigo: 999, descricao: 'I.R.R.F.', referencia: resultados.faixaIRRF, valor: resultados.valorIRRF, tipo: 'desconto' as const }] 
        : [])
  ];

  const formatMoney = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  
  const applyMesAnoMask = (val: string) => {
    if (!val) return '';
    const clean = val.trim();
    // Se formato YYYY-MM (ex: 2026-09)
    if (/^\d{4}-\d{1,2}$/.test(clean)) {
      const [y, m] = clean.split('-');
      return `${m.padStart(2, '0')}/${y}`;
    }
    // Se o usuário digitou "X/" com 1 dígito no mês (ex: "5/"), transforma em "05/"
    if (clean.length === 2 && clean.endsWith('/') && /^\d$/.test(clean[0])) {
      return `0${clean[0]}/`;
    }
    // Se já contém barra e veio de payload ou cópia como M/AAAA
    if (clean.includes('/')) {
      const parts = clean.split('/');
      if (parts.length === 2 && parts[0].length === 1 && parts[1].length === 4) {
        return `0${parts[0]}/${parts[1]}`;
      }
    }
    const digits = clean.replace(/\D/g, '').slice(0, 6);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  };
  const applyDateMask = applyMesAnoMask;

  const getMesesLote = () => {
    if (!dadosEmpresa.geracaoEmLote || !dadosEmpresa.mesAnoFinal) return [dadosEmpresa.mesAno];
    
    const parseMesAnoInput = (val: string) => {
      if (!val) return null;
      if (val.includes('-') && val.split('-').length === 2 && val.split('-')[0].length === 4) return val; // YYYY-MM
      if (val.includes('/')) {
        const parts = val.split('/');
        if (parts.length === 2) {
          const [m, y] = parts;
          if (m && y) return `${y}-${m.padStart(2, '0')}`;
        } else if (parts.length === 3) {
          const [d, m, y] = parts;
          if (m && y) return `${y}-${m.padStart(2, '0')}`;
        }
      }
      return null;
    };

    const sVal = parseMesAnoInput(dadosEmpresa.mesAno);
    const eVal = parseMesAnoInput(dadosEmpresa.mesAnoFinal);

    if (!sVal || !eVal) return [dadosEmpresa.mesAno];

    const start = new Date(sVal + '-01T00:00:00');
    const end = new Date(eVal + '-01T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [dadosEmpresa.mesAno];
    const months = [];
    let cur = new Date(start);
    while (cur <= end) {
      months.push(`${String(cur.getMonth() + 1).padStart(2, '0')}/${cur.getFullYear()}`);
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
      const formatMesAno = (ma: string) => ma && ma.includes('-') ? `${ma.split('-')[1]}/${ma.split('-')[0]}` : ma;
      const mesRef = dadosEmpresa.geracaoEmLote ? 'LOTE' : formatMesAno(dadosEmpresa.mesAno);
      const nomeFormatado = dadosFuncionario.nome?.trim() || 'FUNCIONARIO';
      
      const fileName = dadosEmpresa.tipoRecibo === 'prolabore'
        ? `[PROLABORE] [${mesRef}] [${nomeFormatado}].xlsx`.toUpperCase()
        : `RECIBO EXTRACONTABIL - [${mesRef}] - [${nomeFormatado}].xlsx`.toUpperCase();
        
      a.download = fileName;
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

  // Paginação das linhas de 13º para caber perfeitamente no Papel Timbrado A4 (máximo 18 colaboradores por folha A4)
  const ITEMS_PER_PAGE_13 = 18;
  const paginas13: Funcionario13Row[][] = [];
  for (let i = 0; i < rows13.length; i += ITEMS_PER_PAGE_13) {
    paginas13.push(rows13.slice(i, i + ITEMS_PER_PAGE_13));
  }
  if (paginas13.length === 0) {
    paginas13.push([]);
  }
  const letterheadUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/timbrado.png?v=2`;
  const dataEmissaoFormatada = new Date().toLocaleDateString('pt-BR');

  return (
    <div className="flex flex-col h-full bg-slate-950 overflow-hidden uppercase font-sans relative">
      {toast && (
        <div className={`absolute top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg text-sm font-bold ${toast.type === 'success' ? 'bg-[#117C43] text-white' : 'bg-red-600 text-white'}`}>
          {toast.message}
        </div>
      )}
      <div className="px-6 py-3 border-b border-slate-700/50 bg-slate-800/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3 z-10 shrink-0">
        {/* Seletor de Modo: Recibo vs Relatório de 13º */}
        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-700/60 shrink-0">
          <button
            onClick={() => setModoAtivo('recibo')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              modoAtivo === 'recibo'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            RECIBO / HOLERITE
          </button>
          <button
            onClick={() => setModoAtivo('relatorio13')}
            className={`px-4 py-2 rounded-md text-xs font-bold transition-colors flex items-center gap-2 cursor-pointer ${
              modoAtivo === 'relatorio13'
                ? 'bg-indigo-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            RELATÓRIO DE 13º SALÁRIO
          </button>
        </div>

        {modoAtivo === 'recibo' && (
          <div className="flex items-center gap-4 text-xs md:text-sm overflow-x-auto whitespace-nowrap pb-1 md:pb-0 custom-scrollbar">
            {[1, 2, 3, 4].map(s => (
              <button
                key={s}
                onClick={() => setStep(s as 1 | 2 | 3 | 4)}
                className={`flex items-center cursor-pointer hover:opacity-100 transition-opacity ${step === s ? 'text-indigo-400' : step > s ? 'text-slate-200 opacity-70' : 'text-slate-400 opacity-60'}`}
                style={{ background: 'none', border: 'none', padding: 0 }}
              >
                <div className={`w-6 h-6 rounded-full flex items-center justify-center mr-2 border text-xs font-bold ${step === s ? 'border-indigo-500 bg-indigo-600 bg-opacity-20' : step > s ? 'border-indigo-500 bg-slate-200 bg-opacity-10' : 'border-[#A68759] border-opacity-40'}`}>{s}</div>
                {s === 1 ? 'EMPRESA' : s === 2 ? 'FUNCIONÁRIO & RUBRICAS' : s === 3 ? 'REVISÃO' : 'EXPORTAR'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        {modoAtivo === 'relatorio13' ? (
          <div className="max-w-7xl mx-auto space-y-5 pb-16">
            {/* Bloco 1: Empresa + Importação Rápida */}
            <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="text-base font-bold text-indigo-400 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                  RELATÓRIO DE 13º SALÁRIO
                </h2>
                <div className="flex items-center gap-2">
                  <label
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleRelatorio13Upload}
                    className="flex items-center px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-indigo-500/40 text-indigo-300 rounded-lg font-bold text-xs transition-colors cursor-pointer"
                  >
                    {isExtracting13 ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin text-indigo-400" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2 text-indigo-400" />
                    )}
                    {isExtracting13 ? 'EXTRAINDO...' : 'IMPORTAR PDF / PRINT (OU CTRL+V)'}
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      className="hidden"
                      onChange={handleRelatorio13Upload}
                      disabled={isExtracting13}
                    />
                  </label>
                  <button
                    onClick={imprimirRelatorio13Pdf}
                    className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-xs shadow transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 mr-2" />
                    EXPORTAR PDF
                  </button>
                </div>
              </div>

              {status13 && (
                <div className={`text-xs font-bold ${status13.type === 'success' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {status13.message}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                <div className="md:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">Cadastro de Empresas</label>
                  <select
                    value=""
                    onChange={e => {
                      const emp = empresasCadastradas.find(item => item.id === e.target.value);
                      if (emp) {
                        setEmpresa13(prev => ({
                          ...prev,
                          nome: emp.nome,
                          cnpj: emp.cnpj || prev.cnpj
                        }));
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">-- SELECIONAR EMPRESA --</option>
                    {empresasCadastradas.map(emp => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome} {emp.cnpj ? `(${emp.cnpj})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-4">
                  <label className="block text-[11px] text-slate-400 mb-1">Empresa</label>
                  <input
                    type="text"
                    placeholder="RAZÃO SOCIAL"
                    value={empresa13.nome}
                    onChange={e => setEmpresa13(prev => ({ ...prev, nome: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-xs text-slate-200 uppercase focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">CNPJ</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0000-00"
                    value={empresa13.cnpj}
                    onChange={e => setEmpresa13(prev => ({ ...prev, cnpj: e.target.value.toUpperCase() }))}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-xs text-slate-200 uppercase focus:border-indigo-500 focus:outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">Ano Base</label>
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="2026"
                    value={empresa13.anoReferencia}
                    onChange={e => handleAnoReferencia13Change(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2 text-xs text-slate-200 font-bold text-center focus:border-indigo-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Bloco 2: Planilha Editável */}
            <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200">
                  COLABORADORES ({rows13.length})
                </h3>
                <button
                  onClick={adicionarLinha13}
                  className="flex items-center px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  ADICIONAR LINHA
                </button>
              </div>

              <div className="overflow-x-auto border border-slate-700/60 rounded-xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 text-slate-300 text-xs border-b border-slate-700/60">
                      <th className="p-2.5 font-bold min-w-[210px]">NOME</th>
                      <th className="p-2.5 font-bold w-32 text-center">ADMISSÃO</th>
                      <th className="p-2.5 font-bold w-24 text-center">AVOS</th>
                      <th className="p-2.5 font-bold w-36 text-right">SALÁRIO</th>
                      <th className="p-2.5 font-bold w-32 text-right">MÉDIAS</th>
                      <th className="p-2.5 font-bold w-36 text-right text-emerald-400">1ª PARCELA</th>
                      <th className="p-2.5 font-bold w-36 text-right text-amber-400">INSS / IRRF</th>
                      <th className="p-2.5 font-bold w-36 text-right text-emerald-400">2ª PARCELA</th>
                      <th className="p-2.5 font-bold w-32 text-right text-sky-400">FGTS</th>
                      <th className="p-2.5 font-bold w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-950/60 text-xs">
                    {rows13.map((row, idx) => {
                      const fgtsDisplayValue =
                        row.fgts === null || row.fgts === undefined
                          ? ''
                          : row.fgts.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

                      return (
                        <tr key={row.id} className="hover:bg-slate-900/40 transition-colors">
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="NOME DO EMPREGADO"
                              value={row.nome}
                              onChange={e => handleUpdateRow13(idx, 'nome', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700/60 rounded px-2.5 py-2 text-slate-100 font-semibold uppercase focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              maxLength={10}
                              placeholder="DD/MM/AAAA"
                              value={row.dataAdmissao}
                              onChange={e => handleUpdateRow13(idx, 'dataAdmissao', e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700/60 rounded px-2 py-2 text-slate-100 text-center font-mono tabular-nums focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <div className="flex items-center justify-center bg-slate-900 border border-slate-700/60 rounded px-1.5 py-1.5">
                              <input
                                type="number"
                                min={0}
                                max={12}
                                value={row.avos}
                                onChange={e => handleUpdateRow13(idx, 'avos', e.target.value)}
                                className="w-9 bg-transparent text-slate-100 font-bold text-center font-mono tabular-nums focus:outline-none"
                              />
                              <span className="text-slate-400 font-mono text-xs">/12</span>
                            </div>
                          </td>
                          <td className="p-2">
                            <CurrencyInput
                              value={row.salarioBase}
                              onChangeValue={val => handleUpdateRow13(idx, 'salarioBase', val)}
                              className="w-full bg-slate-900 border border-slate-700/60 rounded px-2 py-2 text-slate-100 text-right font-mono tabular-nums font-semibold focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <CurrencyInput
                              value={row.medias}
                              onChangeValue={val => handleUpdateRow13(idx, 'medias', val)}
                              className="w-full bg-slate-900 border border-slate-700/60 rounded px-2 py-2 text-slate-100 text-right font-mono tabular-nums focus:border-indigo-500 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <CurrencyInput
                              value={row.parcela1}
                              onChangeValue={val => handleUpdateRow13(idx, 'parcela1', val)}
                              className="w-full bg-emerald-950/30 border border-emerald-600/40 rounded px-2 py-2 text-emerald-300 text-right font-mono tabular-nums font-bold focus:border-emerald-400 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <CurrencyInput
                              value={row.inssIrrf}
                              onChangeValue={val => handleUpdateRow13(idx, 'inssIrrf', val)}
                              className="w-full bg-amber-950/30 border border-amber-600/40 rounded px-2 py-2 text-amber-300 text-right font-mono tabular-nums font-semibold focus:border-amber-400 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <CurrencyInput
                              value={row.parcela2}
                              onChangeValue={val => handleUpdateRow13(idx, 'parcela2', val)}
                              className="w-full bg-emerald-950/30 border border-emerald-600/40 rounded px-2 py-2 text-emerald-300 text-right font-mono tabular-nums font-bold focus:border-emerald-400 focus:outline-none"
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="—"
                              value={fgtsDisplayValue}
                              onChange={e => {
                                const rawDigits = e.target.value.replace(/\D/g, '');
                                if (!rawDigits) {
                                  handleUpdateRow13(idx, 'fgts', null);
                                } else {
                                  const numVal = parseInt(rawDigits, 10) / 100;
                                  handleUpdateRow13(idx, 'fgts', numVal);
                                }
                              }}
                              className="w-full bg-sky-950/20 border border-sky-600/40 rounded px-2 py-2 text-sky-300 placeholder:text-slate-600 text-right font-mono tabular-nums font-semibold focus:border-sky-400 focus:outline-none"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <button
                              onClick={() => removerLinha13(row.id)}
                              disabled={rows13.length === 1}
                              className="p-1.5 text-slate-400 hover:text-red-400 disabled:opacity-30 cursor-pointer"
                              title="Remover linha"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-900 text-slate-100 font-bold text-xs border-t-2 border-slate-700">
                      <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-indigo-300">
                        TOTAL GERAL:
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-slate-200">
                        R$ {formatMoney(totais13.salarioBase)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-slate-200">
                        R$ {formatMoney(totais13.medias)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-emerald-400">
                        R$ {formatMoney(totais13.parcela1)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-amber-400">
                        R$ {formatMoney(totais13.inssIrrf)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-emerald-400">
                        R$ {formatMoney(totais13.parcela2)}
                      </td>
                      <td className="p-3 text-right font-mono tabular-nums text-sky-400">
                        {totais13.hasFgts ? `R$ ${formatMoney(totais13.fgts)}` : ''}
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Bloco 3: Prévia A4 */}
            <div className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold text-slate-200">
                  PRÉVIA DE IMPRESSÃO A4
                </h3>
                <button
                  onClick={imprimirRelatorio13Pdf}
                  className="flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4 mr-2" />
                  IMPRIMIR / SALVAR PDF
                </button>
              </div>

              <div className="overflow-x-auto bg-slate-900/80 p-4 md:p-8 rounded-xl flex flex-col items-center">
                <div id="print-area-relatorio-13" style={{ display: 'flex', flexDirection: 'column', gap: '24px', alignItems: 'center' }}>
                  {paginas13.map((paginaRows, pageIndex) => {
                    const isLastPage = pageIndex === paginas13.length - 1;
                    return (
                      <div
                        key={pageIndex}
                        className="timbrado-page"
                        style={{
                          width: '210mm',
                          minHeight: '297mm',
                          height: '297mm',
                          backgroundColor: '#ffffff',
                          position: 'relative',
                          overflow: 'hidden',
                          boxShadow: '0 10px 30px rgba(0,0,0,0.45)',
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          color: '#0f172a',
                          boxSizing: 'border-box',
                          pageBreakAfter: isLastPage ? 'auto' : 'always'
                        }}
                      >
                        <img
                          src={letterheadUrl}
                          alt="Papel Timbrado Simples Contábil"
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'fill',
                            zIndex: 0,
                            pointerEvents: 'none'
                          }}
                        />

                        <div
                          style={{
                            position: 'relative',
                            zIndex: 10,
                            padding: '64mm 12mm 36mm 12mm',
                            height: '100%',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            boxSizing: 'border-box'
                          }}
                        >
                          <div>
                            <div
                              style={{
                                border: '1.5px solid #1e293b',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                marginBottom: '10px',
                                backgroundColor: 'rgba(255, 255, 255, 0.96)'
                              }}
                            >
                              <div
                                style={{
                                  backgroundColor: '#0f172a',
                                  color: '#ffffff',
                                  padding: '8px 14px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  borderBottom: '2px solid #D1A751'
                                }}
                              >
                                <div style={{ fontSize: '11.5px', fontWeight: 'bold', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                                  RELATÓRIO DE APURAÇÃO DE 13º SALÁRIO
                                </div>
                                <div style={{ fontSize: '10px', fontWeight: 'bold', color: '#D1A751' }}>
                                  ANO BASE: {empresa13.anoReferencia || new Date().getFullYear()}
                                </div>
                              </div>

                              <div
                                style={{
                                  padding: '7px 14px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '9.5px',
                                  color: '#1e293b',
                                  gap: '12px'
                                }}
                              >
                                <div style={{ flex: 1 }}>
                                  <strong>EMPRESA:</strong> {empresa13.nome || 'NÃO INFORMADA'}
                                </div>
                                {empresa13.cnpj && (
                                  <div>
                                    <strong>CNPJ:</strong> {empresa13.cnpj}
                                  </div>
                                )}
                                <div>
                                  <strong>EMISSÃO:</strong> {dataEmissaoFormatada}
                                </div>
                              </div>
                            </div>

                            <table
                              style={{
                                width: '100%',
                                borderCollapse: 'collapse',
                                fontSize: '8.5px',
                                backgroundColor: 'rgba(255, 255, 255, 0.98)',
                                border: '1.5px solid #1e293b'
                              }}
                            >
                              <thead>
                                <tr
                                  style={{
                                    backgroundColor: '#1e293b',
                                    color: '#ffffff',
                                    textTransform: 'uppercase'
                                  }}
                                >
                                  <th style={{ padding: '5.5px 6px', textAlign: 'left', borderRight: '1px solid #475569', width: '24%' }}>
                                    NOME
                                  </th>
                                  <th style={{ padding: '5.5px 4px', textAlign: 'center', borderRight: '1px solid #475569', width: '10%' }}>
                                    ADMISSÃO
                                  </th>
                                  <th style={{ padding: '5.5px 3px', textAlign: 'center', borderRight: '1px solid #475569', width: '6%' }}>
                                    AVOS
                                  </th>
                                  <th style={{ padding: '5.5px 5px', textAlign: 'right', borderRight: '1px solid #475569', width: '11%' }}>
                                    SALÁRIO
                                  </th>
                                  <th style={{ padding: '5.5px 5px', textAlign: 'right', borderRight: '1px solid #475569', width: '9%' }}>
                                    MÉDIAS
                                  </th>
                                  <th style={{ padding: '5.5px 5px', textAlign: 'right', borderRight: '1px solid #475569', width: '10%' }}>
                                    1ª PARCELA
                                  </th>
                                  <th style={{ padding: '5.5px 5px', textAlign: 'right', borderRight: '1px solid #475569', width: '10%' }}>
                                    INSS/IRRF*
                                  </th>
                                  <th style={{ padding: '5.5px 5px', textAlign: 'right', borderRight: '1px solid #475569', width: '10%' }}>
                                    2ª PARCELA
                                  </th>
                                  <th style={{ padding: '5.5px 5px', textAlign: 'right', width: '10%' }}>
                                    FGTS
                                  </th>
                                </tr>
                              </thead>
                              <tbody>
                                {paginaRows.map((r, rIdx) => (
                                  <tr
                                    key={r.id}
                                    style={{
                                      backgroundColor: rIdx % 2 === 0 ? '#ffffff' : '#f8fafc',
                                      borderBottom: '1px solid #cbd5e1'
                                    }}
                                  >
                                    <td
                                      style={{
                                        padding: '5px 6px',
                                        fontWeight: 'bold',
                                        color: '#0f172a',
                                        borderRight: '1px solid #cbd5e1',
                                        textTransform: 'uppercase'
                                      }}
                                    >
                                      {r.nome || '-'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 4px',
                                        textAlign: 'center',
                                        color: '#1e293b',
                                        borderRight: '1px solid #cbd5e1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      {r.dataAdmissao || '-'}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 3px',
                                        textAlign: 'center',
                                        fontWeight: 'bold',
                                        color: '#1e293b',
                                        borderRight: '1px solid #cbd5e1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      {String(r.avos).padStart(2, '0')}/12
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 5px',
                                        textAlign: 'right',
                                        color: '#0f172a',
                                        borderRight: '1px solid #cbd5e1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(r.salarioBase)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 5px',
                                        textAlign: 'right',
                                        color: '#334155',
                                        borderRight: '1px solid #cbd5e1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(r.medias)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 5px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#065f46',
                                        borderRight: '1px solid #cbd5e1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(r.parcela1)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 5px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#b45309',
                                        borderRight: '1px solid #cbd5e1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(r.inssIrrf)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 5px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#065f46',
                                        borderRight: '1px solid #cbd5e1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(r.parcela2)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '5px 5px',
                                        textAlign: 'right',
                                        fontWeight: 'bold',
                                        color: '#0369a1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      {r.fgts !== null && r.fgts !== undefined ? `R$ ${formatMoney(r.fgts)}` : ''}
                                    </td>
                                  </tr>
                                ))}

                                {isLastPage && (
                                  <tr
                                    style={{
                                      backgroundColor: '#f1f5f9',
                                      borderTop: '2px solid #0f172a',
                                      fontWeight: 'bold'
                                    }}
                                  >
                                    <td
                                      colSpan={3}
                                      style={{
                                        padding: '6.5px 6px',
                                        textAlign: 'right',
                                        color: '#0f172a',
                                        borderRight: '1px solid #94a3b8',
                                        textTransform: 'uppercase',
                                        fontSize: '8.5px'
                                      }}
                                    >
                                      TOTAL GERAL:
                                    </td>
                                    <td
                                      style={{
                                        padding: '6.5px 5px',
                                        textAlign: 'right',
                                        color: '#0f172a',
                                        borderRight: '1px solid #94a3b8',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(totais13.salarioBase)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '6.5px 5px',
                                        textAlign: 'right',
                                        color: '#0f172a',
                                        borderRight: '1px solid #94a3b8',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(totais13.medias)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '6.5px 5px',
                                        textAlign: 'right',
                                        color: '#065f46',
                                        borderRight: '1px solid #94a3b8',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(totais13.parcela1)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '6.5px 5px',
                                        textAlign: 'right',
                                        color: '#b45309',
                                        borderRight: '1px solid #94a3b8',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(totais13.inssIrrf)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '6.5px 5px',
                                        textAlign: 'right',
                                        color: '#065f46',
                                        borderRight: '1px solid #94a3b8',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      R$ {formatMoney(totais13.parcela2)}
                                    </td>
                                    <td
                                      style={{
                                        padding: '6.5px 5px',
                                        textAlign: 'right',
                                        color: '#0369a1',
                                        fontFamily: 'monospace'
                                      }}
                                    >
                                      {totais13.hasFgts ? `R$ ${formatMoney(totais13.fgts)}` : ''}
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>

                            {isLastPage && (
                              <div
                                style={{
                                  marginTop: '8px',
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  gap: '12px'
                                }}
                              >
                                <div
                                  style={{
                                    fontSize: '8px',
                                    color: '#475569'
                                  }}
                                >
                                  * <strong>INSS/IRRF:</strong> VALOR APROXIMADO DE TRIBUTOS CONFORME TABELA VIGENTE (DEDUZIDO NA 2ª PARCELA).
                                </div>

                                <div
                                  style={{
                                    border: '1.5px solid #0f172a',
                                    borderRadius: '6px',
                                    padding: '5px 12px',
                                    backgroundColor: '#f8fafc',
                                    fontSize: '9.5px',
                                    fontWeight: 'bold',
                                    color: '#0f172a',
                                    whiteSpace: 'nowrap'
                                  }}
                                >
                                  TOTAL LÍQUIDO (1ª + 2ª PARCELA):{' '}
                                  <span style={{ color: '#065f46', fontFamily: 'monospace', fontSize: '10.5px' }}>
                                    R$ {formatMoney(totais13.parcela1 + totais13.parcela2)}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              fontSize: '8.5px',
                              color: '#64748b',
                              borderTop: '1px solid #e2e8f0',
                              paddingTop: '6px'
                            }}
                          >
                            <span>SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL • DEPARTAMENTO PESSOAL</span>
                            <span>
                              PÁGINA {pageIndex + 1} DE {paginas13.length}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        ) : (
        <div className="max-w-4xl mx-auto space-y-6">
          {step === 1 && (
            <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl space-y-6">
              <h2 className="text-xl font-bold text-indigo-400">Dados da Empresa</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="p-4 border border-slate-700/50 border-dashed rounded-lg bg-slate-950 bg-opacity-30">
                  <label 
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleCnpjUpload}
                    className="flex flex-col items-center text-center space-y-3 cursor-pointer"
                  >
                    <div className="p-2 bg-indigo-600 rounded-lg">
                      {isExtracting ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /> : <Upload className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium text-sm">Extrair do Cartão CNPJ (PDF)</div>
                      <div className="text-xs text-slate-400">Preenchimento automático inteligente</div>
                    </div>
                    <input type="file" accept=".pdf" className="hidden" onChange={handleCnpjUpload} disabled={isExtracting} />
                  </label>
                  {cnpjStatus && (
                    <div className={`mt-3 text-center text-xs font-bold ${cnpjStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {cnpjStatus.message}
                    </div>
                  )}
                </div>

                <div className="p-4 border border-slate-700/50 border-dashed rounded-lg bg-slate-950 bg-opacity-30">
                  <label 
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handleReciboUpload}
                    className="flex flex-col items-center text-center space-y-3 cursor-pointer"
                  >
                    <div className="p-2 bg-indigo-600 rounded-lg">
                      {isExtractingRecibo ? <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /> : <FileText className="w-5 h-5 text-indigo-400" />}
                    </div>
                    <div>
                      <div className="text-slate-200 font-medium text-sm">Importar de um Recibo Existente (PDF)</div>
                      <div className="text-xs text-slate-400">Extrai empresa, funcionário e rubricas automaticamente</div>
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
                  <label className="block text-sm text-slate-200 mb-1">Nome da Empresa</label>
                  <input id="recibo_empresa_nome" name="recibo_empresa_nome" type="text" value={dadosEmpresa.nome} onChange={e => setDadosEmpresa({...dadosEmpresa, nome: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                </div>
                <div>
                  <label className="block text-sm text-slate-200 mb-1">CNPJ</label>
                  <input id="recibo_empresa_cnpj" name="recibo_empresa_cnpj" type="text" value={dadosEmpresa.cnpj} onChange={e => setDadosEmpresa({...dadosEmpresa, cnpj: e.target.value.toUpperCase()})} placeholder="XX.XXX.XXX/XXXX-XX" className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                </div>
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm text-slate-200 mb-1">Endereço</label>
                  <input id="recibo_empresa_endereco" name="recibo_empresa_endereco" type="text" value={dadosEmpresa.endereco} onChange={e => setDadosEmpresa({...dadosEmpresa, endereco: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                </div>
                
                <div className="col-span-1 md:col-span-2 flex items-center mt-2">
                  <input type="checkbox" id="geracaoEmLote" checked={dadosEmpresa.geracaoEmLote} onChange={e => setDadosEmpresa({...dadosEmpresa, geracaoEmLote: e.target.checked})} className="mr-2 w-4 h-4 accent-indigo-500" />
                  <label htmlFor="geracaoEmLote" className="text-sm font-bold text-slate-200">GERAÇÃO EM LOTE (VÁRIOS MESES)</label>
                </div>

                <div>
                  <label className="block text-sm text-slate-200 mb-1">{dadosEmpresa.geracaoEmLote ? 'Mês/Ano Inicial' : 'Mês/Ano de Referência'}</label>
                  <input 
                    id="recibo_empresa_mesAno" 
                    name="recibo_empresa_mesAno" 
                    type="text" 
                    maxLength={7}
                    placeholder="mm/aaaa" 
                    value={dadosEmpresa.mesAno} 
                    onChange={e => setDadosEmpresa({...dadosEmpresa, mesAno: applyMesAnoMask(e.target.value)})} 
                    className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-slate-200 focus:border-indigo-500 focus:outline-none" 
                  />
                </div>

                {dadosEmpresa.geracaoEmLote && (
                  <div>
                    <label className="block text-sm text-slate-200 mb-1">Mês/Ano Final</label>
                    <input 
                      id="recibo_empresa_mesAnoFinal" 
                      name="recibo_empresa_mesAnoFinal" 
                      type="text" 
                      maxLength={7}
                      placeholder="mm/aaaa" 
                      value={dadosEmpresa.mesAnoFinal || ''} 
                      onChange={e => setDadosEmpresa({...dadosEmpresa, mesAnoFinal: applyMesAnoMask(e.target.value)})} 
                      className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-3 text-slate-200 focus:border-indigo-500 focus:outline-none" 
                    />
                  </div>
                )}

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm text-slate-200 mb-1">Tipo de Recibo</label>
                  <div className="flex space-x-2">
                    <button onClick={() => setDadosEmpresa({...dadosEmpresa, tipoRecibo: 'salario'})} className={`flex-1 py-3 rounded-lg border font-medium ${dadosEmpresa.tipoRecibo === 'salario' ? 'bg-indigo-600 border-indigo-500 text-slate-200' : 'bg-slate-950 border-slate-700/50 text-slate-400'}`}>SALÁRIO</button>
                    <button onClick={() => setDadosEmpresa({...dadosEmpresa, tipoRecibo: 'prolabore'})} className={`flex-1 py-3 rounded-lg border font-medium ${dadosEmpresa.tipoRecibo === 'prolabore' ? 'bg-indigo-600 border-indigo-500 text-slate-200' : 'bg-slate-950 border-slate-700/50 text-slate-400'}`}>PRÓ-LABORE</button>
                  </div>
                </div>

                <div className="col-span-1 md:col-span-2 mt-4 p-4 border border-slate-700/50 rounded-lg bg-slate-950 bg-opacity-30 transition-all">
                  <div className="flex items-center">
                    <input 
                      type="checkbox" 
                      id="calcularTributos" 
                      checked={dadosEmpresa.calcularTributos} 
                      onChange={e => {
                        const checked = e.target.checked;
                        setDadosEmpresa({
                          ...dadosEmpresa, 
                          calcularTributos: checked,
                          calcularINSS: checked ? true : dadosEmpresa.calcularINSS,
                          calcularIRRF: checked ? true : dadosEmpresa.calcularIRRF,
                          calcularFGTS: checked ? true : dadosEmpresa.calcularFGTS
                        });
                      }} 
                      className="mr-3 w-5 h-5 accent-indigo-500" 
                    />
                    <label htmlFor="calcularTributos" className="text-sm font-bold text-slate-200 cursor-pointer">
                      CALCULAR E EXIBIR TRIBUTOS AUTOMATICAMENTE
                    </label>
                  </div>
                  
                  {dadosEmpresa.calcularTributos && (
                    <div className="pl-8 mt-4 pt-4 border-t border-slate-700/50 space-y-4">
                      <div className="flex flex-wrap gap-6">
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="calcularINSS" 
                            checked={dadosEmpresa.calcularINSS} 
                            onChange={e => setDadosEmpresa({...dadosEmpresa, calcularINSS: e.target.checked})} 
                            className="mr-2 w-4 h-4 accent-indigo-500" 
                          />
                          <label htmlFor="calcularINSS" className="text-sm text-slate-200 cursor-pointer font-bold">INSS</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="calcularIRRF" 
                            checked={dadosEmpresa.calcularIRRF} 
                            onChange={e => setDadosEmpresa({...dadosEmpresa, calcularIRRF: e.target.checked})} 
                            className="mr-2 w-4 h-4 accent-indigo-500" 
                          />
                          <label htmlFor="calcularIRRF" className="text-sm text-slate-200 cursor-pointer font-bold">IRRF</label>
                        </div>
                        <div className="flex items-center">
                          <input 
                            type="checkbox" 
                            id="calcularFGTS" 
                            checked={dadosEmpresa.calcularFGTS} 
                            onChange={e => setDadosEmpresa({...dadosEmpresa, calcularFGTS: e.target.checked})} 
                            className="mr-2 w-4 h-4 accent-indigo-500" 
                          />
                          <label htmlFor="calcularFGTS" className="text-sm text-slate-200 cursor-pointer font-bold">FGTS</label>
                        </div>
                      </div>

                      <div className="text-xs text-slate-400 bg-slate-800/50 p-4 rounded-lg border border-slate-700/50">
                        <p className="font-bold text-indigo-400 mb-3">Prévia das Tabelas de Desconto Utilizadas:</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div>
                            <span className="font-bold text-slate-200">INSS CLT:</span> 
                            <ul className="list-disc pl-4 mt-1.5 space-y-1">
                              <li>Até R$ 1.621,00: 7,5%</li>
                              <li>De R$ 1.621,01 a R$ 2.902,84: 9%</li>
                              <li>De R$ 2.902,85 a R$ 4.354,27: 12%</li>
                              <li>De R$ 4.354,28 a R$ 8.475,55: 14%</li>
                            </ul>
                            <span className="font-bold text-slate-200 block mt-3">INSS Pró-labore:</span> 11% sobre o valor
                          </div>
                          <div>
                            <span className="font-bold text-slate-200">IRRF:</span>
                            <ul className="list-disc pl-4 mt-1.5 space-y-1">
                              <li>Até R$ 2.428,80: Isento</li>
                              <li>De R$ 2.428,81 a R$ 2.826,65: 7,5%</li>
                              <li>De R$ 2.826,66 a R$ 3.751,05: 15%</li>
                              <li>De R$ 3.751,06 a R$ 4.664,68: 22,5%</li>
                              <li>Acima de R$ 4.664,68: 27,5%</li>
                              <li className="text-xs mt-2 text-indigo-400">* Isenção total para base até R$ 5.000,00</li>
                            </ul>
                            <span className="font-bold text-slate-200 block mt-3">FGTS:</span> 8% do Salário Bruto
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end pt-4">
                <button onClick={() => setStep(2)} className="w-full md:w-auto flex justify-center items-center px-6 py-3 bg-indigo-600 text-indigo-400 rounded-lg font-medium hover:bg-[#5A1C30] transition-colors">
                  PRÓXIMA ETAPA <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="flex-1 space-y-6 w-full">
                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl space-y-4">
                  <h2 className="text-xl font-bold text-indigo-400">Dados do Funcionário</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm text-slate-200 mb-1">Código</label>
                        <input id="recibo_func_codigo" name="recibo_func_codigo" type="text" value={dadosFuncionario.codigo} onChange={e => setDadosFuncionario({...dadosFuncionario, codigo: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2.5 text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm text-slate-200 mb-1">Nome</label>
                        <input id="recibo_func_nome" name="recibo_func_nome" type="text" value={dadosFuncionario.nome} onChange={e => setDadosFuncionario({...dadosFuncionario, nome: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2.5 text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm text-slate-200 mb-1">Função</label>
                        <input id="recibo_func_funcao" name="recibo_func_funcao" type="text" value={dadosFuncionario.funcao} onChange={e => setDadosFuncionario({...dadosFuncionario, funcao: e.target.value.toUpperCase()})} className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2.5 text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm text-slate-200 mb-1">Salário Integral</label>
                        <CurrencyInput value={dadosFuncionario.salarioBaseContratual || 0} onChangeValue={val => setDadosFuncionario({...dadosFuncionario, salarioBaseContratual: val})} className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2.5 text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-sm text-slate-200 mb-1">Dias Trabalhados</label>
                        <input type="number" placeholder="Ex: 30" value={dadosFuncionario.diasTrabalhados || ''} onChange={e => setDadosFuncionario({...dadosFuncionario, diasTrabalhados: parseInt(e.target.value) || undefined})} className="w-full bg-slate-950 border border-slate-700/50 rounded-lg p-2.5 text-slate-200 focus:border-indigo-500 focus:outline-none" />
                      </div>
                    </div>
                </div>

                {/* Calculadora de Horas Extras e DSR (CLT Art. 59, CF/88 e Súmula 172/TST) */}
                <CalculadoraHorasExtrasRecibo
                  salarioBaseContratual={dadosFuncionario.salarioBaseContratual}
                  rubricasAtuais={rubricas}
                  mesAnoReferencia={dadosEmpresa.mesAno}
                  onAdicionarRubricas={novasRubricas => setRubricas(novasRubricas)}
                  showToast={showToast}
                />

                <div className="bg-slate-800/50 border border-slate-700/50 p-6 rounded-xl space-y-4">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-bold text-indigo-400">Rubricas Base</h2>
                    <button onClick={() => setRubricas(prev => [...prev, { codigo: prev.length > 0 ? Math.max(2000, ...prev.map(r => Number(r.codigo) || 0)) + 1 : 2001, descricao: '', referencia: '', valor: 0, tipo: 'provento' }])} className="flex items-center text-sm px-3 py-1.5 bg-indigo-600 text-indigo-400 rounded hover:bg-[#5A1C30]">
                      <Plus className="w-4 h-4 mr-1" /> ADICIONAR
                    </button>
                  </div>
                  {dadosEmpresa.geracaoEmLote && (
                    <div className="text-sm text-slate-200 mb-4 bg-slate-950 p-3 rounded-lg border border-slate-700/50">
                      Nota: Em geração em lote, estas rubricas baseadas serão replicadas para todos os meses ({mesesToRender.length} meses). Valores podem ser ajustados individualmente após exportar.
                    </div>
                  )}
                  <div className="space-y-3">
                    {rubricas.map((rubrica, index) => (
                      <div key={index} className="flex flex-col md:flex-row gap-4 md:gap-2 items-start md:items-center bg-slate-950 p-3 rounded-lg border border-slate-700/50">
                        <div className="w-full md:w-16">
                          <label className="block text-xs text-slate-400 mb-1">Cód</label>
                          <input type="number" value={rubrica.codigo} onChange={e => {
                            const newR = [...rubricas]; newR[index].codigo = parseInt(e.target.value) || 0; setRubricas(newR);
                          }} className="w-full bg-slate-800/50 border border-slate-700/50 rounded p-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div className="w-full md:flex-1">
                          <label className="block text-xs text-slate-400 mb-1">Descrição</label>
                          <input type="text" value={rubrica.descricao} onChange={e => {
                            const newR = [...rubricas]; newR[index].descricao = e.target.value.toUpperCase(); setRubricas(newR);
                          }} className="w-full bg-slate-800/50 border border-slate-700/50 rounded p-1.5 text-sm text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div className="w-full md:w-24">
                          <label className="block text-xs text-slate-400 mb-1">Ref.</label>
                          <input type="text" value={rubrica.referencia} onChange={e => {
                            const newR = [...rubricas]; newR[index].referencia = e.target.value.toUpperCase(); setRubricas(newR);
                          }} className="w-full bg-slate-800/50 border border-slate-700/50 rounded p-1.5 text-sm text-slate-200 uppercase focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div className="w-full md:w-32">
                          <label className="block text-xs text-slate-400 mb-1">Valor (R$)</label>
                          <CurrencyInput value={rubrica.valor} onChangeValue={val => {
                            const newR = [...rubricas]; newR[index].valor = val; setRubricas(newR);
                          }} className="w-full bg-slate-800/50 border border-slate-700/50 rounded p-1.5 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none" />
                        </div>
                        <div className="w-full md:w-28">
                          <label className="block text-xs text-slate-400 mb-1">Tipo</label>
                          <select value={rubrica.tipo} onChange={e => {
                            const newR = [...rubricas]; newR[index].tipo = e.target.value as any; setRubricas(newR);
                          }} className="w-full bg-slate-800/50 border border-slate-700/50 rounded p-1.5 text-sm text-slate-200 appearance-none">
                            <option value="provento">PROVENTO</option>
                            <option value="desconto">DESCONTO</option>
                          </select>
                        </div>
                        <div className="pt-0 md:pt-5 w-full flex justify-end md:w-auto">
                          <button onClick={() => { if (rubricas.length > 1) setRubricas(rubricas.filter((_, i) => i !== index)); }} disabled={rubricas.length === 1} className="p-1.5 text-slate-400 hover:text-red-400 disabled:opacity-30">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col-reverse md:flex-row justify-between gap-4">
                  <button onClick={() => setStep(1)} className="w-full md:w-auto flex justify-center items-center px-4 py-3 bg-slate-950 text-slate-400 border border-slate-700/50 rounded-lg hover:bg-indigo-600 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-2" /> VOLTAR
                  </button>
                  <button onClick={() => setStep(3)} className="w-full md:w-auto flex justify-center items-center px-6 py-3 bg-indigo-600 text-indigo-400 rounded-lg font-medium hover:bg-[#5A1C30] transition-colors">
                    PRÓXIMA ETAPA <ArrowRight className="w-4 h-4 ml-2" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {(step === 3 || step === 4) && (
            <div className={step === 4 ? "hidden" : "space-y-6 pb-20"}>
              <div className="flex flex-col md:flex-row justify-between items-center bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl gap-4">
                <button onClick={() => setStep(2)} className="w-full md:w-auto flex justify-center items-center px-4 py-2 bg-slate-950 text-slate-400 border border-slate-700/50 rounded-lg hover:bg-indigo-600 transition-colors">
                  <ArrowLeft className="w-4 h-4 mr-2" /> EDITAR
                </button>
                <div className="flex flex-col items-center">
                  <div className="text-indigo-400 font-bold">PRÉVIA DO RECIBO</div>
                  <button onClick={() => {
                    const jsonEl = document.getElementById('json-viewer');
                    if (jsonEl) {
                      jsonEl.style.display = jsonEl.style.display === 'none' ? 'block' : 'none';
                    }
                  }} className="text-slate-400 text-xs underline mt-1 hover:text-slate-200">
                    Ver JSON (Jason)
                  </button>
                </div>
                <button onClick={() => setStep(4)} className="w-full md:w-auto flex justify-center items-center px-4 py-2 bg-indigo-600 text-indigo-400 rounded-lg font-medium hover:bg-[#5A1C30] transition-colors">
                  GERAR / EXPORTAR <ArrowRight className="w-4 h-4 ml-2" />
                </button>
              </div>
              
              <div id="json-viewer" className="hidden">
                <pre className="bg-slate-950 border border-slate-700/50 text-slate-200 p-4 rounded-xl overflow-x-auto text-xs">
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
                <h2 className="text-2xl font-bold text-indigo-400">Exportar Recibo</h2>
                <button onClick={() => setStep(1)} className="text-slate-400 hover:text-slate-200 text-sm underline">Criar Novo Recibo</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                
                <div className="bg-slate-800/50 border-2 border-slate-700/50 rounded-xl p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mb-4">
                    <Activity className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-200 mb-2">Exportar para Excel (.xlsx)</h3>
                  <p className="text-slate-400 text-sm mb-8 flex-1">
                    Gera um arquivo Excel com as fórmulas preenchidas e formatação idêntica ao modelo, pronto para download seguro.
                  </p>
                  
                  <button 
                    onClick={gerarPlanilha} 
                    disabled={isGeneratingSheet}
                    className="w-full flex items-center justify-center px-6 py-4 bg-indigo-600 text-indigo-400 rounded-lg font-bold hover:bg-[#5A1C30] transition-colors disabled:opacity-50"
                  >
                    {isGeneratingSheet ? (
                      <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> GERANDO EXCEL...</>
                    ) : (
                      <><Download className="w-5 h-5 mr-2" /> BAIXAR EXCEL</>
                    )}
                  </button>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-8 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-slate-950 rounded-full flex items-center justify-center mb-4">
                    <Printer className="w-8 h-8 text-indigo-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-200 mb-2">Impressão Direta</h3>
                  <p className="text-slate-400 text-sm mb-8 flex-1">Gera a prévia para impressão ou PDF.</p>
                  <button onClick={() => {
                    const formatMesAno = (ma: string) => ma && ma.includes('-') ? `${ma.split('-')[1]}/${ma.split('-')[0]}` : ma;
                    const mesRef = dadosEmpresa.geracaoEmLote ? 'LOTE' : formatMesAno(dadosEmpresa.mesAno);
                    const nomeFormatado = dadosFuncionario.nome?.trim() || 'FUNCIONARIO';
                    const docTitle = (dadosEmpresa.geracaoEmLote
                      ? `RECIBOS EXTRACONTABEIS - LOTE`
                      : dadosEmpresa.tipoRecibo === 'prolabore'
                        ? `PROLABORE ${mesRef} ${nomeFormatado}`
                        : `RECIBO EXTRA CONTABIL ${mesRef} ${nomeFormatado}`).toUpperCase();
                      
                    const printWindow = window.open('about:blank', '_blank');
                    if (!printWindow) return alert('Permita pop-ups.');
                    printWindow.document.write(`
                      <!DOCTYPE html><html><head><title>${docTitle}</title>
                      <style>@media print { @page { size: A4 portrait; margin: 5mm; } body { margin: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; font-family: Arial, Helvetica, sans-serif; } }</style>
                      </head><body><div style="display:flex; flex-direction:column; gap:16px;">
                      ${document.getElementById('print-area')?.innerHTML}
                      </div></body></html>
                    `);
                    printWindow.document.close();
                  }} className="w-full flex items-center justify-center px-6 py-4 bg-slate-950 border border-slate-700/50 text-slate-200 rounded-lg font-bold hover:bg-indigo-600">
                    <Printer className="w-5 h-5 mr-2" /> IMPRIMIR / SALVAR PDF
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
      <ErrorLogViewer errorLog={errorLog} onClose={() => setErrorLog(null)} />
    </div>
  );
}

