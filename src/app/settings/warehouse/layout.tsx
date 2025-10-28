
'use client';

import * as React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { AppLayout } from '@/app/components/app-layout';


export default function WarehouseSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AppLayout pageTitle="Настройки склада">
        <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
            {children}
        </div>
    </AppLayout>
  );
}
