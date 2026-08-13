import React, { useState, useMemo, useEffect } from 'react';
import { Upload, Loader2, ArrowRight, ArrowLeft, Download, Printer, Plus, Trash2, CheckCircle2, AlertTriangle, FileText, CheckSquare, Square } from 'lucide-react';
import LayoutTRCT, { TrctData } from './LayoutTRCT';
import * as ExcelJS from 'exceljs';
import { CurrencyInput } from './CurrencyInput';
import { getTrimmedPdfBase64 } from './pdfUtils';
import { ErrorLogViewer } from './ErrorLogViewer';

const PRESET_PROVENTOS = [
  { codigo: '50', descricao: 'Saldo de Salário' },
  { codigo: '51', descricao: 'Comissões' },
  { codigo: '52', descricao: 'Gratificação' },
  { codigo: '53', descricao: 'Adic. de Insalubridade' },
  { codigo: '54', descricao: 'Adic. de Periculosidade' },
  { codigo: '55', descricao: 'Adic. Noturno' },
  { codigo: '56.1', descricao: 'Horas Extras' },
  { codigo: '58', descricao: 'DSR' },
  { codigo: '60', descricao: 'Multa Art. 477 § 8º CLT' },
  { codigo: '61', descricao: 'Multa Art. 479 CLT' },
  { codigo: '63', descricao: '13º Salário Proporcional' },
  { codigo: '65', descricao: 'Férias Proporcionais' },
  { codigo: '66.1', descricao: 'Férias Vencidas' },
  { codigo: '68', descricao: 'Terço Constitucional de Férias' },
  { codigo: '69', descricao: 'Aviso Prévio Indenizado' },
  { codigo: '70', descricao: '13º Salário (Aviso Prévio Indenizado)' },
  { codigo: '71', descricao: 'Férias (Aviso Prévio Indenizado)' }
];

const PRESET_DESCONTOS = [
  { codigo: '100', descricao: 'Pensão Alimentícia' },
  { codigo: '101', descricao: 'Adiantamento Salarial' },
  { codigo: '102', descricao: 'Adiantamento 13º Salário' },
  { codigo: '103', descricao: 'Aviso Prévio Ind. (Dias Não Cumpridos)' },
  { codigo: '104', descricao: 'Multa Art. 480 CLT' },
  { codigo: '112.1', descricao: 'Previdência Social' },
  { codigo: '112.2', descricao: 'Previdência Social 13º Salário' },
  { codigo: '114.1', descricao: 'IRRF' },
  { codigo: '114.2', descricao: 'IRRF sobre 13º Salário' },
  { codigo: '115', descricao: 'Outros Descontos' }
];

export default function TrctApp() {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4>(1);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string, visible: boolean}>({
    type: 'success', message: '', visible: false
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);

  // Formulário Estado
  const [formData, setFormData] = useState<Omit<TrctData, 'totalBruto' | 'totalDeducoes' | 'valorLiquido'> & { dataFimContrato: string }>({
    cnpj: '', razaoSocial: '', enderecoEmpresa: '', bairroEmpresa: '', municipioEmpresa: '', ufEmpresa: '', cepEmpresa: '', cnae: '',
    pis: '', nome: '', enderecoTrabalhador: '', bairroTrabalhador: '', municipioTrabalhador: '', ufTrabalhador: '', cepTrabalhador: '', ctps: '', cpf: '', dataNascimento: '', nomeMae: '',
    tipoContrato: '', causaAfastamento: '', remuneracaoMesAnterior: 0, dataAdmissao: '', dataAvisoPrevio: '', dataAfastamento: '', codigoAfastamento: '', pensaoAlimenticia: 0, pensaoAlimenticiaFGTS: 0, sindicato: '', cnpjSindicato: '',
    proventos: [{ id: 'prov-1', codigo: '50', descricao: 'Saldo de Salário', valor: 0 }],
    descontos: [{ id: 'desc-1', codigo: '112.1', descricao: 'Previdência Social', valor: 0 }],
    dataFimContrato: ''
  });

  const [descontarINSS, setDescontarINSS] = useState(false);
  const [rescisaoAntecipada, setRescisaoAntecipada] = useState(false);
  const [modoFimContrato, setModoFimContrato] = useState<'data' | 'dias'>('data');
  const [diasExperiencia, setDiasExperiencia] = useState<number>(30);
  const [parteQuebra, setParteQuebra] = useState<'empregador' | 'empregado'>('empregador');

  const showNotification = (msg: string, type: 'success' | 'error' = 'success') => {
    setNotification({ message: msg, type, visible: true });
    setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 4000);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) file = e.dataTransfer.files[0];
    } else if ('target' in e && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }
    if (!file || file.type !== 'application/pdf') return;

    setIsExtracting(true);
    try {
      const base64 = await getTrimmedPdfBase64(file as File, 4); // 4 pages max for TRCT

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_SECRET_KEY || ''
        },
        body: JSON.stringify({ 
          pdfBase64: base64,
          type: 'trct'
        })
        });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        setErrorLog(`Erro ao extrair TRCT: A Vercel (ou o servidor) retornou um conteúdo que não é JSON.
Status da Resposta: ${response.status} ${response.statusText}
Content-Type recebido: ${contentType || 'Nenhum'}

--- CORPO DA RESPOSTA (HTML ou Texto) ---
${text}`);
        throw new SyntaxError("O servidor retornou HTML. O arquivo pode ser muito grande para o proxy ou ocorreu timeout.");
      }

      const resData = await response.json();
      if (!response.ok || resData.error) throw new Error(resData.error || 'Erro na extração');

      if (resData.data) {
        const data = resData.data;
        const newForm = { ...formData };
        
        Object.keys(data).forEach(key => {
          if (key in newForm && key !== 'proventos' && key !== 'descontos') {
            if (key === 'remuneracaoMesAnterior' || key === 'pensaoAlimenticia' || key === 'pensaoAlimenticiaFGTS') {
              const val = parseFloat(String(data[key]).replace(/[^\d.,]/g, '').replace(',', '.'));
              (newForm as any)[key] = isNaN(val) ? 0 : val;
            } else if (data[key] !== null && data[key] !== undefined) {
              (newForm as any)[key] = String(data[key]).toUpperCase();
            }
          }
        });

        // Formata as datas caso venham no formato DD/MM/YYYY para o formato YYYY-MM-DD suportado pelo input type="date"
        ['dataAdmissao', 'dataAfastamento', 'dataAvisoPrevio', 'dataNascimento'].forEach(dateKey => {
            let val = (newForm as any)[dateKey];
            if (val && val.includes('/')) {
                const parts = val.split('/');
                if (parts.length === 3) {
                    (newForm as any)[dateKey] = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
                }
            }
        });

        setFormData(newForm);
        showNotification('Dados importados com sucesso!');
      }
    } catch (e: any) {
      console.error('Erro ao extrair TRCT:', e);
      setErrorLog(prev => prev ? prev : `Erro de Código/Rede (TRCT):
Tipo de Erro: ${e?.name || 'Unknown'}
Mensagem: ${e?.message || String(e)}

Stack Trace:
${e?.stack || 'N/A'}`);
      showNotification(e.message || 'Erro ao importar.', 'error');
    } finally {
      setIsExtracting(false);
      if (e.target && 'value' in e.target) (e.target as HTMLInputElement).value = '';
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'remuneracaoMesAnterior') {
      const num = parseFloat(value.replace(',', '.'));
      setFormData(prev => ({ ...prev, [name]: isNaN(num) ? 0 : num }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Lógica de cálculo reativa do Campo 50 e INSS
  useEffect(() => {
    setFormData(prev => {
      let newProventos = [...prev.proventos];
      let newDescontos = [...prev.descontos];
      let hasChanges = false;

      // Reatividade do Campo 50
      const idx50 = newProventos.findIndex(p => p.codigo === '50');
      if (idx50 >= 0 && prev.remuneracaoMesAnterior > 0) {
        const diasLiquidos = Math.max(0, (prev.diasSaldoSalario || 0) - (prev.faltasDsr || 0));
        const valorCalculado = parseFloat(((prev.remuneracaoMesAnterior / 30) * diasLiquidos).toFixed(2));
        
        // Apenas atualiza se não tiver sido modificado manualmente ou se for diferente do calculado
        // Mas como a instrução pede que alteração nessas duas variáveis recalcule o campo 50:
        if (newProventos[idx50].valor !== valorCalculado && prev.diasSaldoSalario !== undefined) {
           newProventos[idx50] = { ...newProventos[idx50], valor: valorCalculado, descricao: `Saldo de Salário (${prev.diasSaldoSalario} dias)` };
           hasChanges = true;
        }
      }

      // Reatividade do INSS
      if (descontarINSS) {
        const calcularINSS = (salario: number) => {
          let inss = 0;
          if (salario <= 1412.00) inss = salario * 0.075;
          else if (salario <= 2666.68) inss = (1412.00 * 0.075) + ((salario - 1412.00) * 0.09);
          else if (salario <= 4000.03) inss = (1412.00 * 0.075) + (1254.68 * 0.09) + ((salario - 2666.68) * 0.12);
          else if (salario <= 7786.02) inss = (1412.00 * 0.075) + (1254.68 * 0.09) + (1333.35 * 0.12) + ((salario - 4000.03) * 0.14);
          else inss = 908.85; 
          return parseFloat(inss.toFixed(2));
        };

        const valor50 = newProventos.find(p => p.codigo === '50')?.valor || 0;
        const valor13 = newProventos.find(p => p.codigo === '63')?.valor || 0;
        
        const inssBase = calcularINSS(valor50);
        const inss13 = calcularINSS(valor13);

        const idx112_1 = newDescontos.findIndex(d => d.codigo === '112.1');
        if (inssBase > 0) {
          if (idx112_1 >= 0) {
            if (newDescontos[idx112_1].valor !== inssBase) { newDescontos[idx112_1].valor = inssBase; hasChanges = true; }
          } else {
            newDescontos.push({ id: Date.now() + '-inss', codigo: '112.1', descricao: 'Previdência Social', valor: inssBase });
            hasChanges = true;
          }
        }

        const idx112_2 = newDescontos.findIndex(d => d.codigo === '112.2');
        if (inss13 > 0) {
          if (idx112_2 >= 0) {
            if (newDescontos[idx112_2].valor !== inss13) { newDescontos[idx112_2].valor = inss13; hasChanges = true; }
          } else {
            newDescontos.push({ id: Date.now() + '-inss13', codigo: '112.2', descricao: 'Previdência Social 13º Salário', valor: inss13 });
            hasChanges = true;
          }
        }
      }

      return hasChanges ? { ...prev, proventos: newProventos, descontos: newDescontos } : prev;
    });
  }, [formData.diasSaldoSalario, formData.faltasDsr, descontarINSS, formData.remuneracaoMesAnterior]);

  // Lógica de cálculo reativa de totais e Art 479/480
  const calculatedData = useMemo(() => {
    let proventos = [...formData.proventos.filter(p => p.codigo !== '99' && p.codigo !== '61')]; 
    let descontos = [...formData.descontos.filter(d => d.codigo !== '104')];

    // Cálculo da Multa Rescisão Antecipada (Art 479 / 480)
    if (rescisaoAntecipada && formData.dataAfastamento && formData.remuneracaoMesAnterior > 0) {
      let dataFim = null;
      if (modoFimContrato === 'data' && formData.dataFimContrato) {
        dataFim = new Date(formData.dataFimContrato + 'T00:00:00');
      } else if (modoFimContrato === 'dias' && formData.dataAdmissao) {
        const admissao = new Date(formData.dataAdmissao + 'T00:00:00');
        dataFim = new Date(admissao.getTime());
        dataFim.setDate(dataFim.getDate() + (diasExperiencia - 1));
      }
      
      const dataAfast = new Date(formData.dataAfastamento + 'T00:00:00');
      if (dataFim && dataFim > dataAfast) {
        const diffTime = dataFim.getTime() - dataAfast.getTime();
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
        const valorIndenizacao = (formData.remuneracaoMesAnterior / 30) * diffDays * 0.5;
        
        if (parteQuebra === 'empregador') {
          proventos.push({ id: 'prov-art-479', codigo: '61', descricao: 'Multa Art. 479 CLT', valor: valorIndenizacao });
        } else {
          descontos.push({ id: 'desc-art-480', codigo: '104', descricao: 'Multa Art. 480 CLT', valor: valorIndenizacao });
        }
      }
    }

    if (!descontarINSS) {
       descontos = descontos.map(d => (d.codigo === '112.1' || d.codigo === '112.2') ? { ...d, valor: 0 } : d);
    }

    const totalBrutoSem99 = proventos.reduce((sum, item) => sum + item.valor, 0);
    const totalDeducoes = descontos.reduce((sum, item) => sum + item.valor, 0);
    
    let totalBruto = totalBrutoSem99;
    let valorLiquido = totalBruto - totalDeducoes;

    if (valorLiquido < 0) {
      const saldoDevedor = totalDeducoes - totalBrutoSem99;
      proventos.push({
        id: 'prov-ajuste-99',
        codigo: '99',
        descricao: 'Ajuste do Saldo Devedor',
        valor: saldoDevedor
      });
      totalBruto += saldoDevedor;
      valorLiquido = 0;
    }

    return { ...formData, proventos, descontos, totalBruto, totalDeducoes, valorLiquido };
  }, [formData, descontarINSS, rescisaoAntecipada, modoFimContrato, diasExperiencia, parteQuebra]);

  const addRubrica = (tipo: 'provento' | 'desconto', preset?: {codigo: string, descricao: string}) => {
    const id = Date.now().toString();
    if (tipo === 'provento') {
      setFormData(prev => ({
        ...prev, 
        proventos: [...prev.proventos, { id, codigo: preset?.codigo || '', descricao: preset?.descricao || 'Nova Verba', valor: 0 }]
      }));
    } else {
      setFormData(prev => ({
        ...prev, 
        descontos: [...prev.descontos, { id, codigo: preset?.codigo || '', descricao: preset?.descricao || 'Novo Desconto', valor: 0 }]
      }));
    }
  };

  const removeRubrica = (tipo: 'provento' | 'desconto', id: string) => {
    if (tipo === 'provento') {
      setFormData(prev => ({ ...prev, proventos: prev.proventos.filter(p => p.id !== id) }));
    } else {
      setFormData(prev => ({ ...prev, descontos: prev.descontos.filter(d => d.id !== id) }));
    }
  };

  const updateRubrica = (tipo: 'provento' | 'desconto', id: string, field: string, value: string | number) => {
    const list = tipo === 'provento' ? formData.proventos : formData.descontos;
    const updated = list.map(item => item.id === id ? { ...item, [field]: value } : item);
    if (tipo === 'provento') setFormData(prev => ({ ...prev, proventos: updated }));
    else setFormData(prev => ({ ...prev, descontos: updated }));
  };

  const calcularINSS = (salario: number) => {
    let inss = 0;
    if (salario <= 1412.00) {
      inss = salario * 0.075;
    } else if (salario <= 2666.68) {
      inss = (1412.00 * 0.075) + ((salario - 1412.00) * 0.09);
    } else if (salario <= 4000.03) {
      inss = (1412.00 * 0.075) + (1254.68 * 0.09) + ((salario - 2666.68) * 0.12);
    } else if (salario <= 7786.02) {
      inss = (1412.00 * 0.075) + (1254.68 * 0.09) + (1333.35 * 0.12) + ((salario - 4000.03) * 0.14);
    } else {
      inss = 908.85; // Teto para salários > 7786.02 em 2024
    }
    return inss;
  };

  const calculateAvos = () => {
    if (!formData.dataAdmissao || !formData.dataAfastamento) {
      showNotification('Preencha a Data de Admissão e Data de Afastamento antes de calcular.', 'error');
      return;
    }
    if (formData.remuneracaoMesAnterior <= 0) {
      showNotification('Preencha a Remuneração Base Mês Anterior (valor maior que zero) antes de calcular.', 'error');
      return;
    }
    
    const admissao = new Date(formData.dataAdmissao);
    const afastamento = new Date(formData.dataAfastamento);
    // Adiciona o timezone offset para garantir o dia exato
    admissao.setMinutes(admissao.getMinutes() + admissao.getTimezoneOffset());
    afastamento.setMinutes(afastamento.getMinutes() + afastamento.getTimezoneOffset());

    if (afastamento < admissao) return;

    let newProventos = [...formData.proventos.filter(p => !['50', '63', '65', '68'].includes(p.codigo))];
    let newDescontos = [...formData.descontos.filter(d => !['112.1', '112.2'].includes(d.codigo))];
    const baseCalc = formData.remuneracaoMesAnterior;

    // Saldo de Salário (dias trabalhados no mês da rescisão)
    const diasTrabalhadosMesAfastamento = afastamento.getDate();
    const valorSaldoSalario = (baseCalc / 30) * diasTrabalhadosMesAfastamento;
    newProventos.push({ id: Date.now() + '-50', codigo: '50', descricao: `Saldo de Salário (${diasTrabalhadosMesAfastamento} dias)`, valor: parseFloat(valorSaldoSalario.toFixed(2)) });

    // 13º Proporcional (Ano Civil - 01/01 a Data Afastamento)
    const inicioAnoAfastamento = new Date(afastamento.getFullYear(), 0, 1);
    let dataInicio13 = admissao > inicioAnoAfastamento ? admissao : inicioAnoAfastamento;
    let meses13 = 0;
    
    let current = new Date(dataInicio13);
    while (current.getFullYear() === afastamento.getFullYear() && current <= afastamento) {
      const isUltimoMes = (current.getFullYear() === afastamento.getFullYear() && current.getMonth() === afastamento.getMonth());
      let diasNoMesTrabalhados = 0;

      if (isUltimoMes && current.getMonth() === admissao.getMonth() && current.getFullYear() === admissao.getFullYear()) {
         diasNoMesTrabalhados = afastamento.getDate() - admissao.getDate() + 1;
      } else if (isUltimoMes) {
        diasNoMesTrabalhados = afastamento.getDate();
      } else if (current.getFullYear() === admissao.getFullYear() && current.getMonth() === admissao.getMonth()) {
        const diasNoMes = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate();
        diasNoMesTrabalhados = diasNoMes - admissao.getDate() + 1;
      } else {
        diasNoMesTrabalhados = new Date(current.getFullYear(), current.getMonth() + 1, 0).getDate(); // Considerando dias do mês
      }

      if (diasNoMesTrabalhados >= 15) {
        meses13++;
      }
      current.setMonth(current.getMonth() + 1);
      current.setDate(1); // Set to 1st of next month to prevent skipping on 31st
    }
    
    const valor13 = (baseCalc / 12) * meses13;
    if (valor13 > 0) {
      newProventos.push({ id: Date.now() + '-13', codigo: '63', descricao: `13º Salário Proporcional (${meses13}/12 avos)`, valor: parseFloat(valor13.toFixed(2)) });
    }

    // Férias Proporcionais (Ano Aquisitivo)
    let anosCompletos = 0;
    let temp = new Date(admissao);
    while (true) {
        let nextYear = new Date(temp);
        nextYear.setFullYear(nextYear.getFullYear() + 1);
        if (nextYear <= afastamento) {
            anosCompletos++;
            temp = nextYear;
        } else {
            break;
        }
    }
    
    let dataInicioFerias = new Date(temp);
    let mesesFerias = 0;
    
    while (dataInicioFerias < afastamento) {
        let proximoMes = new Date(dataInicioFerias);
        proximoMes.setMonth(proximoMes.getMonth() + 1);
        
        if (proximoMes <= afastamento) {
            mesesFerias++;
            dataInicioFerias = proximoMes;
        } else {
            let remainingMs = afastamento.getTime() - dataInicioFerias.getTime();
            let remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24)) + 1; 
            if (remainingDays >= 15) {
                mesesFerias++;
            }
            break;
        }
    }

    const valorFerias = (baseCalc / 12) * mesesFerias;
    const valorTerco = valorFerias / 3;

    if (valorFerias > 0) {
      newProventos.push({ id: Date.now() + '-ferias', codigo: '65', descricao: `Férias Proporc (${mesesFerias}/12 avos)`, valor: parseFloat(valorFerias.toFixed(2)) });
      newProventos.push({ id: Date.now() + '-terco', codigo: '68', descricao: 'Terço Constitucional de Férias', valor: parseFloat(valorTerco.toFixed(2)) });
    }

    setFormData(prev => ({ 
      ...prev, 
      proventos: newProventos, 
      descontos: newDescontos,
      diasSaldoSalario: diasTrabalhadosMesAfastamento,
      faltasDsr: 0
    }));
    showNotification('Verbas (Saldo, Avos, Férias e INSS) calculadas com sucesso!');
  };

  const handlePrint = () => {
    const container = document.getElementById('trct-preview-container');
    if (!container) return;
    const htmlContent = container.innerHTML;
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showNotification('Permita pop-ups para imprimir', 'error');
      return;
    }
    const tituloExportacao = `TRCT - ${calculatedData.nome || 'COLABORADOR'}`.toUpperCase();
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${tituloExportacao}</title>
          <style>
            /* Reset absoluto */
            *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
            body {
              font-family: Arial, Helvetica, sans-serif;
              background: white;
              margin: 0;
              padding: 0;
            }
            /* ── ESTILOS BASE DO DOCUMENTO ── */
            .page-container {
              width: 190mm; /* A4 width (210mm) - 20mm total horizontal margins */
              margin: 0 auto;
              background: white;
              color: black;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 8.5pt;
              line-height: 1.2;
              margin-bottom: 3px;
            }
            td, th {
              border: 1px solid black;
              padding: 2px 3px;
              vertical-align: top;
            }
            .bg-gray-300 { background-color: #d1d5db; }
            .bg-gray-200 { background-color: #e5e7eb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .font-bold { font-weight: bold; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .uppercase { text-transform: uppercase; }
            .w-full { width: 100%; }
            /* Título Principal */
            #document-print-area > div.page-container > div:first-child {
              font-size: 12pt;
              font-weight: bold;
              text-align: center;
              background-color: #d1d5db;
              border: 1px solid black;
              padding: 6px;
              text-transform: uppercase;
              margin-bottom: 5px;
            }
            /* Títulos das seções (Identificação do Empregador, Trabalhador, etc) */
            td[colspan="5"].bg-gray-300, 
            td[colspan="6"].bg-gray-300 {
              font-size: 10pt;
              padding: 4px;
            }
            /* Títulos secundários (VERBAS RESCISÓRIAS, DEDUÇÕES) */
            td[colspan="6"].bg-gray-200 {
              font-size: 9.5pt;
              padding: 4px;
            }
            /* Bloco de assinaturas */
            .page-container table:last-of-type td {
              height: 45px !important; /* Espaço reduzido para economizar altura */
              padding: 4px !important;
              vertical-align: bottom;
            }
            /* ── REGRAS DE IMPRESSÃO ── */
            @media print {
              @page {
                size: A4 portrait;
                margin: 5mm; /* Margens finas para aproveitar o máximo da folha */
              }
              
              /* Força a redução do tamanho de todo o TRCT para caber em 1 folha */
              .page-container {
                zoom: 0.85; 
              }

              html, body {
                width: 100%;
                height: 100%;
              }
              body {
                margin: 0;
                padding: 0;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              /* Remove o avoid da tabela inteira, o zoom já deve resolver. */
              table { page-break-inside: auto !important; }
              tr { page-break-inside: avoid !important; }
              thead { display: table-header-group; }
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 500);
    };
  };

  const handleDownloadExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('TRCT');

    sheet.columns = [
      { header: 'RUBRICA', key: 'rubrica', width: 10 },
      { header: 'DESCRIÇÃO', key: 'descricao', width: 40 },
      { header: 'PROVENTOS', key: 'provento', width: 20 },
      { header: 'DEDUÇÕES', key: 'deducao', width: 20 }
    ];

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD3D3D3' } };

    // Adiciona Dados Globais
    sheet.addRow(['CNPJ', calculatedData.cnpj, '', '']);
    sheet.addRow(['Razão', calculatedData.razaoSocial, '', '']);
    sheet.addRow(['Empregado', calculatedData.nome, '', '']);
    sheet.addRow(['CPF', calculatedData.cpf, '', '']);
    sheet.addRow([]);

    // Proventos
    sheet.addRow(['', 'VERBAS RESCISÓRIAS (PROVENTOS)', '', '']).font = { bold: true };
    calculatedData.proventos.forEach(p => {
      sheet.addRow([p.codigo, p.descricao, p.valor, '']);
    });
    
    sheet.addRow([]);

    // Descontos
    sheet.addRow(['', 'DEDUÇÕES', '', '']).font = { bold: true };
    calculatedData.descontos.forEach(d => {
      sheet.addRow([d.codigo, d.descricao, '', d.valor]);
    });

    sheet.addRow([]);
    const rowBruto = sheet.addRow(['', 'TOTAL BRUTO', calculatedData.totalBruto, '']);
    rowBruto.font = { bold: true };
    
    const rowDed = sheet.addRow(['', 'TOTAL DEDUÇÕES', '', calculatedData.totalDeducoes]);
    rowDed.font = { bold: true };
    
    const rowLiq = sheet.addRow(['', 'VALOR LÍQUIDO A RECEBER', calculatedData.valorLiquido, '']);
    rowLiq.font = { bold: true, size: 14 };

    // Format currency columns
    sheet.getColumn('provento').numFmt = '"R$" #,##0.00';
    sheet.getColumn('deducao').numFmt = '"R$" #,##0.00';

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TRCT - ${calculatedData.nome || 'COLABORADOR'}.xlsx`.toUpperCase();
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const renderTabHeader = () => (
    <div className="flex bg-[#1E0810] border border-[#4A1828] rounded-xl overflow-hidden mb-6 shadow-md shadow-[#110408]/50">
      {[
        { id: 1, label: '1. EMPRESA & TRABALHADOR' },
        { id: 2, label: '2. CONTRATO' },
        { id: 3, label: '3. VERBAS' },
        { id: 4, label: '4. REVISÃO' }
      ].map((tab) => (
        <button
          key={tab.id}
          onClick={() => setActiveTab(tab.id as any)}
          className={`flex-1 py-4 text-xs font-bold tracking-widest text-center transition-all ${
            activeTab === tab.id 
              ? 'bg-[#4A1828] text-[#C49B4A]' 
              : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751]'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="w-full max-w-7xl mx-auto p-4 md:p-8 flex flex-col font-sans selection:bg-[#C49B4A] selection:text-[#380E1C] flex-1">
      
      {notification.visible && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl border flex items-center space-x-3 shadow-2xl transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-[#18060B] border-[#C49B4A] text-[#D1A751]' 
            : 'bg-[#18060B] border-red-500 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          <span className="text-sm font-medium tracking-wide">{notification.message}</span>
        </div>
      )}

      {renderTabHeader()}

      <div className="flex-1 bg-[#18060B] border border-[#4A1828] rounded-2xl p-6 shadow-2xl shadow-[#110408]/80 flex flex-col relative overflow-y-auto">
        
        {/* ABA 1: EMPRESA E TRABALHADOR */}
        {activeTab === 1 && (
          <div className="space-y-8 animate-in fade-in duration-300">
             <label 
                onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                onDrop={handlePdfUpload}
                className={`relative w-full border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-6 transition-all duration-300 ${
                  isExtracting ? 'border-[#845a27] bg-[#110408] opacity-80 cursor-wait' : 'border-[#C49B4A] bg-[#0C0305] hover:bg-[#1E0810] hover:border-[#D1A751] cursor-pointer'
                }`}
              >
                <input type="file" accept=".pdf" onChange={handlePdfUpload} disabled={isExtracting} className="hidden" />
                {isExtracting ? (
                  <div className="flex flex-col items-center"><Loader2 className="w-8 h-8 text-[#C49B4A] animate-spin mb-2" /><span className="text-[#D1A751]">Lendo PDF via IA...</span></div>
                ) : (
                  <div className="flex flex-col items-center"><Upload className="w-8 h-8 text-[#C49B4A] mb-2" /><span className="text-[#C49B4A] font-bold">Importar Dados por IA (PDF)</span></div>
                )}
            </label>

            <div>
              <h3 className="text-[#C49B4A] text-sm font-bold tracking-widest mb-4 border-b border-[#4A1828] pb-2">DADOS DO EMPREGADOR</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="cnpj" value={formData.cnpj} onChange={handleChange} placeholder="CNPJ" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                <input type="text" name="razaoSocial" value={formData.razaoSocial} onChange={handleChange} placeholder="Razão Social" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                <input type="text" name="enderecoEmpresa" value={formData.enderecoEmpresa} onChange={handleChange} placeholder="Endereço" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                <input type="text" name="municipioEmpresa" value={formData.municipioEmpresa} onChange={handleChange} placeholder="Município" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
              </div>
            </div>

            <div>
              <h3 className="text-[#C49B4A] text-sm font-bold tracking-widest mb-4 border-b border-[#4A1828] pb-2">DADOS DO TRABALHADOR</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} placeholder="CPF" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                <input type="text" name="nome" value={formData.nome} onChange={handleChange} placeholder="Nome Completo" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                <input type="text" name="pis" value={formData.pis} onChange={handleChange} placeholder="PIS" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                <input type="text" name="ctps" value={formData.ctps} onChange={handleChange} placeholder="CTPS" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
              </div>
            </div>
          </div>
        )}

        {/* ABA 2: CONTRATO & AFASTAMENTO */}
        {activeTab === 2 && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div>
              <h3 className="text-[#C49B4A] text-sm font-bold tracking-widest mb-4 border-b border-[#4A1828] pb-2">DADOS DO CONTRATO</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-[#845a27] text-xs font-bold mb-1">Admissão</label>
                  <input type="date" name="dataAdmissao" value={formData.dataAdmissao} onChange={handleChange} className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[#845a27] text-xs font-bold mb-1">Afastamento</label>
                  <input type="date" name="dataAfastamento" value={formData.dataAfastamento} onChange={handleChange} className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[#845a27] text-xs font-bold mb-1">Causa do Afastamento</label>
                  <input type="text" name="causaAfastamento" value={formData.causaAfastamento} onChange={handleChange} placeholder="Ex: Dispensa sem justa causa" className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                </div>
                <div className="flex flex-col">
                  <label className="text-[#845a27] text-xs font-bold mb-1">Remuneração Base Mês Anterior (R$)</label>
                  <CurrencyInput value={formData.remuneracaoMesAnterior} onChangeValue={(val) => setFormData(prev => ({...prev, remuneracaoMesAnterior: val}))} className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A]" />
                </div>
              </div>
            </div>

            <div className="bg-[#2A0B16] border border-[#4A1828] rounded-xl p-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <div onClick={() => setDescontarINSS(!descontarINSS)} className="w-5 h-5 rounded border border-[#C49B4A] flex items-center justify-center bg-[#110408]">
                  {descontarINSS && <CheckSquare className="w-4 h-4 text-[#D1A751]" />}
                </div>
                <span className="text-[#D1A751] font-bold text-sm">Calcular e Descontar INSS Automaticamente?</span>
              </label>
            </div>

            <div className="bg-[#2A0B16] border border-[#4A1828] rounded-xl p-4">
              <label className="flex items-center space-x-3 cursor-pointer">
                <div onClick={() => setRescisaoAntecipada(!rescisaoAntecipada)} className="w-5 h-5 rounded border border-[#C49B4A] flex items-center justify-center">
                  {rescisaoAntecipada && <CheckSquare className="w-4 h-4 text-[#D1A751]" />}
                </div>
                <span className="text-[#D1A751] font-bold">Rescisão Antecipada de Contrato de Experiência / Determinado?</span>
              </label>
              
              {rescisaoAntecipada && (
                <div className="mt-4 flex flex-col space-y-4">
                  
                  <div className="flex space-x-4">
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" checked={modoFimContrato === 'data'} onChange={() => setModoFimContrato('data')} className="text-[#C49B4A] bg-[#110408]" />
                      <span className="text-[#A68759] text-sm">Informar Data</span>
                    </label>
                    <label className="flex items-center space-x-2 cursor-pointer">
                      <input type="radio" checked={modoFimContrato === 'dias'} onChange={() => setModoFimContrato('dias')} className="text-[#C49B4A] bg-[#110408]" />
                      <span className="text-[#A68759] text-sm">Informar Dias de Prazo</span>
                    </label>
                  </div>

                  <div className="flex flex-col">
                    {modoFimContrato === 'data' ? (
                      <>
                        <label className="text-[#845a27] text-xs font-bold mb-1">Data Prevista de Término do Contrato</label>
                        <input type="date" name="dataFimContrato" value={formData.dataFimContrato} onChange={handleChange} className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A] w-full md:w-1/2" />
                      </>
                    ) : (
                      <>
                        <label className="text-[#845a27] text-xs font-bold mb-1">Prazo do Contrato (Dias) a partir da Admissão</label>
                        <input type="number" value={diasExperiencia} onChange={(e) => setDiasExperiencia(Number(e.target.value))} className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A] w-full md:w-1/2" />
                      </>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-[#A68759] mb-2">Selecione a parte responsável pela quebra do contrato para calcular multas (Art. 479 ou 480 da CLT).</p>
                    <select 
                      value={parteQuebra} 
                      onChange={(e) => setParteQuebra(e.target.value as any)}
                      className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-3 focus:outline-none focus:border-[#C49B4A] w-full md:w-1/2"
                    >
                      <option value="empregador">Empregador (Art. 479 - Paga 50% Indenização)</option>
                      <option value="empregado">Empregado (Art. 480 - Desconta 50% Indenização)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-4">
              <button 
                onClick={() => {
                  calculateAvos();
                  setActiveTab(3);
                }}
                className="bg-[#C49B4A] hover:bg-[#D1A751] text-[#1E0810] px-6 py-3 rounded-lg font-bold tracking-widest text-sm flex items-center space-x-2 transition-colors"
              >
                <span>CALCULAR VERBAS INICIAIS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* ABA 3: VERBAS & RESCISÃO */}
        {activeTab === 3 && (
          <div className="space-y-6 flex flex-col h-full animate-in fade-in duration-300">
            <div className="bg-[#2A0B16] border border-[#4A1828] p-4 rounded-xl flex flex-wrap gap-4 items-center">
              <div className="flex flex-col">
                <label className="text-[#845a27] text-xs font-bold mb-1">Dias Saldo de Salário (Mês Rescisão)</label>
                <input type="number" value={formData.diasSaldoSalario || ''} onChange={(e) => setFormData({...formData, diasSaldoSalario: parseInt(e.target.value) || 0})} className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-2 focus:outline-none focus:border-[#C49B4A] w-32" />
              </div>
              <div className="flex flex-col">
                <label className="text-[#845a27] text-xs font-bold mb-1">Faltas e DSR a Descontar</label>
                <input type="number" value={formData.faltasDsr || ''} onChange={(e) => setFormData({...formData, faltasDsr: parseInt(e.target.value) || 0})} className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg p-2 focus:outline-none focus:border-[#C49B4A] w-32" />
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 overflow-hidden">
              
              {/* Proventos */}
              <div className="flex flex-col bg-[#1A040B] border border-[#4A1828] rounded-xl overflow-hidden">
                <div className="bg-[#380E1C] p-3 flex justify-between items-center border-b border-[#4A1828]">
                  <h4 className="text-[#C49B4A] font-bold tracking-widest text-sm">PROVENTOS</h4>
                  <select 
                    className="bg-[#110408] border border-[#4A1828] text-[#D1A751] text-xs p-1 rounded"
                    onChange={(e) => {
                      if(e.target.value) {
                        const pre = PRESET_PROVENTOS.find(p => p.codigo === e.target.value);
                        if(pre) addRubrica('provento', pre);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">+ Adicionar Rubrica Oficial...</option>
                    {PRESET_PROVENTOS.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo} - {p.descricao}</option>)}
                  </select>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {calculatedData.proventos.map(item => (
                    <div key={item.id} className={`flex items-center space-x-2 ${item.codigo === '99' ? 'opacity-80 bg-[#2A0B16] p-2 rounded border border-[#C49B4A]' : ''}`}>
                      <input type="text" value={item.codigo} onChange={(e) => updateRubrica('provento', item.id, 'codigo', e.target.value)} className="w-16 bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded p-2 text-xs" placeholder="Cód" />
                      <input type="text" value={item.descricao} onChange={(e) => updateRubrica('provento', item.id, 'descricao', e.target.value)} className="flex-1 bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded p-2 text-xs" placeholder="Descrição" />
                      <CurrencyInput value={item.valor} onChangeValue={(val) => updateRubrica('provento', item.id, 'valor', val)} className="w-24 bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded p-2 text-xs text-right" />
                      {item.codigo !== '99' && (
                        <button onClick={() => removeRubrica('provento', item.id)} className="text-red-500 hover:bg-[#380E1C] p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  ))}
                  <button onClick={() => addRubrica('provento')} className="w-full text-xs text-[#A68759] hover:text-[#D1A751] border border-dashed border-[#4A1828] py-2 rounded flex items-center justify-center space-x-2"><Plus className="w-3 h-3"/><span>Nova Verba Manual</span></button>
                </div>
                <div className="bg-[#2A0B16] p-3 border-t border-[#4A1828] flex justify-between font-bold">
                  <span className="text-[#A68759]">Total Bruto:</span>
                  <span className="text-[#C49B4A]">{calculatedData.totalBruto.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                </div>
              </div>

              {/* Deduções */}
              <div className="flex flex-col bg-[#1A040B] border border-[#4A1828] rounded-xl overflow-hidden">
                <div className="bg-[#380E1C] p-3 flex justify-between items-center border-b border-[#4A1828]">
                  <h4 className="text-[#C49B4A] font-bold tracking-widest text-sm">DEDUÇÕES</h4>
                  <select 
                    className="bg-[#110408] border border-[#4A1828] text-[#D1A751] text-xs p-1 rounded"
                    onChange={(e) => {
                      if(e.target.value) {
                        const pre = PRESET_DESCONTOS.find(p => p.codigo === e.target.value);
                        if(pre) addRubrica('desconto', pre);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">+ Adicionar Rubrica Oficial...</option>
                    {PRESET_DESCONTOS.map(p => <option key={p.codigo} value={p.codigo}>{p.codigo} - {p.descricao}</option>)}
                  </select>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {calculatedData.descontos.map(item => (
                    <div key={item.id} className="flex items-center space-x-2">
                      <input type="text" value={item.codigo} onChange={(e) => updateRubrica('desconto', item.id, 'codigo', e.target.value)} className="w-16 bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded p-2 text-xs" placeholder="Cód" />
                      <input type="text" value={item.descricao} onChange={(e) => updateRubrica('desconto', item.id, 'descricao', e.target.value)} className="flex-1 bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded p-2 text-xs" placeholder="Descrição" />
                      <CurrencyInput value={item.valor} onChangeValue={(val) => updateRubrica('desconto', item.id, 'valor', val)} className="w-24 bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded p-2 text-xs text-right" />
                      <button onClick={() => removeRubrica('desconto', item.id)} className="text-red-500 hover:bg-[#380E1C] p-1 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  <button onClick={() => addRubrica('desconto')} className="w-full text-xs text-[#A68759] hover:text-[#D1A751] border border-dashed border-[#4A1828] py-2 rounded flex items-center justify-center space-x-2"><Plus className="w-3 h-3"/><span>Novo Desconto Manual</span></button>
                </div>
                <div className="bg-[#2A0B16] p-3 border-t border-[#4A1828] flex justify-between font-bold">
                  <span className="text-[#A68759]">Total Deduções:</span>
                  <span className="text-[#C49B4A]">{calculatedData.totalDeducoes.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
                </div>
              </div>
            </div>

            <div className="bg-[#C49B4A] rounded-xl p-4 flex justify-between items-center text-[#1A040B] font-bold text-lg shadow-lg">
              <span>VALOR LÍQUIDO A RECEBER:</span>
              <span>{calculatedData.valorLiquido.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}</span>
            </div>

          </div>
        )}

        {/* ABA 4: REVISÃO E EXPORTAÇÃO */}
        {activeTab === 4 && (
          <div className="flex flex-col md:flex-row h-full gap-6 animate-in fade-in duration-300">
            <div className="w-full md:w-1/3 flex flex-col space-y-4">
              <h3 className="text-[#C49B4A] text-lg font-bold tracking-widest border-b border-[#4A1828] pb-2">EXPORTAR</h3>
              <p className="text-sm text-[#A68759]">Revise o documento gerado. Os cálculos batem corretamente e o layout está pronto para impressão oficial no padrão A4 do MTE.</p>
              
              <button onClick={handlePrint} className="w-full bg-[#C49B4A] hover:bg-[#D1A751] text-[#1E0810] font-bold tracking-widest text-sm rounded-lg py-4 transition-colors flex items-center justify-center space-x-3 shadow-lg mt-4">
                <Printer className="w-5 h-5" />
                <span>IMPRIMIR TRCT (A4)</span>
              </button>
              
              <button onClick={handleDownloadExcel} className="w-full bg-[#1E0810] hover:bg-[#2A0B16] border border-[#C49B4A] text-[#C49B4A] hover:text-[#D1A751] font-bold tracking-widest text-sm rounded-lg py-4 transition-colors flex items-center justify-center space-x-3 shadow-lg">
                <Download className="w-5 h-5" />
                <span>BAIXAR EXCEL (.XLSX)</span>
              </button>
            </div>
            
            <div className="flex-1 bg-gray-500 rounded-xl overflow-y-auto p-4 flex justify-center shadow-inner relative">
              <div id="trct-preview-container" className="transform scale-[0.6] md:scale-[0.8] origin-top">
                <LayoutTRCT data={calculatedData} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-between items-center shrink-0">
         <button 
           onClick={() => setActiveTab(activeTab - 1 as any)} 
           disabled={activeTab === 1}
           className="px-6 py-3 border border-[#4A1828] text-[#C49B4A] hover:bg-[#2A0B16] rounded-lg font-bold text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
         >
           <ArrowLeft className="w-4 h-4"/> <span>VOLTAR</span>
         </button>
         
         <button 
           onClick={() => setActiveTab(activeTab + 1 as any)} 
           disabled={activeTab === 4}
           className="px-6 py-3 bg-[#4A1828] hover:bg-[#68243D] text-[#D1A751] rounded-lg font-bold text-sm tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
         >
           <span>PRÓXIMO</span> <ArrowRight className="w-4 h-4"/>
         </button>
      </div>
      <ErrorLogViewer errorLog={errorLog} onClose={() => setErrorLog(null)} />
    </div>
  );
}
