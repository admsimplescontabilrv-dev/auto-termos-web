import React, { useState, useRef, useEffect } from 'react';
import { Upload, Download, FileText, Trash2, Eye, EyeOff, Settings, X, Save } from 'lucide-react';
import { PDFDocument, rgb } from 'pdf-lib';
import { Document, Page, pdfjs } from 'react-pdf';
import { Rnd } from 'react-rnd';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Configura o worker do pdf.js (usando a versão correspondente à instalada)
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

// ======================================================================
// CONFIGURAÇÃO DAS ÁREAS DE REDAÇÃO (COORDENADAS FIXAS)
// ======================================================================
// IMPORTANTE: As coordenadas PDF usam sistema cartesiano com origem no
// canto INFERIOR ESQUERDO da página. O eixo Y cresce para CIMA.
// Para uma página A4 (595.28 x 841.89 pts), y=841 é o topo e y=0 é a base.
// ======================================================================

interface RedactionArea {
  id: string;
  label: string;
  x: number;      // coordenada X do canto inferior esquerdo do retângulo
  y: number;      // coordenada Y do canto inferior esquerdo do retângulo
  width: number;   // largura do retângulo em pontos PDF
  height: number;  // altura do retângulo em pontos PDF
  enabled: boolean;
}

const DEFAULT_REDACTION_AREAS: RedactionArea[] = [
  { id: 'juros', label: 'Juros / Multa', x: 45, y: 200, width: 350, height: 35, enabled: true },
  { id: 'endereco', label: 'Endereço JUCEC', x: 45, y: 420, width: 280, height: 25, enabled: true },
  { id: 'cnpj', label: 'CNPJ JUCEC (Topo)', x: 330, y: 440, width: 100, height: 15, enabled: true },
  { id: 'cnpj_ficha', label: 'CNPJ JUCEC (Ficha)', x: 330, y: 275, width: 100, height: 15, enabled: true },
  { id: 'cnpj_sacador', label: 'Sacador/CNPJ (Rodapé)', x: 45, y: 90, width: 385, height: 15, enabled: true }
];

export default function BoletoApp() {
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [processedPdfUrl, setProcessedPdfUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCalibration, setShowCalibration] = useState(false);
  const [redactionAreas, setRedactionAreas] = useState<RedactionArea[]>(DEFAULT_REDACTION_AREAS);
  const [showOriginal, setShowOriginal] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // === ESTADOS PARA CALIBRAÇÃO VISUAL ===
  const [pdfDim, setPdfDim] = useState({ width: 595.28, height: 841.89 }); // Padrão A4
  const [pageRenderWidth, setPageRenderWidth] = useState(800);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

  // Carregar configurações salvas no localStorage
  useEffect(() => {
    const saved = localStorage.getItem('boleto-redaction-areas');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setRedactionAreas(parsed);
        }
      } catch (e) {
        console.error('Erro ao ler localStorage', e);
      }
    }
  }, []);

  // Monitorar redimensionamento para ajustar o width da Page do react-pdf
  useEffect(() => {
    const handleResize = () => {
      // Ajusta o tamanho da renderização para caber na tela, subtraindo o padding
      const newWidth = Math.min(typeof window !== 'undefined' ? window.innerWidth - 64 : 800, 800);
      setPageRenderWidth(newWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Salvar no localStorage
  const saveToLocalStorage = () => {
    localStorage.setItem('boleto-redaction-areas', JSON.stringify(redactionAreas));
    alert('Padrão de calibração salvo com sucesso! Os próximos boletos usarão estas áreas automaticamente.');
  };

  const processSelectedFile = async (file: File) => {
    if (file.type !== 'application/pdf') {
      alert('Por favor, selecione um arquivo PDF.');
      return;
    }
    setPdfFile(file);
    const baseName = file.name.replace(/\.pdf$/i, '');
    setFileName(baseName.toUpperCase().startsWith('BOLETO') ? baseName : `BOLETO ${baseName}`);
    setProcessedPdfUrl(null);
    setShowOriginal(false);
    
    // Criar URL para preview do original
    const url = URL.createObjectURL(file);
    setPdfPreviewUrl(url);

    // Extrair dimensões reais do PDF usando pdf-lib e tentar achar o nome do pagador
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const firstPage = pdfDoc.getPages()[0];
      const { width, height } = firstPage.getSize();
      setPdfDim({ width, height });

      // Extrair texto com pdfjs para tentar achar o nome do pagador
      try {
        const loadingTask = pdfjs.getDocument(url);
        const pdfJsDoc = await loadingTask.promise;
        const page = await pdfJsDoc.getPage(1);
        const textContent = await page.getTextContent();
        const items = textContent.items as any[];
        
        // Ordenar os itens de texto estruturalmente (cima para baixo, esquerda para direita)
        items.sort((a, b) => {
          const yDiff = b.transform[5] - a.transform[5];
          if (Math.abs(yDiff) > 5) {
             return yDiff; 
          }
          return a.transform[4] - b.transform[4]; 
        });

        let foundName = '';
        for (let i = 0; i < items.length; i++) {
          const str = items[i].str.trim().toUpperCase();
          if (str.includes('PAGADOR') && !str.includes('RECIBO')) {
            let j = i + 1;
            while(j < items.length && j < i + 10) {
              const nextStr = items[j].str.trim();
              const nextStrUp = nextStr.toUpperCase();
              const exclusions = ['ENDEREÇO', 'CPF', 'CNPJ', 'DATA', 'VENCIMENTO', 'AGÊNCIA', 'CÓDIGO', 'NOSSO', 'NÚMERO', 'BENEFICIÁRIO'];
              
              if (nextStr && 
                  nextStr !== '/' && 
                  !exclusions.some(ex => nextStrUp.includes(ex)) &&
                  nextStr.length > 4) {
                 foundName = nextStr;
                 break;
              }
              j++;
            }
            if (foundName) break;
          }
        }
        
        if (foundName) {
           setFileName(`BOLETO ${foundName}`);
        }
      } catch (textErr) {
        console.error('Erro ao extrair texto com pdfjs:', textErr);
      }

    } catch(err) {
      console.error('Erro ao extrair dimensões do PDF:', err);
    }
  };

  // ---- Upload do PDF ----
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processSelectedFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processSelectedFile(file);
    }
  };

  // ---- Lógica de Conversão (PDF pts <-> Tela pixels) ----
  const toScreen = (pdfVal: number) => (pdfVal / pdfDim.width) * pageRenderWidth;
  const toPdf = (screenVal: number) => (screenVal / pageRenderWidth) * pdfDim.width;

  const getScreenPos = (area: RedactionArea) => {
    const screenX = toScreen(area.x);
    const screenW = toScreen(area.width);
    const screenH = toScreen(area.height);
    // Y na tela cresce para baixo, no PDF cresce para cima
    const screenY = toScreen(pdfDim.height - area.y) - screenH;
    return { x: screenX, y: screenY, width: screenW, height: screenH };
  };

  const updateAreaFromScreen = (id: string, screenX: number, screenY: number, screenW: number, screenH: number) => {
    const pdfX = toPdf(screenX);
    const pdfW = toPdf(screenW);
    const pdfH = toPdf(screenH);
    // Reverter o Y
    const pdfY = pdfDim.height - toPdf(screenY) - pdfH;

    setRedactionAreas(prev => prev.map(a => {
      if (a.id === id) {
        return {
          ...a,
          x: Number(pdfX.toFixed(2)),
          y: Number(pdfY.toFixed(2)),
          width: Number(pdfW.toFixed(2)),
          height: Number(pdfH.toFixed(2))
        };
      }
      return a;
    }));
  };

  // ---- Processar (Limpar) o Boleto ----
  const handleCleanBoleto = async () => {
    if (!pdfFile) return;
    setIsProcessing(true);

    try {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Boletos são sempre 1 página

      // Desenhar retângulos brancos sobre cada área habilitada
      for (const area of redactionAreas) {
        if (!area.enabled) continue;
        firstPage.drawRectangle({
          x: area.x,
          y: area.y,
          width: area.width,
          height: area.height,
          color: rgb(1, 1, 1), // Branco puro
          borderWidth: 0,
        });
      }

      // Gerar o PDF processado
      const processedBytes = await pdfDoc.save();
      const blob = new Blob([processedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      if (processedPdfUrl) URL.revokeObjectURL(processedPdfUrl);
      
      setProcessedPdfUrl(url);
      setShowOriginal(false);
      
      // Se estava calibrando, e acabou de gerar o novo PDF, pode desligar ou manter
      // setShowCalibration(false); 
    } catch (err) {
      console.error('Erro ao processar boleto:', err);
      alert('Erro ao processar o PDF. Verifique se o arquivo é um boleto válido.');
    } finally {
      setIsProcessing(false);
    }
  };

  // ---- Download do PDF Limpo ----
  const handleDownload = () => {
    if (!processedPdfUrl || !pdfFile) return;
    const link = document.createElement('a');
    link.href = processedPdfUrl;
    
    // Usa o nome definido (automático ou editado)
    let finalName = fileName.trim();
    if (!finalName) finalName = 'Boleto';
    if (!finalName.toLowerCase().endsWith('.pdf')) {
      finalName += '.pdf';
    }
    
    link.download = finalName;
    link.click();
  };

  // ---- Reset ----
  const handleReset = () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
    if (processedPdfUrl) URL.revokeObjectURL(processedPdfUrl);
    setPdfFile(null);
    setFileName('');
    setPdfPreviewUrl(null);
    setProcessedPdfUrl(null);
    setShowOriginal(false);
    setShowCalibration(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---- Atualizar coordenada manualmente ----
  const updateArea = (id: string, field: keyof RedactionArea, value: string | number | boolean) => {
    setRedactionAreas(prev =>
      prev.map(a => (a.id === id ? { ...a, [field]: value } : a))
    );
  };

  const addNewArea = () => {
    setRedactionAreas(prev => [
      ...prev,
      {
        id: `area_${Date.now()}`,
        label: 'Nova Área',
        x: 100,
        y: 400,
        width: 150,
        height: 30,
        enabled: true
      }
    ]);
  };

  const removeArea = (id: string) => {
    setRedactionAreas(prev => prev.filter(a => a.id !== id));
  };

  // Escala para a altura baseada na largura renderizada (para o container relative)
  const pageRenderHeight = (pageRenderWidth / pdfDim.width) * pdfDim.height;

  // ---- UI ----
  return (
    <div className="flex-1 flex flex-col p-4 md:p-8 space-y-6 max-w-6xl mx-auto w-full">
      
      {/* Título do módulo */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-serif tracking-widest text-indigo-400 uppercase">
          Limpador de Boletos
        </h2>
        <p className="text-sm text-slate-400 font-light tracking-wide">
          Remova informações de juros, endereço e CNPJ automaticamente
        </p>
      </div>

      {/* Área de Upload */}
      {!pdfFile && (
        <label 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-2xl cursor-pointer transition-all duration-300 group ${
            isDragging 
              ? 'border-indigo-500 bg-slate-900' 
              : 'border-slate-700/50 bg-slate-900/50 hover:border-indigo-500 hover:bg-slate-900'
          }`}
        >
          <div className="flex flex-col items-center justify-center space-y-4 py-6">
            <div className="p-4 rounded-full bg-slate-950 group-hover:bg-indigo-600 transition-colors">
              <Upload className="w-10 h-10 text-indigo-400" />
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-200 font-serif tracking-widest">
                CLIQUE OU ARRASTE O BOLETO
              </p>
              <p className="text-xs text-slate-500 mt-1">PDF do boleto bancário</p>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      )}

      {/* Controles após upload */}
      {pdfFile && (
        <div className="space-y-4">
          {/* Barra de ações */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900 border border-slate-700/50 rounded-xl p-4 shadow-md">
            <div className="flex items-center space-x-3">
              <FileText className="w-5 h-5 text-indigo-400" />
              <span className="text-sm text-slate-200 font-serif tracking-wide truncate max-w-[200px]">
                {pdfFile.name}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Botão Calibração */}
              <button
                onClick={() => {
                  setShowCalibration(!showCalibration);
                  if (!showCalibration) {
                    setShowOriginal(true); // Força ver o original ao calibrar
                  }
                }}
                className={`flex items-center space-x-2 p-2 rounded-lg border transition-colors ${
                  showCalibration 
                    ? 'border-indigo-500 text-indigo-400 bg-slate-950' 
                    : 'border-slate-700/50 text-slate-500 hover:text-indigo-400 hover:border-indigo-500'
                }`}
                title="Modo Calibração Visual"
              >
                <Settings className="w-4 h-4" />
                <span className="text-xs font-bold tracking-widest hidden md:inline">
                  {showCalibration ? 'FECHAR CALIBRAÇÃO' : 'CALIBRAR VISUALMENTE'}
                </span>
              </button>

              {/* Botão Alternar Original/Processado */}
              {processedPdfUrl && !showCalibration && (
                <button
                  onClick={() => setShowOriginal(!showOriginal)}
                  className="flex items-center space-x-2 p-2 rounded-lg border border-slate-700/50 text-slate-500 hover:text-indigo-400 hover:border-indigo-500 transition-colors"
                  title={showOriginal ? 'Ver processado' : 'Ver original'}
                >
                  {showOriginal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}

              {/* Botão Limpar Boleto */}
              <button
                onClick={handleCleanBoleto}
                disabled={isProcessing}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-xs tracking-widest hover:bg-indigo-500 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="animate-spin">⏳</span>
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                <span>{isProcessing ? 'PROCESSANDO...' : 'LIMPAR BOLETO'}</span>
              </button>

              {/* Botão Download e Campo de Nome */}
              {processedPdfUrl && (
                <div className="flex items-center space-x-2 bg-slate-950 rounded-lg p-1 border border-slate-700/50">
                  <input 
                    type="text" 
                    value={fileName}
                    onChange={e => setFileName(e.target.value)}
                    placeholder="Nome do arquivo"
                    className="bg-transparent text-slate-200 text-xs font-serif px-2 w-32 md:w-64 outline-none"
                    title="Nome do arquivo para download"
                  />
                  <span className="text-slate-500 text-xs pr-2 hidden md:inline">.pdf</span>
                  <button
                    onClick={handleDownload}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-700 text-white rounded-md font-bold text-xs tracking-widest hover:bg-green-600 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span className="hidden md:inline">DOWNLOAD</span>
                  </button>
                </div>
              )}

              {/* Botão Novo Boleto */}
              <button
                onClick={handleReset}
                className="p-2 rounded-lg border border-slate-700/50 text-red-400 hover:text-red-300 hover:border-red-400 transition-colors"
                title="Novo boleto"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Painel de Calibração Numérica (apenas no modo calibração) */}
          {showCalibration && (
            <div className="bg-slate-900 border border-indigo-500 rounded-xl p-4 space-y-4 shadow-xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-xs font-bold tracking-widest text-indigo-400 uppercase flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Calibração Visual (Drag & Drop)</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Arraste ou redimensione os quadrados vermelhos sobre o PDF abaixo para censurar os campos corretos.
                  </p>
                </div>
                
                <div className="flex space-x-2">
                  <button 
                    onClick={addNewArea}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-900 border border-slate-700/50 text-slate-500 hover:bg-slate-800 hover:text-indigo-400 hover:border-indigo-500 rounded-lg font-bold text-xs tracking-widest transition-colors"
                  >
                    <span>+ NOVA ÁREA</span>
                  </button>
                  <button 
                    onClick={saveToLocalStorage}
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-slate-950 border border-indigo-500 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-lg font-bold text-xs tracking-widest transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    <span>SALVAR PADRÃO</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-3 border-t border-slate-700/50">
                {redactionAreas.map(area => (
                  <div key={area.id} className="flex flex-wrap items-center gap-2 text-xs bg-slate-800 p-2 rounded-lg border border-slate-700/50">
                    <label className="flex items-center space-x-2 min-w-[140px] flex-1">
                      <input
                        type="checkbox"
                        checked={area.enabled}
                        onChange={e => updateArea(area.id, 'enabled', e.target.checked)}
                        className="accent-indigo-500"
                      />
                      <input
                        type="text"
                        value={area.label}
                        onChange={e => updateArea(area.id, 'label', e.target.value)}
                        className="bg-transparent border-b border-transparent focus:border-indigo-500 text-slate-200 font-serif tracking-wide truncate outline-none w-full"
                      />
                    </label>
                    <div className="flex space-x-2 items-center">
                      {(['x', 'y', 'width', 'height'] as const).map(field => (
                        <label key={field} className="flex items-center space-x-1">
                          <span className="text-slate-500 uppercase">{field.charAt(0)}:</span>
                          <input
                            type="number"
                            value={area[field] as number}
                            onChange={e => updateArea(area.id, field, Number(e.target.value))}
                            className="w-12 md:w-14 bg-slate-950 border border-slate-700/50 rounded px-1 py-1 text-slate-200 text-center focus:border-indigo-500 outline-none"
                          />
                        </label>
                      ))}
                      <button onClick={() => removeArea(area.id)} className="text-red-500 hover:text-red-400 p-1 ml-1" title="Remover área">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Preview do PDF e Editor Visual */}
          <div className="bg-slate-900 border border-slate-700/50 rounded-xl overflow-hidden shadow-xl">
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700/50">
              <span className="text-xs font-bold tracking-widest text-slate-500 uppercase">
                {showCalibration ? '🛠 Editor Visual de Calibração' : (processedPdfUrl && !showOriginal ? '📄 Boleto Limpo (Processado)' : '📄 Boleto Original')}
              </span>
            </div>
            
            <div className="w-full h-[75vh] overflow-auto bg-slate-950 flex justify-center p-4 md:p-8 custom-scrollbar relative">
              <div 
                ref={pdfContainerRef}
                style={{ width: pageRenderWidth, height: pageRenderHeight }} 
                className="relative bg-white shadow-2xl"
              >
                {/* O PDF como imagem de fundo */}
                <Document
                  file={showCalibration || showOriginal || !processedPdfUrl ? pdfPreviewUrl : processedPdfUrl}
                  loading={<div className="text-indigo-400 font-serif tracking-widest animate-pulse flex items-center justify-center h-full">Carregando PDF...</div>}
                  error={<div className="text-red-400 font-serif tracking-widest flex items-center justify-center h-full">Erro ao carregar o PDF.</div>}
                >
                  <Page 
                    pageNumber={1} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    width={pageRenderWidth}
                  />
                </Document>

                {/* Overlays interativos para calibração usando react-rnd */}
                {showCalibration && redactionAreas.filter(a => a.enabled).map(area => {
                  const screenPos = getScreenPos(area);
                  return (
                    <Rnd
                      key={area.id}
                      size={{ width: screenPos.width, height: screenPos.height }}
                      position={{ x: screenPos.x, y: screenPos.y }}
                      onDragStop={(e, d) => {
                        updateAreaFromScreen(area.id, d.x, d.y, screenPos.width, screenPos.height);
                      }}
                      onResizeStop={(e, direction, ref, delta, position) => {
                        updateAreaFromScreen(
                          area.id,
                          position.x,
                          position.y,
                          parseFloat(ref.style.width),
                          parseFloat(ref.style.height)
                        );
                      }}
                      bounds="parent"
                      className="border-2 border-dashed border-red-500 bg-red-500/30 flex flex-col items-start justify-start cursor-move z-10 transition-colors hover:bg-red-500/40 hover:border-red-400 group"
                    >
                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {area.label}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-gray-900"></div>
                      </div>
                    </Rnd>
                  );
                })}
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
