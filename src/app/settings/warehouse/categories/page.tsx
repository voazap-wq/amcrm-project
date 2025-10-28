"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, PlusCircle, Trash2, Pencil, GripVertical } from "lucide-react";
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
import type { ProductCategory } from "@/lib/types";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const categoryFormSchema = z.object({
  name: z.string().min(1, "Название категории обязательно."),
  parent: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function CategoryDialog({ category, categories, children, onSave }: { category?: ProductCategory, categories: ProductCategory[], children: React.ReactNode, onSave: (data: CategoryFormValues, id?: string) => void }) {
    const [isOpen, setIsOpen] = React.useState(false);
    
    const form = useForm<CategoryFormValues>({
        resolver: zodResolver(categoryFormSchema),
        defaultValues: category || { name: "", parent: "" },
    });
    
    React.useEffect(() => {
        if (isOpen) {
            form.reset(category || { name: "", parent: "" });
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
                        <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Название</FormLabel><FormControl><Input {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
                        <FormField
                            control={form.control}
                            name="parent"
                            render={({ field }) => (
                                <FormItem>
                                <FormLabel>Родительская категория</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Без родителя" />
                                    </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="none">Без родителя</SelectItem>
                                        {categories.filter(c => c.id !== category?.id).map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                            {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <DialogClose asChild><Button type="button" variant="ghost">Отмена</Button></DialogClose>
                            <Button type="submit">{category ? 'Сохранить' : 'Добавить'}</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

export default function ProductCategoriesPage() {
  const firestore = useFirestore();
  const { toast } = useToast();

  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, "productCategories") : null, [firestore]);
  const { data: categories, isLoading } = useCollection<ProductCategory>(categoriesRef);

  const categoryTree = React.useMemo(() => {
    if (!categories) return [];
    const categoryMap = new Map(categories.map(cat => [cat.id, { ...cat, children: [] as ProductCategory[] }]));
    const tree: (ProductCategory & { children: ProductCategory[] })[] = [];

    categories.forEach(cat => {
      const mappedCat = categoryMap.get(cat.id);
      if (mappedCat) {
        if (cat.parent && categoryMap.has(cat.parent)) {
          const parentCat = categoryMap.get(cat.parent);
          if (parentCat) {
            parentCat.children.push(mappedCat);
          }
        } else {
          tree.push(mappedCat);
        }
      }
    });

    return tree;
  }, [categories]);

  const handleSave = (data: CategoryFormValues, id?: string) => {
    if (!firestore) return;
    const cleanData = { ...data, parent: data.parent === 'none' ? null : (data.parent || null) };

    if (id) {
        updateDocumentNonBlocking(doc(firestore, "productCategories", id), cleanData);
        toast({ variant: "success", title: "Категория обновлена" });
    } else {
        if (!categoriesRef) return;
        addDocumentNonBlocking(categoriesRef, cleanData);
        toast({ variant: "success", title: "Категория добавлена" });
    }
  };

  const handleDelete = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "productCategories", id));
    toast({ variant: "info", title: "Категория удалена" });
  };
  
  const renderCategoryRows = (categoriesToRender: (ProductCategory & { children: ProductCategory[] })[], level = 0) => {
    return categoriesToRender.flatMap(cat => {
        const parentName = cat.parent ? categories?.find(p => p.id === cat.parent)?.name : '-';
        const row = (
             <TableRow key={cat.id}>
                <TableCell style={{ paddingLeft: `${1 + level * 2}rem` }}>
                   {cat.name}
                </TableCell>
                <TableCell>
                    {parentName}
                </TableCell>
                <TableCell className="text-right">
                    <CategoryDialog category={cat} categories={categories || []} onSave={handleSave}>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Pencil className="h-4 w-4" />
                        </Button>
                    </CategoryDialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader><AlertDialogTitle>Вы уверены?</AlertDialogTitle><AlertDialogDescription>Это действие необратимо.</AlertDialogDescription></AlertDialogHeader>
                            <AlertDialogFooter><AlertDialogCancel>Отмена</AlertDialogCancel><AlertDialogAction onClick={() => handleDelete(cat.id)}>Удалить</AlertDialogAction></AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </TableCell>
            </TableRow>
        );
        return [row, ...renderCategoryRows(cat.children, level + 1)];
    });
  }

  return (
    <AppLayout pageTitle="Категории товаров">
      <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings/warehouse">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
                </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Категории товаров
            </h1>
        </div>
      <Card>
        <CardHeader>
          <CardTitle>Категории</CardTitle>
          <CardDescription>
            Управление категориями для товаров на складе.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="flex justify-end mb-4">
                 <CategoryDialog categories={categories || []} onSave={handleSave}>
                    <Button><PlusCircle className="h-4 w-4 mr-2" />Добавить категорию</Button>
                </CategoryDialog>
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
                            <TableHead>Родительская категория</TableHead>
                            <TableHead className="text-right">Действия</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                    {categories && categories.length > 0 ? (
                       renderCategoryRows(categoryTree)
                    ) : (
                        <TableRow>
                        <TableCell colSpan={3} className="h-24 text-center">
                            Категории еще не созданы.
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
