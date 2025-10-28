
"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import {
    ShoppingCart,
    Package,
    Receipt,
    Users,
    Sliders,
    ChevronsUpDown,
    LogOut,
    Car,
    ReceiptText,
    ChevronLeft,
    BarChart,
    Search,
} from "lucide-react";
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp } from "firebase/firestore";
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
import { useToast } from "@/hooks/use-toast";
import { AppLayout } from "@/app/components/app-layout";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import type { CustomerOrder, Transaction, Customer, Supplier, TransactionCategory } from "@/lib/types";
import { format } from 'date-fns';
import { Input } from "@/components/ui/input";

type EnrichedTransaction = {
    id: string;
    date: Timestamp;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'return' | 'transfer';
    category?: string;
    counterparty?: string;
    orderId?: string;
    isManual: boolean;
};

export default function ReportPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const firestore = useFirestore();

    const reportType = searchParams.get('type') || 'all';
    const [searchTerm, setSearchTerm] = React.useState("");

    // Data fetching
    const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
    const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

    const manualTransactionsRef = useMemoFirebase(() => firestore ? collection(firestore, "transactions") : null, [firestore]);
    const { data: manualTransactions, isLoading: areManualTransactionsLoading } = useCollection<Transaction>(manualTransactionsRef);

    const clientsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

    const suppliersRef = useMemoFirebase(() => (firestore ? collection(firestore, 'suppliers') : null), [firestore]);
    const { data: suppliers, isLoading: areSuppliersLoading } = useCollection<Supplier>(suppliersRef);
    
    const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'transactionCategories') : null, [firestore]);
    const { data: categories, isLoading: areCategoriesLoading } = useCollection<TransactionCategory>(categoriesRef);

    const isLoading = areOrdersLoading || areManualTransactionsLoading || areClientsLoading || areSuppliersLoading || areCategoriesLoading;

    // Data processing
    const filteredTransactions = React.useMemo(() => {
        if (!orders || !manualTransactions || !clients || !suppliers || !categories) return [];

        const orderTransactions: EnrichedTransaction[] = (orders || []).flatMap(order => 
            (order.paymentHistory || []).map(payment => {
                const client = clients.find(c => c.id === order.clientId);
                return {
                    id: `${order.id}-${payment.date.toMillis()}`,
                    date: payment.date,
                    description: `Оплата по заказу №${order.orderNumber}`,
                    amount: payment.amount,
                    type: payment.amount > 0 ? 'income' : 'return',
                    category: 'Продажи',
                    counterparty: client ? `${client.lastName} ${client.firstName}` : 'Неизвестный клиент',
                    orderId: order.id,
                    isManual: false,
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
                counterparty: counterparty,
                isManual: true,
            };
        });

        const allTransactions = [...orderTransactions, ...enrichedManualTransactions];
        
        let reportFiltered = allTransactions;
        if (reportType !== 'all') {
            reportFiltered = allTransactions.filter(t => {
                if (reportType === 'income') return t.type === 'income' && t.amount > 0;
                if (reportType === 'expense') return t.type === 'expense';
                if (reportType === 'return') return t.type === 'return' || (t.isManual === false && t.amount < 0);
                return false;
            });
        }
        
        if (!searchTerm) {
          return reportFiltered.sort((a, b) => b.date.toMillis() - a.date.toMillis());
        }

        const lowercasedFilter = searchTerm.toLowerCase();
        
        const searchFiltered = reportFiltered.filter((transaction) => {
            const dateStr = format(transaction.date.toDate(), 'dd.MM.yyyy HH:mm').toLowerCase();
            const desc = transaction.description.toLowerCase();
            const counterparty = transaction.counterparty?.toLowerCase() || '';
            const category = transaction.category?.toLowerCase() || '';
            
            let typeText = '';
            if (transaction.type === 'transfer') typeText = 'перемещение';
            else if (transaction.amount < 0 && transaction.type !== 'return') typeText = 'расход';
            else if (transaction.type === 'return' || (transaction.isManual === false && transaction.amount < 0)) typeText = 'возврат';
            else typeText = 'доход';

            return (
                dateStr.includes(lowercasedFilter) ||
                desc.includes(lowercasedFilter) ||
                counterparty.includes(lowercasedFilter) ||
                category.includes(lowercasedFilter) ||
                typeText.includes(lowercasedFilter)
            );
        });
        
        return searchFiltered.sort((a, b) => b.date.toMillis() - a.date.toMillis());


    }, [orders, manualTransactions, clients, suppliers, categories, reportType, searchTerm]);


    const reportTitle = React.useMemo(() => {
        switch (reportType) {
            case 'income': return 'Отчет по доходам (Выручка)';
            case 'expense': return 'Отчет по расходам';
            case 'return': return 'Отчет по возвратам';
            default: return 'Все транзакции';
        }
    }, [reportType]);


    if (isLoading) {
        return (
            <AppLayout pageTitle={reportTitle}>
                <Skeleton className="h-96 w-full" />
            </AppLayout>
        );
    }
    
    const getTransactionTypeBadge = (t: EnrichedTransaction) => {
        if (t.type === 'transfer') {
            return <Badge className="bg-violet-200 border-violet-300 text-violet-800">Перемещение</Badge>;
        }
        if (t.type === 'return' || (t.isManual === false && t.amount < 0)) {
            return <Badge variant="info">Возврат</Badge>;
        }
        if (t.type === 'income') {
            return <Badge variant="success">Доход</Badge>;
        }
        return <Badge variant="destructive">Расход</Badge>;
    };

    return (
        <AppLayout pageTitle={reportTitle}>
            <div className="flex items-center gap-4 mb-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/analytics">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Назад</span>
                    </Link>
                </Button>
                <h1 className="text-xl font-semibold">{reportTitle}</h1>
            </div>
            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>История операций</CardTitle>
                            <CardDescription>
                                Детальный список всех операций, относящихся к выбранной категории.
                            </CardDescription>
                        </div>
                        <div className="relative w-full max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Поиск по операциям..."
                                className="pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
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
                                <TableHead className="text-right">Сумма</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredTransactions.length > 0 ? (
                                filteredTransactions.map(t => (
                                    <TableRow key={t.id}>
                                        <TableCell>{format(t.date.toDate(), 'dd.MM.yyyy HH:mm')}</TableCell>
                                        <TableCell>{t.description}</TableCell>
                                        <TableCell>
                                           {getTransactionTypeBadge(t)}
                                        </TableCell>
                                        <TableCell>{t.counterparty}</TableCell>
                                        <TableCell>{t.category}</TableCell>
                                        <TableCell className={cn("text-right font-medium", t.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                                            {t.amount.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        Нет операций для отображения.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </AppLayout>
    );
}
