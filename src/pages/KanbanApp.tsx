import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { KanbanTask, KanbanColumn } from '../types';
import { useFirestore } from '../hooks/useFirestore';
import { Plus, GripVertical, CheckCircle, Circle, Archive, Edit2, X, Check, Trash2 } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { setDoc, doc } from 'firebase/firestore';
import { db } from '../lib/firebase';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function KanbanApp() {
  const { data: tasksData, loading: tasksLoading, error: tasksError, add: addTask, update: updateTask, remove: removeTask } = useFirestore<KanbanTask>('kanban_tasks');
  const { data: columnsData, loading: columnsLoading, error: columnsError, add: addColumn, update: updateColumn } = useFirestore<KanbanColumn>('kanban_columns');
  
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [addingInColumn, setAddingInColumn] = useState<string | null>(null);
  
  const [hasSeeded, setHasSeeded] = useState(false);
  
  const [editingColumnId, setEditingColumnId] = useState<string | null>(null);
  const [editingColumnTitle, setEditingColumnTitle] = useState('');
  
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskTitle, setEditingTaskTitle] = useState('');

  const [showArchivedModal, setShowArchivedModal] = useState(false);
  const archivedTasks = tasksData.filter(t => t.archived);

  // Seed default columns if none exist to preserve existing tasks
  useEffect(() => {
    if (!columnsLoading && columnsData.length === 0 && !hasSeeded) {
      setHasSeeded(true);
      const seed = async () => {
        await setDoc(doc(db, 'kanban_columns', 'ENTRADA DE DEMANDAS'), { title: 'ENTRADA DE DEMANDAS', order: 1000 });
        await setDoc(doc(db, 'kanban_columns', 'URGENTE'), { title: 'URGENTE', order: 2000 });
        await setDoc(doc(db, 'kanban_columns', 'CONCLUIDO'), { title: 'CONCLUÍDO', order: 3000 });
      };
      seed();
    }
  }, [columnsLoading, columnsData.length, hasSeeded]);

  const tasks = tasksData.filter(t => !t.archived);
  const columns = [...columnsData].sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    if (type === 'COLUMN') {
      const destIndex = destination.index;
      let newOrder = 0;
      if (columns.length === 0) {
        newOrder = 1000;
      } else if (destIndex === 0) {
        newOrder = (columns[0].order || 0) - 1000;
      } else if (destIndex === columns.length - 1) {
        newOrder = (columns[columns.length - 1].order || 0) + 1000;
      } else {
        const prevOrder = columns[destIndex > source.index ? destIndex : destIndex - 1].order || 0;
        const nextOrder = columns[destIndex > source.index ? destIndex + 1 : destIndex].order || 0;
        newOrder = (prevOrder + nextOrder) / 2;
      }

      try {
        await updateColumn(draggableId, { order: newOrder });
      } catch (err) {
        console.error('Error reordering column:', err);
      }
      return;
    }

    const draggedTask = tasks.find(t => t.id === draggableId);
    if (!draggedTask) return;
    
    const destStatus = destination.droppableId;
    const destTasks = tasks
      .filter(t => t.status === destStatus && t.id !== draggableId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    let newOrder = 0;
    if (destTasks.length === 0) {
      newOrder = 1000;
    } else if (destination.index === 0) {
      newOrder = (destTasks[0].order || 0) - 1000;
    } else if (destination.index === destTasks.length) {
      newOrder = (destTasks[destTasks.length - 1].order || 0) + 1000;
    } else {
      const prevOrder = destTasks[destination.index - 1].order || 0;
      const nextOrder = destTasks[destination.index].order || 0;
      newOrder = (prevOrder + nextOrder) / 2;
    }

    try {
      await updateTask(draggableId, {
        status: destStatus,
        order: newOrder
      });
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleAddTask = async (columnId: string) => {
    if (!newTaskTitle.trim()) {
      setAddingInColumn(null);
      return;
    }

    const columnTasks = tasks
      .filter(t => t.status === columnId)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const newOrder = columnTasks.length > 0 
      ? (columnTasks[columnTasks.length - 1].order || 0) + 1000 
      : 1000;

    try {
      await addTask({
        title: newTaskTitle.trim(),
        status: columnId,
        order: newOrder,
        createdAt: Date.now(),
        archived: false
      });
      setNewTaskTitle('');
      setAddingInColumn(null);
    } catch (err) {
      console.error('Error adding task:', err);
    }
  };
  
  const handleAddColumn = async () => {
    if (!newColumnTitle.trim()) {
      setIsAddingColumn(false);
      return;
    }
    
    const newOrder = columns.length > 0 
      ? (columns[columns.length - 1].order || 0) + 1000 
      : 1000;

    try {
      await addColumn({
        title: newColumnTitle.trim(),
        order: newOrder
      });
      setNewColumnTitle('');
      setIsAddingColumn(false);
    } catch (err) {
      console.error('Error adding column:', err);
    }
  };

  const handleSaveColumnTitle = async (columnId: string) => {
    if (!editingColumnTitle.trim()) {
      setEditingColumnId(null);
      return;
    }
    try {
      await updateColumn(columnId, { title: editingColumnTitle.trim() });
      setEditingColumnId(null);
    } catch (err) {
      console.error('Error updating column:', err);
    }
  };
  
  const handleSaveTaskTitle = async (taskId: string) => {
    if (!editingTaskTitle.trim()) {
      setEditingTaskId(null);
      return;
    }
    try {
      await updateTask(taskId, { title: editingTaskTitle.trim() });
      setEditingTaskId(null);
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const handleArchiveTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { archived: true });
    } catch (err) {
      console.error('Error archiving task:', err);
    }
  };

  const handleUnarchiveTask = async (taskId: string) => {
    try {
      await updateTask(taskId, { archived: false });
    } catch (err) {
      console.error('Error unarchiving task:', err);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Tem certeza que deseja apagar este cartão permanentemente?')) {
      try {
        await removeTask(taskId);
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    }
  };

  if (tasksLoading || columnsLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-slate-400">Carregando kanban...</div>
      </div>
    );
  }

  if (tasksError || columnsError) {
    return (
      <div className="flex h-full items-center justify-center text-red-500">
        Erro ao carregar kanban: {tasksError?.message || columnsError?.message}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="p-6 pb-2 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">Kanban de Demandas</h1>
          <p className="text-slate-400">Arraste os cartões e colunas. Clique nos títulos para editar.</p>
        </div>
        <button 
          onClick={() => setShowArchivedModal(true)}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors border border-slate-700 text-sm font-medium shrink-0"
        >
          <Archive className="w-4 h-4 text-indigo-400" />
          Arquivados
        </button>
      </div>
      
      <div className="flex-1 overflow-x-auto p-6 pt-4">
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="board" type="COLUMN" direction="horizontal">
            {(provided) => (
              <div 
                ref={provided.innerRef}
                {...provided.droppableProps}
                className="flex items-start gap-6 h-full"
              >
                {columns.map((column, index) => {
                  const columnTasks = tasks
                    .filter(t => t.status === column.id)
                    .sort((a, b) => (a.order || 0) - (b.order || 0));

                  return (
                    <Draggable key={column.id} draggableId={column.id} index={index}>
                      {(provided, snapshot) => (
                        <div 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={cn(
                            "flex flex-col w-80 max-h-full bg-slate-900/50 rounded-xl border border-slate-800/50 flex-shrink-0 transition-transform",
                            snapshot.isDragging ? "shadow-xl ring-2 ring-indigo-500/50 rotate-1" : ""
                          )}
                        >
                          <div 
                            {...provided.dragHandleProps}
                            className="p-4 flex items-center justify-between border-b border-slate-800/50 group cursor-grab active:cursor-grabbing"
                          >
                            {editingColumnId === column.id ? (
                              <div className="flex-1 flex items-center gap-2 mr-2">
                                <input
                                  autoFocus
                                  type="text"
                                  className="w-full bg-slate-800 text-sm text-white rounded border border-indigo-500 px-2 py-1 outline-none"
                                  value={editingColumnTitle}
                                  onChange={e => setEditingColumnTitle(e.target.value)}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveColumnTitle(column.id);
                                    if (e.key === 'Escape') setEditingColumnId(null);
                                  }}
                                  onBlur={() => handleSaveColumnTitle(column.id)}
                                />
                              </div>
                            ) : (
                              <h3 
                                onClick={() => {
                                  setEditingColumnId(column.id);
                                  setEditingColumnTitle(column.title);
                                }}
                                className="font-semibold text-slate-200 cursor-text hover:text-white truncate pr-2 flex-1"
                              >
                                {column.title}
                              </h3>
                            )}
                            <div className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-800 text-xs text-slate-400 font-medium shrink-0">
                              {columnTasks.length}
                            </div>
                          </div>

                          <Droppable droppableId={column.id} type="TASK">
                            {(provided, snapshot) => (
                              <div
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className={cn(
                                  "flex-1 overflow-y-auto p-3 space-y-3 min-h-[150px] transition-colors",
                                  snapshot.isDraggingOver ? "bg-slate-800/30" : ""
                                )}
                              >
                                {columnTasks.map((task, index) => (
                                  <Draggable key={task.id} draggableId={task.id} index={index}>
                                    {(provided, snapshot) => (
                                      <div
                                        ref={provided.innerRef}
                                        {...provided.draggableProps}
                                        {...provided.dragHandleProps}
                                        className={cn(
                                          "group relative bg-slate-800 rounded-lg p-4 border shadow-sm transition-all",
                                          snapshot.isDragging ? "shadow-lg ring-2 ring-indigo-500/50 border-indigo-500/50 rotate-2" : "border-slate-700 hover:border-slate-600 hover:shadow"
                                        )}
                                        style={provided.draggableProps.style}
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="mt-0.5 text-slate-500 group-hover:text-slate-400 cursor-grab">
                                            {column.id === 'CONCLUIDO' || column.title.toUpperCase().includes('CONCLU') ? (
                                              <CheckCircle className="w-5 h-5 text-emerald-500" />
                                            ) : (
                                              <Circle className="w-5 h-5" />
                                            )}
                                          </div>
                                          
                                          <div className="flex-1 min-w-0">
                                            {editingTaskId === task.id ? (
                                              <textarea
                                                autoFocus
                                                className="w-full bg-slate-900 text-sm text-white rounded border border-indigo-500 px-2 py-1 outline-none resize-none"
                                                rows={3}
                                                value={editingTaskTitle}
                                                onChange={e => setEditingTaskTitle(e.target.value)}
                                                onKeyDown={e => {
                                                  if (e.key === 'Enter' && !e.shiftKey) {
                                                    e.preventDefault();
                                                    handleSaveTaskTitle(task.id);
                                                  }
                                                  if (e.key === 'Escape') setEditingTaskId(null);
                                                }}
                                                onBlur={() => handleSaveTaskTitle(task.id)}
                                              />
                                            ) : (
                                              <p 
                                                onClick={() => {
                                                  setEditingTaskId(task.id);
                                                  setEditingTaskTitle(task.title);
                                                }}
                                                className={cn(
                                                  "text-sm font-medium whitespace-pre-wrap cursor-text",
                                                  (column.id === 'CONCLUIDO' || column.title.toUpperCase().includes('CONCLU')) 
                                                    ? "text-slate-400 line-through" 
                                                    : "text-slate-200"
                                                )}
                                              >
                                                {task.title}
                                              </p>
                                            )}
                                          </div>
                                          
                                          <div className="flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button 
                                              onClick={() => handleArchiveTask(task.id)}
                                              className="p-1 text-slate-500 hover:text-red-400 hover:bg-slate-700 rounded transition-colors"
                                              title="Arquivar Tarefa"
                                            >
                                              <Archive className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </Draggable>
                                ))}
                                {provided.placeholder}
                                
                                <div className="pt-2">
                                  {addingInColumn === column.id ? (
                                    <div className="bg-slate-800 rounded-lg p-3 border border-slate-700">
                                      <textarea
                                        autoFocus
                                        rows={2}
                                        placeholder="Nome da tarefa..."
                                        className="w-full bg-slate-900 text-sm text-white rounded border border-slate-700 px-3 py-2 outline-none focus:border-indigo-500 resize-none"
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        onKeyDown={e => {
                                          if (e.key === 'Enter' && !e.shiftKey) {
                                            e.preventDefault();
                                            handleAddTask(column.id);
                                          } else if (e.key === 'Escape') {
                                            setAddingInColumn(null);
                                            setNewTaskTitle('');
                                          }
                                        }}
                                        onBlur={() => {
                                          if (newTaskTitle.trim()) {
                                            handleAddTask(column.id);
                                          } else {
                                            setAddingInColumn(null);
                                          }
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setAddingInColumn(column.id)}
                                      className="flex items-center gap-2 w-full p-2 text-sm text-slate-400 hover:text-slate-300 hover:bg-slate-800/50 rounded-lg transition-colors group"
                                    >
                                      <Plus className="w-4 h-4 group-hover:bg-slate-700 rounded-sm" />
                                      <span>Adicionar um cartão</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </Droppable>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
                
                {/* Add New Column */}
                <div className="w-80 flex-shrink-0">
                  {isAddingColumn ? (
                    <div className="bg-slate-900/50 rounded-xl border border-slate-800/50 p-3">
                      <input
                        autoFocus
                        type="text"
                        placeholder="Nome da lista..."
                        className="w-full bg-slate-800 text-sm text-white rounded border border-indigo-500 px-3 py-2 outline-none mb-2"
                        value={newColumnTitle}
                        onChange={e => setNewColumnTitle(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') handleAddColumn();
                          if (e.key === 'Escape') {
                            setIsAddingColumn(false);
                            setNewColumnTitle('');
                          }
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleAddColumn}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-md transition-colors"
                        >
                          Adicionar
                        </button>
                        <button
                          onClick={() => {
                            setIsAddingColumn(false);
                            setNewColumnTitle('');
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-300 hover:bg-slate-800 rounded-md transition-colors"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsAddingColumn(true)}
                      className="flex items-center gap-2 w-full p-4 bg-slate-900/30 hover:bg-slate-900/50 text-slate-300 font-medium rounded-xl border border-slate-800/50 transition-colors border-dashed"
                    >
                      <Plus className="w-5 h-5" />
                      <span>Adicionar outra lista</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Archived Cards Modal */}
      {showArchivedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <Archive className="w-5 h-5 text-indigo-400" />
                Cartões Arquivados
              </h2>
              <button onClick={() => setShowArchivedModal(false)} className="text-slate-400 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 space-y-3 custom-scrollbar">
              {archivedTasks.length === 0 ? (
                <p className="text-slate-400 text-center py-8">Nenhum cartão arquivado.</p>
              ) : (
                archivedTasks.map(task => (
                  <div key={task.id} className="bg-slate-800/50 border border-slate-700 p-3 rounded-lg flex items-center justify-between group hover:bg-slate-800 transition-colors">
                    <div>
                      <p className="text-slate-200 text-sm font-medium">{task.title}</p>
                      <p className="text-slate-500 text-xs mt-1">
                        Lista: {columns.find(c => c.id === task.status)?.title || 'Desconhecida'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleUnarchiveTask(task.id)}
                        className="text-slate-400 hover:text-indigo-400 p-2 rounded-md hover:bg-slate-700 transition-colors"
                        title="Restaurar Cartão"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="text-slate-400 hover:text-red-400 p-2 rounded-md hover:bg-slate-700 transition-colors"
                        title="Apagar Permanentemente"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
