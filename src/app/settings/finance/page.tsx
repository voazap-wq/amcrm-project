
"use client";

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import { Banknote, CreditCard } from "lucide-react";

export default function FinanceSettingsPage() {
    return (
        <div>
            <Card>
                <CardHeader>
                    <CardTitle>Обзор настроек финансов</CardTitle>
                    <CardDescription>Выберите раздел для настройки.</CardDescription>
                </CardHeader>
            </Card>
            <div className="grid gap-4 md:grid-cols-2 mt-4">
                <Link href="/settings/finance/categories">
                    <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <Banknote className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Категории</CardTitle>
                                <CardDescription>Управление категориями доходов и расходов</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
                <Link href="/settings/finance/payment-methods">
                    <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                        <CardHeader className="flex flex-row items-center gap-4">
                            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                <CreditCard className="h-6 w-6" />
                            </div>
                            <div>
                                <CardTitle>Способы оплаты</CardTitle>
                                <CardDescription>Управление способами оплаты</CardDescription>
                            </div>
                        </CardHeader>
                    </Card>
                </Link>
            </div>
        </div>
    );
}
