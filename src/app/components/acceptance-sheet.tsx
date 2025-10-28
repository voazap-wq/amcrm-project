
"use client";

import * as React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CustomerOrder, Product } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface AcceptanceSheetProps {
  order: CustomerOrder;
}

export const AcceptanceSheet = React.forwardRef<HTMLDivElement, AcceptanceSheetProps>(
  ({ order }, ref) => {
    
    const activeItems = (order.items || []).filter(item => item.status !== 'Отказ');

    const groupedBySupplier = activeItems.reduce((acc, item) => {
        const supplierName = item.supplier || "Без поставщика";
        if (!acc[supplierName]) {
            acc[supplierName] = [];
        }
        acc[supplierName].push(item);
        return acc;
    }, {} as Record<string, Product[]>);

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans text-sm w-full max-w-4xl mx-auto">
        <h1 className="text-2xl font-bold mb-2">
          Приемный лист по заказу № {order.orderNumber}
        </h1>
        <p className="text-muted-foreground mb-4">
          от {order.createdAt ? format(order.createdAt.toDate(), "d MMMM yyyy 'г.'", { locale: ru }) : ''}
        </p>
        <p className="mb-4">
            <span className="font-bold">Клиент:</span> {order.customer.lastName} {order.customer.firstName} {order.customer.patronymic || ''}
        </p>

        {Object.entries(groupedBySupplier).map(([supplierName, items], idx) => (
            <div key={supplierName} className={idx > 0 ? "mt-8" : ""}>
                <h2 className="text-xl font-semibold mb-2">{supplierName}</h2>
                <Table>
                    <TableHeader>
                        <TableRow className="border-black">
                        <TableHead className="border border-black text-black font-bold p-1">Наименование</TableHead>
                        <TableHead className="border border-black text-black font-bold p-1">Артикул</TableHead>
                        <TableHead className="border border-black text-black font-bold p-1">Производитель</TableHead>
                        <TableHead className="border border-black text-black font-bold p-1">Кол-во</TableHead>
                        <TableHead className="border border-black text-black font-bold p-1">Закупка</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.map((item) => (
                        <TableRow key={item.id} className="border-black">
                            <TableCell className="border border-black p-1">{item.name}</TableCell>
                            <TableCell className="border border-black p-1">{item.article || '-'}</TableCell>
                            <TableCell className="border border-black p-1">{item.manufacturer || '-'}</TableCell>
                            <TableCell className="border border-black text-center p-1">{item.quantity}</TableCell>
                            <TableCell className="border border-black text-right p-1">{(item.purchase || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                        </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        ))}
        
        <Separator className="my-8 bg-black" />

        <div className="mt-8 grid grid-cols-2 gap-8">
            <div>
                <p className="mb-2">Принял:</p>
                <div className="border-b border-black w-full h-8"></div>
            </div>
            <div>
                <p className="mb-2">Сдал:</p>
                <div className="border-b border-black w-full h-8"></div>
            </div>
        </div>
      </div>
    );
  }
);

AcceptanceSheet.displayName = "AcceptanceSheet";
