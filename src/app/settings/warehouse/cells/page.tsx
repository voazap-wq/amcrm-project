
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Trash2, Pencil, Star } from "lucide-react";
import { AppLayout } from "@/app/components/app-layout";
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
import type { WarehouseCell } from "@/lib/types";
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";


const cellFormSchema = z.object({
  name: z.string().min(1, "Название ячейки обязательно."),
  notes: z.string().optional(),
});

type CellFormValues = z.infer<typeof cellFormSchema>;

function CellDialog({ cell, children, onSave }: { cell?: WarehouseCell, children: React.ReactNode, onSave: (data: CellFormValues, id?: string) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<CellFormValues>({
        resolver: zodResolver(cellFormSchema),
        defaultValues: cell || { name: "", notes: "" },
    });
    
    React.useEffect(() => {
        if (isOpen) {
            form.reset(cell || { name: "", notes: "" });
        }
    }, [isOpen, cell, form]);

    const handleSubmit = (data: CellFormValues) => {
        onSave(data, cell?.id);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{cell ? 'Редактировать ячейку' : 'Добавить ячейку'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
                        <FormField control={form.control} name="notes" render={({ field }) => ( <FormItem><FormLabel>Примечание</FormLabel><FormControl><Textarea {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Отмена</Button></DialogClose>
                            <Button type="submit">{cell ? 'Сохранить' : 'Добавить'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


export default function WarehouseCellsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const cellsRef = useMemoFirebase(() => firestore ? collection(firestore, "warehouseCells") : null, [firestore]);
  const { data: cells, isLoading } = useCollection<WarehouseCell>(cellsRef);

  const handleSave = (data: CellFormValues, id?: string) => {
    if (!firestore) return;
    const cleanData = { ...data, notes: data.notes || null };

    if (id) {
        updateDocumentNonBlocking(doc(firestore, "warehouseCells", id), cleanData);
        toast({ variant: "success", title: "Ячейка обновлена" });
    } else {
        if (!cellsRef) return;
        addDocumentNonBlocking(cellsRef, cleanData);
        toast({ variant: "success", title: "Ячейка добавлена" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "warehouseCells", id));
    toast({ variant: "info", title: "Ячейка удалена" });
  };
  
  const handleSetDefault = async (cellId: string) => {
    if (!firestore || !cells) return;
    const batch = writeBatch(firestore);
    cells.forEach(cell => {
      const cellRef = doc(firestore, 'warehouseCells', cell.id);
      batch.update(cellRef, { isDefault: cell.id === cellId });
    });
    await batch.commit();
    toast({ variant: 'success', title: 'Ячейка по умолчанию обновлена' });
  };

  return (
    <AppLayout pageTitle="Ячейки склада">
      <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings/warehouse">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
                </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Ячейки склада
            </h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Ячейки склада</CardTitle>
          <CardDescription>
            Управление ячейками для хранения товаров на складе.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end mb-4">
                 <CellDialog onSave={handleSave}>
                    <Button><PlusCircle className="h-4 w-4 mr-2" />Добавить ячейку</Button>
                </CellDialog>
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
                            <TableHead>Примечание</TableHead>
                            <TableHead>По умолчанию</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {cells && cells.length > 0 ? (
                        cells.map((cell) => (
                        <TableRow key={cell.id}>
                            <TableCell className="font-medium">{cell.name}</TableCell>
                            <TableCell>{cell.notes || '-'}</TableCell>
                            <TableCell>
                                {cell.isDefault ? (
                                    <Star className="h-5 w-5 text-yellow-500 fill-yellow-400" />
                                ) : (
                                    <Button variant="ghost" size="sm" onClick={() => handleSetDefault(cell.id)}>Назначить</Button>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <CellDialog cell={cell} onSave={handleSave}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </CellDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Это действие необратимо.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(cell.id)}>Удалить</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Ячейки еще не созданы.
                        </TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
            )}
        </CardContent>
      </Card>
      </div>
    </AppLayout>
  );
}
