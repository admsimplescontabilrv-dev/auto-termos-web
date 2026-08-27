const fs = require('fs');
let code = fs.readFileSync('src/ChecklistsApp.tsx', 'utf-8');

code = code.replace(/\{isFromPadrao \{isFromSindicato \&\& \(\{isFromSindicato \&\& \( \([\s\S]*?Via Sindicato<\/span>\s*\)\}/g, '');

fs.writeFileSync('src/ChecklistsApp.tsx', code);
