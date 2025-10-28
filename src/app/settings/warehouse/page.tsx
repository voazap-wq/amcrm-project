
"use client";

import * as React from "react";
import Link from "next/link";
import { Archive, Building, ListTree, Sliders } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WarehouseSettingsPage() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/settings/warehouse/cells" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <Archive className="h-10 w-10 text-indigo-600" />
                <p className="font-semibold text-sm">Ячейки склада</p>
                <CardDescription className="text-xs">Управление ячейками для хранения</CardDescription>
                </CardContent>
            </Card>
        </Link>
         <Link href="/settings/warehouse/categories" className="group">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 transition-all hover:shadow-lg hover:-translate-y-1 bg-card hover:bg-primary/5">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <ListTree className="h-10 w-10 text-emerald-600" />
                <p className="font-semibold text-sm">Категории товаров</p>
                 <CardDescription className="text-xs">Управление категориями товаров</CardDescription>
                </CardContent>
            </Card>
        </Link>
        <Link href="#" className="group cursor-not-allowed">
            <Card className="flex flex-col items-center justify-center aspect-square text-center p-4 bg-muted/50">
                <CardContent className="p-0 flex flex-col items-center justify-center gap-2">
                <Sliders className="h-10 w-10 text-muted-foreground" />
                <p className="font-semibold text-sm text-muted-foreground">Правила</p>
                 <CardDescription className="text-xs">Автоматизация размещения (скоро)</CardDescription>
                </CardContent>
            </Card>
        </Link>
    </div>
  );
}
