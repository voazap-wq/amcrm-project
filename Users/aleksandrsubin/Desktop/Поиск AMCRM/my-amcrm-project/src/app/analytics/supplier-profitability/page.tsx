
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
  Trophy,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AppLayout } from "@/app/components/app-layout";
import { cn } from "@/lib/utils";
import type { CustomerOrder, Supplier } from "@/lib/types";
import { format, differenceInDays } from "date-fns";

type SupplierProfitability = {
    supplierName: string;
    totalPurchase: number;
    itemCount: number;
    orderCount: number;
    lastPurchaseDate: Date | null;
    daysSinceLastPurchase: number | null;
    purchasePercentage: number;
};

const getGradientColor = (value: number, min: number, max: number) => {
    if (min === max) return 'hsl(60, 80%, 85%)'; // Neutral color if all values are the same
    const ratio = (value - min) / (max - min);
    const hue = (ratio * 120).toString(10); // 0 (red) to 120 (green)
    return `hsl(${hue}, 80%, 85%)`;
};


export default function SupplierProfitabilityPage() {
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = React.useState("");

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);
  
  const suppliersRef = useMemoFirebase(() => (firestore ? collection(firestore, 'suppliers') : null), [firestore]);
  const { data: suppliers, isLoading: areSuppliersLoading } = useCollection<Supplier>(suppliersRef);

  const isLoading = areOrdersLoading || areSuppliersLoading;

  const supplierData: SupplierProfitability[] = React.useMemo(() => {
    if (!orders || !suppliers) return [];
    
    const supplierMap: Record<string, { 
        totalPurchase: number; 
        itemCount: number; 
        orderIds: Set<string>; 
        lastPurchaseDate: Date | null;
    }> = {};

    orders.forEach(order => {
        const orderDate = order.createdAt.toDate();
        (order.items || []).forEach(item => {
            if (item.status === 'Отказ') return;

            const supplierName = item.supplier || "Без поставщика";
            if (!supplierMap[supplierName]) {
                supplierMap[supplierName] = {
                    totalPurchase: 0,
                    itemCount: 0,
                    orderIds: new Set(),
                    lastPurchaseDate: null,
                };
            }
            const currentSupplier = supplierMap[supplierName];
            const purchasePrice = (item.purchase || 0) * item.quantity;
            currentSupplier.totalPurchase += purchasePrice;
            currentSupplier.itemCount += item.quantity;
            currentSupplier.orderIds.add(order.id);

            if (!currentSupplier.lastPurchaseDate || orderDate > currentSupplier.lastPurchaseDate) {
                currentSupplier.lastPurchaseDate = orderDate;
            }
        });
    });

    const totalPurchaseForAllSuppliers = Object.values(supplierMap).reduce((sum, data) => sum + data.totalPurchase, 0);

    return Object.entries(supplierMap).map(([supplierName, data]) => {
        const daysSinceLastPurchase = data.lastPurchaseDate ? differenceInDays(new Date(), data.lastPurchaseDate) : null;
        const purchasePercentage = totalPurchaseForAllSuppliers > 0 ? (data.totalPurchase / totalPurchaseForAllSuppliers) * 100 : 0;
        return { 
            supplierName, 
            totalPurchase: data.totalPurchase,
            itemCount: data.itemCount,
            orderCount: data.orderIds.size,
            lastPurchaseDate: data.lastPurchaseDate,
            daysSinceLastPurchase: daysSinceLastPurchase,
            purchasePercentage,
        };
    }).sort((a,b) => b.totalPurchase - a.totalPurchase);

  }, [orders, suppliers]);

  const filteredSuppliers = React.useMemo(() => {
    if (!searchTerm) {
      return supplierData;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return supplierData.filter(item => 
      item.supplierName.toLowerCase().includes(lowercasedFilter)
    );
  }, [supplierData, searchTerm]);

  const totals = React.useMemo(() => {
    const totalPurchase = filteredSuppliers.reduce((sum, s) => sum + s.totalPurchase, 0);
    const totalItemCount = filteredSuppliers.reduce((sum, s) => sum + s.itemCount, 0);
    const averagePercentage = filteredSuppliers.length > 0
        ? filteredSuppliers.reduce((sum, s) => sum + s.purchasePercentage, 0) / filteredSuppliers.length
        : 0;
    
    // To get a unique count of orders, we need to go back to the original data
    const allOrderIds = new Set<string>();
    const supplierNamesInFilter = new Set(filteredSuppliers.map(s => s.supplierName));
    
    orders?.forEach(order => {
        const hasRelevantSupplier = order.items.some(item => {
            const supplierName = item.supplier || "Без поставщика";
            return supplierNamesInFilter.has(supplierName);
        });
        if (hasRelevantSupplier) {
            allOrderIds.add(order.id);
        }
    });

    const totalOrderCount = allOrderIds.size;
    const topSuppliers = filteredSuppliers.slice(0, 3).map(s => s.supplierName);

    return { totalPurchase, totalItemCount, totalOrderCount, topSuppliers, averagePercentage };
  }, [filteredSuppliers, orders]);

  const { minPurchase, maxPurchase, minPercentage, maxPercentage } = React.useMemo(() => {
    if (filteredSuppliers.length === 0) {
        return { minPurchase: 0, maxPurchase: 0, minPercentage: 0, maxPercentage: 0 };
    }
    const purchases = filteredSuppliers.map(s => s.totalPurchase);
    const percentages = filteredSuppliers.map(s => s.purchasePercentage);
    return {
        minPurchase: Math.min(...purchases),
        maxPurchase: Math.max(...purchases),
        minPercentage: Math.min(...percentages),
        maxPercentage: Math.max(...percentages),
    };
  }, [filteredSuppliers]);

  if (isLoading) {
    return (
      <AppLayout pageTitle="Рентабельность по поставщикам">
        <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Рентабельность по поставщикам">
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
              <Link href="/analytics">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Рентабельность по поставщикам</h1>
          </div>
           <Card>
            <CardHeader>
              <CardTitle>Сводка по поставщикам</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-4 text-center">
                  <div>
                      <p className="text-sm text-muted-foreground">Всего закуплено</p>
                      <p className="text-2xl font-bold">{totals.totalPurchase.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                      <p className="text-sm text-muted-foreground">Деталей</p>
                      <p className="text-2xl font-bold">{totals.totalItemCount}</p>
                  </div>
                  <div>
                      <p className="text-sm text-muted-foreground">Заказов</p>
                      <p className="text-2xl font-bold">{totals.totalOrderCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Средняя доля</p>
                    <p className="text-2xl font-bold">{totals.averagePercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <div className="flex items-center justify-center gap-2">
                      <Trophy className="h-5 w-5 text-amber-500" />
                      <p className="text-sm text-muted-foreground">Топ поставщики</p>
                    </div>
                     {totals.topSuppliers.length > 0 ? (
                        <div className="text-base font-bold text-amber-600 mt-2">
                            {totals.topSuppliers.join(', ')}
                        </div>
                     ) : (
                        <p className="text-2xl font-bold text-amber-600">-</p>
                     )}
                  </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Отчет по поставщикам</CardTitle>
                  <CardDescription>Информация о закупках у каждого поставщика.</CardDescription>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по поставщикам..."
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
                    <TableHead>Поставщик</TableHead>
                    <TableHead>Кол-во деталей</TableHead>
                    <TableHead>Кол-во заказов</TableHead>
                    <TableHead>Последняя закупка</TableHead>
                    <TableHead>Дней назад</TableHead>
                    <TableHead className="text-right">Закупка</TableHead>
                    <TableHead className="text-right">Доля, %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSuppliers.length > 0 ? (
                    filteredSuppliers.map(item => (
                      <TableRow key={item.supplierName}>
                        <TableCell className="font-medium">{item.supplierName}</TableCell>
                        <TableCell className="text-center">{item.itemCount}</TableCell>
                        <TableCell className="text-center">{item.orderCount}</TableCell>
                        <TableCell>{item.lastPurchaseDate ? format(item.lastPurchaseDate, 'dd.MM.yyyy') : '-'}</TableCell>
                        <TableCell>{item.daysSinceLastPurchase !== null ? `${item.daysSinceLastPurchase} дн.` : '-'}</TableCell>
                        <TableCell 
                            className="text-right font-medium" 
                            style={{ backgroundColor: getGradientColor(item.totalPurchase, minPurchase, maxPurchase) }}
                        >
                            {item.totalPurchase.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                        </TableCell>
                        <TableCell 
                            className="text-right font-semibold"
                            style={{ backgroundColor: getGradientColor(item.purchasePercentage, minPercentage, maxPercentage) }}
                        >
                            {item.purchasePercentage.toFixed(1)}%
                        </TableCell>
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
