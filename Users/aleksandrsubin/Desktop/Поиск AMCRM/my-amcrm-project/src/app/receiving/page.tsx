
"use client";

import * as React from "react";
import { AppLayout } from "@/app/components/app-layout";

export default function ReceivingPage() {
    return (
        <AppLayout pageTitle="Прием товара">
            <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">
                    Функционал приема товара был перенесен на страницу "Склад".
                </p>
            </div>
        </AppLayout>
    );
}
