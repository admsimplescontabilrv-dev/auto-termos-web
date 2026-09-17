import re

with open('src/ChecklistsApp.tsx', 'r') as f:
    content = f.read()

# 1. Add imports
content = content.replace(
    "import { format, addMonths, subMonths } from 'date-fns';",
    "import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';\nimport { format, addMonths, subMonths } from 'date-fns';"
)

# 2. Replace native drag and drop handlers
start_idx = content.find("const handleDragStart = (e: React.DragEvent<HTMLDivElement>")
end_idx = content.find("const handleSaveProcess = async (data: any) => {")

new_handlers = """  const handleDragEndDnd = async (result: DropResult) => {
    const { source, destination, type } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    if (type === 'RULE') {
      const newRules = [...currentProcessRules];
      const [moved] = newRules.splice(source.index, 1);
      newRules.splice(destination.index, 0, moved);

      setChecklistRules(prev => {
        const updated = [...prev];
        newRules.forEach((r, idx) => {
          const i = updated.findIndex(u => u.id === r.id);
          if (i !== -1) {
            updated[i] = { ...updated[i], order: idx };
            setDoc(doc(db, 'checklistRules', r.id), { order: idx }, { merge: true }).catch(console.error);
          }
        });
        return updated;
      });
    } else if (type === 'EVENT') {
      const newEvents = [...currentMonthEvents];
      const [moved] = newEvents.splice(source.index, 1);
      newEvents.splice(destination.index, 0, moved);

      setCalendarEvents(prev => {
        const updated = [...prev];
        newEvents.forEach((ev, idx) => {
          const i = updated.findIndex(u => u.id === ev.id);
          if (i !== -1) {
            updated[i] = { ...updated[i], order: idx };
            setDoc(doc(db, 'calendarEvents', ev.id), { order: idx }, { merge: true }).catch(console.error);
          }
        });
        return updated;
      });
    }
  };

  """

content = content[:start_idx] + new_handlers + content[end_idx:]

# 3. Replace currentMonthEvents render
old_events_render = """              <div className="p-4 space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar">
                {currentMonthEvents.length === 0 && (
                  <p className="text-slate-500 text-sm italic">Nenhum evento programado.</p>
                )}
                {currentMonthEvents.map((event, i) => {
                  const isCompleted = !!recurrentCompletions[event.id];
                  const completedAt = recurrentCompletions[event.id];
                  const isFromPadrao = selectedEntity?.type === 'EMPRESA' && event.empresaId === padraoId && selectedEntity.id !== padraoId;
                  const isFromSindicato = selectedEntity?.type === 'EMPRESA' && event.empresaId !== selectedEntity.id && event.empresaId !== padraoId;
                  return (
                    <div 
                      key={event.id || `recurrent-${i}`} 
                      draggable={sortOrder === 'manual'}
                      onDragStart={(e) => sortOrder === 'manual' && handleEventDragStart(e, event.id)}
                      onDragOver={(e) => sortOrder === 'manual' && handleDragOver(e)}
                      onDrop={(e) => sortOrder === 'manual' && handleEventDrop(e, event.id)}
                      onDragEnd={(e) => sortOrder === 'manual' && handleDragEnd(e)}
                      className={`bg-slate-800/50 border border-slate-700 rounded-lg p-3 flex flex-col group transition-colors ${isCompleted ? 'border-emerald-500/50 bg-emerald-500/5' : ''} ${sortOrder !== 'manual' ? 'opacity-90' : ''}`}
                    >"""

new_events_render = """              <Droppable droppableId="eventsList" type="EVENT" isDropDisabled={sortOrder !== 'manual'}>
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="p-4 space-y-3 overflow-y-auto max-h-[350px] custom-scrollbar"
                  >
                    {currentMonthEvents.length === 0 && (
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

content = content.replace(old_events_render, new_events_render)

old_events_close = """                    </div>
                  );
                })}
              </div>"""

new_events_close = """                            </div>
                          )}
                        </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>"""

content = content.replace(old_events_close, new_events_close)


# 4. Replace currentProcessRules render
old_rules_render = """              <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                {currentProcessRules.map((rule, i) => {
                  const isChecked = !!transientChecks[rule.id];
                  const isFromPadrao = selectedEntity?.type === 'EMPRESA' && rule.targetId === padraoId && selectedEntity.id !== padraoId;
                  const isFromSindicato = selectedEntity?.type === 'EMPRESA' && rule.targetId !== selectedEntity.id && rule.targetId !== padraoId;
                  return (
                  <div 
                    key={rule.id || `rule-${i}`} 
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, rule.id)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, rule.id)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center justify-between bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl group transition-all ${isChecked ? 'border-emerald-500/50 bg-emerald-500/5' : 'hover:border-emerald-500/30'}`}
                  >"""

new_rules_render = """              <Droppable droppableId="rulesList" type="RULE">
                {(provided) => (
                  <div 
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3"
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
                            >"""

content = content.replace(old_rules_render, new_rules_render)

old_rules_close = """                  </div>
                  );
                })}
              </div>"""

new_rules_close = """                            </div>
                          )}
                        </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>"""

content = content.replace(old_rules_close, new_rules_close)


# 5. Wrap return with DragDropContext
content = content.replace(
    'return (\n    <div className="space-y-6 animate-fade-in relative max-w-7xl mx-auto pb-24">',
    'return (\n    <DragDropContext onDragEnd={handleDragEndDnd}>\n      <div className="space-y-6 animate-fade-in relative max-w-7xl mx-auto pb-24">'
)

# Replace the end
content = content.replace(
    '      <UnifiedAddModal',
    '      </DragDropContext>\n      <UnifiedAddModal'
)

with open('src/ChecklistsApp.tsx', 'w') as f:
    f.write(content)

print("Replacement complete.")
