
'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  ShoppingCart,
  Package,
  Receipt,
  Building,
  Users,
  Sliders,
  Search,
  ChevronsUpDown,
  UserPlus,
  LogOut,
  Car,
  ReceiptText,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  Filter,
  MoreHorizontal,
  PlusCircle,
  ArrowUpDown,
  Calendar as CalendarIcon,
  Download,
  BarChart,
  Settings,
  RefreshCcw,
  Info,
  Trash2,
  Check,
  CheckSquare,
  ClipboardCheck,
} from 'lucide-react';
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, Timestamp, doc, deleteDoc } from "firebase/firestore";
import { signOut } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { sidebarNav } from '@/app/page';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as ChartTooltip,
} from 'recharts';
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import type { CustomerOrder, Payment, Transaction, TransactionCategory, PaymentMethod, Customer, Supplier } from '@/lib/types';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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


const chartData = [
    { date: 'Янв', revenue: 4000, expenses: 2400 },
    { date: 'Фев', revenue: 3000, expenses: 1398 },
    { date: 'Мар', revenue: 2000, expenses: 9800 },
    { date: 'Апр', revenue: 2780, expenses: 3908 },
    { date: 'Май', revenue: 1890, expenses: 4800 },
    { date: 'Июн', revenue: 2390, expenses: 3800 },
    { date: 'Июл', revenue: 3490, expenses: 4300 },
];

const profitabilityChartData = [
  { date: '22 сент. 2025 г.', profit: 4000, sales: 2400 },
  { date: '29 сент. 2025 г.', profit: 14997, sales: 46323 },
  { date: '6 окт. 2025 г.', profit: 8000, sales: 15000 },
  { date: '13 окт. 2025 г.', profit: 18000, sales: 40000 },
];


const unitEconomicsData = [
    { channel: 'Витрина', type: 'Розничные продажи', avgCheck: 2275, sum: 50050, sales: '36,4%', profit: 18217 },
    { channel: 'Сайт', type: 'Интернет-магазин', avgCheck: 5356.07, sum: 107121.36, sales: '26,69%', profit: 28586.36 },
];

const unitEconomicsByItemData = [
  { name: 'Незамерзайка FROZEN WAY -30', totalProfit: 7000, profitability: 103.7, siteProfit: null, sitePercent: null, retailProfit: 7000, retailPercent: 103.7 },
  { name: 'Масло моторное NISSAN 5W-30 синтетическое 4 л К...', totalProfit: 2581, profitability: 44.44, siteProfit: 2581, sitePercent: 44.44, retailProfit: null, retailPercent: null },
  { name: 'Свеча зажигания', totalProfit: 2356, profitability: 53.02, siteProfit: 2356, sitePercent: 53.02, retailProfit: null, retailPercent: null },
  { name: 'Масло моторное Лукойл Genesis Armortech 5W-40 си...', totalProfit: 2278, profitability: 38.47, siteProfit: 566, sitePercent: 27.83, retailProfit: 1712, retailPercent: 44.03 },
  { name: 'NIBK PN0551 Колодки тормозные дисковые (передние)', totalProfit: 1907, profitability: 78.51, siteProfit: 1907, sitePercent: 78.51, retailProfit: null, retailPercent: null },
  { name: 'Зарядное устройство 6А для авто RJ-C120501A', totalProfit: 1700, profitability: 130.77, siteProfit: null, sitePercent: null, retailProfit: 1700, retailPercent: 130.77 },
  { name: 'Brembo S68546 Колодки барабанные RENAULT LOGA...', totalProfit: 1689, profitability: 78.52, siteProfit: 1689, sitePercent: 78.52, retailProfit: null, retailPercent: null },
  { name: 'Shell 550055905 Масло моторное синтетика Shell Hel...', totalProfit: 1551, profitability: 56.42, siteProfit: 1551, sitePercent: 56.42, retailProfit: null, retailPercent: null },
  { name: 'ABSEL АккумуляторSLI ABSEL SELECTION 12V L2 60...', totalProfit: 1284, profitability: 20.66, siteProfit: null, sitePercent: null, retailProfit: 1284, retailPercent: 20.66 },
  { name: 'SKF VKBA 6984 Подшипник ступичный Подшипник ст...', totalProfit: 1215, profitability: 17.71, siteProfit: 1215, sitePercent: 17.71, retailProfit: null, retailPercent: null },
  { name: 'BIG FILTER GB-95183 Фильтр воздушный MERCEDES-...', totalProfit: 1138, profitability: 171.90, siteProfit: 1138, sitePercent: 171.90, retailProfit: null, retailPercent: null },
  { name: 'набор для утапливания поршней тормозного цилиндра', totalProfit: 1100, profitability: 57.89, siteProfit: null, sitePercent: null, retailProfit: 1100, retailPercent: 57.89 },
];

function DateRangePicker({ className }: React.HTMLAttributes<HTMLDivElement>) {
  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2025, 8, 21),
    to: new Date(2025, 9, 21),
  });

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] justify-start text-left font-normal h-8",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "dd.MM.yyyy")} -{" "}
                  {format(date.to, "dd.MM.yyyy")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Выберите дату</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export default function FinancePage() {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

  const transactionsRef = useMemoFirebase(() => firestore ? collection(firestore, "transactions") : null, [firestore]);
  const { data: manualTransactions, isLoading: areTransactionsLoading } = useCollection<Transaction>(transactionsRef);

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, "transactionCategories") : null, [firestore]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<TransactionCategory>(categoriesRef);

  const paymentMethodsRef = useMemoFirebase(() => firestore ? collection(firestore, "paymentMethods") : null, [firestore]);
  const { data: paymentMethods, isLoading: arePaymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsRef);

  const clientsRef = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const suppliersRef = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
  const { data: suppliers, isLoading: areSuppliersLoading } = useCollection<Supplier>(suppliersRef);


  const isLoading = areOrdersLoading || areTransactionsLoading || areCategoriesLoading || arePaymentMethodsLoading || areClientsLoading || areSuppliersLoading;

  const financialMetrics = React.useMemo(() => {
    if (!orders && !manualTransactions) {
      return { revenue: 0, expenses: 0, profit: 0, returns: 0 };
    }

    let revenue = 0;
    let expenses = 0;
    let returns = 0;
    
    (orders || []).forEach(order => {
        (order.items || []).forEach(item => {
            if (item.status === 'Отказ') {
                returns += item.total || 0;
            } else {
                revenue += item.total || 0;
                expenses += (item.purchase || 0) * (item.quantity || 0);
            }
        });
    });

    (manualTransactions || []).forEach(transaction => {
      if (transaction.type === 'income') {
        revenue += transaction.amount;
      } else if (transaction.type === 'expense') {
        expenses += Math.abs(transaction.amount);
      }
    });

    const profit = revenue - expenses;

    return { revenue, expenses, profit, returns };
  }, [orders, manualTransactions]);
  
  const allTransactions = React.useMemo(() => {
    if (!orders || !manualTransactions || !clients || !suppliers || !categories) return [];

    const orderTransactions = (orders || []).flatMap(order => 
        (order.paymentHistory || []).map(payment => {
            const client = clients.find(c => c.id === order.clientId);
            return {
                id: `${order.id}-${payment.date.toMillis()}`,
                date: payment.date,
                description: `Оплата по заказу №${order.orderNumber}`,
                amount: payment.amount,
                type: 'income',
                category: 'Продажи',
                counterparty: client ? `${client.lastName} ${client.firstName}` : 'Неизвестный клиент',
                orderId: order.id,
                isManual: false,
            };
        })
    );
    
    const enrichedManualTransactions = (manualTransactions || []).map(t => {
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

    return [...orderTransactions, ...enrichedManualTransactions].sort((a, b) => b.date.toMillis() - a.date.toMillis());

  }, [orders, manualTransactions, clients, suppliers, categories]);

  const handleDeleteTransaction = async (transactionId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "transactions", transactionId));
    toast({ variant: "info", title: "Транзакция удалена" });
  };


  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Sign out error', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка!',
        description: 'Не удалось выйти из системы.',
      });
    }
  };

  if (isUserLoading || !user || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-secondary/50">
        <div className="space-y-4 p-8 bg-white rounded-lg shadow-md w-full max-w-4xl">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full bg-secondary/50">
      <Sidebar
        side="left"
        collapsible="icon"
        variant="sidebar"
        className="border-r bg-white"
      >
        <SidebarContent className="flex flex-col">
          <SidebarHeader>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center justify-between w-full h-12 px-2"
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.photoURL || 'https://picsum.photos/seed/1/40/40'}
                      />
                      <AvatarFallback>
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left flex-col items-start hidden group-data-[state=expanded]:flex">
                      <span className="text-sm font-medium">
                        {user.displayName || 'Автошкола'}
                      </span>
                    </div>
                  </div>
                  <ChevronsUpDown className="h-4 w-4 text-muted-foreground hidden group-data-[state=expanded]:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Выйти</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarHeader>
          <TooltipProvider>
            <SidebarMenu className="flex-1 p-2">
              {sidebarNav.map((item, index) => (
                <li key={index} className="group/menu-item relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          'peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10',
                          pathname === item.href &&
                            'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                        )}
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">
                          {item.tooltip}
                        </span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      align="center"
                      className="bg-primary text-primary-foreground"
                    >
                      {item.tooltip}
                    </TooltipContent>
                  </Tooltip>
                </li>
              ))}
              <li className="group/menu-item relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/delivery-calendar"
                        className={cn(
                          "peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10",
                          pathname === "/delivery-calendar" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        )}
                      >
                        <CalendarIcon className="h-5 w-5 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">Календарь поставок</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" className="bg-primary text-primary-foreground">
                      Календарь поставок
                    </TooltipContent>
                  </Tooltip>
                </li>
              <li className="group/menu-item relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/cars"
                      className={cn(
                        'peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10',
                        pathname === '/cars' &&
                          'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      )}
                    >
                      <Car className="h-5 w-5 shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        Автомобили
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className="bg-primary text-primary-foreground"
                  >
                    Автомобили
                  </TooltipContent>
                </Tooltip>
              </li>
              <li className="group/menu-item relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/clients"
                      className={cn(
                        'peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10',
                        pathname === '/clients' &&
                          'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      )}
                    >
                      <Users className="h-5 w-5 shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        Клиенты
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className="bg-primary text-primary-foreground"
                  >
                    Клиенты
                  </TooltipContent>
                </Tooltip>
              </li>
               <li className="group/menu-item relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/analytics"
                      className={cn(
                        'peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10',
                        pathname.startsWith("/analytics") &&
                          'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      )}
                    >
                      <BarChart className="h-5 w-5 shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        Аналитика
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className="bg-primary text-primary-foreground"
                  >
                    Аналитика
                  </TooltipContent>
                </Tooltip>
              </li>
               <li className="group/menu-item relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/finance"
                      className={cn(
                        'peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10',
                        pathname.startsWith('/finance') &&
                          'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      )}
                    >
                      <ReceiptText className="h-5 w-5 shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        Финансы
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className="bg-primary text-primary-foreground"
                  >
                    Финансы
                  </TooltipContent>
                </Tooltip>
              </li>
              <li className="group/menu-item relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                         <Link
                            href="/finance2"
                            className={cn(
                                "peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10",
                                pathname === "/finance2" && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            )}
                            >
                            <ReceiptText className="h-5 w-5 shrink-0" />
                            <span className="truncate group-data-[collapsible=icon]:hidden">Финансы 2</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" className="bg-primary text-primary-foreground">
                        Финансы 2
                      </TooltipContent>
                    </Tooltip>
                </li>
                 <li className="group/menu-item relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/deals"
                        className={cn(
                          "peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10",
                          pathname.startsWith("/deals") && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        )}
                      >
                        <CheckSquare className="h-5 w-5 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">Дела</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" className="bg-primary text-primary-foreground">
                      Дела
                    </TooltipContent>
                  </Tooltip>
                </li>
                 <li className="group/menu-item relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href="/notes"
                        className={cn(
                          "peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10",
                          pathname.startsWith("/notes") && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                        )}
                      >
                        <ClipboardCheck className="h-5 w-5 shrink-0" />
                        <span className="truncate group-data-[collapsible=icon]:hidden">Заметки</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" className="bg-primary text-primary-foreground">
                      Заметки
                    </TooltipContent>
                  </Tooltip>
                </li>
              <li className="group/menu-item relative">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href="/settings"
                      className={cn(
                        'peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10',
                        pathname.startsWith('/settings') &&
                          'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                      )}
                    >
                      <Sliders className="h-5 w-5 shrink-0" />
                      <span className="truncate group-data-[collapsible=icon]:hidden">
                        Настройки
                      </span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    align="center"
                    className="bg-primary text-primary-foreground"
                  >
                    Настройки
                  </TooltipContent>
                </Tooltip>
              </li>
            </SidebarMenu>
          </TooltipProvider>
        </SidebarContent>
      </Sidebar>
      <div className="flex flex-col w-full">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="md:hidden" />
            <h1 className="text-xl font-semibold">Финансы</h1>
          </div>
           <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
            <div className="ml-auto flex items-center gap-2">
                <Button variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Фильтры
                </Button>
            </div>
           </div>
        </header>
        <main className="flex-1 p-4 md:p-6">
           <Tabs defaultValue="overview">
               <TabsList>
                {/* Remove direct links from triggers for now */}
                <TabsTrigger value="overview">Общий отчет</TabsTrigger>
                <TabsTrigger value="profitability">Прибыльность</TabsTrigger>
                <TabsTrigger value="unit-economics">Юнит-экономика</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-6 mt-4">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{financialMetrics.revenue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                            <p className="text-xs text-muted-foreground">+20.1% с прошлого месяца</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Расходы</CardTitle>
                            <Receipt className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{financialMetrics.expenses.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                            <p className="text-xs text-muted-foreground">+15.3% с прошлого месяца</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Прибыль</CardTitle>
                            <ArrowUpRight className="h-4 w-4 text-green-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-green-600">{financialMetrics.profit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                            <p className="text-xs text-muted-foreground">+22.4% с прошлого месяца</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Возвраты</CardTitle>
                            <ArrowDownLeft className="h-4 w-4 text-red-500" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold text-red-600">{financialMetrics.returns.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                            <p className="text-xs text-muted-foreground">-5.2% с прошлого месяца</p>
                        </CardContent>
                    </Card>
                </div>
                <Card>
                    <CardHeader className="flex flex-row items-center">
                        <div className="grid gap-2">
                            <CardTitle>Финансовый отчет</CardTitle>
                            <CardDescription>
                                Обзор доходов и расходов за выбранный период.
                            </CardDescription>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                            <Tabs defaultValue="week" className="space-y-4">
                                <TabsList>
                                    <TabsTrigger value="week">Неделя</TabsTrigger>
                                    <TabsTrigger value="month">Месяц</TabsTrigger>
                                    <TabsTrigger value="year">Год</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </CardHeader>
                    <CardContent className="pl-2">
                        <ResponsiveContainer width="100%" height={350}>
                            <AreaChart data={chartData}>
                                 <defs>
                                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0.1}/>
                                    </linearGradient>
                                    <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0.1}/>
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value as number) / 1000}k`}/>
                                <ChartTooltip 
                                    cursor={{ fill: 'hsl(var(--muted))' }}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--background))',
                                        borderRadius: 'var(--radius)',
                                        border: '1px solid hsl(var(--border))',
                                    }}
                                />
                                <Area type="monotone" dataKey="revenue" stroke="hsl(var(--chart-2))" fillOpacity={1} fill="url(#colorRevenue)" dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--chart-2))', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'hsl(var(--background))', stroke: 'hsl(var(--chart-2))' }} />
                                <Area type="monotone" dataKey="expenses" stroke="hsl(var(--chart-1))" fillOpacity={1} fill="url(#colorExpenses)" dot={{ r: 4, fill: 'hsl(var(--background))', stroke: 'hsl(var(--chart-1))', strokeWidth: 2 }} activeDot={{ r: 6, fill: 'hsl(var(--background))', stroke: 'hsl(var(--chart-1))' }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>История операций</CardTitle>
                        <CardDescription>
                            Последние финансовые операции по всем заказам и ручным проводкам.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Дата</TableHead>
                                     <TableHead>Тип</TableHead>
                                    <TableHead>Описание</TableHead>
                                    <TableHead>Контрагент</TableHead>
                                    <TableHead>Категория</TableHead>
                                    <TableHead className="text-right">Сумма</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                             <TableBody>
                                {allTransactions && allTransactions.length > 0 ? (
                                    allTransactions.map((t) => (
                                        <TableRow key={t.id}>
                                            <TableCell>{format(t.date.toDate(), 'dd.MM.yyyy HH:mm')}</TableCell>
                                            <TableCell>
                                                <Badge variant={t.amount > 0 ? 'success' : 'destructive'}>
                                                    {t.amount > 0 ? 'Доход' : 'Расход'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{t.description}</TableCell>
                                            <TableCell>{t.counterparty}</TableCell>
                                            <TableCell>{t.category}</TableCell>
                                            <TableCell className={cn("text-right font-medium", t.amount > 0 ? 'text-green-600' : 'text-red-600')}>
                                                {t.amount.toLocaleString('ru-RU', {style: 'currency', currency: 'RUB', maximumFractionDigits: 0})}
                                            </TableCell>
                                            <TableCell>
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
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-24 text-center">
                                            Операций пока нет.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
              </TabsContent>
                <TabsContent value="profitability">
                     <Card>
                        <CardHeader>
                            <Tabs defaultValue="by-items" className="w-full">
                                <TabsList>
                                    <TabsTrigger value="by-profitability">Прибыльность</TabsTrigger>
                                    <TabsTrigger value="by-items">По товарам</TabsTrigger>
                                    <TabsTrigger value="by-employees">По сотрудникам</TabsTrigger>
                                    <TabsTrigger value="by-customers">По покупателям</TabsTrigger>
                                    <TabsTrigger value="by-channels">По каналам продаж</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="p-4 rounded-lg bg-muted/70 border">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                                     <div className="flex items-end gap-2">
                                        <Button>Найти</Button>
                                        <Button variant="ghost">Очистить</Button>
                                    </div>
                                    <div className="flex items-end gap-2">
                                         <DateRangePicker />
                                    </div>
                                    <div className="space-y-1"><Label>Проект</Label><Select><SelectTrigger><SelectValue placeholder="Проект" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Контрагент</Label><Select><SelectTrigger><SelectValue placeholder="Контрагент" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Учитывать</Label><Select><SelectTrigger><SelectValue placeholder="Товары, услуги и комплекты" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Товар или группа</Label><Select><SelectTrigger><SelectValue placeholder="Товар или группа" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Склад</Label><Select><SelectTrigger><SelectValue placeholder="Склад" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Точка продаж</Label><Select><SelectTrigger><SelectValue placeholder="Точка продаж" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Тип документа</Label><Select><SelectTrigger><SelectValue placeholder="Все" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Канал продаж</Label><Select><SelectTrigger><SelectValue placeholder="Канал продаж" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Группа контрагента</Label><Select><SelectTrigger><SelectValue placeholder="Группа контрагента" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Договор</Label><Select><SelectTrigger><SelectValue placeholder="Договор" /></SelectTrigger></Select></div>
                                     <div className="space-y-1"><Label>Поставщик</Label><Select><SelectTrigger><SelectValue placeholder="Поставщик" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Организация</Label><Select><SelectTrigger><SelectValue placeholder="Организация" /></SelectTrigger></Select></div>
                                    <div className="space-y-1"><Label>Бренд</Label><Select><SelectTrigger><SelectValue placeholder="Бренд" /></SelectTrigger></Select></div>
                                </div>
                            </div>
                             <Card>
                                <CardContent className="pt-6">
                                     <ResponsiveContainer width="100%" height={250}>
                                        <AreaChart data={profitabilityChartData}>
                                            <defs>
                                                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8884d8" stopOpacity={0.4}/><stop offset="95%" stopColor="#8884d8" stopOpacity={0.05}/></linearGradient>
                                                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#82ca9d" stopOpacity={0.4}/><stop offset="95%" stopColor="#82ca9d" stopOpacity={0.05}/></linearGradient>
                                            </defs>
                                            <XAxis dataKey="date" stroke="#888888" fontSize={12} tickLine={false} axisLine={false}/>
                                            <YAxis yAxisId="left" stroke="#8884d8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value as number) / 1000} тыс.`}/>
                                            <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${(value as number) / 1000} тыс.`}/>
                                            <ChartTooltip />
                                            <Area yAxisId="left" type="monotone" dataKey="profit" name="Прибыль" stroke="#8884d8" fill="url(#colorProfit)" />
                                            <Area yAxisId="right" type="monotone" dataKey="sales" name="Продажи (сумма)" stroke="#82ca9d" fill="url(#colorSales)" />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>

                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead><Button variant="ghost">Каналы продаж<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                       <TableHead><Button variant="ghost">Тип<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                       <TableHead><Button variant="ghost">Средний чек<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                       <TableHead><Button variant="ghost">Сумма<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                       <TableHead><Button variant="ghost">Продаж<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                       <TableHead><Button variant="ghost">Прибыль<ArrowUpDown className="ml-2 h-4 w-4" /></Button></TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                   {unitEconomicsData.map((item, index) => (
                                       <TableRow key={index}>
                                           <TableCell className="text-blue-600 hover:underline cursor-pointer">{item.channel}</TableCell>
                                           <TableCell>{item.type}</TableCell>
                                           <TableCell>{item.avgCheck.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                           <TableCell>{item.sum.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                           <TableCell>{item.sales}</TableCell>
                                           <TableCell>{item.profit.toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                                       </TableRow>
                                   ))}
                               </TableBody>
                           </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="unit-economics" className="space-y-4 mt-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between gap-4">
                        <div className='flex items-center gap-2'>
                           <h2 className="text-xl font-semibold tracking-tight">Юнит-экономика</h2>
                            <TooltipProvider>
                                <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button variant="ghost" size="icon" className='h-6 w-6 text-muted-foreground'>
                                        <Info className="h-4 w-4" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Анализ прибыльности по товарам</p>
                                </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Период с</span>
                        <DateRangePicker />
                        <div className="flex items-center space-x-2">
                            <Switch id="op-expenses" />
                            <Label htmlFor="op-expenses" className='text-sm'>Распределить операционные расходы</Label>
                        </div>
                      </div>
                      <div className='ml-auto flex items-center gap-2'>
                         <Button variant="outline">
                            <Download className="mr-2 h-4 w-4" />
                            Выгрузить в Excel
                         </Button>
                         <Button variant="ghost" size="icon"><BarChart className='h-5 w-5'/></Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                        <div className='flex items-center justify-between py-2'>
                           <Badge>Все {unitEconomicsByItemData.length}</Badge>
                        </div>
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Товар</TableHead>
                                    <TableHead>Общая прибыль, ₽</TableHead>
                                    <TableHead>Рентабельность, %</TableHead>
                                    <TableHead>Сайт, ₽</TableHead>
                                    <TableHead>%</TableHead>
                                    <TableHead>Витрина, ₽</TableHead>
                                    <TableHead>%</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {unitEconomicsByItemData.map((item, index) => (
                                    <TableRow key={index}>
                                        <TableCell className="font-medium">{item.name}</TableCell>
                                        <TableCell>{item.totalProfit.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</TableCell>
                                        <TableCell>{item.profitability.toFixed(2)}</TableCell>
                                        <TableCell>{item.siteProfit?.toLocaleString('ru-RU', {minimumFractionDigits: 2}) || '—'}</TableCell>
                                        <TableCell>{item.sitePercent?.toFixed(2) || '—'}</TableCell>
                                        <TableCell>{item.retailProfit?.toLocaleString('ru-RU', {minimumFractionDigits: 2}) || '—'}</TableCell>
                                        <TableCell>{item.retailPercent?.toFixed(2) || '—'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <div className="flex items-center justify-end space-x-2 py-4">
                            <Pagination>
                                <PaginationContent>
                                    <PaginationItem>
                                    <PaginationPrevious href="#" />
                                    </PaginationItem>
                                    <PaginationItem>
                                        <span className="text-sm text-muted-foreground">1-12 из {unitEconomicsByItemData.length}</span>
                                    </PaginationItem>
                                    <PaginationItem>
                                    <PaginationNext href="#" />
                                    </PaginationItem>
                                </PaginationContent>
                            </Pagination>
                        </div>
                    </CardContent>
                  </Card>
                </TabsContent>
            </Tabs>
        </main>
      </div>
    </div>
  );
}

    



    

    

    