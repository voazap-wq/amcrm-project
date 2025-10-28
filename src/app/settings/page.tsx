
"use client";

import * as React from "react";
import Link from "next/link";
import { Sliders, LogOut, ChevronsUpDown, Car, Users, ShoppingCart, Package, Truck, ReceiptText, Palette, FileIcon, Building, FileSliders, FileCog, Banknote, BarChart, ClipboardCheck, CheckSquare, Calendar, Archive, PercentSquare } from "lucide-react";
import { AppLayout } from "@/app/components/app-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function SettingsPage() {

  return (
    <AppLayout pageTitle="Настройки">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <Link href="/settings/store" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <Building className="h-10 w-10 text-indigo-600" />
                <p className="font-semibold text-sm">Реквизиты магазина</p>
                </CardContent>
            </Card>
        </Link>
            <Link href="/settings/orders" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <FileSliders className="h-10 w-10 text-cyan-600" />
                <p className="font-semibold text-sm">Статусы заказов</p>
                </CardContent>
            </Card>
        </Link>
            <Link href="/settings/payment" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <FileCog className="h-10 w-10 text-emerald-600" />
                <p className="font-semibold text-sm">Статусы оплат</p>
                </CardContent>
            </Card>
        </Link>
        <Link href="/settings/suppliers" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
            <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <Truck className="h-10 w-10 text-blue-600" />
                <p className="font-semibold text-sm">Поставщики</p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/settings/warehouse" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
            <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <Archive className="h-10 w-10 text-rose-600" />
                <p className="font-semibold text-sm">Склад</p>
            </CardContent>
            </Card>
        </Link>
            <Link href="/settings/palette" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <Palette className="h-10 w-10 text-orange-500" />
                <p className="font-semibold text-sm">Палитра</p>
                </CardContent>
            </Card>
        </Link>
        <Link href="/settings/documents" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
            <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <FileIcon className="h-10 w-10 text-purple-600" />
                <p className="font-semibold text-sm">Документы</p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/settings/finance" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
            <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <Banknote className="h-10 w-10 text-lime-600" />
                <p className="font-semibold text-sm">Финансы</p>
            </CardContent>
            </Card>
        </Link>
        <Link href="/settings/markups" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
            <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <PercentSquare className="h-10 w-10 text-teal-600" />
                <p className="font-semibold text-sm">Наценки</p>
            </CardContent>
            </Card>
        </Link>
        </div>
    </AppLayout>
  );
}
