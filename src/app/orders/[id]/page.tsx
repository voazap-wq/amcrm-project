
"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  ChevronLeft,
  Upload,
  User,
  Trash2,
  Pencil,
  ArrowUpDown,
  FileText,
  ChevronDown,
  PlusCircle,
  ChevronsUpDown,
  Check,
  ReceiptText,
  Eye,
  EyeOff,
  AlertTriangle,
  Copy,
  ArchiveRestore,
  Undo,
  Sliders,
  LogOut,
  Car as CarIconNav,
  Users,
  ShoppingCart,
  Package,
  Truck,
  BarChart,
  ClipboardCheck,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, addDays, differenceInDays } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CustomerOrder, Product, Customer, OrderStatusDefinition, ItemStatus, Car, Supplier, Payment, PaymentMethod, Transaction, WarehouseCell, ProductCategory } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { useCollection, useDoc, useFirestore, useMemoFirebase, useAuth, useUser } from "@/firebase";
import { collection, doc, setDoc, updateDoc, Timestamp, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { formatPhoneNumber, cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { ProductDialog, type ProductFormValues } from "@/app/components/product-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { CarDialog } from "@/app/components/car-dialog";
import { Separator } from "@/components/ui/separator";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { sidebarNav } from "@/app/page";
import { AppLayout } from "@/app/components/app-layout";


const clientFormSchema = z.object({
  lastName: z.string().min(1, "Фамилия обязательна"),
  firstName: z.string().min(1, "Имя обязательно"),
  patronymic: z.string().optional(),
  email: z.string().email("Неверный формат email").optional().or(z.literal('')),
  phone: z.string().optional(),
});

type ClientFormValues = z.infer<typeof clientFormSchema>;

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


export default function OrderDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const firestore = useFirestore();
  const auth = useAuth();
  const { user, isUserLoading: isUserLoadingAuth } = useUser();

  const orderRef = useMemoFirebase(() => firestore && id ? doc(firestore, "orders", id) : null, [firestore, id]);
  const { data: orderData, isLoading: isOrderLoading } = useDoc<Omit<CustomerOrder, 'customer'>>(orderRef);

  const clientsRef = useMemoFirebase(() => firestore ? collection(firestore, 'clients') : null, [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const carsRef = useMemoFirebase(() => firestore ? collection(firestore, 'cars') : null, [firestore]);
  const { data: cars, isLoading: areCarsLoading } = useCollection<Car>(carsRef);

  const orderStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'orderStatuses') : null, [firestore]);
  const { data: orderStatuses, isLoading: areOrderStatusesLoading } = useCollection<OrderStatusDefinition>(orderStatusesRef);
  
  const itemStatusesRef = useMemoFirebase(() => firestore ? collection(firestore, 'itemStatuses') : null, [firestore]);
  const { data: itemStatuses, isLoading: areItemStatusesLoading } = useCollection<ItemStatus>(itemStatusesRef);

  const suppliersRef = useMemoFirebase(() => firestore ? collection(firestore, 'suppliers') : null, [firestore]);
  const { data: suppliers, isLoading: areSuppliersLoading } = useCollection<Supplier>(suppliersRef);
  
  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'transactionCategories') : null, [firestore]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<any>(categoriesRef);

  const paymentMethodsRef = useMemoFirebase(() => firestore ? collection(firestore, 'paymentMethods') : null, [firestore]);
  const { data: paymentMethods, isLoading: arePaymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsRef);

  const warehouseCellsRef = useMemoFirebase(() => firestore ? collection(firestore, 'warehouseCells') : null, [firestore]);
  const { data: warehouseCells, isLoading: areWarehouseCellsLoading } = useCollection<WarehouseCell>(warehouseCellsRef);

  const productCategoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'productCategories') : null, [firestore]);
  const { data: productCategories, isLoading: areProductCategoriesLoading } = useCollection<ProductCategory>(productCategoriesRef);

  const [order, setOrder] = React.useState<CustomerOrder | null>(null);
  const [paymentMethodId, setPaymentMethodId] = React.useState<string | undefined>(undefined);

  React.useEffect(() => {
    if (paymentMethods && !paymentMethodId) {
      const defaultMethod = paymentMethods.find(pm => pm.isDefault);
      if (defaultMethod) {
        setPaymentMethodId(defaultMethod.id);
      } else if (paymentMethods.length > 0) {
        setPaymentMethodId(paymentMethods[0].id);
      }
    }
  }, [paymentMethods, paymentMethodId]);


  const [productToEdit, setProductToEdit] = React.useState<ProductFormValues | undefined>(undefined);
  const [isAddProductDialogOpen, setIsAddProductDialogOpen] = React.useState(false);


  const clientOrdersQuery = useMemoFirebase(() => (firestore && order?.clientId) ? query(collection(firestore, "orders"), where("clientId", "==", order.clientId)) : null, [firestore, order?.clientId]);
  const { data: clientOrders, isLoading: areClientOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(clientOrdersQuery);
  
  const getOrderTotal = (orderItems: Product[]): number => {
    return (orderItems || [])
      .filter(item => item.status !== 'Отказ')
      .reduce((sum, item) => sum + item.total, 0);
  };
  
  const clientBalance = React.useMemo(() => {
    if (!clientOrders) return 0;
    const totalDebt = clientOrders.reduce((acc, o) => {
        const orderTotal = getOrderTotal(o.items);
        const orderRemaining = orderTotal - (o.amountPaid || 0);
        return acc + orderRemaining;
    }, 0);
    return -totalDebt;
  }, [clientOrders]);

  const clientStats = React.useMemo(() => {
    if (!clientOrders) return { count: 0, total: 0, average: 0, lastOrderDays: null, daysToNextOrder: null, totalMargin: 0 };
    
    const validOrders = clientOrders.filter(o => o.items);
    const totalAmount = validOrders.reduce((acc, o) => acc + getOrderTotal(o.items), 0);
    const totalMargin = validOrders.reduce((marginAcc, o) => {
        const orderMargin = o.items
            .filter(item => item.status !== 'Отказ')
            .reduce((itemMarginAcc, item) => itemMarginAcc + (item.markup || 0), 0);
        return marginAcc + orderMargin;
    }, 0);

    const orderCount = validOrders.length;
    
    let lastOrderDays: number | null = null;
    let daysToNextOrder: number | null = null;

    if (orderCount > 0) {
      const lastOrder = validOrders.sort((a, b) => b.createdAt.toDate().getTime() - a.createdAt.toDate().getTime())[0];
      if (lastOrder) {
        lastOrderDays = differenceInDays(new Date(), lastOrder.createdAt.toDate());
        daysToNextOrder = 90 - lastOrderDays;
      }
    }

    return {
      count: orderCount,
      total: totalAmount,
      average: orderCount > 0 ? totalAmount / orderCount : 0,
      lastOrderDays: lastOrderDays,
      daysToNextOrder: daysToNextOrder,
      totalMargin: totalMargin,
    };
  }, [clientOrders]);

  const sortedSuppliers = React.useMemo(() => {
    if (!suppliers) return [];
    return [...suppliers].sort((a, b) => a.name.localeCompare(b.name));
  }, [suppliers]);

  const [isEditingClient, setIsEditingClient] = React.useState(false);
  const [comments, setComments] = React.useState('');
  const [carId, setCarId] = React.useState<string | undefined>(undefined);
  const [paymentAmount, setPaymentAmount] = React.useState<number | "">("");
  const [showFinancialDetails, setShowFinancialDetails] = React.useState(false);
  
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
  });
  
  const clientCars = React.useMemo(() => {
    if (!cars || !order?.clientId) return [];
    return cars.filter(car => car.clientId === order.clientId);
  }, [cars, order?.clientId]);

  const { activeItems, rejectedItems } = React.useMemo(() => {
    if (!order?.items) return { activeItems: [], rejectedItems: [] };
    const active: Product[] = [];
    const rejected: Product[] = [];
    order.items.forEach(item => {
      if (item.status === 'Отказ') {
        rejected.push(item);
      } else {
        active.push(item);
      }
    });
    return { activeItems: active, rejectedItems: rejected };
  }, [order?.items]);

  const orderTotal = React.useMemo(() => getOrderTotal(activeItems || []), [activeItems]);

  React.useEffect(() => {
    if (orderData && clients) {
        const client = clients.find(c => c.id === orderData.clientId);
        if (client) {
            const currentTotal = getOrderTotal(orderData.items);
            const amountRemaining = currentTotal - (orderData.amountPaid || 0);

            const fullOrder: CustomerOrder = {
                ...orderData,
                id: orderData.id,
                customer: client,
                total: currentTotal,
                amountRemaining: amountRemaining,
            };
            setOrder(fullOrder);
            setComments(fullOrder.comments || '');
            setCarId(fullOrder.carId);
            form.reset({
              lastName: client.lastName || '',
              firstName: client.firstName || '',
              patronymic: client.patronymic || '',
              email: client.email || '',
              phone: client.phone || '',
            });
        }
    }
  }, [orderData, clients, form]);

  const handleClientUpdate = (data: ClientFormValues) => {
    if (!firestore || !order) return;
    const clientRef = doc(firestore, "clients", order.customer.id);
    
    const updateData: Partial<ClientFormValues> = {};
    (Object.keys(data) as Array<keyof ClientFormValues>).forEach(key => {
        updateData[key] = data[key] || "";
    });

    updateDocumentNonBlocking(clientRef, updateData);
    toast({ variant: "success", title: "Клиент обновлен" });
    
    const updatedCustomer = { ...order.customer, ...updateData };
    const updatedOrder = { ...order, customer: updatedCustomer as Customer };
    setOrder(updatedOrder);

    setIsEditingClient(false);
  };
  
  const handleProductAdd = (newProduct: ProductFormValues) => {
    const cleanProduct: Product = cleanUndefined({
        ...newProduct,
        id: crypto.randomUUID(), 
    });

    setOrder(prevOrder => {
      if (!prevOrder) return null;
      const newItems = [...prevOrder.items, cleanProduct];
      return { ...prevOrder, items: newItems };
    });
    toast({ variant: 'warning', title: 'Товар добавлен', description: 'Не забудьте сохранить заказ.' });
  }

  const handleProductUpdate = (updatedProduct: ProductFormValues) => {
      if (!order) return;
      const newItems = order.items.map(item => item.id === updatedProduct.id ? { ...item, ...cleanUndefined(updatedProduct) } : item);
      setOrder(prevOrder => {
          if (!prevOrder) return null;
          return { ...prevOrder, items: newItems };
      });
      toast({ variant: 'warning', title: 'Товар обновлен', description: 'Не забудьте сохранить заказ.' });
  }

  const handleProductReject = (productId: string) => {
    handleProductStatusChange(productId, 'Отказ');
    toast({ variant: 'warning', title: 'Позиция отменена', description: 'Товар перемещен в отказные. Не забудьте сохранить изменения.' });
  };
  
  const handleProductRestore = (productId: string) => {
    // We assume 'Создан' (Created) is the default status to restore to.
    const createdStatus = itemStatuses?.find(s => s.name === "Создан");
    const defaultStatus = createdStatus ? createdStatus.name : itemStatuses?.[0]?.name || "";
    handleProductStatusChange(productId, defaultStatus);
    toast({ variant: 'success', title: 'Позиция восстановлена', description: 'Товар возвращен в заказ. Не забудьте сохранить изменения.' });
  };


  const handleProductStatusChange = (productId: string, newStatusName: string) => {
      if (!order) return;
      const newItems = order.items.map(item => item.id === productId ? { ...item, status: newStatusName } : item);
      setOrder(prevOrder => {
          if (!prevOrder) return null;
          return { ...prevOrder, items: newItems };
      });
  };

  const handleProductFieldChange = (productId: string, field: keyof Product, value: number | string | null) => {
    if (!order) return;
  
    const newItems = order.items.map(item => {
      if (item.id === productId) {
        const newItem = { ...item, [field]: value };
        
        let price = newItem.price || 0;
        let quantity = newItem.quantity || 1;
        let purchase = newItem.purchase || 0;
        let markup = newItem.markup || 0;

        if (field === 'price' || field === 'quantity' || field === 'purchase') {
            price = (field === 'price' ? Number(value) : newItem.price) || 0;
            quantity = (field === 'quantity' ? Number(value) : newItem.quantity) || 1;
            purchase = (field === 'purchase' ? Number(value) : newItem.purchase) || 0;

            newItem.total = price * quantity;
            newItem.markup = (price - purchase) * quantity;
        } else if (field === 'markup') {
            markup = Number(value) || 0;
            if (quantity > 0) {
              price = (markup / quantity) + purchase;
            } else {
              price = purchase;
            }
            newItem.price = price;
            newItem.total = price * quantity;
            newItem.markup = markup;
        }
        
        return newItem;
      }
      return item;
    });
    setOrder(prev => prev ? { ...prev, items: newItems } : null);
  };
  
  const handleProductSupplierChange = (productId: string, supplierName: string) => {
    if (!order) return;
    const newItems = order.items.map(item => item.id === productId ? { ...item, supplier: supplierName === "no_supplier" ? null : supplierName } : item);
    setOrder(prev => prev ? { ...prev, items: newItems } : null);
  };


  const handleSaveOrder = () => {
    if (!orderRef || !order) return;

    const newTotal = getOrderTotal(order.items);
    const newAmountRemaining = newTotal - (order.amountPaid || 0);

    const dataToUpdate: Partial<Omit<CustomerOrder, 'id' | 'customer' | 'orderNumber'>> = {
        comments: comments,
        items: order.items,
        total: newTotal,
        itemCount: activeItems.reduce((acc, item) => acc + Number(item.quantity), 0),
        status: order.status,
        carId: carId,
        channel: order.channel,
        clientId: order.clientId,
        amountPaid: order.amountPaid,
        amountRemaining: newAmountRemaining,
        paymentHistory: order.paymentHistory || [],
        active: order.active ?? true,
    };
    
    const cleanedData = cleanUndefined(dataToUpdate);

    updateDocumentNonBlocking(orderRef, cleanedData);

    toast({
        variant: 'success',
        title: "Заказ сохранен",
        description: "Данные заказа были успешно обновлены.",
    });
  }

  const handleArchiveOrder = () => {
    if (!orderRef) return;
    updateDocumentNonBlocking(orderRef, { active: false });
    toast({ variant: "info", title: "Заказ архивирован" });
    router.push("/");
  };
  
  const handleRestoreOrder = () => {
    if (!orderRef) return;
    updateDocumentNonBlocking(orderRef, { active: true });
    toast({ variant: "success", title: "Заказ восстановлен" });
    setOrder(prev => prev ? { ...prev, active: true } : null);
  };
  
  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setValue('phone', formatted, { shouldValidate: true });
  }

  const handleCarAdded = (newCarId: string) => {
      setCarId(newCarId);
  }

 const processPayment = (paymentValue: number) => {
    if (!firestore || !order || paymentValue <= 0 || !paymentMethodId) {
      toast({ variant: "destructive", title: "Ошибка", description: "Выберите способ оплаты." });
      return;
    }
    
    const newAmountPaid = (order.amountPaid || 0) + paymentValue;
    const newAmountRemaining = orderTotal - newAmountPaid;

    const newPayment: Payment = {
        amount: paymentValue,
        date: Timestamp.now(),
    };

    const newPaymentHistory = [...(order.paymentHistory || []), newPayment];

    let newOrderStatus: string;
    let newOrderStatusAmount: number | null = null;
    
    if (newAmountRemaining <= 0) {
        newOrderStatus = "Оплачено";
        if(newAmountRemaining < 0) {
          newOrderStatus = "Переплата";
          newOrderStatusAmount = Math.abs(newAmountRemaining);
        }
    } else {
        newOrderStatus = "ДОЛГ";
        newOrderStatusAmount = newAmountRemaining;
    }
    
    const orderUpdate: Partial<Omit<CustomerOrder, 'customer'>> = {
        amountPaid: newAmountPaid,
        amountRemaining: newAmountRemaining,
        status: newOrderStatus,
        statusAmount: newOrderStatusAmount,
        paymentHistory: newPaymentHistory,
    };

    updateDocumentNonBlocking(orderRef, orderUpdate);

    const salesCategory = categories?.find(c => c.name === 'Продажи' && c.type === 'income');

    if (salesCategory && paymentMethodId) {
        const transactionsCollection = collection(firestore, "transactions");
        addDocumentNonBlocking(transactionsCollection, {
            date: newPayment.date,
            description: `Оплата по заказу №${order.orderNumber}`,
            amount: newPayment.amount,
            type: 'income',
            categoryId: salesCategory.id,
            paymentMethodId: paymentMethodId,
            orderId: order.id,
            clientId: order.clientId,
        });
    }

    // Update local state immediately for UI responsiveness
    setOrder(prevOrder => {
      if (!prevOrder) return null;
      const updatedOrder = {
        ...prevOrder,
        ...orderUpdate,
        total: orderTotal, // Recalculate total just in case
      };
      // Manually update derived amountRemaining for the local state
      (updatedOrder as any).amountRemaining = newAmountRemaining;
      return updatedOrder;
    });


    toast({
      variant: 'success',
      title: "Оплата принята",
      description: `Сумма ${paymentValue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })} принята.`,
    });

    setPaymentAmount("");
  };

  const handleAcceptPayment = () => {
    if (paymentAmount === "" || Number(paymentAmount) <= 0) {
      toast({ variant: "destructive", title: "Ошибка", description: "Введите корректную сумму." });
      return;
    }
    processPayment(Number(paymentAmount));
  };
  
  const handlePayFromBalance = () => {
      if (!order) return;
      const availableBalance = Math.min(Math.max(0, -clientBalance), Math.max(0, order.amountRemaining || 0));


      if (availableBalance > 0) {
          processPayment(availableBalance);
          toast({
            variant: 'success',
            title: "Оплата с баланса",
            description: `Сумма ${availableBalance.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })} списана с баланса клиента.`,
          });
      } else {
          toast({ variant: "destructive", title: "Ошибка", description: "Нет средств на балансе или заказ уже оплачен." });
      }
  };


  const handleDeletePayment = async (paymentToDelete: Payment) => {
    if (!firestore || !order) return;

    const newPaymentHistory = (order.paymentHistory || []).filter(
      p => !(p.date.isEqual(paymentToDelete.date) && p.amount === paymentToDelete.amount)
    );
    
    const currentPaidAmount = order.amountPaid || 0;
    const newAmountPaid = currentPaidAmount - paymentToDelete.amount;
    const newAmountRemaining = orderTotal - newAmountPaid;
    
    let newOrderStatus: string;
    let newOrderStatusAmount: number | null = null;
    
    if (newAmountRemaining <= 0) {
        newOrderStatus = "Оплачено";
        if(newAmountRemaining < 0) {
          newOrderStatus = "Переплата";
          newOrderStatusAmount = Math.abs(newAmountRemaining);
        }
    } else {
        newOrderStatus = "ДОЛГ";
        newOrderStatusAmount = newAmountRemaining;
    }

    const orderUpdate = {
        amountPaid: newAmountPaid,
        amountRemaining: newAmountRemaining,
        paymentHistory: newPaymentHistory,
        status: newOrderStatus,
        statusAmount: newOrderStatusAmount,
    };

    updateDocumentNonBlocking(orderRef, orderUpdate);

    // Find and delete the corresponding transaction
    const q = query(
      collection(firestore, "transactions"), 
      where("orderId", "==", order.id),
      where("date", "==", paymentToDelete.date),
      where("amount", "==", paymentToDelete.amount)
    );

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
      deleteDoc(doc.ref);
    });

    setOrder(prevOrder => {
        if (!prevOrder) return null;
        return {
            ...prevOrder,
            ...orderUpdate,
        }
    });

    toast({
      variant: "info",
      title: "Платеж удален",
      description: `Платеж на сумму ${paymentToDelete.amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })} был удален.`,
    });
};


  const getCarDisplayName = (car: Car | undefined) => {
    if (!car) return "";
    return `${car.make} ${car.model} (${car.year || 'N/A'})`.trim();
  }

  const getClientDisplayName = (client: Customer | undefined) => {
    if (!client) return "";
    return `${client.lastName} ${client.firstName} ${client.patronymic || ''}`.trim();
  }
  
  const getStatusVariant = (status: string | undefined): 'success' | 'danger' | 'info' | 'warning' | 'default' | 'secondary' | 'destructive' | 'outline' | null | undefined => {
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


  const isLoading = isUserLoadingAuth || isOrderLoading || areClientsLoading || areOrderStatusesLoading || areItemStatusesLoading || areCarsLoading || areSuppliersLoading || areClientOrdersLoading || areCategoriesLoading || arePaymentMethodsLoading || areWarehouseCellsLoading || areProductCategoriesLoading;

  const availableBalanceForPayment = React.useMemo(() => {
    if (!order) return 0;
    return Math.min(Math.max(0, clientBalance), Math.max(0, order.amountRemaining || 0));
  }, [clientBalance, order]);


  const canPayFromBalance = availableBalanceForPayment > 0;

  const plannedDeliveryDate = React.useMemo(() => {
    if (!order?.createdAt) return null;
    const maxTerm = activeItems.reduce((max, item) => Math.max(max, item.term || 0), 0);
    if (maxTerm === 0) return null;
    return addDays(order.createdAt.toDate(), maxTerm);
  }, [order, activeItems]);

  const supplierSummary = React.useMemo(() => {
    if (!order || !suppliers || !order.items) return [];
  
    const itemsBySupplier = activeItems
      .filter(item => item.supplier)
      .reduce((acc, item) => {
        if (item.supplier) {
          if (!acc[item.supplier]) {
            acc[item.supplier] = { total: 0, items: [] };
          }
          acc[item.supplier].total += item.total;
          acc[item.supplier].items.push(item);
        }
        return acc;
      }, {} as Record<string, { total: number; items: Product[] }>);
  
    return Object.entries(itemsBySupplier).map(([supplierName, data]) => {
      const supplierInfo = suppliers.find(s => s.name === supplierName);
      const minAmount = supplierInfo?.minOrderAmount || 0;
      const difference = minAmount - data.total;
  
      return {
        supplierName,
        currentAmount: data.total,
        minAmount,
        difference: difference > 0 ? difference : 0,
      };
    });
  }, [order, suppliers, activeItems]);

  const groupedItems = React.useMemo(() => {
    if (!activeItems) return {};
    return activeItems.reduce((acc, item) => {
      const supplierName = item.supplier || 'Без поставщика';
      if (!acc[supplierName]) {
        acc[supplierName] = [];
      }
      acc[supplierName].push(item);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [activeItems]);

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Sign out error", error);
      toast({
        variant: "destructive",
        title: "Ошибка!",
        description: "Не удалось выйти из системы.",
      });
    }
  };

  if (isLoading || !order || !user) {
    return (
      <div className="flex min-h-screen w-full flex-col bg-muted/40 p-4 gap-4">
        <Skeleton className="h-10 w-1/2" />
        <div className="grid gap-4 md:grid-cols-3 lg:gap-8">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totals = activeItems.reduce((acc, item) => {
    acc.total += item.total;
    const purchase = item.purchase || 0;
    const quantity = item.quantity || 0;
    const totalPurchase = purchase * quantity;
    const markup = item.total - totalPurchase;

    acc.purchase += totalPurchase;
    acc.markup += markup;
    return acc;
  }, { total: 0, purchase: 0, markup: 0 });

  const totalMarkupPercentage = totals.purchase > 0 ? ((totals.markup / totals.purchase) * 100).toFixed(0) : 0;
  
  const getItemStatus = (statusName: string) => {
      return itemStatuses?.find(s => s.name === statusName);
  }
  
  const currentOrderStatusDef = orderStatuses?.find(s => s.name === order.status);

  const getDuplicateOrderUrl = () => {
    if (!order) return "/orders/new";
    const duplicateData = {
      clientId: order.clientId,
      carId: order.carId,
      comments: order.comments,
      items: order.items.map(({ id, ...rest }) => rest), // Remove original item IDs
    };
    return `/orders/new?duplicate=${encodeURIComponent(JSON.stringify(duplicateData))}`;
  };
  
  const handlePrintClick = (docType: "receipt" | "receipt_no_article" | "acceptance_sheet") => {
    const url = `/documents/print?orderId=${order.id}&docType=${docType}`;
    const printWindow = window.open(url, '_blank');
    if (printWindow) {
        printWindow.focus();
    }
  };


  return (
    <AppLayout pageTitle={`Заказ #${order.orderNumber}`}>
        <main className="grid flex-1 items-start gap-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid w-full flex-1 auto-rows-max gap-4 py-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
               <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Клиент</CardTitle>
                     {!isEditingClient && (
                        <Button variant="default" size="sm" onClick={() => { setIsEditingClient(true); form.reset(order.customer); }}>
                            <Pencil className="h-4 w-4 mr-2"/>
                            Редактировать
                        </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    {isEditingClient ? (
                       <Form {...form}>
                          <form onSubmit={form.handleSubmit(handleClientUpdate)} className="space-y-4">
                             <FormField
                                control={form.control}
                                name="lastName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Фамилия</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={form.control}
                                name="firstName"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Имя</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={form.control}
                                name="patronymic"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Отчество</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                                <FormField
                                control={form.control}
                                name="email"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl><Input {...field} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                               <FormField
                                control={form.control}
                                name="phone"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Телефон</FormLabel>
                                    <FormControl><Input {...field} onChange={handlePhoneInputChange} /></FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="ghost" onClick={() => setIsEditingClient(false)}>Отмена</Button>
                                <Button type="submit">Сохранить</Button>
                              </div>
                          </form>
                       </Form>
                    ) : (
                    <>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn("w-full justify-between", !order.clientId && "text-muted-foreground")}
                                >
                                    {order.clientId
                                        ? getClientDisplayName(clients?.find(client => client.id === order.clientId))
                                        : "Выберите клиента"
                                    }
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
                                                    onSelect={() => {
                                                        const newClient = clients?.find(c => c.id === client.id);
                                                        if (newClient && order) {
                                                            setOrder({ ...order, customer: newClient, clientId: newClient.id });
                                                        }
                                                    }}
                                                >
                                                    <Check className={cn("mr-2 h-4 w-4", client.id === order.clientId ? "opacity-100" : "opacity-0")} />
                                                    {getClientDisplayName(client)}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                        <div className="mt-4 space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Фамилия</span>
                            <span>{order.customer.lastName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Имя</span>
                            <span>{order.customer.firstName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Отчество</span>
                            <span>{order.customer.patronymic || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Email</span>
                            <span>{order.customer.email || '-'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Телефон</span>
                            <span>{order.customer.phone || '-'}</span>
                          </div>
                        </div>
                    </>
                    )}
                  </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Автомобиль</CardTitle>
                    </CardHeader>
                    <CardContent>
                         <div className="flex items-start gap-4">
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                    variant="outline"
                                    role="combobox"
                                    className={cn("w-full justify-between", !carId && "text-muted-foreground")}
                                    >
                                    {carId ? getCarDisplayName(clientCars?.find(car => car.id === carId)) : "Выберите автомобиль"}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
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
                                            onSelect={() => setCarId(car.id)}
                                            >
                                            <Check className={cn("mr-2 h-4 w-4", car.id === carId ? "opacity-100" : "opacity-0")} />
                                            {getCarDisplayName(car)}
                                            </CommandItem>
                                        ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                                </PopoverContent>
                            </Popover>
                            <CarDialog clientId={order.clientId} onCarAdded={handleCarAdded}>
                                <Button size="icon" variant="outline">
                                    <PlusCircle className="h-4 w-4" />
                                    <span className="sr-only">Добавить новый автомобиль</span>
                                </Button>
                            </CarDialog>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5"/>Финансы по заказу</CardTitle>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowFinancialDetails(!showFinancialDetails)}>
                            {showFinancialDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Итого</span>
                            <span className="font-medium">{orderTotal.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Внесено</span>
                            <span className="font-medium text-green-600">{(order.amountPaid || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Осталось</span>
                            <span className="font-medium text-red-600">{(order.amountRemaining || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                        </div>
                        {showFinancialDetails && (
                            <>
                                <Separator />
                                <div className="flex justify-between pt-2">
                                    <span className="text-muted-foreground">Себестоимость</span>
                                    <span className="font-medium">{totals.purchase.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Наценка</span>
                                    <span className="font-medium">{totals.markup.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                                </div>
                                <div className="flex justify-between font-bold text-base">
                                    <span className="text-muted-foreground">Рентабельность</span>
                                    <span>{totalMarkupPercentage}%</span>
                                </div>
                                <Separator />
                                <div className="pt-2">
                                  <h4 className="font-medium mb-2">История платежей</h4>
                                  {(order.paymentHistory && order.paymentHistory.length > 0) ? (
                                    <div className="space-y-1">
                                      {order.paymentHistory.map((payment, index) => (
                                        <div key={index} className="flex justify-between items-center">
                                          <div className="flex items-center gap-2">
                                            <span>{format(payment.date.toDate(), 'dd.MM.yyyy HH:mm')}</span>
                                            <span className="font-medium text-green-600">+{payment.amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                                          </div>
                                           <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/70 hover:text-destructive">
                                                        <Trash2 className="w-3.5 h-3.5"/>
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Вы уверены?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Это действие необратимо. Платеж на сумму {payment.amount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })} будет удален.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => handleDeletePayment(payment)}>
                                                            Удалить
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-muted-foreground">Платежей еще не было.</p>
                                  )}
                                </div>
                            </>
                        )}
                    </CardContent>
                    <CardFooter className="flex-col items-stretch gap-2 pt-4">
                        <div className="flex gap-2">
                             <Input 
                                type="number" 
                                placeholder="Сумма" 
                                className="flex-1"
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value === '' ? '' : e.target.valueAsNumber)}
                             />
                              <Select value={paymentMethodId} onValueChange={setPaymentMethodId}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="Способ оплаты" />
                                </SelectTrigger>
                                <SelectContent>
                                    {paymentMethods?.map(method => (
                                        <SelectItem key={method.id} value={method.id}>{method.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                         <div className="flex gap-2">
                            <Button onClick={handleAcceptPayment} className="flex-1">Принять оплату</Button>
                        </div>
                        <div className="flex gap-2 items-center">
                            <div className="flex-1 text-sm p-2 rounded-md border bg-secondary/80 text-muted-foreground">
                                Доступно с баланса: {availableBalanceForPayment.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                            </div>
                            <Button onClick={handlePayFromBalance} variant="secondary" disabled={!canPayFromBalance}>Оплатить с баланса</Button>
                        </div>
                    </CardFooter>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Статистика по клиенту</CardTitle>
                    </CardHeader>
                     <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between font-bold">
                           <span className="text-muted-foreground">Общий баланс</span>
                           <span className={cn(clientBalance > 0 ? 'text-green-600' : clientBalance < 0 ? 'text-red-600' : '')}>
                              {clientBalance.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                           </span>
                       </div>
                        <Separator />
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Всего заказов</span>
                            <span className="font-medium">{clientStats.count}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Общая сумма</span>
                            <span className="font-medium">{clientStats.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Средний чек</span>
                            <span className="font-medium">{clientStats.average.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                        </div>
                        {showFinancialDetails && (
                             <div className="flex justify-between">
                                <span className="text-muted-foreground">Общая маржа</span>
                                <span className="font-medium">{clientStats.totalMargin.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                            </div>
                        )}
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Последний заказ</span>
                            <span className="font-medium">
                                {clientStats.lastOrderDays !== null 
                                    ? `${clientStats.lastOrderDays} дней назад`
                                    : 'N/A'
                                }
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">
                                {clientStats.daysToNextOrder !== null && clientStats.daysToNextOrder > 0 ? "До след. заказа" : "Прошло с заказа"}
                            </span>
                            <span className={cn("font-medium", clientStats.daysToNextOrder !== null && (clientStats.daysToNextOrder > 0 ? 'text-green-600' : 'text-red-600'))}>
                                {clientStats.daysToNextOrder !== null 
                                    ? `${Math.abs(clientStats.daysToNextOrder)} дней`
                                    : 'N/A'
                                }
                            </span>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                 <Card>
                    <CardHeader>
                        <CardTitle>Детали заказа</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 text-sm">
                       <div className="flex justify-between">
                           <span className="text-muted-foreground">Статус заказа</span>
                           <Badge variant={getStatusVariant(order.status)} className="font-semibold" style={{ backgroundColor: currentOrderStatusDef?.color }}>
                                {order.status}
                                {order.statusAmount ? `: ${order.statusAmount.toLocaleString('ru-RU', {maximumFractionDigits: 0})}` : ''}
                            </Badge>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-muted-foreground">Количество позиций</span>
                            <span className="font-medium">
                                {order.itemCount}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Ожидаемая дата</span>
                            <span className="font-medium">
                                {plannedDeliveryDate ? format(plannedDeliveryDate, 'dd.MM.yyyy') : 'не указан'}
                            </span>
                        </div>
                         <div className="flex justify-between items-center">
                            <span className="text-muted-foreground">Канал продаж</span>
                            <div className="w-[150px]">
                                <Select 
                                    value={order.channel} 
                                    onValueChange={(value: 'Сайт' | 'Витрина') => {
                                        setOrder(prev => prev ? {...prev, channel: value} : null)
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Выберите канал" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Сайт">Сайт</SelectItem>
                                        <SelectItem value="Витрина">Витрина</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle>Сводка по поставщикам</CardTitle>
                        <CardDescription>Информация о суммах заказа у каждого поставщика.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        {supplierSummary.length > 0 ? supplierSummary.map(summary => (
                            <div key={summary.supplierName} className="flex justify-between items-center">
                                <div>
                                    <span className="font-medium">{summary.supplierName}</span>
                                    <div className="text-muted-foreground">
                                        Заказано на: {summary.currentAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                    </div>
                                </div>
                                {summary.difference > 0 && (
                                    <TooltipProvider>
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                 <div className="flex items-center gap-1 text-amber-600">
                                                    <AlertTriangle className="h-4 w-4" />
                                                    <span className="font-semibold">
                                                        - {summary.difference.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                                                    </span>
                                                </div>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                                <p>До минимального заказа ({summary.minAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}) не хватает {summary.difference.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </TooltipProvider>
                                )}
                            </div>
                        )) : (
                            <p className="text-muted-foreground text-center py-4">Нет товаров с указанными поставщиками.</p>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Товары</CardTitle>
                     <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowFinancialDetails(!showFinancialDetails)}>
                        {showFinancialDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Производитель</TableHead>
                                <TableHead>Артикул</TableHead>
                                <TableHead>Наименование</TableHead>
                                <TableHead>Поставщик</TableHead>
                                <TableHead>Ячейка</TableHead>
                                <TableHead>Цена</TableHead>
                                <TableHead>Кол-во</TableHead>
                                {showFinancialDetails && (
                                    <>
                                        <TableHead>Закупка</TableHead>
                                        <TableHead>Наценка</TableHead>
                                    </>
                                )}
                                <TableHead>Срок</TableHead>
                                <TableHead>Статус</TableHead>
                                <TableHead>Итого</TableHead>
                                <TableHead>Действия</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {Object.entries(groupedItems).map(([supplierName, items]) => (
                                <React.Fragment key={supplierName}>
                                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                                        <TableCell colSpan={showFinancialDetails ? 12 : 10} className="font-semibold py-2 px-7">
                                            {supplierName}
                                        </TableCell>
                                    </TableRow>
                                    {items.map((item) => {
                                        const itemStatus = getItemStatus(item.status);
                                        return (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.manufacturer}</TableCell>
                                            <TableCell className="font-medium">{item.article}</TableCell>
                                            <TableCell className="font-medium">{item.name}</TableCell>
                                            <TableCell>
                                            <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            role="combobox"
                                                            className={cn("w-[150px] justify-between border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-accent focus:bg-white", !item.supplier && "text-muted-foreground")}
                                                        >
                                                            {item.supplier || "Выбрать"}
                                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                                                        <Command>
                                                            <CommandInput placeholder="Поиск..." />
                                                            <CommandList>
                                                                <CommandEmpty>Не найдено.</CommandEmpty>
                                                                <CommandGroup>
                                                                    <CommandItem onSelect={() => handleProductSupplierChange(item.id, "no_supplier")}>Нет</CommandItem>
                                                                    {sortedSuppliers.map((supplier) => (
                                                                        <CommandItem
                                                                            value={supplier.name}
                                                                            key={supplier.id}
                                                                            onSelect={() => handleProductSupplierChange(item.id, supplier.name)}
                                                                        >
                                                                            <Check className={cn("mr-2 h-4 w-4", supplier.name === item.supplier ? "opacity-100" : "opacity-0")} />
                                                                            {supplier.name}
                                                                        </CommandItem>
                                                                    ))}
                                                                </CommandGroup>
                                                            </CommandList>
                                                        </Command>
                                                    </PopoverContent>
                                                </Popover>
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    value={item.warehouseCell ?? ''}
                                                    onChange={(e) => handleProductFieldChange(item.id, 'warehouseCell', e.target.value)}
                                                    className="w-24 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white focus:border-b"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.price ?? ''}
                                                    onChange={(e) => handleProductFieldChange(item.id, 'price', e.target.value === '' ? null : e.target.valueAsNumber)}
                                                    className="w-20 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white focus:border-b"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.quantity ?? ''}
                                                    onChange={(e) => handleProductFieldChange(item.id, 'quantity', e.target.value === '' ? null : e.target.valueAsNumber)}
                                                    className="w-16 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white focus:border-b"
                                                />
                                            </TableCell>
                                            {showFinancialDetails && (
                                                <>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={item.purchase ?? ''}
                                                            onChange={(e) => handleProductFieldChange(item.id, 'purchase', e.target.value === '' ? null : e.target.valueAsNumber)}
                                                            className="w-24 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white focus:border-b"
                                                        />
                                                    </TableCell>
                                                     <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={item.markup ?? ''}
                                                            onChange={(e) => handleProductFieldChange(item.id, 'markup', e.target.value === '' ? null : e.target.valueAsNumber)}
                                                            className="w-24 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white focus:border-b"
                                                        />
                                                    </TableCell>
                                                </>
                                            )}
                                            <TableCell>
                                                <Input
                                                    type="number"
                                                    value={item.term ?? ''}
                                                    onChange={(e) => handleProductFieldChange(item.id, 'term', e.target.value === '' ? null : e.target.valueAsNumber)}
                                                    className="w-16 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 focus:bg-white focus:border-b"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Select value={item.status} onValueChange={(value) => handleProductStatusChange(item.id, value)}>
                                                    <SelectTrigger className="w-auto h-auto p-0 border-none bg-transparent focus:ring-0 focus:ring-offset-0 focus:bg-white">
                                                        <SelectValue asChild>
                                                            <Badge 
                                                                className='cursor-pointer text-muted-foreground'
                                                                style={{ backgroundColor: itemStatus?.color }}
                                                            >
                                                                {item.status}
                                                            </Badge>
                                                        </SelectValue>
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {itemStatuses?.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </TableCell>
                                            <TableCell>{item.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                     <ProductDialog
                                                        mode="edit"
                                                        product={{...item}}
                                                        itemStatuses={itemStatuses || []}
                                                        suppliers={suppliers || []}
                                                        warehouseCells={warehouseCells || []}
                                                        productCategories={productCategories || []}
                                                        onSave={(product) => handleProductUpdate({...product})}
                                                    >
                                                        <Button variant="ghost" size="icon" className="w-6 h-6"><Pencil className="w-3.5 h-3.5"/></Button>
                                                    </ProductDialog>
                                                    <AlertDialog>
                                                        <AlertDialogTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="w-6 h-6 text-destructive/70 hover:text-destructive">
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </AlertDialogTrigger>
                                                        <AlertDialogContent>
                                                            <AlertDialogHeader>
                                                                <AlertDialogTitle>Отменить позицию?</AlertDialogTitle>
                                                                <AlertDialogDescription>
                                                                    Товар "{item.name}" получит статус "Отказ" и будет перемещен в конец страницы. Вы сможете восстановить его в любой момент.
                                                                </AlertDialogDescription>
                                                            </AlertDialogHeader>
                                                            <AlertDialogFooter>
                                                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                                                <AlertDialogAction onClick={() => handleProductReject(item.id)}>Подтвердить</AlertDialogAction>
                                                            </AlertDialogFooter>
                                                        </AlertDialogContent>
                                                    </AlertDialog>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                        )})}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
                <Card>
                    <CardContent className="p-4">
                        <div className="flex w-full justify-between items-center">
                            <div className="flex flex-wrap gap-x-6 gap-y-2 items-center">
                                <div className="flex items-center gap-2 text-sm">
                                    <span className="text-muted-foreground">Итого:</span>
                                    <span className="font-bold text-base">{totals.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                                </div>
                                {showFinancialDetails && (
                                    <>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-muted-foreground">Закупка:</span>
                                            <span className="font-bold">{totals.purchase.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm">
                                            <span className="text-muted-foreground">Наценка:</span>
                                            <span className="font-bold">{totals.markup.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })} ({totalMarkupPercentage}%)</span>
                                        </div>
                                    </>
                                )}
                            </div>
                             <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowFinancialDetails(!showFinancialDetails)}>
                                {showFinancialDetails ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </Card>

            <Card>
                <CardContent className="flex flex-wrap items-center gap-2 p-4">
                     <ProductDialog
                        mode="add"
                        itemStatuses={itemStatuses || []}
                        suppliers={suppliers || []}
                        warehouseCells={warehouseCells || []}
                        productCategories={productCategories || []}
                        onSave={handleProductAdd}
                    >
                        <Button type="button">
                            <PlusCircle className="h-4 w-4 mr-2"/>
                            Добавить товар
                        </Button>
                    </ProductDialog>
                    <Button variant="outline" asChild>
                        <Link href={getDuplicateOrderUrl()}><Copy className="h-4 w-4 mr-2"/>Дублировать</Link>
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          <ReceiptText className="h-4 w-4 mr-2" />
                          Печать
                          <ChevronDown className="h-4 w-4 ml-2"/>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handlePrintClick("receipt")}>
                          Товарный чек
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintClick("receipt_no_article")}>
                          Чек без артикула
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handlePrintClick("acceptance_sheet")}>
                          Приемный лист
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    {order.active !== false ? (
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" className="ml-auto">
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Архивировать заказ
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Вы уверены, что хотите архивировать заказ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Заказ #{order.orderNumber} будет скрыт из основного списка, но его можно будет найти в архиве.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleArchiveOrder}>Архивировать</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    ) : (
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <Button variant="outline" className="text-green-600 hover:text-green-700 border-green-600/50 hover:bg-green-600/10 ml-auto">
                                  <ArchiveRestore className="h-4 w-4 mr-2" />
                                  Восстановить заказ
                              </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Восстановить заказ?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                      Заказ #{order.orderNumber} будет восстановлен и снова появится в основном списке заказов.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Отмена</AlertDialogCancel>
                                  <AlertDialogAction onClick={handleRestoreOrder}>Восстановить</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    )}
                </CardContent>
            </Card>

             {rejectedItems.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Отмененные позиции</CardTitle>
                  <CardDescription>
                    Эти товары были удалены из заказа, но их можно восстановить.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Наименование</TableHead>
                        <TableHead>Артикул</TableHead>
                        <TableHead>Цена</TableHead>
                        <TableHead>Кол-во</TableHead>
                        <TableHead className="text-right">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rejectedItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.name}</TableCell>
                          <TableCell>{item.article}</TableCell>
                          <TableCell>{item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                          <TableCell>{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleProductRestore(item.id)}
                            >
                              <Undo className="h-4 w-4 mr-2" />
                              Восстановить
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <div className="flex items-center justify-center gap-2 md:hidden">
              <Button variant="outline" size="sm" onClick={() => router.back()}>
                Отменить
              </Button>
              <Button size="sm" onClick={handleSaveOrder}>Сохранить</Button>
            </div>
          </div>
        </main>
    </AppLayout>
  );
}
