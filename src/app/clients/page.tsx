
"use client";

import * as React from "react";
import Link from "next/link";
import { PlusCircle, Pencil, Search, ArrowUpDown, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import type { Customer, CustomerOrder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AppLayout } from "@/app/components/app-layout";
import { useRouter } from "next/navigation";


type ClientWithDetails = Customer & { 
  orderCount: number;
  balance: number;
};


const ClientRow = ({ client, orders, onStatusChange }: { client: ClientWithDetails, orders: CustomerOrder[], onStatusChange: (clientId: string, active: boolean) => void }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const router = useRouter();

  const clientOrders = orders.filter(order => order.clientId === client.id);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Оплачено':
        return 'success';
      case 'ДОЛГ':
        return 'danger';
      case 'Переплата':
        return 'info';
      default:
        return 'warning';
    }
  }

  return (
    <>
      <TableRow>
        <TableCell>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-8 w-8">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>{client.lastName}</TableCell>
        <TableCell>{client.firstName}</TableCell>
        <TableCell>{client.patronymic || "-"}</TableCell>
        <TableCell>{client.orderCount}</TableCell>
        <TableCell>{client.phone || "-"}</TableCell>
        <TableCell>
          <Switch
            checked={client.active}
            onCheckedChange={(checked) => onStatusChange(client.id, checked)}
            aria-label="Client status"
          />
        </TableCell>
        <TableCell
          className={cn(
            "font-medium",
            client.balance > 0 ? "text-green-600" : client.balance < 0 ? "text-red-600" : ""
          )}
        >
          {client.balance.toLocaleString("ru-RU", {
            style: "currency",
            currency: "RUB",
            maximumFractionDigits: 0,
          })}
        </TableCell>
        <TableCell className="text-right">
          <div className="flex items-center justify-end gap-2">
            {client.comments && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-default">
                        <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs whitespace-normal text-left">
                    <p>{client.comments}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/clients/${client.id}`)}>
                <Pencil className="h-4 w-4" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={9} className="p-0">
            <div className="p-4 bg-secondary/50">
              {clientOrders.length > 0 ? (
                <Table>
                  <TableHeader>
                      <TableRow className="hover:bg-transparent">
                          <TableHead>Номер заказа</TableHead>
                          <TableHead>Статус</TableHead>
                          <TableHead className="text-right">Итого</TableHead>
                          <TableHead className="w-10"></TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {clientOrders.map(order => (
                           <TableRow key={order.id} className="bg-white hover:bg-white">
                              <TableCell>#{order.orderNumber}</TableCell>
                              <TableCell>
                                <Badge variant={getStatusVariant(order.status)} className="font-semibold">
                                    {order.status}
                                    {order.statusAmount && `: ${order.statusAmount.toLocaleString('ru-RU', {maximumFractionDigits: 0})}`}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-right font-medium">{order.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                              <TableCell>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/orders/${order.id}`)}>
                                    <Pencil className="h-4 w-4" />
                                </Button>
                              </TableCell>
                           </TableRow>
                      ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">У этого клиента еще нет заказов.</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

type SortConfig = {
  key: keyof ClientWithDetails;
  direction: "ascending" | "descending";
};


function ClientTable({ clients, orders, isLoading, onSort, sortConfig, onStatusChange }: { clients: ClientWithDetails[], orders: CustomerOrder[], isLoading: boolean, onSort: (key: keyof ClientWithDetails) => void, sortConfig: SortConfig | null, onStatusChange: (clientId: string, active: boolean) => void }) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!clients || clients.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-10">
        Нет клиентов.
      </div>
    );
  }
  
  const renderSortArrow = (key: keyof ClientWithDetails) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12"></TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('lastName')}>Фамилия {renderSortArrow('lastName')}</Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('firstName')}>Имя {renderSortArrow('firstName')}</Button>
          </TableHead>
          <TableHead>
             <Button variant="ghost" onClick={() => onSort('patronymic')}>Отчество {renderSortArrow('patronymic')}</Button>
          </TableHead>
           <TableHead>
            <Button variant="ghost" onClick={() => onSort('orderCount')}>Кол-во заказов {renderSortArrow('orderCount')}</Button>
          </TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('phone')}>Телефон {renderSortArrow('phone')}</Button>
          </TableHead>
          <TableHead>Статус</TableHead>
          <TableHead>
            <Button variant="ghost" onClick={() => onSort('balance')}>Баланс {renderSortArrow('balance')}</Button>
          </TableHead>
          <TableHead className="text-right">Действия</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client) => (
          <ClientRow key={client.id} client={client} orders={orders} onStatusChange={onStatusChange} />
        ))}
      </TableBody>
    </Table>
  );
}

export default function ClientsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [showInactive, setShowInactive] = React.useState(false);
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>({ key: 'lastName', direction: 'ascending' });

  const clientsRef = useMemoFirebase(() => (firestore ? collection(firestore, "clients") : null), [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);
  
  const ordersRef = useMemoFirebase(() => (firestore) ? collection(firestore, "orders") : null, [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer' | 'id'>>(ordersRef);

  const [customerOrders, setCustomerOrders] = React.useState<CustomerOrder[]>([]);

  React.useEffect(() => {
    if (orders && clients) {
      const enrichedOrders = orders.map(order => {
        const client = clients.find(c => c.id === order.clientId);
        return {
          ...order,
          id: order.id,
          customer: client || { id: order.clientId, firstName: 'Unknown', lastName: 'Client', active: false },
        };
      });
      setCustomerOrders(enrichedOrders);
    }
  }, [orders, clients]);
  
  const isLoading = areClientsLoading || areOrdersLoading;

  const filteredAndSortedClients = React.useMemo(() => {
    if (!clients || !orders) return [];
    
    const clientsWithDetails: ClientWithDetails[] = clients.map(client => {
        const clientOrders = orders.filter(order => order.clientId === client.id);
        const balance = -clientOrders.reduce((acc, order) => {
            const orderTotal = (order.items || [])
                .filter(item => item.status !== 'Отказ' && item.status !== 'Создан')
                .reduce((sum, item) => sum + item.total, 0);
            const orderRemaining = orderTotal - (order.amountPaid || 0);
            return acc + orderRemaining;
        }, 0);
        return {
            ...client,
            orderCount: clientOrders.length,
            balance: balance,
        };
    });
    
    let filtered = clientsWithDetails.filter(client => {
        if (!showInactive && !client.active) {
            return false;
        }
        const searchTermLower = searchTerm.toLowerCase();
        return (
            (client.lastName || '').toLowerCase().includes(searchTermLower) ||
            (client.firstName || '').toLowerCase().includes(searchTermLower) ||
            (client.patronymic || '').toLowerCase().includes(searchTermLower) ||
            (client.email || '').toLowerCase().includes(searchTermLower) ||
            (client.phone || '').toLowerCase().includes(searchTermLower)
        );
    });

    if (sortConfig !== null) {
      filtered.sort((a, b) => {
        const key = sortConfig.key as keyof ClientWithDetails;
        const aValue = a[key];
        const bValue = b[key];
        const direction = sortConfig.direction === 'ascending' ? 1 : -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * direction;
        }

        const aString = String(aValue || '').toLowerCase();
        const bString = String(bValue || '').toLowerCase();
        
        return aString.localeCompare(bString, 'ru') * direction;
      });
    }

    return filtered;
  }, [clients, orders, searchTerm, sortConfig, showInactive]);

  const handleSort = (key: keyof ClientWithDetails) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const handleStatusChange = (clientId: string, active: boolean) => {
    if (!firestore) return;
    const clientDocRef = doc(firestore, 'clients', clientId);
    updateDocumentNonBlocking(clientDocRef, { active });
    toast({
      title: "Статус обновлен",
      description: `Клиент был ${active ? 'активирован' : 'деактивирован'}.`,
    });
  };

  return (
    <AppLayout pageTitle="Клиенты">
        <div className="flex w-full items-center gap-4 md:ml-auto md:gap-2 lg:gap-4 mb-4">
            <form className="ml-auto flex-1 sm:flex-initial">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Поиск по клиентам..."
                        className="pl-8 sm:w-[200px] lg:w-[300px]"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </form>
            <div className="flex items-center space-x-2">
                <Checkbox
                    id="show-inactive"
                    checked={showInactive}
                    onCheckedChange={(checked) => setShowInactive(checked as boolean)}
                />
                <Label htmlFor="show-inactive" className="text-sm font-medium">
                    Показать неактивные
                </Label>
            </div>
            <Button asChild>
                <Link href="/clients/new">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Добавить клиента
                </Link>
            </Button>
        </div>
        <Card>
            <CardHeader>
            <CardTitle>Клиенты</CardTitle>
            <CardDescription>
                Список всех ваших клиентов. Нажмите на строку, чтобы увидеть их заказы.
            </CardDescription>
            </CardHeader>
            <CardContent>
            <ClientTable clients={filteredAndSortedClients} orders={customerOrders} isLoading={isLoading} onSort={handleSort} sortConfig={sortConfig} onStatusChange={handleStatusChange} />
            </CardContent>
        </Card>
    </AppLayout>
  );
}