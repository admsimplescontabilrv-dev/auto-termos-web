import React, { useState, useEffect } from 'react';
import { Search, FileText, Download, Copy, ArrowRight, ArrowLeft, CheckCircle2, AlignLeft, AlignCenter, Activity, Loader2, Plus, Trash2, Upload, AlertTriangle, X, LogIn, LogOut, Home, Building2, CheckSquare, FileSignature, Receipt, FileStack, Briefcase } from 'lucide-react';
import { DEFAULT_TEMPLATES, INITIAL_TEMPLATE } from './data';
import { SavedTemplate } from './types';
import ReciboApp from './ReciboApp';
import BoletoApp from './BoletoApp';
import TrctApp from './TrctApp';
import EmpresasApp from './EmpresasApp';
import ChecklistsApp from './ChecklistsApp';
import DashboardApp from './DashboardApp';
import { getTrimmedPdfBase64 } from './pdfUtils';
import { ErrorLogViewer } from './ErrorLogViewer';

export default function App() {
  const [modulo, setModulo] = useState<'dashboard' | 'empresas' | 'checklists' | 'autotermos' | 'recibos' | 'boletos' | 'trct'>('dashboard');
  // Commit trigger timestamp: 2026-08-13 05:06
  
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [templates, setTemplates] = useState<SavedTemplate[]>([]);
  

  // Active template being edited
  const [activeTemplateId, setActiveTemplateId] = useState<string>('tpl-custom');
  // Templates selected for batch generation
  const [batchTemplateIds, setBatchTemplateIds] = useState<string[]>([]);
  
  const [templateName, setTemplateName] = useState('Novo Modelo');
  const [templateCode, setTemplateCode] = useState(INITIAL_TEMPLATE);
  const [customTemplate, setCustomTemplate] = useState<{name: string, content: string}>({ name: 'Novo Modelo', content: INITIAL_TEMPLATE });
  
  const [variables, setVariables] = useState<string[]>([]);
  const [globalVariables, setGlobalVariables] = useState<string[]>([]);
  const [collaboratorVariables, setCollaboratorVariables] = useState<string[]>([]);
  const [globalFormData, setGlobalFormData] = useState<Record<string, string>>({});
  const [collaboratorsData, setCollaboratorsData] = useState<Record<string, string>[]>([{}]);
  
  const [generatedDoc, setGeneratedDoc] = useState('');
  
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [extractStatus, setExtractStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string, visible: boolean}>({
    type: 'success', message: '', visible: false
  });
  
  // Set default to public/timbrado.png
  const letterheadImage = '/timbrado.png'; 

  useEffect(() => {
    setTemplates(DEFAULT_TEMPLATES);
  }, []);


  // Compute variables dynamically based on batch selection and active editor content
  useEffect(() => {
    const currentCustomContent = activeTemplateId === 'tpl-custom' ? templateCode : customTemplate.content;
    
    // Aggregate contents of all selected templates
    const allContents = batchTemplateIds.map(id => {
      if (id === activeTemplateId) return templateCode;
      if (id === 'tpl-custom') return currentCustomContent;
      const tpl = templates.find(t => t.id === id);
      return tpl ? tpl.content : '';
    }).join(' ');

    const matches = [...allContents.matchAll(/\[(.*?)\]/g)];
    const uniqueVars = [...new Set(matches.map(m => m[1]))].filter(v => v !== 'QUEBRA');
    
    setVariables(uniqueVars);

    const globals: string[] = [];
    const collabs: string[] = [];
    
    uniqueVars.forEach(v => {
      const upper = v.toUpperCase();
      if (upper.includes('COLABORADOR') || upper.includes('EMPREGADO') || upper.includes('CPF') || upper.includes('RG')) {
        collabs.push(v);
      } else {
        globals.push(v);
      }
    });

    setGlobalVariables(globals);
    setCollaboratorVariables(collabs);
    
    setGlobalFormData(prev => {
      const newForm: Record<string, string> = { ...prev };
      globals.forEach(v => {
        if (!(v in newForm)) newForm[v] = '';
      });
      return newForm;
    });

    setCollaboratorsData(prev => {
      if (prev.length === 0) return [{}];
      return prev.map(collab => {
        const newCollab = { ...collab };
        collabs.forEach(v => {
          if (!(v in newCollab)) newCollab[v] = '';
        });
        return newCollab;
      });
    });
  }, [batchTemplateIds, activeTemplateId, templateCode, templates, customTemplate.content]);

  const handleContentChange = (content: string) => {
    setTemplateCode(content);
  };

  const handleTemplateSelect = (tplId: string) => {
    if (tplId === activeTemplateId) return;

    // Save current active template
    let updatedTemplates = [...templates];
    if (activeTemplateId === 'tpl-custom') {
      setCustomTemplate({ name: templateName, content: templateCode });
    } else {
      updatedTemplates = templates.map(t => 
        t.id === activeTemplateId ? { ...t, content: templateCode, name: templateName } : t
      );
      setTemplates(updatedTemplates);
    }

    setActiveTemplateId(tplId);
    
    // Load new template into editor
    if (tplId === 'tpl-custom') {
      setTemplateName(activeTemplateId === 'tpl-custom' ? templateName : customTemplate.name);
      setTemplateCode(activeTemplateId === 'tpl-custom' ? templateCode : customTemplate.content);
    } else {
      const tpl = updatedTemplates.find(t => t.id === tplId);
      if (tpl) {
        setTemplateName(tpl.name);
        setTemplateCode(tpl.content);
      }
    }
  };

  const toggleBatchTemplate = (tplId: string) => {
    setBatchTemplateIds(prev => 
      prev.includes(tplId) ? prev.filter(id => id !== tplId) : [...prev, tplId]
    );
  };

  const generateFinalDocument = () => {
    // Triggering new commit for GitHub
    // Generate concatenated document
    const currentCustomContent = activeTemplateId === 'tpl-custom' ? templateCode : customTemplate.content;
    
    const finalContents = batchTemplateIds.map(id => {
      if (id === activeTemplateId) return templateCode;
      if (id === 'tpl-custom') return currentCustomContent;
      const tpl = templates.find(t => t.id === id);
      return tpl ? tpl.content : '';
    }).filter(c => c);
    
    const baseCombinedText = finalContents.join('\n\n[QUEBRA]\n\n');
    
    let allDocs: string[] = [];
    const iterators = collaboratorsData.length > 0 ? collaboratorsData : [{}];

    iterators.forEach(collabData => {
      let textForCollab = baseCombinedText;
      
      globalVariables.forEach(v => {
        const escapedKey = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\[${escapedKey}\\]`, 'g');
        textForCollab = textForCollab.replace(regex, globalFormData[v] || `[${v}]`);
      });

      collaboratorVariables.forEach(v => {
        const escapedKey = v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`\\[${escapedKey}\\]`, 'g');
        textForCollab = textForCollab.replace(regex, collabData[v] || `[${v}]`);
      });

      allDocs.push(textForCollab);
    });

    const finalText = allDocs.join('\n\n[QUEBRA]\n\n');
    setGeneratedDoc(finalText);
    setStep(3);
  };

  const copyToClipboard = () => {
    // Strip HTML for clipboard or use a temporary element
    const tempEl = document.createElement('div');
    tempEl.innerHTML = generatedDoc;
    navigator.clipboard.writeText(tempEl.innerText || tempEl.textContent || '');
    alert('Texto copiado para a área de transferência!');
  };

  const handlePrint = async () => {
    const element = document.getElementById('document-print-area');
    if (!element) return;
    
    setIsGeneratingPdf(true);
    
    try {
      let printTitle = 'DOCUMENTOS EM LOTE';
      if (batchTemplateIds.length === 1) {
         const tplId = batchTemplateIds[0];
         let tplName = 'Documento';
         if (tplId === 'tpl-custom') {
           tplName = activeTemplateId === 'tpl-custom' ? templateName : customTemplate.name;
         } else {
           const tpl = templates.find(t => t.id === tplId);
           if (tpl) tplName = tpl.name;
         }

         const collabNames = collaboratorsData.map((collab, index) => {
           const nameKey = collaboratorVariables.find(v => v.toUpperCase().includes('NOME'));
           if (nameKey && collab[nameKey] && collab[nameKey].trim() !== '') {
             return collab[nameKey];
           }
           const firstVal = Object.values(collab).find((val: any) => typeof val === 'string' && val.trim() !== '');
           return firstVal || `Colaborador ${index + 1}`;
         });

         const allCollabNames = collabNames.join(', ');
         printTitle = `${tplName} - ${allCollabNames}`;
      }

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        alert('Por favor, permita pop-ups no seu navegador para gerar o PDF.');
        setIsGeneratingPdf(false);
        return;
      }

      // 1. Copiar TODOS os estilos nativos da aplicação (Tailwind, fontes, index.css)
      // Isso garante 100% de fidelidade: margens pt-[72mm], px-[25mm], pb-[50mm] e fontes originais
      const headStyles = Array.from(document.head.querySelectorAll('style, link[rel="stylesheet"]'))
        .map(node => node.outerHTML)
        .join('\n');

      // 2. Clonar o elemento do documento (sem modificar a tela que o usuário está vendo)
      const clonedElement = element.cloneNode(true) as HTMLElement;
      
      // 3. Limpar apenas as classes e estilos de escala (scale-xxx) que faziam o PDF encolher
      clonedElement.style.transform = 'none';
      clonedElement.style.webkitTransform = 'none';
      clonedElement.style.width = '100%';
      clonedElement.style.margin = '0';
      clonedElement.style.padding = '0';
      clonedElement.className = clonedElement.className
        .replace(/scale-\[[^\]]*\]/g, '')
        .replace(/sm:scale-\[[^\]]*\]/g, '')
        .replace(/md:scale-\[[^\]]*\]/g, '')
        .replace(/lg:scale-\[[^\]]*\]/g, '')
        .replace(/xl:scale-\[[^\]]*\]/g, '')
        .replace(/origin-\w+/g, '')
        .replace(/transform\b/g, '')
        .replace(/\s+/g, ' ')
        .trim();

      // 4. Estruturar o HTML com os estilos nativos + regras de segurança para tamanho A4 real (1:1)
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>${printTitle}</title>
            ${headStyles}
            <style>
              @page { 
                margin: 0; 
                size: A4 portrait; 
              }
              * {
                box-sizing: border-box;
              }
              html, body { 
                margin: 0 !important; 
                padding: 0 !important; 
                background: white !important;
                width: 100% !important;
                -webkit-print-color-adjust: exact !important; 
                print-color-adjust: exact !important; 
                zoom: 0.95;
              }
              #document-print-area {
                display: flex !important;
                flex-direction: column !important;
                align-items: center !important;
                transform: none !important;
                -webkit-transform: none !important;
                width: 100% !important;
                margin: 0 auto !important;
                padding: 0 !important;
                gap: 0 !important;
              }
              .page-container {
                width: 100% !important;
                max-width: 210mm !important;
                height: auto !important;
                min-height: 297mm !important;
                max-height: none !important;
                position: relative !important;
                overflow: visible !important;
                background: white !important;
                page-break-after: always !important;
                break-after: page !important;
                page-break-inside: avoid !important;
                break-inside: avoid !important;
                box-shadow: none !important;
                border: none !important;
                border-radius: 0 !important;
                margin: 0 auto !important;
                padding: 0 !important;
                flex-shrink: 0 !important;
              }
              .page-container:last-child {
                page-break-after: auto !important;
                break-after: auto !important;
              }
            </style>
          </head>
          <body>
            ${clonedElement.outerHTML}
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();

      // 5. Aguardar os estilos e imagens do timbrado carregarem para disparar a impressão
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
        }, 600);
      };

    } catch (e) {
      console.error(e);
      alert('Ocorreu um erro ao preparar a impressão.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resetFields = () => {
    const emptyGlobal: Record<string, string> = {};
    globalVariables.forEach(v => emptyGlobal[v] = '');
    setGlobalFormData(emptyGlobal);
    
    const emptyCollab: Record<string, string> = {};
    collaboratorVariables.forEach(v => emptyCollab[v] = '');
    setCollaboratorsData([emptyCollab]);
    
    setStep(2);
  };

  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>) => {
    e.preventDefault();
    let file: File | null = null;
    
    if ('dataTransfer' in e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    } else if ('target' in e && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }

    if (!file || file.type !== 'application/pdf') return;

    setIsExtracting(true);
    setExtractStatus(null);
    setNotification({ ...notification, visible: false });

    try {
      const base64 = await getTrimmedPdfBase64(file as File, 5); // 5 pages max for custom templates

      

      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-api-key': import.meta.env.VITE_API_SECRET_KEY || ''
        },
        body: JSON.stringify({ 
          pdfBase64: base64,
          type: 'custom',
          globalVars: globalVariables,
          collabVars: collaboratorVariables
        })
        });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        setErrorLog(`Erro ao extrair DP - SIMPLES CONTÁBIL: A Vercel (ou o servidor) retornou um conteúdo que não é JSON.
Status da Resposta: ${response.status} ${response.statusText}
Content-Type recebido: ${contentType || 'Nenhum'}

--- CORPO DA RESPOSTA (HTML ou Texto) ---
${text}`);
        throw new SyntaxError("O servidor retornou HTML. O arquivo pode ser muito grande para o proxy ou ocorreu timeout.");
      }

      const resData = await response.json();
      
      if (!response.ok || resData.error) {
        setNotification({
          type: 'error',
          message: resData.error || 'Erro na extração dos dados.',
          visible: true
        });
        setExtractStatus({ message: `EXTRAÇÃO FALHOU APÓS ${resData.attempts || 1} TENTATIVA(S)`, type: 'error' });
        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 6000);
        return;
      }

      const { data, attempts, modelUsed } = resData;
      
      if (data) {
        let matchCount = 0;
        
        // Smart match
        const newGlobalForm = { ...globalFormData };
        const newCollabForm = [...collaboratorsData];
        
        let records: any[] = [];
        if (Array.isArray(data)) {
          records = data;
        } else if (typeof data === 'object' && data !== null) {
          const values = Object.values(data);
          const firstArray = values.find(Array.isArray);
          if (firstArray) {
            records = firstArray;
          } else {
            records = [data];
          }
        }

        records.forEach((record) => {
          if (typeof record !== 'object' || !record) return;
          
          let targetIndex = newCollabForm.length - 1;
          if (targetIndex >= 0) {
            const lastCollab = newCollabForm[targetIndex];
            const hasData = Object.values(lastCollab).some(val => val && typeof val === 'string' && val.trim() !== '');
            if (hasData) {
              targetIndex = newCollabForm.length;
              newCollabForm.push({});
            }
          } else {
            targetIndex = 0;
            newCollabForm.push({});
          }

          Object.entries(record).forEach(([jsonKey, jsonValue]) => {
            const val = typeof jsonValue === 'string' ? jsonValue : String(jsonValue || '');
            const normalizedJsonKey = jsonKey.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

            // Match globals
            globalVariables.forEach(v => {
              const normalizedV = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              if (normalizedV === normalizedJsonKey) {
                newGlobalForm[v] = val;
                matchCount++;
              }
            });

            // Match collab
            collaboratorVariables.forEach(v => {
              const normalizedV = v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
              if (normalizedV === normalizedJsonKey) {
                newCollabForm[targetIndex][v] = val;
                matchCount++;
              }
            });
          });
        });

        setGlobalFormData(newGlobalForm);
        setCollaboratorsData(newCollabForm);
        
        setExtractStatus({ message: `EXTRAÇÃO CONCLUÍDA APÓS ${attempts || 1} TENTATIVA(S) VIA ${modelUsed || 'GEMINI'}`, type: 'success' });
        setNotification({
          type: 'success',
          message: `Dados extraídos com sucesso! ${matchCount} campos preenchidos automaticamente.`,
          visible: true
        });

        setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 4000);
      }
    } catch (error) {
      console.error(error);
      setErrorLog(prev => prev ? prev : `Erro de Código/Rede (APP):
Tipo de Erro: ${error instanceof Error ? error.name : 'Unknown'}
Mensagem: ${error instanceof Error ? error.message : String(error)}

Stack Trace:
${error instanceof Error ? error.stack : 'N/A'}`);
      setExtractStatus({ message: `EXTRAÇÃO FALHOU`, type: 'error' });
      setNotification({
        type: 'error',
        message: 'Ocorreu um erro inesperado ao processar o relatório. Recomendamos preencher manualmente.',
        visible: true
      });
      setTimeout(() => setNotification(prev => ({ ...prev, visible: false })), 6000);
    } finally {
      setIsExtracting(false);
      if (e.target && 'value' in e.target) {
         (e.target as HTMLInputElement).value = '';
      }
    }
  };

  // UI Components per step
  return (
    <div className="flex h-screen bg-[#380E1C] text-neutral-200 font-sans font-light selection:bg-[#C49B4A] selection:text-[#380E1C] overflow-hidden">
      
      {/* Toast Notification */}
      {notification.visible && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl border flex items-center space-x-3 shadow-2xl transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-[#18060B] border-[#C49B4A] text-[#D1A751]' 
            : 'bg-[#18060B] border-red-500 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium tracking-wide pr-8">{notification.message}</span>
          <button 
            onClick={() => setNotification(prev => ({ ...prev, visible: false }))}
            className="absolute right-3 top-4 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#1A040B] border-r border-[#4A1828] flex flex-col print:hidden flex-shrink-0 z-50">
        <div className="p-6 flex items-center space-x-3 text-[#C49B4A] border-b border-[#4A1828]">
          <Activity className="w-8 h-8 flex-shrink-0" />
          <div className="flex flex-col">
            <span className="font-serif font-bold text-sm tracking-widest leading-none">DP - SIMPLES</span>
            <span className="text-[10px] text-[#A68759] tracking-widest mt-1">CONTÁBIL</span>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-6 flex flex-col space-y-2 px-3 custom-scrollbar">
          <div className="text-[10px] text-[#845a27] font-bold tracking-widest uppercase mb-2 px-3">Geral</div>
          
          <button onClick={() => setModulo('dashboard')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${modulo === 'dashboard' ? 'bg-[#380E1C] text-[#C49B4A] border border-[#4A1828]' : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751] border border-transparent'}`}>
            <Home className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest">AI HUB</span>
          </button>
          
          <button onClick={() => setModulo('empresas')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${modulo === 'empresas' ? 'bg-[#380E1C] text-[#C49B4A] border border-[#4A1828]' : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751] border border-transparent'}`}>
            <Building2 className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest">EMPRESAS</span>
          </button>
          
          <button onClick={() => setModulo('checklists')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${modulo === 'checklists' ? 'bg-[#380E1C] text-[#C49B4A] border border-[#4A1828]' : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751] border border-transparent'}`}>
            <CheckSquare className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest">CHECKLISTS</span>
          </button>

          <div className="text-[10px] text-[#845a27] font-bold tracking-widest uppercase mb-2 mt-6 px-3">Geradores</div>
          
          <button onClick={() => setModulo('autotermos')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${modulo === 'autotermos' ? 'bg-[#380E1C] text-[#C49B4A] border border-[#4A1828]' : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751] border border-transparent'}`}>
            <FileSignature className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest">AUTOTERMOS</span>
          </button>
          
          <button onClick={() => setModulo('recibos')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${modulo === 'recibos' ? 'bg-[#380E1C] text-[#C49B4A] border border-[#4A1828]' : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751] border border-transparent'}`}>
            <Receipt className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest">RECIBOS</span>
          </button>
          
          <button onClick={() => setModulo('boletos')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${modulo === 'boletos' ? 'bg-[#380E1C] text-[#C49B4A] border border-[#4A1828]' : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751] border border-transparent'}`}>
            <FileStack className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest">BOLETOS</span>
          </button>
          
          <button onClick={() => setModulo('trct')} className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${modulo === 'trct' ? 'bg-[#380E1C] text-[#C49B4A] border border-[#4A1828]' : 'text-[#A68759] hover:bg-[#2A0B16] hover:text-[#D1A751] border border-transparent'}`}>
            <Briefcase className="w-5 h-5" />
            <span className="text-sm font-bold tracking-widest">TRCT</span>
          </button>
        </nav>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 overflow-auto bg-[#380E1C] relative">
      
        {modulo === 'dashboard' ? (
          <DashboardApp />
        ) : modulo === 'empresas' ? (
          <EmpresasApp />
        ) : modulo === 'checklists' ? (
          <ChecklistsApp />
        ) : modulo === 'recibos' ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <ReciboApp />
          </main>
        ) : modulo === 'boletos' ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <BoletoApp />
          </main>
        ) : modulo === 'trct' ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <TrctApp />
          </main>
        ) : (
          <main className="w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col print:p-0 print:m-0 print:max-w-none">
            
            {modulo === 'autotermos' && (
              <div className="flex items-center justify-between space-x-4 md:space-x-8 text-xs md:text-sm font-serif tracking-widest text-[#845a27] w-full flex-wrap gap-y-2 mb-6 print:hidden">
                <div className="flex items-center space-x-6">
                  <button 
                    onClick={() => setStep(1)} 
                    className={`flex items-center space-x-2 transition-colors hover:text-[#D1A751] ${step === 1 ? 'text-[#D1A751] font-bold' : ''}`}
                  >
                    <span>1. MODELO</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (batchTemplateIds.length > 0 && variables.length > 0) setStep(2);
                    }} 
                    className={`flex items-center space-x-2 transition-colors hover:text-[#D1A751] ${step === 2 ? 'text-[#D1A751] font-bold' : ''} ${(batchTemplateIds.length === 0 || variables.length === 0) ? 'opacity-50 cursor-not-allowed hover:text-[#845a27]' : ''}`}
                  >
                    <span>2. PREENCHER</span>
                  </button>
                  <button 
                    onClick={() => {
                      if (generatedDoc) setStep(3);
                    }} 
                    className={`flex items-center space-x-2 transition-colors hover:text-[#D1A751] ${step === 3 ? 'text-[#D1A751] font-bold' : ''} ${!generatedDoc ? 'opacity-50 cursor-not-allowed hover:text-[#845a27]' : ''}`}
                  >
                    <span>3. CONCLUÍDO</span>
                  </button>
                </div>
              </div>
            )}
          {/* === STEP 1: MODELO === */}
        {step === 1 && (
          <div className="flex flex-col lg:flex-row flex-1 gap-8 h-full">
            {/* Sidebar Left: biblioteca */}
            <aside className="w-full lg:w-80 flex flex-col space-y-6 flex-shrink-0">
              <div className="bg-[#1E0810] border border-[#4A1828] rounded-xl p-6 flex-1 flex flex-col">
                <h2 className="text-[#C49B4A] text-sm tracking-widest mb-6 flex items-center space-x-2 font-serif">
                  <FileText className="w-4 h-4" />
                  <span>BIBLIOTECA</span>
                </h2>
                
                <div className="relative mb-6">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-[#845a27]" />
                  <input 
                    type="text" 
                    placeholder="Buscar modelo..."
                    className="w-full bg-[#110408] border border-[#4A1828] text-sm text-[#D1A751] rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-[#C49B4A] placeholder:text-[#6a4220]"
                  />
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                  <h3 className="text-xs text-[#845a27] font-semibold tracking-wider mb-3 mt-4">SUGERIDOS</h3>
                  
                  {templates.map(tpl => (
                    <div key={tpl.id} className={`flex items-stretch w-full mb-2 rounded-lg border transition-all ${
                      activeTemplateId === tpl.id 
                        ? 'bg-[#2A0B16] border-[#D1A751] text-[#D1A751]' 
                        : 'bg-transparent border-[#4A1828] hover:bg-[#2A0B16] text-[#A68759] hover:text-[#D1A751]'
                    }`}>
                      <div className="flex items-center pl-3">
                        <input 
                          type="checkbox"
                          checked={batchTemplateIds.includes(tpl.id)}
                          onChange={() => toggleBatchTemplate(tpl.id)}
                          className="w-4 h-4 accent-[#D1A751] cursor-pointer"
                        />
                      </div>
                      <button 
                        onClick={() => handleTemplateSelect(tpl.id)}
                        className="flex-1 text-left p-3"
                      >
                        <p className="text-sm font-medium line-clamp-1">{tpl.name}</p>
                        <span className="text-[10px] text-[#845a27] tracking-widest mt-1 block">PADRÃO</span>
                      </button>
                    </div>
                  ))}

                  <h3 className="text-xs text-[#845a27] font-semibold tracking-wider mb-3 mt-8">SEUS MODELOS</h3>
                  
                  <div className={`flex items-stretch w-full mb-2 rounded-lg border transition-all ${
                    activeTemplateId === 'tpl-custom' 
                      ? 'bg-[#2A0B16] border-[#D1A751] text-[#D1A751]' 
                      : 'bg-transparent border-[#4A1828] hover:bg-[#2A0B16] text-[#A68759] hover:text-[#D1A751]'
                  }`}>
                    <div className="flex items-center pl-3">
                      <input 
                        type="checkbox"
                        checked={batchTemplateIds.includes('tpl-custom')}
                        onChange={() => toggleBatchTemplate('tpl-custom')}
                        className="w-4 h-4 accent-[#D1A751] cursor-pointer"
                      />
                    </div>
                    <button 
                      onClick={() => handleTemplateSelect('tpl-custom')}
                      className="flex-1 text-left p-3"
                    >
                      <p className="text-sm font-medium line-clamp-1">{activeTemplateId === 'tpl-custom' ? templateName : customTemplate.name}</p>
                      <span className="text-[10px] text-[#845a27] tracking-widest mt-1 block">RASCUNHO</span>
                    </button>
                  </div>
                </div>
              </div>
            </aside>

            {/* Center: Editor */}
            <div className="flex-1 flex flex-col space-y-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0">
                <input 
                  type="text" 
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="bg-transparent border-b border-[#4A1828] focus:border-[#C49B4A] focus:outline-none text-[#A68759] font-serif text-lg py-1 px-1 w-full md:w-1/2 placeholder:text-[#6a4220]"
                  placeholder="Nome do Modelo (Opcional)"
                />
                <button className="text-[#C49B4A] text-xs font-bold tracking-widest uppercase flex items-center space-x-2 hover:text-white transition-colors w-full md:w-auto justify-end">
                  <Download className="w-4 h-4" />
                  <span>SALVAR MODELO</span>
                </button>
              </div>

              {/* Editor Container */}
              <div className="bg-[#FDF4CD] rounded-xl flex-1 flex flex-col text-neutral-900 border border-[#C49B4A] shadow-xl overflow-hidden shadow-[#110408]/50">
                {/* Fake Toolbar */}
                <div className="bg-[#F6EAC1] border-b border-[#E1CD98] px-4 py-2 flex items-center space-x-6 text-[#5E4A28] text-sm z-10 font-serif">
                  <span>Normal ▼</span>
                  <div className="flex space-x-3 font-serif">
                    <button onMouseDown={e => { e.preventDefault(); document.execCommand('bold', false); }} className="font-bold cursor-pointer hover:text-black">B</button>
                    <button onMouseDown={e => { e.preventDefault(); document.execCommand('italic', false); }} className="italic cursor-pointer hover:text-black">I</button>
                    <button onMouseDown={e => { e.preventDefault(); document.execCommand('underline', false); }} className="underline cursor-pointer hover:text-black">U</button>
                  </div>
                  <div className="flex space-x-3">
                    <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyLeft', false); }} className="cursor-pointer hover:text-black"><AlignLeft className="w-4 h-4"/></button>
                    <button onMouseDown={e => { e.preventDefault(); document.execCommand('justifyCenter', false); }} className="cursor-pointer hover:text-black"><AlignCenter className="w-4 h-4 text-center mx-auto"/></button>
                  </div>
                </div>

                <div
                  key={activeTemplateId}
                  contentEditable
                  suppressContentEditableWarning
                  className="flex-1 w-full bg-transparent p-10 focus:outline-none font-serif text-[15px] leading-relaxed text-[#2C2114] overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: templateCode }}
                  onBlur={(e) => handleContentChange(e.currentTarget.innerHTML)}
                />
              </div>
            </div>

            {/* Sidebar Right: Instruções */}
            <aside className="w-full lg:w-[300px] flex flex-col space-y-6 flex-shrink-0">
              <div className="bg-[#1E0810] border border-[#4A1828] rounded-xl p-6 flex-1 flex flex-col justify-between">
                <div>
                  <h2 className="text-[#C49B4A] text-sm tracking-widest mb-6 flex items-center space-x-2 font-serif">
                    <FileText className="w-4 h-4" />
                    <span>INSTRUÇÕES</span>
                  </h2>
                  <ul className="text-sm text-[#A68759] space-y-4 list-disc pl-5 marker:text-[#C49B4A]">
                    <li className="pl-1">
                      <span className="leading-relaxed">Marque <b className="text-[#D1A751]">checkboxes</b> para gerar vários documentos de um só lote.</span>
                    </li>
                    <li className="pl-1">
                      <span className="leading-relaxed">Variáveis repetidas em vários documentos serão pedidas uma única vez.</span>
                    </li>
                    <li className="pl-1">
                      <span className="leading-relaxed">Use <strong className="text-[#D1A751] font-mono font-normal tracking-wide mx-1">[colchetes]</strong> no texto para criar variáveis customizadas.</span>
                    </li>
                  </ul>

                  <div className="mt-10 border-t border-[#4A1828] pt-6">
                    <h3 className="text-[10px] text-[#845a27] font-bold tracking-widest mb-4">RESUMO DO LOTE</h3>
                    <div className="flex justify-between items-center text-sm text-[#A68759] mb-3">
                      <span>Documentos</span>
                      <span className="bg-[#4A1828] text-[#C49B4A] font-bold px-3 py-1 rounded">
                        {batchTemplateIds.length}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-[#A68759]">
                      <span>Variáveis (Total)</span>
                      <span className="bg-[#D1A751] text-[#1E0810] font-bold px-3 py-1 rounded">{variables.length}</span>
                    </div>
                  </div>
                </div>

                <button 
                  onClick={() => setStep(2)}
                  disabled={batchTemplateIds.length === 0 || variables.length === 0}
                  className="w-full bg-[#C49B4A] hover:bg-[#D1A751] text-[#1E0810] font-bold tracking-wider py-4 rounded-lg shadow-lg shadow-[#110408]/50 transition-all active:scale-[0.98] mt-6 flex justify-between items-center px-6 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm">COMEÇAR<br/>PREENCHIMENTO</span>
                  <ArrowRight className="w-5 h-5"/>
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* === STEP 2: PREENCHER === */}
        {step === 2 && (
          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-4xl flex flex-col">
              <div className="text-center mb-10">
                <h1 className="text-3xl font-serif text-[#C49B4A] tracking-wider mb-2">DADOS DO LOTE</h1>
                <p className="text-[#A68759] font-light">Preencha as informações da empresa e dos colaboradores.</p>
              </div>
              
              <div className="bg-[#18060B] border border-[#4A1828] rounded-2xl flex flex-col shadow-2xl shadow-[#110408]/80 max-h-[75vh]">
                
                <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                  {/* UPLOAD PDF AREA */}
                  <label 
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={handlePdfUpload}
                    className={`relative w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 overflow-hidden ${
                      isExtracting 
                        ? 'border-[#845a27] bg-[#110408] opacity-80 cursor-wait' 
                        : 'border-[#C49B4A] bg-[#0C0305] hover:bg-[#1E0810] hover:border-[#D1A751] cursor-pointer'
                    }`}
                  >
                    <input 
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      disabled={isExtracting}
                      className="hidden"
                    />
                    {isExtracting ? (
                      <>
                        <Loader2 className="w-10 h-10 text-[#C49B4A] animate-spin mb-4" />
                        <h3 className="text-[#D1A751] font-serif text-lg tracking-wider mb-2">Analisando relatório com IA...</h3>
                        <p className="text-[#845a27] text-sm">Isso pode levar alguns segundos.</p>
                      </>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-[#C49B4A] mb-4" />
                        <h3 className="text-[#C49B4A] font-serif text-lg tracking-wider mb-2">Carregar Relatório Admissional (PDF)</h3>
                        <p className="text-[#845a27] text-sm">Arraste ou clique para selecionar o PDF</p>
                      </>
                    )}
                  </label>
                  {extractStatus && (
                    <div className={`mt-3 text-center text-xs font-bold ${extractStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                      {extractStatus.message}
                    </div>
                  )}

                  {globalVariables.length === 0 && collaboratorVariables.length === 0 ? (
                    <p className="text-[#A68759] text-center italic py-10">Nenhuma variável encontrada no modelo.</p>
                  ) : (
                    <>
                      {/* SESSÃO 1: Dados Globais */}
                      {globalVariables.length > 0 && (
                        <div className="space-y-6">
                          <div className="border-b border-[#3A1221] pb-2">
                            <h2 className="text-[#C49B4A] text-lg font-serif tracking-widest">DADOS GLOBAIS</h2>
                            <p className="text-[#845a27] text-xs">Preenchidos apenas uma vez para todos os documentos</p>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {globalVariables.map((v) => (
                              <div key={v} className="flex flex-col">
                                <label className="text-[#845a27] text-xs font-bold tracking-widest uppercase mb-2 ml-1">{v}</label>
                                <input
                                  id={`global_${v}`}
                                  name={`global_${v}`}
                                  type="text"
                                  value={globalFormData[v] || ''}
                                  onChange={(e) => setGlobalFormData({...globalFormData, [v]: e.target.value})}
                                  placeholder={`Digite o(a) ${v.toLowerCase()}...`}
                                  className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3.5 focus:outline-none focus:border-[#C49B4A] transition-colors"
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* SESSÃO 2: Lista de Colaboradores */}
                      {collaboratorVariables.length > 0 && (
                        <div className="space-y-6">
                          <div className="border-b border-[#3A1221] pb-2 flex justify-between items-end">
                            <div>
                              <h2 className="text-[#C49B4A] text-lg font-serif tracking-widest">COLABORADORES</h2>
                              <p className="text-[#845a27] text-xs">Preencha os dados individuais de cada colaborador</p>
                            </div>
                            <span className="text-[#A68759] text-sm font-bold bg-[#2A0B16] px-3 py-1 rounded-full border border-[#4A1828]">
                              {collaboratorsData.length} adicionado(s)
                            </span>
                          </div>

                          <div className="space-y-6">
                            {collaboratorsData.map((collab, index) => (
                              <div key={index} className="bg-[#1E0810] border border-[#4A1828] rounded-xl p-6 relative shadow-md">
                                <div className="flex justify-between items-center mb-6">
                                  <h3 className="text-[#D1A751] font-bold tracking-widest flex items-center space-x-2">
                                    <span className="bg-[#4A1828] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">{index + 1}</span>
                                    <span>COLABORADOR {index + 1}</span>
                                  </h3>
                                  {collaboratorsData.length > 1 && (
                                    <button 
                                      onClick={() => {
                                        setCollaboratorsData(prev => prev.filter((_, i) => i !== index));
                                      }}
                                      className="text-[#845a27] hover:text-red-500 text-xs font-bold tracking-widest uppercase transition-colors flex items-center space-x-1"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                      <span>EXCLUIR</span>
                                    </button>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                  {collaboratorVariables.map((v) => (
                                    <div key={v} className="flex flex-col">
                                      <label className="text-[#845a27] text-xs font-bold tracking-widest uppercase mb-2 ml-1">{v}</label>
                                      <input
                                        id={`collab_${index}_${v}`}
                                        name={`collab_${index}_${v}`}
                                        type="text"
                                        value={collab[v] || ''}
                                        onChange={(e) => {
                                          const newData = [...collaboratorsData];
                                          newData[index] = { ...newData[index], [v]: e.target.value };
                                          setCollaboratorsData(newData);
                                        }}
                                        placeholder={`Digite o(a) ${v.toLowerCase()}...`}
                                        className="bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-lg px-4 py-3.5 focus:outline-none focus:border-[#C49B4A] transition-colors"
                                      />
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>

                          <button
                            onClick={() => {
                              const emptyCollab: Record<string, string> = {};
                              collaboratorVariables.forEach(v => emptyCollab[v] = '');
                              setCollaboratorsData([...collaboratorsData, emptyCollab]);
                            }}
                            className="w-full border border-dashed border-[#4A1828] hover:border-[#C49B4A] hover:bg-[#2A0B16] text-[#A68759] hover:text-[#D1A751] py-4 rounded-xl font-bold tracking-widest transition-all text-sm flex items-center justify-center space-x-2"
                          >
                            <Plus className="w-4 h-4" />
                            <span>ADICIONAR OUTRO COLABORADOR</span>
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="p-6 border-t border-[#3A1221] flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 bg-[#1E0810] rounded-b-2xl shrink-0">
                  <button 
                    onClick={() => setStep(1)}
                    className="flex-1 border border-[#4A1828] text-[#C49B4A] hover:bg-[#380E1C] font-bold tracking-widest text-sm rounded-lg py-4 transition-colors text-center w-full md:w-auto"
                  >
                    EDITAR MODELO
                  </button>
                  <button 
                    onClick={generateFinalDocument}
                    className="flex-[2] bg-[#C49B4A] hover:bg-[#D1A751] text-[#1E0810] font-bold tracking-widest text-sm rounded-lg py-4 transition-colors flex items-center justify-center space-x-3 shadow-lg w-full md:w-auto"
                  >
                    <span>GERAR LOTE DE DOCUMENTOS</span>
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* === STEP 3: CONCLUÍDO (PREVIEW / EXPORT) === */}
        {step === 3 && (
          <div className="flex flex-col lg:flex-row flex-1 gap-8 h-full">
            {/* Left Sidebar: Export Options */}
            <aside className="w-full lg:w-[300px] flex flex-col space-y-4 print:hidden flex-shrink-0 lg:sticky lg:top-24 lg:self-start lg:h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar pb-4 pr-1">
              <h2 className="text-[#C49B4A] text-sm tracking-widest mb-2 font-serif uppercase font-bold">Exportar</h2>
              
              <button 
                id="btn-download-pdf"
                onClick={handlePrint}
                disabled={isGeneratingPdf}
                className="bg-[#1A040B] border border-[#C49B4A] hover:bg-[#2A0B16] rounded-xl p-5 flex items-center space-x-4 transition-all group shadow-[#110408]/50 shadow-lg text-left disabled:opacity-50 disabled:cursor-wait"
              >
                <div className="p-3 border border-[#C49B4A] rounded-lg text-[#C49B4A] group-hover:bg-[#C49B4A] group-hover:text-[#1A040B] transition-colors">
                  {isGeneratingPdf ? <Loader2 className="w-6 h-6 animate-spin" /> : <Download className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-wide">
                    {isGeneratingPdf ? 'GERANDO PDF...' : 'BAIXAR PDF'}
                  </h3>
                  <p className="text-[10px] text-[#A68759] tracking-widest uppercase mt-1">Formato Oficial</p>
                </div>
              </button>

              <button 
                onClick={copyToClipboard}
                className="bg-[#1A040B] border border-[#4A1828] hover:bg-[#2A0B16] hover:border-[#C49B4A] rounded-xl p-5 flex items-center space-x-4 transition-all group shadow-lg text-left"
              >
                <div className="p-3 border border-[#4A1828] rounded-lg text-[#A68759] group-hover:text-[#C49B4A] group-hover:border-[#C49B4A] transition-colors">
                  <Copy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-white font-bold tracking-wide text-sm">COPIAR TEXTO</h3>
                  <p className="text-[10px] text-[#A68759] tracking-widest uppercase mt-1">Clipboard</p>
                </div>
              </button>

              <div className="flex-1" />

               <button 
                onClick={resetFields}
                className="bg-[#1E0810] border border-[#4A1828] hover:bg-[#380E1C] rounded-xl p-4 flex items-center justify-center text-center transition-all text-[#C49B4A] text-sm font-bold tracking-widest mt-4"
              >
                REINICIAR CAMPOS
              </button>
              
               <button 
                onClick={() => setStep(1)}
                className="bg-transparent text-[#A68759] hover:text-white rounded-xl py-3 flex items-center justify-center text-center transition-all text-sm font-bold tracking-widest"
              >
                <ArrowLeft className="w-4 h-4 mr-2"/>
                VOLTAR AO MODELO
              </button>

            </aside>

            {/* Right Area: Document A4 Preview */}
            <div className="flex-1 flex flex-col items-center overflow-x-auto overflow-y-auto pb-10 pt-4 print:pt-0 print:pb-0 print:overflow-visible relative custom-scrollbar space-y-8">
               <div id="document-print-area" className="flex flex-col space-y-8 print:space-y-0 items-center transform scale-[0.6] sm:scale-[0.8] md:scale-[0.9] lg:scale-100 origin-top w-full md:w-auto">
                 {generatedDoc.split('[QUEBRA]')
                   .filter(pageContent => pageContent.trim() !== '')
                   .map((pageContent, index) => (
                   <div key={index} className="page-container bg-white shadow-2xl max-w-full rounded-sm relative print:shadow-none print:rounded-none w-[210mm] min-h-[297mm] print:h-[297mm] shrink-0 overflow-hidden border border-[#110408]/30 print:border-none print:break-after-page">
                      
                      {/* Background Letterhead Image */}
                      {letterheadImage && (
                        <div 
                          className="absolute inset-0 z-0 pointer-events-none"
                          style={{
                            backgroundImage: `url(${letterheadImage})`,
                            backgroundSize: '100% 100%',
                            backgroundPosition: 'center',
                            backgroundRepeat: 'no-repeat',
                            WebkitPrintColorAdjust: 'exact', 
                            printColorAdjust: 'exact'
                          }}
                        />
                      )}

                      {/* Document Content Layer */}
                      <div className="relative z-10 px-[25mm] pt-[72mm] pb-[50mm] text-neutral-900 text-[10.5pt] font-serif leading-[1.5] h-full flex flex-col">
                        <div 
                          className="flex-1 text-justify doc-content"
                          dangerouslySetInnerHTML={{ __html: pageContent.trim() || '&nbsp;' }}
                        />
                      </div>
                   </div>
                 ))}
               </div>
            </div>
          </div>
        )}
      </main>
      )}

      {/* Global & Print CSS */}
      <style dangerouslySetInnerHTML={{__html: `
        /* Custom Scrollbar for dark theme */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #110408;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #4A1828;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #845a27;
        }

        /* === DOCUMENT CONTENT STYLES === */
        .doc-content h2 {
          font-size: 11pt !important;
          font-weight: 700;
          margin: 0 0 2px 0;
          padding: 0;
          line-height: 1.4;
          text-transform: uppercase;
          letter-spacing: 0.03em;
        }

        .doc-content h3 {
          font-size: 10.5pt !important;
          font-weight: 700;
          margin: 0 0 2px 0;
          padding: 0;
          line-height: 1.4;
        }

        .doc-content p {
          margin: 0 0 4px 0;
          padding: 0;
          line-height: 1.5;
          font-size: 10.5pt;
        }

        .doc-content br {
          display: block;
          content: "";
          margin: 3px 0;
        }

        .doc-content ul,
        .doc-content ol {
          margin: 2px 0 6px 0;
          padding-left: 25px;
        }

        .doc-content li {
          margin: 0 0 2px 0;
          padding: 0;
          line-height: 1.45;
          font-size: 10.5pt;
        }

        .doc-content div[style*="text-align: center"] {
          margin: 0;
          padding: 0;
        }

        .doc-content div[style*="text-align: center"] h2 {
          margin-bottom: 6px;
        }

        /* Signature area spacing */
        .doc-content div[style*="text-align: center"] p {
          margin-bottom: 1px;
        }

        @media print {
          @page { margin: 0; size: A4 portrait; }
          body { 
            background-color: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
      </div>
      <ErrorLogViewer errorLog={errorLog} onClose={() => setErrorLog(null)} />
    </div>
  );
}
