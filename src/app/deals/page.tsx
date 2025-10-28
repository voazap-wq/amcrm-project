
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Plus,
  Tag,
  Archive,
  Cloud,
  X,
  Pencil,
  Trash2,
  Check,
  Truck,
  Sun,
  Inbox,
  Calendar as CalendarIcon,
  Star,
  CheckSquare
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { collection, Timestamp, doc, serverTimestamp, where, query, arrayUnion } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DndContext, useDraggable, useDroppable, DragOverlay, DragEndEvent, DragStartEvent, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { startOfTomorrow, startOfToday, endOfToday, isToday, isFuture, isPast, format, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import type { Deal, DealList, DealTag, CustomerOrder, Product } from "@/lib/types";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { DealDetails } from "@/app/components/deal-details";
import { NewDealSheet } from "@/app/components/new-deal-sheet";
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
import { AppLayout } from "@/app/components/app-layout";


const defaultLists = [
    { name: "Входящие", icon: <Inbox className="h-5 w-5" />, id: "inbox" },
    { name: "Сегодня", icon: <Star className="h-5 w-5" />, id: "today" },
    { name: "Планы", icon: <CalendarIcon className="h-5 w-5" />, id: "plans" },
    { name: "Когда-нибудь", icon: <Cloud className="h-5 w-5" />, id: "someday" },
    { name: "Журнал", icon: <Archive className="h-5 w-5" />, id: "logbook" },
];

const newListSchema = z.object({
  name: z.string().min(1, "Название проекта не может быть пустым."),
});

type NewListFormValues = z.infer<typeof newListSchema>;

const newTagSchema = z.object({
  name: z.string().min(1, "Название тега не может быть пустым."),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Неверный формат цвета HEX."),
});

type NewTagFormValues = z.infer<typeof newTagSchema>;

type DisplayItem = (Deal & { type: 'deal' }) | ({ id: string; title: string; orderNumber: string; type: 'delivery' });


const DealItem = ({ deal, onToggleComplete, onSetDate, onSelectDeal }: { deal: Deal, onToggleComplete: (deal: Deal) => void, onSetDate: (dealId: string, date: Date | null, status?: 'someday' | null) => void, onSelectDeal: (deal: Deal) => void }) => {
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: deal.id,
        data: { deal },
    });

    const style = transform ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    } : undefined;
    
    const [isDatePickerOpen, setIsDatePickerOpen] = React.useState(false);

    const isOverdue = deal.when && isPast(deal.when.toDate()) && !isToday(deal.when.toDate());

    return (
        <div ref={setNodeRef} style={style} {...attributes} className={cn("group flex items-start gap-3 p-2 rounded-md hover:bg-gray-100/80", isDragging && "opacity-50")}>
            <button onClick={() => onToggleComplete(deal)} className="mt-0.5">
                <CheckSquare className={cn("h-5 w-5", deal.completed ? "text-blue-600" : "text-gray-300 hover:text-gray-700")}/>
            </button>
            <span className={cn("flex-1 text-base cursor-pointer", deal.completed && "line-through text-muted-foreground")} {...listeners} onClick={() => onSelectDeal(deal)}>{deal.title}</span>
            <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm" className={cn("h-7 px-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity", isOverdue && "text-red-600 opacity-100")}>
                        <CalendarIcon className="h-4 w-4 mr-1.5"/>
                        {deal.when ? (isToday(deal.when.toDate()) ? 'Сегодня' : format(deal.when.toDate(), "dd MMM", { locale: ru })) : 'Когда'}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <div className="p-2 space-y-1">
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { onSetDate(deal.id, startOfToday()); setIsDatePickerOpen(false); }}>
                            <Star className="mr-2 h-4 w-4" /> Сегодня
                         </Button>
                          <Button variant="ghost" className="w-full justify-start" onClick={() => { onSetDate(deal.id, startOfTomorrow()); setIsDatePickerOpen(false); }}>
                            <Sun className="mr-2 h-4 w-4" /> Завтра
                         </Button>
                         <Button variant="ghost" className="w-full justify-start" onClick={() => { onSetDate(deal.id, null, 'someday'); setIsDatePickerOpen(false); }}>
                            <Cloud className="mr-2 h-4 w-4" /> Когда-нибудь
                         </Button>
                    </div>
                    <Separator/>
                    <Calendar
                        mode="single"
                        selected={deal.when?.toDate()}
                        onSelect={(date) => {
                            if (date) {
                                onSetDate(deal.id, date);
                            }
                            setIsDatePickerOpen(false);
                        }}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
        </div>
    );
};

const DeliveryItem = ({ item }: { item: { id: string; title: string; orderNumber: string; } }) => {
    return (
        <div className="group flex items-start gap-3 p-2 rounded-md hover:bg-gray-100/80">
             <Truck className="h-5 w-5 mt-0.5 text-gray-400"/>
            <span className="flex-1 text-base text-muted-foreground">{item.title} (Заказ #{item.orderNumber})</span>
        </div>
    );
}

const ProjectDropZone = ({ list, children, activeListId }: { list: DealList, children: React.ReactNode, activeListId: string }) => {
    const { isOver, setNodeRef } = useDroppable({ id: list.id });
    const isActive = activeListId === list.id;

    return (
        <div ref={setNodeRef} className={cn( isOver && "bg-blue-200 rounded-md")}>
            {children}
        </div>
    );
}

const DefaultListDropZone = ({ list, children, activeListId }: { list: { id: string, name: string }, children: React.ReactNode, activeListId: string }) => {
    const { isOver, setNodeRef } = useDroppable({ id: list.id });

    return (
        <div ref={setNodeRef} className={cn(isOver && "bg-blue-200 rounded-md")}>
            {children}
        </div>
    );
};

const TagDropZone = ({ tag, children }: { tag: DealTag, children: React.ReactNode }) => {
  const { isOver, setNodeRef } = useDroppable({ id: tag.id, data: { type: 'tag' } });

  return (
    <div ref={setNodeRef} className={cn(isOver && "bg-blue-200 rounded-md")}>
      {children}
    </div>
  );
};

export default function DealsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();
  
  const [activeListId, setActiveListId] = React.useState<string>("today");
  const [isListDialogOpen, setIsListDialogOpen] = React.useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = React.useState(false);
  const [editingTag, setEditingTag] = React.useState<DealTag | null>(null);
  const [draggingDeal, setDraggingDeal] = React.useState<Deal | null>(null);
  const [selectedDeal, setSelectedDeal] = React.useState<Deal | null>(null);
  const [isNewDealSheetOpen, setIsNewDealSheetOpen] = React.useState(false);

  const dealsRef = useMemoFirebase(() => (firestore ? collection(firestore, "deals") : null), [firestore]);
  const { data: deals, isLoading: areDealsLoading } = useCollection<Deal>(dealsRef);

  const dealListsRef = useMemoFirebase(() => (firestore ? collection(firestore, "dealLists") : null), [firestore]);
  const { data: dealLists, isLoading: areDealListsLoading } = useCollection<DealList>(dealListsRef);

  const dealTagsRef = useMemoFirebase(() => (firestore ? collection(firestore, "dealTags") : null), [firestore]);
  const { data: dealTags, isLoading: areDealTagsLoading } = useCollection<DealTag>(dealTagsRef);

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<CustomerOrder>(ordersRef);
  
  const isLoading = areDealsLoading || areDealListsLoading || areDealTagsLoading || areOrdersLoading;

  const listForm = useForm<NewListFormValues>({
    resolver: zodResolver(newListSchema),
    defaultValues: { name: "" },
  });
  
  const tagForm = useForm<NewTagFormValues>({
    resolver: zodResolver(newTagSchema),
  });

  React.useEffect(() => {
    if (editingTag) {
      tagForm.reset({ name: editingTag.name, color: editingTag.color });
    } else {
      tagForm.reset({ name: "", color: "#475569" });
    }
  }, [editingTag, tagForm]);


  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 10,
      },
    })
  );
  
  const filteredItems: DisplayItem[] = React.useMemo(() => {
    let combinedList: DisplayItem[] = [];

    // Filter deals
    if (deals) {
        let filtered: Deal[] = [];
        switch (activeListId) {
            case 'inbox':
                filtered = deals.filter(d => !d.listId && !d.when && d.status !== 'someday' && !d.completed);
                break;
            case 'today':
                filtered = deals.filter(d => {
                  if (d.completed) return false;
                  if (d.when) {
                    const dealDate = d.when.toDate();
                    // Show today's tasks and overdue tasks
                    return isToday(dealDate) || isPast(dealDate);
                  }
                  return false;
                });
                break;
            case 'plans':
                filtered = deals.filter(d => {
                  if (d.completed) return false;
                  if (d.when) {
                    const dealDate = d.when.toDate();
                    return isFuture(dealDate) && !isToday(dealDate);
                  }
                  return false;
                });
                break;
            case 'someday':
                filtered = deals.filter(d => d.status === 'someday' && !d.completed);
                break;
            case 'logbook':
                filtered = deals.filter(d => d.completed);
                break;
            default: // A project is selected
                filtered = deals.filter(d => d.listId === activeListId && !d.completed);
                break;
        }
        combinedList.push(...filtered.map(d => ({ ...d, type: 'deal' as const })));
    }

    // Filter deliveries for 'Today'
    if (activeListId === 'today' && orders) {
        const todayDeliveries = orders.flatMap(order => 
            (order.items || [])
                .filter(item => {
                    if (item.status === 'Отказ' || item.term === null || item.term === undefined) return false;
                    const deliveryDate = addDays(order.createdAt.toDate(), item.term!);
                    return isToday(deliveryDate);
                })
                .map(item => ({
                    id: `${order.id}-${item.id}`,
                    title: item.name,
                    orderNumber: order.orderNumber,
                    type: 'delivery' as const,
                }))
        );
        combinedList.push(...todayDeliveries);
    }
    
    // Filter deliveries for 'Plans'
    if (activeListId === 'plans' && orders) {
        const futureDeliveries = orders.flatMap(order => 
            (order.items || [])
                .filter(item => {
                    if (item.status === 'Отказ' || item.term === null || item.term === undefined) return false;
                    const deliveryDate = addDays(order.createdAt.toDate(), item.term!);
                    // isFuture but not isToday
                    return isFuture(deliveryDate) && !isToday(deliveryDate);
                })
                .map(item => ({
                    id: `${order.id}-${item.id}`,
                    title: item.name,
                    orderNumber: order.orderNumber,
                    type: 'delivery' as const,
                }))
        );
        combinedList.push(...futureDeliveries);
    }
    
    // Sort deals by order, but keep deliveries separate or at the end maybe?
    // For now, deals are sorted, deliveries are appended.
    if (deals) {
      combinedList.sort((a, b) => {
        if (a.type === 'deal' && b.type === 'deal') {
            return (a.order || 0) - (b.order || 0);
        }
        return 0; // Keep relative order of deals and deliveries for now
      });
    }

    return combinedList;

  }, [deals, orders, activeListId]);
  
  const { todayItems, overdueItems } = React.useMemo(() => {
    if (activeListId !== 'today') {
      return { todayItems: filteredItems, overdueItems: [] };
    }
    
    const today: DisplayItem[] = [];
    const overdue: DisplayItem[] = [];

    filteredItems.forEach(item => {
      if (item.type === 'deal' && item.when && isPast(item.when.toDate()) && !isToday(item.when.toDate())) {
        overdue.push(item);
      } else {
        today.push(item);
      }
    });

    return { todayItems: today, overdueItems: overdue };
  }, [filteredItems, activeListId]);
  
  const handleToggleComplete = (deal: Deal) => {
    if (!firestore) return;
    const dealRef = doc(firestore, 'deals', deal.id);
    const isCompleted = !deal.completed;
    
    updateDocumentNonBlocking(dealRef, {
        completed: isCompleted,
        status: isCompleted ? 'logbook' : null,
        when: isCompleted ? deal.when : (deal.status === 'someday' ? null : deal.when),
        updatedAt: Timestamp.now(),
    });
    
    toast({
        title: isCompleted ? "Дело завершено" : "Дело возвращено в работу",
        description: `"${deal.title}"`,
    });
  };

  const handleCreateList = (data: NewListFormValues) => {
    if (!dealListsRef) return;
    const maxOrder = dealLists ? Math.max(-1, ...dealLists.map(l => l.order || 0)) : -1;
    
    addDocumentNonBlocking(dealListsRef, {
        name: data.name,
        order: maxOrder + 1
    });
    listForm.reset();
    setIsListDialogOpen(false);
  };

  const handleSaveTag = (data: NewTagFormValues) => {
    if (!dealTagsRef) return;
    if (editingTag) {
      updateDocumentNonBlocking(doc(firestore!, "dealTags", editingTag.id), data);
      toast({ title: "Тег обновлен" });
    } else {
      addDocumentNonBlocking(dealTagsRef, data);
      toast({ title: "Тег создан" });
    }
    setEditingTag(null);
    setIsTagDialogOpen(false);
  };

  const handleDeleteTag = (tagId: string) => {
    if (!firestore) return;
    deleteDocumentNonBlocking(doc(firestore, "dealTags", tagId));
    toast({ title: "Тег удален" });
  };
  
  const handleDragStart = (event: DragStartEvent) => {
    if (event.active.data.current?.deal) {
        setDraggingDeal(event.active.data.current.deal);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDraggingDeal(null);
    const { active, over } = event;

    if (over && active.id !== over.id) {
        const dealId = active.id as string;
        const overId = over.id as string;
        const dealRef = doc(firestore!, "deals", dealId);
        
        const isProject = dealLists?.find(l => l.id === overId);
        const isDefaultList = defaultLists.find(l => l.id === overId);
        const isTag = over.data.current?.type === 'tag';

        let updateData: Partial<Deal> = { updatedAt: Timestamp.now() };

        if (isTag) {
            updateData.tags = arrayUnion(overId);
            updateDocumentNonBlocking(dealRef, updateData);
            toast({ title: "Тег добавлен к делу" });
            return;
        }

        if (isProject) {
            updateData.listId = overId;
            updateData.status = null;
            updateData.when = null;
        } else if (isDefaultList) {
             updateData.listId = null; 
             updateData.status = null;
             updateData.when = null;

            if (overId === 'today') {
                updateData.when = Timestamp.fromDate(startOfToday());
            } else if (overId === 'plans') {
                updateData.when = Timestamp.fromDate(startOfTomorrow());
            } else if (overId === 'someday') {
                updateData.status = 'someday';
            }
        }
        
        updateDocumentNonBlocking(dealRef, updateData);
        toast({ title: "Дело перемещено", description: `Статус дела обновлен.` });
    }
  };
  
  const handleSetDate = (dealId: string, date: Date | null, status: 'someday' | null = null) => {
    if (!firestore) return;
    const dealRef = doc(firestore, 'deals', dealId);
    
    const updateData: Partial<Deal> = {
        updatedAt: Timestamp.now(),
    };
    
    if (date) {
        updateData.when = Timestamp.fromDate(date);
        updateData.status = null;
    } else if (status === 'someday') {
        updateData.when = null;
        updateData.status = 'someday';
    } else {
        updateData.when = null;
        updateData.status = null;
    }
    
    updateDocumentNonBlocking(dealRef, updateData);
    toast({ title: "Дата обновлена" });
  };


  return (
    <AppLayout pageTitle="Дела">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd} collisionDetection={closestCenter}>
            <div className="h-full grid grid-cols-1 md:grid-cols-[280px_1fr] lg:grid-cols-[280px_1fr_400px]">
                {/* Secondary Sidebar for Deals */}
                <div className="h-full border-r flex-col bg-gray-50/50 hidden md:flex">
                    <div className="p-4">
                        <h2 className="text-xl font-bold text-gray-800">Дела</h2>
                    </div>
                    <div className="flex-1 px-2 overflow-y-auto">
                        <nav className="space-y-1">
                            {defaultLists.map(list => (
                                <DefaultListDropZone key={list.id} list={list} activeListId={activeListId}>
                                    <Button 
                                        variant="ghost" 
                                        className={cn(
                                            "w-full justify-start text-base h-10",
                                            activeListId === list.id && "bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700 [&_svg]:text-blue-700"
                                        )} 
                                        onClick={() => { setActiveListId(list.id); setSelectedDeal(null); }}
                                    >
                                        <span className="mr-3">{list.icon}</span>
                                        <span className="text-sm">{list.name}</span>
                                    </Button>
                                </DefaultListDropZone>
                            ))}
                              <Button
                                variant="ghost"
                                asChild
                                className={cn("w-full justify-start text-base h-10")}
                              >
                                <Link href="/delivery-calendar">
                                  <CalendarIcon className="h-5 w-5 mr-3"/>
                                  <span className="text-sm">Календарь</span>
                                </Link>
                              </Button>
                        </nav>
                        <Separator className="my-4"/>
                        <h3 className="text-xs font-semibold text-muted-foreground px-4 mb-2">ПРОЕКТЫ</h3>
                        <nav className="space-y-1">
                            {dealLists?.map(list => (
                                <ProjectDropZone key={list.id} list={list} activeListId={activeListId}>
                                    <Button 
                                        variant="ghost" 
                                        className={cn(
                                            "w-full justify-start text-base h-10",
                                            activeListId === list.id && "bg-blue-100 text-blue-700 hover:bg-blue-100 hover:text-blue-700 [&_svg]:text-blue-700"
                                        )} 
                                        onClick={() => { setActiveListId(list.id); setSelectedDeal(null); }}
                                    >
                                        <CheckSquare className="h-5 w-5 mr-3" />
                                        <span className="text-sm">{list.name}</span>
                                    </Button>
                                </ProjectDropZone>
                            ))}
                            <Dialog open={isListDialogOpen} onOpenChange={setIsListDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="ghost" className="w-full justify-start text-muted-foreground h-10">
                                        <Plus className="mr-3 h-4 w-4"/>
                                        <span className="text-sm">Новый проект</span>
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>Новый проект</DialogTitle>
                                        <DialogDescription>
                                            Введите название для нового проекта.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <Form {...listForm}>
                                        <form onSubmit={listForm.handleSubmit(handleCreateList)} className="space-y-4">
                                            <FormField
                                                control={listForm.control}
                                                name="name"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Название проекта</FormLabel>
                                                        <FormControl>
                                                            <Input {...field} placeholder="Например, Запуск нового сайта" />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <DialogFooter>
                                                <DialogClose asChild>
                                                    <Button type="button" variant="ghost">Отмена</Button>
                                                </DialogClose>
                                                <Button type="submit">Создать проект</Button>
                                            </DialogFooter>
                                        </form>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        </nav>
                        <Separator className="my-4"/>
                        <h3 className="text-xs font-semibold text-muted-foreground px-4 mb-2">ТЕГИ</h3>
                        <nav className="space-y-1">
                          {dealTags?.map(tag => (
                            <TagDropZone key={tag.id} tag={tag}>
                              <div className="group flex items-center justify-between hover:bg-gray-100/80 rounded-md">
                                <Button
                                  variant="ghost"
                                  className="w-full justify-start text-base h-10"
                                >
                                  <span className="h-3 w-3 rounded-full mr-3" style={{ backgroundColor: tag.color }}></span>
                                  <span className="text-sm">{tag.name}</span>
                                </Button>
                                <div className="pr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Dialog open={editingTag?.id === tag.id && isTagDialogOpen} onOpenChange={(open) => { if (!open) setEditingTag(null); setIsTagDialogOpen(open); }}>
                                    <DialogTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditingTag(tag); setIsTagDialogOpen(true); }}>
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </DialogTrigger>
                                     <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive">
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Удалить тег "{tag.name}"?</AlertDialogTitle>
                                          <AlertDialogDescription>Это действие невозможно отменить.</AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Отмена</AlertDialogCancel>
                                          <AlertDialogAction onClick={() => handleDeleteTag(tag.id)}>Удалить</AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  </Dialog>
                                </div>
                              </div>
                            </TagDropZone>
                          ))}
                          <Dialog open={isTagDialogOpen && !editingTag} onOpenChange={(open) => { if (!open) setEditingTag(null); setIsTagDialogOpen(open); }}>
                            <DialogTrigger asChild>
                              <Button variant="ghost" className="w-full justify-start text-muted-foreground h-10">
                                <Plus className="mr-3 h-4 w-4" />
                                <span className="text-sm">Новый тег</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Новый тег</DialogTitle>
                              </DialogHeader>
                              <Form {...tagForm}>
                                <form onSubmit={tagForm.handleSubmit(handleSaveTag)} className="space-y-4">
                                  <FormField control={tagForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Название тега</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField control={tagForm.control} name="color" render={({ field }) => ( <FormItem> <FormLabel>Цвет</FormLabel> <FormControl> <Input type="color" {...field} className="w-full h-10 p-1"/> </FormControl> <FormMessage /> </FormItem> )} />
                                    <FormField control={tagForm.control} name="color" render={({ field }) => ( <FormItem> <FormLabel>HEX</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                                  </div>
                                  <DialogFooter>
                                    <DialogClose asChild>
                                      <Button type="button" variant="ghost">Отмена</Button>
                                    </DialogClose>
                                    <Button type="submit">Создать</Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          {editingTag && (
                             <Dialog open={isTagDialogOpen && !!editingTag} onOpenChange={(open) => { if (!open) setEditingTag(null); setIsTagDialogOpen(open); }}>
                               <DialogContent>
                                 <DialogHeader>
                                   <DialogTitle>Редактировать тег</DialogTitle>
                                 </DialogHeader>
                                 <Form {...tagForm}>
                                   <form onSubmit={tagForm.handleSubmit(handleSaveTag)} className="space-y-4">
                                     <FormField control={tagForm.control} name="name" render={({ field }) => ( <FormItem> <FormLabel>Название тега</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                                      <div className="grid grid-cols-2 gap-4">
                                        <FormField control={tagForm.control} name="color" render={({ field }) => ( <FormItem> <FormLabel>Цвет</FormLabel> <FormControl> <Input type="color" {...field} className="w-full h-10 p-1"/> </FormControl> <FormMessage /> </FormItem> )} />
                                        <FormField control={tagForm.control} name="color" render={({ field }) => ( <FormItem> <FormLabel>HEX</FormLabel> <FormControl> <Input {...field} /> </FormControl> <FormMessage /> </FormItem> )} />
                                      </div>
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
                          )}
                        </nav>
                    </div>
                </div>
                {/* Main content */}
                <div className="p-6 h-full flex flex-col">
                    <h1 className="text-2xl font-bold mb-4">{defaultLists.find(l => l.id === activeListId)?.name || dealLists?.find(l => l.id === activeListId)?.name}</h1>
                    <div className="flex-1 space-y-2 overflow-y-auto">
                        {todayItems.map(item =>
                            item.type === 'deal' ? (
                                <DealItem key={item.id} deal={item} onToggleComplete={handleToggleComplete} onSetDate={handleSetDate} onSelectDeal={setSelectedDeal} />
                            ) : (
                                <DeliveryItem key={item.id} item={item} />
                            )
                        )}
                        
                        {overdueItems.length > 0 && (
                            <>
                                <Separator className="my-4" />
                                {overdueItems.map(item => 
                                    item.type === 'deal' && (
                                        <DealItem key={item.id} deal={item} onToggleComplete={handleToggleComplete} onSetDate={handleSetDate} onSelectDeal={setSelectedDeal} />
                                    )
                                )}
                            </>
                        )}
                    </div>
                </div>
                {/* Deal Details */}
                <div className={cn("h-full border-l bg-gray-50/50 transition-all duration-300", selectedDeal ? "w-full lg:w-[400px]" : "w-0 hidden")}>
                    {selectedDeal && (
                        <DealDetails
                            key={selectedDeal.id}
                            deal={selectedDeal}
                            onClose={() => setSelectedDeal(null)}
                            onUpdate={(updatedDeal) => updateDocumentNonBlocking(doc(firestore!, 'deals', selectedDeal.id), updatedDeal)}
                        />
                    )}
                </div>
                
                <NewDealSheet 
                    isOpen={isNewDealSheetOpen} 
                    onOpenChange={setIsNewDealSheetOpen}
                    activeListId={activeListId}
                />
            </div>
        </DndContext>
    </AppLayout>
  );
}
