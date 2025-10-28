
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
  ArrowUpDown,
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
import { sidebarNav } from "@/app/page";
import { cn } from "@/lib/utils";
import type { CustomerOrder, Customer, Product } from "@/lib/types";
import { AppLayout } from "@/app/components/app-layout";

type ClientReportData = Customer & {
  orderCount: number;
  totalAmount: number;
  avgCheck: number;
  totalMargin: number;
};

type SortConfig = {
  key: keyof ClientReportData;
  direction: 'ascending' | 'descending';
};

export default function ClientsReportPage() {
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>({ key: 'totalAmount', direction: 'descending' });

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);
  
  const clientsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const isLoading = areOrdersLoading || areClientsLoading;

  const clientReportData = React.useMemo(() => {
    if (!orders || !clients) return [];
    
    return clients.map(client => {
      const clientOrders = orders.filter(o => o.clientId === client.id);
      const orderCount = clientOrders.length;
      
      const totalAmount = clientOrders.reduce((sum, order) => {
        const orderTotal = (order.items || []).reduce((itemSum, item) => itemSum + item.total, 0);
        return sum + orderTotal;
      }, 0);

      const totalMargin = clientOrders.reduce((marginSum, order) => {
        const orderMargin = (order.items || []).reduce((itemMarginSum, item) => itemMarginSum + (item.markup || 0), 0);
        return marginSum + orderMargin;
      }, 0);
      
      const avgCheck = orderCount > 0 ? totalAmount / orderCount : 0;
      
      return {
        ...client,
        orderCount,
        totalAmount,
        avgCheck,
        totalMargin,
      };
    });

  }, [orders, clients]);

  const filteredAndSortedClients = React.useMemo(() => {
    let filtered = clientReportData;
    
    if (searchTerm) {
      const lowercasedFilter = searchTerm.toLowerCase();
      filtered = filtered.filter(client => 
        (client.lastName || '').toLowerCase().includes(lowercasedFilter) ||
        (client.firstName || '').toLowerCase().includes(lowercasedFilter) ||
        (client.phone || '').toLowerCase().includes(lowercasedFilter) ||
        (client.email || '').toLowerCase().includes(lowercasedFilter)
      );
    }
    
    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }

    return filtered;
  }, [clientReportData, searchTerm, sortConfig]);

  const totals = React.useMemo(() => {
    return filteredAndSortedClients.reduce((acc, client) => {
        acc.clientCount += 1;
        acc.orderCount += client.orderCount;
        acc.totalAmount += client.totalAmount;
        acc.totalMargin += client.totalMargin;
        return acc;
    }, {
        clientCount: 0,
        orderCount: 0,
        totalAmount: 0,
        totalMargin: 0,
    });
  }, [filteredAndSortedClients]);

  const handleSort = (key: keyof ClientReportData) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const renderSortArrow = (key: keyof ClientReportData) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  if (isLoading) {
    return (
        <AppLayout pageTitle="Отчет по клиентам">
             <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-96 w-full" />
            </div>
        </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Отчет по клиентам">
      <div className="space-y-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
              <Link href="/analytics">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
              </Link>
            </Button>
            <h1 className="text-xl font-semibold">Отчет по клиентам</h1>
          </div>
          <Card>
            <CardHeader>
                <CardTitle>Сводка по клиентам</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                        <p className="text-sm text-muted-foreground">Всего клиентов</p>
                        <p className="text-2xl font-bold">{totals.clientCount}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Всего заказов</p>
                        <p className="text-2xl font-bold">{totals.orderCount}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Общая сумма продаж</p>
                        <p className="text-2xl font-bold">{totals.totalAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground">Общая прибыль</p>
                        <p className="text-2xl font-bold text-green-600">{totals.totalMargin.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                    </div>
                </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Клиентская база</CardTitle>
                  <CardDescription>Анализ покупательской активности каждого клиента.</CardDescription>
                </div>
                <div className="relative w-full max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по клиентам..."
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
                    <TableHead><Button variant="ghost" onClick={() => handleSort('lastName')}>Клиент {renderSortArrow('lastName')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('orderCount')}>Заказы {renderSortArrow('orderCount')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('totalAmount')}>Общая сумма {renderSortArrow('totalAmount')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('avgCheck')}>Средний чек {renderSortArrow('avgCheck')}</Button></TableHead>
                    <TableHead><Button variant="ghost" onClick={() => handleSort('totalMargin')}>Прибыль {renderSortArrow('totalMargin')}</Button></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedClients.length > 0 ? (
                    filteredAndSortedClients.map(client => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">
                          <Link href={`/clients/${client.id}`} className="hover:underline">{client.lastName} {client.firstName}</Link>
                        </TableCell>
                        <TableCell className="text-center">{client.orderCount}</TableCell>
                        <TableCell>{client.totalAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>
                        <TableCell>{client.avgCheck.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>
                        <TableCell className="font-semibold text-green-600">{client.totalMargin.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
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
