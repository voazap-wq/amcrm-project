
"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpDown, Pencil, Trash2, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { format } from 'date-fns';

import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomerOrder, OrderStatus, Product, ItemStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


const OrderRow = ({ order, itemStatuses }: { order: CustomerOrder, itemStatuses: ItemStatus[] }) => {
  const [isOpen, setIsOpen] = React.useState(false);
  
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

  const getItemStatusColor = (statusName: string): string => {
    const status = itemStatuses?.find(s => s.name === statusName);
    return status ? status.color : '#808080'; // a default gray color
  };

  return (
    <>
      <TableRow>
        <TableCell>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className="h-8 w-8">
            {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell>
            <div className="flex items-center gap-2">
                <span>{order.orderNumber}</span>
                <span>({order.itemCount})</span>
                <span>{order.customer.lastName} {order.customer.firstName}</span>
            </div>
        </TableCell>
        <TableCell>{order.createdAt ? format(order.createdAt.toDate(), 'dd.MM.yyyy HH:mm') : '-'}</TableCell>
        <TableCell>
          {order.items.slice(0, 8).map((item, index) => (
            <span key={item.id + index} className="inline-block w-3 h-3 rounded-full mr-1" style={{ backgroundColor: getItemStatusColor(item.status) }}></span>
          ))}
          {order.items.length > 8 && <span className="text-muted-foreground">...</span>}
        </TableCell>
        <TableCell>
            <div className="flex items-center gap-2">
             <Badge variant={getStatusVariant(order.status)} className="font-semibold text-muted-foreground">
                {order.status}
                {order.statusAmount && `: ${order.statusAmount.toLocaleString('ru-RU')}`}
            </Badge>
            </div>
        </TableCell>
        <TableCell>
          <Badge variant={order.active !== false ? "success" : "secondary"}>
            {order.active !== false ? "Активен" : "В архиве"}
          </Badge>
        </TableCell>
        <TableCell className="text-right font-medium">{order.total.toLocaleString('ru-RU')}</TableCell>
         <TableCell className="text-right">
            <div className="flex items-center justify-end gap-2">
                {order.comments && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 cursor-default">
                            <FileText className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs whitespace-normal text-left">
                        <p>{order.comments}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <Link href={`/orders/${order.id}`}>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Pencil className="h-4 w-4" />
                  </Button>
                </Link>
            </div>
        </TableCell>
      </TableRow>
      {isOpen && (
        <TableRow>
          <TableCell colSpan={8} className="p-0">
            <div className="p-4 bg-secondary/50">
               <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead>Наименование</TableHead>
                        <TableHead>Артикул</TableHead>
                        <TableHead>Производитель</TableHead>
                        <TableHead>Цена</TableHead>
                        <TableHead>Кол-во</TableHead>
                        <TableHead>Итого</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {order.items.map(item => (
                         <TableRow key={item.id} className="bg-white hover:bg-white">
                            <TableCell>{item.name}</TableCell>
                            <TableCell>{item.article}</TableCell>
                            <TableCell>{item.manufacturer}</TableCell>
                            <TableCell>{item.price.toLocaleString('ru-RU')}</TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{item.total.toLocaleString('ru-RU')}</TableCell>
                         </TableRow>
                    ))}
                </TableBody>
               </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

type SortConfig = {
  key: keyof CustomerOrder;
  direction: "ascending" | "descending";
};

export function OrderTable({ 
    data, 
    isLoading, 
    itemStatuses,
    onSort,
    sortConfig,
}: { 
    data: CustomerOrder[], 
    isLoading: boolean, 
    itemStatuses: ItemStatus[],
    onSort: (key: keyof CustomerOrder) => void,
    sortConfig: SortConfig | null,
}) {
  if (isLoading) {
    return (
      <div className="w-full p-4 space-y-2">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
      </div>
    );
  }

  const renderSortArrow = (key: keyof CustomerOrder) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };
  
  return (
    <div className="w-full">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12"></TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => onSort('orderNumber')}>Заказ {renderSortArrow('orderNumber')}</Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => onSort('createdAt')}>Дата {renderSortArrow('createdAt')}</Button>
              </TableHead>
              <TableHead>Позиции</TableHead>
              <TableHead>Статус</TableHead>
              <TableHead>
                  <Button variant="ghost" onClick={() => onSort('active')}>Статус архива {renderSortArrow('active')}</Button>
              </TableHead>
              <TableHead className="text-right">Итого</TableHead>
              <TableHead className="w-[100px] text-right">Действия</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.map((order) => (
                <OrderRow key={order.id} order={order} itemStatuses={itemStatuses} />
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  Нет заказов.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        <div className="flex items-center justify-between p-4">
            <div className="text-sm text-muted-foreground">
                Items per page:
                <Select defaultValue="10">
                    <SelectTrigger className="inline-flex w-auto h-8 ml-2 px-2 py-1">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <Pagination className="mx-0 w-auto">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious href="#" size="sm" />
                </PaginationItem>
                <PaginationItem className="text-sm text-muted-foreground">
                    1-10 of 42
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext href="#" size="sm" />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
        </div>
    </div>
  );
}
