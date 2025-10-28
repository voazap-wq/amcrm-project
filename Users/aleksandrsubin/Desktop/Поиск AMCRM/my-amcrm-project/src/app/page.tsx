
"use client";

import { ShoppingCart, Package, Receipt, Building, Users, Sliders, Search, ChevronsUpDown, UserPlus, LogOut, Car, FileText, PlusCircle, ArrowUpDown, ReceiptText, BarChart, ClipboardCheck, CheckSquare, Calendar, HelpCircle, TestTube2 } from "lucide-react";
import { OrderTable } from "@/app/components/order-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { CustomerOrder, Customer, ItemStatus } from "@/lib/types";
import * as React from "react";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp } from "firebase/firestore";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AppLayout } from "@/app/components/app-layout";


export const sidebarNav = [
  { icon: Search, tooltip: 'Запросы', href: '/requests' },
  { icon: Package, tooltip: 'Заказы', href: '/' },
  { icon: Receipt, tooltip: 'Прием товара', href: '/receiving' },
  { icon: Building, tooltip: 'Склад', href: '/warehouse' },
  { icon: Car, tooltip: 'Автомобили', href: '/cars' },
  { icon: Users, tooltip: 'Клиенты', href: '/clients' },
  { icon: BarChart, tooltip: 'Аналитика', href: '/analytics' },
  { icon: ReceiptText, tooltip: 'Финансы', href: '/finance' },
  { icon: ReceiptText, tooltip: 'Финансы 2', href: '/finance2' },
  { icon: CheckSquare, tooltip: 'Дела', href: '/deals' },
  { icon: ClipboardCheck, tooltip: 'Заметки', href: '/notes' },
  { icon: Calendar, tooltip: 'Календарь поставок', href: '/delivery-calendar'},
  { icon: TestTube2, tooltip: 'Тест API', href: '/autoeuro-test' },
  { icon: Sliders, tooltip: 'Настройки', href: '/settings' },
];

type SortConfig = {
  key: keyof CustomerOrder;
  direction: "ascending" | "descending";
};

export default function Home() {
  const firestore = useFirestore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>({ key: 'orderNumber', direction: 'descending' });
  

  const ordersRef = useMemoFirebase(() => (firestore) ? collection(firestore, "orders") : null, [firestore]);
  const { data: orders, isLoading: areOrdersLoading, error: ordersError } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

  const clientsRef = useMemoFirebase(() => (firestore) ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clients, isLoading: areClientsLoading, error: clientsError } = useCollection<Customer>(clientsRef);

  const itemStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'itemStatuses') : null, [firestore]);
  const { data: itemStatuses, isLoading: areItemStatusesLoading, error: itemStatusesError } = useCollection<ItemStatus>(itemStatusesRef);


  const [customerOrders, setCustomerOrders] = React.useState<CustomerOrder[]>([]);

  React.useEffect(() => {
    if (ordersError) {
      console.error("Error fetching orders:", ordersError);
    }
    if (clientsError) {
      console.error("Error fetching clients:", clientsError);
    }
    if (itemStatusesError) {
      console.error("Error fetching item statuses:", itemStatusesError);
    }
  }, [ordersError, clientsError, itemStatusesError]);

  React.useEffect(() => {
    if (orders && clients) {
      const enrichedOrders = orders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        return {
          ...order,
          id: order.id, // The hook already provides the document id.
          customer: client || { id: order.clientId, firstName: 'Unknown', lastName: 'Client', active: false },
        };
      });
      setCustomerOrders(enrichedOrders);
    }
  }, [orders, clients]);

  const updateURLParams = React.useCallback((params: Record<string, string | null>) => {
    const current = new URLSearchParams(Array.from(searchParams.entries()));
    for (const key in params) {
        const value = params[key];
        if (value) {
            current.set(key, value);
        } else {
            current.delete(key);
        }
    }
    const search = current.toString();
    const query = search ? `?${search}` : "";
    router.replace(`${pathname}${query}`, { scroll: false });
  }, [searchParams, pathname, router]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateURLParams({ q: e.target.value || null });
  };
  
  const handleSort = (key: keyof CustomerOrder) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleShowArchivedChange = (checked: boolean | 'indeterminate') => {
      updateURLParams({ archived: checked ? 'true' : null });
  }
  
  const searchTerm = searchParams.get('q') || '';
  const showArchived = searchParams.get('archived') === 'true';

  const filteredAndSortedOrders = React.useMemo(() => {
    let filtered = [...customerOrders];
    
    if (!showArchived) {
      filtered = filtered.filter(order => order.active !== false);
    }

    if (searchTerm) {
        const searchTermLower = searchTerm.toLowerCase();
        filtered = filtered.filter(order => {
            const clientName = `${order.customer.firstName} ${order.customer.lastName}`.toLowerCase();
            const itemMatch = order.items.some(item => 
                (item.name || '').toLowerCase().includes(searchTermLower) ||
                (item.article || '').toLowerCase().includes(searchTermLower)
            );

            return (
                order.orderNumber.toString().toLowerCase().includes(searchTermLower) ||
                clientName.includes(searchTermLower) ||
                (order.status || '').toLowerCase().includes(searchTermLower) ||
                itemMatch
            );
        });
    }
    
    if (sortConfig !== null) {
        filtered.sort((a, b) => {
            const aValue = a[sortConfig.key];
            const bValue = b[sortConfig.key];
            const direction = sortConfig.direction === 'ascending' ? 1 : -1;

            if (sortConfig.key === 'active') {
              const aActive = a.active !== false;
              const bActive = b.active !== false;
              if (aActive === bActive) return 0;
              return (aActive ? -1 : 1) * direction;
            }

            if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
                return (aValue.toMillis() - bValue.toMillis()) * direction;
            }
            if (typeof aValue === 'number' && typeof bValue === 'number') {
                return (aValue - bValue) * direction;
            }
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                 if (sortConfig.key === 'orderNumber') {
                    return (parseInt(aValue) - parseInt(bValue)) * direction;
                }
                return aValue.localeCompare(bValue) * direction;
            }
            return 0;
        });
    }

    return filtered;
  }, [customerOrders, searchTerm, sortConfig, showArchived]);

  const isLoading = areOrdersLoading || areClientsLoading || areItemStatusesLoading;

  return (
    <AppLayout pageTitle="AMCRM: Заказы" showHeader={false}>
       <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold">AMCRM: Заказы</h1>
          </div>
          <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4">
             <div className="flex items-center space-x-2 ml-auto">
                <Checkbox id="show-archived" checked={showArchived} onCheckedChange={handleShowArchivedChange} />
                <Label htmlFor="show-archived" className="text-sm font-medium">Показать архивные</Label>
            </div>
            <div className="flex items-center gap-2">
                <Button asChild size="sm" variant="outline">
                    <Link href="/orders/new">
                        <PlusCircle className="h-4 w-4 mr-2" />
                        Новый заказ
                    </Link>
                </Button>
                <Button asChild size="sm" variant="outline">
                    <Link href="/clients/new">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Новый клиент
                    </Link>
                </Button>
            </div>
            <form className="flex-1 sm:flex-initial" onSubmit={(e) => e.preventDefault()}>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Клиент, заказ, запрос, артикул"
                  className="pl-8 sm:w-[300px] md:w-[200px] lg:w-[300px] bg-secondary/50"
                  defaultValue={searchParams.get('q') || ""}
                  onChange={handleSearchChange}
                />
              </div>
            </form>
          </div>
        </header>
        <div className="p-4 md:p-6">
            <div className="bg-white rounded-lg border shadow-sm">
                <OrderTable data={filteredAndSortedOrders} isLoading={isLoading} itemStatuses={itemStatuses || []} onSort={handleSort} sortConfig={sortConfig} />
            </div>
        </div>
    </AppLayout>
  );
}
