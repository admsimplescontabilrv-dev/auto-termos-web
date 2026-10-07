import { SavedTemplate } from './types';

export const DEFAULT_TEMPLATES: SavedTemplate[] = [
  {
    id: 'tpl-nda',
    name: 'Acordo de Confidencialidade, Não Aliciamento e Não Concorrência',
    subgrupo: 'DP & RH',
    content: `<br><br>
<div style="text-align: center;"><h2><b>ACORDO DE CONFIDENCIALIDADE, NÃO ALICIAMENTO E NÃO CONCORRÊNCIA</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>As partes acima qualificadas celebram o presente acordo mediante as cláusulas e condições abaixo:</p>
<br>
<p><b>1. DA CONFIDENCIALIDADE E SIGILO (NDA)</b></p>
<p>O(A) <b>EMPREGADO(A)</b> obriga-se a manter o mais absoluto sigilo sobre toda e qualquer Informação Confidencial da <b>EMPRESA</b> a que tiver acesso em razão de seu vínculo, seja durante o contrato de trabalho ou após o seu término.</p>
<p><b>1.1. Abrangência:</b> Entende-se por "Informação Confidencial" dados técnicos, operacionais, comerciais ou financeiros, incluindo: segredos de negócio, estratégias, listas de clientes e fornecedores, métodos de trabalho, senhas e dados de faturamento.</p>
<br>
<p><b>2. DO NÃO ALICIAMENTO</b></p>
<p>Pelo período de 12 (doze) meses após o encerramento do vínculo, o(a) <b>EMPREGADO(A)</b> compromete-se a não:</p>
<p><b>2.1.</b> Aliciar, convidar ou induzir o desligamento de outros empregados ou prestadores de serviço da <b>EMPRESA</b>.</p>
<p><b>2.2.</b> Desviar ou tentar desviar a clientela ativa da <b>EMPRESA</b> utilizando-se de informações privilegiadas obtidas durante o contrato de trabalho.</p>
<br>
<p><b>3. DA EXCLUSIVIDADE E NÃO CONCORRÊNCIA DURANTE O CONTRATO</b></p>
<p>Enquanto o(a) <b>EMPREGADO(A)</b> estiver prestando serviços e mantiver vínculo com a <b>EMPRESA</b>, este(a) compromete-se a não prestar serviços de qualquer natureza, seja de forma autônoma, empregatícia ou consultiva, para outras empresas concorrentes do mesmo segmento.</p>
<p><b>3.1.</b> Esta vedação aplica-se inclusive fora do horário de expediente do(a) <b>EMPREGADO(A)</b>, uma vez que a prestação de serviços a concorrentes configura ato de concorrência desleal, violação de boa-fé e quebra de fidúcia, conforme o Art. 482, alínea 'c', da Consolidação das Leis do Trabalho (CLT).</p>
<br>
<p><b>4. PROPRIEDADE INTELECTUAL</b></p>
<p>Qualquer processo, criação, método ou melhoria desenvolvida pelo(a) <b>EMPREGADO(A)</b> durante sua jornada de trabalho e com recursos da <b>EMPRESA</b> pertencerá exclusivamente ao <b>EMPREGADOR</b>.</p>

[QUEBRA]

<p><b>5. PENALIDADES</b></p>
<p>A quebra de qualquer cláusula deste acordo constitui falta grave e sujeita o infrator à imediata rescisão do contrato de trabalho por justa causa (se a infração ocorrer durante o vínculo).</p>
<p><b>5.1. Multa Contratual:</b> Sem prejuízo da rescisão por justa causa e da responsabilização civil por perdas e danos causados à <b>EMPRESA</b>, o descumprimento deste termo sujeitará o(a) <b>EMPREGADO(A)</b> ao pagamento de multa compensatória no valor equivalente a 1 (um) salário contratual mensal vigente do(a) colaborador(a), ou o equivalente ao seu último salário registrado, caso o vínculo já tenha sido desligado no momento da infração.</p>
<br>
<p><b>6. DISPOSIÇÕES GERAIS</b></p>
<p><b>6.1. Independência das Cláusulas:</b> A eventual invalidade de uma cláusula não afetará a validade das demais.</p>
<p><b>6.2. Foro:</b> Fica eleito o Foro da Comarca de <b>[CIDADE/UF]</b> para dirimir quaisquer dúvidas oriundas deste termo.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>__________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <br><br>
  <p>__________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-banco-horas',
    name: 'Acordo Individual - Banco de Horas',
    subgrupo: 'DP & RH',
    content: `<div style="text-align: center;"><h2><b>INSTRUMENTO PARTICULAR DE ACORDO INDIVIDUAL PARA PRORROGAÇÃO E COMPENSAÇÃO DE JORNADA DE TRABALHO</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ/MF sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, portador(a) do CPF nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>As partes acima qualificadas celebram entre si o presente Acordo Individual, mediante as seguintes cláusulas:</p>
<br>
<p><b>CLÁUSULA PRIMEIRA – DO OBJETO</b></p>
<p>O presente acordo tem por objetivo instituir o regime de Prorrogação de Jornada cumulado com Compensação de Horas (Banco de Horas), permitindo que as horas trabalhadas além da jornada contratual sejam compensadas com folgas ou reduções de jornada, ou, pagas como horas extraordinárias.</p>
<br>
<p><b>CLÁUSULA SEGUNDA – DA SOLICITAÇÃO E DA VOLUNTARIEDADE (VIDA PESSOAL)</b></p>
<p>A prestação de horas extraordinárias reger-se-á pelos seguintes critérios de mútua anuência:</p>
<p><b>a. Iniciativa do Empregador:</b> O <b>EMPREGADO(A)</b> apenas poderá realizar horas extraordinárias mediante solicitação expressa ou autorização prévia e formal do <b>EMPREGADOR</b> ou superior hierárquico.</p>
<p><b>b. Faculdade de Recusa:</b> Caso a convocação para jornada extraordinária interfira de forma comprovada ou relevante na vida pessoal e compromissos extraoficiais do <b>EMPREGADO(A)</b>, fica a este facultado o direito de declinar do cumprimento da hora extra em questão, sem que isso configure insubordinação ou infração disciplinar.</p>
<br>
<p><b>CLÁUSULA TERCEIRA – DOS LIMITES E REGISTRO</b></p>
<p>A prorrogação da jornada não poderá exceder o limite legal de 02 (duas) horas diárias, totalizando o máximo de 10 (dez) horas de trabalho por dia.</p>
<p><b>Parágrafo Único:</b> A permanência nas dependências da empresa ou logado em sistemas remotos sem solicitação do <b>EMPREGADOR</b> será considerada tempo de natureza particular, não sendo computada como hora extra.</p>

[QUEBRA]

<p><b>CLÁUSULA QUARTA – DA FORMA DE QUITAÇÃO (CRITÉRIO DO EMPREGADOR)</b></p>
<p>Fica a critério exclusivo do <b>EMPREGADOR</b> decidir se as horas excedentes serão destinadas ao Banco de Horas (compensação) ou se serão pagas como Horas Extras no contracheque.</p>
<p><b>Comunicação Prévia:</b> O <b>EMPREGADOR</b> deverá comunicar ao <b>EMPREGADO(A)</b>, com antecedência, qual será a modalidade de quitação escolhida (se haverá folga compensatória ou pagamento).</p>

<p><b>CLÁUSULA QUINTA – DO REGIME DE COMPENSAÇÃO (BANCO DE HORAS)</b></p>
<p>Sendo adotada a compensação, observar-se-á:</p>
<p><b>a. Prazo:</b> A compensação das horas acumuladas deverá ocorrer no prazo máximo de 06 (seis) meses, conforme Art. 59, § 5º da CLT.</p>
<p><b>b. Gestão de Folgas:</b> A definição das datas e períodos de folga compensatória será de conveniência do <b>EMPREGADOR</b>.</p>
<br>
<p><b>CLÁUSULA SEXTA – DA REMUNERAÇÃO DAS HORAS NÃO COMPENSADAS</b></p>
<p>Caso as horas excedentes não sejam compensadas dentro do prazo de 06 meses, o <b>EMPREGADOR</b> efetuará o pagamento destas como horas extras, com o adicional mínimo de 50% (cinquenta por cento) ou o percentual mais benéfico previsto em Convenção Coletiva de Trabalho (CCT).</p>
<br>
<p><b>CLÁUSULA SÉTIMA – DO SALDO NEGATIVO</b></p>
<p>Eventuais débitos de horas do <b>EMPREGADO(A)</b> (atrasos ou saídas antecipadas autorizadas) poderão ser compensados com horas positivas ou, ao final do período de 06 meses/rescisão, serem descontados em folha de pagamento.</p>

[QUEBRA]

<p><b>CLÁUSULA OITAVA – DA RESCISÃO CONTRATUAL</b></p>
<p>Na hipótese de rescisão do contrato de trabalho:</p>
<p><b>a. Saldo Positivo:</b> As horas não compensadas serão pagas como extras nas verbas rescisórias.</p>
<p><b>b. Saldo Negativo:</b> As horas não trabalhadas poderão ser descontadas das verbas rescisórias, conforme limite legal.</p>
<br>
<p><b>CLÁUSULA NONA – VIGÊNCIA E FORO</b></p>
<p>Este acordo tem validade por prazo indeterminado, podendo ser revisto ou aditado caso surjam novas Normas Coletivas que se sobreponham a estas condições. As partes elegem o foro da Comarca de <b>[CIDADE/UF]</b> para dirimir controvérsias.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br>
  <p>___________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <br>
  <p>___________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-etica-digital',
    name: 'Política de Ferramentas Digitais e Conduta',
    subgrupo: 'DP & RH',
    content: `<div style="text-align: center;"><h2><b>POLÍTICA GERAL DE USO DE FERRAMENTAS DIGITAIS, APARELHOS CELULARES E CONDUTA</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrito no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p><b>1. USO DE FERRAMENTAS CORPORATIVAS E REDES SOCIAIS DA EMPRESA</b></p>
<p><b>1.1.</b> Equipamentos, e-mails, números de telefone corporativos, contas de WhatsApp e demais sistemas cedidos pela empresa destinam-se estritamente ao desempenho das atividades profissionais.</p>
<p><b>1.2.</b> O <b>EMPREGADOR</b> detém total autonomia, propriedade e autoridade sobre o WhatsApp corporativo, redes sociais e todas as plataformas digitais da empresa.</p>
<p><b>1.3.</b> O <b>EMPREGADO</b> não deve publicar, enviar, apagar, alterar ou executar qualquer informação ou conteúdo nas redes sociais, WhatsApp ou plataformas digitais da empresa sem a prévia e expressa autorização do <b>EMPREGADOR</b>.</p>
<p><b>1.4.</b> Todo o histórico de mensagens, arquivos e comunicações realizadas em contas corporativas é de propriedade exclusiva do <b>EMPREGADOR</b>. É terminantemente proibida a exclusão de conversas ou dados sem autorização prévia, garantindo a rastreabilidade das informações.</p>
<br>
<p><b>2. USO DO APARELHO CELULAR PESSOAL NO AMBIENTE DE TRABALHO</b></p>
<p><b>2.1.</b> O uso de telefone celular pessoal durante o expediente e no ambiente de trabalho deve ocorrer somente em caráter de urgência ou emergência.</p>
<p><b>2.2.</b> O uso excessivo do aparelho celular pessoal para fins de entretenimento, redes sociais particulares ou conversas não relacionadas ao trabalho durante a jornada é expressamente proibido, pois compromete a atenção e a produtividade.</p>
<p><b>2.3.</b> Caso o <b>EMPREGADO</b> tenha uma necessidade urgente de utilizar o celular, deverá comunicar imediatamente o seu superior direto.</p>
<p><b>2.4.</b> Autorizado o uso pela urgência, o <b>EMPREGADO</b> deverá retirar-se do seu posto de trabalho (dirigindo-se a um local apropriado) e retornar imediatamente à sua função assim que finalizar a comunicação.</p>
<p><b>2.5.</b> O uso de dispositivo pessoal (celular próprio) para comunicação de trabalho, quando ocorrer, deve se restringir aos assuntos laborais, zelando o empregado pelo sigilo das informações da empresa e dos clientes.</p>

[QUEBRA]

<p><b>3. PRIVACIDADE, GARANTIAS DO EMPREGADO E MONITORAMENTO</b></p>
<p><b>3.1.</b> O <b>EMPREGADOR</b> poderá monitorar, realizar backup e auditar exclusivamente os sistemas, e-mails, linhas telefônicas e contas de WhatsApp de propriedade da empresa.</p>
<p><b>3.2. Garantia de Não Confisco e Inviolabilidade:</b> Fica expressamente estabelecido que, em nenhuma ocasião, o <b>EMPREGADOR</b> poderá confiscar, reter, revistar ou acessar o conteúdo do aparelho celular pessoal do <b>EMPREGADO</b>. A empresa respeita integralmente o direito constitucional à intimidade e à privacidade, não realizando qualquer monitoramento de dados ou aplicativos de cunho pessoal instalados em dispositivos particulares.</p>
<br>
<p><b>4. DIREITO À DESCONEXÃO</b></p>
<p><b>4.1.</b> Comunicações enviadas pela empresa ou por clientes fora da jornada contratual de trabalho não exigem resposta imediata por parte do <b>EMPREGADO</b>, garantindo-se o direito ao descanso (exceto em casos de sobreaviso formalmente combinados).</p>
<br>
<p><b>5. PROTEÇÃO DE DADOS (LGPD)</b></p>
<p><b>5.1.</b> O <b>EMPREGADO(A)</b> obriga-se a tratar os dados pessoais a que tiver acesso em estrita observância à Lei nº 13.709/2018 (Lei Geral de Proteção de Dados), utilizando-os apenas para as finalidades determinadas pelo <b>EMPREGADOR</b> e adotando medidas para evitar acessos não autorizados ou vazamentos.</p>
<br>
<p><b>6. CONDUTA PROFISSIONAL E PENALIDADES</b></p>
<p><b>6.1.</b> O cumprimento das regras descritas neste termo é obrigatório. O seu descumprimento, especialmente quanto ao uso excessivo do celular, delegação não autorizada de informações da empresa ou quebra de sigilo, é considerado ato de indisciplina e insubordinação.</p>
<p><b>6.2.</b> Constituem infrações graves sujeitas a medidas disciplinares:</p>
<ul style="list-style-type: lower-alpha; padding-left: 25px;">
  <li>Utilizar o celular pessoal de forma excessiva e injustificada durante o expediente;</li>
  <li>Compartilhar externamente informações confidenciais de clientes, fornecedores ou da própria empresa;</li>
  <li>Apagar o histórico de conversas em aplicativos de mensagens corporativos sem autorização;</li>
  <li>Utilizar ferramentas de trabalho para assédio, disseminação de correntes, conteúdo inadequado ou condutas ofensivas;</li>
  <li>Expor a marca da empresa ou de clientes de maneira negativa ou desrespeitosa;</li>
  <li>Realizar qualquer ação nas plataformas digitais da empresa sem autorização.</li>
</ul>
<p><b>6.3. Aplicação das Penalidades:</b> As infrações a esta política sujeitarão o infrator às penalidades previstas na legislação trabalhista (Art. 482 da CLT), aplicadas de forma progressiva ou imediata, dependendo da gravidade do ato, sendo elas:</p>
<p>I. Advertência verbal;</p>
<p>II. Advertência escrita;</p>
<p>III. Suspensão não remunerada;</p>
<p>IV. Demissão por justa causa.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>___________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <p>EMPREGADOR</p>
  <br><br>
  <p>___________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>EMPREGADO(A)</p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-imagem',
    name: 'Autorização de Uso de Imagem e Voz',
    subgrupo: 'DP & RH',
    content: `<div style="text-align: center;"><h2><b>TERMO DE CONSENTIMENTO E AUTORIZAÇÃO DE USO DE IMAGEM, VOZ E NOME</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Pelo presente instrumento, o(a) <b>EMPREGADO(A)</b> autoriza o <b>EMPREGADOR</b>, de forma voluntária e gratuita, a utilizar sua imagem, voz e nome para fins exclusivamente institucionais, de publicidade e de comunicação interna ou externa.</p>
<br>
<p><b>1. OBJETO E FINALIDADE:</b></p>
<p>A presente autorização destina-se ao uso da imagem (estática ou em movimento), voz e nome do(a) <b>EMPREGADO(A)</b> para fins de publicidade e divulgação de cultura corporativa, podendo ser utilizada em:</p>
<ul style="list-style-type: disc; padding-left: 25px;">
  <li><b>Mídias Digitais:</b> Redes sociais (Instagram, LinkedIn, Facebook, YouTube, TikTok, entre outras), site institucional, blogs e anúncios digitais.</li>
  <li><b>Comunicação Interna:</b> Materiais de treinamento, murais físicos ou digitais e comunicados.</li>
  <li><b>Materiais Impressos e Publicidade:</b> Folders, catálogos, outdoors, apresentações comerciais, revistas e jornais.</li>
</ul>
<br>
<p><b>2. ABRANGÊNCIA E TERRITÓRIO:</b></p>
<p>A autorização é concedida em caráter global (Brasil e exterior), permitindo que o <b>EMPREGADOR</b> realize edições, cortes, fixações e reproduções do material, desde que preservada a honra e a imagem pública do(a) <b>EMPREGADO(A)</b>.</p>
<br>
<p><b>3. GRATUIDADE:</b></p>
<p>O(A) <b>EMPREGADO(A)</b> declara que a presente autorização é concedida de forma totalmente gratuita. O uso da imagem, voz e nome não gera direito a qualquer tipo de remuneração extra, "cachê", indenização ou participação financeira.</p>

[QUEBRA]

<p><b>4. PRAZO E REVOGAÇÃO (DIREITO AO ARREPENDIMENTO):</b></p>
<p>A autorização é válida por prazo indeterminado, permanecendo vigente inclusive após o término do contrato de trabalho, observadas as seguintes condições:</p>
<ul style="list-style-type: disc; padding-left: 25px;">
  <li><b>Direito de Revogação:</b> O(A) <b>EMPREGADO(A)</b> poderá, a qualquer tempo, solicitar a revogação desta autorização mediante comunicação escrita ao setor de Recursos Humanos da empresa.</li>
  <li><b>Efeito Não Retroativo:</b> Em caso de revogação, o <b>EMPREGADOR</b> interromperá a utilização do material em novas produções ou campanhas. Todavia, a empresa não possui obrigação de remover, apagar ou recolher materiais, publicações, vídeos ou impressos já executados, publicados ou distribuídos anteriormente à data da revogação.</li>
</ul>
<br>
<p><b>5. PROTEÇÃO DE DADOS (LGPD):</b></p>
<p>O <b>EMPREGADOR</b>, na qualidade de Controlador de Dados, compromete-se a tratar os dados biovocais e de imagem do(a) <b>EMPREGADO(A)</b> em estrita observância à LGPD, garantindo que o tratamento seja limitado às finalidades institucionais aqui descritas, adotando medidas de segurança para proteger tais informações.</p>
<br>
<p><b>6. DISPOSIÇÕES GERAIS:</b></p>
<p>O(A) <b>EMPREGADO(A)</b> declara ter lido e compreendido todos os termos deste documento, estando de pleno acordo com a utilização de sua imagem e voz conforme aqui estipulado.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>_____________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <br><br>
  <p>_____________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-equipamentos',
    name: 'Termo de Responsabilidade - Equipamentos',
    subgrupo: 'DP & RH',
    content: `<div style="text-align: center;"><h2><b>TERMO DE RESPONSABILIDADE PELA GUARDA E USO DE EQUIPAMENTOS E MATERIAIS</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, portador(a) do CPF nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Através deste documento, o(a) <b>EMPREGADO(A)</b> acima qualificado(a) declara que recebeu da empresa, a título de empréstimo para uso exclusivo em suas atividades profissionais, os seguintes equipamentos/materiais:</p>
<br>
<p><b>Relação de Itens Entregues:</b></p>
<p>1. [ITEM 1]</p>
<p>2. [ITEM 2]</p>
<br>
<p><b>Condições de Uso e Responsabilidade:</b></p>
<p><b>1.</b> O(A) <b>EMPREGADO(A)</b> compromete-se a zelar pela conservação e guarda dos equipamentos/materiais recebidos, utilizando-os única e exclusivamente para o desempenho de suas funções profissionais.</p>
<p><b>2.</b> Em caso de dano, avaria, extravio ou perda decorrente de dolo, culpa (negligência, imprudência ou imperícia) ou mau uso, o(a) <b>EMPREGADO(A)</b> autoriza expressamente, nos termos do art. 462, §1º da CLT, o desconto do valor correspondente ao reparo ou reposição em seu salário ou em suas verbas rescisórias.</p>
<p><b>3.</b> Ao término do contrato de trabalho, ou a qualquer momento em que for solicitado, o(a) <b>EMPREGADO(A)</b> obriga-se a devolver os itens em estado de conservação compatível com o desgaste natural do uso regular, sob pena de desconto do valor correspondente nas verbas rescisórias.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br>
  <p>___________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>Assinatura do(a) Empregado(a)</p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-monitoramento',
    name: 'Termo de Consentimento - Monitoramento por Câmeras',
    subgrupo: 'DP & RH',
    content: `<div style="text-align: center;"><h2><b>TERMO DE CIÊNCIA E CONSENTIMENTO DE MONITORAMENTO POR VÍDEO E ÁUDIO</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, pessoa jurídica de direito privado, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Pelo presente instrumento, as partes acima qualificadas firmam o presente termo, mediante as seguintes cláusulas:</p>
<br>
<p><b>1. DA CIÊNCIA DO MONITORAMENTO</b></p>
<p>O(A) <b>EMPREGADO(A)</b> declara ter plena ciência e expressa concordância de que as dependências físicas do <b>EMPREGADOR</b> são monitoradas por sistema interno de câmeras de segurança, as quais realizam a captação contínua de imagem e, em determinados equipamentos, também a captação de áudio/voz.</p>
<br>
<p><b>2. DA FINALIDADE</b></p>
<p>O monitoramento tem como finalidade exclusiva garantir a segurança patrimonial da empresa, a integridade física dos colaboradores, clientes e visitantes, bem como auxiliar na prevenção de acidentes de trabalho, segurança operacional e na apuração de eventuais incidentes ou irregularidades.</p>
<br>
<p><b>3. DO RESPEITO À INTIMIDADE E PRIVACIDADE</b></p>
<p>O <b>EMPREGADOR</b> garante que o sistema de monitoramento está instalado apenas em áreas comuns, de circulação, operacionais e de atendimento. É terminantemente garantida a não instalação de câmeras em locais que exponham a intimidade do(a) <b>EMPREGADO(A)</b>, tais como banheiros, vestiários e ambientes similares.</p>

[QUEBRA]

<p><b>4. DO USO E PROTEÇÃO DE DADOS (LGPD)</b></p>
<p><b>4.1.</b> As imagens e áudios capturados constituem dados pessoais e serão tratados em estrita observância à Lei Geral de Proteção de Dados (Lei nº 13.709/2018), com armazenamento seguro e acesso restrito exclusivamente às pessoas previamente autorizadas pelo <b>EMPREGADOR</b>.</p>
<p><b>4.2.</b> O material capturado não será divulgado publicamente nem compartilhado com terceiros, salvo mediante requisição de autoridades policiais, órgãos fiscalizadores ou judiciais, ou para o exercício regular de direitos da empresa em processos trabalhistas, cíveis ou administrativos.</p>
<br>
<p><b>5. DAS DISPOSIÇÕES FINAIS</b></p>
<p>O(A) <b>EMPREGADO(A)</b> reconhece que a captação de imagens e áudios no ambiente de trabalho, nos termos aqui expostos, não configura violação de sua privacidade, intimidade ou direitos de personalidade, tratando-se de medida legítima e preventiva adotada pelo <b>EMPREGADOR</b>.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-veiculo',
    name: 'Termo de Uso de Veículo Corporativo',
    subgrupo: 'DP & RH',
    content: `<div style="text-align: center;"><h2><b>TERMO DE RESPONSABILIDADE E CONDIÇÕES DE USO DE VEÍCULO CORPORATIVO</b></h2></div>
<br>
<p><b>EMPREGADORA:</b> <b>[NOME DA EMPRESA]</b>, CNPJ: <b>[CNPJ DA EMPRESA]</b></p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, CPF: <b>[CPF DO COLABORADOR]</b></p>
<p><b>VEÍCULO:</b> <b>[VEÍCULO]</b> <b>PLACA:</b> <b>[PLACA DO VEÍCULO]</b> <b>RENAVAM:</b> <b>[RENAVAM DO VEÍCULO]</b></p>
<br>
<p>Pelo presente termo, o(a) <b>EMPREGADO(A)</b> acima qualificado(a) declara receber da <b>EMPREGADORA</b> o veículo acima descrito, assumindo o compromisso de utilizá-lo de acordo com as seguintes cláusulas:</p>
<br>
<p><b>1. DO USO EXCLUSIVO PARA O TRABALHO</b></p>
<p>O veículo descrito é uma ferramenta de trabalho e deve ser utilizado exclusiva e estritamente para o exercício das atividades profissionais. Fica terminantemente proibido o uso do veículo para fins particulares, ceder a direção a terceiros sob qualquer pretexto, bem como oferecer carona a terceiros sem autorização expressa do empregador, sob pena de sanções disciplinares.</p>
<br>
<p><b>2. DA CONSERVAÇÃO E CONDUTA NO TRÂNSITO</b></p>
<p>O(a) <b>EMPREGADO(A)</b> compromete-se a zelar pela guarda, conservação e limpeza do veículo. Ao conduzir o veículo, especialmente em vias não pavimentadas ou de tráfego severo, o(a) <b>EMPREGADO(A)</b> deve observar estritamente as regras de trânsito, adequando a velocidade às condições da via para evitar desgastes prematuros, avarias e acidentes e caso ocorra algum fato que venha a gerar qualquer avaria ao veículo ou aos integrantes dele, é obrigação do empregado comunicar imediatamente o empregador e registrar o boletim de ocorrência caso se faça necessário.</p>

[QUEBRA]

<p><b>3. DAS MULTAS DE TRÂNSITO</b></p>
<p>As infrações de trânsito cometidas por ato exclusivo do motorista (ex: excesso de velocidade, uso de celular) serão de sua inteira responsabilidade, inclusive pontuação na CNH e pagamento da multa. O empregador fica autorizadas a descontar o valor da multa do salário, comprometendo-se a restituí-lo caso o auto de infração seja anulado pelo órgão competente. Infrações decorrentes de fato do veículo (ex: pneu careca, farol queimado, falta de manutenção) serão de responsabilidade do(a) <b>EMPREGADO(A)</b> apenas se este falhar em registrar a irregularidade no Checklist de Vistoria Diária antes do início da jornada.</p>
<br>
<p><b>4. DOS DANOS, AVARIAS E AUTORIZAÇÃO DE DESCONTO</b></p>
<p>Nos termos do § 1º do art. 462 da CLT, em caso de danos materiais, avarias ou sinistros decorrentes de dolo (intenção) ou culpa (imprudência, negligência, imperícia, desrespeito à legislação de trânsito), o(a) <b>EMPREGADO(A)</b> autoriza o desconto salarial ou em rescisão dos valores correspondentes ao conserto ou franquia. O desconto fica condicionado à certificação do dano mediante multa, boletim de ocorrência, laudo técnico ou confissão do motorista.</p>
<br>
<p><b>5. DA VISTORIA DIÁRIA (CHECK-IN E CHECK-OUT)</b></p>
<p>A cada retirada e devolução do veículo, o(a) <b>EMPREGADO(A)</b> obriga-se a realizar vistoria conjunta, atestando o estado do veículo no documento "Checklist de Vistoria Diária". A assinatura no momento da retirada (Check-in) atesta que o veículo foi recebido nas condições lá descritas. O surgimento de novas avarias no momento da devolução (Check-out), não registradas anteriormente, implicará na presunção de que o dano ocorreu durante o uso sob responsabilidade do(a) <b>EMPREGADO(A)</b>.</p>
<br>
<p>Por ser a expressão da verdade e por estar de pleno acordo, o(a) <b>EMPREGADO(A)</b> assina o presente termo em 2 (duas) vias de igual teor.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>EMPREGADO(A)</p>
  <br><br>
  <p>________________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <p>EMPREGADORA</p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-epi',
    name: 'Termo de Responsabilidade e Recebimento de EPI',
    subgrupo: 'DP & RH',
    content: `<div style="text-align: center;"><h2><b>TERMO DE RESPONSABILIDADE E RECEBIMENTO DE EQUIPAMENTO DE PROTEÇÃO INDIVIDUAL (EPI)</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, inscrito(a) no CPF sob o nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Pelo presente instrumento, o(a) <b>EMPREGADO(A)</b> acima qualificado(a) declara haver recebido gratuitamente da <b>EMPREGADORA</b> os Equipamentos de Proteção Individual (EPI) abaixo relacionados, adequados aos riscos de sua atividade e em perfeito estado de conservação e funcionamento.</p>
<br>
<p><b>Relação de EPIs Entregues:</b></p>
<p>1. __________________________________________________________________</p>
<p>2. __________________________________________________________________</p>
<p>3. __________________________________________________________________</p>
<p>4. __________________________________________________________________</p>
<p>5. __________________________________________________________________</p>
<br>
<p><b>DAS OBRIGAÇÕES DO(A) EMPREGADO(A)</b></p>
<p>Nos termos do artigo 158 da Consolidação das Leis do Trabalho (CLT) e da Norma Regulamentadora nº 06 (NR-6) do Ministério do Trabalho e Emprego, o(a) <b>EMPREGADO(A)</b> compromete-se expressamente a:</p>
<p><b>1. Uso Obrigatório:</b> Utilizar os EPIs fornecidos de forma OBRIGATÓRIA e contínua durante toda a execução de suas atividades profissionais e permanência nas áreas de risco, conforme as orientações transmitidas pela empresa e pelo Técnico de Segurança do Trabalho.</p>
<p><b>2. Finalidade:</b> Utilizar os equipamentos única e exclusivamente para a finalidade a que se destinam (proteção no ambiente de trabalho).</p>
<p><b>3. Guarda e Conservação:</b> Responsabilizar-se integralmente pela guarda, conservação e correta higienização dos EPIs sob sua posse.</p>

[QUEBRA]

<p><b>4. Comunicação de Danos ou Extravio:</b> Comunicar imediatamente à chefia direta ou ao setor de Segurança do Trabalho qualquer alteração, dano, desgaste ou extravio que torne o EPI impróprio para uso, solicitando sua substituição.</p>
<p><b>5. Devolução:</b> Devolver os equipamentos ao término do contrato de trabalho ou quando da sua substituição, sob pena de desconto em rescisão (conforme art. 462, § 1º, da CLT).</p>
<br>
<p><b>DAS PENALIDADES (MEDIDAS DISCIPLINARES)</b></p>
<p>O(A) <b>EMPREGADO(A)</b> declara estar ciente de que a recusa injustificada ao uso dos EPIs fornecidos, o seu uso inadequado, ou a inobservância das normas de segurança constitui ato faltoso (Art. 158, Parágrafo Único, alínea 'b', da CLT), sujeitando o infrator a sanções disciplinares, que incluem:</p>
<ul style="list-style-type: disc; padding-left: 25px;">
  <li>Advertência verbal;</li>
  <li>Advertência escrita;</li>
  <li>Suspensão disciplinar (sem remuneração);</li>
  <li>Rescisão do contrato de trabalho por <b>Justa Causa</b> (Art. 482, alínea 'h', da CLT - ato de indisciplina ou insubordinação), em caso de reincidência ou gravidade da conduta.</li>
</ul>
<br>
<p>Por ser a expressão da verdade e por estar de pleno acordo com as obrigações de segurança, o(a) <b>EMPREGADO(A)</b> assina o presente termo em 2 (duas) vias de igual teor.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br><br>
  <p>___________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>Assinatura do(a) Empregado(a)</p>
  <br><br>
  <p>___________________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <p>Assinatura da Empregadora</p>
</div>`,
    lastUsed: Date.now()
  },
  {
    id: 'tpl-contrato-contabil',
    name: 'Contrato de Prestação de Serviços Contábeis',
    subgrupo: 'GERAL',
    content: `<div style="text-align: center;"><h2><b>CONTRATO DE PRESTAÇÃO DE SERVIÇOS CONTÁBEIS</b></h2></div>
<br>
<p><b>CONTRATADA:</b> <b>SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL</b>, inscrita no CNPJ sob nº 27.205.802/0001-94, com sede à Rua Belmiro Cândido de Abreu, Qd. 15, Lt. 02, Bairro Vitória Régia, Rio Verde/GO, neste ato representada por sua sócia-administradora Nayara Ponciano Rocha, contadora, CRC-GO nº 025404.</p>
<p><b>CONTRATANTE:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ sob nº <b>[CNPJ DA EMPRESA]</b>, regime tributário <b>[REGIME TRIBUTÁRIO]</b>, com sede à <b>[ENDEREÇO DA EMPRESA]</b>, nº <b>[NÚMERO DA EMPRESA]</b>, complemento <b>[COMPLEMENTO DA EMPRESA]</b>, bairro <b>[BAIRRO DA EMPRESA]</b>, cidade <b>[CIDADE DA EMPRESA]</b>, UF <b>[UF DA EMPRESA]</b>, CEP <b>[CEP DA EMPRESA]</b>, neste ato representada por seu representante legal <b>[NOME DO REPRESENTANTE]</b>, CPF <b>[CPF DO REPRESENTANTE]</b>.</p>
<p><b>FIADOR(A) E PRINCIPAL PAGADOR(A):</b> <b>[NOME DO FIADOR]</b>, nacionalidade <b>[NACIONALIDADE DO FIADOR]</b>, estado civil <b>[ESTADO CIVIL DO FIADOR]</b>, regime de bens <b>[REGIME DE BENS DO FIADOR]</b>, data de nascimento <b>[DATA DE NASCIMENTO DO FIADOR]</b>, profissão <b>[PROFISSÃO DO FIADOR]</b>, CPF <b>[CPF DO FIADOR]</b>, documento de identidade <b>[RG DO FIADOR]</b>, residente e domiciliado(a) à <b>[ENDEREÇO DO FIADOR]</b>, nº <b>[NÚMERO DO FIADOR]</b>, complemento <b>[COMPLEMENTO DO FIADOR]</b>, bairro <b>[BAIRRO DO FIADOR]</b>, cidade <b>[CIDADE DO FIADOR]</b>, UF <b>[UF DO FIADOR]</b>, CEP <b>[CEP DO FIADOR]</b>, e seu cônjuge/companheiro(a) <b>[NOME DO CÔNJUGE DO FIADOR]</b>, CPF <b>[CPF DO CÔNJUGE DO FIADOR]</b>, que comparece para prestar a outorga prevista no art. 1.647, III, do Código Civil.</p>
<br>
<p>As partes acima qualificadas celebram o presente contrato de prestação de serviços contábeis, nos termos da Resolução CFC nº 1.590/2020, que se regerá pelas cláusulas e condições a seguir.</p>
<br>
<p><b>1. - DO OBJETO</b></p>
<p>O objeto do presente consiste na prestação, pela CONTRATADA à CONTRATANTE, dos seguintes serviços profissionais, de acordo com o regime tributário indicado no preâmbulo:</p>
<p><b>1.1 - ÁREA CONTÁBIL:</b></p>
<p><b>1.1.1</b> - Escrituração contábil das operações da CONTRATANTE, com base na documentação por ela fornecida, em conformidade com as Normas Brasileiras de Contabilidade;</p>
<p><b>1.1.2</b> - Elaboração de balancetes e das demonstrações contábeis anuais (Balanço Patrimonial e Demonstração do Resultado do Exercício, e demais exigidas para o porte e regime da CONTRATANTE);</p>
<p><b>1.1.3</b> - Elaboração e transmissão da Escrituração Contábil Digital (ECD), quando exigida.</p>
<p><b>1.2 - ÁREA FISCAL:</b></p>
<p><b>1.2.1</b> - Orientação e controle da aplicação dos dispositivos legais vigentes, sejam federais, estaduais ou municipais;</p>
<p><b>1.2.2</b> - Escrituração fiscal e apuração dos tributos incidentes sobre as operações da CONTRATANTE (tais como ICMS, ISS, IPI, PIS/COFINS ou Simples Nacional, conforme o regime), com elaboração das guias de recolhimento;</p>
<p><b>1.2.3</b> - Elaboração e transmissão das obrigações acessórias fiscais rotineiras (tais como EFD ICMS/IPI, EFD-Contribuições, PGDAS-D, DEFIS e DCTFWeb, conforme o regime), nos prazos legais;</p>
<p><b>1.2.4</b> - Atendimento às intimações e notificações de rotina relativas aos serviços executados pela CONTRATADA durante a vigência deste contrato.</p>
<p><b>1.3 - ÁREA DO IMPOSTO DE RENDA PESSOA JURÍDICA:</b></p>
<p><b>1.3.1</b> - Orientação e controle de aplicação dos dispositivos legais vigentes;</p>
<p><b>1.3.2</b> - Apuração do IRPJ e da CSLL, quando aplicável, e elaboração e transmissão da Escrituração Contábil Fiscal (ECF) e documentos correlatos.</p>
<p><b>1.4 - ÁREA TRABALHISTA E PREVIDENCIÁRIA:</b></p>
<p><b>1.4.1</b> - Orientação e controle da aplicação dos preceitos da Consolidação das Leis do Trabalho e da legislação previdenciária, do PIS e do FGTS aplicáveis às relações de emprego mantidas pela CONTRATANTE;</p>
<p><b>1.4.2</b> - Manutenção dos registros de empregados e envio dos eventos ao eSocial;</p>
<p><b>1.4.3</b> - Elaboração da folha de pagamento dos empregados e do pró-labore, bem como das guias de recolhimento dos encargos sociais (DCTFWeb, FGTS Digital e EFD-Reinf, quando aplicável);</p>
<p><b>1.4.4</b> - Elaboração de cálculos de férias, 13º salário e rescisões contratuais, com base nas informações fornecidas pela CONTRATANTE.</p>
<p><b>1.5</b> - Não estão incluídos no objeto deste contrato, salvo contratação específica nos termos do item 4.4: auditoria, perícia, planejamento tributário, defesa em autos de infração e processos administrativos ou judiciais, recuperação de créditos tributários, retificação de períodos anteriores ao início deste contrato e serviços relativos a exercícios em que a CONTRATADA não foi responsável pela contabilidade.</p>

[QUEBRA]

<p><b>2. - DAS CONDIÇÕES DE EXECUÇÃO DOS SERVIÇOS</b></p>
<p>Os serviços serão executados nas dependências da CONTRATADA, presencialmente ou por meio eletrônico, em obediência às seguintes condições:</p>
<p><b>2.1.</b> - A documentação indispensável para o desempenho dos serviços será fornecida pela CONTRATANTE, compreendendo, entre outros:</p>
<p><b>2.1.1</b> - Notas fiscais de compra (entradas) e de venda (saídas), bem como comunicação de eventual cancelamento;</p>
<p><b>2.1.2</b> - Controle de frequência dos empregados e comunicação de férias, admissões, rescisões, afastamentos e alterações salariais;</p>
<p><b>2.1.3</b> - Extratos de todas as contas bancárias, aplicações financeiras e meios de pagamento (maquininhas, carteiras digitais e similares), bem como contratos de empréstimos, financiamentos e consórcios;</p>
<p><b>2.1.4</b> - Inventário anual de estoques, relação de bens do ativo imobilizado e demais informações necessárias ao encerramento do exercício.</p>
<p><b>2.2.</b> - A documentação deverá ser enviada pela CONTRATANTE de forma completa e em boa ordem nos seguintes prazos:</p>
<p><b>2.2.1</b> - Até 7 (sete) dias após o encerramento do mês, os documentos relacionados nos itens 2.1.1 e 2.1.3;</p>
<p><b>2.2.2</b> - Até o último dia do mês de referência, os documentos do item 2.1.2, para elaboração da folha de pagamento;</p>
<p><b>2.2.3</b> - No mínimo 72 (setenta e duas) horas antes, a comunicação para elaboração de aviso de férias e de rescisão contratual de empregados; e no mínimo 1 (um) dia útil antes do início das atividades, a comunicação de admissão de empregado;</p>
<p><b>2.2.4</b> - Até 31 de janeiro de cada ano, os documentos do item 2.1.4 referentes ao exercício anterior.</p>
<p><b>2.2.5</b> - Os prazos de entrega da CONTRATADA previstos no item 2.3 contam-se a partir do recebimento completo da documentação. A entrega fora dos prazos acima isenta a CONTRATADA de responsabilidade por atrasos, multas e encargos dela decorrentes, sem prejuízo de esforço razoável para cumprir os prazos legais.</p>
<p><b>2.3</b> - A CONTRATADA compromete-se a cumprir os prazos estabelecidos na legislação quanto aos serviços contratados, especificando-se, porém, os prazos abaixo:</p>
<p><b>2.3.1</b> - A entrega das guias de recolhimento de tributos e encargos trabalhistas à CONTRATANTE se fará com antecedência mínima de 2 (dois) dias do vencimento da obrigação;</p>
<p><b>2.3.2</b> - A entrega da folha de pagamento, recibos de pagamento salarial, de férias e demais documentos trabalhistas far-se-á até 72 (setenta e duas) horas após o recebimento dos documentos mencionados no item 2.1.2;</p>
<p><b>2.3.3</b> - A entrega de balancete se fará até o dia 20 (vinte) do 2º (segundo) mês subsequente ao período a que se referir;</p>
<p><b>2.3.4</b> - A entrega do balanço anual se fará até 30 (trinta) dias após a entrega de todos os dados necessários à sua elaboração, principalmente o inventário anual de estoques, cuja execução é de responsabilidade da CONTRATANTE.</p>
<p><b>2.4</b> - O pagamento dos tributos, encargos, salários e demais obrigações financeiras é de exclusiva responsabilidade da CONTRATANTE, cabendo à CONTRATADA apenas a elaboração e disponibilização das respectivas guias.</p>
<p><b>2.5</b> - A CONTRATANTE é responsável pela contratação, guarda e renovação do seu certificado digital, bem como pela manutenção das procurações eletrônicas outorgadas à CONTRATADA (e-CAC, eSocial, Receita Estadual, Prefeitura e demais portais). A CONTRATADA não responde por atrasos ou impedimentos decorrentes de certificado vencido, procuração revogada ou expirada, ou senhas não fornecidas.</p>
<br>
<p><b>3. - DOS DEVERES E DA RESPONSABILIDADE DA CONTRATADA</b></p>
<p><b>3.1</b> - A CONTRATADA desempenhará os serviços enumerados na cláusula 1 com zelo, diligência e honestidade, observada a legislação vigente, resguardando os interesses da CONTRATANTE, sem prejuízo da dignidade e independência profissionais, sujeitando-se às Normas Brasileiras de Contabilidade e ao Código de Ética Profissional do Contador (NBC PG 01), do Conselho Federal de Contabilidade.</p>
<p><b>3.2</b> - A CONTRATADA responsabiliza-se pelos prepostos que atuarem nos serviços ora contratados, indenizando a CONTRATANTE nos casos de culpa ou dolo devidamente comprovados.</p>
<p><b>3.2.1</b> - A CONTRATADA responderá pelas multas fiscais decorrentes comprovadamente de erro ou atraso que lhe seja exclusivamente imputável na execução dos serviços contratados, excetuados os casos de força maior ou caso fortuito, após esgotados os procedimentos de defesa administrativa, observado o disposto nos itens 2.2.5 e 3.5.</p>
<p><b>3.2.1.1</b> - Não se incluem na responsabilidade da CONTRATADA o valor principal dos tributos, os juros e a correção monetária de qualquer natureza, por não se tratarem de penalidade pela mora, mas de recomposição e remuneração do valor não recolhido, de responsabilidade da CONTRATANTE.</p>
<p><b>3.2.2</b> - A responsabilidade total da CONTRATADA por quaisquer danos decorrentes deste contrato, a qualquer título, fica limitada ao valor dos honorários efetivamente pagos pela CONTRATANTE nos 12 (doze) meses anteriores ao fato que originou o dano, ressalvados os casos de dolo.</p>
<p><b>3.2.3</b> - Em nenhuma hipótese a CONTRATADA responderá por lucros cessantes, perda de oportunidade, danos indiretos ou consequenciais.</p>

[QUEBRA]

<p><b>3.2.4</b> - A CONTRATANTE deverá comunicar à CONTRATADA, por escrito, qualquer intimação, notificação ou auto de infração em até 5 (cinco) dias úteis do seu recebimento, a fim de possibilitar a defesa administrativa. A falta de comunicação tempestiva exclui a responsabilidade da CONTRATADA pelo respectivo débito.</p>
<p><b>3.3</b> - A CONTRATADA fornecerá à CONTRATANTE, dentro do horário normal de expediente, as informações relativas ao andamento dos serviços ora contratados.</p>
<p><b>3.4</b> - A CONTRATADA responsabiliza-se pelos documentos a ela entregues pela CONTRATANTE enquanto permanecerem sob sua guarda para a consecução dos serviços pactuados, respondendo por seu mau uso, perda, extravio ou inutilização decorrentes de ação ou omissão sua ou de seus prepostos, salvo comprovado caso fortuito ou força maior.</p>
<p><b>3.5</b> - A CONTRATADA não assume responsabilidade pelas consequências de informações, declarações ou documentação inidôneas, incorretas, incompletas ou intempestivas que lhe forem apresentadas, nem por omissões próprias da CONTRATANTE ou decorrentes do descumprimento das orientações prestadas, cabendo à CONTRATANTE responder integralmente pela veracidade e integridade das informações fornecidas.</p>
<p><b>3.6 – DOS ATOS ILÍCITOS PRATICADOS PELA CONTRATANTE</b></p>
<p>A CONTRATADA não será responsável por atos, operações ou condutas ilícitas praticadas pela CONTRATANTE, seus sócios, administradores, empregados, representantes ou terceiros a ela vinculados, incluindo, sem limitação, sonegação fiscal, omissão de receitas, utilização de documentos falsos ou inidôneos, operações simuladas, fraude, lavagem de dinheiro, ocultação de patrimônio ou quaisquer outros ilícitos civis, tributários, administrativos ou penais, quando realizados sem o conhecimento, participação ou anuência da CONTRATADA.</p>
<p><b>3.6.1</b> – A atuação da CONTRATADA será realizada com base nos documentos, informações, registros e declarações disponibilizados pela CONTRATANTE, não lhe cabendo exercer atividade de investigação policial ou fiscalização presencial das operações internas da empresa, sem prejuízo dos deveres de diligência, comunicação e demais obrigações legais e profissionais aplicáveis ao profissional da contabilidade.</p>
<p><b>3.6.2</b> – A CONTRATANTE assume integral responsabilidade pela autenticidade, legalidade, origem e veracidade das operações, documentos e informações apresentados à CONTRATADA, inclusive pelas operações realizadas e não informadas à contabilidade.</p>
<p><b>3.6.3</b> – A constatação pela CONTRATADA de indícios de fraude, sonegação, lavagem de dinheiro, utilização de documentos inidôneos ou qualquer outra prática potencialmente ilícita autorizará a CONTRATADA a recusar o registro ou a execução do ato solicitado e, quando cabível, rescindir imediatamente o presente contrato, nos termos do item 5.4, sem prejuízo do cumprimento das obrigações legais e profissionais de comunicação às autoridades ou órgãos competentes, observada a cláusula 10.</p>
<br>
<p><b>4. - DOS DEVERES DA CONTRATANTE, HONORÁRIOS E REEMBOLSOS</b></p>
<p><b>4.1.</b> - Obriga-se a CONTRATANTE a fornecer à CONTRATADA todos os dados, documentos e informações necessários ao bom desempenho dos serviços ora contratados, em tempo hábil, nenhuma responsabilidade cabendo à CONTRATADA caso recebidos intempestivamente.</p>
<p><b>4.1.1</b> - A CONTRATANTE assinará, ao final de cada exercício e sempre que solicitado para o encerramento das demonstrações contábeis, a Carta de Responsabilidade da Administração, conforme modelo do Anexo I, declarando que as informações e documentos fornecidos são completos, verdadeiros e refletem a totalidade das operações da empresa.</p>
<p><b>4.1.2</b> - A recusa injustificada em assinar a Carta de Responsabilidade autoriza a CONTRATADA a não emitir as demonstrações contábeis do exercício e a rescindir o contrato sem incidência de multa, nos termos do item 5.4.</p>
<p><b>4.2.</b> - Para a execução dos serviços constantes da cláusula 1, a CONTRATANTE pagará à CONTRATADA honorários mensais de R$ <b>[VALOR DOS HONORÁRIOS]</b> (<b>[VALOR POR EXTENSO]</b>), com vencimento até o dia 10 (dez) de cada mês, podendo a cobrança ser feita por boleto, PIX ou duplicata de serviços, mantida em carteira ou via cobrança bancária.</p>

[QUEBRA]

<p><b>4.2.1</b> - Além da parcela acima avençada, a CONTRATANTE pagará à CONTRATADA uma parcela adicional anual, correspondente ao valor de uma mensalidade, para atendimento ao acréscimo de serviços e encargos próprios do período final do exercício, tais como o encerramento das demonstrações contábeis anuais, ECD, ECF ou DEFIS, informes de rendimentos, folhas de pagamento do 13º (décimo terceiro) salário e demais obrigações acessórias anuais.</p>
<p><b>4.2.1.1</b> - A parcela adicional mencionada no item anterior será paga em duas parcelas iguais, vencíveis nos dias 20 de novembro e 20 de dezembro de cada exercício, e seu valor será equivalente ao dos honorários vigentes no mês de pagamento.</p>
<p><b>4.2.1.2</b> - Mesmo no caso de início do contrato em qualquer mês do exercício, a parcela adicional será devida integralmente.</p>
<p><b>4.2.1.3</b> - Caso o presente envolva a recuperação de serviços não realizados (atrasados), a parcela adicional será integralmente devida desde o primeiro mês de atualização.</p>
<p><b>4.2.2</b> - Os honorários pagos após a data avençada no item 4.2 acarretarão à CONTRATANTE o acréscimo de multa de 2% (dois por cento), juros moratórios de 1% (um por cento) ao mês ou fração e correção monetária pela variação do IPCA/IBGE.</p>
<p><b>4.2.3 – DA INADIMPLÊNCIA, SUSPENSÃO DOS SERVIÇOS E RESCISÃO</b></p>
<p><b>4.2.3.1</b> – O atraso no pagamento de qualquer parcela de honorários por prazo igual ou superior a 10 (dez) dias corridos, contados do vencimento, autoriza a CONTRATADA a suspender a execução dos serviços contratados, mediante comunicação escrita à CONTRATANTE, enquanto permanecer a inadimplência.</p>
<p><b>4.2.3.2</b> – Permanecendo qualquer parcela de honorários em aberto por 60 (sessenta) dias corridos, contados de seu vencimento, o contrato será considerado rescindido por inadimplemento imputável à CONTRATANTE, independentemente do aviso prévio de 90 (noventa) dias, devendo a CONTRATADA comunicar por escrito o encerramento.</p>
<p><b>4.2.3.3</b> – Nessa hipótese, serão devidos os honorários vencidos e não pagos, os encargos previstos no item 4.2.2 e multa compensatória equivalente a 3 (três) mensalidades dos honorários vigentes na data da rescisão. Essa multa não será cumulada com as multas previstas nos itens 5.1.1 e 5.3.1 pelo mesmo fato.</p>
<p><b>4.2.3.4</b> – A CONTRATADA não responderá por multas, juros ou prejuízos decorrentes da suspensão regularmente comunicada e causada pela inadimplência da CONTRATANTE, ressalvadas suas próprias falhas e as responsabilidades legais e profissionais aplicáveis. A suspensão não autoriza a retenção de documentos da CONTRATANTE.</p>
<p><b>4.2.3.5</b> – Em caso de cobrança, a CONTRATANTE arcará com as despesas dela decorrentes, inclusive honorários advocatícios de 10% (dez por cento) sobre o débito na cobrança extrajudicial, sem prejuízo das custas e dos honorários fixados em juízo.</p>
<p><b>4.2.4</b> – Os honorários serão reajustados anual e automaticamente, a cada 12 (doze) meses contados do início deste contrato, pela variação acumulada do IPCA/IBGE no período ou, na sua extinção, pelo índice oficial que o substituir.</p>
<p><b>4.2.5</b> - O valor dos honorários previstos no item 4.2 foi estabelecido com base nos parâmetros de volume de serviço relacionados no item 4.2.6. Se a média trimestral de qualquer desses parâmetros superar em 20% (vinte por cento) ou mais o valor de referência, ou se houver alteração do regime tributário, abertura de filial ou inclusão de nova atividade, os honorários serão revistos na mesma proporção do aumento do volume de serviço, passando o novo valor a vigorar a partir do mês seguinte à comunicação escrita da CONTRATADA, com antecedência mínima de 10 (dez) dias.</p>
<p><b>4.2.6</b> - Os parâmetros de fixação dos honorários, informados pela CONTRATANTE na data de assinatura, são os seguintes:</p>
<p>a) Faturamento médio mensal: R$ <b>[FATURAMENTO MÉDIO MENSAL]</b></p>
<p>b) Quantidade de empregados (incluindo sócios com pró-labore): <b>[QUANTIDADE DE EMPREGADOS]</b></p>
<p>c) Quantidade média mensal de notas fiscais (entrada e saída): <b>[QUANTIDADE DE NOTAS FISCAIS]</b></p>
<p>d) Quantidade de contas bancárias e meios de pagamento: <b>[QUANTIDADE DE CONTAS BANCÁRIAS]</b></p>
<p>e) Quantidade média mensal de lançamentos contábeis: <b>[QUANTIDADE DE LANÇAMENTOS CONTÁBEIS]</b></p>
<p>f) Regime tributário: <b>[REGIME TRIBUTÁRIO DA EMPRESA]</b></p>
<p><b>4.2.7</b> - O percentual de reajuste anual previsto no item 4.2.4 incidirá sobre o valor resultante da aplicação do critério de revisão pelo volume de serviços, conforme item 4.2.5.</p>

[QUEBRA]

<p><b>4.3</b> - A CONTRATANTE reembolsará à CONTRATADA o custo de livros, cópias, autenticações, reconhecimento de firmas, custas, emolumentos e taxas exigidas pelos serviços públicos, sempre que utilizados e mediante recibo discriminado acompanhado dos respectivos comprovantes de desembolso.</p>
<p><b>4.4.</b> - Os serviços solicitados pela CONTRATANTE não especificados na cláusula 1 serão cobrados pela CONTRATADA em apartado, como extraordinários, segundo orçamento previamente aprovado pela CONTRATANTE.</p>
<p><b>4.4.1</b> - São considerados serviços extraordinários, exemplificativamente:</p>
<p>1) alteração contratual, transformação, baixa ou encerramento de empresa;</p>
<p>2) abertura de empresa ou filial e inscrições cadastrais;</p>
<p>3) emissão de certidões negativas e de regularidade;</p>
<p>4) Declaração de Imposto de Renda Pessoa Física;</p>
<p>5) DECORE, declarações de faturamento e documentos para instituições financeiras;</p>
<p>6) preenchimento de fichas cadastrais e questionários (IBGE, bancos, fornecedores e licitações);</p>
<p>7) parcelamentos, transações tributárias e regularização de pendências fiscais;</p>
<p>8) defesa em autos de infração, impugnações e recursos administrativos;</p>
<p>9) retificação de obrigações de períodos anteriores ao contrato ou decorrentes de informações incorretas fornecidas pela CONTRATANTE;</p>
<p>10) levantamento e recuperação de serviços em atraso;</p>
<p>11) planejamento tributário, consultoria, laudos, perícias e atendimento a auditorias ou due diligence.</p>
<p><b>4.4.2</b> - As alterações na legislação tributária, trabalhista ou previdenciária que criem novos tributos, obrigações acessórias ou rotinas — inclusive as decorrentes da Reforma Tributária (IBS, CBS, Imposto Seletivo, Split Payment e respectivo período de transição) — que aumentem o volume ou a complexidade dos serviços autorizam a revisão dos honorários, mediante comunicação escrita com antecedência mínima de 30 (trinta) dias, ou sua cobrança como serviço extraordinário.</p>
<br>
<p><b>5. - DA VIGÊNCIA E RESCISÃO</b></p>
<p><b>5.1</b> - O presente contrato vigorará a partir de <b>[DATA DE INÍCIO DO CONTRATO]</b>, por prazo indeterminado, podendo ser rescindido a qualquer tempo por qualquer das partes mediante pré-aviso de 90 (noventa) dias, por escrito.</p>
<p><b>5.1.1</b> - A parte que não comunicar por escrito a rescisão ou efetuá-la de forma sumária, desrespeitando o pré-aviso previsto, ficará obrigada ao pagamento de multa compensatória no valor de 3 (três) parcelas mensais dos honorários vigentes à época.</p>
<p><b>5.1.2</b> - Durante o prazo do pré-aviso, a dispensa pela CONTRATANTE da execução de quaisquer serviços, seja qual for a razão, deverá ser feita por escrito e não a desobriga do pagamento dos honorários integrais até o termo final do contrato.</p>
<p><b>5.2</b> - A decretação de falência ou o pedido de recuperação judicial ou extrajudicial da CONTRATANTE facultará à CONTRATADA a rescisão do presente, independentemente de notificação judicial ou extrajudicial e sem incidência de multa, não estando incluídos nos serviços pactuados a elaboração das demonstrações e documentos exigidos pela Lei nº 11.101/2005.</p>
<p><b>5.3</b> - Considerar-se-á rescindido o presente contrato, independentemente de notificação judicial ou extrajudicial, caso qualquer das partes venha a infringir cláusula ora convencionada.</p>
<p><b>5.3.1</b> - Fica estipulada multa contratual de uma parcela mensal vigente dos honorários, exigível por inteiro da parte que der causa à rescisão motivada, sem prejuízo da penalidade do item 4.2.2, se for o caso. Nas hipóteses de inadimplência de honorários, aplicam-se exclusivamente os prazos, procedimentos e a multa específica previstos no item 4.2.3.</p>
<p><b>5.4</b> - A CONTRATADA poderá rescindir este contrato de imediato, mediante comunicação escrita, sem pré-aviso e sem incidência de qualquer multa a seu cargo, permanecendo devidos os honorários até a data da rescisão, caso a CONTRATANTE:</p>
<p>a) forneça documentos ou informações inidôneos, falsos ou que indiquem operações simuladas ou o uso de interpostas pessoas;</p>
<p>b) solicite ou exija a prática de ato contrário à legislação, às Normas Brasileiras de Contabilidade ou ao Código de Ética Profissional do Contador;</p>
<p>c) recuse-se injustificadamente a assinar a Carta de Responsabilidade da Administração;</p>
<p>d) pratique atos que caracterizem indícios das operações previstas na Lei nº 9.613/1998.</p>

[QUEBRA]

<p><b>6. - DO DESLIGAMENTO E DA TRANSIÇÃO</b></p>
<p><b>6.1</b> - Em qualquer hipótese de extinção do contrato, as partes registrarão por escrito a data de corte, assim entendida como o último dia de competência sob responsabilidade da CONTRATADA.</p>
<p><b>6.2</b> - A CONTRATADA será responsável apenas pelos serviços e obrigações acessórias relativos às competências até a data de corte cujo prazo legal de entrega se encerre durante a vigência do contrato. Obrigações com prazo posterior, inclusive as anuais referentes ao último exercício (como ECD, ECF e DEFIS), serão de responsabilidade da CONTRATANTE ou do novo profissional, salvo contratação específica.</p>
<p><b>6.3</b> - A CONTRATADA entregará à CONTRATANTE, mediante protocolo, os documentos de sua propriedade e o Termo de Transferência de Responsabilidade Técnica, nos termos das normas do Conselho Federal de Contabilidade, prestando ao novo profissional as informações necessárias à continuidade dos serviços.</p>
<p><b>6.4</b> - A CONTRATANTE deverá retirar seus documentos em até 30 (trinta) dias após a data de corte. Decorrido esse prazo, a CONTRATADA poderá enviá-los ao endereço da CONTRATANTE, às expensas desta, ou cobrar pela guarda, ficando isenta de responsabilidade por sua conservação.</p>
<p><b>6.5</b> - A CONTRATADA poderá manter cópia dos papéis de trabalho e documentos necessários à comprovação dos serviços prestados, pelo prazo legal, para fins de eventual defesa, observada a cláusula 8.</p>
<p><b>6.6</b> - A CONTRATANTE deverá revogar as procurações eletrônicas outorgadas à CONTRATADA em até 10 (dez) dias após a data de corte, sem prejuízo de a CONTRATADA renunciá-las.</p>
<br>
<p><b>7. - DA SUCESSÃO SOCIETÁRIA</b></p>
<p>Este contrato continuará vigente e plenamente exigível no caso de mudança de sócios, fusão, cisão, incorporação ou qualquer outra forma de reorganização societária da CONTRATANTE.</p>
<br>
<p><b>8. - DO SIGILO</b></p>
<p>Ambas as partes comprometem-se a manter sigilo sobre todas as informações acessadas em razão da relação contratual, durante sua vigência e após o seu término. O descumprimento ensejará responsabilização civil e, se cabível, penal. Não configura quebra de sigilo o fornecimento de informações aos órgãos públicos por exigência legal, normativa ou judicial, nem as comunicações previstas na cláusula 10.</p>
<br>
<p><b>9. - DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)</b></p>
<p><b>9.1</b> - Para fins da Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais), a CONTRATANTE é a controladora dos dados pessoais de seus sócios, empregados, clientes e fornecedores, e a CONTRATADA atua como operadora, tratando-os exclusivamente para a execução deste contrato e o cumprimento de obrigações legais e regulatórias.</p>
<p><b>9.2</b> - A CONTRATANTE declara possuir base legal para o compartilhamento dos dados pessoais com a CONTRATADA e responsabiliza-se por informar os titulares sobre esse tratamento.</p>
<p><b>9.3</b> - A CONTRATADA adotará medidas técnicas e administrativas razoáveis de segurança para proteger os dados pessoais, compartilhando-os apenas com órgãos públicos, sistemas e prestadores necessários à execução dos serviços.</p>
<p><b>9.4</b> - Encerrado o contrato, a CONTRATADA conservará os dados pelo prazo exigido em lei ou necessário ao exercício regular de direitos, eliminando-os após esse período.</p>
<br>
<p><b>10. - DA PREVENÇÃO À LAVAGEM DE DINHEIRO</b></p>
<p><b>10.1</b> - A CONTRATANTE declara ciência de que a CONTRATADA está sujeita à Lei nº 9.613/1998 e à Resolução CFC nº 1.530/2017, estando obrigada a comunicar ao Conselho de Controle de Atividades Financeiras (COAF) as operações e situações nelas previstas, independentemente de autorização ou ciência da CONTRATANTE.</p>
<p><b>10.2</b> - As comunicações realizadas de boa-fé não configuram quebra de sigilo profissional nem geram qualquer responsabilidade civil ou administrativa da CONTRATADA perante a CONTRATANTE.</p>
<p><b>10.3</b> - A CONTRATANTE compromete-se a fornecer as informações cadastrais e de beneficiários finais solicitadas pela CONTRATADA para cumprimento dessas normas.</p>

[QUEBRA]

<p><b>11. - DA FIANÇA</b></p>
<p><b>11.1</b> - O(A) FIADOR(A) qualificado(a) no preâmbulo assina o presente como fiador(a) e principal pagador(a), solidariamente responsável com a CONTRATANTE por todas as obrigações pecuniárias deste contrato, incluindo honorários, parcelas adicionais, encargos moratórios, multas, despesas de cobrança, custas e honorários advocatícios.</p>
<p><b>11.2</b> - O(A) FIADOR(A) renuncia expressamente ao benefício de ordem previsto no art. 827 do Código Civil.</p>
<p><b>11.3</b> - A fiança vigorará até a extinção do contrato e a quitação integral das obrigações dele decorrentes, inclusive em caso de reajuste ou revisão de honorários, e não se extingue pela mudança de sócios ou reorganização societária da CONTRATANTE.</p>
<p><b>11.4</b> - Em caso de falecimento, insolvência ou incapacidade do(a) FIADOR(A), a CONTRATANTE deverá apresentar substituto(a) idôneo(a) em até 30 (trinta) dias, sob pena de rescisão motivada nos termos do item 5.3.</p>
<br>
<p><b>12. - DAS COMUNICAÇÕES</b></p>
<p><b>12.1</b> - As comunicações entre as partes, inclusive notificações de rescisão, suspensão e revisão de honorários, serão consideradas válidas quando enviadas aos seguintes canais oficiais:</p>
<p>CONTRATADA — e-mail: nayaraponciano1@gmail.com | WhatsApp: (64) 99610-7444</p>
<p>CONTRATANTE — e-mail: <b>[E-MAIL DA EMPRESA]</b> | WhatsApp: <b>[WHATSAPP DA EMPRESA]</b></p>
<p><b>12.2</b> - A remessa de documentos entre as partes será feita por protocolo, malote, e-mail, sistema ou portal disponibilizado pela CONTRATADA.</p>
<p><b>12.3</b> - Compete a cada parte manter atualizados seus canais de contato, considerando-se válidas as comunicações enviadas aos canais acima até o recebimento de aviso escrito de alteração.</p>
<br>
<p><b>13. - DAS DISPOSIÇÕES GERAIS</b></p>
<p><b>13.1</b> - Este contrato, assinado pelas partes e por duas testemunhas, constitui título executivo extrajudicial, nos termos do art. 784, III, do Código de Processo Civil.</p>
<p><b>13.2</b> - As partes admitem a assinatura deste contrato e de seus aditivos por meio eletrônico, com ou sem certificado ICP-Brasil, nos termos da Medida Provisória nº 2.200-2/2001, da Lei nº 14.063/2020 e do art. 784, § 4º, do Código de Processo Civil, reconhecendo sua plena validade e eficácia.</p>
<p><b>13.3</b> - A tolerância de qualquer das partes quanto ao descumprimento de cláusula deste contrato não constituirá novação ou renúncia de direitos.</p>
<p><b>13.4</b> - Integra este contrato o Anexo I — Modelo de Carta de Responsabilidade da Administração.</p>
<br>
<p><b>14. - DO FORO</b></p>
<p>Fica eleito o foro da Comarca de Rio Verde/GO para dirimir quaisquer dúvidas oriundas deste contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.</p>
<p>E, por estarem assim justas e contratadas, as partes assinam o presente instrumento em 2 (duas) vias de igual teor, ou eletronicamente, na presença das testemunhas abaixo.</p>
<br>
<div style="text-align: center;">
  <p>Rio Verde/GO, <b>[DATA]</b>.</p>
  <br><br>
  <p>_______________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <p>CONTRATANTE</p>
  <p>Representante legal: <b>[NOME DO REPRESENTANTE]</b></p>
  <br><br>
  <p>_______________________________________________</p>
  <p><b>[NOME DO FIADOR]</b></p>
  <p>FIADOR(A) E PRINCIPAL PAGADOR(A)</p>
  <p>CPF: <b>[CPF DO FIADOR]</b></p>
  <br><br>
  <p>_______________________________________________</p>
  <p><b>[NOME DO CÔNJUGE DO FIADOR]</b></p>
  <p>CÔNJUGE/COMPANHEIRO(A) DO(A) FIADOR(A) (outorga — art. 1.647, III, CC)</p>
  <p>CPF: <b>[CPF DO CÔNJUGE DO FIADOR]</b></p>
  <br><br>
  <p>_______________________________________________</p>
  <p><b>SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL</b></p>
  <p>CNPJ 27.205.802/0001-94</p>
  <p>Nayara Ponciano Rocha — CRC-GO 025404</p>
  <br><br>
  <p>_______________________________________________</p>
  <p>TESTEMUNHA 1</p>
  <p>Nome: __________________________________________</p>
  <p>CPF: ___________________________________________</p>
  <br><br>
  <p>_______________________________________________</p>
  <p>TESTEMUNHA 2</p>
  <p>Nome: __________________________________________</p>
  <p>CPF: ___________________________________________</p>
</div>

[QUEBRA]

<div style="text-align: center;"><h2><b>ANEXO I</b></h2></div>
<div style="text-align: center;"><h2><b>Modelo de Carta de Responsabilidade da Administração</b></h2></div>
<br>
<p>Rio Verde/GO, <b>[DATA]</b>.</p>
<p>À SIMPLES ASSESSORIA CONTÁBIL E EMPRESARIAL — CNPJ 27.205.802/0001-94</p>
<p>Ref.: Demonstrações contábeis do exercício encerrado em <b>[DATA DO ENCERRAMENTO DO EXERCÍCIO]</b>.</p>
<br>
<p>Declaramos, para os devidos fins, como administradores e responsáveis legais pela empresa <b>[NOME DA EMPRESA]</b>, CNPJ <b>[CNPJ DA EMPRESA]</b>, que:</p>
<p>a) as informações e documentos fornecidos para a escrituração contábil e fiscal são completos, verdadeiros e refletem a totalidade das operações realizadas pela empresa no período;</p>
<p>b) todas as contas bancárias, aplicações financeiras, empréstimos, financiamentos e meios de pagamento da empresa foram informados;</p>
<p>c) os estoques e os bens do ativo imobilizado informados correspondem à realidade, sendo o inventário de nossa exclusiva responsabilidade;</p>
<p>d) não há operações, receitas, passivos, contingências, processos judiciais ou administrativos relevantes que não tenham sido comunicados;</p>
<p>e) não temos conhecimento de fraudes ou irregularidades envolvendo a administração ou empregados que possam afetar as demonstrações contábeis;</p>
<p>f) assumimos a responsabilidade pelas informações prestadas, isentando a contabilidade de quaisquer consequências decorrentes de informações incompletas ou inverídicas.</p>
<br><br>
<div style="text-align: center;">
  <p>_______________________________________________</p>
  <p><b>[NOME DA EMPRESA]</b></p>
  <p>Representante legal: <b>[NOME DO REPRESENTANTE]</b></p>
  <p>CPF: <b>[CPF DO REPRESENTANTE]</b></p>
</div>`,
    lastUsed: Date.now()
  }
];

export const INITIAL_TEMPLATE = `<div style="text-align: center;"><h2><b>TERMO DE RESPONSABILIDADE PELA GUARDA E USO DE EQUIPAMENTOS E MATERIAIS</b></h2></div>
<br>
<p><b>EMPREGADOR:</b> <b>[NOME DA EMPRESA]</b>, inscrita no CNPJ sob o nº <b>[CNPJ DA EMPRESA]</b>.</p>
<p><b>EMPREGADO(A):</b> <b>[NOME DO COLABORADOR]</b>, portador(a) do CPF nº <b>[CPF DO COLABORADOR]</b>.</p>
<br>
<p>Através deste documento, o(a) <b>EMPREGADO(A)</b> acima qualificado(a) declara que recebeu da empresa, a título de empréstimo para uso exclusivo em suas atividades profissionais, os seguintes equipamentos/materiais:</p>
<br>
<p><b>Relação de Itens Entregues:</b></p>
<p>1. [ITEM 1]</p>
<p>2. [ITEM 2]</p>
<br>
<p><b>Condições de Uso e Responsabilidade:</b></p>
<p><b>1.</b> O(A) <b>EMPREGADO(A)</b> compromete-se a zelar pela conservação e guarda dos equipamentos/materiais recebidos, utilizando-os única e exclusivamente para o desempenho de suas funções profissionais.</p>
<p><b>2.</b> Em caso de dano, avaria, extravio ou perda decorrente de dolo, culpa (negligência, imprudência ou imperícia) ou mau uso, o(a) <b>EMPREGADO(A)</b> autoriza expressamente, nos termos do art. 462, §1º da CLT, o desconto do valor correspondente ao reparo ou reposição em seu salário ou em suas verbas rescisórias.</p>
<p><b>3.</b> Ao término do contrato de trabalho, ou a qualquer momento em que for solicitado, o(a) <b>EMPREGADO(A)</b> obriga-se a devolver os itens em estado de conservação compatível com o desgaste natural do uso regular, sob pena de desconto do valor correspondente nas verbas rescisórias.</p>
<br>
<div style="text-align: center;">
  <p><b>[CIDADE/UF]</b>, <b>[DATA]</b>.</p>
  <br>
  <p>___________________________________________________</p>
  <p><b>[NOME DO COLABORADOR]</b></p>
  <p>Assinatura do(a) Empregado(a)</p>
</div>`;
