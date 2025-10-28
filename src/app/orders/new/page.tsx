
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  Trash2,
  PlusCircle,
  ChevronsUpDown,
  Check,
  Pencil,
  UserPlus,
  Car as CarIcon,
} from "lucide-react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
  FormLabel
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import type { Customer, ItemStatus, Product, Car, Supplier, WarehouseCell, ProductCategory } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ProductDialog, type ProductFormValues } from "@/app/components/product-dialog";
import { ClientDialog } from "@/app/components/client-dialog";
import { CarDialog } from "@/app/components/car-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const productSchema = z.object({
    id: z.string(),
    name: z.string().min(1, "Наименование обязательно"),
    article: z.string().optional().default(""),
    manufacturer: z.string().optional().default(""),
    supplier: z.string().optional().default(""),
    price: z.coerce.number().min(0).default(0),
    quantity: z.coerce.number().min(1, "Кол-во должно быть > 0").default(1),
    total: z.coerce.number().default(0),
    purchase: z.coerce.number().min(0).default(0),
    markup: z.coerce.number().default(0),
    term: z.coerce.number().optional(),
    status: z.string().default(""),
    warehouseCell: z.string().optional(),
    categoryId: z.string().optional(),
});

const orderFormSchema = z.object({
  clientId: z.string().min(1, "Необходимо выбрать клиента"),
  carId: z.string().optional(),
  channel: z.enum(["Сайт", "Витрина"]).optional(),
  comments: z.string().optional(),
  items: z.array(productSchema).min(1, "Добавьте хотя бы один товар"),
});

type OrderFormValues = z.infer<typeof orderFormSchema>;

const getInitialValues = (searchParams: URLSearchParams | null): Partial<OrderFormValues> => {
  if (!searchParams) return {};
  const duplicateData = searchParams.get('duplicate');
  if (duplicateData) {
    try {
      const parsedData = JSON.parse(decodeURIComponent(duplicateData));
      const items = Array.isArray(parsedData.items) 
        ? parsedData.items.map((item: any) => ({ ...item, id: crypto.randomUUID(), status: "Создан" }))
        : [];
      return {
        clientId: parsedData.clientId || "",
        carId: parsedData.carId || "",
        comments: parsedData.comments || "",
        items: items,
      };
    } catch (error) {
      console.error("Failed to parse duplicate order data:", error);
    }
  }
  return {
    clientId: "",
    carId: "",
    comments: "",
    items: [],
  };
};

export default function NewOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const firestore = useFirestore();

  const clientsRef = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const carsRef = useMemoFirebase(() => firestore ? collection(firestore, 'cars') : null, [firestore]);
  const { data: cars, isLoading: areCarsLoading } = useCollection<Car>(carsRef);

  const itemStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'itemStatuses') : null, [firestore]);
  const { data: itemStatuses, isLoading: areItemStatusesLoading } = useCollection<ItemStatus>(itemStatusesRef);

  const suppliersRef = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
  const { data: suppliers, isLoading: areSuppliersLoading } = useCollection<Supplier>(suppliersRef);

  const warehouseCellsRef = useMemoFirebase(() => firestore ? collection(firestore, 'warehouseCells') : null, [firestore]);
  const { data: warehouseCells, isLoading: areWarehouseCellsLoading } = useCollection<WarehouseCell>(warehouseCellsRef);

  const productCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'productCategories') : null, [firestore]);
  const { data: productCategories, isLoading: areProductCategoriesLoading } = useCollection<ProductCategory>(productCategoriesRef);

  const ordersRef = useMemoFirebase(() => firestore ? collection(firestore, 'orders') : null, [firestore]);
  const { data: orders } = useCollection(ordersRef);

  const sortedSuppliers = React.useMemo(() => {
    if (!suppliers) return [];
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers]);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: getInitialValues(searchParams),
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const selectedClientId = form.watch("clientId");

  const clientCars = React.useMemo(() => {
    if (!cars || !selectedClientId) return [];
    return cars.filter(car => car.clientId === selectedClientId);
  }, [cars, selectedClientId]);

  const watchItems = form.watch("items");
  
  const validItems = React.useMemo(() => {
    return watchItems.filter(item => item.status !== 'Отказ');
  }, [watchItems]);

  const totals = React.useMemo(() => {
    return validItems.reduce((acc, item) => {
        const price = item.price || 0;
        const quantity = item.quantity || 0;
        const purchase = item.purchase || 0;
        const total = price * quantity;
        const totalPurchase = purchase * quantity;
        const markup = total - totalPurchase;
        
        acc.total += total;
        acc.purchase += totalPurchase;
        acc.markup += markup;
        return acc;
    }, { total: 0, purchase: 0, markup: 0 });
  }, [validItems]);

  const totalMarkupPercentage = totals.purchase > 0 ? ((totals.markup / totals.purchase) * 100).toFixed(0) : 0;
  
  const handleSaveProduct = (product: ProductFormValues) => {
    const itemIndex = fields.findIndex(field => field.id === product.id);
    if (itemIndex > -1) {
        update(itemIndex, {...product});
    } else {
        append(product);
    }
  }

  const handleClientAdded = (clientId: string) => {
    form.setValue('clientId', clientId, { shouldValidate: true });
    form.setValue('carId', ''); // Reset car selection when client changes
  }

  const handleCarAdded = (carId: string) => {
    form.setValue('carId', carId, { shouldValidate: true });
  }

  const onSubmit = async (data: OrderFormValues) => {
    if (!firestore || !ordersRef) return;
    
    const maxOrderNumber = orders && orders.length > 0
      ? Math.max(...orders.map(o => parseInt(o.orderNumber, 10)).filter(n => !isNaN(n)))
      : 0;

    const newOrderNumber = (maxOrderNumber + 1).toString();

    const cleanItems = data.items.map(item => ({
        ...item,
        article: item.article || null,
        manufacturer: item.manufacturer || null,
        supplier: item.supplier || null,
        term: item.term || null,
    }));
    
    const total = totals.total;

    const orderData = {
        clientId: data.clientId,
        carId: data.carId || null,
        channel: data.channel || null,
        comments: data.comments || null,
        items: cleanItems,
        orderNumber: newOrderNumber,
        createdAt: Timestamp.fromDate(new Date()),
        total: total,
        itemCount: validItems.reduce((sum, item) => sum + item.quantity, 0),
        status: 'Новый', // Default status
        amountPaid: 0,
        amountRemaining: total,
        paymentHistory: [],
    };

    await addDocumentNonBlocking(ordersRef, orderData);

    toast({
      variant: "success",
      title: "Заказ создан",
      description: `Заказ #${newOrderNumber} был успешно добавлен.`,
    });
    router.push("/");
  };
  
  const getClientDisplayName = (client: Customer | undefined) => {
    if (!client) return "";
    return `${client.lastName} ${client.firstName} ${client.patronymic || ''}`.trim();
  }
  
  const getCarDisplayName = (car: Car | undefined) => {
    if (!car) return "";
    return `${car.make} ${car.model} (${car.year || 'N/A'})`.trim();
  }

  const isLoading = areClientsLoading || areItemStatusesLoading || areCarsLoading || areSuppliersLoading || areWarehouseCellsLoading || areProductCategoriesLoading;

  if (isLoading) {
    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 gap-4">
            <Skeleton className="h-10 w-1/2" />
            <Skeleton className="h-96 w-full" />
        </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/">
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Назад</span>
                    </Link>
                  </Button>
                  <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Новый заказ
                  </h1>
                  <div className="hidden items-center gap-2 md:ml-auto md:flex">
                    <Button variant="outline" size="sm" type="button" onClick={() => router.back()}>
                      Отменить
                    </Button>
                    <Button size="sm" type="submit">Сохранить заказ</Button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <Card>
                        <CardHeader>
                            <CardTitle>Клиент</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-start gap-4">
                            <FormField
                                control={form.control}
                                name="clientId"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-full justify-between",
                                                !field.value && "text-muted-foreground"
                                            )}
                                            >
                                            {field.value
                                                ? getClientDisplayName(clients?.find(
                                                    (client) => client.id === field.value
                                                ))
                                                : "Выберите клиента"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                        <Command>
                                            <CommandInput placeholder="Поиск клиента..." />
                                            <CommandList>
                                                <CommandEmpty>Клиент не найден.</CommandEmpty>
                                                <CommandGroup>
                                                {clients?.map((client) => (
                                                    <CommandItem
                                                    value={getClientDisplayName(client)}
                                                    key={client.id}
                                                    onSelect={() => {
                                                        handleClientAdded(client.id);
                                                    }}
                                                    >
                                                    <Check
                                                        className={cn(
                                                        "mr-2 h-4 w-4",
                                                        client.id === field.value
                                                            ? "opacity-100"
                                                            : "opacity-0"
                                                        )}
                                                    />
                                                    {getClientDisplayName(client)}
                                                    </CommandItem>
                                                ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <ClientDialog onClientAdded={handleClientAdded}>
                              <Button size="icon" variant="outline">
                                  <UserPlus className="h-4 w-4" />
                                  <span className="sr-only">Добавить нового клиента</span>
                              </Button>
                            </ClientDialog>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Автомобиль</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <div className="flex items-start gap-4">
                                <FormField
                                    control={form.control}
                                    name="carId"
                                    render={({ field }) => (
                                        <FormItem className="flex-1">
                                        <Popover>
                                            <PopoverTrigger asChild disabled={!selectedClientId}>
                                                <FormControl>
                                                    <Button
                                                    variant="outline"
                                                    role="combobox"
                                                    className={cn( "w-full justify-between", !field.value && "text-muted-foreground" )}
                                                    >
                                                    {field.value ? getCarDisplayName(clientCars?.find(car => car.id === field.value)) : "Выберите автомобиль"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                            <Command>
                                                <CommandInput placeholder="Поиск автомобиля..." />
                                                <CommandList>
                                                    <CommandEmpty>Автомобиль не найден.</CommandEmpty>
                                                    <CommandGroup>
                                                    {clientCars.map((car) => (
                                                        <CommandItem
                                                        value={getCarDisplayName(car)}
                                                        key={car.id}
                                                        onSelect={() => form.setValue("carId", car.id)}
                                                        >
                                                        <Check className={cn("mr-2 h-4 w-4", car.id === field.value ? "opacity-100" : "opacity-0")} />
                                                        {getCarDisplayName(car)}
                                                        </CommandItem>
                                                    ))}
                                                    </CommandGroup>
                                                </CommandList>
                                            </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                {selectedClientId && (
                                     <CarDialog 
                                        clientId={selectedClientId} 
                                        onCarAdded={handleCarAdded}
                                     >
                                        <Button size="icon" variant="outline">
                                            <PlusCircle className="h-4 w-4" />
                                            <span className="sr-only">Добавить новый автомобиль</span>
                                        </Button>
                                     </CarDialog>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Канал продаж</CardTitle>
                        </CardHeader>
                        <CardContent>
                             <FormField
                                control={form.control}
                                name="channel"
                                render={({ field }) => (
                                    <FormItem>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Выберите канал" />
                                            </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Сайт">Сайт</SelectItem>
                                                <SelectItem value="Витрина">Витрина</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                     <Card className="lg:col-span-3">
                        <CardHeader>
                            <CardTitle>Комментарий</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <FormField
                                control={form.control}
                                name="comments"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Добавьте комментарий к заказу..."
                                                className="min-h-[100px]"
                                                {...field}
                                                value={field.value ?? ""}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Товары</CardTitle>
                        <FormMessage>{form.formState.errors.items?.message || (form.formState.errors.items as any)?.root?.message}</FormMessage>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Производитель</TableHead>
                                    <TableHead>Артикул</TableHead>
                                    <TableHead>Наименование</TableHead>
                                    <TableHead>Цена</TableHead>
                                    <TableHead>Кол-во</TableHead>
                                    <TableHead>Срок</TableHead>
                                    <TableHead>Статус</TableHead>
                                    <TableHead>Итого</TableHead>
                                    <TableHead>Закупка</TableHead>
                                    <TableHead>Наценка</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell>{field.manufacturer}</TableCell>
                                        <TableCell>{field.article}</TableCell>
                                        <TableCell>{field.name}</TableCell>
                                        <TableCell>{(field.price || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell>{field.quantity}</TableCell>
                                        <TableCell>{field.term ? `${field.term} дн.` : '-'}</TableCell>
                                        <TableCell>{field.status}</TableCell>
                                        <TableCell>{(field.total || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell>{(field.purchase || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell>{(field.markup || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1">
                                                <ProductDialog
                                                    mode="edit"
                                                    product={{...field}}
                                                    itemStatuses={itemStatuses || []}
                                                    suppliers={suppliers || []}
                                                    warehouseCells={warehouseCells || []}
                                                    productCategories={productCategories || []}
                                                    onSave={(product) => handleSaveProduct({...product})}
                                                >
                                                    <Button variant="ghost" size="icon" className="w-6 h-6"><Pencil className="w-3.5 h-3.5"/></Button>
                                                </ProductDialog>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                                    <Trash2 className="h-4 w-4 text-destructive"/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                            <TableFooter>
                                <TableRow>
                                    <TableCell colSpan={7}>
                                        <ProductDialog
                                            mode="add"
                                            itemStatuses={itemStatuses || []}
                                            suppliers={suppliers || []}
                                            warehouseCells={warehouseCells || []}
                                            productCategories={productCategories || []}
                                            onSave={handleSaveProduct}
                                        >
                                            <Button type="button"><PlusCircle className="h-4 w-4 mr-2"/>Добавить товар</Button>
                                        </ProductDialog>
                                    </TableCell>
                                    <TableCell className="font-bold">{totals.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                    <TableCell className="font-bold">{totals.purchase.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                    <TableCell className="font-bold">{totals.markup.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                    <TableCell className="font-bold text-right">{totalMarkupPercentage}%</TableCell>
                                </TableRow>
                            </TableFooter>
                        </Table>
                    </CardContent>
                </Card>
              </div>
            </form>
          </Form>
        </main>
      </div>
    </div>
  );
}
