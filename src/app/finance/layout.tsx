
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';

// Updated navigation links to reflect the single-page structure
const financeNavLinks = [
  { href: '/finance', label: 'Общий отчет' },
  // { href: '/finance/transactions', label: 'Движение средств' }, // Removed
  { href: '/finance/clients', label: 'Отчет по клиентам' },
  { href: '/finance/profitability', label: 'Прибыльность' },
  { href: '/finance/unit-economics', label: 'Юнит-экономика' },
];

export default function FinanceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // The active tab is now either the exact path or defaults to '/finance'
  const activeTab = financeNavLinks.find(link => pathname === link.href) 
    ? pathname 
    : '/finance';

  return (
    <div>
        {/* The Tabs component no longer needs to control routing,
            it's just for visual separation on the main page.
            We will handle content visibility within the main finance page itself.
        */}
        {children}
    </div>
  );
}
