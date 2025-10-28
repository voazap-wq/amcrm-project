
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

const financeSettingsNavLinks = [
  { href: '/settings/finance', label: 'Обзор' },
  { href: '/settings/finance/categories', label: 'Категории' },
  { href: '/settings/finance/payment-methods', label: 'Способы оплаты' },
];

export default function FinanceSettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const activeTab = financeSettingsNavLinks.find(link => pathname === link.href)?.href || pathname;

  return (
    <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" className="h-7 w-7" asChild>
            <Link href="/settings">
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Назад</span>
            </Link>
            </Button>
            <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Настройки финансов
            </h1>
        </div>
        <Tabs value={activeTab}>
            <TabsList>
                {financeSettingsNavLinks.map(link => (
                     <TabsTrigger key={link.href} value={link.href} asChild>
                        <Link href={link.href}>{link.label}</Link>
                    </TabsTrigger>
                ))}
            </TabsList>
        </Tabs>
        <div className="mt-6">
            {children}
        </div>
    </div>
  );
}
