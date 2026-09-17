import re

with open('src/ChecklistsApp.tsx', 'r') as f:
    content = f.read()

# Fix events list
pattern1 = r'\{currentMonthEvents\.length === 0 && \(\n\s+<p className="text-slate-500 text-sm italic">Nenhum evento programado\.</p>\n\s+\)\}\n\s+\{currentMonthEvents\.map\(\(event, i\) => \{.*?\n\s+return \(\n\s+<div \n\s+key=\{event\.id \|\| `recurrent-\$\{i\}`\} \n\s+draggable=\{sortOrder === \'manual\'\}.*?className=\{`bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex flex-col group transition-colors \$\{isCompleted \? \'border-emerald-500/50 bg-emerald-500/5\' : \'\'\} \$\{sortOrder !== \'manual\' \? \'opacity-90\' : \'\'\}`\}\n\s+>'

new_render1 = """{currentMonthEvents.length === 0 && (
                  <p className="text-slate-500 text-sm italic">Nenhum evento programado.</p>
                )}
                {currentMonthEvents.map((event, i) => {
                  const isCompleted = !!recurrentCompletions[event.id];
                  const completedAt = recurrentCompletions[event.id];
                  const isFromPadrao = selectedEntity?.type === 'EMPRESA' && event.empresaId === padraoId && selectedEntity.id !== padraoId;
                  const isFromSindicato = selectedEntity?.type === 'EMPRESA' && event.empresaId !== selectedEntity.id && event.empresaId !== padraoId;
                  const isDragDisabled = sortOrder !== 'manual' || isFromSindicato || isFromPadrao;
                  return (
                    <Draggable key={event.id || `recurrent-${i}`} draggableId={event.id || `recurrent-${i}`} index={i} isDragDisabled={isDragDisabled}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`bg-slate-800/50 border rounded-lg p-3 flex flex-col group transition-colors ${snapshot.isDragging ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-700'} ${isCompleted ? 'border-emerald-500/50 bg-emerald-500/5' : ''} ${isDragDisabled ? 'opacity-90' : ''}`}
                        >"""

content = re.sub(pattern1, new_render1, content, flags=re.DOTALL)

# Fix event close
content = content.replace("""                      {isCompleted && completedAt && (
                        <div className="mt-2 pl-8 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-medium">Marcado em {format(new Date(completedAt), "dd/MM/yyyy 'às' HH:mm")}</span>
                        </div>
                      )}
                            </div>
                          )}
                        </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>""", """                      {isCompleted && completedAt && (
                        <div className="mt-2 pl-8 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-medium">Marcado em {format(new Date(completedAt), "dd/MM/yyyy 'às' HH:mm")}</span>
                        </div>
                      )}
                        </div>
                      )}
                    </Draggable>
                  );
                })}
              </div>""")

with open('src/ChecklistsApp.tsx', 'w') as f:
    f.write(content)
