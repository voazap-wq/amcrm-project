

"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { doc } from "firebase/firestore";
import { Suspense } from "react";

import { SalesReceipt } from "@/app/components/sales-receipt";
import { SalesReceiptNoArticle } from "@/app/components/sales-receipt-no-article";
import { AcceptanceSheet } from "@/app/components/acceptance-sheet";
import type { CustomerOrder, Car, StoreDetails, Customer } from "@/lib/types";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { Skeleton } from "@/components/ui/skeleton";

function PrintPageContent() {
  const firestore = useFirestore();
  const searchParams = useSearchParams();

  const orderId = searchParams.get("orderId");
  const docType = searchParams.get("docType") || "receipt";

  const orderRef = useMemoFirebase(() => (firestore && orderId) ? doc(firestore, 'orders', orderId) : null, [firestore, orderId]);
  const { data: orderData, isLoading: isOrderLoading } = useDoc<Omit<CustomerOrder, 'customer'>>(orderRef);

  const clientRef = useMemoFirebase(() => (firestore && orderData?.clientId) ? doc(firestore, 'clients', orderData.clientId) : null, [firestore, orderData?.clientId]);
  const { data: client, isLoading: isClientLoading } = useDoc<Customer>(clientRef);

  const carRef = useMemoFirebase(() => (firestore && orderData?.carId) ? doc(firestore, 'cars', orderData.carId) : null, [firestore, orderData?.carId]);
  const { data: car, isLoading: isCarLoading } = useDoc<Car>(carRef);
  
  const storeDetailsRef = useMemoFirebase(() => firestore ? doc(firestore, "storeDetails", "main") : null, [firestore]);
  const { data: storeDetails, isLoading: isStoreDetailsLoading } = useDoc<StoreDetails>(storeDetailsRef);
  
  const isLoading = isOrderLoading || isCarLoading || isClientLoading || isStoreDetailsLoading;

  React.useEffect(() => {
    if (!isLoading && orderData && client) {
      setTimeout(() => window.print(), 500);
    }
  }, [isLoading, orderData, client]);


  if (isLoading) {
    return (
        <div className="p-8 bg-white max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-10 w-1/4 ml-auto" />
            <Skeleton className="h-6 w-full" />
        </div>
    );
  }

  if (!orderData || !client || !storeDetails) {
    return (
      <div className="p-8 bg-white max-w-4xl mx-auto text-center text-red-600 font-bold">
        Не удалось загрузить данные для печати. Убедитесь, что заказ и реквизиты существуют.
      </div>
    );
  }
  
  const order: CustomerOrder = {
      ...orderData,
      id: orderData.id,
      customer: client,
  } as CustomerOrder;

  if (docType === "acceptance_sheet") {
    return <AcceptanceSheet order={order} />;
  }
  if (docType === "receipt_no_article") {
    return <SalesReceiptNoArticle order={order} car={car} storeDetails={storeDetails} />;
  }

  return <SalesReceipt order={order} car={car} storeDetails={storeDetails} />;
}


export default function PrintPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Загрузка документа...</div>}>
            <PrintPageContent />
        </Suspense>
    )
}
