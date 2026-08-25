const fs = require('fs');

function run() {
  const content = fs.readFileSync('src/App.tsx', 'utf8');
  const lines = content.split('\n');
  
  const affected = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // if a line is just whitespace and length > 0
    if (line.length > 0 && line.trim() === '') {
      affected.push(i);
    }
  }
  
  for (const idx of affected) {
    lines[idx] = lines[idx] + '}';
  }
  
  fs.writeFileSync('src/App.tsx', lines.join('\n'));
}

run();
