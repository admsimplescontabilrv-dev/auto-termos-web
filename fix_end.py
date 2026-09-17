with open('src/ChecklistsApp.tsx', 'r') as f:
    content = f.read()

content = content.replace("  );\n}", "    </DragDropContext>\n  );\n}")

with open('src/ChecklistsApp.tsx', 'w') as f:
    f.write(content)
