import React, { useState, useEffect } from 'react';
import { db, auth } from './lib/firebase';
import { collection, addDoc, updateDoc, doc, deleteDoc, onSnapshot, getDoc, getDocs, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Empresa, Sindicato } from './types';
import { 
  Plus, Trash2, Building, Building2, Pencil, X, AlertTriangle, Search, FileText, 
  ExternalLink, BookOpen, CheckCircle2, Upload, RefreshCw, FolderSync, Folder, 
  FolderCheck, Check, Loader2, Sparkles, Copy, ChevronDown, ChevronUp, Info, ShieldCheck,
  Cloud, UserMinus
} from 'lucide-react';
import { isCompanyInExcludedDprhList, EXCLUDED_DPRH_COMPANIES } from './data/excludedDprhCompanies';

interface EmpresasAppProps {
  entityToEdit?: { id: string, type: 'EMPRESA' | 'SINDICATO' } | null;
  clearEntityToEdit?: () => void;
  initialTab?: 'EMPRESAS' | 'SINDICATOS';
}

export default function EmpresasApp({ entityToEdit, clearEntityToEdit, initialTab = 'EMPRESAS' }: EmpresasAppProps) {
  const [activeTab, setActiveTab] = useState<'EMPRESAS' | 'SINDICATOS'>(initialTab);
  
  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [sindicatos, setSindicatos] = useState<Sindicato[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuloFilter, setSelectedModuloFilter] = useState<string>('TODOS');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSindicato, setEditingSindicato] = useState<Partial<Sindicato> | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<Partial<Empresa> | null>(null);

  const [confirmModal, setConfirmModal] = useState<{ isOpen: boolean, action: () => void, message: string } | null>(null);
  
  const [isSindicatoDropdownOpen, setIsSindicatoDropdownOpen] = useState(false);

  // Google Drive Sync & Folder Creation State
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [driveFolderId, setDriveFolderId] = useState(() => localStorage.getItem('google_drive_folder_id') || '');
  const [isSyncingDrive, setIsSyncingDrive] = useState(false);
  const [syncDriveResult, setSyncDriveResult] = useState<any>(null);
  const [driveStatus, setDriveStatus] = useState<{ configured: boolean, clientEmail?: string | null, defaultFolderId?: string }>({ configured: false });
  const [showAdvancedDriveConfig, setShowAdvancedDriveConfig] = useState(false);
  const [customCredentialsInput, setCustomCredentialsInput] = useState('');
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [creatingFolderEmpresaId, setCreatingFolderEmpresaId] = useState<string | null>(null);
  const [isCreatingFolderModal, setIsCreatingFolderModal] = useState(false);

  // DPRH Exclusions State
  const [isExcludingDprh, setIsExcludingDprh] = useState(false);
  const [hasExcludedDprhCleaned, setHasExcludedDprhCleaned] = useState(false);

  // Toast State
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Auto-ajuste no banco de dados: empresas com código repetido têm o código alterado para '0'
  useEffect(() => {
    if (empresas.length === 0) return;

    // Agrupa empresas por código válido (ignora códigos vazios e '0')
    const codeMap = new Map<string, Empresa[]>();
    empresas.forEach(emp => {
      const cod = (emp.codigo !== undefined && emp.codigo !== null ? String(emp.codigo) : '').trim();
      if (cod && cod !== '0') {
        if (!codeMap.has(cod)) codeMap.set(cod, []);
        codeMap.get(cod)!.push(emp);
      }
    });

    const empresasComCodigoRepetido: Empresa[] = [];
    codeMap.forEach((lista) => {
      if (lista.length > 1) {
        empresasComCodigoRepetido.push(...lista);
      }
    });

    if (empresasComCodigoRepetido.length > 0) {
      const resetDuplicateCodes = async () => {
        try {
          const batch = writeBatch(db);
          for (const emp of empresasComCodigoRepetido) {
            batch.update(doc(db, 'empresas', emp.id), {
              codigo: '0',
              updatedAt: Date.now()
            });
          }
          await batch.commit();
          console.log(`[Ajuste de Códigos] ${empresasComCodigoRepetido.length} empresas com código repetido foram alteradas para '0' no Firestore.`);
          setToastMessage(`Aviso: ${empresasComCodigoRepetido.length} empresa(s) com códigos repetidos tiveram o código alterado para 0 no banco de dados.`);
          setTimeout(() => setToastMessage(null), 6000);
        } catch (err) {
          console.error('Erro ao atualizar códigos repetidos para 0 no Firestore:', err);
        }
      };
      resetDuplicateCodes();
    }
  }, [empresas]);

  // CCT Management State
  const [cctModalSindicato, setCctModalSindicato] = useState<Sindicato | null>(null);
  const [cctTexto, setCctTexto] = useState('');
  const [cctLoading, setCctLoading] = useState(false);
  const [cctSaving, setCctSaving] = useState(false);
  const [cctSuccessMessage, setCctSuccessMessage] = useState('');
  const [cctSearchTerm, setCctSearchTerm] = useState('');
  const [cctUpdatedAt, setCctUpdatedAt] = useState<Date | null>(null);


  const openCctModal = async (sindicato: Sindicato) => {
    setCctModalSindicato(sindicato);
    setCctTexto('');
    setCctLoading(true);
    setCctSuccessMessage('');
    setCctSearchTerm('');
    setCctUpdatedAt(null);
    try {
      const cctDoc = await getDoc(doc(db, 'sindicatos', sindicato.id, 'cct_textos', 'vigente'));
      if (cctDoc.exists()) {
        const data = cctDoc.data();
        setCctTexto(data.texto_puro || '');
        if (data.updatedAt) {
          setCctUpdatedAt(data.updatedAt.toDate ? data.updatedAt.toDate() : new Date(data.updatedAt));
        }
      } else {
        setCctTexto('');
      }
    } catch (err) {
      console.error('Erro ao buscar CCT:', err);
    } finally {
      setCctLoading(false);
    }
  };

  const handleSaveCct = async () => {
    if (!cctModalSindicato) return;
    setCctSaving(true);
    try {
      await setDoc(doc(db, 'sindicatos', cctModalSindicato.id, 'cct_textos', 'vigente'), {
        texto_puro: cctTexto,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setCctUpdatedAt(new Date());
      setCctSuccessMessage('Convenção Coletiva (CCT) salva com sucesso! A IA já utilizará esta nova base.');
      setTimeout(() => setCctSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Erro ao salvar CCT:', err);
      alert('Erro ao salvar CCT: ' + err);
    } finally {
      setCctSaving(false);
    }
  };

  const handleFileUploadCct = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setCctTexto(text);
        setCctSuccessMessage(`Arquivo "${file.name}" carregado no editor! Clique em "Salvar CCT" para confirmar.`);
        setTimeout(() => setCctSuccessMessage(''), 4000);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  useEffect(() => {
    const unsubSindicatos = onSnapshot(collection(db, 'sindicatos'), (snapshot) => {
      setSindicatos(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Sindicato)));
    });
    
    const unsubEmpresas = onSnapshot(collection(db, 'empresas'), (snapshot) => {
      setEmpresas(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Empresa)));
    });

    return () => {
      unsubSindicatos();
      unsubEmpresas();
    };
  }, []);

  // Auto-remoção do módulo DP & RH para as empresas indicadas
  useEffect(() => {
    if (empresas.length > 0 && !hasExcludedDprhCleaned) {
      setHasExcludedDprhCleaned(true);
      const toClean = empresas.filter(emp => {
        if (!isCompanyInExcludedDprhList(emp)) return false;
        const currentMods = Array.isArray(emp.modulosResponsavel) && emp.modulosResponsavel.length > 0 
          ? emp.modulosResponsavel 
          : ['DP & RH'];
        return currentMods.includes('DP & RH');
      });

      if (toClean.length > 0) {
        const runBatch = async () => {
          try {
            const batch = writeBatch(db);
            for (const emp of toClean) {
              const currentMods = Array.isArray(emp.modulosResponsavel) && emp.modulosResponsavel.length > 0 
                ? emp.modulosResponsavel 
                : ['DP & RH'];
              const filtered = currentMods.filter(m => m !== 'DP & RH' && m !== 'DP' && m !== 'RH');
              batch.update(doc(db, 'empresas', emp.id), {
                modulosResponsavel: filtered.length > 0 ? filtered : ['OUTROS'],
                updatedAt: Date.now()
              });
            }
            await batch.commit();
            console.log(`[Auto-Sincronização] ${toClean.length} empresas tiveram DP & RH removido no Firestore.`);
          } catch (e) {
            console.warn('[Auto-Sincronização] Erro na sincronização preventiva:', e);
          }
        };
        runBatch();
      }
    }
  }, [empresas, hasExcludedDprhCleaned]);

  const handleExcluirEmpresasDprhBanco = async () => {
    setIsExcludingDprh(true);
    try {
      const batch = writeBatch(db);
      let count = 0;

      for (const emp of empresas) {
        if (isCompanyInExcludedDprhList(emp)) {
          const currentMods: string[] = Array.isArray(emp.modulosResponsavel) && emp.modulosResponsavel.length > 0 
            ? emp.modulosResponsavel 
            : ['DP & RH'];
          
          if (currentMods.includes('DP & RH')) {
            const filtered = currentMods.filter(m => m !== 'DP & RH' && m !== 'DP' && m !== 'RH');
            const newMods = filtered.length > 0 ? filtered : ['OUTROS'];
            const docRef = doc(db, 'empresas', emp.id);
            batch.update(docRef, {
              modulosResponsavel: newMods,
              updatedAt: Date.now()
            });
            count++;
          }
        }
      }

      if (count > 0) {
        await batch.commit();
        setToastMessage(`Sucesso! ${count} empresa(s) tiveram o DP & RH removido no Firestore.`);
      } else {
        setToastMessage('Todas as empresas da lista já estão excluídas do módulo DP & RH.');
      }
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error('Erro ao excluir empresas do DP & RH:', err);
      alert('Erro ao atualizar banco: ' + (err.message || err));
    } finally {
      setIsExcludingDprh(false);
    }
  };

  const handleCreateDriveFolder = async (emp: Empresa) => {
    if (creatingFolderEmpresaId) return;
    setCreatingFolderEmpresaId(emp.id);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/create-drive-folder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          empresaId: emp.id,
          codigo: emp.codigo || '',
          nome: emp.nome
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar pastas no Google Drive.');
      }

      try {
        await updateDoc(doc(db, 'empresas', emp.id), {
          linkDrive: data.linkDrive,
          updatedAt: Date.now()
        });
      } catch (clientErr) {
        console.warn('Erro ao atualizar linkDrive via client SDK:', clientErr);
      }

      setEmpresas(prev => prev.map(e => e.id === emp.id ? { ...e, linkDrive: data.linkDrive } : e));
      if (editingEmpresa && editingEmpresa.id === emp.id) {
        setEditingEmpresa(prev => prev ? { ...prev, linkDrive: data.linkDrive } : null);
      }

      setToastMessage(`Pastas criadas com sucesso no Drive para ${emp.nome}!`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err: any) {
      console.error('Erro ao criar pasta no drive:', err);
      alert('Falha ao criar pastas no Google Drive: ' + (err.message || err));
    } finally {
      setCreatingFolderEmpresaId(null);
    }
  };

  const handleCreateDriveFolderInModal = async () => {
    if (!editingEmpresa?.nome) {
      alert('Informe o nome da empresa antes de criar a estrutura no Drive.');
      return;
    }
    if (editingEmpresa.id) {
      setIsCreatingFolderModal(true);
      try {
        const token = await auth.currentUser?.getIdToken();
        const res = await fetch('/api/create-drive-folder', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            empresaId: editingEmpresa.id,
            codigo: editingEmpresa.codigo || '',
            nome: editingEmpresa.nome
          })
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao criar pastas no Google Drive.');
        }

        try {
          await updateDoc(doc(db, 'empresas', editingEmpresa.id), {
            linkDrive: data.linkDrive,
            updatedAt: Date.now()
          });
        } catch (clientErr) {
          console.warn('Erro ao atualizar linkDrive no Firestore via SDK:', clientErr);
        }

        setEditingEmpresa(prev => prev ? { ...prev, linkDrive: data.linkDrive } : null);
        setEmpresas(prev => prev.map(e => e.id === editingEmpresa.id ? { ...e, linkDrive: data.linkDrive } : e));
        setToastMessage(`Pastas criadas com sucesso no Drive!`);
        setTimeout(() => setToastMessage(null), 5000);
      } catch (err: any) {
        console.error('Erro no modal Drive:', err);
        alert('Falha ao criar pastas: ' + (err.message || err));
      } finally {
        setIsCreatingFolderModal(false);
      }
    } else {
      alert('Salve o cadastro da empresa primeiro para gerar a pasta vinculada ao ID no Drive.');
    }
  };

  useEffect(() => {
    if (entityToEdit && (empresas.length > 0 || sindicatos.length > 0)) {
      if (entityToEdit.type === 'EMPRESA') {
        const emp = empresas.find(e => e.id === entityToEdit.id);
        if (emp) {
          setActiveTab('EMPRESAS');
          openEmpresaModal(emp);
          if (clearEntityToEdit) clearEntityToEdit();
        }
      } else if (entityToEdit.type === 'SINDICATO') {
        const sind = sindicatos.find(s => s.id === entityToEdit.id);
        if (sind) {
          setActiveTab('SINDICATOS');
          openSindicatoModal(sind);
          if (clearEntityToEdit) clearEntityToEdit();
        }
      }
    }
  }, [entityToEdit, empresas, sindicatos, clearEntityToEdit]);

  const openSindicatoModal = (sindicato?: Sindicato) => {
    if (sindicato) {
      setEditingSindicato(sindicato);
    } else {
      setEditingSindicato({ nome: '', cnpj: '', codigo: '', regiaoAtuacao: '' });
    }
    setIsModalOpen(true);
  };

  const openEmpresaModal = (empresa?: Empresa) => {
    if (empresa) {
      const isAtiva = (empresa.situacao || 'ATIVA') === 'ATIVA';
      setEditingEmpresa({
        ...empresa,
        codigo: empresa.codigo || '',
        regime: empresa.regime || 'SIMPLES',
        situacao: empresa.situacao || 'ATIVA',
        dataEntrada: empresa.dataEntrada || '',
        dataSaida: isAtiva ? '' : (empresa.dataSaida || ''),
        linkDrive: empresa.linkDrive || '',
        cidade: empresa.cidade || '',
        modulosResponsavel: empresa.modulosResponsavel && empresa.modulosResponsavel.length > 0 
          ? empresa.modulosResponsavel 
          : ['DP & RH']
      });
    } else {
      setEditingEmpresa({ 
        nome: '', 
        cnpj: '', 
        codigo: '', 
        sindicatoId: '', 
        telefone: '', 
        email: '', 
        enderecoCompleto: '',
        regime: 'SIMPLES',
        situacao: 'ATIVA',
        dataEntrada: '',
        dataSaida: '',
        linkDrive: '',
        cidade: '',
        modulosResponsavel: ['DP & RH']
      });
    }
    setIsModalOpen(true);
  };

  useEffect(() => {
    fetchDriveStatus();
  }, []);



  const fetchDriveStatus = async () => {
    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';
      const res = await fetch('/api/drive-status', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setDriveStatus(data);
        if (data.defaultFolderId && !driveFolderId) {
          setDriveFolderId(data.defaultFolderId);
        }
      }
    } catch (err) {
      console.warn('Erro ao verificar status do Drive:', err);
    }
  };

  const handleSyncDrive = async () => {
    if (!driveFolderId.trim()) {
      setToastMessage('Informe o ID ou link da pasta raiz do Google Drive.');
      setTimeout(() => setToastMessage(null), 4000);
      return;
    }

    setIsSyncingDrive(true);
    setSyncDriveResult(null);

    try {
      const user = auth.currentUser;
      const token = user ? await user.getIdToken() : '';

      localStorage.setItem('google_drive_folder_id', driveFolderId.trim());

      const companiesPayload = empresas.map(e => ({
        id: e.id,
        codigo: e.codigo || '',
        nome: e.nome || ''
      }));

      const payload: any = {
        folderId: driveFolderId.trim(),
        companies: companiesPayload
      };

      if (customCredentialsInput.trim()) {
        payload.credentialsJson = customCredentialsInput.trim();
      }

      const res = await fetch('/api/sync-drive', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao sincronizar com Google Drive.');
      }

      // Aplica as atualizações diretamente no Firestore através do SDK autenticado do cliente
      if (data.updatedCompanies && data.updatedCompanies.length > 0) {
        const batch = writeBatch(db);
        for (const item of data.updatedCompanies) {
          const docRef = doc(db, 'empresas', item.id);
          batch.update(docRef, {
            linkDrive: item.linkDrive,
            updatedAt: Date.now()
          });
        }
        await batch.commit();
      }

      setSyncDriveResult(data);
      setToastMessage(`✅ Sincronização concluída! ${data.matchedCount} empresa(s) vinculada(s) às pastas.`);
      setTimeout(() => setToastMessage(null), 7000);

    } catch (err: any) {
      console.error('Erro na sincronização:', err);
      setSyncDriveResult({ error: err.message || 'Falha ao sincronizar com Google Drive.' });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const handleSaveSindicato = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSindicato?.nome) return;

    const action = async () => {
      const data = {
        nome: editingSindicato.nome,
        cnpj: editingSindicato.cnpj || '',
        codigo: editingSindicato.codigo || '',
        validadeCCT: editingSindicato.validadeCCT || '',
        regiaoAtuacao: editingSindicato.regiaoAtuacao || '',
      };

      let sindicatoId = editingSindicato.id;

      if (sindicatoId) {
        await updateDoc(doc(db, 'sindicatos', sindicatoId), data);
      } else {
        const docRef = await addDoc(collection(db, 'sindicatos'), { ...data, createdAt: Date.now() });
        sindicatoId = docRef.id;
      }

      // Add Calendar Event for CCT
      if (data.validadeCCT) {
        const parts = data.validadeCCT.split('-');
        if (parts.length === 3) {
          const date = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          await addDoc(collection(db, 'calendarEvents'), {
            title: `Vencimento CCT: ${data.nome}`,
            description: `Data base / Vencimento CCT para o Sindicato ${data.nome}`,
            date: date.getTime(),
            type: 'VENCIMENTO_CCT',
            empresaId: sindicatoId,
            empresaNome: data.nome,
            status: 'ATIVO',
            createdAt: Date.now()
          });
        }
      }

      setIsModalOpen(false);
      setConfirmModal(null);
    };

    if (editingSindicato.id) {
      setConfirmModal({
        isOpen: true,
        message: `Tem certeza que deseja alterar os dados do sindicato "${editingSindicato.nome}"?\nIsso pode afetar empresas vinculadas e regras de checklist.`,
        action
      });
    } else {
      await action();
    }
  };

  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpresa?.nome) return;

    const sindicato = sindicatos.find(s => s.id === editingEmpresa.sindicatoId);
    const isAtiva = (editingEmpresa.situacao || 'ATIVA') === 'ATIVA';

    const action = async () => {
      const data = {
        nome: editingEmpresa.nome,
        cnpj: editingEmpresa.cnpj || '',
        codigo: editingEmpresa.codigo || '',
        sindicatoId: editingEmpresa.sindicatoId || '',
        sindicatoNome: sindicato ? sindicato.nome : '',
        telefone: editingEmpresa.telefone || '',
        email: editingEmpresa.email || '',
        enderecoCompleto: editingEmpresa.enderecoCompleto || '',
        regime: editingEmpresa.regime || 'SIMPLES',
        situacao: editingEmpresa.situacao || 'ATIVA',
        dataEntrada: editingEmpresa.dataEntrada || '',
        dataSaida: isAtiva ? '' : (editingEmpresa.dataSaida || ''),
        linkDrive: editingEmpresa.linkDrive || '',
        cidade: editingEmpresa.cidade || '',
        modulosResponsavel: editingEmpresa.modulosResponsavel && editingEmpresa.modulosResponsavel.length > 0
          ? editingEmpresa.modulosResponsavel
          : ['DP & RH']
      };

      if (editingEmpresa.id) {
        await updateDoc(doc(db, 'empresas', editingEmpresa.id), data);
      } else {
        await addDoc(collection(db, 'empresas'), { ...data, createdAt: Date.now() });
      }
      setIsModalOpen(false);
      setConfirmModal(null);
    };

    if (editingEmpresa.id) {
      setConfirmModal({
        isOpen: true,
        message: `Tem certeza que deseja alterar os dados da empresa "${editingEmpresa.nome}"?\nIsso pode afetar regras de checklist e relatórios.`,
        action
      });
    } else {
      await action();
    }
  };

  const handleDeleteSindicato = (id: string, nome: string) => {
    setConfirmModal({
      isOpen: true,
      message: `Tem certeza que deseja excluir o sindicato "${nome}"?\nEsta ação não pode ser desfeita.`,
      action: async () => {
        await deleteDoc(doc(db, 'sindicatos', id));
        setConfirmModal(null);
      }
    });
  };

  const handleDeleteEmpresa = (id: string, nome: string) => {
    setConfirmModal({
      isOpen: true,
      message: `Tem certeza que deseja excluir a empresa "${nome}"?\nEsta ação não pode ser desfeita.`,
      action: async () => {
        await deleteDoc(doc(db, 'empresas', id));
        setConfirmModal(null);
      }
    });
  };

  return (
    <div className="flex-1 w-full max-w-5xl mx-auto p-6 md:p-8 flex flex-col h-full animate-in fade-in zoom-in-95 duration-200">
      <h1 className="text-3xl font-medium text-indigo-400 tracking-wider mb-8 uppercase">Cadastrar</h1>
      
      <div className="flex border-b border-slate-700/50 mb-8 items-center justify-between">
        <div className="flex">
          <button
            onClick={() => setActiveTab('EMPRESAS')}
            className={`px-8 py-3 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'EMPRESAS' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-400'
            }`}
          >
            <Building className="w-4 h-4" />
            <span>EMPRESAS</span>
          </button>
          <button
            onClick={() => setActiveTab('SINDICATOS')}
            className={`px-8 py-3 text-sm font-bold tracking-widest uppercase border-b-2 transition-colors flex items-center space-x-2 ${
              activeTab === 'SINDICATOS' ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-500 hover:text-slate-400'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>SINDICATOS</span>
          </button>
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => activeTab === 'EMPRESAS' ? openEmpresaModal() : openSindicatoModal()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg shadow-black/20 shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>NOVO {activeTab === 'EMPRESAS' ? 'EMPRESA' : 'SINDICATO'}</span>
          </button>

          {activeTab === 'EMPRESAS' && (
            <>
              {/* Botão Sincronizar Pastas do Google Drive */}
              <button
                onClick={() => setIsDriveModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2 shadow-md shadow-emerald-950/40 border border-emerald-400/30 cursor-pointer text-sm"
                title="Sincronizar pastas das empresas no Google Drive pelo código"
              >
                <FolderSync className="w-4 h-4 text-emerald-100" />
                <span>Sincronizar Drive</span>
              </button>

              {/* Botão Sincronizar Exclusões DP & RH */}
              <button
                onClick={handleExcluirEmpresasDprhBanco}
                disabled={isExcludingDprh}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 px-4 py-2.5 rounded-lg font-medium transition-all flex items-center space-x-2 cursor-pointer text-sm shadow-sm"
                title="Excluir as 57 empresas especificadas do módulo DP & RH no banco de dados"
              >
                {isExcludingDprh ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <UserMinus className="w-4 h-4 text-rose-400" />
                )}
                <span>Exclusões DP & RH</span>
              </button>

            </>
          )}
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder={`Buscar ${activeTab.toLowerCase()}...`}
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 text-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors text-sm"
          />
        </div>
      </div>

      {activeTab === 'EMPRESAS' && (
        <div className="flex flex-wrap items-center gap-2 mb-5 pb-3 border-b border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1">Filtrar por Módulo:</span>
          {['TODOS', 'DP & RH', 'LEGALIZAÇÃO', 'FISCAL', 'CONTÁBIL', 'SOCIETÁRIO'].map(mod => {
            const isSelected = selectedModuloFilter === mod;
            return (
              <button
                key={mod}
                type="button"
                onClick={() => setSelectedModuloFilter(mod)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                  isSelected 
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm' 
                    : 'bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                }`}
              >
                {mod}
              </button>
            );
          })}
        </div>
      )}


      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {activeTab === 'SINDICATOS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sindicatos.filter(s => 
              s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (s.cnpj && s.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (s.regiaoAtuacao && s.regiaoAtuacao.toLowerCase().includes(searchTerm.toLowerCase()))
            ).map(s => {
              const linkedEmpresas = empresas.filter(e => e.sindicatoId === s.id);
              return (
              <div key={s.id} className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl flex flex-col transition-colors hover:border-slate-600">
                <div className="flex justify-between items-start w-full mb-3 gap-4">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-slate-200 text-lg mb-1 break-words leading-tight">{s.nome}</h3>
                    <div className="text-sm text-slate-400 space-y-1">
                      <p className="truncate">CNPJ: <span className="text-slate-300">{s.cnpj || '-'}</span></p>
                      <p className="truncate">Código: <span className="text-slate-300">{s.codigo || '-'}</span></p>
                      <p className="truncate">Região: <span className="text-slate-300">{s.regiaoAtuacao || '-'}</span></p>
                    </div>
                  </div>
                  <div className="flex space-x-2 shrink-0">
                    <button onClick={() => openSindicatoModal(s)} className="text-slate-500 hover:text-indigo-400 p-2 transition-colors">
                      <Pencil className="w-5 h-5" />
                    </button>
                    <button onClick={() => handleDeleteSindicato(s.id, s.nome)} className="text-slate-500 hover:text-red-500 p-2 transition-colors">
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
                <div className="pt-3 border-t border-slate-700/50 w-full mt-auto space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Empresas Vinculadas</p>
                    {linkedEmpresas.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {linkedEmpresas.map(emp => (
                          <span key={emp.id} className="text-xs bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md border border-indigo-500/20">
                            {emp.nome}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-500">Nenhuma empresa vinculada</p>
                    )}
                  </div>

                  <button
                    onClick={() => openCctModal(s)}
                    className="w-full py-2.5 px-3 bg-indigo-600/10 hover:bg-indigo-600/20 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-300 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm"
                  >
                    <FileText className="w-4 h-4 text-indigo-400" />
                    <span>Visualizar / Atualizar CCT (IA)</span>
                  </button>
                </div>
              </div>
            )})}
            {sindicatos.filter(s => 
              s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
              (s.cnpj && s.cnpj.toLowerCase().includes(searchTerm.toLowerCase())) ||
              (s.regiaoAtuacao && s.regiaoAtuacao.toLowerCase().includes(searchTerm.toLowerCase()))
            ).length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Nenhum sindicato encontrado.</div>}
          </div>
        )}

        {activeTab === 'EMPRESAS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {empresas.filter(e => {
              // Filtragem por módulo
              if (selectedModuloFilter !== 'TODOS') {
                const hasModulos = e.modulosResponsavel && e.modulosResponsavel.length > 0;
                if (hasModulos) {
                  if (!e.modulosResponsavel.includes(selectedModuloFilter)) return false;
                } else {
                  // Fallback para empresas legadas sem o array modulosResponsavel
                  if (selectedModuloFilter !== 'DP & RH') return false;
                }
              }

              const sindicato = sindicatos.find(s => s.id === e.sindicatoId);
              const search = searchTerm.toLowerCase();
              return (
                (e.nome && e.nome.toLowerCase().includes(search)) ||
                (e.cnpj && e.cnpj.toLowerCase().includes(search)) ||
                (e.codigo && e.codigo.toLowerCase().includes(search)) ||
                (e.regime && e.regime.toLowerCase().includes(search)) ||
                (e.situacao && e.situacao.toLowerCase().includes(search)) ||
                (sindicato && sindicato.regiaoAtuacao && sindicato.regiaoAtuacao.toLowerCase().includes(search)) ||
                (sindicato && sindicato.nome && sindicato.nome.toLowerCase().includes(search))
              );
            }).map(emp => {
              const sindicato = sindicatos.find(s => s.id === emp.sindicatoId);
              return (
                <div key={emp.id} className="bg-slate-800/50 border border-slate-700/50 p-5 rounded-xl flex flex-col justify-between transition-colors hover:border-slate-600 gap-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        {emp.codigo && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-semibold border border-slate-600/40">
                            #{emp.codigo}
                          </span>
                        )}
                        {emp.situacao && (
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            emp.situacao === 'ATIVA' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : emp.situacao === 'SUSPENSA'
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {emp.situacao}
                          </span>
                        )}
                        {emp.regime && (
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            {emp.regime}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-slate-200 text-lg mb-1 break-words leading-tight">{emp.nome}</h3>
                      <div className="text-sm text-slate-400 space-y-1">
                        <p className="truncate">CNPJ: <span className="text-slate-300">{emp.cnpj || '-'}</span></p>
                        {emp.cidade && <p className="truncate">Cidade: <span className="text-slate-300">{emp.cidade}</span></p>}
                        <p className="truncate">Sindicato: <span className="text-indigo-400">{sindicato ? sindicato.nome : 'Nenhum'}</span></p>
                        {(emp.dataEntrada || emp.dataSaida) && (
                          <p className="text-xs text-slate-400 truncate">
                            {emp.dataEntrada ? `Entrada: ${emp.dataEntrada}` : ''}
                            {emp.dataEntrada && emp.dataSaida ? ' | ' : ''}
                            {emp.dataSaida ? `Saída: ${emp.dataSaida}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex space-x-1">
                        <button onClick={() => openEmpresaModal(emp)} className="text-slate-500 hover:text-indigo-400 p-1.5 transition-colors cursor-pointer" title="Editar empresa">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDeleteEmpresa(emp.id, emp.nome)} className="text-slate-500 hover:text-red-500 p-1.5 transition-colors cursor-pointer" title="Excluir empresa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {emp.linkDrive ? (
                        <a 
                          href={emp.linkDrive} 
                          target="_blank" 
                          rel="noreferrer" 
                          title="Abrir pasta no Google Drive"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all shadow-sm"
                        >
                          <Folder className="w-3.5 h-3.5" />
                          <span>Pasta Drive</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleCreateDriveFolder(emp)}
                          disabled={creatingFolderEmpresaId === emp.id}
                          title="Criar estrutura no Google Drive (DP & RH / Legalização / Alvarás)"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 hover:text-indigo-200 border border-indigo-500/40 transition-all shadow-sm cursor-pointer disabled:opacity-60"
                        >
                          {creatingFolderEmpresaId === emp.id ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                              <span>Criando...</span>
                            </>
                          ) : (
                            <>
                              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                              <span>Criar no Drive</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Módulos Responsáveis */}
                  <div className="pt-2 border-t border-slate-700/40 flex flex-wrap gap-1.5 items-center">
                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mr-1">Módulos:</span>
                    {(emp.modulosResponsavel && emp.modulosResponsavel.length > 0 ? emp.modulosResponsavel : ['DP & RH']).map(mod => (
                      <span key={mod} className="text-[10px] px-2 py-0.5 rounded bg-slate-700/40 text-slate-300 font-medium border border-slate-600/30">
                        {mod}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            {empresas.filter(e => {
              if (selectedModuloFilter !== 'TODOS') {
                const hasModulos = e.modulosResponsavel && e.modulosResponsavel.length > 0;
                if (hasModulos) {
                  if (!e.modulosResponsavel.includes(selectedModuloFilter)) return false;
                } else {
                  if (selectedModuloFilter !== 'DP & RH') return false;
                }
              }

              const sindicato = sindicatos.find(s => s.id === e.sindicatoId);
              const search = searchTerm.toLowerCase();
              return (
                (e.nome && e.nome.toLowerCase().includes(search)) ||
                (e.cnpj && e.cnpj.toLowerCase().includes(search)) ||
                (e.codigo && e.codigo.toLowerCase().includes(search)) ||
                (e.regime && e.regime.toLowerCase().includes(search)) ||
                (e.situacao && e.situacao.toLowerCase().includes(search)) ||
                (sindicato && sindicato.regiaoAtuacao && sindicato.regiaoAtuacao.toLowerCase().includes(search)) ||
                (sindicato && sindicato.nome && sindicato.nome.toLowerCase().includes(search))
              );
            }).length === 0 && <div className="col-span-full text-center text-slate-500 py-10">Nenhuma empresa encontrada para o filtro selecionado.</div>}
          </div>
        )}
      </div>

      {/* Sindicato Modal */}
      {isModalOpen && activeTab === 'SINDICATOS' && editingSindicato && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-200">{editingSindicato.id ? 'Editar Sindicato' : 'Novo Sindicato'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveSindicato} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome do Sindicato *</label>
                <input type="text" required value={editingSindicato.nome || ''} onChange={e => setEditingSindicato({...editingSindicato, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">CNPJ</label>
                <input type="text" value={editingSindicato.cnpj || ''} onChange={e => setEditingSindicato({...editingSindicato, cnpj: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Código</label>
                <input type="text" value={editingSindicato.codigo || ''} onChange={e => setEditingSindicato({...editingSindicato, codigo: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Região de Atuação (Cidade)</label>
                <input type="text" value={editingSindicato.regiaoAtuacao || ''} onChange={e => setEditingSindicato({...editingSindicato, regiaoAtuacao: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" placeholder="Ex: São Paulo, Campinas..." />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Validade CCT / Data Base</label>
                <input type="date" value={editingSindicato.validadeCCT || ''} onChange={e => setEditingSindicato({...editingSindicato, validadeCCT: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>
              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Empresa Modal */}
      {isModalOpen && activeTab === 'EMPRESAS' && editingEmpresa && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center">
              <h2 className="text-lg font-medium text-slate-200">{editingEmpresa.id ? 'Editar Empresa' : 'Nova Empresa'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-500 hover:text-slate-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEmpresa} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Nome da Empresa (Razão Social) *</label>
                <input type="text" required value={editingEmpresa.nome || ''} onChange={e => setEditingEmpresa({...editingEmpresa, nome: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">CNPJ</label>
                  <input type="text" value={editingEmpresa.cnpj || ''} onChange={e => setEditingEmpresa({...editingEmpresa, cnpj: e.target.value})} placeholder="00.000.000/0000-00" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Código</label>
                  <input type="text" value={editingEmpresa.codigo || ''} onChange={e => setEditingEmpresa({...editingEmpresa, codigo: e.target.value})} placeholder="Ex: 101" className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>

              {/* Grid: Regime e Situação */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Regime</label>
                  <select
                    value={editingEmpresa.regime || 'SIMPLES'}
                    onChange={e => setEditingEmpresa({...editingEmpresa, regime: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="SIMPLES">SIMPLES</option>
                    <option value="PRESUMIDO">PRESUMIDO</option>
                    <option value="REAL">REAL</option>
                    <option value="REAL TRIMESTRAL">REAL TRIMESTRAL</option>
                    <option value="DOMESTICA">DOMESTICA</option>
                    <option value="OUTRO">OUTRO</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Situação</label>
                  <select
                    value={editingEmpresa.situacao || 'ATIVA'}
                    onChange={e => {
                      const newSituacao = e.target.value;
                      setEditingEmpresa({
                        ...editingEmpresa, 
                        situacao: newSituacao,
                        ...(newSituacao === 'ATIVA' ? { dataSaida: '' } : {})
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="ATIVA">ATIVA</option>
                    <option value="INATIVA">INATIVA</option>
                    <option value="SUSPENSA">SUSPENSA</option>
                  </select>
                </div>
              </div>

              {/* Cidade / Município */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Cidade / Município</label>
                <input 
                  type="text" 
                  value={editingEmpresa.cidade || ''} 
                  onChange={e => setEditingEmpresa({...editingEmpresa, cidade: e.target.value})} 
                  placeholder="Ex: Rio Verde - GO" 
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" 
                />
              </div>

              {/* Grid: Data Entrada e Data Saída */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Data de Entrada</label>
                  <input 
                    type="text" 
                    value={editingEmpresa.dataEntrada || ''} 
                    onChange={e => setEditingEmpresa({...editingEmpresa, dataEntrada: e.target.value})} 
                    placeholder="DD/MM/AAAA" 
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" 
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Data de Saída</label>
                    {(editingEmpresa.situacao || 'ATIVA') === 'ATIVA' && (
                      <span className="text-[10px] text-amber-400 font-medium">
                        Bloqueado (Empresa ATIVA)
                      </span>
                    )}
                  </div>
                  <input 
                    type="text" 
                    disabled={(editingEmpresa.situacao || 'ATIVA') === 'ATIVA'}
                    value={(editingEmpresa.situacao || 'ATIVA') === 'ATIVA' ? '' : (editingEmpresa.dataSaida || '')} 
                    onChange={e => setEditingEmpresa({...editingEmpresa, dataSaida: e.target.value})} 
                    placeholder={(editingEmpresa.situacao || 'ATIVA') === 'ATIVA' ? "Bloqueado para empresa ativa" : "DD/MM/AAAA"} 
                    className={`w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 transition-colors ${
                      (editingEmpresa.situacao || 'ATIVA') === 'ATIVA'
                        ? 'opacity-50 cursor-not-allowed bg-slate-900/60 text-slate-500 border-dashed select-none'
                        : 'focus:outline-none focus:border-indigo-500'
                    }`} 
                  />
                  {(editingEmpresa.situacao || 'ATIVA') === 'ATIVA' && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Para registrar data de saída, altere a situação para <strong>INATIVA</strong> ou <strong>SUSPENSA</strong>.
                    </p>
                  )}
                </div>
              </div>

              {/* Link Google Drive */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Link do Google Drive</label>
                  {!editingEmpresa.linkDrive && (
                    <button
                      type="button"
                      disabled={isCreatingFolderModal || !editingEmpresa.nome}
                      onClick={handleCreateDriveFolderInModal}
                      className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {isCreatingFolderModal ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Criando estrutura no Drive...</span>
                        </>
                      ) : (
                        <>
                          <Cloud className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Criar Estrutura no Google Drive</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
                <div className="flex gap-2">
                  <input 
                    type="url" 
                    value={editingEmpresa.linkDrive || ''} 
                    onChange={e => setEditingEmpresa({...editingEmpresa, linkDrive: e.target.value})} 
                    placeholder="https://drive.google.com/drive/folders/..." 
                    className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" 
                  />
                  {editingEmpresa.linkDrive && (
                    <a
                      href={editingEmpresa.linkDrive}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-3 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg flex items-center gap-1.5 text-xs font-semibold transition-colors"
                      title="Abrir pasta no Drive"
                    >
                      <Folder className="w-4 h-4" />
                      <span>Abrir</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>

              {/* Seção de Módulos Responsáveis */}
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Módulos Responsáveis</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 bg-slate-950/70 border border-slate-800 p-3.5 rounded-xl">
                  {['DP & RH', 'FISCAL', 'CONTÁBIL', 'SOCIETÁRIO', 'LEGALIZAÇÃO'].map(mod => {
                    const currentModulos = editingEmpresa.modulosResponsavel || ['DP & RH'];
                    const isChecked = currentModulos.includes(mod);
                    return (
                      <label 
                        key={mod} 
                        className={`flex items-center space-x-2.5 p-2 rounded-lg cursor-pointer transition-colors border select-none ${
                          isChecked 
                            ? 'bg-indigo-600/15 border-indigo-500/40 text-indigo-300' 
                            : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked
                              ? currentModulos.filter(m => m !== mod)
                              : [...currentModulos, mod];
                            setEditingEmpresa({
                              ...editingEmpresa,
                              modulosResponsavel: updated
                            });
                          }}
                          className="w-4 h-4 rounded text-indigo-600 bg-slate-900 border-slate-700 focus:ring-indigo-500"
                        />
                        <span className="text-xs font-semibold">{mod}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Telefone</label>
                  <input type="text" value={editingEmpresa.telefone || ''} onChange={e => setEditingEmpresa({...editingEmpresa, telefone: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Email</label>
                  <input type="email" value={editingEmpresa.email || ''} onChange={e => setEditingEmpresa({...editingEmpresa, email: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Endereço Completo</label>
                <input type="text" value={editingEmpresa.enderecoCompleto || ''} onChange={e => setEditingEmpresa({...editingEmpresa, enderecoCompleto: e.target.value})} className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors" />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Sindicato Vinculado</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Pesquisar sindicato..."
                    value={editingEmpresa.sindicatoNome !== undefined ? editingEmpresa.sindicatoNome : (sindicatos.find(s => s.id === editingEmpresa.sindicatoId)?.nome || '')}
                    onChange={e => {
                      setEditingEmpresa({...editingEmpresa, sindicatoNome: e.target.value, sindicatoId: ''});
                      setIsSindicatoDropdownOpen(true);
                    }}
                    onFocus={(e) => {
                      e.target.select();
                      setIsSindicatoDropdownOpen(true);
                    }}
                    onBlur={() => {
                      setTimeout(() => setIsSindicatoDropdownOpen(false), 200);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                  {isSindicatoDropdownOpen && (
                    <div className="absolute z-10 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-xl max-h-48 overflow-y-auto custom-scrollbar">
                      <div 
                        className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-400 text-sm"
                        onClick={() => {
                          setEditingEmpresa({...editingEmpresa, sindicatoId: '', sindicatoNome: undefined});
                          setIsSindicatoDropdownOpen(false);
                        }}
                      >
                        Nenhum
                      </div>
                      {sindicatos
                        .filter(s => s.nome.toLowerCase().includes((editingEmpresa.sindicatoNome !== undefined ? editingEmpresa.sindicatoNome : '').toLowerCase()))
                        .map(s => (
                        <div 
                          key={s.id}
                          className="px-4 py-2 hover:bg-slate-800 cursor-pointer text-slate-200 text-sm"
                          onClick={() => {
                            setEditingEmpresa({...editingEmpresa, sindicatoId: s.id, sindicatoNome: undefined});
                            setIsSindicatoDropdownOpen(false);
                          }}
                        >
                          {s.nome}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors">Cancelar</button>
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center space-x-4 mb-4">
              <div className="bg-amber-500/20 p-3 rounded-full text-amber-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-medium text-slate-200">Atenção</h2>
            </div>
            <p className="text-slate-400 mb-6 whitespace-pre-wrap leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end space-x-3">
              <button onClick={() => setConfirmModal(null)} className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors bg-slate-800/50 hover:bg-slate-800 rounded-lg">Cancelar</button>
              <button onClick={confirmModal.action} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg font-medium transition-colors">Confirmar</button>
            </div>
          </div>
        </div>
      )}

      {/* CCT Text Management Modal */}
      {cctModalSindicato && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4 md:p-6 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700/70 rounded-2xl w-full max-w-4xl max-h-[92vh] shadow-2xl flex flex-col overflow-hidden">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    Texto da CCT Vigente
                    <span className="text-xs font-normal px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Base de Conhecimento da IA
                    </span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Sindicato: <span className="text-slate-200 font-medium">{cctModalSindicato.nome}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCctModalSindicato(null)}
                className="text-slate-400 hover:text-slate-200 p-2 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Info Banner & Actions */}
            <div className="p-4 bg-slate-950/70 border-b border-slate-800 space-y-3">
              <p className="text-xs text-slate-400 leading-relaxed">
                Este texto é consultado em tempo real pelo <span className="text-indigo-400 font-medium">Assistente de IA</span> para responder perguntas sobre piso salarial, adicionais, estabilidades e regras sindicais das empresas vinculadas. Quando a convenção for renovada, basta colar o novo texto ou subir o arquivo <code className="text-indigo-300 bg-indigo-950/60 px-1 py-0.5 rounded">.txt</code>.
              </p>

              {cctSuccessMessage && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center space-x-2 text-emerald-400 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{cctSuccessMessage}</span>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <div className="flex items-center space-x-2">
                  <label className="cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg flex items-center space-x-1.5 transition-colors shadow-sm">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Carregar Arquivo (.txt)</span>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleFileUploadCct}
                      className="hidden"
                    />
                  </label>

                  {cctTexto && (
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Deseja limpar todo o texto da CCT?')) {
                          setCctTexto('');
                        }
                      }}
                      className="text-slate-400 hover:text-red-400 text-xs px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Limpar Texto
                    </button>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-400">
                  <span>
                    Caracteres: <strong className="text-slate-200">{cctTexto.length.toLocaleString('pt-BR')}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Palavras: <strong className="text-slate-200">{(cctTexto.trim() ? cctTexto.trim().split(/\s+/).length : 0).toLocaleString('pt-BR')}</strong>
                  </span>
                  {cctUpdatedAt && (
                    <>
                      <span>•</span>
                      <span>
                        Última atualização: <strong className="text-slate-200">{cctUpdatedAt.toLocaleDateString('pt-BR')} {cctUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</strong>
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Editor Area */}
            <div className="flex-1 p-4 overflow-hidden flex flex-col">
              {cctLoading ? (
                <div className="flex-1 flex items-center justify-center py-20 text-slate-400 text-sm">
                  <RefreshCw className="w-5 h-5 animate-spin mr-2 text-indigo-400" />
                  Carregando texto da CCT...
                </div>
              ) : (
                <textarea
                  value={cctTexto}
                  onChange={e => setCctTexto(e.target.value)}
                  placeholder="Cole aqui o texto integral da Convenção Coletiva de Trabalho (CCT) ou clique em 'Carregar Arquivo (.txt)' acima..."
                  className="w-full flex-1 min-h-[340px] bg-slate-950 border border-slate-800 text-slate-200 rounded-xl p-4 text-xs font-mono leading-relaxed focus:outline-none focus:border-indigo-500 transition-colors resize-none custom-scrollbar"
                />
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/60">
              <p className="text-xs text-slate-500">
                {cctTexto ? 'Texto pronto para ser consultado pela IA.' : 'Nenhum texto cadastrado para este sindicato.'}
              </p>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => setCctModalSindicato(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Fechar
                </button>
                <button
                  type="button"
                  disabled={cctSaving || cctLoading}
                  onClick={handleSaveCct}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-2 transition-colors shadow-lg shadow-indigo-500/10 cursor-pointer"
                >
                  {cctSaving ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Salvar CCT Vigente</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal de Sincronização Google Drive */}
      {isDriveModalOpen && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-950/50">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FolderSync className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                    Sincronização com Google Drive
                  </h2>
                  <p className="text-xs text-slate-400">
                    Vincule automaticamente as pastas dos clientes às empresas cadastradas pelo código
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsDriveModalOpen(false)} 
                className="text-slate-400 hover:text-slate-200 p-1.5 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Conteúdo com Scroll */}
            <div className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              
              {/* Orientações e Configuração */}
              <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-4 space-y-3">
                <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  Instruções de Acesso e Compartilhamento
                </h3>

                <ol className="text-xs text-slate-300 space-y-2 list-decimal list-inside leading-relaxed">
                  <li>
                    Compartilhe sua pasta raiz <strong className="text-slate-100">CLIENTES - SISTEMA</strong> no Google Drive com o e-mail da Service Account (com permissão de <em>Leitor</em> ou <em>Editor</em>):
                  </li>
                  <div className="bg-slate-900 border border-slate-700/60 p-2.5 rounded-lg flex items-center justify-between gap-2 mt-1">
                    <span className="font-mono text-xs text-emerald-300 break-all select-all">
                      {driveStatus.clientEmail || 'Carregando e-mail da Service Account...'}
                    </span>
                    {driveStatus.clientEmail && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(driveStatus.clientEmail || '');
                          setCopiedEmail(true);
                          setTimeout(() => setCopiedEmail(false), 2500);
                        }}
                        className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded border border-slate-600 transition-colors shrink-0 flex items-center gap-1 cursor-pointer"
                      >
                        {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedEmail ? 'Copiado!' : 'Copiar'}</span>
                      </button>
                    )}
                  </div>

                  <li>
                    O sistema buscará todas as subpastas no formato: <br />
                    <code className="bg-slate-900 px-1.5 py-0.5 rounded text-indigo-300 font-mono text-[11px]">[CÓDIGO] - Nome da Empresa</code> (Ex: <code className="text-emerald-300">186 - Centro Automotivo Omega</code>).
                  </li>
                  <li>
                    O código será cruzado com as empresas cadastradas no banco de dados e o link direto da pasta será salvo automaticamente no campo <strong>linkDrive</strong>.
                  </li>
                </ol>
              </div>

              {/* Campo: ID ou Link da Pasta Raiz */}
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  ID ou Link da Pasta Raiz ("CLIENTES - SISTEMA")
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={driveFolderId}
                    onChange={e => setDriveFolderId(e.target.value)}
                    placeholder="Cole o ID da pasta (ex: 1A2b3C... ou o link completo do Drive)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 text-slate-100 rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Dica: Você pode colar a URL completa da pasta no navegador que o sistema extrai o ID automaticamente.
                </p>
              </div>

              {/* Opção Avançada: Credenciais JSON Manuais */}
              <div className="pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAdvancedDriveConfig(!showAdvancedDriveConfig)}
                  className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1.5 cursor-pointer font-medium"
                >
                  {showAdvancedDriveConfig ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  <span>Configuração Avançada (Colar credentials.json manualmente)</span>
                </button>

                {showAdvancedDriveConfig && (
                  <div className="mt-3 bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl space-y-2">
                    <p className="text-xs text-slate-400">
                      Caso o servidor não possua o arquivo <code>credentials.json</code> ou a env <code>GOOGLE_DRIVE_CREDENTIALS</code>, cole aqui o JSON da sua Service Account:
                    </p>
                    <textarea
                      value={customCredentialsInput}
                      onChange={e => setCustomCredentialsInput(e.target.value)}
                      placeholder='{ "type": "service_account", "project_id": "...", "private_key": "...", "client_email": "..." }'
                      rows={4}
                      className="w-full bg-slate-900 border border-slate-700 text-slate-200 rounded-lg p-3 text-xs font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}
              </div>

              {/* Loading State */}
              {isSyncingDrive && (
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-5 text-center space-y-3">
                  <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto" />
                  <div>
                    <h4 className="text-sm font-bold text-emerald-300">Sincronizando com o Google Drive...</h4>
                    <p className="text-xs text-slate-400 mt-1">
                      Conectando à API do Drive, listando subpastas e atualizando as empresas no banco de dados.
                    </p>
                  </div>
                </div>
              )}

              {/* Resultado da Sincronização */}
              {syncDriveResult && !isSyncingDrive && (
                <div className="space-y-4">
                  {syncDriveResult.error ? (
                    <div className="bg-rose-950/30 border border-rose-500/40 rounded-xl p-4 text-xs text-rose-300 flex items-start gap-2.5">
                      <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold mb-0.5">Erro na Sincronização</strong>
                        <p>{syncDriveResult.error}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-slate-950/90 border border-emerald-500/40 rounded-xl p-4 space-y-4">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          <span className="text-sm font-bold text-slate-100">Resultado da Varredura</span>
                        </div>
                        <span className="text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                          Concluído
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg">
                          <span className="block text-lg font-bold text-slate-200">{syncDriveResult.totalFoldersFound}</span>
                          <span className="text-[11px] text-slate-400">Pastas no Drive</span>
                        </div>
                        <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-lg">
                          <span className="block text-lg font-bold text-emerald-300">{syncDriveResult.matchedCount}</span>
                          <span className="text-[11px] text-emerald-400 font-medium">Vinculadas</span>
                        </div>
                        <div className="bg-amber-950/30 border border-amber-500/30 p-2.5 rounded-lg">
                          <span className="block text-lg font-bold text-amber-300">{syncDriveResult.unmatchedCount}</span>
                          <span className="text-[11px] text-amber-400 font-medium">Não Encontradas</span>
                        </div>
                      </div>

                      {/* Lista de Empresas Atualizadas */}
                      {syncDriveResult.updatedCompanies && syncDriveResult.updatedCompanies.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-xs font-bold text-slate-300 block">
                            Empresas Vinculadas ({syncDriveResult.updatedCompanies.length}):
                          </span>
                          <div className="max-h-36 overflow-y-auto custom-scrollbar space-y-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                            {syncDriveResult.updatedCompanies.map((c: any) => (
                              <div key={c.id} className="flex items-center justify-between text-xs py-1 px-2 hover:bg-slate-800/50 rounded">
                                <span className="text-slate-300 truncate mr-2 font-medium">
                                  #{c.codigo} - {c.nome}
                                </span>
                                <a 
                                  href={c.linkDrive} 
                                  target="_blank" 
                                  rel="noreferrer" 
                                  className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0 font-medium"
                                >
                                  <span>Abrir</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pastas Não Encontradas */}
                      {syncDriveResult.unmatchedFolders && syncDriveResult.unmatchedFolders.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="text-xs font-bold text-amber-400 block">
                            Pastas no Drive cujo código não está cadastrado ({syncDriveResult.unmatchedFolders.length}):
                          </span>
                          <div className="max-h-28 overflow-y-auto custom-scrollbar space-y-1 bg-slate-900/80 p-2 rounded-lg border border-slate-800">
                            {syncDriveResult.unmatchedFolders.map((f: any, idx: number) => (
                              <div key={idx} className="text-xs py-0.5 px-2 text-slate-400 truncate">
                                📁 {f.name} (código extraído: {f.codigo})
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 flex justify-between items-center bg-slate-950/60">
              <button
                type="button"
                onClick={() => setIsDriveModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Fechar
              </button>
              
              <button
                type="button"
                disabled={isSyncingDrive}
                onClick={handleSyncDrive}
                className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-xs font-bold flex items-center space-x-2 transition-all shadow-lg shadow-emerald-600/20 cursor-pointer"
              >
                {isSyncingDrive ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Sincronizando...</span>
                  </>
                ) : (
                  <>
                    <FolderSync className="w-4 h-4" />
                    <span>Sincronizar Agora</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}



      {/* Notificação Toast Flutuante */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 border border-slate-700 text-slate-100 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-slate-200 ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );

}