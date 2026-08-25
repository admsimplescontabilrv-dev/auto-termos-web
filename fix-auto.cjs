const { execSync } = require('child_process');
const fs = require('fs');

let tries = 0;
while (tries < 50) {
  tries++;
  try {
    execSync('npx tsc --noEmit', { stdio: 'pipe' });
    console.log("Success!");
    break;
  } catch (err) {
    const log = err.stdout ? err.stdout.toString() : '';
    // get first error line
    const match = /src\/App\.tsx\((\d+),/.exec(log);
    if (!match) {
      console.log('No match found', log);
      break;
    }
    const lineNum = parseInt(match[1], 10);
    const content = fs.readFileSync('src/App.tsx', 'utf8');
    const lines = content.split('\n');
    
    // Check lines around lineNum for '    }'
    let fixed = false;
    for (let i = lineNum - 5; i <= lineNum + 2; i++) {
      if (lines[i] !== undefined && lines[i].trim() === '}') {
        lines[i] = lines[i].replace('}', ' ');
        fixed = true;
        break;
      }
    }
    
    if (fixed) {
      fs.writeFileSync('src/App.tsx', lines.join('\n'));
    } else {
      console.log("Couldn't fix at line", lineNum);
      console.log(lines.slice(lineNum - 3, lineNum + 3).join('\n'));
      break;
    }
  }
}
