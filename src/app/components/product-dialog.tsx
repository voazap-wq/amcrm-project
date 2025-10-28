
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronsUpDown, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { Product, ItemStatus, Supplier, WarehouseCell, ProductCategory } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


const productFormSchema = z.object({
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
  status: z.string().min(1, "Статус обязателен"),
  warehouseCell: z.string().optional(),
  categoryId: z.string().optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

interface ProductDialogProps {
  product?: Partial<ProductFormValues>;
  itemStatuses: ItemStatus[];
  suppliers: Supplier[];
  warehouseCells?: WarehouseCell[];
  productCategories?: ProductCategory[];
  onSave: (product: ProductFormValues) => void;
  children: React.ReactNode;
  mode: 'add' | 'edit';
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function ProductDialog({ product, itemStatuses, suppliers, warehouseCells, productCategories, onSave, children, mode, open, onOpenChange }: ProductDialogProps) {
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
  });

  const sortedSuppliers = React.useMemo(() => {
    if (!suppliers) return [];
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers]);
  
  const sortedItemStatuses = React.useMemo(() => {
    if (!itemStatuses) return [];
    return [...itemStatuses].sort((a, b) => (a.order ?? 99) - (b.order ?? 99));
  }, [itemStatuses]);

  React.useEffect(() => {
    if (open) {
      if (mode === 'edit' && product) {
        form.reset({
          ...product,
          price: product.price || undefined,
          quantity: product.quantity || undefined,
          purchase: product.purchase || undefined,
          term: product.term || undefined,
          supplier: product.supplier || "",
          warehouseCell: product.warehouseCell || "",
          categoryId: product.categoryId || "",
        });
      } else {
        const createdStatus = sortedItemStatuses.find(s => s.name === "Создан");
        const defaultStatus = createdStatus ? createdStatus.name : sortedItemStatuses[0]?.name || "";
        const defaultCell = warehouseCells?.find(c => c.isDefault)?.name || "";
        form.reset({
          id: crypto.randomUUID(),
          name: "",
          article: "",
          manufacturer: "",
          supplier: "",
          price: undefined,
          quantity: 1,
          total: 0,
          purchase: undefined,
          term: 1,
          status: defaultStatus,
          warehouseCell: defaultCell,
          categoryId: "",
        });
      }
    }
  }, [open, product, mode, sortedItemStatuses, warehouseCells, form]);


  const watchPrice = form.watch("price");
  const watchQuantity = form.watch("quantity");
  const watchPurchase = form.watch("purchase");

  React.useEffect(() => {
    const price = watchPrice || 0;
    const quantity = watchQuantity || 0;
    const purchase = watchPurchase || 0;
    form.setValue("total", price * quantity);
    form.setValue("markup", (price - purchase) * quantity);
  }, [watchPrice, watchQuantity, watchPurchase, form]);

  const onSubmit = (data: ProductFormValues) => {
    const dataToSave = {
        ...data,
        term: data.term || null,
        warehouseCell: data.warehouseCell || null,
        supplier: data.supplier,
        categoryId: data.categoryId || null,
    };
    onSave(dataToSave as unknown as ProductFormValues);
    onOpenChange?.(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{mode === 'edit' ? 'Редактировать товар' : 'Добавить новый товар'}</DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Внесите изменения в информацию о товаре.' : 'Заполните информацию о новом товаре.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Наименование</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="article" render={({ field }) => ( <FormItem><FormLabel>Артикул</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="manufacturer" render={({ field }) => ( <FormItem><FormLabel>Производитель</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="price" render={({ field }) => ( <FormItem><FormLabel>Цена</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="quantity" render={({ field }) => ( <FormItem><FormLabel>Кол-во</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="purchase" render={({ field }) => ( <FormItem><FormLabel>Закупка</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField control={form.control} name="term" render={({ field }) => ( <FormItem><FormLabel>Срок (дни)</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Статус</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Выберите статус" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {sortedItemStatuses.map((s) => (
                          <SelectItem key={s.id} value={s.name}>
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="supplier"
                render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Поставщик</FormLabel>
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
                                        {field.value || "Выберите поставщика"}
                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                <Command>
                                    <CommandInput placeholder="Поиск поставщика..." />
                                    <CommandList>
                                        <CommandEmpty>Поставщик не найден.</CommandEmpty>
                                        <CommandGroup>
                                            {sortedSuppliers.map((supplier) => (
                                                <CommandItem
                                                    value={supplier.name}
                                                    key={supplier.id}
                                                    onSelect={() => {
                                                        form.setValue("supplier", supplier.name === field.value ? "" : supplier.name)
                                                    }}
                                                >
                                                    <Check
                                                        className={cn(
                                                            "mr-2 h-4 w-4",
                                                            supplier.name === field.value
                                                                ? "opacity-100"
                                                                : "opacity-0"
                                                        )}
                                                    />
                                                    {supplier.name}
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
                <FormField
                    control={form.control}
                    name="warehouseCell"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Ячейка на складе</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                >
                                {field.value || "Выберите ячейку"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Поиск ячейки..." />
                                <CommandList>
                                <CommandEmpty>Ячейка не найдена.</CommandEmpty>
                                <CommandGroup>
                                    {warehouseCells?.map((cell) => (
                                    <CommandItem
                                        value={cell.name}
                                        key={cell.id}
                                        onSelect={() => form.setValue("warehouseCell", cell.name === field.value ? "" : cell.name)}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", cell.name === field.value ? "opacity-100" : "opacity-0")} />
                                        {cell.name}
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
                 <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Категория</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant="outline"
                                role="combobox"
                                className={cn("w-full justify-between", !field.value && "text-muted-foreground")}
                                >
                                {field.value ? productCategories?.find(cat => cat.id === field.value)?.name : "Выберите категорию"}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                            <Command>
                                <CommandInput placeholder="Поиск категории..." />
                                <CommandList>
                                <CommandEmpty>Категория не найдена.</CommandEmpty>
                                <CommandGroup>
                                    {productCategories?.map((cat) => (
                                    <CommandItem
                                        value={cat.name}
                                        key={cat.id}
                                        onSelect={() => form.setValue("categoryId", cat.id === field.value ? "" : cat.id)}
                                    >
                                        <Check className={cn("mr-2 h-4 w-4", cat.id === field.value ? "opacity-100" : "opacity-0")} />
                                        {cat.name}
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
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange?.(false)}>Отмена</Button>
              <Button type="submit">Сохранить</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
