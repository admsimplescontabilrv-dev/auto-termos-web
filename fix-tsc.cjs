const fs = require('fs');
const content = fs.readFileSync('src/App.tsx', 'utf8');
const lines = content.split('\n');
const log = fs.readFileSync('tsc.log', 'utf8');

const errorLines = new Set();
const regex = /src\/App\.tsx\((\d+),/g;
let match;
while ((match = regex.exec(log)) !== null) {
  errorLines.add(parseInt(match[1], 10));
}

let modified = 0;
// We add '}' to a line only if it is completely blank (has spaces)
for (const lineNum of errorLines) {
  // line numbers are 1-based, we want the PREVIOUS line because the error usually points to the next line
  // or the current line.
  // Actually, tsc points to the line where it expects a statement. The missing '}' is usually on the line BEFORE it,
  // OR on the same line if it's completely blank.
  const idx = lineNum - 1;
  
  if (lines[idx] !== undefined && lines[idx].trim() === '' && lines[idx].length > 0) {
    lines[idx] = lines[idx] + '}';
    modified++;
  } else if (lines[idx-1] !== undefined && lines[idx-1].trim() === '' && lines[idx-1].length > 0) {
    lines[idx-1] = lines[idx-1] + '}';
    modified++;
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log('Modified', modified, 'lines');
