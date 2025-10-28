
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, Pencil, Car, PlusCircle } from "lucide-react";
import { collection, doc, query, where } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useDoc, useMemoFirebase, useCollection } from "@/firebase";
import { updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { formatPhoneNumber, cn } from "@/lib/utils";
import type { Customer, Car as CarType, CustomerOrder } from "@/lib/types";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const clientFormSchema = z.object({
  lastName: z.string().min(1, "Фамилия обязательна"),
  firstName: z.string().min(1, "Имя обязательно"),
  patronymic: z.string().optional(),
  email: z.string().email("Неверный формат email").optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  comments: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

function ClientEditCard({ client, onSave, onCancel }: { client: Customer, onSave: (data: ClientFormValues) => void, onCancel: () => void }) {
    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientFormSchema),
        defaultValues: {
            lastName: client.lastName || '',
            firstName: client.firstName || '',
            patronymic: client.patronymic || '',
            email: client.email || '',
            phone: client.phone || '',
            source: client.source || '',
            comments: client.comments || '',
        },
    });

    const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhoneNumber(e.target.value);
        form.setValue('phone', formatted, { shouldValidate: true });
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Редактирование данных</CardTitle>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSave)} className="space-y-4">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                       <FormField control={form.control} name="lastName" render={({ field }) => ( <FormItem><FormLabel>Фамилия</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="firstName" render={({ field }) => ( <FormItem><FormLabel>Имя</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="patronymic" render={({ field }) => ( <FormItem><FormLabel>Отчество</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Телефон</FormLabel><FormControl><Input {...field} onChange={handlePhoneInputChange} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="source" render={({ field }) => ( <FormItem><FormLabel>Откуда узнал</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger><SelectValue placeholder="Выберите источник" /></SelectTrigger></FormControl><SelectContent><SelectItem value="рекомендация">Рекомендация</SelectItem><SelectItem value="интернет">Интернет</SelectItem><SelectItem value="реклама">Реклама</SelectItem><SelectItem value="другое">Другое</SelectItem></SelectContent></Select><FormMessage /></FormItem> )} />
                    </div>
                     <FormField control={form.control} name="comments" render={({ field }) => ( <FormItem><FormLabel>Комментарии</FormLabel><FormControl><Textarea placeholder="Добавьте любые заметки о клиенте..." className="min-h-[100px]" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting}> {form.formState.isSubmitting ? "Сохранение..." : "Сохранить"} </Button>
                    </div>
                  </form>
                </Form>
            </CardContent>
        </Card>
    );
}

export default function ClientDetailsPage() {
  const router = useRouter();
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const { toast } = useToast();
  const firestore = useFirestore();

  const [isEditing, setIsEditing] = React.useState(false);

  const clientRef = useMemoFirebase(() => (firestore && id) ? doc(firestore, "clients", id) : null, [firestore, id]);
  const { data: client, isLoading: isClientLoading, error: clientError } = useDoc<Customer>(clientRef);

  const clientCarsQuery = useMemoFirebase(() => (firestore && id) ? query(collection(firestore, "cars"), where("clientId", "==", id)) : null, [firestore, id]);
  const { data: cars, isLoading: areCarsLoading } = useCollection<CarType>(clientCarsQuery);

  const clientOrdersQuery = useMemoFirebase(() => (firestore && id) ? query(collection(firestore, "orders"), where("clientId", "==", id)) : null, [firestore, id]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<CustomerOrder>(clientOrdersQuery);
  
  const clientBalance = React.useMemo(() => {
    if (!orders) return 0;
    return -orders.reduce((acc, order) => {
        const orderTotal = (order.items || [])
            .filter(item => item.status !== 'Отказ' && item.status !== 'Создан')
            .reduce((sum, item) => sum + item.total, 0);
        const orderRemaining = orderTotal - (order.amountPaid || 0);
        return acc + orderRemaining;
    }, 0);
  }, [orders]);

  const onSubmit = (data: ClientFormValues) => {
    if (!clientRef) {
      toast({ variant: "destructive", title: "Ошибка", description: "Ссылка на клиента не найдена." });
      return;
    }

    updateDocumentNonBlocking(clientRef, { ...data, source: data.source || null, comments: data.comments || null });
    toast({ variant: "success", title: "Клиент обновлен", description: "Данные клиента были успешно обновлены." });
    setIsEditing(false);
  };
  
  const isLoading = isClientLoading || areCarsLoading || areOrdersLoading;
  
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


  if (isLoading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                <div className="flex items-center gap-4 pt-4">
                    <Skeleton className="h-7 w-7" />
                    <Skeleton className="h-6 w-1/2" />
                </div>
                 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><Skeleton className="h-8 w-1/3" /></CardContent></Card>
                    <Card><CardHeader><Skeleton className="h-6 w-1/2" /></CardHeader><CardContent><div className="space-y-2"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /></div></CardContent></Card>
                 </div>
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
            </main>
        </div>
    );
  }

  if (!client) {
    return <div className="p-6">Клиент не найден.</div>
  }
  
  if (isEditing) {
    return (
         <div className="flex min-h-screen w-full flex-col bg-muted/40">
             <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                 <div className="flex items-center gap-4 pt-4">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setIsEditing(false)}>
                        <ChevronLeft className="h-4 w-4" />
                        <span className="sr-only">Назад</span>
                      </Button>
                      <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                        Редактирование: {client.lastName} {client.firstName}
                      </h1>
                </div>
                <div className="mx-auto w-full max-w-4xl">
                   <ClientEditCard client={client} onSave={onSubmit} onCancel={() => setIsEditing(false)} />
                </div>
             </main>
         </div>
    )
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
             <div className="flex items-center gap-4 pt-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/clients">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Назад</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Клиент
              </h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="lg:col-span-1">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Клиент</CardTitle>
                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                           <Pencil className="h-4 w-4 mr-2"/> Редактировать
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-1 text-sm">
                            <p><strong>ФИО:</strong> {client.lastName} {client.firstName} {client.patronymic || ''}</p>
                            <p><strong>Email:</strong> {client.email || '-'}</p>
                            <p><strong>Телефон:</strong> {client.phone || '-'}</p>
                            <p><strong>Источник:</strong> {client.source || '-'}</p>
                            {client.comments && <p className="pt-2"><strong>Комментарий:</strong> {client.comments}</p>}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle>Финансы</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-muted-foreground text-sm">Общий баланс</p>
                        <p className={cn("text-3xl font-bold", clientBalance > 0 ? 'text-green-600' : clientBalance < 0 ? 'text-red-600' : '')}>
                            {clientBalance.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 })}
                        </p>
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle>Автомобили</CardTitle>
                         <Button variant="ghost" size="sm" asChild>
                            <Link href="/cars/new">
                                <PlusCircle className="h-4 w-4 mr-2"/> Добавить
                            </Link>
                        </Button>
                    </CardHeader>
                    <CardContent>
                        {cars && cars.length > 0 ? (
                             <ul className="space-y-2 text-sm">
                                {cars.map(car => (
                                    <li key={car.id} className="flex items-center gap-2">
                                        <Car className="h-4 w-4 text-muted-foreground" />
                                        <Link href={`/cars/${car.id}`} className="hover:underline">{car.make} {car.model} ({car.year})</Link>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-sm text-muted-foreground">У клиента нет автомобилей.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>Заказы клиента</CardTitle>
                    <CardDescription>Все заказы, связанные с этим клиентом.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Номер заказа</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Кол-во позиций</TableHead>
                                <TableHead className="text-right">Итого</TableHead>
                                <TableHead className="w-[80px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {orders && orders.length > 0 ? (
                                orders.map(order => (
                                    <TableRow key={order.id}>
                                        <TableCell>#{order.orderNumber}</TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusVariant(order.status)} className="font-semibold">
                                                {order.status}
                                                {order.statusAmount ? `: ${order.statusAmount.toLocaleString('ru-RU', {maximumFractionDigits: 0})}` : ''}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{order.itemCount}</TableCell>
                                        <TableCell className="text-right font-medium">{order.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell className="text-right">
                                             <Button variant="ghost" size="icon" asChild>
                                                <Link href={`/orders/${order.id}`}>
                                                    <Pencil className="h-4 w-4" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        У этого клиента еще нет заказов.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

        </main>
    </div>
  );
}
