const fs = require('fs');

let content = fs.readFileSync('server.ts', 'utf8');

const newInstruction = `
- REGRA DE REINÍCIO (MUITO IMPORTANTE): Sempre que o usuário pedir para gerar um novo termo, recibo ou TRCT (mesmo que ele já tenha pedido um antes na mesma conversa), VOCÊ DEVE IGNORAR COMPLEMENTAMENTE os dados da solicitação anterior. Comece a extração ou o preenchimento do zero apenas com os dados fornecidos na solicitação atual. Nunca misture dados de um pedido antigo no novo.
- EXTRAÇÃO DE PDF (TRCT, RECIBO, TERMO): Se o usuário anexar um arquivo PDF no chat e pedir para gerar qualquer documento (TRCT, Recibo, Termos, etc), você NÃO DEVE extrair ou ler os dados do PDF. Apenas gere o INTENT correspondente (ex: GENERATE_TRCT, GENERATE_RECIBO, GENERATE_TERMO) deixando os campos de payload vazios ou com os dados que o usuário digitou no texto. O frontend do sistema possui um motor interno potente que fará a extração do PDF na respectiva tela automaticamente.
`;

// Replace the existing EXTRAÇÃO DE PDF instructions
content = content.replace(
  /- EXTRAÇÃO DE PDF PARA TERMOS: Se o usuário enviar um arquivo PDF para gerar um termo, você NÃO extrai os dados, apenas retorna o INTENT "GENERATE_TERMO". O frontend do sistema possui um prompt interno potente que fará a extração avançada na tela de termos automaticamente\./,
  newInstruction.trim()
);

fs.writeFileSync('server.ts', content, 'utf8');
