const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

// The block to replace:
//       if (pdfBase64 && requestContents.length > 0) {
//         // Encontra a última mensagem do user e injeta o inlineData nela
//         const lastUserMessage = requestContents[requestContents.length - 1];
//         if (lastUserMessage.role === 'user') {
//           lastUserMessage.parts.push({
//             inlineData: {
//               mimeType: 'application/pdf',
//               data: pdfBase64
//             }
//           });
//           if (pdfName) {
//             lastUserMessage.parts.push({ text: \`Arquivo anexado: \${pdfName}\` });
//           }
//         }
//       }

const searchBlock = `
      if (pdfBase64 && requestContents.length > 0) {
        // Encontra a última mensagem do user e injeta o inlineData nela
        const lastUserMessage = requestContents[requestContents.length - 1];
        if (lastUserMessage.role === 'user') {
          lastUserMessage.parts.push({
            inlineData: {
              mimeType: 'application/pdf',
              data: pdfBase64
            }
          });
          if (pdfName) {
            lastUserMessage.parts.push({ text: \`Arquivo anexado: \${pdfName}\` });
          }
        }
      }
`;

const replaceBlock = `
      if (pdfBase64 && requestContents.length > 0) {
        // Encontra a última mensagem do user e avisa que um PDF foi anexado,
        // mas NÃO passamos o binário do PDF para a IA para economizar tokens e tempo,
        // pois a extração pesada ocorrerá no frontend via /api/extract-pdf
        const lastUserMessage = requestContents[requestContents.length - 1];
        if (lastUserMessage.role === 'user') {
          lastUserMessage.parts.push({ text: \`[AVISO DE SISTEMA: O usuário anexou um arquivo PDF chamado "\${pdfName || 'documento.pdf'}", mas o conteúdo não foi enviado para você ler. Siga as instruções de gerar o INTENT sem extrair os dados.]\` });
        }
      }
`;

content = content.replace(searchBlock.trim(), replaceBlock.trim());

fs.writeFileSync('server.ts', content, 'utf8');
