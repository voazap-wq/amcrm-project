

"use client";

import * as React from "react";
import { PlusCircle, Trash2, Pencil, Lock } from "lucide-react";
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
import type { TransactionCategory } from "@/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Название категории обязательно."),
  type: z.enum(["income", "expense"], { required_error: "Выберите тип" }),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;


function CategoryDialog({ category, children, onSave }: { category?: TransactionCategory, children: React.ReactNode, onSave: (data: CategoryFormValues, id?: string) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: category || { name: "", type: "expense" },
    });
    
    React.useEffect(() => {
        if (isOpen) {
            form.reset(category || { name: "", type: "expense" });
        }
    }, [isOpen, category, form]);

    const handleSubmit = (data: CategoryFormValues) => {
        onSave(data, category?.id);
        setIsOpen(false);
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{category ? 'Редактировать категорию' : 'Добавить категорию'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Тип</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="income">Доход</SelectItem>
                                            <SelectItem value="expense">Расход</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Отмена</Button></DialogClose>
                            <Button type="submit" disabled={category?.isDefault}>{category ? 'Сохранить' : 'Добавить'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

function CategoryList({ title, categories, onSave, onDelete, cardClassName, colorCodeItems = false }: { title: string, categories: TransactionCategory[], onSave: (data: CategoryFormValues, id?: string) => void, onDelete: (id: string) => void, cardClassName?: string, colorCodeItems?: boolean }) {

    const renderCategory = (category: TransactionCategory) => (
        <div key={category.id} className={cn(
            "flex items-center justify-between rounded-md border p-2",
            colorCodeItems ? 
                (category.type === 'income' ? "bg-green-100/50 border-green-200" : "bg-red-100/50 border-red-200") 
                : "bg-white/50"
        )}>
            <div className="flex items-center gap-2">
                {category.isDefault && <Lock className="h-4 w-4 text-muted-foreground" />}
                <span className="font-medium text-sm">{category.name}</span>
            </div>
            <div className="flex items-center">
                <CategoryDialog category={category} onSave={onSave}>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-foreground/70 hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                    </Button>
                </CategoryDialog>
                {!category.isDefault && (
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Это действие необратимо.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => onDelete(category.id)}>Удалить</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                )}
            </div>
        </div>
    );
    
    return (
        <Card className={cn(cardClassName)}>
            <CardHeader>
                <CardTitle className="text-xl">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                 <div className="space-y-2">
                    {categories.length > 0 ? (
                        categories.map(renderCategory)
                    ) : (
                         <p className="text-sm text-muted-foreground text-center py-4">Категорий этого типа еще нет.</p>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

export default function CategoriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, "transactionCategories") : null, [firestore]);
  const { data: categories, isLoading } = useCollection<TransactionCategory>(categoriesRef);
  
  const { incomeCategories, expenseCategories, returnCategories } = React.useMemo(() => {
    if (!categories) return { incomeCategories: [], expenseCategories: [], returnCategories: [] };
    const returns = categories.filter(c => c.name.toLowerCase().includes('возврат'));
    const income = categories.filter(c => c.type === 'income' && !returns.some(r => r.id === c.id));
    const expense = categories.filter(c => c.type === 'expense' && !returns.some(r => r.id === c.id));
    return {
        incomeCategories: income,
        expenseCategories: expense,
        returnCategories: returns,
    }
  }, [categories]);

  const handleSave = (data: CategoryFormValues, id?: string) => {
    if (!firestore) return;

    if (id) {
        const existingCategory = categories?.find(c => c.id === id);
        if (existingCategory?.isDefault) {
            toast({ variant: "destructive", title: "Ошибка", description: "Категории по умолчанию нельзя редактировать." });
            return;
        }
        updateDocumentNonBlocking(doc(firestore, "transactionCategories", id), data);
        toast({ variant: "success", title: "Категория обновлена" });
    } else {
        if (!categoriesRef) return;
        addDocumentNonBlocking(categoriesRef, data);
        toast({ variant: "success", title: "Категория добавлена" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    const existingCategory = categories?.find(c => c.id === id);
    if (existingCategory?.isDefault) {
        toast({ variant: "destructive", title: "Ошибка", description: "Категории по умолчанию нельзя удалять." });
        return;
    }
    await deleteDoc(doc(firestore, "transactionCategories", id));
    toast({ variant: "info", title: "Категория удалена" });
  };

  return (
    <div>
        <div className="flex justify-between items-center mb-4">
            <div>
                <h2 className="text-2xl font-bold tracking-tight">Категории транзакций</h2>
                <p className="text-muted-foreground">Управляйте категориями для доходов и расходов.</p>
            </div>
             <CategoryDialog onSave={handleSave}>
                <Button><PlusCircle className="h-4 w-4 mr-2" />Добавить категорию</Button>
            </CategoryDialog>
        </div>
        {isLoading ? (
            <div className="grid md:grid-cols-2 gap-6">
                <Skeleton className="h-48 w-full" />
                <Skeleton className="h-48 w-full" />
            </div>
        ) : (
             <div className="grid md:grid-cols-1 lg:grid-cols-3 gap-6">
                <CategoryList 
                    title="Доходы" 
                    categories={incomeCategories} 
                    onSave={handleSave} 
                    onDelete={handleDelete}
                    cardClassName="bg-green-100/50 border-green-200"
                />
                <CategoryList 
                    title="Расходы" 
                    categories={expenseCategories} 
                    onSave={handleSave} 
                    onDelete={handleDelete} 
                    cardClassName="bg-red-100/50 border-red-200"
                />
                <CategoryList 
                    title="Возвраты" 
                    categories={returnCategories} 
                    onSave={handleSave} 
                    onDelete={handleDelete}
                    cardClassName="bg-blue-100/50 border-blue-200"
                    colorCodeItems={true}
                />
            </div>
        )}
    </div>
  );
}
