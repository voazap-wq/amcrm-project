
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Trash2, Pencil } from "lucide-react";
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
import { collection, doc, deleteDoc } from "firebase/firestore";
import type { MarkupRule } from "@/lib/types";
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


const markupRuleFormSchema = z.object({
  from: z.coerce.number().min(0, "Значение 'От' должно быть не отрицательным."),
  to: z.coerce.number().min(0, "Значение 'До' должно быть не отрицательным."),
  markup: z.coerce.number().min(0, "Наценка должна быть не отрицательной."),
}).refine(data => data.to > data.from, {
  message: "Значение 'До' должно быть больше значения 'От'.",
  path: ["to"],
});

type MarkupRuleFormValues = z.infer<typeof markupRuleFormSchema>;

function RuleDialog({ rule, children, onSave }: { rule?: MarkupRule, children: React.ReactNode, onSave: (data: MarkupRuleFormValues, id?: string) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<MarkupRuleFormValues>({
        resolver: zodResolver(markupRuleFormSchema),
        defaultValues: rule || { from: 0, to: 0, markup: 0 },
    });
    
    React.useEffect(() => {
        if (isOpen) {
            form.reset(rule || { from: 0, to: 0, markup: 0 });
        }
    }, [isOpen, rule, form]);

    const handleSubmit = (data: MarkupRuleFormValues) => {
        onSave(data, rule?.id);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{rule ? 'Редактировать правило' : 'Добавить правило наценки'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="from" render={({ field }) => ( <FormItem><FormLabel>От (₽)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="to" render={({ field }) => ( <FormItem><FormLabel>До (₽)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <FormField control={form.control} name="markup" render={({ field }) => ( <FormItem><FormLabel>Наценка (%)</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Отмена</Button></DialogClose>
                            <Button type="submit">{rule ? 'Сохранить' : 'Добавить'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}


export default function MarkupsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const rulesRef = useMemoFirebase(() => firestore ? collection(firestore, "markupRules") : null, [firestore]);
  const { data: rules, isLoading } = useCollection<MarkupRule>(rulesRef);

  const sortedRules = React.useMemo(() => {
    if (!rules) return [];
    return [...rules].sort((a, b) => a.from - b.from);
  }, [rules]);

  const handleSave = (data: MarkupRuleFormValues, id?: string) => {
    if (!firestore) return;
    const { from, to, markup } = data;

    if (id) {
        updateDocumentNonBlocking(doc(firestore, "markupRules", id), { from, to, markup });
        toast({ variant: "success", title: "Правило обновлено" });
    } else {
        if (!rulesRef) return;
        addDocumentNonBlocking(rulesRef, { from, to, markup });
        toast({ variant: "success", title: "Правило добавлено" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "markupRules", id));
    toast({ variant: "info", title: "Правило удалено" });
  };

  return (
    <AppLayout pageTitle="Настройки наценок">
      <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
                </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Настройки наценок
            </h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Правила наценки</CardTitle>
          <CardDescription>
            Здесь вы можете установить правила автоматической наценки на товары в зависимости от их закупочной цены.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end mb-4">
                 <RuleDialog onSave={handleSave}>
                    <Button><PlusCircle className="h-4 w-4 mr-2" />Добавить правило</Button>
                </RuleDialog>
            </div>
            {isLoading ? (
                <div className="space-y-2">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
                </div>
            ) : (
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>От (₽)</TableHead>
                            <TableHead>До (₽)</TableHead>
                            <TableHead>Наценка (%)</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {sortedRules && sortedRules.length > 0 ? (
                        sortedRules.map((rule) => (
                        <TableRow key={rule.id}>
                            <TableCell>{rule.from.toLocaleString('ru-RU')}</TableCell>
                            <TableCell>{rule.to.toLocaleString('ru-RU')}</TableCell>
                            <TableCell className="font-medium">{rule.markup}%</TableCell>
                            <TableCell className="text-right">
                                <RuleDialog rule={rule} onSave={handleSave}>
                                    <Button variant="ghost" size="icon" className="h-8 w-8">
                                        <Pencil className="h-4 w-4" />
                                    </Button>
                                </RuleDialog>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Это действие необратимо.</AlertDialogDescription></AlertDialogHeader>
                                        <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(rule.id)}>Удалить</AlertDialogAction></AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="h-24 text-center">
                            Правила еще не созданы.
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
