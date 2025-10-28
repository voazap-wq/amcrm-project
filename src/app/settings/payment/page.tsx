
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Trash2, Pencil, GripVertical } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, writeBatch } from "firebase/firestore";
import type { PaymentStatusDefinition } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const statusFormSchema = z.object({
  name: z.string().min(1, "Название статуса обязательно."),
  color: z.string().min(1, "Выберите цвет.").refine(color => /^#[0-9A-F]{6}$/i.test(color), {
    message: "Цвет должен быть в формате HEX (например, #RRGGBB)"
  }),
});

type StatusFormValues = z.infer<typeof statusFormSchema>;

function SortableItem({ id, children }: { id: string, children: React.ReactNode }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({id});

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : 'auto',
        boxShadow: isDragging ? '0 4px 8px rgba(0,0,0,0.1)' : 'none',
    };
    
    const childrenWithProps = React.Children.map(children, child => {
        if (React.isValidElement(child)) {
            return React.cloneElement(child, { listeners } as any);
        }
        return child;
    });

    return (
        <div ref={setNodeRef} style={style} {...attributes} className="bg-background group">
            {childrenWithProps}
        </div>
    );
}

const DraggableStatusRow = ({ status, listeners, children }: { status: {id: string, name: string, color: string}, listeners: any, children: React.ReactNode }) => {
    return (
         <div className="flex items-center justify-between p-2 pr-1 border rounded-lg">
             <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" className="cursor-grab h-8 w-8" {...listeners}>
                    <GripVertical className="h-5 w-5 text-muted-foreground group-hover:text-foreground" />
                </Button>
                <div className={cn("h-4 w-4 rounded-full border")} style={{backgroundColor: status.color}}/>
                <span className="font-medium text-sm">{status.name}</span>
            </div>
            <div className="flex items-center">
                {children}
            </div>
        </div>
    );
};


function EditStatusDialog({ status, children, onSave }: { status: PaymentStatusDefinition, children: React.ReactNode, onSave: (data: StatusFormValues) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<StatusFormValues>({
        resolver: zodResolver(statusFormSchema),
        defaultValues: {
            name: status.name,
            color: status.color,
        },
    });
    
    React.useEffect(() => {
        if (isOpen) {
            form.reset({
                name: status.name,
                color: status.color,
            });
        }
    }, [isOpen, status, form]);

    const handleEditSubmit = (data: StatusFormValues) => {
        onSave(data);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Редактировать статус</DialogTitle>
                    <DialogDescription>Измените название или цвет статуса.</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Название</FormLabel>
                                    <FormControl>
                                        <Input {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Цвет</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <FormControl>
                                            <Input type="color" {...field} className="w-12 h-10 p-1" />
                                        </FormControl>
                                        <FormControl>
                                            <Input type="text" {...field} placeholder="#ffffff" />
                                        </FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Отмена</Button>
                            </DialogClose>
                            <Button type="submit">Сохранить</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function PaymentSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const paymentStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'paymentStatuses') : null, [firestore]);
  const { data: initialStatuses, isLoading } = useCollection<PaymentStatusDefinition>(paymentStatusesRef);
  
  const [statuses, setStatuses] = React.useState<PaymentStatusDefinition[]>([]);
  
  const sortStatuses = (a: PaymentStatusDefinition, b: PaymentStatusDefinition) => (a.order ?? 999) - (b.order ?? 999);

  React.useEffect(() => {
    if (initialStatuses) {
      setStatuses([...initialStatuses].sort(sortStatuses));
    }
  }, [initialStatuses]);

  const form = useForm<StatusFormValues>({
    resolver: zodResolver(statusFormSchema),
    defaultValues: {
      name: "",
      color: "#ffffff",
    },
  });
  
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
      const {active, over} = event;
      if (over && active.id !== over.id) {
          setStatuses((items) => {
              const oldIndex = items.findIndex((item) => item.id === active.id);
              const newIndex = items.findIndex((item) => item.id === over.id);
              const newItems = arrayMove(items, oldIndex, newIndex);

              if (firestore) {
                  const batch = writeBatch(firestore);
                  newItems.forEach((item, index) => {
                      const docRef = doc(firestore, 'paymentStatuses', item.id);
                      batch.update(docRef, { order: index });
                  });
                  batch.commit().catch(e => {
                      console.error("Failed to update order:", e);
                      toast({ variant: "destructive", title: "Не удалось сохранить порядок" });
                  });
              }
              
              return newItems;
          });
      }
  };

  const onSubmit = (data: StatusFormValues) => {
    if (!paymentStatusesRef) return;
    const maxOrder = Math.max(-1, ...statuses.map(s => s.order ?? 0));
    addDocumentNonBlocking(paymentStatusesRef, { ...data, order: maxOrder + 1 });
    toast({ variant: "success", title: "Статус добавлен" });
    form.reset({ name: "", color: "#ffffff"});
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "paymentStatuses", id));
      toast({ variant: "info", title: "Статус удален" });
    } catch (error) {
      console.error("Error deleting status: ", error);
      toast({ variant: "destructive", title: "Ошибка при удалении статуса" });
    }
  };
  
  const handleEdit = (id: string, data: StatusFormValues) => {
    if (!firestore) return;
    const statusRef = doc(firestore, "paymentStatuses", id);
    updateDocumentNonBlocking(statusRef, data);
    toast({ variant: "success", title: "Статус обновлен" });
  };


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid w-full max-w-4xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Назад</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Настройки статусов оплат
              </h1>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                <CardHeader>
                    <CardTitle>Добавить новый статус</CardTitle>
                    <CardDescription>
                        Создайте новый статус для использования в заказах.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Название</FormLabel>
                                        <FormControl>
                                            <Input {...field} placeholder="Например: Оплачено" />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                             <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Цвет</FormLabel>
                                        <div className="flex items-center gap-2">
                                            <FormControl>
                                                <Input type="color" {...field} className="w-12 h-10 p-1" />
                                            </FormControl>
                                            <FormControl>
                                                <Input type="text" {...field} placeholder="#ffffff" />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" className="w-full">
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Добавить статус
                            </Button>
                        </form>
                    </Form>
                </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Существующие статусы</CardTitle>
                        <CardDescription>
                        Список всех доступных статусов оплат.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : (
                        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                            <SortableContext items={statuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                <div className="space-y-1">
                                    {statuses && statuses.length > 0 ? (
                                        statuses.map((status) => (
                                        <SortableItem key={status.id} id={status.id}>
                                           <DraggableStatusRow status={status} listeners={null}>
                                                <EditStatusDialog status={status} onSave={(data) => handleEdit(status.id, data)}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                </EditStatusDialog>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                         <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                           Это действие необратимо. Статус будет навсегда удален.
                                                        </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDelete(status.id)}>Удалить</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DraggableStatusRow>
                                        </SortableItem>
                                        ))
                                    ) : (
                                        <p className="text-sm text-muted-foreground text-center py-4">Статусы еще не созданы.</p>
                                    )}
                                </div>
                            </SortableContext>
                        </DndContext>
                        )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

    
