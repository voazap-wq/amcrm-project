
"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { CheckSquare, Plus, Trash2, Calendar as CalendarIcon, Star, Cloud } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Deal } from "@/lib/types";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { collection, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { startOfToday, startOfTomorrow } from "date-fns";

interface NewDealSheetProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  activeListId: string;
}

export function NewDealSheet({ isOpen, onOpenChange, activeListId }: NewDealSheetProps) {
  const [title, setTitle] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [checklist, setChecklist] = React.useState<{ id: string; text: string; completed: boolean }[]>([]);
  const [newChecklistItem, setNewChecklistItem] = React.useState("");
  const [when, setWhen] = React.useState<Date | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const resetState = () => {
    setTitle("");
    setNotes("");
    setChecklist([]);
    setNewChecklistItem("");
    setWhen(null);
  };
  
  const handleOpenChange = (open: boolean) => {
    if(!open) {
        resetState();
    }
    onOpenChange(open);
  }

  const handleAddChecklistItem = () => {
    if (newChecklistItem.trim()) {
      const newItem = {
        id: crypto.randomUUID(),
        text: newChecklistItem.trim(),
        completed: false,
      };
      setChecklist([...checklist, newItem]);
      setNewChecklistItem("");
    }
  };

  const handleToggleChecklistItem = (itemId: string) => {
    setChecklist(
      checklist.map((item) =>
        item.id === itemId ? { ...item, completed: !item.completed } : item
      )
    );
  };
  
  const handleDeleteChecklistItem = (itemId: string) => {
    setChecklist(checklist.filter((item) => item.id !== itemId));
  };
  
  const handleCreateDeal = () => {
    if (!title.trim()) {
        toast({ variant: "destructive", title: "Название не может быть пустым" });
        return;
    }
    if (!firestore) {
        toast({ variant: "destructive", title: "Ошибка базы данных" });
        return;
    }
    
    const dealsRef = collection(firestore, "deals");
    
    const newDealData: Partial<Deal> = {
        title: title.trim(),
        notes: notes || "",
        checklist: checklist,
        completed: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        tags: [],
    };
    
    if (when) {
        newDealData.when = Timestamp.fromDate(when);
    }

    if (["inbox", "today", "plans", "someday", "logbook"].includes(activeListId)) {
        if (activeListId === 'today') {
            newDealData.when = Timestamp.fromDate(startOfToday());
        } else if (activeListId === 'plans') {
            newDealData.when = Timestamp.fromDate(startOfTomorrow());
        } else if (activeListId === 'someday') {
            newDealData.status = 'someday';
        }
    } else {
        newDealData.listId = activeListId;
    }
    
    addDocumentNonBlocking(dealsRef, newDealData);
    
    toast({ variant: "success", title: "Дело создано!", description: `"${newDealData.title}"` });
    handleOpenChange(false);
  }

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0">
        <SheetHeader>
          <SheetTitle className="sr-only">Новое дело</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col h-full bg-white">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="text-lg font-semibold">Новое дело</h2>
            <Button onClick={handleCreateDeal}>Создать</Button>
          </div>
          <div className="flex-1 p-6 space-y-6 overflow-y-auto">
            <div className="flex items-start gap-3">
              <CheckSquare className="h-6 w-6 mt-1 text-gray-300" />
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Название дела"
                className="text-xl font-semibold border-0 shadow-none px-0 focus-visible:ring-0"
              />
            </div>

            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Заметки..."
              className="min-h-[100px] border-0 shadow-none px-0 focus-visible:ring-0 text-base"
            />
            
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start font-normal">
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {when ? format(when, "PPP", { locale: require('date-fns/locale/ru') }) : "Выбрать дату"}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={when || undefined}
                        onSelect={(date) => setWhen(date || null)}
                    />
                </PopoverContent>
            </Popover>

            <Separator />

            <div>
              <h3 className="text-md font-semibold mb-2">Чек-лист</h3>
              <div className="space-y-2">
                {checklist.map((item) => (
                  <div key={item.id} className="group flex items-center gap-3">
                    <button onClick={() => handleToggleChecklistItem(item.id)}>
                      <CheckSquare
                        className={cn(
                          "h-5 w-5",
                          item.completed
                            ? "text-blue-600"
                            : "text-gray-300 hover:text-gray-700"
                        )}
                      />
                    </button>
                    <span
                      className={cn(
                        "flex-1",
                        item.completed && "line-through text-muted-foreground"
                      )}
                    >
                      {item.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleDeleteChecklistItem(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center gap-3">
                <button onClick={handleAddChecklistItem}>
                  <Plus className="h-5 w-5 text-gray-400 hover:text-gray-700" />
                </button>
                <Input
                  value={newChecklistItem}
                  onChange={(e) => setNewChecklistItem(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddChecklistItem();
                    }
                  }}
                  placeholder="Добавить пункт"
                  className="border-0 shadow-none px-0 focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
