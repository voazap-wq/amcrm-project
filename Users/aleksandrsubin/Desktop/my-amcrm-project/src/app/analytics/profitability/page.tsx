
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sliders,
  LogOut,
  ChevronsUpDown,
  Car,
  Users,
  ShoppingCart,
  Package,
  Truck,
  ReceiptText,
  BarChart,
  ChevronLeft,
  Search,
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
import type { CustomerOrder, Product } from "@/lib/types";

type ProductProfitability = Product & {
    orderCount: number;
    avgMarkupPercentage: number;
};

export default function ProfitabilityReportPage() {
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = React.useState("");

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

  const isLoading = areOrdersLoading;

  const allItems: ProductProfitability[] = React.useMemo(() => {
    if (!orders) return [];
    
    const itemMap: Record<string, ProductProfitability & { totalPurchase: number }> = {};

    orders.forEach(order => {
        (order.items || []).forEach(item => {
            if (item.status === 'Отказ') return;

            const key = `${item.article || ''}-${item.name}`;
            if (!itemMap[key]) {
                itemMap[key] = {
                    ...item,
                    orderCount: 0,
                    quantity: 0,
                    total: 0,
                    markup: 0,
                    purchase: item.purchase || 0,
                    totalPurchase: 0,
                    avgMarkupPercentage: 0,
                };
            }
            const currentItem = itemMap[key];
            currentItem.orderCount += 1;
            currentItem.quantity += item.quantity;
            currentItem.total += item.total;
            currentItem.markup = (currentItem.markup || 0) + (item.markup || 0);
            currentItem.totalPurchase += (item.purchase || 0) * item.quantity;
        });
    });

    return Object.values(itemMap).map(item => {
        const avgMarkupPercentage = item.totalPurchase > 0 ? (item.markup / item.totalPurchase) * 100 : 0;
        return { ...item, avgMarkupPercentage };
    }).sort((a,b) => (b.markup || 0) - (a.markup || 0));

  }, [orders]);

  const filteredItems = React.useMemo(() => {
    if (!searchTerm) {
      return allItems;
    }
    const lowercasedFilter = searchTerm.toLowerCase();
    return allItems.filter(item => 
      item.name.toLowerCase().includes(lowercasedFilter) ||
      (item.manufacturer && item.manufacturer.toLowerCase().includes(lowercasedFilter)) ||
      (item.article && item.article.toLowerCase().includes(lowercasedFilter))
    );
  }, [allItems, searchTerm]);

  const totals = React.useMemo(() => {
    let totalPurchase = 0;
    let totalSale = 0;
    let totalMarkup = 0;

    filteredItems.forEach(item => {
        totalPurchase += (item.purchase || 0) * item.quantity;
        totalSale += item.total;
        totalMarkup += item.markup || 0;
    });

    const overallMarkupPercentage = totalPurchase > 0 ? (totalMarkup / totalPurchase) * 100 : 0;

    return { 
        purchase: totalPurchase, 
        total: totalSale, 
        markup: totalMarkup,
        markupPercentage: overallMarkupPercentage
    };
  }, [filteredItems]);

  if (isLoading) {
    return (
      <AppLayout pageTitle="Рентабельность по товарам">
         <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-96 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Рентабельность по товарам">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
              <Link href="/analytics">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Рентабельность по товарам</h1>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Общая рентабельность</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                      <p className="text-sm text-muted-foreground">Закупка</p>
                      <p className="text-2xl font-bold">{totals.purchase.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                      <p className="text-sm text-muted-foreground">Продажа</p>
                      <p className="text-2xl font-bold">{totals.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                      <p className="text-sm text-muted-foreground">Маржа</p>
                      <p className="text-2xl font-bold text-green-600">{totals.markup.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                      <p className="text-sm text-muted-foreground">Маржа, %</p>
                      <p className="text-2xl font-bold text-blue-600">{totals.markupPercentage.toFixed(0)}%</p>
                  </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Отчет по рентабельности</CardTitle>
                  <CardDescription>Общая прибыльность по всем проданным товарам.</CardDescription>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по товарам..."
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
                    <TableHead>Наименование</TableHead>
                    <TableHead>Производитель</TableHead>
                    <TableHead className="text-right">Закупка</TableHead>
                    <TableHead className="text-right">Продажа</TableHead>
                    <TableHead className="text-center">Кол-во</TableHead>
                    <TableHead className="text-right">Маржа</TableHead>
                    <TableHead className="text-right">Маржа, %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.length > 0 ? (
                    filteredItems.map(item => (
                      <TableRow key={`${item.article}-${item.name}`}>
                        <TableCell className="font-medium">{item.name}</TableCell>
                        <TableCell>{item.manufacturer || '-'}</TableCell>
                        <TableCell className="text-right">{((item.purchase || 0) * item.quantity).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-right">{item.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                        <TableCell className="text-center">{item.quantity}</TableCell>
                        <TableCell className="text-right font-bold text-green-600">{(item.markup || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                         <TableCell className="text-right font-semibold text-blue-600">{item.avgMarkupPercentage.toFixed(0)}%</TableCell>
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
