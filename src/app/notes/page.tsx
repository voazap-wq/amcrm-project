
"use client";

import * as React from "react";
import Link from "next/link";
import {
  PlusCircle,
  Trash2,
  Search,
} from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase";
import { collection, doc, writeBatch, deleteDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/app/components/app-layout";
import type { KanbanColumn, KanbanTask } from "@/lib/types";

type Id = string;

type Column = KanbanColumn;
type Task = KanbanTask;


function KanbanCard({
  task,
  isOverlay,
  onUpdateTask,
  onDeleteTask,
}: {
  task: Task;
  isOverlay?: boolean;
  onUpdateTask: (id: Id, content: string) => void;
  onDeleteTask: (id: Id) => void;
}) {
  const [isEditing, setIsEditing] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
    attributes: {
      roleDescription: "Task",
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };
  
  React.useEffect(() => {
    if (isEditing && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    onUpdateTask(task.id, textareaRef.current?.value || task.content);
  }

  if (isEditing) {
    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="p-2.5 bg-card rounded-xl shadow-sm relative">
            <Textarea
                ref={textareaRef}
                defaultValue={task.content}
                onBlur={handleBlur}
                className="w-full resize-none text-sm p-0 border-none focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleBlur();
                    }
                }}
            />
        </div>
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => setIsEditing(true)}
      className={cn(
        "p-4 bg-card rounded-lg shadow-sm hover:shadow-xl transition-shadow cursor-grab relative group",
        isDragging && "opacity-50",
        isOverlay && "ring-2 ring-primary"
      )}
    >
      <p className="text-sm whitespace-pre-wrap">{task.content}</p>
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => {
          e.stopPropagation();
          onDeleteTask(task.id);
        }}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function KanbanColumn({
    column,
    tasks,
    onAddTask,
    onUpdateColumn,
    onDeleteColumn,
    onUpdateTask,
    onDeleteTask,
  }: {
    column: Column;
    tasks: Task[];
    onAddTask: (columnId: Id) => void;
    onUpdateColumn: (id: Id, data: Partial<Omit<Column, "id">>) => void;
    onDeleteColumn: (id: Id) => void;
    onUpdateTask: (id: Id, content: string) => void;
    onDeleteTask: (id: Id) => void;
  }) {
    const [isEditing, setIsEditing] = React.useState(false);
    const colorInputRef = React.useRef<HTMLInputElement>(null);

    const tasksIds = React.useMemo(() => tasks.map((task) => task.id), [tasks]);
    const { setNodeRef, attributes, listeners, isDragging, transform, transition } = useSortable({
      id: column.id,
      data: {
        type: "Column",
        column,
      },
    });

    const style = {
        transition,
        transform: CSS.Translate.toString(transform),
    };


    const handleTitleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      onUpdateColumn(column.id, { title: e.target.value });
      setIsEditing(false);
    };

    const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        } else if (e.key === 'Escape') {
            setIsEditing(false);
        }
    };
  
    if (isDragging) {
        return (
            <div ref={setNodeRef} style={style} className="w-[350px] h-full">
                <Card className="w-full h-full flex flex-col bg-secondary/50 opacity-50 border-dashed border-2 rounded-lg"></Card>
            </div>
        );
    }
  
    return (
      <div ref={setNodeRef} style={style} className="w-[350px] h-full" {...attributes}>
        <Card className="w-full h-full flex flex-col bg-muted/50 rounded-lg overflow-hidden">
          <CardHeader {...listeners} className="p-3 font-semibold text-left flex flex-row items-center justify-between gap-2 cursor-grab" style={{backgroundColor: column.color, borderColor: column.color}}>
             <div
                className="w-5 h-5 rounded-full border-2 border-white/50 cursor-pointer"
                style={{ backgroundColor: column.color }}
                onClick={() => colorInputRef.current?.click()}
             >
                <input
                    ref={colorInputRef}
                    type="color"
                    className="opacity-0 w-0 h-0"
                    value={column.color}
                    onChange={(e) => onUpdateColumn(column.id, { color: e.target.value })}
                />
            </div>
             {isEditing ? (
              <Input
                defaultValue={column.title}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                className="bg-card flex-1 h-8"
              />
            ) : (
                <span onClick={() => setIsEditing(true)} className="flex-1 cursor-text">{column.title}</span>
            )}
             <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDeleteColumn(column.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
             </Button>
          </CardHeader>
          <CardContent className="flex flex-grow flex-col gap-4 p-2 overflow-y-auto">
            <SortableContext items={tasksIds} strategy={verticalListSortingStrategy}>
              {tasks.map((task) => (
                <KanbanCard key={task.id} task={task} onUpdateTask={onUpdateTask} onDeleteTask={onDeleteTask} />
              ))}
            </SortableContext>
          </CardContent>
           <CardFooter className="p-2 border-t">
            <Button variant="ghost" className="w-full justify-start text-muted-foreground hover:text-foreground" onClick={() => onAddTask(column.id)}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Добавить карточку
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

export default function NotesPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = React.useState("");

  const columnsRef = useMemoFirebase(() => (firestore ? collection(firestore, "notesColumns") : null), [firestore]);
  const { data: fetchedColumns, isLoading: areColumnsLoading } = useCollection<Column>(columnsRef);

  const tasksRef = useMemoFirebase(() => (firestore ? collection(firestore, "notesTasks") : null), [firestore]);
  const { data: fetchedTasks, isLoading: areTasksLoading } = useCollection<Task>(tasksRef);
  
  const columns = React.useMemo(() => (fetchedColumns || []).sort((a, b) => a.order - b.order), [fetchedColumns]);
  const tasks = React.useMemo(() => (fetchedTasks || []), [fetchedTasks]);

  const filteredTasks = React.useMemo(() => {
    if (!searchTerm) return tasks;
    return tasks.filter(task =>
      task.content.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [tasks, searchTerm]);
  
  const [activeColumn, setActiveColumn] = React.useState<Column | null>(null);
  const [activeTask, setActiveTask] = React.useState<Task | null>(null);

  const columnsId = React.useMemo(() => columns.map((col) => col.id), [columns]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );

  async function createNewColumn() {
    if (!columnsRef) return;
    const maxOrder = columns.reduce((max, col) => Math.max(max, col.order), -1);
    const columnToAdd: Omit<Column, "id"> = {
      title: `Колонка ${columns.length + 1}`,
      color: "#e5e7eb",
      order: maxOrder + 1,
    };
    await addDocumentNonBlocking(columnsRef, columnToAdd);
  }
  
  async function createNewTask(columnId: Id) {
    if (!tasksRef) return;
    const tasksInColumn = tasks.filter(t => t.columnId === columnId);
    const maxOrder = tasksInColumn.reduce((max, task) => Math.max(max, task.order), -1);
    const taskToAdd: Omit<Task, "id"> = {
      columnId,
      content: `Задача ${tasks.length + 1}`,
      order: maxOrder + 1,
    };
    await addDocumentNonBlocking(tasksRef, taskToAdd);
  }
  
  function updateColumn(id: Id, data: Partial<Omit<Column, "id">>) {
    if (!firestore) return;
    const columnRef = doc(firestore, 'notesColumns', id);
    updateDocumentNonBlocking(columnRef, data);
  }
  
  function updateTask(id: Id, content: string) {
    if (!firestore) return;
    const taskRef = doc(firestore, 'notesTasks', id);
    updateDocumentNonBlocking(taskRef, { content });
  }

  async function deleteColumn(id: Id) {
    if (!firestore) return;
    // Also delete tasks in the column
    const tasksToDelete = tasks.filter(task => task.columnId === id);
    const batch = writeBatch(firestore);
    tasksToDelete.forEach(task => {
        const taskRef = doc(firestore, "notesTasks", task.id);
        batch.delete(taskRef);
    })
    const columnRef = doc(firestore, "notesColumns", id);
    batch.delete(columnRef);
    await batch.commit();
  }

  async function deleteTask(id: Id) {
    if (!firestore) return;
    const taskRef = doc(firestore, "notesTasks", id);
    await deleteDoc(taskRef);
  }


  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Column") {
      setActiveColumn(event.active.data.current.column);
      return;
    }

    if (event.active.data.current?.type === "Task") {
      setActiveTask(event.active.data.current.task);
      return;
    }
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveColumn(null);
    setActiveTask(null);

    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as Id;
    const overId = over.id as Id;

    if (activeId === overId) return;

    const isActiveAColumn = active.data.current?.type === "Column";
    if (isActiveAColumn) {
        const activeColumnIndex = columns.findIndex((col) => col.id === activeId);
        const overColumnIndex = columns.findIndex((col) => col.id === overId);
        const newOrder = arrayMove(columns, activeColumnIndex, overColumnIndex);

        if (firestore) {
            const batch = writeBatch(firestore);
            newOrder.forEach((col, index) => {
                const docRef = doc(firestore, 'notesColumns', col.id);
                batch.update(docRef, { order: index });
            });
            await batch.commit();
        }
        return;
    }

    const isActiveATask = active.data.current?.type === "Task";
    if (isActiveATask) {
      const activeIndex = tasks.findIndex((t) => t.id === activeId);
      const overIndex = tasks.findIndex((t) => t.id === overId);
      const activeTask = tasks[activeIndex];
      const overTask = tasks[overIndex];

      if (activeTask.columnId !== overTask.columnId) {
        // Different column logic is handled in onDragOver
      } else {
        // Same column
        const tasksInColumn = tasks.filter(t => t.columnId === activeTask.columnId).sort((a,b) => a.order - b.order);
        const activeTaskIndexInColumn = tasksInColumn.findIndex(t => t.id === activeId);
        const overTaskIndexInColumn = tasksInColumn.findIndex(t => t.id === overId);
        const newOrderedTasks = arrayMove(tasksInColumn, activeTaskIndexInColumn, overTaskIndexInColumn);
        
        if (firestore) {
            const batch = writeBatch(firestore);
            newOrderedTasks.forEach((task, index) => {
                const docRef = doc(firestore, 'notesTasks', task.id);
                batch.update(docRef, { order: index });
            });
            await batch.commit();
        }
      }
    }
  }
  
  async function onDragOver(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as Id;
    const overId = over.id as Id;

    if (activeId === overId) return;

    const isActiveATask = active.data.current?.type === "Task";
    if (!isActiveATask) return;

    const isOverAColumn = over.data.current?.type === "Column";
    if (isOverAColumn) {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const activeTask = tasks[activeIndex];
        if (activeTask.columnId !== overId) {
            if (firestore) {
                const taskRef = doc(firestore, 'notesTasks', activeId);
                await updateDocumentNonBlocking(taskRef, { columnId: overId });
            }
        }
    }
    
     const isOverATask = over.data.current?.type === "Task";
     if (isOverATask) {
        const activeIndex = tasks.findIndex((t) => t.id === activeId);
        const overIndex = tasks.findIndex((t) => t.id === overId);
        if (tasks[activeIndex].columnId !== tasks[overIndex].columnId) {
             if (firestore) {
                const taskRef = doc(firestore, 'notesTasks', activeId);
                await updateDocumentNonBlocking(taskRef, { columnId: tasks[overIndex].columnId });
            }
        }
     }
  }

  const isLoading = areColumnsLoading || areTasksLoading;

  return (
    <AppLayout pageTitle="Заметки">
       <div className="mb-4">
            <div className="relative w-full max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Поиск по заметкам..."
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>
        <div className="flex-1 overflow-x-auto">
          <DndContext
            sensors={sensors}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            onDragOver={onDragOver}
            collisionDetection={closestCenter}
          >
            <div className="flex gap-6 items-start h-full pb-4">
              <SortableContext items={columnsId} strategy={horizontalListSortingStrategy}>
                {columns.map((col) => (
                  <KanbanColumn
                    key={col.id}
                    column={col}
                    tasks={filteredTasks.filter((task) => task.columnId === col.id).sort((a,b) => a.order - b.order)}
                    onAddTask={createNewTask}
                    onUpdateColumn={updateColumn}
                    onDeleteColumn={deleteColumn}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                  />
                ))}
              </SortableContext>
                <Button
                    onClick={createNewColumn}
                    variant="outline"
                    className="h-auto p-4 flex flex-col gap-2 w-[350px] min-w-[350px] border-dashed hover:border-solid rounded-lg"
                >
                    <PlusCircle className="h-6 w-6 text-muted-foreground" />
                    <span className="text-sm">Добавить колонку</span>
                </Button>
            </div>

            <DragOverlay>
              {activeColumn && (
                  <KanbanColumn
                    column={activeColumn}
                    tasks={tasks.filter(
                      (task) => task.columnId === activeColumn.id
                    )}
                    onAddTask={createNewTask}
                    onUpdateColumn={updateColumn}
                    onDeleteColumn={deleteColumn}
                    onUpdateTask={updateTask}
                    onDeleteTask={deleteTask}
                  />
              )}
              {activeTask && <KanbanCard task={activeTask} isOverlay onUpdateTask={updateTask} onDeleteTask={deleteTask} />}
            </DragOverlay>
          </DndContext>
        </div>
    </AppLayout>
  );
}
