
"use client";

import * as React from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { collection, doc } from "firebase/firestore";
import { ChevronsUpDown, Check, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

import { useCollection, useDoc, useFirestore, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { SalesReceiptNoArticle } from "@/app/components/sales-receipt-no-article";
import type { CustomerOrder, Customer, Car, StoreDetails } from "@/lib/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Command, CommandInput, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";


const docSettingsSchema = z.object({
  docBasis: z.string().optional(),
  docSellerSignature: z.string().optional(),
  docBuyerSignature: z.string().optional(),
  docPromoText: z.string().optional(),
});

type DocSettingsFormValues = z.infer<typeof docSettingsSchema>;

function DocumentsPageContent() {
    const { toast } = useToast();
    const firestore = useFirestore();
    const [selectedOrderId, setSelectedOrderId] = React.useState<string | null>(null);

    const ordersRef = useMemoFirebase(() => firestore ? collection(firestore, 'orders') : null, [firestore]);
    const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

    const clientsRef = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
    const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

    const carsRef = useMemoFirebase(() => firestore ? collection(firestore, 'cars') : null, [firestore]);
    const { data: cars, isLoading: areCarsLoading } = useCollection<Car>(carsRef);
    
    const storeDetailsRef = useMemoFirebase(() => firestore ? doc(firestore, "storeDetails", "main") : null, [firestore]);
    const { data: storeDetails, isLoading: areStoreDetailsLoading } = useDoc<StoreDetails>(storeDetailsRef);

    const form = useForm<DocSettingsFormValues>({
        resolver: zodResolver(docSettingsSchema),
        defaultValues: {
            docBasis: '',
            docSellerSignature: '',
            docBuyerSignature: '',
            docPromoText: '',
        }
    });
    
    React.useEffect(() => {
        if(storeDetails) {
            form.reset({
                docBasis: storeDetails.docBasis || '',
                docSellerSignature: storeDetails.docSellerSignature || '',
                docBuyerSignature: storeDetails.docBuyerSignature || '',
                docPromoText: storeDetails.docPromoText || '',
            });
        }
    }, [storeDetails, form]);

    const onSubmit = (data: DocSettingsFormValues) => {
        if (!storeDetailsRef) {
          toast({ variant: "destructive", title: "Ошибка", description: "База данных не инициализирована." });
          return;
        }
        setDocumentNonBlocking(storeDetailsRef, data, { merge: true });
        toast({ variant: "success", title: "Сохранено", description: "Настройки документа успешно обновлены." });
      };

    const isLoading = areOrdersLoading || areClientsLoading || areCarsLoading || areStoreDetailsLoading;

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
    
    const selectedCar = React.useMemo(() => {
        if (!fullSelectedOrder?.carId || !cars) return null;
        return cars.find(c => c.id === fullSelectedOrder.carId);
    }, [fullSelectedOrder, cars]);

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
                    Настройка: Товарный чек без артикула
                </h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)}>
                             <Card>
                                <CardHeader>
                                    <CardTitle>Настройки документа</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                     <div className="space-y-2">
                                        <Label>Выберите заказ для предпросмотра</Label>
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
                                     <FormField control={form.control} name="docBasis" render={({ field }) => (<FormItem><FormLabel>Основание</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name="docSellerSignature" render={({ field }) => (<FormItem><FormLabel>Текст подписи продавца</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name="docBuyerSignature" render={({ field }) => (<FormItem><FormLabel>Текст подписи покупателя</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                     <FormField control={form.control} name="docPromoText" render={({ field }) => (<FormItem><FormLabel>Информация</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
                                     <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                                        {form.formState.isSubmitting ? "Сохранение..." : "Сохранить настройки"}
                                     </Button>
                                </CardContent>
                            </Card>
                        </form>
                    </Form>
                </div>
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Предпросмотр</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="border rounded-md min-h-[500px] bg-gray-100 p-4">
                               {isLoading ? <Skeleton className="h-[800px] w-full"/> : (
                                    fullSelectedOrder && storeDetails ? (
                                         <SalesReceiptNoArticle 
                                            order={fullSelectedOrder} 
                                            car={selectedCar} 
                                            storeDetails={{...storeDetails, ...form.getValues()}}
                                        />
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


export default function ReceiptNoArticleSettingsPage() {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <main className="flex-1 p-4 sm:px-6 sm:py-8 md:gap-8">
                <DocumentsPageContent />
            </main>
        </div>
    )
}
