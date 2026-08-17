import React, { useState } from 'react';
import { Send, Bot, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { db } from './lib/firebase';
import { collection, addDoc, getDocs } from 'firebase/firestore';

export default function DashboardApp() {
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsProcessing(true);
    setNotification(null);

    try {
      // Fetch empresas and sindicatos to pass context to the AI
      const empresasSnapshot = await getDocs(collection(db, 'empresas'));
      const empresas = empresasSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const sindicatosSnapshot = await getDocs(collection(db, 'sindicatos'));
      const sindicatos = sindicatosSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const response = await fetch('/api/ai-hub', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': 'Simples@2026'
        },
        body: JSON.stringify({
          prompt,
          context: {
            empresas,
            sindicatos
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Falha na resposta do servidor.');
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Add to firestore
      const ruleData = data.rule;
      if (ruleData) {
        await addDoc(collection(db, 'checklist_rules'), ruleData);
        setNotification({ type: 'success', message: 'Regra adicionada com sucesso!' });
        setPrompt('');
      } else {
         throw new Error('Formato de resposta inválido do assistente.');
      }

    } catch (error: any) {
      console.error('Error processing AI command:', error);
      setNotification({ type: 'error', message: error.message || 'Erro ao processar o comando.' });
    } finally {
      setIsProcessing(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  return (
    <div className="flex-1 w-full max-w-4xl mx-auto p-6 md:p-8 flex flex-col items-center justify-center min-h-[80vh]">
      {/* Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl border flex items-center space-x-3 shadow-2xl transition-all duration-300 ${
          notification.type === 'success' 
            ? 'bg-[#18060B] border-[#C49B4A] text-[#D1A751]' 
            : 'bg-[#18060B] border-red-500 text-red-400'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <span className="text-sm font-medium tracking-wide pr-8">{notification.message}</span>
        </div>
      )}

      <div className="w-full text-center mb-10">
        <Bot className="w-16 h-16 text-[#C49B4A] mx-auto mb-4" />
        <h1 className="text-3xl md:text-4xl font-serif text-[#C49B4A] tracking-wider mb-3">AI HUB</h1>
        <p className="text-[#A68759] font-light max-w-lg mx-auto">
          Descreva o que você precisa. Por exemplo: "Adicione uma regra de folha na empresa Supermercado Zezinho para checar o adiantamento do salário do gerente todo mês"
        </p>
      </div>

      <div className="w-full bg-[#18060B] border border-[#4A1828] rounded-2xl p-6 shadow-2xl shadow-[#110408]/80">
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            disabled={isProcessing}
            placeholder="Digite seu comando..."
            className="w-full bg-[#0C0305] border border-[#3A1221] text-[#D1A751] rounded-xl p-4 min-h-[120px] resize-none focus:outline-none focus:border-[#C49B4A] transition-colors"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isProcessing || !prompt.trim()}
              className="bg-[#C49B4A] hover:bg-[#D1A751] text-[#1E0810] font-bold tracking-widest uppercase px-6 py-3 rounded-lg flex items-center space-x-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>PROCESSANDO...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>ENVIAR ORDEM</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
