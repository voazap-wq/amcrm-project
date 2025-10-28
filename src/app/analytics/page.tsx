
"use client";

import * as React from "react";
import Link from "next/link";
import { Sliders, LogOut, ChevronsUpDown, Car, Users, ShoppingCart, Package, Truck, ReceiptText, BarChart, DollarSign, Receipt, ArrowUpRight, ArrowDownLeft, Banknote, CreditCard, Scale, Trophy, TrendingUp, CalendarDays, ClipboardCheck } from "lucide-react";
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { signOut } from "firebase/auth";
import { collection, Timestamp } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarTrigger } from "@/components/ui/sidebar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { sidebarNav } from "@/app/page";
import { cn } from "@/lib/utils";
import type { CustomerOrder, Transaction, TransactionCategory, PaymentMethod, Payment, Product, Customer } from "@/lib/types";
import { differenceInCalendarDays } from "date-fns";
import { AppLayout } from "@/app/components/app-layout";

export default function AnalyticsPage() {
  const firestore = useFirestore();

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<Omit<CustomerOrder, 'customer'>>(ordersRef);

  const clientsRef = useMemoFirebase(() => (firestore ? collection(firestore, 'clients') : null), [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const manualTransactionsRef = useMemoFirebase(() => firestore ? collection(firestore, "transactions") : null, [firestore]);
  const { data: manualTransactions, isLoading: areManualTransactionsLoading } = useCollection<Transaction>(manualTransactionsRef);
  
  const categoriesRef = useMemoFirebase(() => firestore ? collection(firestore, 'transactionCategories') : null, [firestore]);
  const { data: categories, isLoading: areCategoriesLoading } = useCollection<TransactionCategory>(categoriesRef);

  const paymentMethodsRef = useMemoFirebase(() => firestore ? collection(firestore, 'paymentMethods') : null, [firestore]);
  const { data: paymentMethods, isLoading: arePaymentMethodsLoading } = useCollection<PaymentMethod>(paymentMethodsRef);

  const isLoading = areOrdersLoading || areManualTransactionsLoading || areCategoriesLoading || arePaymentMethodsLoading || areClientsLoading;

  const balances = React.useMemo(() => {
    if (!paymentMethods || (!manualTransactions && !orders)) return {};

    const balanceMap: Record<string, number> = {};
    const cashMethod = paymentMethods.find(pm => pm.name === 'Наличные');
    
    paymentMethods.forEach(pm => balanceMap[pm.name] = 0);
    
    // Process manual transactions
    (manualTransactions || []).forEach(transaction => {
        const method = paymentMethods.find(pm => pm.id === transaction.paymentMethodId);
        if (method) {
            balanceMap[method.name] = (balanceMap[method.name] || 0) + transaction.amount;
        } else if (cashMethod) {
            // Default to cash if method not found
            balanceMap[cashMethod.name] = (balanceMap[cashMethod.name] || 0) + transaction.amount;
        }
    });

    // Process payments from orders
    (orders || []).forEach(order => {
        (order.paymentHistory || []).forEach(payment => {
            // Assume all order payments are 'Наличные' as per user request
            if (cashMethod) {
                balanceMap[cashMethod.name] = (balanceMap[cashMethod.name] || 0) + payment.amount;
            }
        });
    });
    
    return balanceMap;
  }, [manualTransactions, orders, paymentMethods]);

  const financialMetrics = React.useMemo(() => {
    if (!orders && !manualTransactions) {
      return { revenue: 0, expenses: 0, margin: 0, marginPercentage: 0, returns: 0, netProfit: 0, totalPurchase: 0, siteProfit: 0, siteProfitability: 0, retailProfit: 0, retailProfitability: 0 };
    }
  
    let revenue = 0;
    let manualExpenses = 0;
    let margin = 0;
    let returns = 0;
    let totalPurchase = 0;
    
    let siteProfit = 0;
    let sitePurchase = 0;
    let retailProfit = 0;
    let retailPurchase = 0;
  
    (orders || []).forEach(order => {
      let orderMargin = 0;
      let orderPurchase = 0;

      (order.items || []).forEach(item => {
        const itemPurchase = (item.purchase || 0) * (item.quantity || 0);
        
        if (item.status !== 'Отказ') {
          totalPurchase += itemPurchase;
          revenue += item.total || 0;
          const currentMarkup = (item.markup || 0);
          margin += currentMarkup;
          orderMargin += currentMarkup;
          orderPurchase += itemPurchase;
        }
      });

       if (order.channel === 'Сайт') {
            siteProfit += orderMargin;
            sitePurchase += orderPurchase;
        } else { // 'Витрина' or undefined
            retailProfit += orderMargin;
            retailPurchase += orderPurchase;
        }

      (order.paymentHistory || []).forEach(payment => {
        if (payment.amount < 0) { // Negative payments are refunds/returns
          returns += Math.abs(payment.amount);
        }
      });
    });
  
    (manualTransactions || []).forEach(transaction => {
      if (transaction.type === 'income') {
        revenue += transaction.amount;
      } else if (transaction.type === 'expense') {
        manualExpenses += Math.abs(transaction.amount);
      } else if (transaction.type === 'return') {
        const category = categories?.find(c => c.id === transaction.categoryId);
        if (category?.type === 'income') { // Return from supplier
          revenue += transaction.amount;
        } else { // Return to customer
          returns += Math.abs(transaction.amount);
        }
      }
    });
  
    const totalExpenses = totalPurchase + manualExpenses;
    const netProfit = revenue - totalExpenses - returns;
    const marginPercentage = totalPurchase > 0 ? (margin / totalPurchase) * 100 : 0;
    const siteProfitability = sitePurchase > 0 ? (siteProfit / sitePurchase) * 100 : 0;
    const retailProfitability = retailPurchase > 0 ? (retailProfit / retailPurchase) * 100 : 0;

  
    return { revenue, expenses: totalExpenses, margin, marginPercentage, returns, netProfit, totalPurchase, siteProfit, siteProfitability, retailProfit, retailProfitability };
  }, [orders, manualTransactions, categories]);

  const mostProfitableItem = React.useMemo(() => {
    if (!orders) return null;
    const allItems: Product[] = orders.flatMap(o => o.items || []);
    if (allItems.length === 0) return null;
    return allItems.reduce((max, item) => (item.markup || 0) > (max.markup || 0) ? item : max, allItems[0]);
  }, [orders]);
  
  const mostSoldItem = React.useMemo(() => {
      if (!orders) return null;
      const itemCounts: Record<string, number> = {};
      orders.forEach(order => {
          (order.items || []).forEach(item => {
              if (item.status !== 'Отказ') {
                  const key = `${item.article || ''}-${item.name}`;
                  itemCounts[key] = (itemCounts[key] || 0) + item.quantity;
              }
          });
      });
  
      let mostSoldItemName: string | null = null;
      let maxQuantity = 0;
      for (const itemName in itemCounts) {
          if (itemCounts[itemName] > maxQuantity) {
              maxQuantity = itemCounts[itemName];
              mostSoldItemName = itemName;
          }
      }
      
      const allItems: Product[] = orders.flatMap(o => o.items || []);
      return allItems.find(item => `${item.article || ''}-${item.name}` === mostSoldItemName);
  }, [orders]);
  
  const averageOrdersPerDay = React.useMemo(() => {
    if (!orders || orders.length < 2) {
      return 0;
    }
    const sortedOrders = [...orders].sort((a, b) => a.createdAt.toMillis() - b.createdAt.toMillis());
    const firstOrderDate = sortedOrders[0].createdAt.toDate();
    const lastOrderDate = sortedOrders[sortedOrders.length - 1].createdAt.toDate();
    
    const days = differenceInCalendarDays(lastOrderDate, firstOrderDate) + 1;
    
    if (days <= 0) return orders.length;

    return orders.length / days;
  }, [orders]);

  if (isLoading) {
    return (
        <AppLayout pageTitle="Аналитика">
            <div className="space-y-4">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-64 w-full" />
            </div>
        </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Аналитика">
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-2 text-muted-foreground">Баланс</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Card className={cn("transition-colors", (balances['Наличные'] || 0) < 0 ? "bg-red-100 border-red-200" : "bg-green-100 border-green-200")}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className={cn("text-sm font-medium", (balances['Наличные'] || 0) < 0 ? "text-red-900" : "text-green-900")}>Баланс наличных</CardTitle>
                    <Banknote className={cn("h-4 w-4", (balances['Наличные'] || 0) < 0 ? "text-red-800" : "text-green-800")} />
                </CardHeader>
                <CardContent>
                    <div className={cn("text-2xl font-bold", (balances['Наличные'] || 0) < 0 ? "text-red-900" : "text-green-900")}>
                        {(balances['Наличные'] || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                    </div>
                </CardContent>
              </Card>
              <Card className={cn("transition-colors", (balances['Карта'] || 0) < 0 ? "bg-red-100 border-red-200" : "bg-green-100 border-green-200")}>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className={cn("text-sm font-medium", (balances['Карта'] || 0) < 0 ? "text-red-900" : "text-green-900")}>Баланс по картам</CardTitle>
                      <CreditCard className={cn("h-4 w-4", (balances['Карта'] || 0) < 0 ? "text-red-800" : "text-green-800")} />
                  </CardHeader>
                  <CardContent>
                      <div className={cn("text-2xl font-bold", (balances['Карта'] || 0) < 0 ? "text-red-900" : "text-green-900")}>
                          {(balances['Карта'] || 0).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                      </div>
                  </CardContent>
              </Card>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2 text-muted-foreground">Финансовые показатели</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Link href="/analytics/report?type=income" className="block">
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Выручка</CardTitle>
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{financialMetrics.revenue.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                      </CardContent>
                  </Card>
                </Link>
                <Link href="/analytics/report?type=expense" className="block">
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Расходы</CardTitle>
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold">{financialMetrics.expenses.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                      </CardContent>
                  </Card>
                </Link>
                <Link href="/analytics/report?type=return" className="block">
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Возвраты</CardTitle>
                          <ArrowDownLeft className="h-4 w-4 text-red-500" />
                      </CardHeader>
                      <CardContent>
                          <div className="text-2xl font-bold text-red-600">{financialMetrics.returns.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                      </CardContent>
                  </Card>
                </Link>
                 <Link href="/analytics/report?type=all" className="block">
                    <Card className={cn("transition-colors", financialMetrics.netProfit >= 0 ? "hover:shadow-lg hover:-translate-y-0.5" : "bg-red-50", "transition-transform")}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Остаток</CardTitle>
                        <Scale className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                        <div className={cn("text-2xl font-bold", financialMetrics.netProfit >= 0 ? "text-green-600" : "text-red-600")}>
                            {financialMetrics.netProfit.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}
                        </div>
                        </CardContent>
                    </Card>
                 </Link>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2 text-muted-foreground">Аналитика рентабельности</h2>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Link href="/analytics/profitability" className="block">
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Рентабельность по товарам</CardTitle>
                          <ArrowUpRight className="h-4 w-4 text-green-500" />
                      </CardHeader>
                      <CardContent>
                          <div className="grid grid-cols-2 items-end">
                            <div>
                                <div className="text-2xl font-bold text-green-600">{financialMetrics.margin.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                                <p className="text-xs text-muted-foreground">Маржа</p>
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-bold text-blue-600">{financialMetrics.marginPercentage.toFixed(0)}%</div>
                                <p className="text-xs text-muted-foreground">Маржа, %</p>
                            </div>
                          </div>
                      </CardContent>
                  </Card>
              </Link>
              <Link href="/analytics/supplier-profitability" className="block">
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Закупки у поставщиков</CardTitle>
                          <Truck className="h-4 w-4 text-blue-500" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-blue-600">{financialMetrics.totalPurchase.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</div>
                        <p className="text-xs text-muted-foreground">Всего закуплено</p>
                      </CardContent>
                  </Card>
              </Link>
              <Link href="/analytics/unit-economics" className="block">
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Юнит-экономика</CardTitle>
                           <TrendingUp className="h-4 w-4 text-purple-500" />
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Сайт, ₽</p>
                            <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold">{financialMetrics.siteProfit.toLocaleString('ru-RU', {maximumFractionDigits: 0})} ₽</span>
                              <span className="text-sm font-semibold text-blue-600">{financialMetrics.siteProfitability.toFixed(0)}%</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Витрина, ₽</p>
                             <div className="flex items-baseline gap-2">
                              <span className="text-lg font-bold">{financialMetrics.retailProfit.toLocaleString('ru-RU', {maximumFractionDigits: 0})} ₽</span>
                              <span className="text-sm font-semibold text-blue-600">{financialMetrics.retailProfitability.toFixed(0)}%</span>
                            </div>
                          </div>
                      </CardContent>
                  </Card>
              </Link>
               <Link href="/analytics/clients-report" className="block">
                  <Card className="hover:shadow-lg hover:-translate-y-0.5 transition-transform">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                          <CardTitle className="text-sm font-medium">Отчет по клиентам</CardTitle>
                          <Users className="h-4 w-4 text-cyan-500" />
                      </CardHeader>
                      <CardContent className="grid grid-cols-2 gap-4 text-center">
                          <div>
                              <p className="text-xs text-muted-foreground">Всего клиентов</p>
                              <p className="text-xl font-bold">{clients?.length || 0}</p>
                          </div>
                          <div>
                              <p className="text-xs text-muted-foreground">Всего заказов</p>
                              <p className="text-xl font-bold">{orders?.length || 0}</p>
                          </div>
                      </CardContent>
                  </Card>
              </Link>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Самый прибыльный товар</CardTitle>
                    <Trophy className="h-4 w-4 text-amber-500" />
                </CardHeader>
                <CardContent>
                    <div className="text-xl font-bold">{mostProfitableItem?.name || '-'}</div>
                    {mostProfitableItem && <p className="text-xs text-muted-foreground">Прибыль: {mostProfitableItem.markup?.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Заказов в день (в среднем)</CardTitle>
                  <CalendarDays className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{averageOrdersPerDay.toFixed(1)}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
    </AppLayout>
  );
}

    