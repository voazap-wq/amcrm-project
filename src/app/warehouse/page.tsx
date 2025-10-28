
"use client";

import * as React from "react";
import Link from 'next/link';
import { AppLayout } from "@/app/components/app-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import { useCollection, useFirestore, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc, writeBatch, deleteDoc, Timestamp, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import type { CustomerOrder, Customer, Product, Supplier, WarehouseCell, MarkupRule, ItemStatus, ProductCategory } from "@/lib/types";
import { Input } from "@/components/ui/input";
import { ArchiveX, Filter, Search, Printer, ArrowUpDown, Info, ShoppingCart, Trash2, PackagePlus, Eye, EyeOff, PlusCircle, ChevronsUpDown, Check, ChevronUp, ChevronDown, Pencil, HandCoins, Upload, History, Download, CircleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ProductDialog, ProductFormValues } from "@/components/product-dialog";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { ImportDialog } from "@/components/import-dialog";
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
import { format, differenceInDays } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import * as XLSX from "xlsx";

type WarehouseItem = Product & {
    orderId: string;
    orderNumber: string;
    customerName: string;
    clientId: string;
    createdAt: Timestamp;
};

type SortConfig = {
  key: keyof WarehouseItem | 'categoryName' | 'daysOnStock';
  direction: 'ascending' | 'descending';
};

const normalizeString = (str: string | null | undefined): string => {
    if (!str) return "";
    return str.toLowerCase().replace(/[\s-.,/\\|]/g, '');
}

const productSchema = z.object({
  name: z.string().min(1, "Наименование обязательно"),
  article: z.string().optional(),
  manufacturer: z.string().optional(),
  supplierId: z.string().optional(),
  purchase: z.coerce.number().min(0, "Цена закупки не может быть отрицательной").optional(),
  price: z.coerce.number().min(0, "Цена продажи не может быть отрицательной").optional(),
  quantity: z.coerce.number().min(1, "Количество должно быть не меньше 1"),
  warehouseCellId: z.string().optional(),
  categoryId: z.string().optional(),
});

const receivingFormSchema = z.object({
  products: z.array(productSchema).min(1, "Добавьте хотя бы одну позицию"),
});

export type ReceivingFormValues = z.infer<typeof receivingFormSchema>;

// Helper function to recursively clean undefined values from an object
const cleanUndefined = (obj: any): any => {
    if (obj === null || obj === undefined) return null;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        return obj.map(cleanUndefined);
    }

    const newObj: { [key: string]: any } = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const value = obj[key];
            newObj[key] = (value === undefined) ? null : cleanUndefined(value);
        }
    }
    return newObj;
};


export default function WarehousePage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [cellFilter, setCellFilter] = React.useState("");
  const [sortConfig, setSortConfig] = React.useState<SortConfig | null>({ key: 'name', direction: 'ascending' });
  const [cart, setCart] = React.useState<WarehouseItem[]>([]);
  const [showCartFinancialDetails, setShowCartFinancialDetails] = React.useState(false);
  const [isReceivingOpen, setIsReceivingOpen] = React.useState(false);
  const [editingItem, setEditingItem] = React.useState<WarehouseItem | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [cartClientId, setCartClientId] = React.useState<string | null>(null);
  const [showPurchasePrice, setShowPurchasePrice] = React.useState(false);
  const [lastImportId, setLastImportId] = React.useState<string | null>(null);


  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

  const clientsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const suppliersRef = useMemoFirebase(() => (firestore ? collection(firestore, "suppliers") : null), [firestore]);
  const { data: suppliers, isLoading: areSuppliersLoading } = useCollection<Supplier>(suppliersRef);
  
  const warehouseCellsRef = useMemoFirebase(() => (firestore ? collection(firestore, "warehouseCells") : null), [firestore]);
  const { data: warehouseCells, isLoading: areWarehouseCellsLoading } = useCollection<WarehouseCell>(warehouseCellsRef);
  
  const markupRulesRef = useMemoFirebase(() => (firestore ? collection(firestore, "markupRules") : null), [firestore]);
  const { data: markupRules, isLoading: areMarkupRulesLoading } = useCollection<MarkupRule>(markupRulesRef);

  const itemStatusesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'itemStatuses') : null), [firestore]);
  const { data: itemStatuses, isLoading: areItemStatusesLoading } = useCollection<ItemStatus>(itemStatusesRef);

  const productCategoriesRef = useMemoFirebase(() => (firestore ? collection(firestore, 'productCategories') : null), [firestore]);
  const { data: productCategories, isLoading: areCategoriesLoading } = useCollection<ProductCategory>(productCategoriesRef);
  
  const isLoading = areOrdersLoading || areClientsLoading || areSuppliersLoading || areWarehouseCellsLoading || areMarkupRulesLoading || areItemStatusesLoading || areCategoriesLoading;
  
  React.useEffect(() => {
    if (clients && !cartClientId) {
      const retailClient = clients.find(c => c.lastName === "покупатель" && c.firstName === "Розничный");
      if (retailClient) {
        setCartClientId(retailClient.id);
      }
    }
  }, [clients, cartClientId]);

  const receivingForm = useForm<ReceivingFormValues>({
    resolver: zodResolver(receivingFormSchema),
    defaultValues: {
        products: [{ name: "", article: "", manufacturer: "", supplierId: "", purchase: undefined, price: undefined, quantity: 1, warehouseCellId: "" }],
    },
});

const { control, watch: watchReceiving } = receivingForm;
const { fields, append, remove } = useFieldArray({
    control: control,
    name: "products",
});

const handlePurchaseChange = (value: string, index: number) => {
    const purchaseValue = value === '' ? '' : value;
    receivingForm.setValue(`products.${index}.purchase`, purchaseValue === '' ? undefined : parseFloat(purchaseValue));

    const purchasePrice = parseFloat(value);
    if (isNaN(purchasePrice)) {
      receivingForm.setValue(`products.${index}.price`, undefined);
      return;
    }

    if (markupRules) {
        const rule = markupRules.find(r => purchasePrice >= r.from && purchasePrice <= r.to);
        if (rule) {
            const newPrice = purchasePrice * (1 + rule.markup / 100);
            receivingForm.setValue(`products.${index}.price`, parseFloat(newPrice.toFixed(2)));
        } else {
             receivingForm.setValue(`products.${index}.price`, purchasePrice);
        }
    } else {
         receivingForm.setValue(`products.${index}.price`, purchasePrice);
    }
};

const onReceivingSubmit = async (data: ReceivingFormValues, applyMarkupRules: boolean, createCategories: boolean, importSupplier: boolean, importCell: boolean): Promise<{ createdCount: number; updatedCount: number; newDocId: string | null; }> => {
    if (!firestore || !orders || !ordersRef || !productCategoriesRef || !warehouseCellsRef || !suppliersRef) {
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Данные для импорта не готовы.' });
        return { createdCount: 0, updatedCount: 0, newDocId: null };
    }

    const batch = writeBatch(firestore);

    // Build a map of what the warehouse *should* look like after the import.
    const warehouseItemMap = new Map<string, Product>();

    // Step 1: Populate the map with existing stock
    const warehouseOrderDocs = orders.filter(order => order.clientId === 'warehouse-stock');
    warehouseOrderDocs.forEach(order => {
        order.items.forEach(item => {
            const key = normalizeString(item.article) + normalizeString(item.manufacturer);
            warehouseItemMap.set(key, item);
        });
    });

    let createdCount = 0;
    let updatedCount = 0;

    // Step 2: Process the imported file against the map
    for (const productData of data.products) {
        const key = normalizeString(productData.article) + normalizeString(productData.manufacturer);
        const existingItem = warehouseItemMap.get(key);

        let finalCategoryId = productData.categoryId;
        if (createCategories && productData.categoryId && !productCategories?.some(c => c.id === productData.categoryId)) {
            const newCategoryRef = doc(collection(firestore, "productCategories"));
            batch.set(newCategoryRef, { name: productData.categoryId, parent: null });
            finalCategoryId = newCategoryRef.id;
        }
        
        let salePrice = productData.price;
        if (applyMarkupRules && (salePrice === undefined || salePrice === 0) && productData.purchase !== undefined && markupRules) {
            const rule = markupRules.find(r => productData.purchase! >= r.from && productData.purchase! <= r.to);
            salePrice = rule ? parseFloat((productData.purchase! * (1 + rule.markup / 100)).toFixed(2)) : productData.purchase;
        }

        if (existingItem) {
            // Update existing item - replace quantity, not add
            const updatedItem = {
                ...existingItem,
                quantity: productData.quantity, // Set new quantity
                price: salePrice ?? existingItem.price,
                purchase: productData.purchase ?? existingItem.purchase,
                supplier: importSupplier ? (suppliers?.find(s => s.id === productData.supplierId)?.name || existingItem.supplier) : existingItem.supplier,
                warehouseCell: importCell ? (warehouseCells?.find(c => c.id === productData.warehouseCellId)?.name || existingItem.warehouseCell) : existingItem.warehouseCell,
                categoryId: finalCategoryId ?? existingItem.categoryId,
                receivedAt: Timestamp.now(), // Update received date
            };
            updatedItem.total = updatedItem.price * updatedItem.quantity;
            updatedItem.markup = (updatedItem.price - (updatedItem.purchase || 0)) * updatedItem.quantity;

            warehouseItemMap.set(key, updatedItem);
            updatedCount++;
        } else {
            // Add new item
            const newItem = createProductObject(productData, salePrice, productData.purchase, suppliers?.find(s => s.id === productData.supplierId), warehouseCells, finalCategoryId);
            warehouseItemMap.set(key, newItem);
            createdCount++;
        }
    }
    
    // Step 3: Nuke and pave. Delete all old warehouse docs and create a new one.
    warehouseOrderDocs.forEach(orderDoc => {
        batch.delete(doc(firestore, 'orders', orderDoc.id));
    });

    const newWarehouseOrderRef = doc(collection(firestore, 'orders'));
    const finalItems = Array.from(warehouseItemMap.values());
    batch.set(newWarehouseOrderRef, {
        orderNumber: `WAREHOUSE-${Timestamp.now().toMillis()}`,
        clientId: 'warehouse-stock',
        createdAt: Timestamp.now(),
        items: finalItems,
        active: false, // Internal document
        status: 'Приход',
        itemCount: finalItems.reduce((acc, item) => acc + item.quantity, 0),
        total: finalItems.reduce((acc, item) => acc + item.total, 0),
        amountPaid: 0,
        amountRemaining: 0,
    });

    try {
        await batch.commit();
        toast({
            title: "Приемка завершена",
            description: `Создано: ${createdCount}, Обновлено: ${updatedCount}.`,
            variant: 'success'
        });
        setLastImportId(newWarehouseOrderRef.id);
        return { createdCount, updatedCount, newDocId: newWarehouseOrderRef.id };
    } catch (e) {
        console.error("Receiving submit error: ", e);
        toast({ variant: "destructive", title: "Ошибка", description: "Не удалось сохранить товары на склад." });
        return { createdCount: 0, updatedCount: 0, newDocId: null };
    }
};

  const createProductObject = (productData: z.infer<typeof productSchema>, salePrice: number | undefined, purchasePrice: number | undefined, supplier: Supplier | undefined, warehouseCells: WarehouseCell[] | undefined, categoryId: string | undefined): Product => {
    return cleanUndefined({
        id: crypto.randomUUID(),
        name: productData.name,
        article: productData.article || null,
        manufacturer: productData.manufacturer || null,
        supplier: supplier?.name || null,
        price: salePrice || 0,
        purchase: purchasePrice || 0,
        quantity: productData.quantity,
        total: (salePrice || 0) * productData.quantity,
        markup: ((salePrice || 0) - (purchasePrice || 0)) * productData.quantity,
        status: 'На складе',
        warehouseCell: warehouseCells?.find(wc => wc.id === productData.warehouseCellId)?.name || null,
        categoryId: categoryId,
        receivedAt: Timestamp.now(),
    });
  }

  const warehouseOrders = React.useMemo(() => {
    if (!orders) return [];
    return orders.filter(order => order.clientId === 'warehouse-stock').sort((a,b) => {
        const timeA = a.createdAt && 'toDate' in a.createdAt ? a.createdAt.toDate().getTime() : 0;
        const timeB = b.createdAt && 'toDate' in b.createdAt ? b.createdAt.toDate().getTime() : 0;
        return timeB - timeA;
    });
  }, [orders]);


  const warehouseItems: WarehouseItem[] = React.useMemo(() => {
    if (!orders || !clients) return [];
  
    return orders.flatMap(order => {
        const customer = clients.find(c => c.id === order.clientId);
        return (order.items || [])
            .filter(item => item.status === 'На складе')
            .map(item => ({
                ...item,
                orderId: order.id,
                orderNumber: order.orderNumber,
                customerName: customer ? `${customer.lastName} ${customer.firstName}` : "Неизвестный",
                clientId: order.clientId,
                createdAt: order.createdAt,
            }));
    });
  }, [orders, clients]);

  const filteredItems = React.useMemo(() => {
    const normalizedSearch = normalizeString(searchTerm);

    return warehouseItems.filter(item => {
        const matchesSearch = normalizedSearch
            ? normalizeString(item.name).includes(normalizedSearch) ||
              normalizeString(item.article).includes(normalizedSearch) ||
              normalizeString(item.manufacturer).includes(normalizedSearch)
            : true;
        
        const matchesCell = cellFilter
            ? normalizeString(item.warehouseCell).includes(normalizeString(cellFilter))
            : true;
        
        return matchesSearch && matchesCell;
    });
  }, [warehouseItems, searchTerm, cellFilter]);


  const sortedItems = React.useMemo(() => {
    let sortableItems = [...filteredItems];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aValue, bValue;
        
        if (sortConfig.key === 'daysOnStock') {
            aValue = a.createdAt && 'toDate' in a.createdAt ? differenceInDays(new Date(), a.createdAt.toDate()) : 0;
            bValue = b.createdAt && 'toDate' in b.createdAt ? differenceInDays(new Date(), b.createdAt.toDate()) : 0;
        } else if (sortConfig.key === 'categoryName') {
            aValue = productCategories?.find(cat => cat.id === a.categoryId)?.name || '';
            bValue = productCategories?.find(cat => cat.id === b.categoryId)?.name || '';
        } else {
            aValue = a[sortConfig.key as keyof WarehouseItem];
            bValue = b[sortConfig.key as keyof WarehouseItem];
        }

        if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            return sortConfig.direction === 'ascending' ? aValue.toMillis() - bValue.toMillis() : bValue.toMillis() - aValue.toMillis();
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }
        
        const aString = String(aValue || '').toLowerCase();
        const bString = String(bValue || '').toLowerCase();
        
        if (aString < bString) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aString > bString) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredItems, sortConfig, productCategories]);

  const cartTotals = React.useMemo(() => {
    return cart.reduce((acc, item) => {
        const itemTotal = item.price * item.quantity;
        const itemPurchaseTotal = (item.purchase || 0) * item.quantity;
        
        acc.total += itemTotal;
        acc.totalPurchase += itemPurchaseTotal;
        acc.totalMarkup += itemTotal - itemPurchaseTotal;

        return acc;
    }, { total: 0, totalPurchase: 0, totalMarkup: 0 });
  }, [cart]);

  const warehouseTotals = React.useMemo(() => {
    return sortedItems.reduce((acc, item) => {
      acc.totalQuantity += item.quantity;
      acc.totalPurchasePrice += (item.purchase || 0) * item.quantity;
      acc.totalSellingPrice += item.price * item.quantity;
      return acc;
    }, {
      totalQuantity: 0,
      totalPurchasePrice: 0,
      totalSellingPrice: 0,
    });
  }, [sortedItems]);


  const handleSort = (key: SortConfig['key']) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleAddToCart = (item: WarehouseItem) => {
    const itemToAdd = { ...item, quantity: 1 };
    setCart(prevCart => [...prevCart, itemToAdd]);
  };
  
  const handleRemoveFromCart = (itemId: string) => {
      setCart(prevCart => prevCart.filter(item => item.id !== itemId));
  };

  const handleCartQuantityChange = (itemId: string, newQuantity: number) => {
    setCart(prevCart => 
        prevCart.map(item => 
            item.id === itemId ? { ...item, quantity: newQuantity > 0 ? newQuantity : 1 } : item
        )
    );
  };
  
  const handleCreateOrderFromCart = async () => {
    if (!firestore || !clients || !cartClientId || !orders) {
      toast({
        variant: 'destructive',
        title: 'Ошибка',
        description: 'Клиент для продажи не выбран или база данных не готова.',
      });
      return;
    }
  
    const batch = writeBatch(firestore);
  
    // 1. Create a new order for the sale
    const itemsForSale = cart.map(item => ({
      ...item,
      status: 'Продан',
      quantity: item.quantity,
      total: item.price * item.quantity
    }));
    const total = cartTotals.total;
    const maxOrderNumber = orders.length > 0 ? Math.max(...orders.map(o => parseInt(o.orderNumber, 10)).filter(n => !isNaN(n))) : 0;
    const newOrderNumber = (maxOrderNumber + 1).toString();
  
    const newOrderData = {
      orderNumber: newOrderNumber,
      clientId: cartClientId,
      createdAt: Timestamp.now(),
      items: itemsForSale,
      active: true,
      status: 'Оплачено',
      channel: 'Витрина' as 'Витрина' | 'Сайт',
      itemCount: itemsForSale.reduce((acc, p) => acc + p.quantity, 0),
      total: total,
      amountPaid: total,
      amountRemaining: 0,
      paymentHistory: [{ amount: total, date: Timestamp.now() }],
    };
    const newOrderRef = doc(collection(firestore, 'orders'));
    batch.set(newOrderRef, newOrderData);
  
    // 2. Update the original warehouse orders
    const itemUpdateMap = new Map<string, { items: Product[], itemCount: number }>();
  
    for (const cartItem of cart) {
      const originalOrder = orders.find(o => o.id === cartItem.orderId);
      if (!originalOrder) continue;
  
      let currentOrderData = itemUpdateMap.get(originalOrder.id);
      if (!currentOrderData) {
        currentOrderData = { items: [...originalOrder.items], itemCount: originalOrder.itemCount };
      }
  
      const updatedItems = [...currentOrderData.items];
      const targetItemIndex = updatedItems.findIndex(i => i.id === cartItem.id);
      const targetItem = updatedItems[targetItemIndex];
  
      if (cartItem.quantity < targetItem.quantity) {
        const remainingQuantity = targetItem.quantity - cartItem.quantity;
        updatedItems[targetItemIndex] = {
          ...targetItem,
          quantity: remainingQuantity,
          total: targetItem.price * remainingQuantity,
          markup: (targetItem.price - (targetItem.purchase || 0)) * remainingQuantity
        };
      } else {
        updatedItems.splice(targetItemIndex, 1);
      }
      
      currentOrderData.items = updatedItems;
      currentOrderData.itemCount = updatedItems.reduce((acc, item) => acc + item.quantity, 0);
      itemUpdateMap.set(originalOrder.id, currentOrderData);
    }
    
    itemUpdateMap.forEach((updatedData, orderId) => {
      const orderRef = doc(firestore, 'orders', orderId);
      batch.update(orderRef, { items: updatedData.items, itemCount: updatedData.itemCount });
    });
  
    try {
      await batch.commit();
  
      toast({
        title: 'Быстрая продажа оформлена',
        description: `Создан заказ #${newOrderNumber}.`,
        variant: 'success',
      });
      setCart([]);
    } catch (error) {
      console.error('Quick sale error: ', error);
      toast({
        variant: 'destructive',
        title: 'Ошибка продажи',
        description: 'Не удалось оформить быструю продажу.',
      });
    }
  };

  const handleWriteOffItem = (item: WarehouseItem) => {
    const { orderId } = item;
    
    const order = orders?.find(o => o.id === orderId);
    if (!order || !firestore) return;

    const newItems = order.items.map(i => 
      i.id === item.id ? { ...i, status: 'Списан' } : i
    );
    
    const orderRef = doc(firestore, 'orders', order.id);
    updateDocumentNonBlocking(orderRef, { items: newItems });

    toast({
        title: "Товар списан",
        description: `Товар "${item.name}" был списан со склада.`,
        variant: "info",
    });
  };


  const handleSaveItem = (updatedProduct: ProductFormValues) => {
    if (!editingItem) return;
    const { orderId } = editingItem;
    
    const order = orders?.find(o => o.id === orderId);
    if (!order || !firestore) return;

    const cleanProductData = cleanUndefined({
        ...updatedProduct,
        supplier: suppliers?.find(s => s.name === updatedProduct.supplier)?.name || null,
        warehouseCell: warehouseCells?.find(c => c.name === updatedProduct.warehouseCell)?.name || null,
        categoryId: updatedProduct.categoryId || null,
    });

    const newItems = order.items.map(item => 
      item.id === updatedProduct.id ? { ...item, ...cleanProductData } : item
    );
    
    const orderRef = doc(firestore, 'orders', order.id);
    updateDocumentNonBlocking(orderRef, { items: newItems });

    toast({
        title: "Товар обновлен",
        description: `Данные для товара "${updatedProduct.name}" были успешно обновлены.`,
        variant: "success",
    });
    setEditingItem(null);
    setIsEditDialogOpen(false);
  };

  const handleEditItem = (item: WarehouseItem) => {
    setEditingItem(item);
    setIsEditDialogOpen(true);
  };
  
  const getClientDisplayName = (client: Customer | undefined) => {
    if (!client) return "";
    return `${client.lastName} ${client.firstName} ${client.patronymic || ''}`.trim();
  }

  const renderSortArrow = (key: SortConfig['key']) => {
    if (!sortConfig || sortConfig.key !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };
  
  const handleDeleteImport = async (orderId: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, "orders", orderId));
    toast({ variant: "info", title: "Приход удален", description: "Все товары из этого прихода удалены со склада." });
  };
  
  const handleExport = () => {
    const dataToExport = sortedItems.map(item => ({
      'Наименование': item.name,
      'Артикул': item.article,
      'Производитель': item.manufacturer,
      'Поставщик': item.supplier,
      'Ячейка': item.warehouseCell,
      'Цена': item.price,
      'Количество': item.quantity,
      'Закупка': item.purchase,
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Склад");
    XLSX.writeFile(workbook, "warehouse_stock.xlsx");
  };

  const handleClearWarehouse = async () => {
    if (!firestore) return;

    const warehouseOrderDocs = orders?.filter(o => o.clientId === 'warehouse-stock');
    if (!warehouseOrderDocs || warehouseOrderDocs.length === 0) {
        toast({ variant: 'info', title: 'Склад уже пуст' });
        return;
    }

    const batch = writeBatch(firestore);
    warehouseOrderDocs.forEach(orderDoc => {
        const docRef = doc(firestore, 'orders', orderDoc.id);
        batch.delete(docRef);
    });

    try {
        await batch.commit();
        toast({ variant: 'success', title: 'Склад очищен', description: 'Все свободные остатки были удалены.' });
    } catch (e) {
        console.error("Failed to clear warehouse:", e);
        toast({ variant: 'destructive', title: 'Ошибка', description: 'Не удалось очистить склад.' });
    }
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Склад">
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Склад">
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Прием товара на склад</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-2">
                    <Button onClick={() => setIsReceivingOpen(prev => !prev)}>
                        <PackagePlus className="mr-2 h-4 w-4"/>
                        {isReceivingOpen ? 'Скрыть форму приемки' : 'Добавить товар'}
                    </Button>
                    <ImportDialog
                        suppliers={suppliers || []}
                        warehouseCells={warehouseCells || []}
                        productCategories={productCategories || []}
                        markupRules={markupRules || []}
                        onImport={onReceivingSubmit}
                        lastImportId={lastImportId}
                        onDeleteImport={handleDeleteImport}
                    >
                        <Button variant="outline">
                            <Upload className="mr-2 h-4 w-4" />
                            Импорт
                        </Button>
                    </ImportDialog>
                     <Dialog>
                        <DialogTrigger asChild>
                            <Button variant="outline">
                                <History className="mr-2 h-4 w-4" />
                                История приходов
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl">
                            <DialogHeader>
                                <DialogTitle>История приходов</DialogTitle>
                            </DialogHeader>
                             <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Дата прихода</TableHead>
                                        <TableHead>Номер документа</TableHead>
                                        <TableHead>Количество позиций</TableHead>
                                        <TableHead className="text-right">Действия</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {warehouseOrders.map(order => (
                                        <TableRow key={order.id}>
                                            <TableCell>{order.createdAt && 'toDate' in order.createdAt ? format(order.createdAt.toDate(), 'dd.MM.yyyy HH:mm') : '-'}</TableCell>
                                            <TableCell>{order.orderNumber}</TableCell>
                                            <TableCell>{order.itemCount}</TableCell>
                                            <TableCell className="text-right">
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
                                                                Это действие необратимо. Весь приход будет удален со склада.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleDeleteImport(order.id)}>
                                                                Удалить
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </DialogContent>
                    </Dialog>
                    <Button variant="outline" onClick={handleExport}>
                        <Download className="mr-2 h-4 w-4" />
                        Экспорт
                    </Button>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Очистить склад
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Вы уверены, что хотите очистить склад?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    <p className="font-bold text-red-600 flex items-center gap-2"><CircleAlert />Это действие необратимо!</p>
                                    <p>Все товары, не зарезервированные в заказах клиентов (свободные остатки), будут удалены. Заказы клиентов и товары в них затронуты не будут.</p>
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction onClick={handleClearWarehouse}>Да, очистить свободные остатки</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </CardContent>
            </Card>
            
            <Collapsible open={isReceivingOpen} onOpenChange={setIsReceivingOpen}>
              <Card>
                  <CollapsibleContent>
                    <CardHeader>
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle>Прием товара на склад</CardTitle>
                                <CardDescription>
                                    Заполните форму для оприходования новых товаров.
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-4">
                                <Button type="button" variant="outline" onClick={(e) => { e.stopPropagation(); append({ name: "", article: "", manufacturer: "", supplierId: "", purchase: undefined, price: undefined, quantity: 1, warehouseCellId: "" })}}>
                                    <PlusCircle className="h-4 w-4 mr-2" />
                                    Добавить еще позицию
                                </Button>
                                <Button type="submit" form="receiving-form" onClick={(e) => e.stopPropagation()} disabled={receivingForm.formState.isSubmitting}>
                                    {receivingForm.formState.isSubmitting ? 'Сохранение...' : 'Оприходовать товары'}
                                </Button>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <Skeleton className="h-48 w-full" />
                      ) : (
                        <Form {...receivingForm}>
                          <form id="receiving-form" onSubmit={receivingForm.handleSubmit(data => onReceivingSubmit(data, true, true, true, true)) } className="space-y-6">
                            <div className="space-y-4">
                              {fields.map((field, index) => (
                                <div key={field.id} className="grid grid-cols-12 gap-x-4 gap-y-2 p-4 border rounded-lg relative">
                                    <div className="col-span-12"><p className="font-medium text-sm text-muted-foreground">Позиция #{index + 1}</p></div>
                                    <div className="col-span-12 md:col-span-4">
                                      <FormField control={receivingForm.control} name={`products.${index}.name`} render={({ field }) => ( <FormItem><FormLabel>Наименование</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                      <FormField control={receivingForm.control} name={`products.${index}.article`} render={({ field }) => ( <FormItem><FormLabel>Артикул</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                    <div className="col-span-6 md:col-span-3">
                                      <FormField control={receivingForm.control} name={`products.${index}.manufacturer`} render={({ field }) => ( <FormItem><FormLabel>Производитель</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                    <div className="col-span-6 md:col-span-3">
                                        <FormField control={receivingForm.control} name={`products.${index}.supplierId`} render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Поставщик</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild><FormControl>
                                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                        {field.value ? suppliers?.find(s => s.id === field.value)?.name : "Выберите"}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl></PopoverTrigger>
                                                <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Поиск..." /><CommandList><CommandEmpty>Не найдено</CommandEmpty><CommandGroup>
                                                    {suppliers?.map(s => (<CommandItem value={s.name} key={s.id} onSelect={() => field.onChange(s.id)}><Check className={cn("mr-2 h-4 w-4", s.id === field.value ? "opacity-100" : "opacity-0")}/>{s.name}</CommandItem>))}
                                                </CommandGroup></CommandList></Command></PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                       <FormField control={receivingForm.control} name={`products.${index}.purchase`} render={({ field }) => ( <FormItem><FormLabel>Закупка, ₽</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={(e) => {field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber); handlePurchaseChange(e.target.value, index);}} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                      <FormField control={receivingForm.control} name={`products.${index}.price`} render={({ field }) => ( <FormItem><FormLabel>Продажа, ₽</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}/></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                    <div className="col-span-6 md:col-span-2">
                                      <FormField control={receivingForm.control} name={`products.${index}.quantity`} render={({ field }) => ( <FormItem><FormLabel>Количество</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? 1} onChange={(e) => field.onChange(e.target.value === '' ? 1 : e.target.valueAsNumber)} /></FormControl><FormMessage /></FormItem> )} />
                                    </div>
                                    <div className="col-span-6 md:col-span-3">
                                      <FormField control={receivingForm.control} name={`products.${index}.warehouseCellId`} render={({ field }) => (
                                            <FormItem>
                                            <FormLabel>Ячейка</FormLabel>
                                            <Popover><PopoverTrigger asChild><FormControl>
                                                <Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                    {field.value ? warehouseCells?.find(wc => wc.id === field.value)?.name : "Выберите"}
                                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                </Button>
                                            </FormControl></PopoverTrigger>
                                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0"><Command><CommandInput placeholder="Поиск..." /><CommandList><CommandEmpty>Не найдено</CommandEmpty><CommandGroup>
                                                {warehouseCells?.map(wc => (<CommandItem value={wc.name} key={wc.id} onSelect={() => field.onChange(wc.id)}><Check className={cn("mr-2 h-4 w-4", wc.id === field.value ? "opacity-100" : "opacity-0")}/>{wc.name}</CommandItem>))}
                                            </CommandGroup></CommandList></Command></PopoverContent>
                                            </Popover><FormMessage />
                                            </FormItem>
                                        )} />
                                    </div>
                                    <Button type="button" variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8" onClick={() => remove(index)}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                              ))}
                            </div>
                          </form>
                        </Form>
                      )}
                    </CardContent>
                  </CollapsibleContent>
              </Card>
            </Collapsible>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Search className="h-5 w-5"/>
                        Поиск и фильтрация
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className='h-6 w-6 text-orange-500'>
                                    <Info className="h-4 w-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 space-y-3">
                               <div className="space-y-1">
                                    <h4 className="font-bold">Как работает поиск</h4>
                                    <p className="text-sm text-muted-foreground">Система игнорирует регистр, пробелы, тире и другие символы при поиске.</p>
                               </div>
                                <div className="space-y-1">
                                    <h4 className="font-bold text-sm">Нормализация</h4>
                                    <p className="text-sm">Когда вы вводите "ABC-123 45", система "очищает" ваш запрос и данные в таблице до "abc12345", чтобы найти совпадения независимо от форматирования.</p>
                                </div>
                                 <div className="space-y-1">
                                    <h4 className="font-bold text-sm">Различение знаков</h4>
                                    <p className="text-sm">Система различает буквы и цифры. "A123" не будет считаться тем же, что и "B123".</p>
                                </div>
                                 <div className="space-y-1">
                                    <h4 className="font-bold text-sm">Результаты</h4>
                                    <p className="text-sm">Если вашему запросу соответствует несколько позиций, все они будут показаны в таблице.</p>
                                </div>
                            </PopoverContent>
                        </Popover>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2">
                             <Label htmlFor="main-search">Поиск по товару</Label>
                             <div className="relative mt-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="main-search"
                                    placeholder="Наименование, артикул, производитель..."
                                    className="pl-8 h-9 w-full"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                         <div>
                            <Label htmlFor="cell-filter">Фильтр по ячейке</Label>
                             <div className="relative mt-1">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="cell-filter"
                                    placeholder="Название ячейки..."
                                    className="pl-8 h-9 w-full"
                                    value={cellFilter}
                                    onChange={e => setCellFilter(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <CardTitle>Корзина быстрой продажи</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowCartFinancialDetails(prev => !prev)}>
                            {showCartFinancialDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </div>
                </CardHeader>
                <CardContent>
                     <div className="mb-4">
                      <Label>Клиент</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                           <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              cartClientId && "bg-blue-100/70 text-blue-800 border-blue-200 hover:bg-blue-100/90 hover:text-blue-800",
                              !cartClientId && "text-muted-foreground"
                            )}
                          >
                            {cartClientId ? getClientDisplayName(clients?.find(c => c.id === cartClientId)) : "Выберите клиента"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                          <Command>
                            <CommandInput placeholder="Поиск клиента..." />
                            <CommandList>
                              <CommandEmpty>Клиент не найден.</CommandEmpty>
                              <CommandGroup>
                                {clients?.map(client => (
                                  <CommandItem
                                    value={getClientDisplayName(client)}
                                    key={client.id}
                                    onSelect={() => setCartClientId(client.id)}
                                  >
                                    <Check className={cn("mr-2 h-4 w-4", client.id === cartClientId ? "opacity-100" : "opacity-0")} />
                                    {getClientDisplayName(client)}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </div>
                    {cart.length > 0 ? (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Наименование</TableHead>
                                        {showCartFinancialDetails && <TableHead className="text-right">Закупка</TableHead>}
                                        <TableHead className="text-right">Цена</TableHead>
                                        <TableHead className="text-center">Кол-во</TableHead>
                                        {showCartFinancialDetails && <TableHead className="text-right">Наценка</TableHead>}
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {cart.map(item => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            {showCartFinancialDetails && <TableCell className="text-right">{(item.purchase || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>}
                                            <TableCell className="text-right">{item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>
                                            <TableCell className="text-center">
                                                <Input
                                                    type="number"
                                                    className="w-16 h-8 text-center"
                                                    value={item.quantity}
                                                    onChange={(e) => handleCartQuantityChange(item.id, parseInt(e.target.value, 10))}
                                                    min="1"
                                                />
                                            </TableCell>
                                            {showCartFinancialDetails && <TableCell className="text-right">{((item.price - (item.purchase || 0)) * item.quantity).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>}
                                            <TableCell>
                                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleRemoveFromCart(item.id)}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={showCartFinancialDetails ? 2 : 1} className="font-bold text-right">Итого:</TableCell>
                                        <TableCell className="text-right font-bold">{cartTotals.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>
                                        <TableCell></TableCell>
                                        {showCartFinancialDetails && <TableCell className="text-right font-bold">{cartTotals.totalMarkup.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>}
                                        <TableCell></TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                             <div className="mt-4 flex justify-end">
                                <Button className="w-full sm:w-auto" disabled={cart.length === 0} onClick={handleCreateOrderFromCart}>
                                    <HandCoins className="mr-2 h-4 w-4" />
                                    Продать
                                </Button>
                            </div>
                        </>
                    ) : (
                        <p className="text-center text-muted-foreground py-8">Корзина пуста. Добавьте товары из списка ниже.</p>
                    )}
                </CardContent>
            </Card>


            <Card>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <CardTitle>Остатки на складе</CardTitle>
                            <CardDescription>
                                Товары со статусом "На складе" из всех заказов.
                            </CardDescription>
                        </div>
                        <div className="flex gap-4 items-center">
                            <div className="text-center">
                                <div className="font-bold text-lg">{warehouseTotals.totalQuantity}</div>
                                <div className="text-xs text-muted-foreground">Позиций всего</div>
                            </div>
                            <div className="text-center">
                                <div className="font-bold text-lg">{warehouseTotals.totalPurchasePrice.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                                <div className="text-xs text-muted-foreground">Сумма закупки</div>
                            </div>
                             <div className="text-center">
                                <div className="font-bold text-lg">{warehouseTotals.totalSellingPrice.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                                <div className="text-xs text-muted-foreground">Сумма продажи</div>
                            </div>
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowPurchasePrice(prev => !prev)}>
                                {showPurchasePrice ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[...Array(5)].map((_, i) => (
                            <Skeleton key={i} className="h-12 w-full" />
                            ))}
                        </div>
                    ) : (
                      <Table>
                          <TableHeader>
                              <TableRow>
                                  <TableHead><Button variant="ghost" onClick={() => handleSort('categoryName')}>Категория {renderSortArrow('categoryName')}</Button></TableHead>
                                  <TableHead><Button variant="ghost" onClick={() => handleSort('name')}>Наименование {renderSortArrow('name')}</Button></TableHead>
                                  <TableHead><Button variant="ghost" onClick={() => handleSort('article')}>Артикул {renderSortArrow('article')}</Button></TableHead>
                                  <TableHead><Button variant="ghost" onClick={() => handleSort('manufacturer')}>Производитель {renderSortArrow('manufacturer')}</Button></TableHead>
                                  <TableHead><Button variant="ghost" onClick={() => handleSort('supplier')}>Поставщик {renderSortArrow('supplier')}</Button></TableHead>
                                  <TableHead><Button variant="ghost" onClick={() => handleSort('warehouseCell')}>Ячейка {renderSortArrow('warehouseCell')}</Button></TableHead>
                                  {showPurchasePrice && <TableHead className="text-right"><Button variant="ghost" onClick={() => handleSort('purchase')}>Закупка {renderSortArrow('purchase')}</Button></TableHead>}
                                  <TableHead className="text-right"><Button variant="ghost" onClick={() => handleSort('price')}>Цена {renderSortArrow('price')}</Button></TableHead>
                                  <TableHead className="text-center"><Button variant="ghost" onClick={() => handleSort('quantity')}>Кол-во {renderSortArrow('quantity')}</Button></TableHead>
                                  <TableHead><Button variant="ghost" onClick={() => handleSort('daysOnStock')}>Дней на складе {renderSortArrow('daysOnStock')}</Button></TableHead>
                                  <TableHead className="w-[120px] text-right">Действия</TableHead>
                              </TableRow>
                          </TableHeader>
                          <TableBody>
                              {sortedItems.map(item => {
                                const categoryName = productCategories?.find(cat => cat.id === item.categoryId)?.name || '-';
                                const daysOnStock = item.createdAt && 'toDate' in item.createdAt ? differenceInDays(new Date(), item.createdAt.toDate()) : 0;
                                return (
                                  <TableRow key={`${item.orderId}-${item.id}`}>
                                      <TableCell>{categoryName}</TableCell>
                                      <TableCell className="font-medium">{item.name}</TableCell>
                                      <TableCell>{item.article || '-'}</TableCell>
                                      <TableCell>{item.manufacturer || '-'}</TableCell>
                                      <TableCell>{item.supplier || '-'}</TableCell>
                                      <TableCell>{item.warehouseCell || '-'}</TableCell>
                                      {showPurchasePrice && <TableCell className="text-right">{(item.purchase || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>}
                                      <TableCell className="text-right">{item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB' })}</TableCell>
                                      <TableCell className="text-center">{item.quantity}</TableCell>
                                      <TableCell>{daysOnStock}</TableCell>
                                      <TableCell>
                                          <div className="flex items-center justify-end gap-1">
                                              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditItem(item)}>
                                                  <Pencil className="h-4 w-4" />
                                              </Button>
                                              {item.clientId === 'warehouse-stock' ? (
                                                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleAddToCart(item)}>
                                                      <ShoppingCart className="h-4 w-4 text-green-600"/>
                                                  </Button>
                                              ) : (
                                                  <TooltipProvider>
                                                      <Tooltip>
                                                          <TooltipTrigger asChild>
                                                              <span tabIndex={0}>
                                                                  <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                                                      <ShoppingCart className="h-4 w-4 text-muted-foreground/50"/>
                                                                  </Button>
                                                              </span>
                                                          </TooltipTrigger>
                                                          <TooltipContent>
                                                              <p>Товар зарезервирован</p>
                                                          </TooltipContent>
                                                      </Tooltip>
                                                  </TooltipProvider>
                                              )}
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                                            <ArchiveX className="h-4 w-4" />
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>Списать товар?</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                Это действие изменит статус товара на "Списан". Товар будет убран со склада. Это действие нельзя будет отменить.
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                            <AlertDialogAction onClick={() => handleWriteOffItem(item)}>Списать</AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                          </div>
                                      </TableCell>
                                  </TableRow>
                                )
                              })}
                          </TableBody>
                      </Table>
                    )}
                </CardContent>
            </Card>
        </div>
        {editingItem && (
            <ProductDialog
                mode="edit"
                product={cleanUndefined({
                  ...editingItem,
                  supplier: suppliers?.find(s => s.name === editingItem.supplier)?.name || "",
                  warehouseCell: warehouseCells?.find(c => c.name === editingItem.warehouseCell)?.name || "",
                  categoryId: editingItem.categoryId || "",
                })}
                itemStatuses={itemStatuses || []}
                suppliers={suppliers || []}
                warehouseCells={warehouseCells || []}
                productCategories={productCategories || []}
                onSave={(data) => handleSaveItem(data as ProductFormValues)}
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
            >
              <></>
            </ProductDialog>
        )}
    </AppLayout>
  );
}

    

    