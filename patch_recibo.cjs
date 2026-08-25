const fs = require('fs');

let content = fs.readFileSync('src/ReciboApp.tsx', 'utf8');

const processReciboPdf = `
  const processReciboPdfExtraction = async (base64: string) => {
    setIsExtractingRecibo(true);
    try {
      const res = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${await auth.currentUser?.getIdToken()}\`
        },
        body: JSON.stringify({
          pdfBase64: base64,
          type: 'recibo'
        })
      });
      
      const contentType = res.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await res.text();
        setErrorLog(\`Erro ao extrair RECIBO: A Vercel (ou o servidor) retornou um conteúdo que não é JSON.\nStatus da Resposta: \${res.status} \${res.statusText}\nContent-Type recebido: \${contentType || 'Nenhum'}\n\n--- CORPO DA RESPOSTA (HTML ou Texto) ---\n\${text}\`);
        throw new SyntaxError("O servidor retornou HTML. O arquivo pode ser muito grande para o proxy ou ocorreu timeout.");
      }

      const resData = await res.json();
      if (!res.ok || resData.error) {
        showToast(resData.error || 'Erro na extração do recibo.', 'error');
        setReciboStatus({ message: \`EXTRAÇÃO FALHOU APÓS \${resData.attempts || 1} TENTATIVA(S)\`, type: 'error' });
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
           let formattedMesAno = data.mesAno;
           if (formattedMesAno && formattedMesAno.includes('/')) {
             const parts = formattedMesAno.split('/');
             if (parts.length === 2) {
               formattedMesAno = \`\${parts[1]}-\${parts[0].padStart(2, '0')}\`;
             }
           }
           setDadosEmpresa(prev => ({ ...prev, mesAno: formattedMesAno }));
        }

        showToast('Dados do recibo importados!', 'success');
        setReciboStatus({ message: \`SUCESSO (\${resData.attempts || 1} TENTATIVA(S))\`, type: 'success' });
        setStep(2);
      }
    } catch (e: any) {
      console.error('Erro na extração:', e);
      showToast(e.message || 'Erro de Código/Rede. Tente anexar novamente.', 'error');
      setReciboStatus({ message: 'ERRO INTERNO', type: 'error' });
      setErrorLog(prev => prev ? prev : \`Erro de Código/Rede (RECIBO):\nTipo de Erro: \${e?.name || 'Unknown'}\nMensagem: \${e?.message || String(e)}\n\nStack Trace:\n\${e?.stack || 'N/A'}\`);
    } finally {
      setIsExtractingRecibo(false);
    }
  };
`;

content = content.replace('  const handleReciboUpload = async', processReciboPdf + '\n  const handleReciboUpload = async');

const handleReciboUploadReplacement = `
  const handleReciboUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      file = e.dataTransfer.files?.[0];
    } else if (e.target && 'files' in e.target) {
      file = (e.target as HTMLInputElement).files?.[0];
    }
    if (!file) return;
    
    try {
      const base64 = await getTrimmedPdfBase64(file as File, 3); // 3 pages max for Recibo
      await processReciboPdfExtraction(base64);
    } catch (e: any) {
      showToast(e.message || 'Erro ao ler arquivo.', 'error');
    }
    if (e.target && 'value' in e.target) (e.target as HTMLInputElement).value = '';
  };
`;

content = content.replace(/  const handleReciboUpload = async \([\s\S]*?    if \(e\.target && 'value' in e\.target\) \(e\.target as HTMLInputElement\)\.value = '';\n  \};/, handleReciboUploadReplacement.trim());


const newUseEffect = `
  useEffect(() => {
    const aiPayload = localStorage.getItem('@app:ai_generated_recibo');
    if (aiPayload) {
      try {
        const payload = JSON.parse(aiPayload);
        
        // ZERAR DADOS PRIMEIRO
        setDadosEmpresa({ nome: '', cnpj: '', endereco: '', mesAno: new Date().toISOString().slice(0, 7), geracaoEmLote: false, mesAnoFinal: '' });
        setDadosFuncionario({ codigo: '', nome: '', funcao: '', cbo: '', numeroDependentes: 0, salarioBaseContratual: undefined, diasTrabalhados: undefined });
        setRubricas([{ codigo: 2001, descricao: 'DIAS NORMAIS', referencia: '30', valor: 0, tipo: 'provento' }]);

        if (payload.pdfBase64) {
          processReciboPdfExtraction(payload.pdfBase64);
          if (payload.pdfName) showToast(\`Extraindo dados do PDF: \${payload.pdfName}\`, 'success');
        } else {
          let formattedMesAno = payload.mesAno || '';
          if (formattedMesAno && formattedMesAno.includes('/')) {
            const parts = formattedMesAno.split('/');
            if (parts.length === 2) {
              formattedMesAno = \`\${parts[1]}-\${parts[0].padStart(2, '0')}\`;
            }
          }
          // Pre-fill data
          setDadosEmpresa(prev => ({
            ...prev,
            nome: payload.empresaNome || prev.nome,
            mesAno: formattedMesAno || prev.mesAno
          }));
          
          setDadosFuncionario(prev => ({
             ...prev,
             nome: payload.nomeFuncionario || prev.nome,
             salarioBaseContratual: payload.salarioBaseContratual ? Number(payload.salarioBaseContratual) : undefined,
             diasTrabalhados: payload.diasTrabalhados ? Number(payload.diasTrabalhados) : undefined
          }));
          
          const numSalario = typeof payload.salarioBaseContratual === 'string' 
             ? parseFloat(payload.salarioBaseContratual.replace(/[^\\d.,]/g, '').replace(/\\./g, '').replace(',', '.')) 
             : payload.salarioBaseContratual;
            
          const numDias = payload.diasTrabalhados || 30;
          
          const numValor = typeof payload.valor === 'string'
            ? parseFloat(payload.valor.replace(/[^\\d.,]/g, '').replace(/\\./g, '').replace(',', '.'))
            : payload.valor;

          if (numValor || payload.referenteA) {
            setRubricas([
              { 
                 codigo: 2001, 
                 descricao: payload.referenteA || 'DIAS NORMAIS', 
                 referencia: numDias.toString(), 
                 valor: numValor || (numSalario ? (numSalario / 30) * numDias : 0), 
                 tipo: 'provento' 
               }
            ]);
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
`;

content = content.replace(/  useEffect\(\(\) => \{\n    const aiPayload = localStorage\.getItem\('@app:ai_generated_recibo'\);[\s\S]*?      \}\n    \}\n  \}, \[\]\);/, newUseEffect.trim());

fs.writeFileSync('src/ReciboApp.tsx', content, 'utf8');

