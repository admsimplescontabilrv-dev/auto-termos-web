import re

with open('src/ChecklistsApp.tsx', 'r') as f:
    content = f.read()

# Let's use regex to replace the map body of currentMonthEvents
pattern_events = r'\{currentMonthEvents\.map\(\(event, i\) => \{.*?\n\s+return \(\n\s+<div \n\s+key=\{event\.id \|\| `recurrent-\$\{i\}`\} \n\s+draggable=\{sortOrder === \'manual\'\}.*?className=\{`bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex flex-col group transition-colors \$\{isCompleted \? \'border-emerald-500/50 bg-emerald-500/5\' : \'\'\} \$\{sortOrder !== \'manual\' \? \'opacity-90\' : \'\'\}`\}\n\s+>'

match = re.search(pattern_events, content, re.DOTALL)
if match:
    print("Found events match!")

