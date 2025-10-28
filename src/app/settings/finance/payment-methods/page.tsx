
"use client";

import * as React from "react";
import { PlusCircle, Trash2, Pencil, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc, writeBatch } from "firebase/firestore";
import type { PaymentMethod } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const paymentMethodFormSchema = z.object({
  name: z.string().min(1, "Название обязательно."),
  commission: z.coerce.number().optional(),
});

type PaymentMethodFormValues = z.infer<typeof paymentMethodFormSchema>;

function PaymentMethodDialog({ method, children, onSave }: { method?: PaymentMethod, children: React.ReactNode, onSave: (data: PaymentMethodFormValues, id?: string) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<PaymentMethodFormValues>({
        resolver: zodResolver(paymentMethodFormSchema),
        defaultValues: method || { name: "", commission: 0 },
    });
    
    React.useEffect(() => {
        if (isOpen) {
            form.reset(method || { name: "", commission: 0 });
        }
    }, [isOpen, method, form]);

    const handleSubmit = (data: PaymentMethodFormValues) => {
        onSave(data, method?.id);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{method ? 'Редактировать способ оплаты' : 'Добавить способ оплаты'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="commission" render={({ field }) => ( <FormItem><FormLabel>Комиссия (%)</FormLabel><FormControl><Input type="number" step="0.1" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Отмена</Button></DialogClose>
                            <Button type="submit">{method ? 'Сохранить' : 'Добавить'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function PaymentMethodsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const paymentMethodsRef = useMemoFirebase(() => firestore ? collection(firestore, "paymentMethods") : null, [firestore]);
  const { data: methods, isLoading } = useCollection<PaymentMethod>(paymentMethodsRef);

  const handleSave = (data: PaymentMethodFormValues, id?: string) => {
    const cleanData = { ...data, commission: data.commission ?? null };
    if (id && firestore) {
        updateDocumentNonBlocking(doc(firestore, "paymentMethods", id), cleanData);
        toast({ variant: "success", title: "Способ оплаты обновлен" });
    } else {
        if (!paymentMethodsRef) return;
        addDocumentNonBlocking(paymentMethodsRef, cleanData);
        toast({ variant: "success", title: "Способ оплаты добавлен" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "paymentMethods", id));
    toast({ variant: "info", title: "Способ оплаты удален" });
  };
  
  const handleSetDefault = async (methodId: string) => {
    if (!firestore || !methods) return;
    
    const batch = writeBatch(firestore);
    
    methods.forEach(method => {
      const isDefault = method.id === methodId;
      const methodRef = doc(firestore, "paymentMethods", method.id);
      batch.update(methodRef, { isDefault });
    });

    try {
        await batch.commit();
        toast({ variant: "success", title: "Способ по умолчанию обновлен" });
    } catch(e) {
        toast({ variant: "destructive", title: "Ошибка обновления" });
        console.error(e);
    }
  };

  return (
    <Card>
        <CardHeader>
            <CardTitle>Способы оплаты</CardTitle>
            <CardDescription>Управляйте способами оплаты, доступными в системе.</CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end mb-4">
                <PaymentMethodDialog onSave={handleSave}>
                    <Button><PlusCircle className="h-4 w-4 mr-2" />Добавить способ</Button>
                </PaymentMethodDialog>
            </div>
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Название</TableHead>
                            <TableHead>Комиссия</TableHead>
                            <TableHead>По умолчанию</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {methods && methods.length > 0 ? (
                        methods.map((method) => (
                        <TableRow key={method.id}>
                            <TableCell className="font-medium">{method.name}</TableCell>
                            <TableCell>{method.commission ? `${method.commission}%` : '-'}</TableCell>
                            <TableCell>
                                {method.isDefault ? (
                                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
                                ) : (
                                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(method.id)}>Сделать по умолчанию</Button>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <PaymentMethodDialog method={method} onSave={handleSave}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </PaymentMethodDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Это действие необратимо.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(method.id)}>Удалить</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Способы оплаты еще не созданы.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
    </Card>
  );
}
