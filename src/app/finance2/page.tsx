
"use client";

import * as React from "react";
import Link from "next/link";
import {
    ShoppingCart,
    Package,
    Receipt,
    Building,
    Users,
    Sliders,
    ChevronsUpDown,
    LogOut,
    Car,
    ReceiptText,
    ArrowUpRight,
    ArrowDownLeft,
    DollarSign,
    PlusCircle,
    Trash2,
    Check,
    X,
    Banknote,
    CreditCard,
    ArrowRightLeft,
    Pencil,
    Search,
    BarChart,
    Scale,
    Calendar,
    CheckSquare,
    ClipboardCheck,
    Undo2,
} from "lucide-react";
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, Timestamp, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
    Sidebar,
    SidebarContent,
    SidebarHeader,
    SidebarMenu,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from "@/components/ui/avatar";
import {
    Tooltip,
    TooltipProvider,
    TooltipTrigger,
    TooltipContent,
} from "@/components/ui/tooltip";
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
import { sidebarNav } from "@/app/page";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { CustomerOrder, Transaction, Customer, Supplier, TransactionCategory, PaymentMethod, Payment } from "@/lib/types";
import { format } from 'date-fns';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Dialog, DialogClose, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogContent } from "@/components/ui/dialog";
import { AppLayout } from "@/app/components/app-layout";

type EnrichedTransaction = {
    id: string;
    date: Timestamp;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'return' | 'transfer';
    category?: string;
    categoryId?: string;
    paymentMethodId?: string;
    counterparty?: string;
    clientId?: string;
    supplierId?: string;
    orderId?: string;
    channel?: string;
    isManual: boolean;
    isReturned?: boolean;
};

const transactionSchema = z.object({
  description: z.string().optional(),
  amount: z.coerce.number().min(0.01, "Сумма должна быть > 0"),
  categoryId: z.string().optional(),
  paymentMethodId: z.string().optional(),
  date: z.date(),
  type: z.enum(["income", "expense", "return", "transfer"], { required_error: "Выберите тип" }),
  clientId: z.string().optional(),
  supplierId: z.string().optional(),
  transferFromId: z.string().optional(),
  transferToId: z.string().optional(),
}).refine(data => {
    if (data.type === 'transfer') {
        return !!data.transferFromId && !!data.transferToId;
    }
    if (data.type === 'return') {
        return !!data.description && !!data.paymentMethodId && !!data.categoryId;
    }
    return !!data.description && !!data.categoryId && !!data.paymentMethodId;
}, {
    message: "Заполните все обязательные поля для этого типа операции.",
    path: ["type"], 
});


type TransactionFormValues = z.infer<typeof transactionSchema>;


function TransactionDialog({
    transaction,
    onSave,
    children,
    clients,
    suppliers,
    categories,
    paymentMethods
  }: {
    transaction?: EnrichedTransaction;
    onSave: (data: TransactionFormValues, id?: string) => void;
    children: React.ReactNode;
    clients?: Customer[];
    suppliers?: Supplier[];
    categories?: TransactionCategory[];
    paymentMethods?: PaymentMethod[];
  }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [openPopover, setOpenPopover] = React.useState(false);

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
    });

    React.useEffect(() => {
        if (isOpen) {
            form.reset({
                description: transaction?.description || "",
                amount: transaction ? Math.abs(transaction.amount) : undefined,
                categoryId: transaction?.categoryId || "",
                paymentMethodId: transaction?.paymentMethodId || "",
                date: transaction?.date.toDate() || new Date(),
                type: transaction?.type === 'transfer' ? undefined : (transaction?.type || undefined),
                clientId: transaction?.clientId || "",
                supplierId: transaction?.supplierId || "",
            });
        }
    }, [isOpen, transaction, form]);
    
    const transactionType = form.watch('type');

    const filteredCategories = React.useMemo(() => {
        if (!categories) return [];
        if (transactionType === 'return') {
             return categories.filter(c => c.name.toLowerCase().includes('возврат'));
        }
        if (!transactionType || transactionType === 'transfer') return categories;
        return categories.filter(c => c.type === transactionType && !c.name.toLowerCase().includes('возврат'));
    }, [categories, transactionType]);


    const handleSubmit = (data: TransactionFormValues) => {
        onSave(data, transaction?.id);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>{children}</DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Редактировать операцию</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 pt-4">
                       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="type" render={({ field }) => (
                                <FormItem><FormLabel>Тип операции</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Тип" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="income">Доход</SelectItem>
                                        <SelectItem value="expense">Расход</SelectItem>
                                        <SelectItem value="return">Возврат</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Сумма</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="1000" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="description" render={({ field }) => ( <FormItem className="sm:col-span-2"><FormLabel>Описание</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Например, аренда" /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="categoryId" render={({ field }) => (
                                <FormItem><FormLabel>Категория</FormLabel><Select onValueChange={field.onChange} value={field.value} disabled={!transactionType}><FormControl><SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger></FormControl><SelectContent>{filteredCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                           <FormItem>
                                <FormLabel>Контрагент</FormLabel>
                                <Popover open={openPopover} onOpenChange={setOpenPopover}>
                                <PopoverTrigger asChild>
                                    <FormControl>
                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !form.getValues('clientId') && !form.getValues('supplierId') && "text-muted-foreground")}>
                                        {form.getValues('clientId')
                                            ? clients?.find(c => c.id === form.getValues('clientId'))?.lastName + ' ' + clients?.find(c => c.id === form.getValues('clientId'))?.firstName
                                            : form.getValues('supplierId')
                                            ? suppliers?.find(s => s.id === form.getValues('supplierId'))?.name
                                            : "Выберите контрагента"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                    <CommandInput placeholder="Поиск контрагента..." />
                                    <CommandList>
                                        <CommandEmpty>Контрагент не найден.</CommandEmpty>
                                        <CommandGroup heading="Поставщики">
                                        {suppliers?.map(s => (
                                            <CommandItem
                                            value={s.name}
                                            key={`supplier-${s.id}`}
                                            onSelect={() => {
                                                form.setValue("supplierId", s.id);
                                                form.setValue("clientId", "");
                                                setOpenPopover(false);
                                            }}
                                            >
                                            <Check className={cn("mr-2 h-4 w-4", s.id === form.getValues('supplierId') ? "opacity-100" : "opacity-0")} />
                                            {s.name}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                        <CommandGroup heading="Клиенты">
                                        {clients?.map(c => (
                                            <CommandItem
                                            value={`${c.lastName} ${c.firstName}`}
                                            key={`client-${c.id}`}
                                            onSelect={() => {
                                                form.setValue("clientId", c.id);
                                                form.setValue("supplierId", "");
                                                setOpenPopover(false);
                                            }}
                                            >
                                            <Check className={cn("mr-2 h-4 w-4", c.id === form.getValues('clientId') ? "opacity-100" : "opacity-0")} />
                                            {c.lastName} {c.firstName}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                    </Command>
                                </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                             <FormField control={form.control} name="paymentMethodId" render={({ field }) => (
                                <FormItem><FormLabel>Способ оплаты</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Способ" /></SelectTrigger></FormControl><SelectContent>{paymentMethods?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                            )} />
                       </div>
                        <DialogFooter className="pt-4">
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Отмена</Button>
                            </DialogClose>
                            <Button type="submit">Сохранить изменения</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function Finance2Page() {
    const firestore = useFirestore();
    const { toast } = useToast();

    const [openPopover, setOpenPopover] = React.useState(false);
    const [searchTerm, setSearchTerm] = React.useState("");

    // Data fetching
    const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
    const { data: orders, isLoading: areOrdersLoading } = useCollection<CustomerOrder>(ordersRef);

    const manualTransactionsRef = useMemoFirebase(() => firestore ? collection(firestore, "transactions") : null, [firestore]);
    const { data: manualTransactions, isLoading: areManualTransactionsLoading } = useCollection<Transaction>(manualTransactionsRef);

    const clientsRef = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

    const suppliersRef = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
    const { data: suppliers, isLoading: areSuppliersLoading } = useCollection<Supplier>(suppliersRef);
    
    const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'transactionCategories') : null, [firestore]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<TransactionCategory>(categoriesRef);

    const paymentMethodsRef = useMemoFirebase(() => firestore ? collection(firestore, 'paymentMethods') : null, [firestore]);
    const { data: paymentMethods, isLoading: arePaymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsRef);

    const form = useForm<TransactionFormValues>({
        resolver: zodResolver(transactionSchema),
        defaultValues: {
            description: "",
            amount: undefined,
            categoryId: "",
            paymentMethodId: "",
            date: new Date(),
            type: undefined,
            clientId: "",
            supplierId: "",
            transferFromId: "",
            transferToId: "",
        },
    });

    const transactionType = form.watch("type");
    
    React.useEffect(() => {
        if (paymentMethods && !form.getValues('paymentMethodId')) {
          const defaultMethod = paymentMethods.find(pm => pm.isDefault);
          if (defaultMethod) {
            form.setValue('paymentMethodId', defaultMethod.id);
          } else if (paymentMethods.length > 0) {
            form.setValue('paymentMethodId', paymentMethods[0].id);
          }
        }
      }, [paymentMethods, form]);


    const filteredCategories = React.useMemo(() => {
        if (!categories) return [];
        if (transactionType === 'return') {
             return categories.filter(c => c.name.toLowerCase().includes('возврат'));
        }
        if (!transactionType || transactionType === 'transfer') return categories;
        return categories.filter(c => c.type === transactionType && !c.name.toLowerCase().includes('возврат'));
    }, [categories, transactionType]);


    const isLoading = areOrdersLoading || areManualTransactionsLoading || areClientsLoading || areSuppliersLoading || areCategoriesLoading || arePaymentMethodsLoading;

    // --- Data Processing ---
    const balances = React.useMemo(() => {
        if (!paymentMethods || (!manualTransactions && !orders)) return {};

        const balanceMap: Record<string, number> = {};
        const cashMethod = paymentMethods.find(pm => pm.name === 'Наличные');
        
        paymentMethods.forEach(pm => balanceMap[pm.name] = 0);
        
        // Process manual transactions
        (manualTransactions || []).forEach(transaction => {
            const method = paymentMethods.find(pm => pm.id === transaction.paymentMethodId);
            if (method) {
                balanceMap[method.name] = (balanceMap[method.name] || 0) + transaction.amount;
            } else if (cashMethod) {
                // Default to cash if method not found
                balanceMap[cashMethod.name] = (balanceMap[cashMethod.name] || 0) + transaction.amount;
            }
        });
    
        // Process payments from orders
        (orders || []).forEach(order => {
            (order.paymentHistory || []).forEach(payment => {
                // Assume all order payments are 'Наличные' as per user request
                if (cashMethod) {
                    balanceMap[cashMethod.name] = (balanceMap[cashMethod.name] || 0) + payment.amount;
                }
            });
        });
        
        return balanceMap;
    }, [manualTransactions, orders, paymentMethods]);

    const financialMetrics = React.useMemo(() => {
    if (!orders && !manualTransactions) {
      return { revenue: 0, expenses: 0, margin: 0, returns: 0, netProfit: 0 };
    }

    let revenue = 0;
    let expenses = 0;
    let margin = 0;
    let returns = 0;
    
    (orders || []).forEach(order => {
        (order.items || []).forEach(item => {
            if (item.status === 'Отказ') {
                // This logic might need refinement based on how returns are handled financially.
            } else {
                revenue += item.total || 0;
                expenses += (item.purchase || 0) * (item.quantity || 0);
                margin += (item.markup || 0);
            }
        });
        (order.paymentHistory || []).forEach(payment => {
          if (payment.amount < 0) { // Negative payments are refunds/returns
              returns += Math.abs(payment.amount);
          }
      });
    });

    (manualTransactions || []).forEach(transaction => {
      if (transaction.type === 'income') {
        revenue += transaction.amount;
      } else if (transaction.type === 'expense') {
        expenses += Math.abs(transaction.amount);
      } else if (transaction.type === 'return') {
            const category = categories?.find(c => c.id === transaction.categoryId);
            if (category?.type === 'income') { // Return from supplier
                revenue += transaction.amount;
            } else { // Return to customer
                returns += Math.abs(transaction.amount);
            }
      }
    });

    const netProfit = revenue - expenses - returns;

    return { revenue, expenses, margin, returns, netProfit };
  }, [orders, manualTransactions, categories]);

    const allTransactions = React.useMemo(() => {
        if (!orders || !manualTransactions || !clients || !suppliers || !categories) return [];

        const returnsFromManualTransactions = new Set(
            (manualTransactions || []).filter(t => t.description?.startsWith("Возврат по заказу №")).map(t => t.description)
        );

        const orderTransactions: EnrichedTransaction[] = (orders || []).flatMap(order => 
            (order.paymentHistory || []).map(payment => {
                const client = clients.find(c => c.id === order.clientId);
                const description = order.channel === 'Витрина' 
                    ? 'Продажа с витрины'
                    : `Оплата по заказу №${order.orderNumber}`;
                
                const isReturned = returnsFromManualTransactions.has(`Возврат по заказу №${order.orderNumber}`);

                return {
                    id: `${order.id}-${payment.date.toMillis()}`,
                    date: payment.date,
                    description: description,
                    amount: payment.amount,
                    type: payment.amount > 0 ? 'income' : 'return',
                    category: 'Продажи',
                    counterparty: client ? `${client.lastName} ${client.firstName}` : 'Неизвестный клиент',
                    orderId: order.id,
                    clientId: order.clientId,
                    channel: order.channel || '-',
                    isManual: false,
                    isReturned: isReturned,
                };
            })
        );
        
        const enrichedManualTransactions: EnrichedTransaction[] = (manualTransactions || []).map(t => {
            let counterparty = '-';
            if (t.clientId) {
                const client = clients.find(c => c.id === t.clientId);
                counterparty = client ? `${client.lastName} ${client.firstName}` : 'Удаленный клиент';
            } else if (t.supplierId) {
                const supplier = suppliers.find(s => s.id === t.supplierId);
                counterparty = supplier ? supplier.name : 'Удаленный поставщик';
            }
            const category = categories.find(c => c.id === t.categoryId);

            return {
                id: t.id,
                date: t.date,
                description: t.description,
                amount: t.amount,
                type: t.type,
                category: category?.name || 'Без категории',
                categoryId: t.categoryId,
                paymentMethodId: t.paymentMethodId,
                counterparty: counterparty,
                clientId: t.clientId,
                supplierId: t.supplierId,
                channel: '-',
                isManual: true,
                isReturned: false,
            };
        });

        return [...orderTransactions, ...enrichedManualTransactions].sort((a, b) => b.date.toMillis() - a.date.toMillis());

    }, [orders, manualTransactions, clients, suppliers, categories]);

    const filteredTransactions = React.useMemo(() => {
        if (!searchTerm) {
          return allTransactions;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
    
        return allTransactions.filter((transaction) => {
          const dateStr = format(transaction.date.toDate(), 'dd.MM.yyyy HH:mm').toLowerCase();
          const desc = transaction.description.toLowerCase();
          const counterparty = transaction.counterparty?.toLowerCase() || '';
          const category = transaction.category?.toLowerCase() || '';
          const channel = transaction.channel?.toLowerCase() || '';

          let typeText = '';
           if (transaction.type === 'transfer') typeText = 'перемещение';
           else if (transaction.type === 'return') typeText = 'возврат';
           else if (transaction.amount > 0) typeText = 'доход';
           else typeText = 'расход';

          return (
            dateStr.includes(lowercasedFilter) ||
            desc.includes(lowercasedFilter) ||
            counterparty.includes(lowercasedFilter) ||
            category.includes(lowercasedFilter) ||
            channel.includes(lowercasedFilter) ||
            typeText.includes(lowercasedFilter)
          );
        });
      }, [allTransactions, searchTerm]);


    // --- Handlers ---
    const handleReturnTransaction = async (transaction: EnrichedTransaction) => {
        if (!firestore || !transaction.orderId || !paymentMethods) return;
    
        const orderToReturn = orders?.find(o => o.id === transaction.orderId);
        if (!orderToReturn) {
            toast({ variant: "destructive", title: "Ошибка", description: "Не удалось найти связанный заказ." });
            return;
        }

        const warehouseOrder = orders?.find(o => o.clientId === 'warehouse-stock');
        if (!warehouseOrder) {
            toast({ variant: "destructive", title: "Ошибка", description: "Не найден складской заказ для возврата товаров." });
            return;
        }
    
        try {
            const batch = writeBatch(firestore);
    
            // 1. Move items back to warehouse order
            const itemsToReturn = orderToReturn.items.map(item => ({...item, status: 'На складе'}));
            const warehouseOrderRef = doc(firestore, 'orders', warehouseOrder.id);
            batch.update(warehouseOrderRef, {
                items: [...warehouseOrder.items, ...itemsToReturn]
            });
    
            // 2. Archive the sale order and clear its items
            const saleOrderRef = doc(firestore, 'orders', orderToReturn.id);
            batch.update(saleOrderRef, { active: false, items: [] });
    
            // 3. Create a negative financial transaction for the return
            const returnCategory = categories?.find(c => c.name === 'Возврат клиенту');
            const defaultPaymentMethod = paymentMethods.find(pm => pm.isDefault) || paymentMethods[0];
            const returnTransactionRef = doc(collection(firestore, "transactions"));
            batch.set(returnTransactionRef, {
                date: Timestamp.now(),
                description: `Возврат по заказу №${orderToReturn.orderNumber}`,
                amount: -Math.abs(transaction.amount),
                type: 'return',
                categoryId: returnCategory?.id || null,
                paymentMethodId: defaultPaymentMethod?.id || null,
                orderId: transaction.orderId,
                clientId: orderToReturn.clientId,
            });
    
            await batch.commit();
    
            toast({
                variant: "success",
                title: "Возврат оформлен",
                description: `Товары возвращены на склад. Финансы скорректированы.`,
            });
        } catch (e) {
            console.error("Return failed: ", e);
            toast({ variant: "destructive", title: "Ошибка возврата", description: "Не удалось обработать операцию." });
        }
    };
    
    const handleDeleteTransaction = async (transactionId: string) => {
        if (!firestore) return;
        await deleteDoc(doc(firestore, "transactions", transactionId));
        toast({ variant: "info", title: "Транзакция удалена" });
    };

    const onTransactionSubmit = (data: TransactionFormValues, id?: string) => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Ошибка" });
            return;
        }
    
        const transactionsCollection = collection(firestore, "transactions");
        
        if (data.type === 'transfer') {
             if (!data.transferFromId || !data.transferToId || data.transferFromId === data.transferToId) {
                toast({ variant: "destructive", title: "Ошибка", description: "Выберите разные счета для перемещения." });
                return;
            }
            const fromMethod = paymentMethods?.find(pm => pm.id === data.transferFromId);
            const toMethod = paymentMethods?.find(pm => pm.id === data.transferToId);

            // Expense from source
            addDocumentNonBlocking(transactionsCollection, {
                date: Timestamp.fromDate(data.date),
                description: `Перемещение на "${toMethod?.name}"`,
                amount: -Math.abs(data.amount),
                type: 'transfer', 
                categoryId: categories?.find(c => c.name.toLowerCase().includes('перевод'))?.id || null,
                paymentMethodId: data.transferFromId,
            });
            // Income to destination
             addDocumentNonBlocking(transactionsCollection, {
                date: Timestamp.fromDate(data.date),
                description: `Перемещение с "${fromMethod?.name}"`,
                amount: Math.abs(data.amount),
                type: 'transfer', 
                categoryId: categories?.find(c => c.name.toLowerCase().includes('перевод'))?.id || null,
                paymentMethodId: data.transferToId,
            });
             toast({ variant: "success", title: "Средства перемещены" });

        } else if (data.type === 'return') {
            const category = categories?.find(c => c.id === data.categoryId);
            const amount = category?.type === 'income' ? Math.abs(data.amount) : -Math.abs(data.amount);
            const dataToSave = {
                description: data.description,
                amount: amount,
                categoryId: data.categoryId,
                paymentMethodId: data.paymentMethodId,
                date: Timestamp.fromDate(data.date),
                type: data.type,
                clientId: data.clientId || null,
                supplierId: data.supplierId || null,
            };
             addDocumentNonBlocking(transactionsCollection, dataToSave);
             toast({ variant: "success", title: "Возврат оформлен" });
        } else {
            const amount = data.type === 'income' ? Math.abs(data.amount) : -Math.abs(data.amount);
            
            const dataToSave = {
                description: data.description,
                amount: amount,
                categoryId: data.categoryId,
                paymentMethodId: data.paymentMethodId,
                date: Timestamp.fromDate(data.date),
                type: data.type,
                clientId: data.clientId || null,
                supplierId: data.supplierId || null,
            };

            if (id) {
                updateDocumentNonBlocking(doc(firestore, "transactions", id), dataToSave);
                toast({ variant: "success", title: "Операция обновлена" });
            } else {
                 addDocumentNonBlocking(transactionsCollection, dataToSave);
                toast({ variant: "success", title: "Операция добавлена" });
            }
        }
    
        form.reset({
            description: "",
            amount: undefined,
            categoryId: "",
            paymentMethodId: form.getValues('paymentMethodId'),
            date: new Date(),
            type: undefined,
            clientId: "",
            supplierId: "",
            transferFromId: "",
            transferToId: "",
        });
      };
    
    // --- Render logic ---
    if (isLoading) {
        return (
          <AppLayout pageTitle="Финансы 2">
            <div className="space-y-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          </AppLayout>
        );
    }

    const getTransactionTypeBadge = (t: EnrichedTransaction) => {
        if (t.type === 'transfer') {
            return <Badge className="bg-violet-200 border-violet-300 text-violet-800">Перемещение</Badge>;
        }
        if (t.type === 'return') {
            return <Badge variant="info">Возврат</Badge>;
        }
        if (t.amount > 0) {
            return <Badge variant="success">Доход</Badge>;
        }
        return <Badge variant="destructive">Расход</Badge>;
    };

    return (
        <AppLayout pageTitle="Финансы 2">
          <div className="space-y-6">
              <div>
                  <h2 className="text-lg font-semibold mb-2 text-muted-foreground">Баланс</h2>
                  <div className="grid gap-4 md:grid-cols-2">
                      <Card className={cn("transition-colors", (balances['Наличные'] || 0) < 0 ? "bg-red-100 border-red-200" : "bg-green-100 border-green-200")}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className={cn("text-sm font-medium", (balances['Наличные'] || 0) < 0 ? "text-red-900" : "text-green-900")}>Баланс наличных</CardTitle>
                              <Banknote className={cn("h-4 w-4", (balances['Наличные'] || 0) < 0 ? "text-red-800" : "text-green-800")} />
                          </CardHeader>
                          <CardContent>
                              <div className={cn("text-2xl font-bold", (balances['Наличные'] || 0) < 0 ? "text-red-900" : "text-green-900")}>
                                  {(balances['Наличные'] || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                              </div>
                          </CardContent>
                      </Card>
                      <Card className={cn("transition-colors", (balances['Карта'] || 0) < 0 ? "bg-red-100 border-red-200" : "bg-green-100 border-green-200")}>
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className={cn("text-sm font-medium", (balances['Карта'] || 0) < 0 ? "text-red-900" : "text-green-900")}>Баланс по картам</CardTitle>
                              <CreditCard className={cn("h-4 w-4", (balances['Карта'] || 0) < 0 ? "text-red-800" : "text-green-800")} />
                          </CardHeader>
                          <CardContent>
                              <div className={cn("text-2xl font-bold", (balances['Карта'] || 0) < 0 ? "text-red-900" : "text-green-900")}>
                                  {(balances['Карта'] || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                              </div>
                          </CardContent>
                      </Card>
                  </div>
              </div>

              <div>
                  <h2 className="text-lg font-semibold mb-2 text-muted-foreground">Финансовые показатели</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <Link href="/analytics/report?type=income" className="block hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                          <Card>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                  <CardTitle className="text-sm font-medium">Выручка</CardTitle>
                                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                  <div className="text-2xl font-bold">{financialMetrics.revenue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                              </CardContent>
                          </Card>
                      </Link>
                       <Link href="/analytics/report?type=expense" className="block hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                          <Card>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                  <CardTitle className="text-sm font-medium">Расходы</CardTitle>
                                  <Receipt className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                                  <div className="text-2xl font-bold">{financialMetrics.expenses.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                              </CardContent>
                          </Card>
                       </Link>
                       <Link href="/analytics/report?type=all">
                          <Card className={cn("transition-colors", financialMetrics.netProfit >= 0 ? "hover:shadow-lg hover:-translate-y-0.5" : "bg-red-50", "transition-transform")}>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Остаток</CardTitle>
                              <Scale className="h-4 w-4 text-muted-foreground" />
                              </CardHeader>
                              <CardContent>
                              <div className={cn("text-2xl font-bold", financialMetrics.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                                  {financialMetrics.netProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                              </div>
                              </CardContent>
                          </Card>
                       </Link>
                       <Link href="/analytics/report?type=return" className="block hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                          <Card>
                              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                  <CardTitle className="text-sm font-medium">Возвраты</CardTitle>
                                  <ArrowDownLeft className="h-4 w-4 text-red-500" />
                              </CardHeader>
                              <CardContent>
                                  <div className="text-2xl font-bold text-red-600">{financialMetrics.returns.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                              </CardContent>
                          </Card>
                       </Link>
                  </div>
              </div>
              
              <div>
                  <h2 className="text-lg font-semibold mb-2 text-muted-foreground">Аналитика рентабельности</h2>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <Link href="/analytics/profitability">
                      <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                              <CardTitle className="text-sm font-medium">Валовая прибыль (Маржа)</CardTitle>
                              <ArrowUpRight className="h-4 w-4 text-green-500" />
                          </CardHeader>
                          <CardContent>
                              <div className="text-2xl font-bold text-green-600">{financialMetrics.margin.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                          </CardContent>
                      </Card>
                  </Link>
                  </div>
              </div>

              <Card>
                  <CardHeader>
                      <CardTitle>Добавить операцию</CardTitle>
                  </CardHeader>
                  <CardContent>
                       <Form {...form}>
                          <form onSubmit={form.handleSubmit(data => onTransactionSubmit(data, undefined))} className="space-y-4">
                              <div className="grid grid-cols-4 gap-4">
                                   <Button
                                      type="button"
                                      variant={transactionType === 'income' ? 'success' : 'outline'}
                                      className={cn("py-6 text-lg", transactionType !== 'income' && "bg-green-100 border-green-200 text-green-800 hover:bg-green-200/80")}
                                      onClick={() => form.setValue('type', 'income')}
                                  >Доход</Button>
                                  <Button
                                      type="button"
                                      variant={transactionType === 'expense' ? 'destructive' : 'outline'}
                                      className={cn("py-6 text-lg", transactionType !== 'expense' && "bg-red-100 border-red-200 text-red-800 hover:bg-red-200/80")}
                                      onClick={() => form.setValue('type', 'expense')}
                                  >Расход</Button>
                                  <Button
                                      type="button"
                                      variant={transactionType === 'return' ? 'info' : 'outline'}
                                      className={cn("py-6 text-lg", transactionType !== 'return' && "bg-blue-100 border-blue-200 text-blue-800 hover:bg-blue-200/80")}
                                      onClick={() => form.setValue('type', 'return')}
                                  >Возврат</Button>
                                  <Button
                                      type="button"
                                      variant={transactionType === 'transfer' ? 'secondary' : 'outline'}
                                      className={cn("py-6 text-lg", transactionType !== 'transfer' && "bg-violet-100 border-violet-200 text-violet-800 hover:bg-violet-200/80")}
                                      onClick={() => form.setValue('type', 'transfer')}
                                  >Перемещение</Button>
                              </div>
                              
                              {transactionType && (
                                  <>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-end pt-4">
                                          <FormField control={form.control} name="amount" render={({ field }) => ( <FormItem><FormLabel>Сумма</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} placeholder="1000" /></FormControl><FormMessage /></FormItem> )} />
                                          
                                          {transactionType === 'transfer' ? (
                                              <>
                                                  <FormField control={form.control} name="transferFromId" render={({ field }) => (
                                                      <FormItem><FormLabel>Со счета</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Счет списания" /></SelectTrigger></FormControl><SelectContent>{paymentMethods?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                                  )} />
                                                  <FormField control={form.control} name="transferToId" render={({ field }) => (
                                                      <FormItem><FormLabel>На счет</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Счет зачисления" /></SelectTrigger></FormControl><SelectContent>{paymentMethods?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                                  )} />
                                              </>
                                          ) : (
                                              <>
                                                  <FormField control={form.control} name="description" render={({ field }) => ( <FormItem><FormLabel>Описание</FormLabel><FormControl><Input {...field} value={field.value ?? ''} placeholder="Например, аренда" /></FormControl><FormMessage /></FormItem> )} />
                                                  <FormField control={form.control} name="categoryId" render={({ field }) => (
                                                      <FormItem><FormLabel>Категория</FormLabel>
                                                          <Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Категория" /></SelectTrigger></FormControl>
                                                          <SelectContent>
                                                              {filteredCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                                          </SelectContent>
                                                          </Select>
                                                      <FormMessage />
                                                      </FormItem>
                                                  )} />
                                                  
                                                  <FormItem>
                                                      <FormLabel>Контрагент</FormLabel>
                                                      <Popover open={openPopover} onOpenChange={setOpenPopover}>
                                                      <PopoverTrigger asChild>
                                                          <FormControl>
                                                          <Button variant="outline" role="combobox" className={cn("w-full justify-between", !form.getValues('clientId') && !form.getValues('supplierId') && "text-muted-foreground")}>
                                                              {form.getValues('clientId')
                                                                  ? clients?.find(c => c.id === form.getValues('clientId'))?.lastName + ' ' + clients?.find(c => c.id === form.getValues('clientId'))?.firstName
                                                                  : form.getValues('supplierId')
                                                                  ? suppliers?.find(s => s.id === form.getValues('supplierId'))?.name
                                                                  : "Выберите контрагента"}
                                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                          </Button>
                                                          </FormControl>
                                                      </PopoverTrigger>
                                                      <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                          <Command>
                                                          <CommandInput placeholder="Поиск контрагента..." />
                                                          <CommandList>
                                                              <CommandEmpty>Контрагент не найден.</CommandEmpty>
                                                              <CommandGroup heading="Поставщики">
                                                              {suppliers?.map(s => (
                                                                  <CommandItem
                                                                  value={s.name}
                                                                  key={`supplier-${s.id}`}
                                                                  onSelect={() => {
                                                                      form.setValue("supplierId", s.id);
                                                                      form.setValue("clientId", "");
                                                                      setOpenPopover(false);
                                                                  }}
                                                                  >
                                                                  <Check className={cn("mr-2 h-4 w-4", s.id === form.getValues('supplierId') ? "opacity-100" : "opacity-0")} />
                                                                  {s.name}
                                                                  </CommandItem>
                                                              ))}
                                                              </CommandGroup>
                                                              <CommandGroup heading="Клиенты">
                                                              {clients?.map(c => (
                                                                  <CommandItem
                                                                  value={`${c.lastName} ${c.firstName}`}
                                                                  key={`client-${c.id}`}
                                                                  onSelect={() => {
                                                                      form.setValue("clientId", c.id);
                                                                      form.setValue("supplierId", "");
                                                                      setOpenPopover(false);
                                                                  }}
                                                                  >
                                                                  <Check className={cn("mr-2 h-4 w-4", c.id === form.getValues('clientId') ? "opacity-100" : "opacity-0")} />
                                                                  {c.lastName} {c.firstName}
                                                                  </CommandItem>
                                                              ))}
                                                              </CommandGroup>
                                                          </CommandList>
                                                          </Command>
                                                      </PopoverContent>
                                                      </Popover>
                                                      <FormMessage />
                                                  </FormItem>

                                                  <FormField control={form.control} name="paymentMethodId" render={({ field }) => (
                                                      <FormItem><FormLabel>Способ оплаты</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Способ" /></SelectTrigger></FormControl><SelectContent>{paymentMethods?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                                                  )} />
                                              </>
                                          )}
                                      </div>
                                      <Button type="submit" className="w-full mt-4" disabled={!transactionType}>
                                          <PlusCircle className="mr-2 h-4 w-4" />
                                          {transactionType === 'transfer' ? 'Переместить' : transactionType === 'return' ? 'Оформить возврат' : 'Добавить операцию'}
                                      </Button>
                                  </>
                              )}
                          </form>
                      </Form>
                  </CardContent>
              </Card>

             <Card>
                  <CardHeader>
                      <CardTitle>История операций</CardTitle>
                      <CardDescription>Все финансовые операции, включая платежи по заказам и ручные транзакции.</CardDescription>
                       <div className="relative pt-2">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                              placeholder="Поиск по операциям..."
                              className="pl-8 w-full"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                          />
                      </div>
                  </CardHeader>
                  <CardContent>
                       <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead>Дата</TableHead>
                                  <TableHead>Описание</TableHead>
                                  <TableHead>Тип</TableHead>
                                  <TableHead>Контрагент</TableHead>
                                  <TableHead>Категория</TableHead>
                                  <TableHead>Канал</TableHead>
                                  <TableHead className="text-right">Сумма</TableHead>
                                  <TableHead className="w-[120px] text-right">Действия</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {filteredTransactions.length > 0 ? (
                                  filteredTransactions.map(t => (
                                      <TableRow key={t.id} className={cn(t.isReturned && "bg-gray-100 text-muted-foreground")}>
                                          <TableCell className={cn(t.isReturned && "line-through")}>{format(t.date.toDate(), 'dd.MM.yyyy HH:mm')}</TableCell>
                                          <TableCell className={cn(t.isReturned && "line-through")}>{t.description}</TableCell>
                                          <TableCell className={cn(t.isReturned && "line-through")}>
                                             {getTransactionTypeBadge(t)}
                                          </TableCell>
                                          <TableCell className={cn(t.isReturned && "line-through")}>{t.counterparty}</TableCell>
                                          <TableCell className={cn(t.isReturned && "line-through")}>{t.category}</TableCell>
                                          <TableCell className={cn(t.isReturned && "line-through")}>{t.channel || '-'}</TableCell>
                                          <TableCell className={cn("text-right font-medium", t.amount > 0 ? 'text-green-600' : 'text-red-600', t.isReturned && "line-through")}>
                                              {t.amount.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}
                                          </TableCell>
                                          <TableCell>
                                               <div className="flex items-center justify-end gap-1">
                                                  {t.channel === 'Витрина' && !t.isReturned && (
                                                      <AlertDialog>
                                                          <AlertDialogTrigger asChild>
                                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 hover:text-blue-700">
                                                                  <Undo2 className="h-4 w-4" />
                                                              </Button>
                                                          </AlertDialogTrigger>
                                                          <AlertDialogContent>
                                                              <AlertDialogHeader>
                                                                  <AlertDialogTitle>Оформить возврат?</AlertDialogTitle>
                                                                  <AlertDialogDescription>
                                                                      Товары из заказа будут возвращены на склад, а по финансам будет создана сторнирующая операция.
                                                                  </AlertDialogDescription>
                                                              </AlertDialogHeader>
                                                              <AlertDialogFooter>
                                                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                  <AlertDialogAction onClick={() => handleReturnTransaction(t)}>Подтвердить возврат</AlertDialogAction>
                                                              </AlertDialogFooter>
                                                          </AlertDialogContent>
                                                      </AlertDialog>
                                                  )}
                                                  {t.isManual && t.type !== 'transfer' && (
                                                    <TransactionDialog
                                                      transaction={t}
                                                      onSave={onTransactionSubmit}
                                                      clients={clients}
                                                      suppliers={suppliers}
                                                      categories={categories}
                                                      paymentMethods={paymentMethods}
                                                      >
                                                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                              <Pencil className="h-4 w-4" />
                                                          </Button>
                                                      </TransactionDialog>
                                                  )}
                                                   {t.isManual && (
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
                                                                  Это действие необратимо. Транзакция будет удалена.
                                                              </AlertDialogDescription>
                                                          </AlertDialogHeader>
                                                          <AlertDialogFooter>
                                                              <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                              <AlertDialogAction onClick={() => handleDeleteTransaction(t.id)}>
                                                                  Удалить
                                                              </AlertDialogAction>
                                                          </AlertDialogFooter>
                                                      </AlertDialogContent>
                                                  </AlertDialog>
                                                   )}
                                              </div>
                                          </TableCell>
                                      </TableRow>
                                  ))
                              ) : (
                                  <TableRow>
                                      <TableCell colSpan={8} className="h-24 text-center">
                                          Финансовых операций пока нет.
                                      </TableCell>
                                  </TableRow>
                              )}
                          </TableBody>
                      </Table>
                  </CardContent>
             </Card>
          </div>
        </AppLayout>
    );
}
