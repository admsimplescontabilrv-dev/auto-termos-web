const fs = require('fs');
let content = fs.readFileSync('src/App.tsx', 'utf8');

const targetStr = `      () => setNotification((prev) => ({ ...prev, visible: false })),\n      4000,\n    );\n  };\n`;

const replacement = `      () => setNotification((prev) => ({ ...prev, visible: false })),
      4000,
    );
  };

  const moveTemplate = (index, direction) => {
    const newTemplates = [...templates];
    if (direction === 'up' && index > 0) {
      [newTemplates[index], newTemplates[index - 1]] = [newTemplates[index - 1], newTemplates[index]];
    } else if (direction === 'down' && index < newTemplates.length - 1) {
      [newTemplates[index], newTemplates[index + 1]] = [newTemplates[index + 1], newTemplates[index]];
    } else {
      return;
    }
    setTemplates(newTemplates);
    localStorage.setItem("@app:templates", JSON.stringify(newTemplates));
  };
`;

content = content.replace(targetStr, replacement);
fs.writeFileSync('src/App.tsx', content);
