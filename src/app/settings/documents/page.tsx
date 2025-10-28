

"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, FileText, Receipt, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const documentTypes = [
    {
        title: "Товарный чек",
        description: "Стандартный товарный чек с артикулами товаров.",
        href: "/settings/documents/receipt",
        icon: <Receipt className="h-8 w-8" />,
    },
    {
        title: "Чек без артикула",
        description: "Упрощенная версия чека без указания артикулов.",
        href: "/settings/documents/receipt-no-article",
        icon: <FileText className="h-8 w-8" />,
    },
    {
        title: "Приемный лист",
        description: "Документ для сверки товаров при поступлении от поставщиков.",
        href: "/settings/documents/acceptance-sheet",
        icon: <Truck className="h-8 w-8" />,
    },
]


export default function DocumentsHubPage() {
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/settings">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Назад</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Настройка документов
              </h1>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documentTypes.map((doc) => (
                <Link key={doc.href} href={doc.href}>
                  <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {doc.icon}
                      </div>
                      <div>
                        <CardTitle>{doc.title}</CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription>{doc.description}</CardDescription>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
