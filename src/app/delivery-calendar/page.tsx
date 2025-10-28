
"use client";

import * as React from "react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import type { CustomerOrder, Deal } from "@/lib/types";
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import multiMonthPlugin from '@fullcalendar/multimonth'
import { addDays } from "date-fns";
import ruLocale from '@fullcalendar/core/locales/ru';
import { AppLayout } from "@/app/components/app-layout";


export default function DeliveryCalendarPage() {
  const router = useRouter();
  const firestore = useFirestore();

  const ordersRef = useMemoFirebase(() => (firestore ? collection(firestore, "orders") : null), [firestore]);
  const { data: orders, isLoading: areOrdersLoading } = useCollection<CustomerOrder>(ordersRef);

  const dealsRef = useMemoFirebase(() => (firestore ? collection(firestore, "deals") : null), [firestore]);
  const { data: deals, isLoading: areDealsLoading } = useCollection<Deal>(dealsRef);

  const isLoading = areOrdersLoading || areDealsLoading;

  const calendarEvents = React.useMemo(() => {
    const events = [];

    if (orders) {
        const deliveryEvents = orders.flatMap(order => 
            (order.items || [])
                .filter(item => item.status !== 'Отказ' && item.term !== null && item.term !== undefined)
                .map(item => {
                    const deliveryDate = addDays(order.createdAt.toDate(), item.term!);
                    return {
                        title: `${item.name} (#${order.orderNumber})`,
                        start: deliveryDate,
                        allDay: true,
                        extendedProps: {
                            orderId: order.id,
                            type: 'delivery',
                        },
                        color: '#3b82f6', // blue-500
                    };
                })
        );
        events.push(...deliveryEvents);
    }
    
    if (deals) {
        const dealEvents = deals
            .filter(deal => deal.when)
            .map(deal => ({
                title: deal.title,
                start: deal.when!.toDate(),
                allDay: true,
                extendedProps: {
                    dealId: deal.id,
                    type: 'deal',
                },
                color: '#84cc16', // lime-500
            }));
        events.push(...dealEvents);
    }

    return events;
  }, [orders, deals]);
  
  const handleEventClick = (clickInfo: any) => {
    const { type, orderId, dealId } = clickInfo.event.extendedProps;
    if (type === 'delivery' && orderId) {
      router.push(`/orders/${orderId}`);
    } else if (type === 'deal' && dealId) {
      router.push(`/deals?dealId=${dealId}`);
    }
  };

  if (isLoading) {
    return (
      <AppLayout pageTitle="Календарь поставок">
          <Skeleton className="h-[80vh] w-full" />
      </AppLayout>
    );
  }

  return (
    <AppLayout pageTitle="Календарь поставок">
        <Card>
            <CardContent className="p-4">
                <FullCalendar
                    plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, multiMonthPlugin]}
                    headerToolbar={{
                        left: 'prev,next today',
                        center: 'title',
                        right: 'dayGridMonth,timeGridWeek,timeGridDay,multiMonthYear'
                    }}
                    initialView='dayGridMonth'
                    events={calendarEvents}
                    eventClick={handleEventClick}
                    locale={ruLocale}
                    buttonText={{
                        today:    'Сегодня',
                        month:    'Месяц',
                        week:     'Неделя',
                        day:      'День',
                        year:     'Год'
                    }}
                    allDaySlot={true}
                    slotMinTime="09:00:00"
                    slotMaxTime="22:00:00"
                    height="auto"
                    contentHeight="auto"
                    aspectRatio={2}
                    multiMonthMaxColumns={3}
                />
            </CardContent>
        </Card>
    </AppLayout>
  );
}