import React from 'react';

export const ErrorLogViewer = ({ errorLog, onClose }: { errorLog: string | null, onClose: () => void }) => {
  if (!errorLog) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-red-500 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-red-900/50">
          <h3 className="text-red-400 font-bold tracking-widest text-sm flex items-center space-x-2">
            <span>🚨 LOG COMPLETO DE ERRO</span>
          </h3>
          <div className="flex space-x-2">
            <button 
              onClick={() => navigator.clipboard.writeText(errorLog)}
              className="px-3 py-1 bg-red-900/30 hover:bg-red-900/50 text-red-300 rounded border border-red-800 text-xs transition-colors"
            >
              COPIAR LOG
            </button>
            <button 
              onClick={onClose}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-950 text-slate-200 rounded border border-slate-700/50 text-xs transition-colors"
            >
              FECHAR
            </button>
          </div>
        </div>
        <div className="p-4 overflow-auto">
          <p className="text-gray-400 text-xs mb-4">
            Copie o texto abaixo e envie para a IA analisar o motivo exato da falha na Vercel:
          </p>
          <pre className="text-[11px] font-mono text-red-200 bg-black p-4 rounded border border-red-900/30 whitespace-pre-wrap break-all">
            {errorLog}
          </pre>
        </div>
      </div>
    </div>
  );
};
