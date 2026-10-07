import React, { useState, useEffect, useRef } from "react";
import { db } from "./lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, getDocs, query, where, doc, getDoc, setDoc, onSnapshot, writeBatch } from "firebase/firestore";
import {
  Search,
  Menu,
  FileText,
  Download,
  Copy,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlignLeft,
  AlignCenter,
  Activity,
  Loader2,
  Plus,
  Trash2,
  Upload,
  AlertTriangle,
  X,
  LogIn,
  LogOut,
  Home,
  Building2,
  CheckSquare,
  KanbanSquare,
  FileSignature,
  Receipt,
  FileStack,
  Briefcase,
  LayoutDashboard,
  CalendarDays,
  PanelLeftClose,
  PanelLeftOpen,
  Pencil,
  Check,
  Clock,
  Settings,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import DOMPurify from "dompurify";
import { initAuth, loginWithPassword, logout } from "./auth";
import { auth } from "./lib/firebase";
import { DEFAULT_TEMPLATES, INITIAL_TEMPLATE } from "./data";
import { SavedTemplate } from "./types";
import ReciboApp from "./ReciboApp";
import BoletoApp from "./BoletoApp";
import TrctApp from "./TrctApp";
import EmpresasApp from "./EmpresasApp";
import ChecklistsApp from "./ChecklistsApp";
import DashboardApp from "./DashboardApp";
import CalendarioApp from "./CalendarioApp";
import KanbanApp from "./pages/KanbanApp";
import { getTrimmedPdfBase64 } from "./pdfUtils";
import { ErrorLogViewer } from "./ErrorLogViewer";
import { isEmpresaAtivaNosModulos, sanitizeModulosResponsavel } from "./utils/empresaUtils";

import BancoDeHorasApp from "./pages/banco-horas/BancoDeHorasApp";
import AlvaraApp from "./AlvaraApp";
import FechamentoFolhaApp from "./FechamentoFolhaApp";
import { BotMessageSquare, ShieldCheck, FileSpreadsheet } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setIsAuthenticated(true);
        setIsCheckingAuth(false);
      },
      () => {
        setIsAuthenticated(false);
        setIsCheckingAuth(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await loginWithPassword(loginPassword);
    } catch (err: any) {
      setLoginError(err.message);
    }
  };

  const [modulo, setModulo] = useState<
    | "dashboard"
    | "empresas"
    | "sindicatos"
    | "checklists"
    | "calendario"
    | "fechamento"
    | "kanban"
    | "kanban-legalizacao"
    | "autotermos"
    | "recibos"
    | "boletos"
    | "trct"
    | "banco-horas"
    | "alvaras"
  >("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const toggleMenu = (menu: string) => {
    setOpenMenus(prev => 
      prev.includes(menu) ? prev.filter(m => m !== menu) : [...prev, menu]
    );
  };

  const handleNavigate = (mod: any, sub?: string) => {
    setModulo(mod);
    if (mod === "autotermos") {
      setStep(1);
      const targetSub = sub || "DP & RH";
      setSelectedSubgrupo(targetSub);
      if (targetSub === "GERAL") {
        const defaultContabil = DEFAULT_TEMPLATES.find(t => t.id === "tpl-contrato-contabil");
        setActiveTemplateId("tpl-contrato-contabil");
        setBatchTemplateIds(["tpl-contrato-contabil"]);
        if (defaultContabil) {
          setTemplateName(defaultContabil.name);
          setTemplateCode(defaultContabil.content);
        }
      } else {
        const defaultNda = DEFAULT_TEMPLATES.find(t => t.id === "tpl-nda");
        setActiveTemplateId("tpl-nda");
        setBatchTemplateIds(["tpl-nda"]);
        if (defaultNda) {
          setTemplateName(defaultNda.name);
          setTemplateCode(defaultNda.content);
        }
      }
    }
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  useEffect(() => {
    const handleNavEvent = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail) {
        if (typeof customEvent.detail === "object" && customEvent.detail.module) {
          handleNavigate(customEvent.detail.module, customEvent.detail.subgrupo);
        } else {
          handleNavigate(customEvent.detail);
        }
      }
    };
    window.addEventListener("navigate-module", handleNavEvent);

    const handleNavigateToTermos = () => {
      const saved = localStorage.getItem("@app:ai_generated_termo");
      if (saved) {
        try {
          const { termoId, extractedData, pdfBase64 } = JSON.parse(saved);

          // Selecionar o template
          setBatchTemplateIds([termoId]);
          if (termoId !== "tpl-custom") {
            setActiveTemplateId(termoId);
            const selectedTpl = DEFAULT_TEMPLATES.find(t => t.id === termoId) || customTemplatesRef.current.find(t => t.id === termoId);
            if (selectedTpl) {
              setTemplateName(selectedTpl.name);
              setTemplateCode(selectedTpl.content);
              editorContentRef.current = selectedTpl.content;
              if (selectedTpl.subgrupo) {
                setSelectedSubgrupo(selectedTpl.subgrupo);
              }
            }
          }

          setModulo("autotermos");
          setStep(2); // Ir direto para o passo de preenchimento

          if (pdfBase64) {
            setPendingPdfExtraction(pdfBase64);
            setCollaboratorsData([{}]);
            setGlobalFormData({});
          } else if (extractedData) {
            // Preencher as variáveis globais e de colaborador com os dados extraídos
            const formattedGlobal: Record<string, string> = {};
            const formattedCollab: Record<string, string> = {};
            
            for (const key in extractedData) {
              let cleanKey = key.replace(/\[|\]|\{|\}/g, "").trim();
              cleanKey = cleanKey.toUpperCase();
              
              if (
                cleanKey.includes("COLABORADOR") ||
                cleanKey.includes("EMPREGADO") ||
                cleanKey.includes("FUNCIONÁRIO") ||
                cleanKey.includes("CPF") ||
                cleanKey.includes("RG")
              ) {
                // Ensure proper mapping to standard template variables if needed
                if (cleanKey.includes("NOME DO FUNCIONÁRIO")) {
                  formattedCollab["NOME DO COLABORADOR"] = extractedData[key];
                  formattedCollab["NOME DO EMPREGADO"] = extractedData[key];
                }
                formattedCollab[cleanKey] = extractedData[key];
              } else {
                formattedGlobal[cleanKey] = extractedData[key];
              }
            }
            
            setGlobalFormData(formattedGlobal);
            setCollaboratorsData([formattedCollab]);
          }

          // Limpar localStorage
          localStorage.removeItem("@app:ai_generated_termo");
        } catch (e) {
          console.error("Erro ao processar termo da IA:", e);
        }
      }
    };
    window.addEventListener("navigate-to-termos", handleNavigateToTermos);

    return () => {
      window.removeEventListener("navigate-module", handleNavEvent);
      window.removeEventListener("navigate-to-termos", handleNavigateToTermos);
    };
  }, []);

  // Commit trigger timestamp: 2026-08-13 05:06
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const [customTemplates, setCustomTemplates] = useState<SavedTemplate[]>([]);
  const customTemplatesRef = useRef<SavedTemplate[]>([]);
  const editorContentRef = useRef<string>(INITIAL_TEMPLATE);
  const editorDivRef = useRef<HTMLDivElement>(null);
  const [empresas, setEmpresas] = useState<any[]>([]);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "custom_templates"), (snapshot) => {
      const list: SavedTemplate[] = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name || "Modelo Customizado",
          content: data.content || "",
          lastUsed: data.updatedAt || data.createdAt || Date.now(),
          subgrupo: data.subgrupo || "DP & RH",
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });
      setCustomTemplates(list);
      customTemplatesRef.current = list;
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "empresas"), (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setEmpresas(all.filter((e: any) => isEmpresaAtivaNosModulos(e) && sanitizeModulosResponsavel(e.modulosResponsavel, e).includes("DP & RH")));

      // Auto-ajuste no banco de dados: empresas com código repetido têm o código alterado para '0'
      const codeMap = new Map<string, any[]>();
      all.forEach((emp: any) => {
        const cod = (emp.codigo !== undefined && emp.codigo !== null ? String(emp.codigo) : '').trim();
        if (cod && cod !== '0') {
          if (!codeMap.has(cod)) codeMap.set(cod, []);
          codeMap.get(cod)!.push(emp);
        }
      });

      const empresasComCodigoRepetido: any[] = [];
      codeMap.forEach((lista) => {
        if (lista.length > 1) {
          empresasComCodigoRepetido.push(...lista);
        }
      });

      if (empresasComCodigoRepetido.length > 0) {
        const batch = writeBatch(db);
        for (const emp of empresasComCodigoRepetido) {
          batch.update(doc(db, "empresas", emp.id), {
            codigo: "0",
            updatedAt: Date.now()
          });
        }
        batch.commit().then(() => {
          console.log(`[Firestore Auto-Fix] ${empresasComCodigoRepetido.length} empresas com códigos repetidos foram alteradas para o código 0.`);
        }).catch((err) => {
          console.error("Erro ao atualizar códigos repetidos para 0:", err);
        });
      }
    });
    return () => unsub();
  }, []);

  // Active template being edited
  const [activeTemplateId, setActiveTemplateId] =
    useState<string>("tpl-custom");
  // Templates selected for batch generation
  const [batchTemplateIds, setBatchTemplateIds] = useState<string[]>([]);
  const [templateFilter, setTemplateFilter] = useState("");
  const [selectedSubgrupo, setSelectedSubgrupo] = useState<string>("TODOS");

  const [templateName, setTemplateName] = useState("Novo Modelo");
  const [templateCode, setTemplateCode] = useState(INITIAL_TEMPLATE);
  const [customTemplate, setCustomTemplate] = useState<{
    name: string;
    content: string;
  }>({ name: "Novo Modelo", content: INITIAL_TEMPLATE });
  const [isNewDocModalOpen, setIsNewDocModalOpen] = useState(false);
  const [newDocName, setNewDocName] = useState("");

  const handleCreateNewDoc = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newDocName.trim();
    if (!trimmedName) return;

    setActiveTemplateId("tpl-custom");
    setTemplateName(trimmedName);
    setTemplateCode("");
    editorContentRef.current = "";
    if (editorDivRef.current) {
      editorDivRef.current.innerHTML = "";
    }
    setCustomTemplate({ name: trimmedName, content: "" });
    setBatchTemplateIds(["tpl-custom"]);
    setIsNewDocModalOpen(false);
    setNewDocName("");
  };

  const [templateToDelete, setTemplateToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [templateToRename, setTemplateToRename] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [renameModelInput, setRenameModelInput] = useState("");

  const [isSaveCopyModalOpen, setIsSaveCopyModalOpen] = useState(false);
  const [copyModelName, setCopyModelName] = useState("");

  const [variables, setVariables] = useState<string[]>([]);
  const [globalVariables, setGlobalVariables] = useState<string[]>([]);
  const [collaboratorVariables, setCollaboratorVariables] = useState<string[]>(
    [],
  );
  const [globalFormData, setGlobalFormData] = useState<Record<string, string>>(
    {},
  );
  const [collaboratorsData, setCollaboratorsData] = useState<
    Record<string, string>[]
  >([{}]);

  const [pendingPdfExtraction, setPendingPdfExtraction] = useState<
    string | null
  >(null);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [generatedDocsList, setGeneratedDocsList] = useState<
    { collabName: string; termName: string; content: string }[]
  >([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [errorLog, setErrorLog] = useState<string | null>(null);
  const [extractStatus, setExtractStatus] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
    visible: boolean;
  }>({
    type: "success",
    message: "",
    visible: false,
  });
  const [entityToEdit, setEntityToEdit] = useState<{
    id: string;
    type: "EMPRESA" | "SINDICATO";
  } | null>(null);
  const [isEditingExperiencia, setIsEditingExperiencia] = useState(false);
  const [experienciaAviso, setExperienciaAviso] = useState<{
    nomeColab: string;
    nomeEmpresa: string;
    empresaId?: string;
    admissionDate: Date;
    fimExp1: Date;
    prorrogaDate: Date | null;
    dias1: number;
    dias2: number | null;
  } | null>(null);
  const handleLancarExperienciaAviso = async () => {
    if (!experienciaAviso) return;
    try {
      const q = query(
        collection(db, "calendarEvents"),
        where("type", "==", "PRAZO"),
        where("empresaNome", "==", experienciaAviso.nomeEmpresa),
      );
      const querySnapshot = await getDocs(q);
      const existingEvents = querySnapshot.docs.map((d) => d.data());

      const title1 = `Fim de Experiência (1º Período): ${experienciaAviso.nomeColab}`;
      const title2 = `Fim de Prorrogação de Experiência: ${experienciaAviso.nomeColab}`;

      const exists1 = existingEvents.some((e) => e.title === title1);
      const exists2 = existingEvents.some((e) => e.title === title2);

      if (exists1 && (!experienciaAviso.prorrogaDate || exists2)) {
        setNotification({
          type: "error",
          message:
            "Os lembretes para este colaborador já foram adicionados anteriormente.",
          visible: true,
        });
        setTimeout(
          () => setNotification((prev) => ({ ...prev, visible: false })),
          4000,
        );
        setExperienciaAviso(null);
        return;
      }

      if (!exists1) {
        await addDoc(collection(db, "calendarEvents"), {
          title: title1,
          description: `${experienciaAviso.dias1} dias. Empresa: ${experienciaAviso.nomeEmpresa || ""}`,
          date: experienciaAviso.fimExp1.getTime(),
          type: "PRAZO",
          empresaId: experienciaAviso.empresaId || "",
          ...(experienciaAviso.nomeEmpresa
            ? { empresaNome: experienciaAviso.nomeEmpresa }
            : {}),
          status: "ATIVO",
          createdAt: Date.now(),
        });
      }

      if (experienciaAviso.prorrogaDate && experienciaAviso.dias2 && !exists2) {
        await addDoc(collection(db, "calendarEvents"), {
          title: title2,
          description: `Prorrogação de ${experienciaAviso.dias2} dias. Empresa: ${experienciaAviso.nomeEmpresa || ""}`,
          date: experienciaAviso.prorrogaDate.getTime(),
          type: "PRAZO",
          empresaId: experienciaAviso.empresaId || "",
          ...(experienciaAviso.nomeEmpresa
            ? { empresaNome: experienciaAviso.nomeEmpresa }
            : {}),
          status: "ATIVO",
          createdAt: Date.now(),
        });
      }

      setNotification({
        type: "success",
        message:
          "Lembretes de experiência adicionados ao calendário com sucesso!",
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000,
      );
    } catch (e) {
      console.error(e);
      setNotification({
        type: "error",
        message: "Erro ao criar avisos.",
        visible: true,
      });
    }
    setExperienciaAviso(null);
  };

  // Set default to public/timbrado.png
  const letterheadImage = "/timbrado.png?v=2";

  useEffect(() => {
    editorContentRef.current = templateCode;
  }, [templateCode, activeTemplateId]);

  const getCurrentEditorContent = () => {
    if (editorDivRef.current) {
      return editorDivRef.current.innerHTML;
    }
    return editorContentRef.current || templateCode;
  };

  // Quando estiver na aba GERAL (Contratos Contábeis), assegura que o modelo oficial está carregado no editor se estiver no tpl-contrato-contabil
  useEffect(() => {
    if (selectedSubgrupo === "GERAL") {
      const contabilTpl = DEFAULT_TEMPLATES.find(t => t.id === "tpl-contrato-contabil");
      if (contabilTpl && activeTemplateId === "tpl-contrato-contabil") {
        if (!templateCode || templateCode === INITIAL_TEMPLATE) {
          setTemplateName(contabilTpl.name);
          setTemplateCode(contabilTpl.content);
          editorContentRef.current = contabilTpl.content;
        }
      }
    }
  }, [selectedSubgrupo, activeTemplateId]);

  // Compute variables dynamically based on batch selection and active editor content
  useEffect(() => {
    const currentCustomContent =
      activeTemplateId === "tpl-custom" ? getCurrentEditorContent() : customTemplate.content;

    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

    // Aggregate contents of all selected templates
    const allContents = batchTemplateIds
      .map((id) => {
        if (id === activeTemplateId) return getCurrentEditorContent();
        if (id === "tpl-custom") return currentCustomContent;
        const tpl = allTemplates.find((t) => t.id === id);
        return tpl ? tpl.content : "";
      })
      .join(" ");

    const matches = [...allContents.matchAll(/\[(.*?)\]/g)];
    const uniqueVars = [...new Set(matches.map((m) => m[1]))].filter(
      (v) => v !== "QUEBRA",
    );

    setVariables(uniqueVars);

    const globals: string[] = [];
    const collabs: string[] = [];

    const isContratos = selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS";

    uniqueVars.forEach((v) => {
      const upper = v.toUpperCase();
      if (isContratos) {
        globals.push(v);
      } else if (
        (upper.includes("COLABORADOR") ||
        upper.includes("EMPREGADO") ||
        upper.includes("FUNCIONÁRIO")) &&
        !upper.includes("EMPREGADOR") &&
        !upper.includes("QUANTIDADE") &&
        !upper.includes("NUMERO DE") &&
        !upper.includes("NÚMERO DE") &&
        !upper.includes("TOTAL DE")
      ) {
        collabs.push(v);
      } else if (
        (upper === "CPF" || upper === "RG" || upper === "CPF DO COLABORADOR" || upper === "CPF DO EMPREGADO" || upper === "RG DO COLABORADOR")
      ) {
        collabs.push(v);
      } else {
        globals.push(v);
      }
    });

    setGlobalVariables(globals);
    setCollaboratorVariables(collabs);

    setGlobalFormData((prev) => {
      const newForm: Record<string, string> = { ...prev };
      globals.forEach((v) => {
        if (!(v in newForm)) newForm[v] = "";
      });
      return newForm;
    });

    setCollaboratorsData((prev) => {
      if (prev.length === 0) return [{}];
      return prev.map((collab) => {
        const newCollab = { ...collab };
        collabs.forEach((v) => {
          if (!(v in newCollab)) newCollab[v] = "";
        });
        return newCollab;
      });
    });
  }, [
    batchTemplateIds,
    activeTemplateId,
    templateCode,
    customTemplates,
    customTemplate.content,
    selectedSubgrupo,
  ]);

  const handleContentChange = (content: string) => {
    editorContentRef.current = content;
    setTemplateCode(content);
  };

  const handleTemplateSelect = (tplId: string) => {
    const targetTpl =
      DEFAULT_TEMPLATES.find((t) => t.id === tplId) ||
      customTemplates.find((t) => t.id === tplId);

    if (tplId === activeTemplateId) {
      if (
        targetTpl &&
        (templateName === "Novo Modelo" ||
          !templateCode ||
          templateCode === INITIAL_TEMPLATE)
      ) {
        setTemplateName(targetTpl.name);
        setTemplateCode(targetTpl.content);
        editorContentRef.current = targetTpl.content;
      }
      return;
    }

    // Salvar rascunho ativo anterior APENAS se for tpl-custom
    if (activeTemplateId === "tpl-custom") {
      const currentText = getCurrentEditorContent();
      setCustomTemplate({ name: templateName, content: currentText });
    }

    setActiveTemplateId(tplId);

    // Carregar o novo template no editor
    if (tplId === "tpl-custom") {
      setTemplateName(customTemplate.name);
      setTemplateCode(customTemplate.content);
      editorContentRef.current = customTemplate.content;
    } else if (targetTpl) {
      setTemplateName(targetTpl.name);
      setTemplateCode(targetTpl.content);
      editorContentRef.current = targetTpl.content;
    }
  };

  const toggleBatchTemplate = (tplId: string) => {
    setBatchTemplateIds((prev) =>
      prev.includes(tplId)
        ? prev.filter((id) => id !== tplId)
        : [...prev, tplId],
    );
  };

  const isDefaultTemplate = DEFAULT_TEMPLATES.some((t) => t.id === activeTemplateId);
  const isCustomTemplate = customTemplates.some((t) => t.id === activeTemplateId);

  const saveButtonText = isDefaultTemplate
    ? "SALVAR CÓPIA"
    : isCustomTemplate
    ? "ATUALIZAR MODELO"
    : "SALVAR MODELO";

  const handleSaveOrUpdateTemplate = async () => {
    if (isDefaultTemplate) {
      // SALVAR CÓPIA de modelo padrão (Abre modal in-app)
      const defaultTpl = DEFAULT_TEMPLATES.find((t) => t.id === activeTemplateId);
      const isRenamed = defaultTpl && templateName.trim() && templateName.trim() !== defaultTpl.name;
      setCopyModelName(isRenamed ? templateName.trim() : `${templateName} - Cópia`);
      setIsSaveCopyModalOpen(true);
      return;
    }

    const currentContent = getCurrentEditorContent();

    if (isCustomTemplate) {
      // ATUALIZAR MODELO existente no Firestore
      try {
        await updateDoc(doc(db, "custom_templates", activeTemplateId), {
          name: templateName.trim() || "Modelo Sem Nome",
          content: currentContent,
          updatedAt: Date.now(),
        });
        setTemplateCode(currentContent);
        editorContentRef.current = currentContent;
        setNotification({
          type: "success",
          message: "Modelo atualizado no Firestore!",
          visible: true,
        });
        setTimeout(
          () => setNotification((prev) => ({ ...prev, visible: false })),
          4000
        );
      } catch (err) {
        console.error("Erro ao atualizar modelo:", err);
        setNotification({
          type: "error",
          message: "Erro ao atualizar modelo no Firestore.",
          visible: true,
        });
        setTimeout(
          () => setNotification((prev) => ({ ...prev, visible: false })),
          4000
        );
      }
    } else {
      // Novo rascunho ("tpl-custom")
      const nameToSave = templateName.trim() || "Novo Modelo";
      try {
        const docRef = await addDoc(collection(db, "custom_templates"), {
          name: nameToSave,
          content: currentContent,
          subgrupo: selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS" ? "GERAL" : "DP & RH",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
        setActiveTemplateId(docRef.id);
        setTemplateName(nameToSave);
        setTemplateCode(currentContent);
        editorContentRef.current = currentContent;
        setBatchTemplateIds((prev) =>
          prev.includes("tpl-custom")
            ? [...prev.filter((id) => id !== "tpl-custom"), docRef.id]
            : [...prev, docRef.id]
        );
        setNotification({
          type: "success",
          message: "Modelo salvo no Firestore!",
          visible: true,
        });
        setTimeout(
          () => setNotification((prev) => ({ ...prev, visible: false })),
          4000
        );
      } catch (err) {
        console.error("Erro ao salvar novo modelo:", err);
        setNotification({
          type: "error",
          message: "Erro ao salvar modelo no Firestore.",
          visible: true,
        });
        setTimeout(
          () => setNotification((prev) => ({ ...prev, visible: false })),
          4000
        );
      }
    }
  };

  const confirmSaveCopy = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const finalName = copyModelName.trim();
    if (!finalName) return;

    const currentContent = getCurrentEditorContent();
    try {
      const docRef = await addDoc(collection(db, "custom_templates"), {
        name: finalName,
        content: currentContent,
        subgrupo: selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS" ? "GERAL" : "DP & RH",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      setActiveTemplateId(docRef.id);
      setTemplateName(finalName);
      setTemplateCode(currentContent);
      editorContentRef.current = currentContent;
      setBatchTemplateIds((prev) =>
        prev.includes(activeTemplateId)
          ? [...prev.filter((id) => id !== activeTemplateId), docRef.id]
          : [...prev, docRef.id]
      );
      setIsSaveCopyModalOpen(false);
      setCopyModelName("");
      setNotification({
        type: "success",
        message: "Cópia criada e salva no Firestore!",
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000
      );
    } catch (err) {
      console.error("Erro ao salvar cópia:", err);
      setIsSaveCopyModalOpen(false);
      setNotification({
        type: "error",
        message: "Erro ao salvar cópia no Firestore.",
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000
      );
    }
  };

  const handleOpenRenameModal = (tpl: { id: string; name: string }) => {
    setTemplateToRename(tpl);
    setRenameModelInput(tpl.name);
  };

  const confirmRenameTemplate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!templateToRename) return;
    const finalName = renameModelInput.trim();
    if (!finalName) return;

    const { id } = templateToRename;

    if (id === "tpl-custom") {
      setTemplateName(finalName);
      setCustomTemplate((prev) => ({ ...prev, name: finalName }));
      setTemplateToRename(null);
      setNotification({
        type: "success",
        message: "Nome do rascunho atualizado com sucesso!",
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000
      );
      return;
    }

    try {
      await updateDoc(doc(db, "custom_templates", id), {
        name: finalName,
        updatedAt: Date.now(),
      });

      if (activeTemplateId === id) {
        setTemplateName(finalName);
      }

      setTemplateToRename(null);
      setNotification({
        type: "success",
        message: `Modelo renomeado para "${finalName}" com sucesso!`,
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000
      );
    } catch (err) {
      console.error("Erro ao renomear modelo:", err);
      setTemplateToRename(null);
      setNotification({
        type: "error",
        message: "Erro ao renomear modelo no Firestore.",
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000
      );
    }
  };

  const handleDeleteCustomTemplate = (id: string, name: string) => {
    setTemplateToDelete({ id, name });
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    const { id, name } = templateToDelete;
    try {
      if (id !== "tpl-custom") {
        await deleteDoc(doc(db, "custom_templates", id));
      }
      if (activeTemplateId === id) {
        const fallback =
          DEFAULT_TEMPLATES.find((t) =>
            selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS"
              ? t.subgrupo === "GERAL"
              : !t.subgrupo || t.subgrupo === "DP & RH"
          ) || DEFAULT_TEMPLATES[0];
        if (fallback) {
          setActiveTemplateId(fallback.id);
          setTemplateName(fallback.name);
          setTemplateCode(fallback.content);
          editorContentRef.current = fallback.content;
          setBatchTemplateIds([fallback.id]);
        }
      }
      setBatchTemplateIds((prev) => prev.filter((bId) => bId !== id));
      if (id === "tpl-custom") {
        setCustomTemplate({ name: "", content: "" });
      }
      setTemplateToDelete(null);
      setNotification({
        type: "success",
        message: `Modelo "${name}" excluído com sucesso!`,
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000
      );
    } catch (err) {
      console.error("Erro ao excluir modelo:", err);
      setTemplateToDelete(null);
      setNotification({
        type: "error",
        message: "Erro ao excluir modelo.",
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        4000
      );
    }
  };

  const handleDiscardDraft = () => {
    const fallback =
      DEFAULT_TEMPLATES.find((t) =>
        selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS"
          ? t.subgrupo === "GERAL"
          : !t.subgrupo || t.subgrupo === "DP & RH"
      ) || DEFAULT_TEMPLATES[0];
    if (fallback) {
      setActiveTemplateId(fallback.id);
      setTemplateName(fallback.name);
      setTemplateCode(fallback.content);
      editorContentRef.current = fallback.content;
      setBatchTemplateIds([fallback.id]);
    }
    setNotification({
      type: "success",
      message: "Rascunho descartado.",
      visible: true,
    });
    setTimeout(
      () => setNotification((prev) => ({ ...prev, visible: false })),
      3000
    );
  };

  const getExportPdfFileName = () => {
    const isContratos = selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS";

    const selectedTemplateNames: string[] = batchTemplateIds
      .map((id) => {
        if (id === "tpl-custom") return templateName || "Modelo Personalizado";
        const found =
          DEFAULT_TEMPLATES.find((t) => t.id === id) ||
          customTemplates.find((t) => t.id === id);
        return found ? found.name : templateName || "Documento";
      })
      .filter(Boolean);

    if (isContratos) {
      const contractName =
        selectedTemplateNames[0] ||
        templateName ||
        "Contrato de Prestação de Serviços Contábeis";
      const company = (
        globalFormData["RAZÃO SOCIAL DA CONTRATANTE"] ||
        globalFormData["RAZÃO SOCIAL"] ||
        globalFormData["RAZAO SOCIAL"] ||
        globalFormData["NOME DA EMPRESA"] ||
        globalFormData["EMPRESA"] ||
        globalFormData["CONTRATANTE"] ||
        ""
      ).trim();

      if (company) {
        return `${contractName} [${company}].pdf`;
      }
      return `${contractName}.pdf`;
    }

    // DP & RH
    const collabNames: string[] = collaboratorsData
      .map((collabData, index) => {
        const nameKey = collaboratorVariables.find((v) =>
          v.toUpperCase().includes("NOME")
        );
        if (nameKey && collabData[nameKey] && collabData[nameKey].trim() !== "") {
          return collabData[nameKey].trim();
        }
        for (const key of Object.keys(collabData)) {
          const uk = key.toUpperCase();
          if (
            (uk.includes("COLABORADOR") ||
              uk.includes("FUNCIONARIO") ||
              uk.includes("FUNCIONÁRIO") ||
              uk.includes("EMPREGADO")) &&
            collabData[key]?.trim()
          ) {
            return collabData[key].trim();
          }
        }
        const firstVal = Object.values(collabData).find(
          (val) => typeof val === "string" && val.trim() !== ""
        );
        if (firstVal) return firstVal.trim();
        return `Colaborador ${index + 1}`;
      })
      .filter(Boolean);

    const isMultiple = selectedTemplateNames.length > 1 || collabNames.length > 1;

    if (isMultiple) {
      const termsStr = selectedTemplateNames.join(", ") || "Termos";
      const collabsStr = collabNames.join(", ") || "Colaboradores";
      return `[${termsStr}] - [${collabsStr}].pdf`;
    }

    const termName = selectedTemplateNames[0] || templateName || "Termo";
    const collabName = collabNames[0] || "Colaborador";
    return `${termName} - ${collabName}.pdf`;
  };

  const generateFinalDocument = () => {
    // Generate concatenated document
    const currentCustomContent =
      activeTemplateId === "tpl-custom" ? getCurrentEditorContent() : customTemplate.content;

    const allTemplates = [...DEFAULT_TEMPLATES, ...customTemplates];

    const finalContentsData = batchTemplateIds
      .map((id) => {
        let content = "";
        let name = "Documento";

        if (id === activeTemplateId) {
          content = getCurrentEditorContent();
          name =
            activeTemplateId === "tpl-custom"
              ? templateName
              : allTemplates.find((t) => t.id === id)?.name || templateName || "Documento";
        } else if (id === "tpl-custom") {
          content = currentCustomContent;
          name = customTemplate.name;
        } else {
          const tpl = allTemplates.find((t) => t.id === id);
          if (tpl) {
            content = tpl.content;
            name = tpl.name;
          }
        }
        return { id, name, content };
      })
      .filter((item) => item.content);

    const baseCombinedText = finalContentsData
      .map((item) => item.content)
      .join("\n\n[QUEBRA]\n\n");

    let allDocs: string[] = [];
    let individualDocs: {
      collabName: string;
      termName: string;
      content: string;
    }[] = [];
    const iterators = collaboratorsData.length > 0 ? collaboratorsData : [{}];

    iterators.forEach((collabData, index) => {
      let textForCollab = baseCombinedText;
      // Determine collaborator name for filename
      const nameKey = collaboratorVariables.find((v) =>
        v.toUpperCase().includes("NOME"),
      );
      let collabName = `Colaborador ${index + 1}`;
      if (nameKey && collabData[nameKey] && collabData[nameKey].trim() !== "") {
        collabName = collabData[nameKey];
      } else {
        const companyName =
          globalFormData["RAZÃO SOCIAL DA CONTRATANTE"] ||
          globalFormData["NOME DA EMPRESA"] ||
          globalFormData["EMPRESA"] ||
          globalFormData["CONTRATANTE"];
        if (companyName && companyName.trim() !== "") {
          collabName = companyName.trim();
        } else {
          const firstVal = Object.values(collabData).find(
            (val: any) => typeof val === "string" && val.trim() !== "",
          );
          if (firstVal) collabName = firstVal;
        }
      }
      globalVariables.forEach((v) => {
        const escapedKey = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\[${escapedKey}\\]`, "g");
        textForCollab = textForCollab.replace(
          regex,
          globalFormData[v] || `[${v}]`,
        );
      });

      collaboratorVariables.forEach((v) => {
        const escapedKey = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(`\\[${escapedKey}\\]`, "g");
        textForCollab = textForCollab.replace(regex, collabData[v] || `[${v}]`);
      });

      allDocs.push(textForCollab);

      // Populate individual docs for ZIP
      finalContentsData.forEach((tpl) => {
        let singleContent = tpl.content;
        globalVariables.forEach((v) => {
          const escapedKey = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`\\[${escapedKey}\\]`, "g");
          singleContent = singleContent.replace(
            regex,
            globalFormData[v] || `[${v}]`,
          );
        });
        collaboratorVariables.forEach((v) => {
          const escapedKey = v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
          const regex = new RegExp(`\\[${escapedKey}\\]`, "g");
          singleContent = singleContent.replace(
            regex,
            collabData[v] || `[${v}]`,
          );
        });
        individualDocs.push({
          collabName,
          termName: tpl.name,
          content: singleContent,
        });
      });
    });

    const finalText = allDocs.join("\n\n[QUEBRA]\n\n");
    setGeneratedDoc(finalText);
    setGeneratedDocsList(individualDocs);
    setStep(3);
  };

  const copyToClipboard = () => {
    // Strip HTML for clipboard or use a temporary element
    const tempEl = document.createElement("div");
    tempEl.innerHTML = generatedDoc;
    navigator.clipboard.writeText(tempEl.innerText || tempEl.textContent || "");
    alert("Texto copiado para a área de transferência!");
  };

  const [isIndividualModalOpen, setIsIndividualModalOpen] = useState(false);
  const [groupingMode, setGroupingMode] = useState<
    "select" | "individual" | "by_collab" | "by_term"
  >("select");

  const getGroupedDocsList = () => {
    if (groupingMode === "individual") {
      return generatedDocsList;
    }
    if (groupingMode === "by_collab") {
      const grouped: Record<string, typeof generatedDocsList> = {};
      generatedDocsList.forEach((doc) => {
        if (!grouped[doc.collabName]) grouped[doc.collabName] = [];
        grouped[doc.collabName].push(doc);
      });
      return Object.entries(grouped).map(([collabName, docs]) => ({
        collabName,
        termName: `${docs.length} documento(s)`,
        content: docs.map((d) => d.content).join("[QUEBRA]"),
      }));
    }
    if (groupingMode === "by_term") {
      const grouped: Record<string, typeof generatedDocsList> = {};
      generatedDocsList.forEach((doc) => {
        if (!grouped[doc.termName]) grouped[doc.termName] = [];
        grouped[doc.termName].push(doc);
      });
      return Object.entries(grouped).map(([termName, docs]) => ({
        collabName: termName,
        termName: `${docs.length} funcionário(s)`,
        content: docs.map((d) => d.content).join("[QUEBRA]"),
      }));
    }
    return [];
  };

  const handlePrintIndividual = (doc: {
    collabName: string;
    termName: string;
    content: string;
  }) => {
    const isContratos = selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS";
    let printTitle = "";
    if (isContratos) {
      const company = (
        globalFormData["RAZÃO SOCIAL DA CONTRATANTE"] ||
        globalFormData["RAZÃO SOCIAL"] ||
        globalFormData["RAZAO SOCIAL"] ||
        globalFormData["NOME DA EMPRESA"] ||
        globalFormData["EMPRESA"] ||
        globalFormData["CONTRATANTE"] ||
        ""
      ).trim();
      printTitle = company ? `${doc.termName} [${company}].pdf` : `${doc.termName}.pdf`;
    } else {
      printTitle = `${doc.termName} - ${doc.collabName}.pdf`;
    }
    const printWindow = window.open("about:blank", "_blank");
    if (!printWindow) {
      alert("Por favor, permita pop-ups no seu navegador para gerar o PDF.");
      return;
    }

    const headStyles = Array.from(
      document.head.querySelectorAll('style, link[rel="stylesheet"]'),
    )
      .map((node) => node.outerHTML)
      .join("\n");

    let letterheadSrc = letterheadImage;
    if (
      letterheadSrc &&
      !letterheadSrc.startsWith("http") &&
      !letterheadSrc.startsWith("data:")
    ) {
      letterheadSrc =
        window.location.origin +
        (letterheadSrc.startsWith("/") ? "" : "/") +
        letterheadSrc;
    }

    const pagesHtml = doc.content
      .split(/<[^>]*>\s*\[QUEBRA\]\s*<\/[^>]*>|\[QUEBRA\]/i)
      .filter((pageContent) => pageContent.trim() !== "")
      .map(
        (pageContent) => `
        <div class="page-container bg-white rounded-none w-[210mm] min-h-[297mm] overflow-hidden relative" style="width: 210mm; min-height: 297mm; position: relative; overflow: hidden; page-break-after: always; break-after: page;">
          ${
            letterheadSrc
              ? `
            <div class="absolute inset-0 z-0 pointer-events-none" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; background-image: url('${letterheadSrc}'); background-size: 100% 100%; background-position: center; background-repeat: no-repeat; -webkit-print-color-adjust: exact; print-color-adjust: exact;"></div>
          `
              : ""
          }
          <div class="relative z-10 px-[25mm] pt-[72mm] pb-[50mm] text-black text-[10.5pt] font-serif leading-[1.5] h-full flex flex-col" style="position: relative; z-index: 10; padding: 72mm 25mm 50mm 25mm;">
             <div class="flex-1 text-justify doc-content">
               ${pageContent}
             </div>
          </div>
        </div>
      `,
      )
      .join("");

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
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              break-after: page !important;
              page-break-after: always !important;
            }
          </style>
        </head>
        <body>
          <div id="document-print-area">
            ${pagesHtml}
          </div>
          <script>
            window.onload = () => {
              setTimeout(() => {
                window.print();
              }, 500);
            };
          <\/script>
        </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrint = async () => {
    const element = document.getElementById("document-print-area");
    if (!element) return;
    setIsGeneratingPdf(true);
    try {
      const printTitle = getExportPdfFileName();

      const printWindow = window.open("about:blank", "_blank");
      if (!printWindow) {
        alert("Por favor, permita pop-ups no seu navegador para gerar o PDF.");
        setIsGeneratingPdf(false);
        return;
      }

      // 1. Copiar TODOS os estilos nativos da aplicação (Tailwind, fontes, index.css)
      // Isso garante 100% de fidelidade: margens pt-[72mm], px-[25mm], pb-[50mm] e fontes originais
      const headStyles = Array.from(
        document.head.querySelectorAll('style, link[rel="stylesheet"]'),
      )
        .map((node) => node.outerHTML)
        .join("\n");

      // 2. Clonar o elemento do documento (sem modificar a tela que o usuário está vendo)
      const clonedElement = element.cloneNode(true) as HTMLElement;
      // 3. Limpar apenas as classes e estilos de escala (scale-xxx) que faziam o PDF encolher
      clonedElement.style.transform = "none";
      clonedElement.style.webkitTransform = "none";
      clonedElement.style.width = "100%";
      clonedElement.style.margin = "0";
      clonedElement.style.padding = "0";
      clonedElement.className = clonedElement.className
        .replace(/scale-\[[^\]]*\]/g, "")
        .replace(/sm:scale-\[[^\]]*\]/g, "")
        .replace(/md:scale-\[[^\]]*\]/g, "")
        .replace(/lg:scale-\[[^\]]*\]/g, "")
        .replace(/xl:scale-\[[^\]]*\]/g, "")
        .replace(/origin-\w+/g, "")
        .replace(/transform\b/g, "")
        .replace(/\s+/g, " ")
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
            <script>
              window.onload = function() {
                setTimeout(function() { window.print(); }, 600);
              };
            <\/script>
          </body>
        </html>
      `;

      printWindow.document.open();
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } catch (e) {
      console.error(e);
      alert("Ocorreu um erro ao preparar a impressão.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const resetFields = () => {
    const emptyGlobal: Record<string, string> = {};
    globalVariables.forEach((v) => (emptyGlobal[v] = ""));
    setGlobalFormData(emptyGlobal);
    const emptyCollab: Record<string, string> = {};
    collaboratorVariables.forEach((v) => (emptyCollab[v] = ""));
    setCollaboratorsData([emptyCollab]);
    setStep(2);
  };

  const performPdfExtraction = async (
    base64: string,
    gVars: string[],
    cVars: string[],
  ) => {
    setIsExtracting(true);
    setExtractStatus(null);
    setNotification({ ...notification, visible: false });

    try {
      const empresasToSend = empresas.map((e) => ({
        id: e.id,
        nome: e.nome,
        cnpj: e.cnpj,
      }));

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          pdfBase64: base64,
          type: "custom",
          globalVars: gVars,
          collabVars: cVars,
          registeredCompanies: empresasToSend,
        }),
      });

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        setErrorLog(`Erro ao extrair DP - SIMPLES CONTÁBIL: A Vercel (ou o servidor) retornou um conteúdo que não é JSON.
Status da Resposta: ${response.status} ${response.statusText}
Content-Type recebido: ${contentType || "Nenhum"}

--- CORPO DA RESPOSTA (HTML ou Texto) ---
${text}`);
        throw new SyntaxError(
          "O servidor retornou HTML. O arquivo pode ser muito grande para o proxy ou ocorreu timeout.",
        );
      }

      const resData = await response.json();
      if (!response.ok || resData.error) {
        setNotification({
          type: "error",
          message: resData.error || "Erro na extração dos dados.",
          visible: true,
        });
        setExtractStatus({
          message: `EXTRAÇÃO FALHOU APÓS ${resData.attempts || 1} TENTATIVA(S)`,
          type: "error",
        });
        setTimeout(
          () => setNotification((prev) => ({ ...prev, visible: false })),
          6000,
        );
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
        } else if (typeof data === "object" && data !== null) {
          const values = Object.values(data);
          const firstArray = values.find(Array.isArray);
          if (firstArray) {
            records = firstArray;
          } else {
            records = [data];
          }
        }

        records.forEach((record) => {
          if (typeof record !== "object" || !record) return;
          let targetIndex = newCollabForm.length - 1;
          if (targetIndex >= 0) {
            const lastCollab = newCollabForm[targetIndex];
            const hasData = Object.values(lastCollab).some(
              (val) => val && typeof val === "string" && val.trim() !== "",
            );
            if (hasData) {
              targetIndex = newCollabForm.length;
              newCollabForm.push({});
            }
          } else {
            targetIndex = 0;
            newCollabForm.push({});
          }

          Object.entries(record).forEach(([jsonKey, jsonValue]) => {
            const val =
              typeof jsonValue === "string"
                ? jsonValue
                : String(jsonValue || "");
            const normalizedJsonKey = jsonKey
              .toLowerCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim();

            // Match globals
            gVars.forEach((v) => {
              const normalizedV = v
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
              if (normalizedV === normalizedJsonKey) {
                newGlobalForm[v] = val;
                matchCount++;
              }
            });

            // Match collab
            cVars.forEach((v) => {
              const normalizedV = v
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .trim();
              if (normalizedV === normalizedJsonKey) {
                newCollabForm[targetIndex][v] = val;
                matchCount++;
              }
            });
          });
        });

        setGlobalFormData(newGlobalForm);
        setCollaboratorsData(newCollabForm);
        // Auto-create calendar events for Experiencia if variables match or if it's in the raw records
        let expWarning = null;
        try {
          const rawRecord = records[0] || {};
          const extractKey = (obj: any, keys: string[]) => {
            const foundKey = Object.keys(obj).find((k) =>
              keys.some(
                (key) =>
                  k
                    .toLowerCase()
                    .normalize("NFD")
                    .replace(/[\u0300-\u036f]/g, "")
                    .trim() === key.toLowerCase(),
              ),
            );
            return foundKey ? obj[foundKey] : undefined;
          };

          const dataAdmissao =
            extractKey(newGlobalForm, [
              "DATA DE ADMISSÃO",
              "DATA DE ADMISSAO",
            ]) ||
            extractKey(newCollabForm[0] || {}, [
              "DATA DE ADMISSÃO",
              "DATA DE ADMISSAO",
            ]) ||
            extractKey(rawRecord, [
              "DATA DE ADMISSÃO",
              "DATA DE ADMISSAO",
              "ADMISSAO",
            ]);
          const diasExp1 =
            extractKey(newGlobalForm, [
              "DIAS DE EXPERIENCIA",
              "DIAS DE EXPERIÊNCIA",
            ]) ||
            extractKey(newCollabForm[0] || {}, [
              "DIAS DE EXPERIENCIA",
              "DIAS DE EXPERIÊNCIA",
            ]) ||
            extractKey(rawRecord, [
              "DIAS DE EXPERIENCIA",
              "DIAS DE EXPERIÊNCIA",
              "EXPERIENCIA",
            ]);
          const diasExp2 =
            extractKey(newGlobalForm, [
              "DIAS DE PRORROGACAO",
              "DIAS DE PRORROGAÇÃO",
            ]) ||
            extractKey(newCollabForm[0] || {}, [
              "DIAS DE PRORROGACAO",
              "DIAS DE PRORROGAÇÃO",
            ]) ||
            extractKey(rawRecord, [
              "DIAS DE PRORROGACAO",
              "DIAS DE PRORROGAÇÃO",
              "PRORROGACAO",
            ]);
          const nomeColab =
            extractKey(newCollabForm[0] || {}, [
              "NOME DO COLABORADOR",
              "NOME DO EMPREGADO",
              "NOME",
            ]) ||
            extractKey(rawRecord, [
              "NOME DO COLABORADOR",
              "NOME DO EMPREGADO",
              "NOME",
            ]) ||
            "Colaborador";
          const nomeEmpresa =
            extractKey(newGlobalForm, ["NOME DA EMPRESA", "EMPRESA"]) ||
            extractKey(rawRecord, [
              "NOME DA EMPRESA",
              "EMPRESA",
              "NOME EMPRESA",
            ]) ||
            "";

          const cnpjEmpresa =
            extractKey(newGlobalForm, ["CNPJ DA EMPRESA", "CNPJ"]) ||
            extractKey(rawRecord, ["CNPJ DA EMPRESA", "CNPJ"]);
          const empresaIdFromAI =
            extractKey(newGlobalForm, ["EMPRESA_ID"]) ||
            extractKey(rawRecord, ["EMPRESA_ID"]);

          if (dataAdmissao && typeof dataAdmissao === "string" && diasExp1) {
            const [dia, mes, ano] = dataAdmissao.split("/").map(Number);
            if (dia && mes && ano) {
              const admissionDate = new Date(ano, mes - 1, dia);
              const dias1 = parseInt(String(diasExp1).replace(/\D/g, ""));
              const dias2 = parseInt(String(diasExp2 || "").replace(/\D/g, ""));

              if (!isNaN(dias1)) {
                const fimExp1 = new Date(admissionDate);
                fimExp1.setDate(fimExp1.getDate() + dias1 - 1);
                let prorrogaDate = null;
                if (!isNaN(dias2)) {
                  prorrogaDate = new Date(fimExp1);
                  prorrogaDate.setDate(prorrogaDate.getDate() + dias2);
                }

                // Tentar localizar a empresa correspondente no DB
                let matchedEmpresaId = empresaIdFromAI;
                let matchedEmpresaNome = nomeEmpresa;
                if (!matchedEmpresaId && empresas.length > 0) {
                  if (cnpjEmpresa) {
                    const cleanCnpj = cnpjEmpresa.replace(/\D/g, "");
                    const match = empresas.find(
                      (e) => e.cnpj && e.cnpj.replace(/\D/g, "") === cleanCnpj,
                    );
                    if (match) {
                      matchedEmpresaId = match.id;
                      matchedEmpresaNome = match.nome;
                    }
                  }
                  if (!matchedEmpresaId && nomeEmpresa) {
                    const normalizedNome = nomeEmpresa
                      .toLowerCase()
                      .normalize("NFD")
                      .replace(/[\u0300-\u036f]/g, "")
                      .trim();
                    const match = empresas.find(
                      (e) =>
                        e.nome
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .trim()
                          .includes(normalizedNome) ||
                        normalizedNome.includes(
                          e.nome
                            .toLowerCase()
                            .normalize("NFD")
                            .replace(/[\u0300-\u036f]/g, "")
                            .trim(),
                        ),
                    );
                    if (match) {
                      matchedEmpresaId = match.id;
                      matchedEmpresaNome = match.nome;
                    }
                  }
                } else if (matchedEmpresaId) {
                  const match = empresas.find((e) => e.id === matchedEmpresaId);
                  if (match) {
                    matchedEmpresaNome = match.nome;
                  }
                }

                setExperienciaAviso({
                  nomeColab,
                  nomeEmpresa: matchedEmpresaNome,
                  empresaId: matchedEmpresaId,
                  admissionDate,
                  fimExp1,
                  prorrogaDate,
                  dias1,
                  dias2: isNaN(dias2) ? null : dias2,
                });
              } else {
                expWarning =
                  "Aviso: Dias de experiência inválidos. Por favor, verifique ou informe manualmente.";
              }
            } else {
              expWarning =
                "Aviso: Data de admissão inválida. Por favor, verifique ou informe manualmente.";
            }
          } else {
            // Se não encontrou dados de experiência
            expWarning =
              "Aviso: Dados de experiência não localizados pelo IA. Continue ou adicione manualmente.";
          }
        } catch (e) {
          console.error("Erro ao preparar eventos de experiência", e);
          expWarning = "Erro ao processar dados de experiência.";
        }

        setExtractStatus({
          message: `EXTRAÇÃO CONCLUÍDA APÓS ${attempts || 1} TENTATIVA(S) VIA ${modelUsed || "GEMINI"}`,
          type: "success",
        });
        let finalMessage = `Dados extraídos com sucesso! ${matchCount} campos preenchidos.`;
        if (expWarning) {
          finalMessage += `\n${expWarning}`;
        }
        setNotification({
          type: expWarning ? "error" : "success", // Usar error para mostrar o warning em vermelho se não achou, ou amarelo se tivéssemos tipo warning
          message: finalMessage,
          visible: true,
        });

        setTimeout(
          () => setNotification((prev) => ({ ...prev, visible: false })),
          6000,
        );
      }
    } catch (error) {
      console.error(error);
      setErrorLog((prev) =>
        prev
          ? prev
          : `Erro de Código/Rede (APP):
Tipo de Erro: ${error instanceof Error ? error.name : "Unknown"}
Mensagem: ${error instanceof Error ? error.message : String(error)}

Stack Trace:
${error instanceof Error ? error.stack : "N/A"}`,
      );
      setExtractStatus({ message: `EXTRAÇÃO FALHOU`, type: "error" });
      setNotification({
        type: "error",
        message:
          "Ocorreu um erro inesperado ao processar o relatório. Recomendamos preencher manualmente.",
        visible: true,
      });
      setTimeout(
        () => setNotification((prev) => ({ ...prev, visible: false })),
        6000,
      );
    } finally {
      setIsExtracting(false);
    }
  };

  const performCnpjExtraction = async (file: File) => {
    setIsExtracting(true);
    setExtractStatus(null);
    setNotification((prev) => ({ ...prev, visible: false }));

    try {
      const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
      let base64 = "";
      let mimeType = file.type || (isPdf ? "application/pdf" : "image/png");

      if (isPdf) {
        base64 = await getTrimmedPdfBase64(file, 2);
      } else {
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const pureBase64 = result.includes(",") ? result.split(",")[1] : result;
            resolve(pureBase64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      const response = await fetch("/api/extract-pdf", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${await auth.currentUser?.getIdToken()}`,
        },
        body: JSON.stringify({
          pdfBase64: base64,
          mimeType,
          type: "cnpj",
        }),
      });

      const resData = await response.json();
      if (!response.ok || resData.error) {
        setNotification({
          type: "error",
          message: resData.error || "Erro na leitura do Cartão CNPJ.",
          visible: true,
        });
        setExtractStatus({ message: "EXTRAÇÃO DO CNPJ FALHOU", type: "error" });
        return;
      }

      const cnpjData = resData.data;
      if (cnpjData) {
        const updated: Record<string, string> = { ...globalFormData };
        let matchCount = 0;

        const now = new Date();
        const meses = [
          "janeiro", "fevereiro", "março", "abril", "maio", "junho",
          "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"
        ];
        const dataFormatadaExtenso = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;

        const razao = cnpjData.razaoSocial || cnpjData.nomeFantasia || "";
        const cnpjNum = cnpjData.cnpj || "";
        const enderecoComp = cnpjData.enderecoCompleto || [
          cnpjData.logradouro,
          cnpjData.numero ? `nº ${cnpjData.numero}` : "",
          cnpjData.complemento,
          cnpjData.bairro ? `Bairro ${cnpjData.bairro}` : "",
          cnpjData.cidade && cnpjData.uf ? `${cnpjData.cidade}/${cnpjData.uf}` : cnpjData.cidade,
          cnpjData.cep ? `CEP ${cnpjData.cep}` : ""
        ].filter(Boolean).join(", ");
        const cidadeUf = cnpjData.cidade && cnpjData.uf ? `${cnpjData.cidade}/${cnpjData.uf}` : cnpjData.cidade || "Rio Verde/GO";
        const repLegal = cnpjData.representanteLegal || "";
        const cpfRep = cnpjData.cpfRepresentante || "";

        globalVariables.forEach((key) => {
          const k = key.toUpperCase();
          if (
            k.includes("RAZÃO SOCIAL") ||
            k.includes("RAZAO SOCIAL") ||
            k.includes("NOME DA EMPRESA") ||
            k === "EMPREGADOR" ||
            k === "CONTRATANTE" ||
            (k.includes("EMPRESA") && !k.includes("ENDEREÇO") && !k.includes("CNPJ"))
          ) {
            if (!k.includes("ESCRITÓRIO") && !k.includes("ESCRITORIO") && !k.includes("CONTRATADA")) {
              if (razao) {
                updated[key] = razao;
                matchCount++;
              }
            }
          } else if (k.includes("NOME FANTASIA")) {
            if (cnpjData.nomeFantasia || razao) {
              updated[key] = cnpjData.nomeFantasia || razao;
              matchCount++;
            }
          } else if (k.includes("CNPJ")) {
            if (!k.includes("ESCRITÓRIO") && !k.includes("ESCRITORIO") && !k.includes("CONTRATADA")) {
              if (cnpjNum) {
                updated[key] = cnpjNum;
                matchCount++;
              }
            }
          } else if (k.includes("ENDEREÇO") || k.includes("ENDERECO") || k.includes("LOGRADOURO")) {
            if (!k.includes("ESCRITÓRIO") && !k.includes("ESCRITORIO") && !k.includes("CONTRATADA")) {
              if (enderecoComp) {
                updated[key] = enderecoComp;
                matchCount++;
              }
            }
          } else if (k.includes("CIDADE") || k === "CIDADE/UF") {
            updated[key] = cidadeUf;
            matchCount++;
          } else if (k.includes("REPRESENTANTE")) {
            if (repLegal) {
              updated[key] = repLegal;
              matchCount++;
            }
          } else if (k.includes("CPF DO REPRESENTANTE") || k.includes("CPF REPRESENTANTE")) {
            if (cpfRep) {
              updated[key] = cpfRep;
              matchCount++;
            }
          } else if (k === "DATA" || k.includes("DATA DE ASSINATURA")) {
            updated[key] = dataFormatadaExtenso;
            matchCount++;
          } else if (k.includes("ESCRITÓRIO") || k.includes("ESCRITORIO") || k.includes("CONTRATADA")) {
            if (k.includes("NOME")) updated[key] = updated[key] || "SIMPLES CONTÁBIL ASSESSORIA LTDA";
            if (k.includes("CNPJ")) updated[key] = updated[key] || "00.000.000/0001-00";
            if (k.includes("ENDEREÇO") || k.includes("ENDERECO")) updated[key] = updated[key] || "Rio Verde - GO";
          }
        });

        setGlobalFormData(updated);
        setExtractStatus({
          message: `EXTRAÇÃO DO CARTÃO CNPJ CONCLUÍDA VIA ${resData.modelUsed || "GEMINI"}`,
          type: "success",
        });
        setNotification({
          type: "success",
          message: `Cartão CNPJ processado com sucesso! ${matchCount} campos preenchidos. Complete os dados restantes manualmente.`,
          visible: true,
        });
      }
    } catch (err: any) {
      console.error("Erro na extração do Cartão CNPJ:", err);
      setNotification({
        type: "error",
        message: "Falha ao extrair dados do Cartão CNPJ. Preencha manualmente.",
        visible: true,
      });
      setExtractStatus({ message: "EXTRAÇÃO DO CNPJ FALHOU", type: "error" });
    } finally {
      setIsExtracting(false);
    }
  };

  const handleCnpjUpload = async (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>,
  ) => {
    e.preventDefault();
    let file: File | null = null;
    if ("dataTransfer" in e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    } else if ("target" in e && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }
    if (!file) return;

    await performCnpjExtraction(file);

    if (e.target && "value" in e.target) {
      (e.target as HTMLInputElement).value = "";
    }
  };

  const handlePdfUpload = async (
    e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<any>,
  ) => {
    e.preventDefault();
    let file: File | null = null;
    if ("dataTransfer" in e) {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        file = e.dataTransfer.files[0];
      }
    } else if ("target" in e && e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    }

    if (!file) return;

    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setNotification({
        type: "error",
        message: "O relatório admissional deve ser em formato PDF.",
        visible: true,
      });
      return;
    }

    try {
      const base64 = await getTrimmedPdfBase64(file as File, 5); // 5 pages max for custom templates
      await performPdfExtraction(
        base64,
        globalVariables,
        collaboratorVariables,
      );
    } catch (error) {
      console.error("Erro ao preparar PDF:", error);
    } finally {
      if (e.target && "value" in e.target) {
        (e.target as HTMLInputElement).value = "";
      }
    }
  };

  const globalVarsRef = useRef(globalVariables);
  const collabVarsRef = useRef(collaboratorVariables);
  useEffect(() => {
    globalVarsRef.current = globalVariables;
    collabVarsRef.current = collaboratorVariables;
  }, [globalVariables, collaboratorVariables]);

  // Process pending PDF extraction after state has updated
  useEffect(() => {
    if (pendingPdfExtraction && step === 2) {
      const base64 = pendingPdfExtraction;
      setPendingPdfExtraction(null); // Prevent infinite loop
      
      setTimeout(() => {
        performPdfExtraction(base64, globalVarsRef.current, collabVarsRef.current);
      }, 500); // Wait a short tick for variables to be extracted from template
    }
  }, [pendingPdfExtraction, step]);

  // UI Components per step
  if (isCheckingAuth) {
    return (
      <div className="flex flex-col h-screen w-screen bg-slate-950 items-center justify-center text-slate-200">
        <div className="flex items-center gap-3 mb-4">
          <img
            src="/logo.png?v=2"
            alt="Simples Assessoria"
            className="h-10 w-10 object-contain animate-pulse"
          />
          <span className="text-base font-bold text-white uppercase tracking-tight">
            Simples Assessoria
          </span>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
          <span>Iniciando sistema...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="h-screen w-screen bg-slate-950 flex items-center justify-center">
        <form
          onSubmit={handleLogin}
          className="bg-slate-900 p-8 rounded-xl border border-slate-800 shadow-2xl flex flex-col w-full max-w-sm"
        >
          <h2 className="text-xl text-white font-medium mb-6 text-center">
            Acesso Restrito
          </h2>
          <input
            type="password"
            placeholder="Senha"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-white px-4 py-3 rounded-lg mb-4 focus:border-indigo-500 focus:outline-none"
          />
          {loginError && (
            <p className="text-red-500 text-sm mb-4">{loginError}</p>
          )}
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-lg transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] bg-slate-950 text-slate-200 font-sans selection:bg-indigo-500 selection:text-white overflow-hidden print:overflow-visible print:h-auto print:bg-white print:text-black">
      {/* Toast Notification */}
      {notification.visible && (
        <div
          className={`fixed top-6 right-6 z-50 p-4 rounded-xl border flex items-center space-x-3 shadow-2xl transition-all duration-300 ${
            notification.type === "success"
              ? "bg-slate-900 border-emerald-500 text-emerald-400"
              : "bg-slate-900 border-red-500 text-red-400"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          )}
          <span className="text-sm font-medium tracking-wide pr-8">
            {notification.message}
          </span>
          <button
            onClick={() =>
              setNotification((prev) => ({ ...prev, visible: false }))
            }
            className="absolute right-3 top-4 hover:opacity-70 transition-opacity"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Experiencia Aviso Modal */}
      {experienciaAviso && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3 text-indigo-400">
                <CalendarDays className="w-6 h-6" />
                <h2 className="text-lg font-medium">
                  Contrato de Experiência Localizado
                </h2>
              </div>
              <button
                onClick={() => setIsEditingExperiencia(!isEditingExperiencia)}
                className={`p-2 rounded-lg transition-colors ${isEditingExperiencia ? "bg-indigo-500/20 text-indigo-400" : "text-slate-500 hover:text-indigo-400 hover:bg-slate-800"}`}
                title={
                  isEditingExperiencia ? "Concluir edição" : "Editar datas"
                }
              >
                {isEditingExperiencia ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <Pencil className="w-5 h-5" />
                )}
              </button>
            </div>

            {isEditingExperiencia ? (
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Empresa
                  </label>
                  <select
                    value={experienciaAviso.empresaId || ""}
                    onChange={(e) => {
                      const empId = e.target.value;
                      const empName =
                        empresas.find((em) => em.id === empId)?.nome || "";
                      setExperienciaAviso({
                        ...experienciaAviso,
                        empresaId: empId,
                        nomeEmpresa: empName,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {empresas.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Dias 1º Período
                  </label>
                  <input
                    type="number"
                    value={experienciaAviso.dias1}
                    onChange={(e) => {
                      const dias1 = parseInt(e.target.value) || 0;
                      const fimExp1 = new Date(experienciaAviso.admissionDate);
                      fimExp1.setDate(fimExp1.getDate() + dias1 - 1);
                      let prorrogaDate = null;
                      if (experienciaAviso.dias2) {
                        prorrogaDate = new Date(fimExp1);
                        prorrogaDate.setDate(
                          prorrogaDate.getDate() + experienciaAviso.dias2,
                        );
                      }
                      setExperienciaAviso({
                        ...experienciaAviso,
                        dias1,
                        fimExp1,
                        prorrogaDate,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Data Fim 1º Período
                  </label>
                  <input
                    type="date"
                    value={experienciaAviso.fimExp1.toISOString().split("T")[0]}
                    onChange={(e) => {
                      const fimExp1 = new Date(e.target.value + "T12:00:00");
                      let prorrogaDate = null;
                      if (experienciaAviso.dias2) {
                        prorrogaDate = new Date(fimExp1);
                        prorrogaDate.setDate(
                          prorrogaDate.getDate() + experienciaAviso.dias2,
                        );
                      }
                      setExperienciaAviso({
                        ...experienciaAviso,
                        fimExp1,
                        prorrogaDate,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                    Dias Prorrogação
                  </label>
                  <input
                    type="number"
                    value={experienciaAviso.dias2 || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const dias2 = val ? parseInt(val) : null;
                      let prorrogaDate = null;
                      if (dias2) {
                        prorrogaDate = new Date(experienciaAviso.fimExp1);
                        prorrogaDate.setDate(prorrogaDate.getDate() + dias2);
                      }
                      setExperienciaAviso({
                        ...experienciaAviso,
                        dias2,
                        prorrogaDate,
                      });
                    }}
                    placeholder="Sem prorrogação"
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                  />
                </div>
                {experienciaAviso.prorrogaDate && (
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
                      Data Fim Prorrogação
                    </label>
                    <input
                      type="date"
                      value={
                        experienciaAviso.prorrogaDate
                          .toISOString()
                          .split("T")[0]
                      }
                      onChange={(e) => {
                        const prorrogaDate = new Date(
                          e.target.value + "T12:00:00",
                        );
                        setExperienciaAviso({
                          ...experienciaAviso,
                          prorrogaDate,
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors"
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-slate-300 mb-6 leading-relaxed">
                <p>
                  Na empresa{" "}
                  <strong className="text-white">
                    {experienciaAviso.nomeEmpresa || "Não identificada"}
                  </strong>
                  , o colaborador{" "}
                  <strong className="text-white">
                    {experienciaAviso.nomeColab}
                  </strong>{" "}
                  tem um contrato de experiência de{" "}
                  <strong className="text-white">
                    {experienciaAviso.dias1} dias
                  </strong>{" "}
                  (de{" "}
                  {experienciaAviso.admissionDate.toLocaleDateString("pt-BR")} a{" "}
                  {experienciaAviso.fimExp1.toLocaleDateString("pt-BR")})
                  {experienciaAviso.prorrogaDate && experienciaAviso.dias2 ? (
                    <>
                      {" "}
                      e prorrogação de{" "}
                      <strong className="text-white">
                        {experienciaAviso.dias2} dias
                      </strong>{" "}
                      (até{" "}
                      {experienciaAviso.prorrogaDate.toLocaleDateString(
                        "pt-BR",
                      )}
                      ).
                    </>
                  ) : (
                    <> sem prorrogação especificada.</>
                  )}
                </p>
                {!experienciaAviso.empresaId && (
                  <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                    <p className="text-amber-400 text-sm mb-2 font-medium flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />A empresa "
                      {experienciaAviso.nomeEmpresa}" não foi localizada nos
                      cadastros.
                    </p>
                    <p className="text-slate-400 text-xs mb-3">
                      Selecione uma empresa existente abaixo ou prossiga sem
                      vínculo.
                    </p>
                    <select
                      value={experienciaAviso.empresaId || ""}
                      onChange={(e) => {
                        const empId = e.target.value;
                        const empName =
                          empresas.find((em) => em.id === empId)?.nome ||
                          experienciaAviso.nomeEmpresa;
                        setExperienciaAviso({
                          ...experienciaAviso,
                          empresaId: empId,
                          nomeEmpresa: empName,
                        });
                      }}
                      className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
                    >
                      <option value="">Continuar sem vínculo associado</option>
                      {empresas.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <p className="text-sm text-slate-400 mb-6">
              Deseja adicionar os alertas de vencimento ao seu Calendário?
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setExperienciaAviso(null);
                  setIsEditingExperiencia(false);
                }}
                className="px-5 py-2.5 text-slate-400 hover:text-slate-200 font-medium transition-colors"
              >
                Não Adicionar
              </button>
              <button
                onClick={() => {
                  handleLancarExperienciaAviso();
                  setIsEditingExperiencia(false);
                }}
                className="bg-indigo-600 text-white hover:bg-indigo-500 px-5 py-2.5 rounded-lg font-medium transition-colors"
              >
                Sim, Adicionar aos Avisos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SIDEBAR OVERLAY FOR MOBILE */}
      {sidebarOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40 print:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={`fixed md:relative inset-y-0 left-0 z-50 ${sidebarOpen ? "w-64 translate-x-0" : "w-64 -translate-x-full md:w-16 md:translate-x-0"} bg-slate-900 border-r border-slate-700/50 flex flex-col transition-all duration-300 shrink-0 print:hidden`}
      >
        {/* Logo / Nome do App */}
        <div className="p-4 border-b border-slate-700/50 flex items-center gap-3">
          <img
            src="/logo.png?v=2"
            alt="Simples Assessoria"
            className="h-8 w-8 object-contain shrink-0"
          />
          {sidebarOpen && (
            <span className="text-[13px] font-bold text-white uppercase tracking-tight whitespace-normal leading-tight">
              SIMPLES ASSESSORIA<br/><span className="text-[10px] text-slate-400">CONTÁBIL E EMPRESARIAL</span>
            </span>
          )}
        </div>

        {/* Menu Items Accordion */}
        <nav className="flex-1 py-4 px-2 space-y-2 overflow-y-auto custom-scrollbar">
          
          <button
            onClick={() => handleNavigate("dashboard")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-colors ${
              modulo === "dashboard"
                ? "bg-indigo-600/20 text-indigo-400"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            }`}
          >
            <LayoutDashboard className="w-5 h-5 shrink-0" />
            {sidebarOpen && <span>Tela Inicial</span>}
          </button>

          {sidebarOpen ? (
            <>
              {/* DP & RH MODULE */}
              <div className="mt-4">
                <button 
                  onClick={() => toggleMenu('dprh')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  <span>DP & RH</span>
                  {openMenus.includes('dprh') ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                </button>
                
                {openMenus.includes('dprh') && (
                  <div className="mt-1 space-y-1 ml-2 border-l border-slate-700/50 pl-2">
                    <button onClick={() => handleNavigate("kanban")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "kanban" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><KanbanSquare className="w-4 h-4 shrink-0" /> <span>Kanban</span></button>
                    <button onClick={() => handleNavigate("checklists")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "checklists" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><CheckSquare className="w-4 h-4 shrink-0" /> <span>Programação e Processos</span></button>
                    <button onClick={() => handleNavigate("calendario")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "calendario" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><CalendarDays className="w-4 h-4 shrink-0" /> <span>Calendário</span></button>
                    <button onClick={() => handleNavigate("fechamento")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "fechamento" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><FileSpreadsheet className="w-4 h-4 shrink-0" /> <span>Fechamento de Folha</span></button>
                    <button onClick={() => handleNavigate("autotermos", "DP & RH")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "autotermos" && selectedSubgrupo === "DP & RH" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><FileText className="w-4 h-4 shrink-0" /> <span>Termos (DP & RH)</span></button>
                    <button onClick={() => handleNavigate("recibos")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "recibos" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><Receipt className="w-4 h-4 shrink-0" /> <span>Recibos</span></button>
                    <button onClick={() => handleNavigate("banco-horas")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "banco-horas" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><Clock className="w-4 h-4 shrink-0" /> <span>Banco de Horas</span></button>
                    <button onClick={() => handleNavigate("boletos")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "boletos" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><FileStack className="w-4 h-4 shrink-0" /> <span>Boletos</span></button>
                    <button onClick={() => handleNavigate("trct")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "trct" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><Briefcase className="w-4 h-4 shrink-0" /> <span>TRCT</span></button>
                    <button onClick={() => handleNavigate("sindicatos")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "sindicatos" ? "bg-indigo-600/20 text-indigo-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><Building2 className="w-4 h-4 shrink-0" /> <span>Cadastro de Sindicatos</span></button>
                  </div>
                )}
              </div>

              {/* GERAL MODULE */}
              <div className="mt-4">
                <button 
                  onClick={() => toggleMenu('geral')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  <span>GERAL</span>
                  {openMenus.includes('geral') ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                </button>
                
                {openMenus.includes('geral') && (
                  <div className="mt-1 space-y-1 ml-2 border-l border-slate-700/50 pl-2">
                    <button onClick={() => handleNavigate("empresas")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "empresas" ? "bg-emerald-600/20 text-emerald-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><Building2 className="w-4 h-4 shrink-0" /> <span>Cadastro de Empresas</span></button>
                    <button onClick={() => handleNavigate("autotermos", "GERAL")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "autotermos" && selectedSubgrupo === "GERAL" ? "bg-emerald-600/20 text-emerald-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><FileSignature className="w-4 h-4 shrink-0" /> <span>Contratos Contábeis</span></button>
                  </div>
                )}
              </div>

              {/* LEGALIZAÇÃO MODULE */}
              <div className="mt-4">
                <button 
                  onClick={() => toggleMenu('legalizacao')}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest hover:text-slate-300 transition-colors"
                >
                  <span>LEGALIZAÇÃO</span>
                  {openMenus.includes('legalizacao') ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}
                </button>
                
                {openMenus.includes('legalizacao') && (
                  <div className="mt-1 space-y-1 ml-2 border-l border-slate-700/50 pl-2">
                    <button onClick={() => handleNavigate("kanban-legalizacao")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "kanban-legalizacao" ? "bg-amber-600/20 text-amber-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><KanbanSquare className="w-4 h-4 shrink-0" /> <span>Kanban de Legalização</span></button>
                    <button onClick={() => handleNavigate("alvaras")} className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${modulo === "alvaras" ? "bg-amber-600/20 text-amber-400" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}><ShieldCheck className="w-4 h-4 shrink-0" /> <span>Controle de Alvarás</span></button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="mt-4 flex flex-col gap-4 items-center border-t border-slate-700/50 pt-4">
               {/* Modo colapsado */}
               <button onClick={() => setSidebarOpen(true)} title="DP & RH" className="text-slate-500 hover:text-indigo-400 transition-colors"><Briefcase className="w-5 h-5"/></button>
               <button onClick={() => setSidebarOpen(true)} title="Cadastro de Empresas" className="text-slate-500 hover:text-emerald-400 transition-colors"><Building2 className="w-5 h-5"/></button>
               <button onClick={() => setSidebarOpen(true)} title="Contratos Contábeis" className="text-slate-500 hover:text-emerald-400 transition-colors"><FileSignature className="w-5 h-5"/></button>
               <button onClick={() => setSidebarOpen(true)} title="Legalização / Alvarás" className="text-slate-500 hover:text-amber-400 transition-colors"><ShieldCheck className="w-5 h-5"/></button>
            </div>
          )}
        </nav>

        {/* Toggle button no rodapé */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 border-t border-slate-700/50 flex items-center justify-center text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          {sidebarOpen ? (
            <PanelLeftClose className="w-5 h-5" />
          ) : (
            <PanelLeftOpen className="w-5 h-5" />
          )}
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 overflow-auto bg-slate-950 relative flex flex-col print:overflow-visible print:bg-white w-full max-w-full">
        {/* Mobile Header */}
        <div className="md:hidden sticky top-0 z-40 flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900 shrink-0 shadow-sm print:hidden">
          <div className="flex items-center gap-3">
            <img
              src="/logo.png?v=2"
              alt="Simples Assessoria"
              className="h-8 w-8 object-contain shrink-0"
            />
            <span className="text-sm font-bold text-white uppercase tracking-tight">
              Simples Assessoria
            </span>
          </div>
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-400 hover:text-white p-2"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
        {modulo === "dashboard" ? (
          <DashboardApp />
        ) : modulo === "fechamento" ? (
          <FechamentoFolhaApp />
        ) : modulo === "sindicatos" ? (
          <EmpresasApp
            initialTab="SINDICATOS"
            entityToEdit={entityToEdit}
            clearEntityToEdit={() => setEntityToEdit(null)}
          />
        ) : modulo === "empresas" ? (
          <EmpresasApp
            initialTab="EMPRESAS"
            entityToEdit={entityToEdit}
            clearEntityToEdit={() => setEntityToEdit(null)}
          />
        ) : modulo === "checklists" ? (
          <ChecklistsApp
            onEditEntity={(id, type) => {
              setEntityToEdit({ id, type });
              handleNavigate("empresas");
            }}
          />
        ) : modulo === "calendario" ? (
          <CalendarioApp />
        ) : modulo === "kanban" ? (
          <KanbanApp 
            moduleTitle="Kanban de Demandas" 
            tasksCollection="kanban_tasks" 
            columnsCollection="kanban_columns" 
            autoSeed={true} 
          />
        ) : modulo === "kanban-legalizacao" ? (
          <KanbanApp 
            moduleTitle="Kanban de Legalização" 
            tasksCollection="kanban_legalizacao_tasks" 
            columnsCollection="kanban_legalizacao_columns" 
            autoSeed={false} 
          />
        ) : modulo === "recibos" ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <ReciboApp />
          </main>
        ) : modulo === "boletos" ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <BoletoApp />
          </main>
        ) : modulo === "banco-horas" ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <BancoDeHorasApp />
          </main>
        ) : modulo === "trct" ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <TrctApp />
          </main>
        ) : modulo === "alvaras" ? (
          <main className="w-full flex flex-col print:p-0 print:m-0">
            <AlvaraApp />
          </main>
        ) : (
          <main className="w-full max-w-[1600px] mx-auto p-6 md:p-8 flex flex-col print:p-0 print:m-0 print:max-w-none">
            {modulo === "autotermos" && (
              <div className="flex items-center justify-between space-x-4 md:space-x-8 text-xs md:text-sm font-serif tracking-widest text-slate-500 w-full flex-wrap gap-y-2 mb-6 print:hidden">
                <div className="flex items-center space-x-6">
                  <button
                    onClick={() => setStep(1)}
                    className={`flex items-center space-x-2 transition-colors hover:text-slate-200 ${step === 1 ? "text-slate-200 font-bold" : ""}`}
                  >
                    <span>1. MODELO</span>
                  </button>
                  <button
                    onClick={() => {
                      if (batchTemplateIds.length > 0 && variables.length > 0)
                        setStep(2);
                    }}
                    className={`flex items-center space-x-2 transition-colors hover:text-slate-200 ${step === 2 ? "text-slate-200 font-bold" : ""} ${batchTemplateIds.length === 0 || variables.length === 0 ? "opacity-50 cursor-not-allowed hover:text-slate-500" : ""}`}
                  >
                    <span>2. PREENCHER</span>
                  </button>
                  <button
                    onClick={() => {
                      if (generatedDoc) setStep(3);
                    }}
                    className={`flex items-center space-x-2 transition-colors hover:text-slate-200 ${step === 3 ? "text-slate-200 font-bold" : ""} ${!generatedDoc ? "opacity-50 cursor-not-allowed hover:text-slate-500" : ""}`}
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
                <aside className="w-full lg:w-96 flex flex-col space-y-6 flex-shrink-0">
                  <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 flex-1 flex flex-col">
                    <h2 className="text-indigo-400 text-sm tracking-widest mb-6 flex items-center space-x-2 font-serif">
                      <FileText className="w-4 h-4" />
                      <span>BIBLIOTECA</span>
                    </h2>
                    <div className="relative mb-6">
                      <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Buscar modelo..."
                        value={templateFilter}
                        onChange={(e) => setTemplateFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700/50 text-sm text-slate-200 rounded-lg pl-10 pr-4 py-2.5 focus:outline-none focus:border-indigo-500 placeholder:text-slate-600"
                      />
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                      <div className="flex items-center justify-between mb-1 mt-1">
                        <span className="text-[11px] text-slate-500 font-semibold tracking-wider uppercase">
                          BIBLIOTECA DE MODELOS
                        </span>
                      </div>

                      {/* TABS DE SUBGRUPOS */}
                      <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 gap-1 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubgrupo("DP & RH");
                            const firstDp = DEFAULT_TEMPLATES.find(t => !t.subgrupo || t.subgrupo === 'DP & RH');
                            if (firstDp) handleTemplateSelect(firstDp.id);
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            selectedSubgrupo !== "GERAL"
                              ? "bg-indigo-600 text-white shadow"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <Briefcase className="w-3.5 h-3.5" />
                          <span>DP & RH</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSubgrupo("GERAL");
                            const firstGeral = DEFAULT_TEMPLATES.find(t => t.id === 'tpl-contrato-contabil');
                            if (firstGeral) {
                              setActiveTemplateId(firstGeral.id);
                              setBatchTemplateIds([firstGeral.id]);
                              setTemplateName(firstGeral.name);
                              setTemplateCode(firstGeral.content);
                              editorContentRef.current = firstGeral.content;
                            }
                          }}
                          className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold tracking-wider transition-all flex items-center justify-center gap-1.5 ${
                            selectedSubgrupo === "GERAL"
                              ? "bg-emerald-600 text-white shadow"
                              : "text-slate-400 hover:text-slate-200"
                          }`}
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>CONTRATOS</span>
                        </button>
                      </div>

                      {/* SUBGRUPO: DP & RH */}
                      {selectedSubgrupo !== "GERAL" && (
                        <div>
                          <div className="flex items-center justify-between mb-2 mt-2 px-1">
                            <h3 className="text-xs text-indigo-400 font-bold tracking-wider flex items-center gap-1.5">
                              <Briefcase className="w-3.5 h-3.5" />
                              <span>DP & RH (COLABORADORES)</span>
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewDocName("");
                                  setIsNewDocModalOpen(true);
                                }}
                                className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Criar novo termo em branco"
                              >
                                <Plus className="w-3 h-3" />
                                <span>NOVO</span>
                              </button>
                              <span className="text-[10px] text-slate-500 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                                {DEFAULT_TEMPLATES.filter(tpl => !tpl.subgrupo || tpl.subgrupo === 'DP & RH').length} modelos
                              </span>
                            </div>
                          </div>

                          {DEFAULT_TEMPLATES
                            .filter(tpl => !tpl.subgrupo || tpl.subgrupo === 'DP & RH')
                            .filter(tpl => !templateFilter || tpl.name.toLowerCase().includes(templateFilter.toLowerCase()))
                            .map((tpl) => (
                              <div
                                key={tpl.id}
                                className={`flex items-stretch w-full mb-2 rounded-lg border transition-all ${
                                  activeTemplateId === tpl.id
                                    ? "bg-slate-800 border-indigo-500 text-slate-200"
                                    : "bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                              >
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
                                  className="flex-1 text-left p-3 min-w-0"
                                >
                                  <p className="text-sm font-medium">
                                    {tpl.name}
                                  </p>
                                  <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                                    PADRÃO DP & RH
                                  </span>
                                </button>
                                <div className="flex items-center pr-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTemplateSelect(tpl.id);
                                      setCopyModelName(`${tpl.name} - Cópia`);
                                      setIsSaveCopyModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50 transition-colors rounded cursor-pointer"
                                    title="Criar cópia personalizada deste modelo"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* SUBGRUPO: GERAL (CONTRATOS CONTÁBEIS) */}
                      {selectedSubgrupo === "GERAL" && (
                        <div>
                          <div className="flex items-center justify-between mb-2 mt-2 px-1">
                            <h3 className="text-xs text-emerald-400 font-bold tracking-wider flex items-center gap-1.5">
                              <FileSignature className="w-3.5 h-3.5" />
                              <span>CONTRATOS DO ESCRITÓRIO (GERAL)</span>
                            </h3>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setNewDocName("");
                                  setIsNewDocModalOpen(true);
                                }}
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                                title="Criar novo contrato em branco"
                              >
                                <Plus className="w-3 h-3" />
                                <span>NOVO</span>
                              </button>
                              <span className="text-[10px] text-slate-500 font-medium bg-slate-800 px-2 py-0.5 rounded-full">
                                {DEFAULT_TEMPLATES.filter(tpl => tpl.subgrupo === 'GERAL').length} modelos
                              </span>
                            </div>
                          </div>

                          {DEFAULT_TEMPLATES
                            .filter(tpl => tpl.subgrupo === 'GERAL')
                            .filter(tpl => !templateFilter || tpl.name.toLowerCase().includes(templateFilter.toLowerCase()))
                            .map((tpl) => (
                              <div
                                key={tpl.id}
                                className={`flex items-stretch w-full mb-2 rounded-lg border transition-all ${
                                  activeTemplateId === tpl.id
                                    ? "bg-slate-800 border-emerald-500 text-slate-200"
                                    : "bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                                }`}
                              >
                                <div className="flex items-center pl-3">
                                  <input
                                    type="checkbox"
                                    checked={batchTemplateIds.includes(tpl.id)}
                                    onChange={() => toggleBatchTemplate(tpl.id)}
                                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                                  />
                                </div>
                                <button
                                  onClick={() => handleTemplateSelect(tpl.id)}
                                  className="flex-1 text-left p-3 min-w-0"
                                >
                                  <p className="text-sm font-medium">
                                    {tpl.name}
                                  </p>
                                  <span className="text-[10px] text-emerald-400/80 tracking-widest mt-1 block">
                                    ESCRITÓRIO & EMPRESAS
                                  </span>
                                </button>
                                <div className="flex items-center pr-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleTemplateSelect(tpl.id);
                                      setCopyModelName(`${tpl.name} - Cópia`);
                                      setIsSaveCopyModalOpen(true);
                                    }}
                                    className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-slate-700/50 transition-colors rounded cursor-pointer"
                                    title="Criar cópia personalizada deste modelo"
                                  >
                                    <Copy className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                        </div>
                      )}

                      {/* SEUS MODELOS (FIRESTORE) */}
                      <div>
                        <div className="flex items-center justify-between mb-2 mt-4 px-1">
                          <h3 className="text-xs text-slate-500 font-semibold tracking-wider">
                            SEUS MODELOS ({customTemplates.length})
                          </h3>
                          <button
                            type="button"
                            onClick={() => {
                              setNewDocName("");
                              setIsNewDocModalOpen(true);
                            }}
                            className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                            title="Criar novo modelo do zero"
                          >
                            <Plus className="w-3 h-3" />
                            <span>NOVO</span>
                          </button>
                        </div>

                        {activeTemplateId === "tpl-custom" && (
                          <div
                            className="flex items-stretch w-full mb-2 rounded-lg border bg-slate-800 border-indigo-500 text-slate-200 transition-all"
                          >
                            <div className="flex items-center pl-3">
                              <input
                                type="checkbox"
                                checked={batchTemplateIds.includes("tpl-custom")}
                                onChange={() => toggleBatchTemplate("tpl-custom")}
                                className="w-4 h-4 accent-[#D1A751] cursor-pointer"
                              />
                            </div>
                            <button
                              onClick={() => handleTemplateSelect("tpl-custom")}
                              className="flex-1 text-left p-3 min-w-0"
                            >
                              <p className="text-sm font-medium line-clamp-1">
                                {templateName || "Rascunho Personalizado"}
                              </p>
                              <span className="text-[10px] text-indigo-400 tracking-widest mt-1 block">
                                NOVO RASCUNHO (NÃO SALVO)
                              </span>
                            </button>
                            <div className="flex items-center pr-2 gap-1">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRenameModal({
                                    id: "tpl-custom",
                                    name: templateName || "Rascunho Personalizado",
                                  });
                                }}
                                className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50 transition-colors rounded cursor-pointer"
                                title="Editar nome do rascunho"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTemplateToDelete({
                                    id: "tpl-custom",
                                    name: templateName || "Rascunho Personalizado",
                                  });
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition-colors rounded cursor-pointer"
                                title="Descartar rascunho"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}

                        {customTemplates
                          .filter((tpl) => {
                            if (selectedSubgrupo === "GERAL") {
                              return tpl.subgrupo === "GERAL" || tpl.subgrupo === "CONTRATOS";
                            }
                            return !tpl.subgrupo || tpl.subgrupo === "DP & RH";
                          })
                          .filter(
                            (tpl) =>
                              !templateFilter ||
                              tpl.name.toLowerCase().includes(templateFilter.toLowerCase())
                          )
                          .map((tpl) => (
                            <div
                              key={tpl.id}
                              className={`flex items-stretch w-full mb-2 rounded-lg border transition-all ${
                                activeTemplateId === tpl.id
                                  ? selectedSubgrupo === "GERAL"
                                    ? "bg-slate-800 border-emerald-500 text-slate-200"
                                    : "bg-slate-800 border-indigo-500 text-slate-200"
                                  : "bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                              }`}
                            >
                              <div className="flex items-center pl-3">
                                <input
                                  type="checkbox"
                                  checked={batchTemplateIds.includes(tpl.id)}
                                  onChange={() => toggleBatchTemplate(tpl.id)}
                                  className={`w-4 h-4 cursor-pointer ${selectedSubgrupo === "GERAL" ? "accent-emerald-500" : "accent-[#D1A751]"}`}
                                />
                              </div>
                              <button
                                onClick={() => handleTemplateSelect(tpl.id)}
                                className="flex-1 text-left p-3 min-w-0"
                              >
                                <p className="text-sm font-medium truncate" title={tpl.name}>
                                  {tpl.name}
                                </p>
                                <span className="text-[10px] text-indigo-400/80 tracking-widest mt-1 block">
                                  SALVO NO FIRESTORE
                                </span>
                              </button>
                              <div className="flex items-center pr-2 gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleOpenRenameModal(tpl);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-indigo-400 hover:bg-slate-700/50 transition-colors rounded cursor-pointer"
                                  title="Editar nome do modelo"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCustomTemplate(tpl.id, tpl.name);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700/50 transition-colors rounded cursor-pointer"
                                  title="Excluir modelo customizado"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}

                        {customTemplates.filter((tpl) =>
                          selectedSubgrupo === "GERAL"
                            ? tpl.subgrupo === "GERAL" || tpl.subgrupo === "CONTRATOS"
                            : !tpl.subgrupo || tpl.subgrupo === "DP & RH"
                        ).length === 0 &&
                          activeTemplateId !== "tpl-custom" && (
                            <p className="text-[11px] text-slate-500 italic px-1 py-2">
                              Nenhum modelo personalizado nesta categoria. Edite um modelo acima e clique em "Salvar Cópia".
                            </p>
                          )}
                      </div>
                      
                      {/* OUTROS DOCUMENTOS (PDF/DOCX) - Renderiza APENAS se categoria for DP & RH */}
                      {selectedSubgrupo !== "GERAL" && selectedSubgrupo !== "CONTRATOS" && (
                        <div>
                          <h3 className="text-xs text-slate-500 font-semibold tracking-wider mb-3 mt-8">
                            OUTROS DOCUMENTOS (PDF/DOCX)
                          </h3>
                          <div className="flex items-stretch w-full mb-2 rounded-lg border bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all">
                            <a 
                              href="/CHECKLIST VEICULOS.pdf" 
                              download="CHECKLIST VEICULOS.pdf"
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  const res = await fetch("/CHECKLIST VEICULOS.pdf");
                                  const blob = await res.blob();
                                  const blobUrl = window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = blobUrl;
                                  a.download = "CHECKLIST VEICULOS.pdf";
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(blobUrl);
                                } catch (err) {
                                  window.location.href = "/CHECKLIST VEICULOS.pdf";
                                }
                              }}
                              className="flex-1 flex items-center justify-between text-left p-3"
                              title="Baixar Checklist Veículos"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  CHECKLIST VEÍCULOS
                                </p>
                                <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                                  PDF ESTÁTICO
                                </span>
                              </div>
                              <Download className="w-4 h-4 text-indigo-400" />
                            </a>
                          </div>
                          
                          <div className="flex items-stretch w-full mb-2 rounded-lg border bg-transparent border-slate-700/50 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-all">
                            <a 
                              href="/Modelo_Aviso_de_Advertencia.docx" 
                              download="Modelo_Aviso_de_Advertencia.docx"
                              onClick={async (e) => {
                                e.preventDefault();
                                try {
                                  const res = await fetch("/Modelo_Aviso_de_Advertencia.docx");
                                  const blob = await res.blob();
                                  const blobUrl = window.URL.createObjectURL(blob);
                                  const a = document.createElement("a");
                                  a.href = blobUrl;
                                  a.download = "Modelo_Aviso_de_Advertencia.docx";
                                  document.body.appendChild(a);
                                  a.click();
                                  document.body.removeChild(a);
                                  window.URL.revokeObjectURL(blobUrl);
                                } catch (err) {
                                  window.location.href = "/Modelo_Aviso_de_Advertencia.docx";
                                }
                              }}
                              className="flex-1 flex items-center justify-between text-left p-3"
                              title="Baixar Modelo de Aviso de Advertência"
                            >
                              <div>
                                <p className="text-sm font-medium">
                                  MODELO AVISO DE ADVERTÊNCIA
                                </p>
                                <span className="text-[10px] text-slate-500 tracking-widest mt-1 block">
                                  DOCX ESTÁTICO
                                </span>
                              </div>
                              <Download className="w-4 h-4 text-indigo-400" />
                            </a>
                          </div>
                        </div>
                      )}

                    </div>
                  </div>
                </aside>

                {/* Center: Editor */}
                <div className="flex-1 flex flex-col space-y-4">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0">
                    <div className="w-full md:w-2/3 max-w-lg">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 uppercase tracking-wider">
                          <Pencil className="w-3.5 h-3.5 text-indigo-400" />
                          <span>Nome do Modelo</span>
                        </label>
                        {isCustomTemplate ? (
                          <span className="text-[10px] text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full font-medium">
                            Salvo no Firestore
                          </span>
                        ) : isDefaultTemplate ? (
                          <span className="text-[10px] text-slate-400 bg-slate-800 border border-slate-700/50 px-2 py-0.5 rounded-full font-medium">
                            Modelo Padrão
                          </span>
                        ) : (
                          <span className="text-[10px] text-amber-400 bg-amber-950/60 border border-amber-800/40 px-2 py-0.5 rounded-full font-medium">
                            Rascunho
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={templateName}
                          onChange={(e) => setTemplateName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleSaveOrUpdateTemplate();
                            }
                          }}
                          className="bg-slate-900/80 border border-slate-700 focus:border-indigo-500 focus:outline-none text-slate-100 font-medium text-base py-1.5 px-3 rounded-lg w-full placeholder:text-slate-600 shadow-inner transition-colors"
                          placeholder="Digite o nome do modelo..."
                        />
                        {isCustomTemplate && (
                          <button
                            type="button"
                            onClick={handleSaveOrUpdateTemplate}
                            className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                            title="Salvar alterações no modelo"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Salvar</span>
                          </button>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleSaveOrUpdateTemplate}
                      className="text-indigo-400 text-xs font-bold tracking-widest uppercase flex items-center space-x-2 hover:text-white transition-colors w-full md:w-auto justify-end cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>{saveButtonText}</span>
                    </button>
                  </div>

                  {/* Editor Container */}
                  <div className="bg-slate-50 rounded-xl flex-1 flex flex-col text-black border border-indigo-500 shadow-xl overflow-hidden shadow-black/20">
                    {/* Fake Toolbar */}
                    <div className="bg-[#F6EAC1] border-b border-[#E1CD98] px-4 py-2 flex items-center space-x-6 text-[#5E4A28] text-sm z-10 font-serif">
                      <span>Normal ▼</span>
                      <div className="flex space-x-3 font-serif">
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            document.execCommand("bold", false);
                          }}
                          className="font-bold cursor-pointer hover:text-black"
                        >
                          B
                        </button>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            document.execCommand("italic", false);
                          }}
                          className="italic cursor-pointer hover:text-black"
                        >
                          I
                        </button>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            document.execCommand("underline", false);
                          }}
                          className="underline cursor-pointer hover:text-black"
                        >
                          U
                        </button>
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            document.execCommand("justifyLeft", false);
                          }}
                          className="cursor-pointer hover:text-black"
                        >
                          <AlignLeft className="w-4 h-4" />
                        </button>
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            document.execCommand("justifyCenter", false);
                          }}
                          className="cursor-pointer hover:text-black"
                        >
                          <AlignCenter className="w-4 h-4 text-center mx-auto" />
                        </button>
                      </div>
                      <div className="flex space-x-3 ml-auto border-l border-[#E1CD98] pl-6">
                        <button
                          onMouseDown={(e) => {
                            e.preventDefault();
                            document.execCommand(
                              "insertHTML",
                              false,
                              "<br><br>[QUEBRA]<br><br>",
                            );
                          }}
                          className="cursor-pointer hover:text-black flex items-center space-x-1"
                          title="Inserir Quebra de Página"
                        >
                          <Plus className="w-4 h-4" />
                          <span className="text-xs uppercase tracking-widest font-bold font-sans">
                            Quebra de pág.
                          </span>
                        </button>
                      </div>
                    </div>

                    <div
                      key={activeTemplateId}
                      ref={editorDivRef}
                      contentEditable
                      suppressContentEditableWarning
                      className="flex-1 w-full bg-transparent p-10 focus:outline-none font-serif text-[15px] leading-relaxed text-[#2C2114] overflow-y-auto"
                      dangerouslySetInnerHTML={{
                        __html: DOMPurify.sanitize(templateCode),
                      }}
                      onInput={(e) => {
                        editorContentRef.current = e.currentTarget.innerHTML;
                      }}
                      onBlur={(e) => {
                        editorContentRef.current = e.currentTarget.innerHTML;
                        handleContentChange(e.currentTarget.innerHTML);
                      }}
                    />
                  </div>
                </div>

                {/* Sidebar Right: Resumo do Lote & Ação (Fixa e sempre visível ao rolar a tela) */}
                <aside className="w-full lg:w-[300px] flex flex-col space-y-6 flex-shrink-0 lg:sticky lg:top-6 self-start z-10">
                  <div className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs text-indigo-400 font-bold tracking-widest mb-4 flex items-center space-x-2 font-serif">
                        <FileText className="w-4 h-4" />
                        <span>RESUMO DO LOTE</span>
                      </h3>
                      <div className="flex justify-between items-center text-sm text-slate-400 mb-3">
                        <span>Documentos</span>
                        <span className="bg-slate-800 text-indigo-400 font-bold px-3 py-1 rounded border border-slate-700/60">
                          {batchTemplateIds.length}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm text-slate-400">
                        <span>Variáveis (Total)</span>
                        <span className="bg-slate-800 text-slate-200 font-bold px-3 py-1 rounded border border-slate-700/60">
                          {variables.length}
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        if (batchTemplateIds.length === 0 && activeTemplateId) {
                          setBatchTemplateIds([activeTemplateId]);
                        }
                        setStep(2);
                      }}
                      className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold tracking-wider py-4 rounded-lg shadow-lg shadow-black/20 transition-all active:scale-[0.98] mt-6 flex justify-between items-center px-6 cursor-pointer"
                    >
                      <span className="text-sm">
                        SEGUIR
                      </span>
                      <ArrowRight className="w-5 h-5" />
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
                    <h1 className="text-3xl font-serif text-indigo-400 tracking-wider mb-2">
                      {selectedSubgrupo === "GERAL" ? "DADOS DO CONTRATO" : "DADOS DO LOTE"}
                    </h1>
                    <p className="text-slate-400 font-light">
                      {selectedSubgrupo === "GERAL"
                        ? "Envie o Cartão CNPJ para autopreencher os dados da empresa e finalize as cláusulas."
                        : "Preencha as informações da empresa e dos colaboradores."}
                    </p>
                  </div>

                  <div className="bg-slate-900 border border-slate-700/50 rounded-2xl flex flex-col shadow-2xl shadow-black/40 max-h-[75vh]">
                    <div className="p-8 overflow-y-auto custom-scrollbar flex-1 space-y-10">
                      {/* UPLOAD AREA */}
                      {selectedSubgrupo === "GERAL" ? (
                        <label
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={handleCnpjUpload}
                          className={`relative w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 overflow-hidden ${
                            isExtracting
                              ? "border-emerald-600 bg-slate-950 opacity-80 cursor-wait"
                              : "border-emerald-500 bg-slate-950 hover:bg-slate-900 hover:border-emerald-400 cursor-pointer"
                          }`}
                        >
                          <input
                            type="file"
                            accept=".pdf,image/*"
                            onChange={handleCnpjUpload}
                            disabled={isExtracting}
                            className="hidden"
                          />
                          {isExtracting ? (
                            <>
                              <Loader2 className="w-10 h-10 animate-spin mb-4 text-emerald-400" />
                              <h3 className="text-slate-200 font-serif text-lg tracking-wider mb-2">
                                Analisando Cartão CNPJ com IA...
                              </h3>
                              <p className="text-slate-500 text-sm">
                                Extraindo Razão Social, CNPJ, Endereço e Representante...
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 text-emerald-400 mb-4" />
                              <h3 className="font-serif text-lg tracking-wider mb-2 text-emerald-400">
                                Carregar Cartão CNPJ (PDF ou Imagem)
                              </h3>
                              <p className="text-slate-400 text-sm text-center max-w-md">
                                Arraste ou clique para selecionar o Cartão CNPJ. A IA extrairá os dados automaticamente e você preenche o restante na mão.
                              </p>
                            </>
                          )}
                        </label>
                      ) : (
                        <label
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                          onDrop={handlePdfUpload}
                          className={`relative w-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center p-8 transition-all duration-300 overflow-hidden ${
                            isExtracting
                              ? "border-[#845a27] bg-slate-950 opacity-80 cursor-wait"
                              : "border-indigo-500 bg-slate-950 hover:bg-slate-900 hover:border-indigo-500 cursor-pointer"
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
                              <Loader2 className="w-10 h-10 animate-spin mb-4 text-indigo-400" />
                              <h3 className="text-slate-200 font-serif text-lg tracking-wider mb-2">
                                Analisando relatório com IA...
                              </h3>
                              <p className="text-slate-500 text-sm">
                                Isso pode levar alguns segundos.
                              </p>
                            </>
                          ) : (
                            <>
                              <Upload className="w-10 h-10 text-indigo-400 mb-4" />
                              <h3 className="font-serif text-lg tracking-wider mb-2 text-indigo-400">
                                Carregar Relatório Admissional (PDF)
                              </h3>
                              <p className="text-slate-500 text-sm">
                                Arraste ou clique para selecionar o PDF
                              </p>
                            </>
                          )}
                        </label>
                      )}
                      {extractStatus && (
                        <div
                          className={`mt-3 text-center text-xs font-bold ${extractStatus.type === "success" ? "text-green-500" : "text-red-500"}`}
                        >
                          {extractStatus.message}
                        </div>
                      )}

                      {globalVariables.length === 0 &&
                      collaboratorVariables.length === 0 ? (
                        <p className="text-slate-400 text-center italic py-10">
                          Nenhuma variável encontrada no modelo.
                        </p>
                      ) : (
                        <>
                          {/* SESSÃO 1: Dados Globais */}
                          {globalVariables.length > 0 && (
                            <div className="space-y-6">
                              <div className="border-b border-slate-800 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h2 className="text-lg font-serif tracking-widest text-indigo-400">
                                    {selectedSubgrupo === "GERAL" ? "DADOS DO CONTRATO & EMPRESA" : "DADOS GLOBAIS"}
                                  </h2>
                                  <p className="text-slate-500 text-xs">
                                    {selectedSubgrupo === "GERAL" ? "Preencha as informações do contrato e dados cadastrais" : "Preenchidos apenas uma vez para todos os documentos"}
                                  </p>
                                </div>
                                {selectedSubgrupo !== "GERAL" && empresas && empresas.length > 0 && (
                                  <div className="flex items-center gap-2">
                                    <label htmlFor="select_empresa_preencher" className="text-xs text-slate-400 whitespace-nowrap">
                                      Puxar da Empresa:
                                    </label>
                                    <select
                                      id="select_empresa_preencher"
                                      onChange={(e) => {
                                        const empId = e.target.value;
                                        if (!empId) return;
                                        const emp = empresas.find((item) => item.id === empId);
                                        if (!emp) return;
                                        const updated: Record<string, string> = { ...globalFormData };
                                        const now = new Date();
                                        const meses = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
                                        const dataFormatadaExtenso = `${now.getDate()} de ${meses[now.getMonth()]} de ${now.getFullYear()}`;
                                        const dataFormatadaCurta = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

                                        for (const key of globalVariables) {
                                          const k = key.toUpperCase();
                                          if (k.includes("RAZÃO SOCIAL") || k.includes("NOME DA EMPRESA") || k === "EMPREGADOR" || k.includes("NOME DO EMPREGADOR")) {
                                            updated[key] = emp.nome || "";
                                          } else if (k.includes("CNPJ")) {
                                            updated[key] = emp.cnpj || "";
                                          } else if (k.includes("ENDEREÇO") || k.includes("ENDERECO")) {
                                            updated[key] = emp.enderecoCompleto || "";
                                          } else if (k.includes("CIDADE")) {
                                            updated[key] = emp.cidade || "Rio Verde";
                                          } else if (k === "UF") {
                                            updated[key] = "GO";
                                          } else if (k.includes("DATA DE ASSINATURA") || k === "DATA") {
                                            updated[key] = dataFormatadaExtenso;
                                          }
                                        }
                                        setGlobalFormData(updated);
                                      }}
                                      defaultValue=""
                                      className="bg-slate-950 border border-slate-700/60 text-xs text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 max-w-[220px] truncate"
                                    >
                                      <option value="">Selecione para autopreencher...</option>
                                      {empresas.map((emp) => (
                                        <option key={emp.id} value={emp.id}>
                                          {emp.nome}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {globalVariables.map((v) => (
                                  <div key={v} className="flex flex-col">
                                    <label className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-2 ml-1">
                                      {v}
                                    </label>
                                    <input
                                      id={`global_${v}`}
                                      name={`global_${v}`}
                                      type="text"
                                      value={globalFormData[v] || ""}
                                      onChange={(e) =>
                                        setGlobalFormData({
                                          ...globalFormData,
                                          [v]: e.target.value,
                                        })
                                      }
                                      placeholder={`Digite o(a) ${v.toLowerCase()}...`}
                                      className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3.5 focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* SESSÃO 2: Lista de Colaboradores */}
                          {collaboratorVariables.length > 0 && (
                            <div className="space-y-6">
                              <div className="border-b border-slate-800 pb-2 flex justify-between items-end">
                                <div>
                                  <h2 className="text-indigo-400 text-lg font-serif tracking-widest">
                                    COLABORADORES
                                  </h2>
                                  <p className="text-slate-500 text-xs">
                                    Preencha os dados individuais de cada
                                    colaborador
                                  </p>
                                </div>
                                <span className="text-slate-400 text-sm font-bold bg-slate-800 px-3 py-1 rounded-full border border-slate-700/50">
                                  {collaboratorsData.length} adicionado(s)
                                </span>
                              </div>

                              <div className="space-y-6">
                                {collaboratorsData.map((collab, index) => (
                                  <div
                                    key={index}
                                    className="bg-slate-900 border border-slate-700/50 rounded-xl p-6 relative shadow-md"
                                  >
                                    <div className="flex justify-between items-center mb-6">
                                      <h3 className="text-slate-200 font-bold tracking-widest flex items-center space-x-2">
                                        <span className="bg-slate-700 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                          {index + 1}
                                        </span>
                                        <span>COLABORADOR {index + 1}</span>
                                      </h3>
                                      {collaboratorsData.length > 1 && (
                                        <button
                                          onClick={() => {
                                            setCollaboratorsData((prev) =>
                                              prev.filter(
                                                (_, i) => i !== index,
                                              ),
                                            );
                                          }}
                                          className="text-slate-500 hover:text-red-500 text-xs font-bold tracking-widest uppercase transition-colors flex items-center space-x-1"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                          <span>EXCLUIR</span>
                                        </button>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      {collaboratorVariables.map((v) => (
                                        <div key={v} className="flex flex-col">
                                          <label className="text-slate-500 text-xs font-bold tracking-widest uppercase mb-2 ml-1">
                                            {v}
                                          </label>
                                          <input
                                            id={`collab_${index}_${v}`}
                                            name={`collab_${index}_${v}`}
                                            type="text"
                                            value={collab[v] || ""}
                                            onChange={(e) => {
                                              const newData = [
                                                ...collaboratorsData,
                                              ];
                                              newData[index] = {
                                                ...newData[index],
                                                [v]: e.target.value,
                                              };
                                              setCollaboratorsData(newData);
                                            }}
                                            placeholder={`Digite o(a) ${v.toLowerCase()}...`}
                                            className="bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-4 py-3.5 focus:outline-none focus:border-indigo-500 transition-colors"
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>

                              <button
                                onClick={() => {
                                  const emptyCollab: Record<string, string> =
                                    {};
                                  collaboratorVariables.forEach(
                                    (v) => (emptyCollab[v] = ""),
                                  );
                                  setCollaboratorsData([
                                    ...collaboratorsData,
                                    emptyCollab,
                                  ]);
                                }}
                                className="w-full border border-dashed border-slate-700/50 hover:border-indigo-500 hover:bg-slate-800 text-slate-400 hover:text-slate-200 py-4 rounded-xl font-bold tracking-widest transition-all text-sm flex items-center justify-center space-x-2"
                              >
                                <Plus className="w-4 h-4" />
                                <span>ADICIONAR OUTRO COLABORADOR</span>
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    <div className="p-6 border-t border-slate-800 flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4 bg-slate-900 rounded-b-2xl shrink-0">
                      <button
                        onClick={() => setStep(1)}
                        className="flex-1 border border-slate-700/50 text-indigo-400 hover:bg-slate-950 font-bold tracking-widest text-sm rounded-lg py-4 transition-colors text-center w-full md:w-auto"
                      >
                        EDITAR MODELO
                      </button>
                      <button
                        onClick={generateFinalDocument}
                        className={`flex-[2] ${selectedSubgrupo === "GERAL" ? "bg-emerald-600 hover:bg-emerald-500" : "bg-indigo-600 hover:bg-slate-200"} text-white font-bold tracking-widest text-sm rounded-lg py-4 transition-colors flex items-center justify-center space-x-3 shadow-lg w-full md:w-auto`}
                      >
                        <span>{selectedSubgrupo === "GERAL" ? "GERAR CONTRATO" : "GERAR LOTE DE DOCUMENTOS"}</span>
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
                  <h2 className="text-indigo-400 text-sm tracking-widest mb-2 font-serif uppercase font-bold">
                    Exportar
                  </h2>

                  {!(selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS") && (
                    <button
                      onClick={() => {
                        setGroupingMode("select");
                        setIsIndividualModalOpen(true);
                      }}
                      className="bg-indigo-600 border border-indigo-500 hover:bg-indigo-500 rounded-xl p-5 flex items-center space-x-4 transition-all group shadow-black/20 shadow-lg text-left"
                    >
                      <div className="p-3 border border-indigo-300 rounded-lg text-white group-hover:bg-indigo-700 transition-colors">
                        <Download className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold tracking-wide">
                          BAIXAR SEPARADOS
                        </h3>
                        <p className="text-[10px] text-indigo-200 tracking-widest uppercase mt-1">
                          Por Empregado/Termo
                        </p>
                      </div>
                    </button>
                  )}

                  <button
                    id="btn-download-pdf"
                    onClick={handlePrint}
                    disabled={isGeneratingPdf}
                    className="bg-slate-900 border border-slate-700/50 hover:bg-slate-800 rounded-xl p-5 flex items-center space-x-4 transition-all group shadow-black/20 shadow-lg text-left disabled:opacity-50 disabled:cursor-wait"
                  >
                    <div className="p-3 border border-slate-700/50 rounded-lg text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500 transition-colors">
                      {isGeneratingPdf ? (
                        <Loader2 className="w-6 h-6 animate-spin" />
                      ) : (
                        <Download className="w-6 h-6" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-white font-bold tracking-wide">
                        {isGeneratingPdf
                          ? "GERANDO PDF..."
                          : "BAIXAR PDF ÚNICO"}
                      </h3>
                      <p className="text-[10px] text-slate-400 tracking-widest uppercase mt-1">
                        Todos num só arquivo (Nativo)
                      </p>
                    </div>
                  </button>

                  {!(selectedSubgrupo === "GERAL" || selectedSubgrupo === "CONTRATOS") && (
                    <button
                      onClick={copyToClipboard}
                      className="bg-slate-900 border border-slate-700/50 hover:bg-slate-800 hover:border-indigo-500 rounded-xl p-5 flex items-center space-x-4 transition-all group shadow-lg text-left"
                    >
                      <div className="p-3 border border-slate-700/50 rounded-lg text-slate-400 group-hover:text-indigo-400 group-hover:border-indigo-500 transition-colors">
                        <Copy className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-white font-bold tracking-wide text-sm">
                          COPIAR TEXTO
                        </h3>
                        <p className="text-[10px] text-slate-400 tracking-widest uppercase mt-1">
                          Clipboard
                        </p>
                      </div>
                    </button>
                  )}

                  <div className="flex-1" />

                  <button
                    onClick={resetFields}
                    className="bg-slate-900 border border-slate-700/50 hover:bg-slate-950 rounded-xl p-4 flex items-center justify-center text-center transition-all text-indigo-400 text-sm font-bold tracking-widest mt-4"
                  >
                    REINICIAR CAMPOS
                  </button>

                  <button
                    onClick={() => setStep(1)}
                    className="bg-transparent text-slate-400 hover:text-white rounded-xl py-3 flex items-center justify-center text-center transition-all text-sm font-bold tracking-widest"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    VOLTAR AO MODELO
                  </button>
                </aside>

                {/* Right Area: Document A4 Preview */}
                <div className="flex-1 flex flex-col items-center overflow-x-auto overflow-y-auto pb-10 pt-4 print:pt-0 print:pb-0 print:overflow-visible relative custom-scrollbar space-y-8">
                  <div
                    id="document-print-area"
                    className="flex flex-col space-y-8 print:space-y-0 items-center transform scale-[0.6] sm:scale-[0.8] md:scale-[0.9] lg:scale-100 origin-top w-full md:w-auto"
                  >
                    {generatedDoc
                      .split(/<[^>]*>\s*\[QUEBRA\]\s*<\/[^>]*>|\[QUEBRA\]/i)
                      .filter((pageContent) => pageContent.trim() !== "")
                      .map((pageContent, index) => (
                        <div
                          key={index}
                          className="page-container bg-white shadow-2xl max-w-full rounded-sm relative print:shadow-none print:rounded-none w-[210mm] min-h-[297mm] print:h-[297mm] shrink-0 overflow-hidden border border-[#110408]/30 print:border-none print:break-after-page"
                        >
                          {/* Background Letterhead Image */}
                          {letterheadImage && (
                            <div
                              className="absolute inset-0 z-0 pointer-events-none"
                              style={{
                                backgroundImage: `url(${letterheadImage})`,
                                backgroundSize: "100% 100%",
                                backgroundPosition: "center",
                                backgroundRepeat: "no-repeat",
                                WebkitPrintColorAdjust: "exact",
                                printColorAdjust: "exact",
                              }}
                            />
                          )}

                          {/* Document Content Layer */}
                          <div className="relative z-10 px-[25mm] pt-[72mm] pb-[50mm] text-black text-[10.5pt] font-serif leading-[1.5] h-full flex flex-col">
                            <div
                              className="flex-1 text-justify doc-content"
                              dangerouslySetInnerHTML={{
                                __html: DOMPurify.sanitize(
                                  pageContent.trim() || "&nbsp;",
                                ),
                              }}
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
      </main>

      {/* Global & Print CSS */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
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
          ${modulo === "banco-horas" ? "@page { margin: 8mm; size: A4 landscape; }" : "@page { margin: 0; size: A4 portrait; }"}
          body { 
            background-color: white !important; 
            margin: 0 !important; 
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `,
        }}
      />

      {/* Individual Downloads Modal */}
      {isIndividualModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm print:hidden">
          <div className="bg-slate-900 border border-indigo-500/30 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-slate-700/50">
              <div className="flex items-center space-x-3">
                {groupingMode !== "select" && (
                  <button
                    onClick={() => setGroupingMode("select")}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                )}
                <h3 className="text-white font-bold tracking-widest text-sm flex items-center space-x-2">
                  <Download className="w-5 h-5 text-indigo-400" />
                  <span>
                    {groupingMode === "select"
                      ? "COMO DESEJA EXPORTAR?"
                      : "BAIXAR DOCUMENTOS"}
                  </span>
                </h3>
              </div>
              <button
                onClick={() => setIsIndividualModalOpen(false)}
                className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              {groupingMode === "select" ? (
                <div className="grid grid-cols-1 gap-4">
                  <button
                    onClick={() => setGroupingMode("individual")}
                    className="flex flex-col text-left bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:bg-slate-900 p-5 rounded-xl transition-all"
                  >
                    <span className="text-white font-bold text-sm">
                      Separado mesmo
                    </span>
                    <span className="text-slate-400 text-xs mt-1">
                      1 PDF único para cada combinação de Funcionário e Termo.
                    </span>
                  </button>
                  <button
                    onClick={() => setGroupingMode("by_term")}
                    className="flex flex-col text-left bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:bg-slate-900 p-5 rounded-xl transition-all"
                  >
                    <span className="text-white font-bold text-sm">
                      Acumulado por Termos
                    </span>
                    <span className="text-slate-400 text-xs mt-1">
                      1 PDF para cada Tipo de Termo (contendo todos os
                      funcionários dele).
                    </span>
                  </button>
                  <button
                    onClick={() => setGroupingMode("by_collab")}
                    className="flex flex-col text-left bg-slate-950 border border-slate-800 hover:border-indigo-500 hover:bg-slate-900 p-5 rounded-xl transition-all"
                  >
                    <span className="text-white font-bold text-sm">
                      Acumulado por Funcionários
                    </span>
                    <span className="text-slate-400 text-xs mt-1">
                      1 PDF para cada Funcionário (contendo todos os termos
                      dele).
                    </span>
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {getGroupedDocsList().map((doc, index) => (
                    <div
                      key={index}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div>
                        <h4 className="text-white font-bold text-sm leading-tight">
                          {doc.collabName}
                        </h4>
                        <p className="text-slate-400 text-xs mt-1 leading-tight">
                          {doc.termName}
                        </p>
                      </div>
                      <button
                        onClick={() => handlePrintIndividual(doc)}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-lg text-xs font-bold tracking-widest transition-colors flex items-center justify-center space-x-2 shrink-0"
                      >
                        <Download className="w-4 h-4" />
                        <span>GERAR PDF</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criação de Novo Documento em Branco */}
      {isNewDocModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>Novo Documento em Branco</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsNewDocModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewDoc}>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Informe o nome do documento. Um novo modelo em branco será aberto no editor para você redigir.
              </p>

              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nome do Documento
              </label>
              <input
                type="text"
                autoFocus
                value={newDocName}
                onChange={(e) => setNewDocName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsNewDocModalOpen(false);
                  }
                }}
                placeholder="Ex: Termo de Entrega ou Novo Contrato..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 mb-6 text-sm"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsNewDocModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newDocName.trim()}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Criar Documento</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Salvar Cópia do Modelo */}
      {isSaveCopyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-indigo-400" />
                <span>Salvar Cópia do Modelo</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsSaveCopyModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmSaveCopy}>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Informe o nome para salvar uma nova cópia personalizada deste modelo no Firestore.
              </p>

              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nome da Cópia
              </label>
              <input
                type="text"
                autoFocus
                value={copyModelName}
                onChange={(e) => setCopyModelName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsSaveCopyModalOpen(false);
                  }
                }}
                placeholder="Ex: Contrato de Prestação - Modelo Específico..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 mb-6 text-sm"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSaveCopyModalOpen(false)}
                  className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!copyModelName.trim()}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Salvar Cópia</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação para Excluir Modelo (Lixeira) */}
      {templateToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-rose-400 flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-rose-400" />
                <span>Excluir Modelo</span>
              </h3>
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Tem certeza que deseja excluir o modelo <span className="font-bold text-white">"{templateToDelete.name}"</span>? Esta ação não pode ser desfeita.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteTemplate}
                className="px-5 py-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40"
              >
                <Trash2 className="w-4 h-4" />
                <span>Excluir Modelo</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Renomear Modelo */}
      {templateToRename && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl max-w-md w-full p-6 text-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <Pencil className="w-5 h-5 text-indigo-400" />
                <span>Renomear Modelo</span>
              </h3>
              <button
                type="button"
                onClick={() => setTemplateToRename(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={confirmRenameTemplate}>
              <p className="text-sm text-slate-400 mb-4 leading-relaxed">
                Digite o novo nome para o modelo selecionado.
              </p>

              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Nome do Modelo
              </label>
              <input
                type="text"
                autoFocus
                value={renameModelInput}
                onChange={(e) => setRenameModelInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setTemplateToRename(null);
                  }
                }}
                placeholder="Ex: Contrato de Prestação - Específico..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-4 py-3 text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 mb-6 text-sm"
              />

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setTemplateToRename(null)}
                  className="px-4 py-2.5 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm font-medium transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!renameModelInput.trim()}
                  className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 cursor-pointer shadow-lg shadow-indigo-950/40"
                >
                  <Check className="w-4 h-4" />
                  <span>Salvar Nome</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ErrorLogViewer errorLog={errorLog} onClose={() => setErrorLog(null)} />
    </div>
  );
}
