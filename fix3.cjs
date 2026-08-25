const fs = require('fs');

function run() {
  const content = fs.readFileSync('src/App.tsx', 'utf8');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.endsWith('}')) {
      if (line.trim() === '}') {
        lines[i] = line.substring(0, line.length - 1);
      }
    }
  }
  
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
}

run();
