export interface Sindicato {
  id: string;
  nome: string;
  cnpj: string;
  codigo: string;
  validadeCCT?: string; // YYYY-MM-DD
  regiaoAtuacao?: string;
  createdAt: number;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  codigo: string;
  sindicatoId: string;
  sindicatoNome?: string;
  createdAt: number;
}

export type ChecklistCategory = 'FOLHA' | 'FERIAS' | 'RESCISAO' | 'MONTHLY';
export type RuleTargetType = 'GLOBAL' | 'SINDICATO' | 'EMPRESA' | 'ALL' | 'SPECIFIC_EMPRESA' | 'SPECIFIC_SINDICATO';
export type ScheduleFrequency = 'CONSULTA' | 'MONTHLY_EXACT' | 'YEARLY' | 'NEAR_5' | 'NEAR_20' | 'NEAR_30' | 'WEEKLY' | 'DAILY' | 'ONCE';

export interface ChecklistRule {
  id: string;
  type: string; // Changed from enum to string to support custom tabs
  description?: string;
  targetType: RuleTargetType;
  targetId?: string;
  targetNome?: string;
  competencias?: string[];
  isRecurrent?: boolean;
  createdAt: number;
  dueDateRule?: 'FIXED_DAY' | 'LAST_DAY_OF_MONTH' | 'FIFTH_BUSINESS_DAY';
  dayValue?: number;
  monthValue?: number;
  specificDate?: string; // YYYY-MM-DD
  taskName?: string;
  frequency?: ScheduleFrequency; // Reusing this for the new UI
}

export interface ChecklistItem {
  id: string;
  ruleId?: string;
  empresaId: string;
  empresaNome?: string;
  competencia: string;
  type: string; // Support custom tabs
  description?: string;
  status: 'PENDENTE' | 'CONCLUIDO' | 'PENDING' | 'COMPLETED';
  observacao?: string;
  createdAt: number;
  completedAt?: number;
  dueDate: number;
  referenceMonth?: string;
  taskName?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string | number;
  endDate?: string | number;
  empresaId?: string;
  empresaNome?: string;
  type: 'LEMBRETE' | 'PRAZO' | 'AVISO_PREVIO' | 'VENCIMENTO_CCT' | 'FECHAMENTO' | 'RECORRENTE' | 'MEETING' | 'DEADLINE' | 'REMINDER' | 'HOLIDAY';
  isRecurrent?: boolean;
  recurrentDay?: number;
  recurrentMonth?: number; // 0-11
  specificDate?: string; // YYYY-MM-DD
  recurrentRule?: ScheduleFrequency; // New field for specific recurrence logic
  status?: 'ATIVO' | 'CONCLUIDO';
  createdAt: number;
}

export interface SavedTemplate {
  id: string;
  name: string;
  content: string;
  lastUsed: number;
}

export interface Rubrica {
  codigo: number;
  descricao: string;
  referencia: string;
  valor: number;
  tipo: 'provento' | 'desconto';
}

export interface DadosEmpresa {
  nome: string;
  cnpj: string;
  endereco: string;
  mesAno: string;
  mesAnoFinal?: string;
  geracaoEmLote?: boolean;
  variarValores?: boolean;
  tipoRecibo: 'salario' | 'prolabore';
  calcularTributos?: boolean;
  calcularINSS?: boolean;
  calcularIRRF?: boolean;
  calcularFGTS?: boolean;
}

export interface DadosFuncionario {
  codigo: string;
  nome: string;
  funcao: string;
  cbo: string;
  numeroDependentes: number;
  salarioBaseContratual?: number;
  diasTrabalhados?: number;
}

export interface ResultadoCalculo {
  totalVencimentos: number;
  totalDescontos: number;
  liquidoReceber: number;
  baseINSS: number;
  valorINSS: number;
  baseIRRF: number;
  valorIRRF: number;
  faixaIRRF: string;
  salarioBase: number;
  baseFGTS: number;
  valorFGTS: number;
}
