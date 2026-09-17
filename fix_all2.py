import re

with open('src/ChecklistsApp.tsx', 'r') as f:
    content = f.read()

# Replace the first list block (eventsList)
start_events = content.find('{currentMonthEvents.map((event, i) => {')
end_events = content.find('              <div className="p-4 border-y border-slate-800 bg-slate-950/50 mt-auto">', start_events)

new_events = """              <Droppable droppableId="eventsList" type="EVENT" isDropDisabled={sortOrder !== 'manual'}>
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
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
                            >
                              <div className="flex justify-between items-start">
                                <div className="flex items-start space-x-3">
                                  <button 
                                    onClick={() => toggleRecurrentCompletion(event.id, isCompleted)}
                                    className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${isCompleted ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-indigo-400'}`}
                                  >
                                    {isCompleted && <CheckSquare className="w-3 h-3 text-white" />}
                                  </button>
                                  <div>
                                    <p className={`text-sm font-medium flex items-center flex-wrap gap-2 ${isCompleted ? 'text-slate-400 line-through' : 'text-slate-200'}`}>
                                      <span>{event.title}</span>
                                      {isFromSindicato && (  <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">Via Sindicato</span>)}
                                      {isFromPadrao && (  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-500/20">Padrão</span>)}
                                    </p>
                                  </div>
                                </div>
                                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded uppercase whitespace-nowrap ml-2">
                                  {event.isRecurrent ? (
                                    event.recurrentRule === 'NEAR_5' ? 'Prox. Dia 05' : 
                                    event.recurrentRule === 'NEAR_20' ? 'Prox. Dia 20' : 
                                    event.recurrentRule === 'NEAR_30' ? 'Prox. Dia 30' : 
                                    event.recurrentRule === 'WEEKLY' ? 'Semanal' :
                                    event.recurrentRule === 'DAILY' ? 'Diário' :
                                    `Todo dia ${event.recurrentDay}`
                                  ) : (
                                    `Dia ${format(new Date(event.date), 'dd/MM')}`
                                  )}
                                </span>
                                {!isFromSindicato && !isFromPadrao && (
                                  <div className="flex items-center space-x-1 ml-3">
                                    <button onClick={() => setEditingEvent(event)} className="p-2 text-slate-400 hover:text-indigo-400 bg-slate-800 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    <div 
                                      className={`p-2 text-slate-500 hover:text-indigo-400 ${isDragDisabled ? 'cursor-default' : 'cursor-grab'} opacity-0 group-hover:opacity-100 transition-opacity`}
                                      title={isDragDisabled ? "" : "Arrastar para Reordenar"}
                                    >
                                      <GripVertical className="w-4 h-4" />
                                    </div>
                                  </div>
                                )}
                              </div>
                              {isCompleted && completedAt && (
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
              </Droppable>
"""

content = content[:start_events] + new_events + content[end_events:]


# Replace the second list block (rulesList)
start_rules = content.find('{currentProcessRules.map((rule, i) => {')
end_rules = content.find('                {currentProcessRules.length === 0 && (', start_rules)

new_rules = """              <Droppable droppableId="rulesList" type="RULE">
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-3"
                  >
                    {currentProcessRules.map((rule, i) => {
                      const isChecked = !!transientChecks[rule.id];
                      const isFromPadrao = selectedEntity?.type === 'EMPRESA' && rule.targetId === padraoId && selectedEntity.id !== padraoId;
                      const isFromSindicato = selectedEntity?.type === 'EMPRESA' && rule.targetId !== selectedEntity.id && rule.targetId !== padraoId;
                      const isDragDisabled = isFromSindicato || isFromPadrao;
                      
                      return (
                        <Draggable key={rule.id || `rule-${i}`} draggableId={rule.id || `rule-${i}`} index={i} isDragDisabled={isDragDisabled}>
                          {(provided, snapshot) => (
                            <div 
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              className={`flex items-center justify-between bg-slate-800/50 border p-4 rounded-xl group transition-all ${snapshot.isDragging ? 'border-indigo-500 shadow-lg shadow-indigo-500/20' : 'border-slate-700/50'} ${isChecked ? 'border-emerald-500/50 bg-emerald-500/5' : 'hover:border-emerald-500/30'}`}
                            >
                              <div className="flex items-start space-x-4">
                                <button 
                                  onClick={() => toggleTransientCheck(rule.id)}
                                  className={`mt-0.5 w-5 h-5 shrink-0 rounded flex items-center justify-center border transition-colors ${isChecked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-indigo-400'}`}
                                >
                                  {isChecked && <CheckSquare className="w-3 h-3 text-white" />}
                                </button>
                                <div>
                                  <span className={`font-medium flex items-center flex-wrap gap-2 transition-colors ${isChecked ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                                    <span>{rule.taskName}</span>
                                    {isFromSindicato && (  <span className="text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-500/20">Via Sindicato</span>)}
                                    {isFromPadrao && (  <span className="text-[9px] font-bold bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded uppercase tracking-wider border border-amber-500/20">Padrão</span>)}
                                  </span>
                                </div>
                              </div>
                              {!isFromSindicato && !isFromPadrao && (
                                <div className="flex items-center space-x-1">
                                  <button 
                                    onClick={() => setEditingRule(rule)}
                                    className="text-slate-500 hover:text-indigo-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Editar Item"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </button>
                                  <div 
                                    className="text-slate-500 hover:text-indigo-400 p-2 cursor-grab opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Arrastar para Reordenar"
                                  >
                                    <GripVertical className="w-5 h-5" />
                                  </div>
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
              </Droppable>
"""

content = content[:start_rules] + new_rules + content[end_rules:]

with open('src/ChecklistsApp.tsx', 'w') as f:
    f.write(content)

