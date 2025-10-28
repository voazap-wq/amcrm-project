
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sliders,
  LogOut,
  ChevronsUpDown,
  Car,
  Users,
  ReceiptText,
  BarChart,
  ChevronLeft,
  Search,
  Download,
  Info,
  Calendar as CalendarIcon,
} from "lucide-react";
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarTrigger } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/app/components/app-layout";
import { cn } from "@/lib/utils";
import type { CustomerOrder, Product } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { DateRange } from "react-day-picker";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

type UnitEconomicsItem = {
    name: string;
    totalProfit: number;
    profitability: number;
    siteProfit: number | null;
    siteProfitability: number | null;
    retailProfit: number | null;
    retailProfitability: number | null;
    totalPurchase: number;
    sitePurchase: number;
    retailPurchase: number;
};

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

export default function UnitEconomicsPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = React.useState("");

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

  const isLoading = areOrdersLoading;

  const unitEconomicsData = React.useMemo(() => {
    if (!orders) return [];
  
    const itemMap: Record<string, {
      name: string;
      totalProfit: number;
      totalPurchase: number;
      siteProfit: number;
      sitePurchase: number;
      retailProfit: number;
      retailPurchase: number;
    }> = {};
  
    orders.forEach(order => {
      const channel = order.channel || "Витрина";
      (order.items || []).forEach(item => {
        if (item.status === 'Отказ') return;
  
        const key = `${item.article || ''}-${item.name}`;
        const profit = item.markup || 0;
        const purchasePrice = (item.purchase || 0) * (item.quantity || 1);
  
        if (!itemMap[key]) {
          itemMap[key] = {
            name: item.name,
            totalProfit: 0,
            totalPurchase: 0,
            siteProfit: 0,
            sitePurchase: 0,
            retailProfit: 0,
            retailPurchase: 0,
          };
        }
  
        const currentItem = itemMap[key];
        currentItem.totalProfit += profit;
        currentItem.totalPurchase += purchasePrice;
  
        if (channel === 'Сайт') {
          currentItem.siteProfit += profit;
          currentItem.sitePurchase += purchasePrice;
        } else {
          currentItem.retailProfit += profit;
          currentItem.retailPurchase += purchasePrice;
        }
      });
    });
  
    return Object.values(itemMap).map(item => {
        const profitability = item.totalPurchase > 0 ? (item.totalProfit / item.totalPurchase) * 100 : 0;
        const siteProfitability = item.sitePurchase > 0 ? (item.siteProfit / item.sitePurchase) * 100 : 0;
        const retailProfitability = item.retailPurchase > 0 ? (item.retailProfit / item.retailPurchase) * 100 : 0;

        return {
            name: item.name,
            totalProfit: item.totalProfit,
            profitability: profitability,
            siteProfit: item.sitePurchase > 0 || item.siteProfit > 0 ? item.siteProfit : null,
            siteProfitability: item.sitePurchase > 0 || item.siteProfit > 0 ? siteProfitability : null,
            retailProfit: item.retailPurchase > 0 || item.retailProfit > 0 ? item.retailProfit : null,
            retailProfitability: item.retailPurchase > 0 || item.retailProfit > 0 ? retailProfitability : null,
            totalPurchase: item.totalPurchase,
            sitePurchase: item.sitePurchase,
            retailPurchase: item.retailPurchase,
        }
    }).sort((a,b) => b.totalProfit - a.totalProfit);
  
  }, [orders]);


  const filteredItems = React.useMemo(() => {
    if (!searchTerm) {
      return unitEconomicsData;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return unitEconomicsData.filter(item => 
      item.name.toLowerCase().includes(lowercasedFilter)
    );
  }, [unitEconomicsData, searchTerm]);

  const totals = React.useMemo(() => {
    let siteProfit = 0;
    let sitePurchase = 0;
    let retailProfit = 0;
    let retailPurchase = 0;

    unitEconomicsData.forEach(item => {
        siteProfit += item.siteProfit || 0;
        sitePurchase += item.sitePurchase || 0;
        retailProfit += item.retailProfit || 0;
        retailPurchase += item.retailPurchase || 0;
    });

    const siteProfitability = sitePurchase > 0 ? (siteProfit / sitePurchase) * 100 : 0;
    const retailProfitability = retailPurchase > 0 ? (retailProfit / retailPurchase) * 100 : 0;
    
    return {
        siteProfit,
        siteProfitability,
        retailProfit,
        retailProfitability,
    };
  }, [unitEconomicsData]);


  if (isLoading) {
    return (
      <AppLayout pageTitle="Юнит-экономика">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Юнит-экономика">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
              <Link href="/analytics">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Юнит-экономика</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Юнит-экономика по каналам продаж</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Сайт, ₽</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-baseline gap-4">
                    <p className="text-3xl font-bold">{totals.siteProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                    <p className="text-xl font-semibold text-blue-600">{totals.siteProfitability.toFixed(0)}%</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Витрина, ₽</CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-baseline gap-4">
                    <p className="text-3xl font-bold">{totals.retailProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                    <p className="text-xl font-semibold text-blue-600">{totals.retailProfitability.toFixed(0)}%</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className='h-6 w-6 text-muted-foreground'>
                                <Info className="h-4 w-4" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-80 space-y-4">
                            <p className="text-sm">Приведены показатели Прибыли (в валюте учета) и Рентабельности (в %) по товарам — общие и отдельно по каналам продаж.</p>
                            <p className="text-sm text-muted-foreground">Продолжаем разработку новых возможностей для аналитики по продажам.</p>
                            <Button variant="link" className="p-0 h-auto">Инструкция</Button>
                        </PopoverContent>
                    </Popover>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Период с</span>
                        <DateRangePicker />
                    </div>
                     <div className="flex items-center space-x-2">
                        <Switch id="op-expenses" />
                        <Label htmlFor="op-expenses" className='text-sm'>Распределить операционные расходы</Label>
                    </div>
                </div>
                <div className="flex gap-2">
                     <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Поиск по товарам..."
                            className="pl-8 h-8"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button variant="outline" size="sm">
                        <Download className="mr-2 h-4 w-4" />
                        Выгрузить в Excel
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Товар</TableHead>
                    <TableHead className="text-right">Общая прибыль, ₽</TableHead>
                    <TableHead className="text-right">Рентабельность, %</TableHead>
                    <TableHead className="text-right">Сайт, ₽</TableHead>
                    <TableHead className="text-right">%</TableHead>
                    <TableHead className="text-right">Витрина, ₽</TableHead>
                    <TableHead className="text-right">%</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell className="text-right">{item.totalProfit.toLocaleString('ru-RU', {minimumFractionDigits: 2})}</TableCell>
                        <TableCell className="text-right font-semibold">{item.profitability.toFixed(2)}</TableCell>
                        <TableCell className="text-right">{item.siteProfit?.toLocaleString('ru-RU', {minimumFractionDigits: 2}) || '—'}</TableCell>
                        <TableCell className="text-right">{item.siteProfitability?.toFixed(2) || '—'}</TableCell>
                        <TableCell className="text-right">{item.retailProfit?.toLocaleString('ru-RU', {minimumFractionDigits: 2}) || '—'}</TableCell>
                        <TableCell className="text-right">{item.retailProfitability?.toFixed(2) || '—'}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="h-24 text-center">
                        Нет данных для отображения.
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
