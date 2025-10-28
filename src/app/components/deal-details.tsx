
"use client";

import * as React from "react";
import { X, CheckSquare, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import type { Deal } from "@/lib/types";
import { cn } from "@/lib/utils";

interface DealDetailsProps {
    deal: Deal;
    onClose: () => void;
    onUpdate: (updatedDeal: Partial<Deal>) => void;
}

export function DealDetails({ deal, onClose, onUpdate }: DealDetailsProps) {
    const [title, setTitle] = React.useState(deal.title);
    const [notes, setNotes] = React.useState(deal.notes || "");
    const [checklist, setChecklist] = React.useState(deal.checklist || []);
    const [newChecklistItem, setNewChecklistItem] = React.useState("");

    const handleTitleBlur = () => {
        if (title.trim() !== deal.title) {
            onUpdate({ title: title.trim() });
        }
    };

    const handleNotesBlur = () => {
        if (notes !== (deal.notes || "")) {
            onUpdate({ notes });
        }
    };

    const handleChecklistChange = (updatedChecklist: typeof checklist) => {
        setChecklist(updatedChecklist);
        onUpdate({ checklist: updatedChecklist });
    };
    
    const handleToggleChecklistItem = (itemId: string) => {
        const updated = checklist.map(item =>
            item.id === itemId ? { ...item, completed: !item.completed } : item
        );
        handleChecklistChange(updated);
    };

    const handleAddChecklistItem = () => {
        if (newChecklistItem.trim()) {
            const newItem = {
                id: crypto.randomUUID(),
                text: newChecklistItem.trim(),
                completed: false,
            };
            const updated = [...checklist, newItem];
            handleChecklistChange(updated);
            setNewChecklistItem("");
        }
    };

    const handleDeleteChecklistItem = (itemId: string) => {
        const updated = checklist.filter(item => item.id !== itemId);
        handleChecklistChange(updated);
    };


    return (
        <div className="flex flex-col h-full bg-white">
            <div className="p-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-semibold">Детали дела</h2>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                    <X className="h-5 w-5" />
                </Button>
            </div>
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                <div className="flex items-start gap-3">
                    <CheckSquare className={cn("h-6 w-6 mt-1", deal.completed ? "text-blue-600" : "text-gray-300")}/>
                    <Input 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleTitleBlur}
                        className="text-xl font-semibold border-0 shadow-none px-0 focus-visible:ring-0"
                    />
                </div>

                <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    onBlur={handleNotesBlur}
                    placeholder="Заметки..."
                    className="min-h-[100px] border-0 shadow-none px-0 focus-visible:ring-0 text-base"
                />

                <Separator />
                
                <div>
                    <h3 className="text-md font-semibold mb-2">Чек-лист</h3>
                    <div className="space-y-2">
                        {checklist.map((item) => (
                            <div key={item.id} className="group flex items-center gap-3">
                                <button onClick={() => handleToggleChecklistItem(item.id)}>
                                    <CheckSquare className={cn("h-5 w-5", item.completed ? "text-blue-600" : "text-gray-300 hover:text-gray-700")}/>
                                </button>
                                <span className={cn("flex-1", item.completed && "line-through text-muted-foreground")}>{item.text}</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive" onClick={() => handleDeleteChecklistItem(item.id)}>
                                    <Trash2 className="h-4 w-4"/>
                                </Button>
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                         <button onClick={handleAddChecklistItem}><Plus className="h-5 w-5 text-gray-400 hover:text-gray-700"/></button>
                         <Input 
                            value={newChecklistItem}
                            onChange={(e) => setNewChecklistItem(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
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
    );
}

