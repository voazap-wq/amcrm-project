
"use client";

import * as React from "react";
import Link from "next/link";
import { collection, doc } from "firebase/firestore";
import { ChevronsUpDown, Check, ChevronLeft, Truck } from "lucide-react";
import { format } from "date-fns";

import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { AcceptanceSheet } from "@/app/components/acceptance-sheet";
import type { CustomerOrder, Customer, StoreDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function AcceptanceSheetSettingsContent() {
    const firestore = useFirestore();
    const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

    const ordersRef = useMemoFirebase(() => firestore ? collection(firestore, 'orders') : null, [firestore]);
    const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

    const clientsRef = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);
    
    const isLoading = areOrdersLoading || areClientsLoading;

    const fullSelectedOrder = React.useMemo(() => {
        if (!selectedOrderId || !orders || !clients) return null;
        const orderData = orders.find(o => o.id === selectedOrderId);
        if (!orderData) return null;
        const clientData = clients.find(c => c.id === orderData.clientId);
        if (!clientData) return null;
        return {
            ...orderData,
            customer: clientData
        } as CustomerOrder;
    }, [selectedOrderId, orders, clients]);
    

    return (
        <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/settings/documents">
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Назад</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Настройка: Приемный лист
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                     <Card>
                        <CardHeader>
                            <CardTitle>Настройки документа</CardTitle>
                            <CardDescription>Выберите заказ для предпросмотра документа.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <div className="space-y-2">
                                <Label>Заказ для предпросмотра</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                    <Button
                                        variant="outline"
                                        role="combobox"
                                        className={cn("w-full justify-between", !selectedOrderId && "text-muted-foreground")}
                                    >
                                        {selectedOrderId
                                            ? `Заказ #${orders?.find(o => o.id === selectedOrderId)?.orderNumber}`
                                            : "Выберите заказ"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                    <Command>
                                        <CommandInput placeholder="Поиск заказа..." />
                                        <CommandList>
                                            <CommandEmpty>Заказы не найдены.</CommandEmpty>
                                            <CommandGroup>
                                            {orders?.map(o => (
                                                <CommandItem
                                                    value={`#${o.orderNumber}`}
                                                    key={o.id}
                                                    onSelect={() => setSelectedOrderId(o.id)}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", o.id === selectedOrderId ? "opacity-100" : "opacity-0")} />
                                                    {`#${o.orderNumber} (${format(o.createdAt.toDate(), "dd.MM.yy")})`}
                                                </CommandItem>
                                            ))}
                                            </CommandGroup>
                                        </CommandList>
                                    </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="flex items-start rounded-md border border-dashed border-yellow-400 bg-yellow-50 p-4 text-sm text-yellow-800">
                                <Truck className="mr-3 h-5 w-5 flex-shrink-0 text-yellow-500" />
                                <div>
                                    На данный момент этот документ не имеет настраиваемых полей. Вы можете только просмотреть его.
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Предпросмотр</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md min-h-[500px] bg-gray-100 p-4">
                               {isLoading ? <Skeleton className="h-[800px] w-full"/> : (
                                    fullSelectedOrder ? (
                                         <AcceptanceSheet order={fullSelectedOrder} />
                                    ) : (
                                        <div className="flex items-center justify-center h-full text-muted-foreground">
                                            Выберите заказ для предпросмотра
                                        </div>
                                    )
                               )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default function AcceptanceSheetSettingsPage() {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <main className="flex-1 p-4 sm:px-6 sm:py-8 md:gap-8">
                <AcceptanceSheetSettingsContent />
            </main>
        </div>
    )
}
