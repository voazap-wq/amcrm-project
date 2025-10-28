
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

const coreColors = [
    { name: "Background", variable: "background", hex: "#F7F8FA" },
    { name: "Foreground", variable: "foreground", hex: "#303133" },
    { name: "Card", variable: "card", hex: "#FFFFFF" },
    { name: "Card Foreground", variable: "card-foreground", hex: "#303133" },
    { name: "Popover", variable: "popover", hex: "#FFFFFF" },
    { name: "Popover Foreground", variable: "popover-foreground", hex: "#303133" },
    { name: "Primary", variable: "primary", hex: "#409EFF" },
    { name: "Primary Foreground", variable: "primary-foreground", hex: "#1D3A59" },
    { name: "Secondary", variable: "secondary", hex: "#F5F5F7" },
    { name: "Secondary Foreground", variable: "secondary-foreground", hex: "#303133" },
    { name: "Muted", variable: "muted", hex: "#F5F5F7" },
    { name: "Muted Foreground", variable: "muted-foreground", hex: "#707275" },
    { name: "Accent", variable: "accent", hex: "#E6E6E8" },
    { name: "Accent Foreground", variable: "accent-foreground", hex: "#303133" },
    { name: "Destructive", variable: "destructive", hex: "#F56C6C" },
    { name: "Destructive Foreground", variable: "destructive-foreground", hex: "#FFFFFF" },
    { name: "Border", variable: "border", hex: "#E6E7EB" },
    { name: "Input", variable: "input", hex: "#E6E7EB" },
    { name: "Ring", variable: "ring", hex: "#303133" },
];

const statusColors = [
    { name: "Success", variable: "status-success", hex: "#F0F9EB" },
    { name: "Success Foreground", variable: "status-success-foreground", hex: "#528E2C" },
    { name: "Warning", variable: "status-warning", hex: "#FEFBEB" },
    { name: "Warning Foreground", variable: "status-warning-foreground", hex: "#B38C22" },
    { name: "Info", variable: "status-info", hex: "#EFF6FF" },
    { name: "Info Foreground", variable: "status-info-foreground", hex: "#2962FF" },
    { name: "Danger", variable: "status-danger", hex: "#FEF0F0" },
    { name: "Danger Foreground", variable: "status-danger-foreground", hex: "#D94C4C" },
];


const chartColors = [
    { name: "Chart 1", variable: "chart-1", hex: "#F76E61" },
    { name: "Chart 2", variable: "chart-2", hex: "#43A047" },
    { name: "Chart 3", variable: "chart-3", hex: "#2C5282" },
    { name: "Chart 4", variable: "chart-4", hex: "#FBBF24" },
    { name: "Chart 5", variable: "chart-5", hex: "#F97316" },
];

const sidebarColors = [
    { name: "Sidebar", variable: "sidebar-background", hex: "#F7F8FA" },
    { name: "Sidebar Foreground", variable: "sidebar-foreground", hex: "#303133" },
    { name: "Sidebar Primary", variable: "sidebar-primary", hex: "#F5F5F7" },
    { name: "Sidebar Primary FG", variable: "sidebar-primary-foreground", hex: "#1A1A1C" },
    { name: "Sidebar Accent", variable: "sidebar-accent", hex: "#E6E6E8" },
    { name: "Sidebar Accent FG", variable: "sidebar-accent-foreground", hex: "#303133" },
    { name: "Sidebar Border", variable: "sidebar-border", hex: "#D9D9DE" },
    { name: "Sidebar Ring", variable: "sidebar-ring", hex: "#E6E6E8" },
];

const ColorGrid = ({ title, colors, description }: { title: string; colors: { name: string; variable: string; hex: string }[]; description?: string; }) => {
    const { toast } = useToast();

    const copyToClipboard = (text: string, name: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Скопировано!",
            description: `Цвет ${name} (${text}) скопирован.`,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {colors.map((color) => (
                    <div key={color.variable} className="flex flex-col items-center gap-2">
                      <div
                        className="h-16 w-16 rounded-full border shadow-inner"
                        style={{ backgroundColor: `hsl(var(--${color.variable}))` }}
                      />
                      <div className="text-center">
                        <p className="font-semibold text-sm">{color.name}</p>
                        <div className="flex items-center gap-1 text-muted-foreground text-xs cursor-pointer" onClick={() => copyToClipboard(color.hex, color.name)}>
                           <span>{color.hex}</span>
                           <Copy className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
            </CardContent>
        </Card>
    );
};


export default function PalettePage() {
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
                Цветовая палитра
              </h1>
            </div>
            <div className="space-y-4">
                <ColorGrid 
                    title="Основные цвета темы"
                    colors={coreColors}
                    description="Это основные цвета, используемые в приложении. Нажмите на HEX-код, чтобы скопировать его."
                />
                <ColorGrid 
                    title="Цвета статусов"
                    colors={statusColors}
                    description="Используются для отображения различных состояний в системе (успех, предупреждение, ошибка)."
                />
                <ColorGrid 
                    title="Цвета для графиков"
                    colors={chartColors}
                />
                 <ColorGrid 
                    title="Цвета для боковой панели"
                    colors={sidebarColors}
                    description="Эти цвета специфичны для компонента боковой панели."
                />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
