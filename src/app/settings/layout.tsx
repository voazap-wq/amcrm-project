
"use client";

import * as React from "react";
import { AppLayout } from "@/app/components/app-layout";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  
  return (
    <AppLayout pageTitle="Настройки">
      {children}
    </AppLayout>
  );
}
