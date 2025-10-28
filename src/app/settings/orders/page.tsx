
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Trash2, Pencil, Wand2, Info, GripVertical } from "lucide-react";
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
import type { OrderStatusDefinition, ItemStatus } from "@/lib/types";
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
} from "@/components/ui/alert-dialog"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const statusFormSchema = z.object({
  name: z.string().min(1, "Название статуса обязательно."),
  color: z.string().min(1, "Выберите цвет.").refine(color => /^#[0-9A-F]{6}$/i.test(color), {
    message: "Цвет должен быть в формате HEX (например, #RRGGBB)"
  }),
});

type StatusFormValues = z.infer<typeof statusFormSchema>;

type ItemStatusForm = { id: string; name: string; color: string; };

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


function StatusDialog({ status, onSave, children, collectionName, maxOrder }: { status?: ItemStatusForm, onSave: (data: StatusFormValues, id?: string) => void, children: React.ReactNode, collectionName: string, maxOrder: number }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<StatusFormValues>({
        resolver: zodResolver(statusFormSchema),
        defaultValues: status ? { name: status.name, color: status.color } : { name: "", color: "#ffffff" },
    });
    
    React.useEffect(() => {
        if (isOpen) {
            form.reset(status ? { name: status.name, color: status.color } : { name: "", color: "#ffffff" });
        }
    }, [isOpen, status, form]);

    const handleSubmit = (data: StatusFormValues) => {
        onSave(data, status?.id);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{status ? 'Редактировать статус' : `Добавить новый статус`}</DialogTitle>
                    <DialogDescription>{status ? 'Измените название или цвет статуса.' : `Создайте новый статус.`}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField
                            control={form.control}
                            name="color"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Цвет</FormLabel>
                                    <div className="flex items-center gap-2">
                                        <FormControl><Input type="color" {...field} className="w-12 h-10 p-1" /></FormControl>
                                        <FormControl><Input type="text" {...field} placeholder="#ffffff" /></FormControl>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Отмена</Button></DialogClose>
                            <Button type="submit">{status ? 'Сохранить' : 'Добавить'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function OrderSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const itemStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'itemStatuses') : null, [firestore]);
  const { data: initialItemStatuses, isLoading: isItemStatusesLoading } = useCollection<ItemStatus>(itemStatusesRef);

  const orderStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'orderStatuses') : null, [firestore]);
  const { data: initialOrderStatuses, isLoading: isOrderStatusesLoading } = useCollection<OrderStatusDefinition>(orderStatusesRef);

  const [itemStatuses, setItemStatuses] = React.useState<ItemStatus[]>([]);
  const [orderStatuses, setOrderStatuses] = React.useState<OrderStatusDefinition[]>([]);
  
  const sortStatuses = <T extends { order?: number }>(a: T, b: T) => (a.order ?? 999) - (b.order ?? 999);

  React.useEffect(() => {
    if (initialItemStatuses) setItemStatuses([...initialItemStatuses].sort(sortStatuses));
  }, [initialItemStatuses]);
  
  React.useEffect(() => {
    if (initialOrderStatuses) setOrderStatuses([...initialOrderStatuses].sort(sortStatuses));
  }, [initialOrderStatuses]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent, type: 'item' | 'order') => {
      const {active, over} = event;

      if (over && active.id !== over.id) {
          const updateOrder = <T extends { id: string }>(setter: React.Dispatch<React.SetStateAction<T[]>>, collectionName: string) => {
              setter((items) => {
                  const oldIndex = items.findIndex((item) => item.id === active.id);
                  const newIndex = items.findIndex((item) => item.id === over.id);
                  const newItems = arrayMove(items, oldIndex, newIndex);

                  if (firestore) {
                      const batch = writeBatch(firestore);
                      newItems.forEach((item, index) => {
                          const docRef = doc(firestore, collectionName, item.id);
                          batch.update(docRef, { order: index });
                      });
                      batch.commit().catch(e => {
                          console.error("Failed to update order:", e);
                          toast({ variant: "destructive", title: "Не удалось сохранить порядок" });
                      });
                  }
                  
                  return newItems;
              });
          };

          if (type === 'item') {
              updateOrder(setItemStatuses, 'itemStatuses');
          } else {
              updateOrder(setOrderStatuses, 'orderStatuses');
          }
      }
  };

  const isLoading = isItemStatusesLoading || isOrderStatusesLoading;

  const handleSaveStatus = (collectionName: 'itemStatuses' | 'orderStatuses', maxOrder: number) => (data: StatusFormValues, id?: string) => {
    if (!firestore) return;
    
    if (id) {
        const ref = doc(firestore, collectionName, id);
        updateDocumentNonBlocking(ref, data);
        toast({ variant: "success", title: "Статус обновлен" });
    } else {
        const ref = collection(firestore, collectionName);
        addDocumentNonBlocking(ref, { ...data, order: maxOrder + 1 });
        toast({ variant: "success", title: "Статус добавлен" });
    }
  };
  
  const handleDeleteStatus = (collectionName: 'itemStatuses' | 'orderStatuses') => async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, collectionName, id));
      toast({ variant: "info", title: "Статус удален" });
    } catch (error) {
      console.error(`Error deleting status from ${collectionName}: `, error);
      toast({ variant: "destructive", title: "Ошибка при удалении статуса" });
    }
  };

  const handleTriggerChange = (orderStatusId: string, triggerStatusId: string) => {
    if (!firestore) return;
    const statusRef = doc(firestore, "orderStatuses", orderStatusId);
    updateDocumentNonBlocking(statusRef, { triggerStatusId: triggerStatusId === 'none' ? null : triggerStatusId });
    toast({ variant: "info", title: "Зависимость обновлена" });
  };
  
  const maxItemOrderStatus = Math.max(...itemStatuses.map(s => s.order ?? 0));
  const maxOrderStatus = Math.max(...orderStatuses.map(s => s.order ?? 0));


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Назад</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Настройки статусов заказов
              </h1>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>1. Статусы позиций</CardTitle>
                        <CardDescription>Это статусы для каждой отдельной детали в заказе.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {isItemStatusesLoading ? <Skeleton className="h-20 w-full"/> : (
                            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'item')}>
                                <SortableContext items={itemStatuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                    {itemStatuses?.map((status) => (
                                        <SortableItem key={status.id} id={status.id}>
                                            <DraggableStatusRow status={status} listeners={null}>
                                                <StatusDialog status={status} onSave={(data, id) => handleSaveStatus('itemStatuses', maxItemOrderStatus)(data, id)} collectionName="itemStatuses" maxOrder={maxItemOrderStatus}>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                                </StatusDialog>
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Это действие необратимо. Статус будет навсегда удален.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteStatus('itemStatuses')(status.id)}>Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                </AlertDialog>
                                            </DraggableStatusRow>
                                        </SortableItem>
                                    ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                        <StatusDialog onSave={(data) => handleSaveStatus('itemStatuses', maxItemOrderStatus)(data)} collectionName="itemStatuses" maxOrder={maxItemOrderStatus}>
                             <Button variant="outline" className="w-full mt-2"><PlusCircle className="h-4 w-4 mr-2" />Добавить статус позиции</Button>
                        </StatusDialog>
                    </CardContent>
                </Card>
                 <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle>2. Статусы заказа</CardTitle>
                        <CardDescription>Создайте или отредактируйте общие статусы для заказов.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2">
                         {isOrderStatusesLoading ? <Skeleton className="h-20 w-full"/> : (
                             <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, 'order')}>
                                <SortableContext items={orderStatuses.map(s => s.id)} strategy={verticalListSortingStrategy}>
                                    <div className="space-y-1">
                                    {orderStatuses?.map((status) => (
                                       <SortableItem key={status.id} id={status.id}>
                                            <DraggableStatusRow status={status} listeners={null}>
                                               <StatusDialog status={status} onSave={(data, id) => handleSaveStatus('orderStatuses', maxOrderStatus)(data, id)} collectionName="orderStatuses" maxOrder={maxOrderStatus}>
                                                   <Button variant="ghost" size="icon" className="h-8 w-8"><Pencil className="h-4 w-4" /></Button>
                                               </StatusDialog>
                                               <AlertDialog>
                                                    <AlertDialogTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button></AlertDialogTrigger>
                                                    <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Это действие необратимо. Статус будет навсегда удален.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => handleDeleteStatus('orderStatuses')(status.id)}>Удалить</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
                                                </AlertDialog>
                                            </DraggableStatusRow>
                                       </SortableItem>
                                    ))}
                                    </div>
                                </SortableContext>
                            </DndContext>
                        )}
                        <StatusDialog onSave={(data) => handleSaveStatus('orderStatuses', maxOrderStatus)(data)} collectionName="orderStatuses" maxOrder={maxOrderStatus}>
                             <Button variant="outline" className="w-full mt-2"><PlusCircle className="h-4 w-4 mr-2" />Добавить статус заказа</Button>
                        </StatusDialog>
                    </CardContent>
                </Card>
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Wand2 className="h-5 w-5 text-primary"/> 3. Зависимость статусов</CardTitle>
                        <CardDescription>Укажите, какой статус позиции должен автоматически менять статус всего заказа.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? <Skeleton className="h-24 w-full" /> : (
                            <div className="space-y-2">
                                {orderStatuses && orderStatuses.length > 0 ? (
                                    orderStatuses.map((status) => (
                                    <div key={status.id} className="grid grid-cols-2 items-center justify-between rounded-lg border bg-background p-3 gap-4">
                                        <div className="flex items-center gap-3">
                                            <div className="h-6 w-6 rounded-full border" style={{ backgroundColor: status.color }} />
                                            <p className="font-medium">{status.name}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Select value={status.triggerStatusId || 'none'} onValueChange={(value) => handleTriggerChange(status.id, value)}>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Выберите триггер..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Нет триггера</SelectItem>
                                                    {itemStatuses?.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-muted-foreground text-center py-4">Сначала добавьте статусы заказа.</p>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
             <Card className="bg-blue-50 border-blue-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-blue-900"><Info className="h-5 w-5"/> 4. Итог (Как это будет работать)</CardTitle>
                </CardHeader>
                <CardContent className="text-blue-800 text-sm space-y-2">
                    <p>Система зависимостей позволяет автоматизировать рутинные действия. Вот как это работает:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Вы создаете статус заказа (например, "В работе").</li>
                        <li>В секции "Зависимость статусов" вы выбираете для него статус-триггер (например, "Ожидает поступления").</li>
                        <li>Теперь, когда <strong>все товары</strong> в заказе получат статус "Ожидает поступления", статус всего заказа <strong>автоматически изменится</strong> на "В работе".</li>
                        <li>Если для статуса заказа не выбран триггер ("Нет триггера"), его можно будет изменить только вручную на странице заказа.</li>
                    </ul>
                </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

    
