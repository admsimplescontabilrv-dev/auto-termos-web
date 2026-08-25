const fs = require('fs');

let content = fs.readFileSync('src/TrctApp.tsx', 'utf8');

// We need to inject processPdfExtraction
const extractFunction = `
  const processPdfExtraction = async (base64: string) => {
    setIsExtracting(true);
    try {
      const response = await fetch('/api/extract-pdf', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': \`Bearer \${await auth.currentUser?.getIdToken()}\`
        },
        body: JSON.stringify({ 
          pdfBase64: base64,
          type: 'trct'
        })
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        setErrorLog(\`Erro ao extrair TRCT: A Vercel (ou o servidor) retornou um conteúdo que não é JSON.\nStatus da Resposta: \${response.status} \${response.statusText}\nContent-Type recebido: \${contentType || 'Nenhum'}\n\n--- CORPO DA RESPOSTA (HTML ou Texto) ---\n\${text}\`);
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
              const val = parseFloat(String(data[key]).replace(/[^\\d.,]/g, '').replace(',', '.'));
              (newForm as any)[key] = isNaN(val) ? 0 : val;
            } else if (data[key] !== null && data[key] !== undefined) {
              (newForm as any)[key] = String(data[key]).toUpperCase();
            }
          }
        });

        // Formata as datas caso venham no formato DD/MM/YYYY
        ['dataAdmissao', 'dataAfastamento', 'dataAvisoPrevio', 'dataNascimento'].forEach(dateKey => {
            let val = (newForm as any)[dateKey];
            if (val && val.includes('/')) {
                const parts = val.split('/');
                if (parts.length === 3) {
                    (newForm as any)[dateKey] = \`\${parts[2]}-\${parts[1].padStart(2, '0')}-\${parts[0].padStart(2, '0')}\`;
                }
            }
        });

        setFormData(newForm);
        showNotification('Dados importados com sucesso!');
      }
    } catch (e: any) {
      console.error('Erro ao extrair TRCT:', e);
      setErrorLog(prev => prev ? prev : \`Erro de Código/Rede (TRCT):\nTipo de Erro: \${e?.name || 'Unknown'}\nMensagem: \${e?.message || String(e)}\n\nStack Trace:\n\${e?.stack || 'N/A'}\`);
      showNotification(e.message || 'Erro ao importar.', 'error');
    } finally {
      setIsExtracting(false);
    }
  };
`;

// Insert the extract function before handlePdfUpload
content = content.replace('  const handlePdfUpload = async', extractFunction + '\n  const handlePdfUpload = async');

// Update handlePdfUpload to use processPdfExtraction
const handlePdfUploadReplacement = `
  const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>) => {
    e.preventDefault();
    let file: File | null = null;
    if ('dataTransfer' in e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) file = e.dataTransfer.files[0];
    } else if ('target' in e && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }
    if (!file || file.type !== 'application/pdf') return;

    try {
      const base64 = await getTrimmedPdfBase64(file as File, 4); // 4 pages max for TRCT
      await processPdfExtraction(base64);
    } catch (e: any) {
      console.error('Erro getTrimmedPdfBase64 TRCT:', e);
      showNotification(e.message || 'Erro ao ler PDF.', 'error');
    } finally {
      if (e.target && 'value' in e.target) (e.target as HTMLInputElement).value = '';
    }
  };
`;

content = content.replace(/  const handlePdfUpload = async \([\s\S]*?    \} finally \{\n      setIsExtracting\(false\);\n      if \(e\.target && 'value' in e\.target\) \(e\.target as HTMLInputElement\)\.value = '';\n    \}\n  \};/, handlePdfUploadReplacement.trim());

// Update useEffect to start from scratch and call processPdfExtraction if pdfBase64 is present
const newUseEffect = `
  useEffect(() => {
    const aiPayload = localStorage.getItem('@app:ai_generated_trct');
    if (aiPayload) {
      try {
        const payload = JSON.parse(aiPayload);
        
        // ZERAR OS DADOS PRIMEIRO (SEMPRE COMEÇAR DO ZERO QUANDO A IA GERAR NOVO TERMO)
        setFormData({
          cnpj: '', razaoSocial: '', enderecoEmpresa: '', bairroEmpresa: '', municipioEmpresa: '', ufEmpresa: '', cepEmpresa: '', cnae: '',
          pis: '', nome: '', enderecoTrabalhador: '', bairroTrabalhador: '', municipioTrabalhador: '', ufTrabalhador: '', cepTrabalhador: '', ctps: '', cpf: '', dataNascimento: '', nomeMae: '',
          tipoContrato: '', causaAfastamento: '', remuneracaoMesAnterior: 0, dataAdmissao: '', dataAvisoPrevio: '', dataAfastamento: '', codigoAfastamento: '', pensaoAlimenticia: 0, pensaoAlimenticiaFGTS: 0, sindicato: '', cnpjSindicato: '',
          proventos: [{ id: 'prov-1', codigo: '50', descricao: 'Saldo de Salário', valor: 0 }],
          descontos: [{ id: 'desc-1', codigo: '112.1', descricao: 'Previdência Social', valor: 0 }],
          dataFimContrato: ''
        });
        setDescontarINSS(false);
        setRescisaoAntecipada(false);

        if (payload.pdfBase64) {
          // Extrair dados diretamente do PDF
          processPdfExtraction(payload.pdfBase64);
          if (payload.pdfName) {
            showNotification(\`Extraindo dados do PDF: \${payload.pdfName}\`, 'success');
          }
          setActiveTab(2);
        } else {
          // Mapeamento normal dos dados JSON do Gemini
          let formattedAfastamento = payload.dataAfastamento || '';
          if (formattedAfastamento && formattedAfastamento.includes('/')) {
            const parts = formattedAfastamento.split('/');
            if (parts.length === 3) {
              formattedAfastamento = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
            }
          }
          
          let formattedAdmissao = payload.dataAdmissao || '';
          if (formattedAdmissao && formattedAdmissao.includes('/')) {
            const parts = formattedAdmissao.split('/');
            if (parts.length === 3) {
              formattedAdmissao = \`\${parts[2]}-\${parts[1]}-\${parts[0]}\`;
            }
          }

          const numRemuneracao = typeof payload.remuneracaoMesAnterior === 'string'
            ? parseFloat(payload.remuneracaoMesAnterior.replace(/[^\\d.,]/g, '').replace(/\\./g, '').replace(',', '.'))
            : payload.remuneracaoMesAnterior;

          setFormData(prev => ({
            ...prev,
            cnpj: payload.cnpj || prev.cnpj,
            razaoSocial: payload.razaoSocial || prev.razaoSocial,
            enderecoEmpresa: payload.enderecoEmpresa || prev.enderecoEmpresa,
            municipioEmpresa: payload.municipioEmpresa || prev.municipioEmpresa,
            cpf: payload.cpf || prev.cpf,
            pis: payload.pis || prev.pis,
            ctps: payload.ctps || prev.ctps,
            nome: payload.nome || prev.nome,
            dataAdmissao: formattedAdmissao || prev.dataAdmissao,
            dataAfastamento: formattedAfastamento || prev.dataAfastamento,
            causaAfastamento: payload.causaAfastamento || payload.motivo || prev.causaAfastamento,
            remuneracaoMesAnterior: numRemuneracao || prev.remuneracaoMesAnterior
          }));
          
          if (payload.descontarINSS !== undefined) setDescontarINSS(payload.descontarINSS);
          if (payload.rescisaoAntecipada !== undefined) setRescisaoAntecipada(payload.rescisaoAntecipada);
          if (payload.dataAfastamento || payload.dataAdmissao) setActiveTab(2); // Vai direto para dados do contrato
          showNotification('Dados pré-preenchidos pela IA.', 'success');
        }

        localStorage.removeItem('@app:ai_generated_trct');
      } catch (e) {
        console.error('Erro ao ler payload da IA:', e);
      }
    }
  }, []);
`;

content = content.replace(/  useEffect\(\(\) => \{\n    const aiPayload = localStorage\.getItem\('@app:ai_generated_trct'\);[\s\S]*?      \}\n    \}\n  \}, \[\]\);/, newUseEffect.trim());

fs.writeFileSync('src/TrctApp.tsx', content, 'utf8');
