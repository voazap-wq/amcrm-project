
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Trash2, Pencil, ExternalLink, EyeOff, Eye, ArrowUpDown, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc } from "firebase/firestore";
import type { Supplier } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { seedData } from "@/lib/seed";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";


const supplierFormSchema = z.object({
  name: z.string().min(1, "Название поставщика обязательно."),
  login: z.string().optional(),
  password: z.string().optional(),
  url: z.string().optional(),
  apiEmail: z.string().optional(),
  orderDeadline: z.string().optional(),
  minOrderAmount: z.coerce.number().optional(),
  notes: z.string().optional(),
  manager: z.string().optional(),
});

type SupplierFormValues = z.infer<typeof supplierFormSchema>;

type SortConfig = {
  key: keyof Supplier;
  direction: "ascending" | "descending";
};


function SupplierDialog({ supplier, children, onSave }: { supplier?: Supplier, children: React.ReactNode, onSave: (data: SupplierFormValues, id?: string) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierFormSchema),
        defaultValues: supplier || {},
    });
    
    React.useEffect(() => {
        if (isOpen) {
            const defaultValues = {
              name: "",
              login: "",
              password: "",
              url: "",
              apiEmail: "",
              orderDeadline: "",
              minOrderAmount: undefined,
              notes: "",
              manager: ""
            };

            if (supplier) {
                for (const key in defaultValues) {
                    const typedKey = key as keyof SupplierFormValues;
                    (defaultValues as any)[typedKey] = supplier[typedKey] || (typedKey === 'minOrderAmount' ? undefined : "");
                }
            }
            form.reset(defaultValues);
        }
    }, [isOpen, supplier, form]);

    const handleEditSubmit = (data: SupplierFormValues) => {
        onSave(data, supplier?.id);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{supplier ? 'Редактировать поставщика' : 'Добавить поставщика'}</DialogTitle>
                    <DialogDescription>{supplier ? 'Измените данные поставщика.' : 'Заполните данные нового поставщика.'}</DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleEditSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="login" render={({ field }) => ( <FormItem><FormLabel>Логин</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="password" render={({ field }) => ( <FormItem><FormLabel>Пароль</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="url" render={({ field }) => ( <FormItem><FormLabel>Ссылка</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="apiEmail" render={({ field }) => ( <FormItem><FormLabel>Почта API</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="orderDeadline" render={({ field }) => ( <FormItem><FormLabel>Время заказа</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="minOrderAmount" render={({ field }) => ( <FormItem><FormLabel>Сумма мин. заказа</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber || undefined)} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="manager" render={({ field }) => ( <FormItem><FormLabel>Менеджер</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                          <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem className="col-span-2"><FormLabel>Примечание</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Отмена</Button></DialogClose>
                            <Button type="submit">Сохранить</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

const PasswordCell = ({ password }: { password?: string }) => {
    const [visible, setVisible] = React.useState(false);
    if (!password) return <TableCell className="text-muted-foreground">-</TableCell>;

    return (
        <TableCell>
            <div className="flex items-center gap-2">
                <span>{visible ? password : '••••••••'}</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setVisible(!visible)}>
                    {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
            </div>
        </TableCell>
    )
}

export default function SupplierSettingsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const suppliersRef = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
  const { data: suppliers, isLoading } = useCollection<Supplier>(suppliersRef);
  
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>({ key: 'name', direction: 'ascending' });

  const sortedSuppliers = React.useMemo(() => {
    if (!suppliers) return [];
    
    const sortableItems = [...suppliers];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue, 'ru');
            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [suppliers, sortConfig]);

  const handleSort = (key: keyof Supplier) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const renderSortArrow = (key: keyof Supplier) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const handleSave = (data: SupplierFormValues, id?: string) => {
    const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === undefined || value === '' ? null : value])
    );

    if (id && firestore) {
        const supplierRef = doc(firestore, "suppliers", id);
        updateDocumentNonBlocking(supplierRef, cleanData);
        toast({ variant: "success", title: "Поставщик обновлен" });
    } else {
        if (!suppliersRef) return;
        addDocumentNonBlocking(suppliersRef, cleanData);
        toast({ variant: "success", title: "Поставщик добавлен" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    try {
      await deleteDoc(doc(firestore, "suppliers", id));
      toast({ variant: "info", title: "Поставщик удален" });
    } catch (error) {
      console.error("Error deleting supplier: ", error);
      toast({ variant: "destructive", title: "Ошибка при удалении поставщика" });
    }
  };
  
  const handleSeedData = async () => {
      if (firestore) {
          try {
            await seedData(firestore);
            toast({
                variant: "success",
                title: "Успех!",
                description: "Тестовые данные были успешно загружены в базу данных.",
            });
          } catch(e: any) {
             console.error("Seeding error: ", e);
             toast({
                variant: "destructive",
                title: "Ошибка!",
                description: e.message || "Не удалось загрузить данные.",
            });
          }
      } else {
         toast({
            variant: "destructive",
            title: "Ошибка!",
            description: "Сервис базы данных не доступен.",
        });
      }
  }
  
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid w-full max-w-7xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Назад</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Настройки поставщиков
              </h1>
            </div>
            <div className="grid gap-4">
                <Card>
                <CardHeader>
                    <CardTitle>Добавить нового поставщика</CardTitle>
                    <CardDescription>
                        Создайте нового поставщика для использования в заказах.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2">
                    <SupplierDialog onSave={handleSave}>
                        <Button><PlusCircle className="h-4 w-4 mr-2" />Добавить поставщика</Button>
                    </SupplierDialog>
                    <Button variant="outline" onClick={handleSeedData}>Заполнить данными</Button>
                </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Существующие поставщики</CardTitle>
                        <CardDescription>
                        Список всех доступных поставщиков.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                                <Skeleton className="h-12 w-full" />
                            </div>
                        ) : (
                            <TooltipProvider>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>
                                                <Button variant="ghost" onClick={() => handleSort('name')}>Название {renderSortArrow('name')}</Button>
                                            </TableHead>
                                            <TableHead>Логин</TableHead>
                                            <TableHead>Пароль</TableHead>
                                            <TableHead>Ссылка</TableHead>
                                            <TableHead>Почта API</TableHead>
                                            <TableHead>Время заказа</TableHead>
                                            <TableHead>Сумма мин. заказа</TableHead>
                                            <TableHead>Менеджер</TableHead>
                                            <TableHead className="text-right">Действия</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {sortedSuppliers && sortedSuppliers.length > 0 ? (
                                            sortedSuppliers.map((supplier) => (
                                            <TableRow key={supplier.id}>
                                                <TableCell className="font-medium">{supplier.name}</TableCell>
                                                <TableCell>{supplier.login || '-'}</TableCell>
                                                <PasswordCell password={supplier.password} />
                                                <TableCell>
                                                    {supplier.url ? (
                                                        <a href={supplier.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    ) : '-'}
                                                </TableCell>
                                                <TableCell>{supplier.apiEmail || '-'}</TableCell>
                                                <TableCell>{supplier.orderDeadline || '-'}</TableCell>
                                                <TableCell>{supplier.minOrderAmount?.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }) || '-'}</TableCell>
                                                <TableCell>{supplier.manager || '-'}</TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        {supplier.notes && (
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-8 w-8 cursor-default">
                                                                        <FileText className="h-4 w-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent className="max-w-xs whitespace-normal text-left">
                                                                    <p>{supplier.notes}</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        )}
                                                        <SupplierDialog supplier={supplier} onSave={handleSave}>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </SupplierDialog>
                                                        <AlertDialog>
                                                            <AlertDialogTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </AlertDialogTrigger>
                                                            <AlertDialogContent>
                                                                <AlertDialogHeader>
                                                                <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                Это действие необратимо. Поставщик будет навсегда удален.
                                                                </AlertDialogDescription>
                                                                </AlertDialogHeader>
                                                                <AlertDialogFooter>
                                                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleDelete(supplier.id)}>Удалить</AlertDialogAction>
                                                                </AlertDialogFooter>
                                                            </AlertDialogContent>
                                                        </AlertDialog>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                            ))
                                        ) : (
                                            <TableRow>
                                            <TableCell colSpan={9} className="h-24 text-center">
                                                Поставщики еще не созданы.
                                            </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TooltipProvider>
                        )}
                    </CardContent>
                </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
