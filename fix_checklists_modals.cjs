const fs = require('fs');
let content = fs.readFileSync('src/ChecklistsApp.tsx', 'utf8');

// replace isAddItemModalOpen -> isAddModalOpen
content = content.replace(/{isAddItemModalOpen && \(/g, '{isAddModalOpen && (');
content = content.replace(/isAddItemModalOpen/g, 'isAddModalOpen');
content = content.replace(/setIsAddItemModalOpen/g, 'setIsAddModalOpen');

// replace isAvisoModalOpen -> isAddModalOpen
content = content.replace(/{isAvisoModalOpen && \(/g, '{isAddModalOpen && (');
content = content.replace(/isAvisoModalOpen/g, 'isAddModalOpen');
content = content.replace(/setIsAvisoModalOpen/g, 'setIsAddModalOpen');

fs.writeFileSync('src/ChecklistsApp.tsx', content);
console.log('Fixed checklist modals');
