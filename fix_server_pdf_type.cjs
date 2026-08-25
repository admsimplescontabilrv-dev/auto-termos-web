const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');

content = content.replace(
  "type: z.enum(['cnpj', 'recibo', 'admissional', 'trct', 'custom']).default('admissional'),",
  "type: z.enum(['cnpj', 'recibo', 'admissional', 'trct', 'custom', 'aviso_previo']).default('admissional'),"
);

fs.writeFileSync('server.ts', content);
console.log('Fixed extract schema');
