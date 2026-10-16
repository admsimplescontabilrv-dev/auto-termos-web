import { collection, doc, writeBatch, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Empresa, Alvara } from '../types';
import { sanitizeModulosResponsavel } from './empresaUtils';

// Lista de 141 empresas fornecidas pelo usuário com nomes em letras maiúsculas
export const LISTA_OFICIAL_EMPRESAS = [
  { nome: "AÇO DLR LTDA", cnpj: "55.860.930/0001-07" },
  { nome: "ADF CRED LTDA.", cnpj: "59.446.511/0001-84" },
  { nome: "AGI CONSULTORIA E ASSESSORIA DE NEGOCIOS LTDA", cnpj: "39.941.142/0001-99" },
  { nome: "AGROPECUÁRIA SCHWENGBER LTDA", cnpj: "56.185.753/0001-73" },
  { nome: "ALBERTO CARLOS BRAZ JUNIOR-RIO TINTAS/AGROPECUARIA SERRA AZUL", cnpj: "07.244.290/0001-68" },
  { nome: "AMPERES", cnpj: "47.023.507/0001-24" },
  { nome: "AMPERES INDUSTRIA E INSTALACOES ELETRICAS LTDA", cnpj: "63.942.647/0001-52" },
  { nome: "ANA PAULA MORAIS - DOMÉSTICA", cnpj: "713.030.571-15" },
  { nome: "ANEVI CONSTRUÇÕES LTDA", cnpj: "47.535.734/0001-39" },
  { nome: "ANGELA DA SILKVA PAULA DE OLIVEIRA", cnpj: "32.426.812/0001-90" },
  { nome: "AROMAS GRILL RESTAURANTE LTDA", cnpj: "19.072.331/0001-65" },
  { nome: "BARROS E SOARES", cnpj: "48.176.772/0001-05" },
  { nome: "BARROS E SOARES (FILIAL JATAI)", cnpj: "48.176.772/0002-96" },
  { nome: "BARUK TRANSPORTES LTDA(JRH HOLDING)", cnpj: "57.549.536/0001-88" },
  { nome: "BOA SEMETE IGREJA", cnpj: "31.317.929/0001-72" },
  { nome: "BRK TRUCK CENTER LTDA", cnpj: "66.459.731/0001-08" },
  { nome: "BRUNO FERREIRA MANCO", cnpj: "52.466.201/0001-82" },
  { nome: "BUFFET ARTE & SABOR LTDA", cnpj: "43.319.500/0001-01" },
  { nome: "C&R TRANSPORTES E SERVIÇOS AUTOMOTIVOS LTDA", cnpj: "63.291.628/0001-03" },
  { nome: "CAROL PONCIANO FITWER LTDDA", cnpj: "55.165.176/0001-95" },
  { nome: "CENTRAL PEÇAS LTDA", cnpj: "55.367.109/0001-53" },
  { nome: "CENTRO AUTOMOTIVO OMEGA LTDA.", cnpj: "48.986.915/0001-44" },
  { nome: "CENTRO DE EQUOTERAPIA", cnpj: "59.533.645/0001-32" },
  { nome: "CENTRO DE ESTUDOS UNIVERSAIS LUZ DA NOVA ERA", cnpj: "22.371.811/0001-31" },
  { nome: "CENTRO DE TREINAMENTO RAMON ATAIDES LTDA", cnpj: "48.182.755/0001-80" },
  { nome: "COMERCIAL ESPERANÇA LTDA", cnpj: "43.086.605/0001-50" },
  { nome: "CRISTALE BOUTIQUE DA PINTURA E REVESTIMENTOS LTDA", cnpj: "55.909.971/0001-40" },
  { nome: "CRISTALÊ COMERCIO DE TINTAS", cnpj: "14.287.075/0001-00" },
  { nome: "D & S REPRESENTAÇÃO (VIVA BOX SELF STORAGE LTDA)", cnpj: "54.629.405/0001-12" },
  { nome: "DENTAL LAB LTDA", cnpj: "61.010.589/0001-01" },
  { nome: "DHD SOLUCOES URBANAS LTDA", cnpj: "57.661.229/0001-94" },
  { nome: "DIMACON LTDA (EIRELI)", cnpj: "19.182.557/0001-19" },
  { nome: "DIMACON MATERIAS PARA CONSTRUCAO", cnpj: "33.771.097/0001-95" },
  { nome: "DIVINO FRANCISCO DOS SANTOS JUNIOR 99604779168-CABRAL", cnpj: "21.716.589/0001-07" },
  { nome: "DJ SILVA LTDA", cnpj: "63.660.985/0001-00" },
  { nome: "DM HAMONIZAÇÃO", cnpj: "64.921.751/0001-23" },
  { nome: "DOUGLAS MORAIS - DOMÉSTICA", cnpj: "875.089.401-30" },
  { nome: "DOYDO CATALISADORES", cnpj: "61.051.752/0001-76" },
  { nome: "DROGRARIA SUPER POPULAR LTDA", cnpj: "65.356.328/0001-90" },
  { nome: "DSL MÁQUINAS E IMPLEMENTOS LTDA", cnpj: "34.212.789/0001-66" },
  { nome: "DT FLOW(DELTA)", cnpj: "64.911.913/0001-42" },
  { nome: "E&B ASSESORIA LTDA", cnpj: "35.106.380/0001-28" },
  { nome: "EDER SOUZA DUTRA", cnpj: "59.733.705/0001-60" },
  { nome: "EDSON BORGES DE MEDEIROS JUNIOR-TERRATEC AGRO", cnpj: "50.362.864/0001-21" },
  { nome: "EDUARDO HENRIQUE - CEMAQ PECAS", cnpj: "34.481.991/0001-93" },
  { nome: "EMPÓRIO DA CARNE VACA SANTA LTDA", cnpj: "67.753.249/0001-49" },
  { nome: "EPL CLINICA MÉDICA - ELISA LESSA", cnpj: "29.424.063/0001-57" },
  { nome: "EZULIAN COMERCIO E TRANSPORTE DE GRÃOS", cnpj: "23.530.089/0001-01" },
  { nome: "F DE D RODRIGUES LTDA", cnpj: "67.643.606/0001-16" },
  { nome: "F DE OLIVEIRA FEITOSA ( VIDRACARIA CASA VIDRAL)", cnpj: "14.655.018/0001-36" },
  { nome: "F. ERICK FERNANDES EIRELI", cnpj: "30.082.786/0001-02" },
  { nome: "FÁBIO PELEGRINI", cnpj: "61.359.467/0001-17" },
  { nome: "FERREIRINHA REPRESENTACAO LTDA", cnpj: "63.932.764/0001-35" },
  { nome: "FRANCISCO DE DEUS RODRIGUES-BORRACHARIA SAO FRANCISCO", cnpj: "21.914.091/0001-40" },
  { nome: "G.A MANGUEIRAS LTDA-REYLA", cnpj: "53.807.791/0001-22" },
  { nome: "GASTRONOMIA RV", cnpj: "38.461.537/0001-21" },
  { nome: "GDC TECNOLOGIA LTDA", cnpj: "50.641.230/0001-08" },
  { nome: "GESTAO & PERFORMANCE EMPRESARIAL LTDA", cnpj: "63.948.753/0001-43" },
  { nome: "GIGATEC SOLUCOES EM ADMINISTRACAO E TECNOLOGIA LTDA", cnpj: "14.911.313/0001-06" },
  { nome: "GO PASS TECNOLOGIA(LEGO SISTEMA)", cnpj: "33.202.686/0001-52" },
  { nome: "GR SOLUÇÕES INDUSTRIAIS LTDA", cnpj: "50.297.500/0001-05" },
  { nome: "HUNTER CAR CENTRO AUTOMOTIVO LTDA", cnpj: "60.530.648/0001-00" },
  { nome: "IGREJA RENOVO", cnpj: "64.788.196/0001-03" },
  { nome: "IHM TRANSPORTE", cnpj: "64.351.903/0001-08" },
  { nome: "INACIO MIRANDA NETO LTDA.", cnpj: "44.175.126/0001-72" },
  { nome: "INSTITUTO HUMANOUS DE ORIENTAÇÃO E PERFORMANCE PROFISSIONAL LTDA", cnpj: "68.360.966/0001-73" },
  { nome: "ISABELA NUNES VIEIRA LTDA", cnpj: "52.495.422/0001-89" },
  { nome: "ITAPER ENSACADEIRAS LTDA-ITAMAR PEREIRA DE OLIVEIRA 38741261100", cnpj: "28.700.295/0001-28" },
  { nome: "JC PINTURAS LTDA", cnpj: "28.225.819/0001-76" },
  { nome: "JOÃO BATISTA SILVA PACHECO LTDA (USUÁRIO PARTICULAR)", cnpj: "34.143.288/0001-75" },
  { nome: "JORGE HENRIQUE ALMEIDA DE MORAES LTDA", cnpj: "42.895.105/0001-04" },
  { nome: "JUCEC EMP ICM LTDA", cnpj: "51.675.164/0001-50" },
  { nome: "KAZA POSTA LTDA", cnpj: "39.345.473/0001-66" },
  { nome: "LACERDA E PROTO", cnpj: "48.422.592/0001-66" },
  { nome: "LANCHONTE KI BAGUNÇA", cnpj: "48.606.997/0001-54" },
  { nome: "LEÃO E PROTO LTDA", cnpj: "05.815.742/0001-99" },
  { nome: "LG CONSULTORIA EM ADMINISTRACAO E TECNOLOGIA LTDA", cnpj: "08.862.565/0001-90" },
  { nome: "LOLO BIJU LTDA", cnpj: "27.599.597/0001-99" },
  { nome: "LOLO BIJU LTDA FILIAL", cnpj: "27.599.597/0002-70" },
  { nome: "LR GLOBAL MOTO PEÇAS", cnpj: "50.875.785/0001-14" },
  { nome: "LUAN SILVA LIMA REFRIGERAÇÃO", cnpj: "51.634.175/0001-91" },
  { nome: "LUNA MORAIS LTDA", cnpj: "67.063.272/0001-01" },
  { nome: "MAQUINAS E EQUIPAMENTOS FORT MAQ LTDA", cnpj: "24.957.724/0001-96" },
  { nome: "MARCOS HUMBETTO CHAGAS", cnpj: "59.058.244/0001-78" },
  { nome: "MARIA EDITH", cnpj: "25.156.528/0001-85" },
  { nome: "MARIANA FETZ ARQUITETURA LTDA.", cnpj: "40.044.330/0001-01" },
  { nome: "MARTINS MARIANO SERVIÇOS LTDA-DELTA", cnpj: "64.365.529/0001-91" },
  { nome: "MASTER POKE EMPÓRIO E TEMAKERIA", cnpj: "41.818.821/0001-17" },
  { nome: "METALURGICA LOBÃO LTDA", cnpj: "68.146.123/0001-79" },
  { nome: "MINAS MAIS COMÉRCIO LTDA", cnpj: "32.456.474/0001-39" },
  { nome: "MORADAS GRILL LTDA", cnpj: "31.883.813/0001-09" },
  { nome: "MORAH NEGÓCIOS E SERVIÇOS LTDA.", cnpj: "48.292.481/0001-82" },
  { nome: "MORAIS TOP", cnpj: "45.715.362/0001-05" },
  { nome: "MUNDIAL PLANETA CURSOS E ASSESSORIA", cnpj: "00.099.178/0001-31" },
  { nome: "NAYANE ALVES MOREIRA LTDA", cnpj: "56.822.878/0001-67" },
  { nome: "OMEGA AUTO PEÇAS LTDA", cnpj: "48.349.605/0001-19" },
  { nome: "OPEN BOX BURGUER", cnpj: "50.248.187/0001-15" },
  { nome: "OTAVIO DANIEL LOPES DA SILVA LTDA", cnpj: "56.769.167/0001-76" },
  { nome: "PALÁCIO DAS UNHAS COMÉRCIO DE COSMÉTICOS", cnpj: "60.022.360/0001-16" },
  { nome: "PATRICIA RODRIGUES SOCIEDADE INDIVIDUAL DE ADVOCACIA", cnpj: "44.824.101/0001-52" },
  { nome: "PET SHOP 4 PATAS LTDA", cnpj: "21.506.101/0001-09" },
  { nome: "PIZZA E HAMBURGUER", cnpj: "31.282.959/0001-90" },
  { nome: "PROGRESSO MÁQUINAS", cnpj: "61.029.256/0001-16" },
  { nome: "PROSPERITATEM COMERCIO DE ALIMENTOS", cnpj: "16.988.267/0001-79" },
  { nome: "REDI TECNOLOGIA 04985554000146", cnpj: "04.985.554/0001-46" },
  { nome: "REFRIAR AR CONDICIONADO LTDA", cnpj: "26.883.330/0001-66" },
  { nome: "REFRIAR RECURSOS HUMANOS LTDA", cnpj: "52.510.368/0001-01" },
  { nome: "REGINALDO CARDOSO DE FREITAS", cnpj: "47.510.131/0001-82" },
  { nome: "RM GESTÃO E ENGENHARIA", cnpj: "38.328.749/0001-35" },
  { nome: "RODORAPHA", cnpj: "28.165.443/0001-51" },
  { nome: "SERENA CLINIC LTDA", cnpj: "65.725.148/0001-39" },
  { nome: "SERTÃO DO CERRADO", cnpj: "60.936.105/0001-89" },
  { nome: "SILO CAMPO TRANSPORTES", cnpj: "52.495.212/0001-90" },
  { nome: "SIMPLES ASSESSORIA CONTÁBIL", cnpj: "27.205.802/0001-94" },
  { nome: "STUDIOS DOMINGUES VIEIRA LTDA.", cnpj: "43.793.013/0001-78" },
  { nome: "SUPER SPORT RV INDUSTRIA", cnpj: "27.317.356/0001-00" },
  { nome: "TEC AÇO", cnpj: "00.136.958/0001-04" },
  { nome: "TEC AGRO SOLUÇÕES", cnpj: "56.008.682/0001-33" },
  { nome: "TERRA PRODUTIVA", cnpj: "44.338.787/0001-71" },
  { nome: "TORNEADORA E BALANCEDORA DO BILOKA LTDA", cnpj: "36.541.284/0001-70" },
  { nome: "TRANSLOBATO", cnpj: "58.751.719/0001-44" },
  { nome: "TRANSPORTADORA MARE LTDA", cnpj: "19.508.334/0002-80" },
  { nome: "TRIUNFO CURSOS EMPREENDIMENTOS E ASSESSORIA LTDA(JAE)", cnpj: "45.318.408/0001-44" },
  { nome: "TSB ESTRATÉGIA COMERCIAL LTDA", cnpj: "65.501.301/0001-44" },
  { nome: "VAZ COMÉRCIO GLOBAL LTDA", cnpj: "46.279.316/0001-65" },
  { nome: "VILAINE ALVES DE JESUS", cnpj: "50.815.180/0001-38" },
  { nome: "WDF ARQUITETURA", cnpj: "19.087.108/0001-91" },
  { nome: "WENDER M. DOS SANTOS", cnpj: "42.330.726/0001-32" },
  { nome: "WILLIAN GERMANO CARPIM", cnpj: "999.680.371-68" },
  { nome: "YAMARA TATTOO LTDA.- IAGO RANIERE", cnpj: "34.949.143/0001-66" },
  { nome: "ZARD MODA FEMININA LTDA", cnpj: "58.908.668/0001-11" },
  { nome: "ZENI SILVA CONFECÇÃO", cnpj: "59.148.423/0001-04" },
  { nome: "AROMAPRO BRASIL LTDA", cnpj: "62.112.419/0001-92" },
  { nome: "M.B. MUNIZ LTDA", cnpj: "58.866.967/0001-30" },
  { nome: "RAÇÕES NOVA ALIANÇA COMPRA E VENDA DE GRÃOS LTDA", cnpj: "36.330.258/0001-01" },
  { nome: "OMEGA LOCAÇÃO LTDA", cnpj: "39.291.527/0001-58" },
  { nome: "ALFA BALANCEAMENTO LTDA", cnpj: "42.800.892/0001-55" },
  { nome: "LANCHONETE LEMOND", cnpj: "66.197.417/0001-02" },
  { nome: "WF COMERCIALIZAÇÃO COMPRA E VENDA DE VEÍCULOS LTDA", cnpj: "19.801.908/0001-22" },
  { nome: "DW CAR CENTRO DE ESTETICA AUTOMOTIVO LTDA", cnpj: "" },
  { nome: "DWK CENTRO DE ESTETICA AUTOMOTIVO LTDA", cnpj: "68.620.745/0001-97" }
];

// 21 empresas que devem constar com situação "NÃO PAGO" nos alvarás
export const LISTA_ALVARAS_NAO_PAGO = [
  { nome: "ADF CRED LTDA.", cnpj: "59.446.511/0001-84", regime: "SIMPLES", cert: "11/02/2027", entrada: "09/2025", inscMunicipal: "79849" },
  { nome: "ALBERTO CARLOS BRAZ JUNIOR-RIO TINTAS", cnpj: "07.244.290/0001-68", regime: "SIMPLES", cert: "28/02/2026", entrada: "01/2017", inscMunicipal: "12894" },
  { nome: "ANEVI CONSTRUÇÕES LTDA", cnpj: "47.535.734/0001-39", regime: "SIMPLES", cert: "", entrada: "02/2023", inscMunicipal: "72759" },
  { nome: "CABRAL PORTÕES - DIVINO", cnpj: "21.716.589/0001-07", regime: "", cert: "", entrada: "", inscMunicipal: "" },
  { nome: "EMPÓRIO BEER-EDUARDO FERREIRA DIAS", cnpj: "53.370.403/0001-99", regime: "SIMPLES", cert: "22/01/2027", entrada: "06/2025", inscMunicipal: "77381" },
  { nome: "F DE OLIVEIRA FEITOSA ( VIDRACARIA CASA VIDRAL)", cnpj: "14.655.018/0001-36", regime: "SIMPLES", cert: "24/07/2026", entrada: "01/2026", inscMunicipal: "EMITIDO" },
  { nome: "F. ERICK FERNANDES EIRELI", cnpj: "30.082.786/0001-02", regime: "SIMPLES", cert: "27/01/2027", entrada: "02/2023", inscMunicipal: "53538" },
  { nome: "FRANCISCO DE DEUS RODRIGUES", cnpj: "21.914.091/0001-40", regime: "PRESUMIDO", cert: "22/05/2026", entrada: "01/2017", inscMunicipal: "33326" },
  { nome: "ISABELA NUNES VIEIRA LTDA", cnpj: "52.495.422/0001-89", regime: "SIMPLES", cert: "03/02/2027", entrada: "01/2026", inscMunicipal: "EMITIDO" },
  { nome: "JC PINTURAS LTDA", cnpj: "28.225.819/0001-76", regime: "SIMPLES", cert: "17/11/2026", entrada: "10/2025", inscMunicipal: "52288" },
  { nome: "JUCEC EMP ICM LTDA", cnpj: "51.675.164/0001-50", regime: "SIMPLES", cert: "29/10/2026", entrada: "11/2023", inscMunicipal: "1504281" },
  { nome: "LACERDA E PROTO", cnpj: "48.422.592/0001-66", regime: "SIMPLES", cert: "12/03/2026", entrada: "09/2025", inscMunicipal: "73591" },
  { nome: "MARIANA FETZ ARQUITETURA LTDA.", cnpj: "40.044.330/0001-01", regime: "SIMPLES", cert: "", entrada: "02/2026", inscMunicipal: "EMITIDO" },
  { nome: "MORAH NEGÓCIOS E SERVIÇOS LTDA.", cnpj: "48.292.481/0001-82", regime: "", cert: "", entrada: "03/2026", inscMunicipal: "" },
  { nome: "MORAIS TOP", cnpj: "45.715.362/0001-05", regime: "SIMPLES", cert: "18/09/2026", entrada: "09/2025", inscMunicipal: "81090" },
  { nome: "PIZZA E HAMBURGUER", cnpj: "31.282.959/0001-90", regime: "SIMPLES", cert: "09/07/2026", entrada: "10/2023", inscMunicipal: "75065" },
  { nome: "RM GESTÃO E ENGENHARIA", cnpj: "38.328.749/0001-35", regime: "SIMPLES", cert: "18/11/2026", entrada: "10/2025", inscMunicipal: "63222" },
  { nome: "AGI CONSULTORIA E ASSESSORIA DE NEGOCIOS LTDA", cnpj: "39.941.142/0001-99", regime: "", cert: "", entrada: "", inscMunicipal: "" },
  { nome: "MARCOS HUMBETTO CHAGAS", cnpj: "59.058.244/0001-78", regime: "", cert: "", entrada: "", inscMunicipal: "" },
  { nome: "EDSON BORGES DE MEDEIROS JUNIOR-TERRATEC AGRO", cnpj: "50.362.864/0001-21", regime: "SIMPLES", cert: "12/01/2027", entrada: "01/2026", inscMunicipal: "EMITIDO" },
  { nome: "EDER SOUZA DUTRA", cnpj: "59.733.705/0001-60", regime: "MEI", cert: "", entrada: "01/2026", inscMunicipal: "N TEM" }
];

// Empresas que devem constar como "CONCLUÍDO" nos alvarás
export const LISTA_ALVARAS_CONCLUIDOS = [
  "AMPERES INDUSTRIA E MONTAGENS ELETRICAS LTDA",
  "AMPERES INDUSTRIA E INSTALACOES ELETRICAS LTDA",
  "AROMAS GRILL RESTAURANTE LTDA",
  "BARROS E SOARES",
  "JRG HOLDING",
  "BRUNO FERREIRA MANCO",
  "BUFFET ARTE & SABOR LTDA",
  "C&R TRANSPORTES E SERVIÇOS AUTOMOTIVOS LTDA",
  "COMERCIAL ESPERANÇA LTDA",
  "CONQUISTAR EMBALAGENS E LIMPEZA LTDA",
  "DENTAL LAB LTDA",
  "DROGRARIA SUPER POPULAR LTDA",
  "DT FLOW(DELTA)",
  "FERREIRA NOGUEIRA LTDA-DOCE MEL",
  "GASTRONOMIA RV",
  "IHM TRANSPORTE",
  "INACIO MIRANDA NETO LTDA.",
  "ITAPER ENSACADEIRAS LTDA-ITAMAR PEREIRA DE OLIVEIRA 38741261100",
  "JOÃO BATISTA SILVA PACHECO LTDA (USUÁRIO PARTICULAR)",
  "LEÃO E CARNEIRO",
  "LOLO BIJU LTDA",
  "LOLO BIJU LTDA FILIAL",
  "LUAN SILVA LIMA REFRIGERAÇÃO",
  "MASTER POKE EMPÓRIO E TEMAKERIA",
  "MINAS MAIS COMÉRCIO LTDA",
  "PROGRESSO MÁQUINAS",
  "SILO CAMPO TRANSPORTES",
  "TRANSLOBATO",
  "VAZ COMÉRCIO GLOBAL LTDA"
];

const cleanDoc = (d?: string | null): string => (d || '').replace(/\D/g, '');

const norm = (s?: string | null): string =>
  (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

// Tabela de sinônimos conhecidos
const ALIASES: Record<string, string[]> = {
  [norm("AMPERES INDUSTRIA E MONTAGENS ELETRICAS LTDA")]: [norm("AMPERES"), "47023507000124"],
  [norm("JRG HOLDING")]: [norm("BARUK TRANSPORTES LTDA(JRH HOLDING)"), "57549536000188"],
  [norm("CONQUISTAR EMBALAGENS E LIMPEZA LTDA")]: [
    norm("CONQUISTAR NEGOCIOS IMOBILIARIOS-CONQUISTAR EMBALAGENS"),
    norm("DOCE MEL EMBALAGENS E LIMPEZA LTDA"),
    "33412687000121",
    "64073841000125"
  ],
  [norm("LEÃO E CARNEIRO")]: [norm("LEAO E PROTO LTDA"), "05815742000199"],
  [norm("CABRAL PORTÕES - DIVINO")]: [norm("DIVINO FRANCISCO DOS SANTOS JUNIOR 99604779168-CABRAL"), "21716589000107"],
  [norm("FRANCISCO DE DEUS RODRIGUES")]: [norm("FRANCISCO DE DEUS RODRIGUES-BORRACHARIA SAO FRANCISCO"), "21914091000140"],
  [norm("ALBERTO CARLOS BRAZ JUNIOR-RIO TINTAS")]: [norm("ALBERTO CARLOS BRAZ JUNIOR-RIO TINTAS/AGROPECUARIA SERRA AZUL"), "07244290000168"]
};

// Lista de empresas com atualização de situação cadastral e regime tributário
export const ATUALIZACOES_SITUACAO_CADASTRAL: { nome: string; regime?: string; situacao: 'INATIVA' | 'SUSPENSA' }[] = [
  { nome: "AFRH LTDA", regime: "PRESUMIDO", situacao: "INATIVA" },
  { nome: "AG SOL TRADING GO", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "AG SOL TRADING MS", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "AG SOL TRADING PR", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "AG SOL TRADING SP", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "AGRO BEZERRA COMERCIO DE GRAOS LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "AGROPONTES COMERCIAL AGRICOLA LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "AGROPONTES COMERCIAL AGRICOLA LTDA-FILIAL", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "AGROTONI CEREALISTA LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "BEIJA FLOR ASSESSORIA", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "BF GALPÕES E ALAMBRADOS LTDA (MUNICIPIO DE GOIAS)", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "CJA SERVIÇOS MEDICOS LTDA (PARALIZOU)", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "COMERCIAL AGROSOL", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "CONQUISTAR NEGÓCIOS IMOBILIÁRIOS-CONQUISTAR EMBALAGENS", regime: "SIMPLES", situacao: "SUSPENSA" },
  { nome: "COOPRAM - COOPERATIVA DOS PRODUTORES DA REGIAO MERIDIONAL DO BRASIL", regime: "PRESUMIDO", situacao: "INATIVA" },
  { nome: "DM DISTRIBUIDORA LTDA", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "E F DIAS PRIME LTDA (EMPORIO PRIME)", regime: "SIMPLES", situacao: "SUSPENSA" },
  { nome: "ELI JR (INADIMPLENCIA,BAIXADA)", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "EMPÓRIO BEER-EDUARDO FERREIRA DIAS", regime: "SIMPLES", situacao: "SUSPENSA" },
  { nome: "ENOOOK LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "ETHRA CONSULTORIA EM TECNOLOGIA E PRIVACIDADE LTDA", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "EVOLUT SEG PORTARIA E SERVIÇOS LTDA", situacao: "SUSPENSA" },
  { nome: "FALCON AGRO SISTEMAS (MUDOU DE CONTADOR)", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "FERREIRA NOGUEIRA LTDA-DOCE MEL", regime: "REAL TRIMESTRAL", situacao: "SUSPENSA" },
  { nome: "GRAIN LOGISTICA LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "HMV TERRAPLANAGEM & CONSTRUCOES LTDA.", regime: "PRESUMIDO", situacao: "INATIVA" },
  { nome: "INSTITUTO DE ENSINO CERRADO LTDA", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "KAREN JAQUELINE (NUTRIMAIS)", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "KO'ACH AGROINDUSTRIAL LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "KO'ACH CONSTRUTORA E INCORPORADORA LTDA", regime: "PRESUMIDO", situacao: "INATIVA" },
  { nome: "LE'EZOR INVESTIMENTOS LTDA", regime: "PRESUMIDO", situacao: "INATIVA" },
  { nome: "LE'EZOR MERCADO DE CAPITAIS S.A", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "LIBER TRADING LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "LIBER TRADING LTDA- FILIAL", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "MARLIANA ARAUJO DE SOUSA ARANTES LTDA", regime: "REAL", situacao: "INATIVA" },
  { nome: "MATHEUS ALVES PELUCO LTDA.-DELTA", regime: "SIMPLES", situacao: "SUSPENSA" },
  { nome: "METAL VIDA-(HVM CONST. E TERRAPL. LTDA)", regime: "SIMPLES", situacao: "SUSPENSA" },
  { nome: "OLIVEIRA E CARDOSO CENTRO DE SAUDE LTDA", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "PAMPLONA AGRO INDUSTRIAL LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "PET SHOP E VETERINARIA 4 PATAS LTDA", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "RAFAEL MARTINS RODRIGUES LTDA", regime: "PRESUMIDO", situacao: "SUSPENSA" },
  { nome: "RANCHEIRO AGRO LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "RESTAURANTE PROZA", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "S BATISTA COMIDA CASEIRA ARTE DO SABOR", regime: "PRESUMIDO", situacao: "INATIVA" },
  { nome: "T. B. J. COMERCIO IMP. E EXP. LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "TERCEIRIZA COMERCIO E SERVICOS LTDA", regime: "REAL TRIMESTRAL", situacao: "INATIVA" },
  { nome: "TERRAPLAN ENGENHARIA LTDA. (TIRAR DO NOME)", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "TRANSPORTADORA CARDOSO E ALBUQUERQUE LTDA", regime: "PRESUMIDO", situacao: "INATIVA" },
  { nome: "VINÍCIUS SOUZA MACEDO- (BAIXA)", regime: "SIMPLES", situacao: "INATIVA" },
  { nome: "DOCE MEL EMBALAGENS E LIMPEZA LTDA", regime: "SIMPLES", situacao: "INATIVA" }
];

export function isAlvaraNaoPago(empresa: Empresa): boolean {
  const empNomeNorm = norm(empresa.nome);
  const empCnpjClean = cleanDoc(empresa.cnpj);

  return LISTA_ALVARAS_NAO_PAGO.some(item => {
    const itemNorm = norm(item.nome);
    const itemCnpjClean = cleanDoc(item.cnpj);
    if (empCnpjClean && itemCnpjClean && empCnpjClean === itemCnpjClean) return true;
    if (empNomeNorm === itemNorm || (itemNorm && empNomeNorm && (empNomeNorm.includes(itemNorm) || itemNorm.includes(empNomeNorm)))) return true;
    const aliases = ALIASES[itemNorm];
    if (aliases && (aliases.includes(empNomeNorm) || (empCnpjClean && aliases.includes(empCnpjClean)))) return true;
    return false;
  });
}

export function isAlvaraConcluido(empresa: Empresa): boolean {
  if (isAlvaraNaoPago(empresa)) return false;

  const empNomeNorm = norm(empresa.nome);
  const empCnpjClean = cleanDoc(empresa.cnpj);

  return LISTA_ALVARAS_CONCLUIDOS.some(alvo => {
    const alvoNorm = norm(alvo);
    if (empNomeNorm === alvoNorm || (alvoNorm && empNomeNorm && (empNomeNorm.includes(alvoNorm) || alvoNorm.includes(empNomeNorm)))) {
      return true;
    }
    const aliases = ALIASES[alvoNorm];
    if (aliases) {
      if (aliases.includes(empNomeNorm) || (empCnpjClean && aliases.includes(empCnpjClean))) {
        return true;
      }
    }
    return false;
  });
}

export function isAlvaraAlvo(empresa: Empresa): boolean {
  return isAlvaraNaoPago(empresa) || isAlvaraConcluido(empresa);
}

export function getAlvaraSituacaoPredefinida(empresa: Empresa): 'NÃO PAGO' | 'CONCLUÍDO' | null {
  if (isAlvaraNaoPago(empresa)) return 'NÃO PAGO';
  if (isAlvaraConcluido(empresa)) return 'CONCLUÍDO';
  return null;
}

export async function sincronizarEmpresasEAlvaras(
  empresasAtuais: Empresa[],
  alvarasAtuais?: Alvara[],
  onStatusUpdate?: (msg: string) => void
): Promise<{ criadas: number; renomeadas: number; alvarasAtualizados: number }> {
  let renomeadas = 0;
  let criadas = 0;
  let alvarasAtualizados = 0;

  try {
    const currentYear = new Date().getFullYear();
    const anosAlvo = [currentYear, 2025, 2026];

    // 1. Identificar empresas que precisam ter o nome em MAIÚSCULAS ou módulo LEGALIZAÇÃO adicionado
    const batchUpdates: { docRef: any; data: any }[] = [];
    const batchCreates: any[] = [];

    // Mapear empresas existentes por CNPJ e por nome normalizado
    const empByCnpj = new Map<string, Empresa>();
    const empByNormName = new Map<string, Empresa>();

    empresasAtuais.forEach(emp => {
      const c = cleanDoc(emp.cnpj);
      if (c) empByCnpj.set(c, emp);
      const n = norm(emp.nome);
      if (n) empByNormName.set(n, emp);

      // Checa se o nome atual não está em maiúsculas
      const upperName = (emp.nome || '').toUpperCase().trim();
      const needsUpper = emp.nome !== upperName;
      const ehAlvoAlvara = isAlvaraAlvo(emp);

      // Para empresas de alvará, garante que o módulo LEGALIZAÇÃO está presente
      const currentMods = Array.isArray(emp.modulosResponsavel) ? [...emp.modulosResponsavel] : ['DP & RH'];
      const hasLegalizacao = currentMods.some(m => norm(m) === 'legalizacao');
      const needsLegalizacao = ehAlvoAlvara && !hasLegalizacao;

      // Dados cadastrais atualizados caso esteja em LISTA_ALVARAS_NAO_PAGO
      const naoPagoData = LISTA_ALVARAS_NAO_PAGO.find(item => {
        const itemClean = cleanDoc(item.cnpj);
        const itemNorm = norm(item.nome);
        return (c && itemClean && c === itemClean) || itemNorm === n;
      });

      // Situação cadastral e regime tributário atualizados conforme solicitação do usuário
      const cleanEmpName = (emp.nome || '').replace(/\(.*?\)/g, '').trim();
      const targetNorm = norm(cleanEmpName);
      const fullNorm = norm(emp.nome);

      const situacaoUpdate = ATUALIZACOES_SITUACAO_CADASTRAL.find(item => {
        const itemNorm = norm(item.nome);
        const itemCleanNorm = norm(item.nome.replace(/\(.*?\)/g, ''));
        return itemNorm === fullNorm || itemCleanNorm === targetNorm || itemCleanNorm === fullNorm || targetNorm.includes(itemCleanNorm) || itemCleanNorm.includes(targetNorm);
      });

      const currentSit = (emp.situacao || 'ATIVA').toUpperCase().trim();
      const isBaixada = currentSit === 'BAIXADA';
      const needsSit = situacaoUpdate && currentSit !== situacaoUpdate.situacao;
      const needsReg = situacaoUpdate && situacaoUpdate.regime && (emp.regime || '').toUpperCase().trim() !== situacaoUpdate.regime;

      if (needsUpper || needsLegalizacao || naoPagoData || needsSit || needsReg || isBaixada) {
        const updateData: any = { updatedAt: Date.now() };
        if (needsUpper) {
          updateData.nome = upperName;
          renomeadas++;
        }
        if (needsLegalizacao) {
          currentMods.push('LEGALIZAÇÃO');
          updateData.modulosResponsavel = sanitizeModulosResponsavel(currentMods, emp);
        }
        if (naoPagoData) {
          if (naoPagoData.regime && naoPagoData.regime !== '-') updateData.regime = naoPagoData.regime;
          if (naoPagoData.cert && naoPagoData.cert !== '-') updateData.procuracao = naoPagoData.cert;
          if (naoPagoData.entrada) updateData.dataEntrada = naoPagoData.entrada;
          if (naoPagoData.inscMunicipal) updateData.inscMunicipal = naoPagoData.inscMunicipal;
        }
        if (isBaixada) {
          updateData.situacao = 'INATIVA';
          updateData.situacaoCadastral = 'INATIVA';
        } else if (needsSit && situacaoUpdate) {
          updateData.situacao = situacaoUpdate.situacao;
          updateData.situacaoCadastral = situacaoUpdate.situacao;
        }
        if (needsReg && situacaoUpdate?.regime) {
          updateData.regime = situacaoUpdate.regime;
          updateData.regimeTributario = situacaoUpdate.regime;
        }

        batchUpdates.push({
          docRef: doc(db, 'empresas', emp.id),
          data: updateData
        });
      }
    });

    // 2. Verificar se todas as 141 empresas estão cadastradas
    for (const item of LISTA_OFICIAL_EMPRESAS) {
      const c = cleanDoc(item.cnpj);
      const n = norm(item.nome);
      let match = c ? empByCnpj.get(c) : undefined;
      if (!match) {
        match = empByNormName.get(n);
      }
      if (!match) {
        for (const [existingNorm, emp] of empByNormName.entries()) {
          if (existingNorm === n || existingNorm.includes(n) || n.includes(existingNorm)) {
            match = emp;
            break;
          }
        }
      }

      if (!match) {
        // Empresa ausente: cadastra no Firestore
        const novaEmpresa: Omit<Empresa, 'id'> = {
          nome: item.nome.toUpperCase().trim(),
          cnpj: item.cnpj || '',
          codigo: '0',
          situacao: 'ATIVA',
          regime: 'SIMPLES',
          cidade: 'RIO VERDE - GO',
          modulosResponsavel: ['DP & RH', 'LEGALIZAÇÃO'],
          createdAt: Date.now()
        };
        batchCreates.push(novaEmpresa);
        criadas++;
      }
    }

    // 3. Executar atualizações e criações de empresas em lote
    if (batchUpdates.length > 0) {
      const chunkSize = 400;
      for (let i = 0; i < batchUpdates.length; i += chunkSize) {
        const chunk = batchUpdates.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(op => batch.update(op.docRef, op.data));
        await batch.commit();
      }
    }

    for (const nova of batchCreates) {
      const docRef = await addDoc(collection(db, 'empresas'), nova);
      empByNormName.set(norm(nova.nome), { ...nova, id: docRef.id });
      if (cleanDoc(nova.cnpj)) {
        empByCnpj.set(cleanDoc(nova.cnpj), { ...nova, id: docRef.id });
      }
    }

    // 4. Sincronizar Alvarás (NÃO PAGO e CONCLUÍDO)
    const allEmpresasNow = [
      ...empresasAtuais,
      ...batchCreates.map((b, idx) => ({ ...b, id: `new_${idx}` }))
    ];

    const alvarasBatchUpdates: { docRef: any; data: any }[] = [];

    allEmpresasNow.forEach(emp => {
      const situacao = getAlvaraSituacaoPredefinida(emp);
      if (situacao) {
        anosAlvo.forEach(ano => {
          const docId = `${emp.id}_${ano}`;
          const obs = situacao === 'NÃO PAGO' ? 'Taxa de alvará pendente de quitação.' : 'Alvará concluído conforme controle oficial.';
          const alvaraData: Alvara = {
            empresaId: emp.id,
            empresaNome: (emp.nome || '').toUpperCase().trim(),
            cnpj: emp.cnpj || '',
            codigo: emp.codigo || '',
            ano,
            situacao,
            observacoes: obs,
            updatedAt: Date.now()
          };
          alvarasBatchUpdates.push({
            docRef: doc(db, 'alvaras', docId),
            data: alvaraData
          });
          alvarasAtualizados++;
        });
      }
    });

    if (alvarasBatchUpdates.length > 0) {
      const chunkSize = 400;
      for (let i = 0; i < alvarasBatchUpdates.length; i += chunkSize) {
        const chunk = alvarasBatchUpdates.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        chunk.forEach(op => batch.set(op.docRef, op.data, { merge: true }));
        await batch.commit();
      }
    }

    if (onStatusUpdate) {
      onStatusUpdate(`Sincronização concluída: ${alvarasAtualizados} alvarás atualizados.`);
    }

    return { criadas, renomeadas, alvarasAtualizados };
  } catch (err) {
    console.error('Erro na sincronização de empresas e alvarás:', err);
    throw err;
  }
}
