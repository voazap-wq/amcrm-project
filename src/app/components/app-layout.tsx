
"use client";

import * as React from "react";
import Link from "next/link";
import {
  Sliders,
  LogOut,
  ChevronsUpDown,
  Car,
  Users,
  ReceiptText,
  BarChart,
  ClipboardCheck,
  CheckSquare,
  Calendar,
} from "lucide-react";
import { useAuth, useUser } from "@/firebase";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter, usePathname } from "next/navigation";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipProvider,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import { sidebarNav } from "@/app/page";
import { cn } from "@/lib/utils";

export function AppLayout({ children, pageTitle, showHeader = true }: { children: React.ReactNode; pageTitle: string, showHeader?: boolean }) {
  const auth = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);
  
  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error("Sign out error", error);
      toast({
        variant: "destructive",
        title: "Ошибка!",
        description: "Не удалось выйти из системы.",
      });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen w-full bg-secondary/50">
       <div className="space-y-4 p-8 bg-white rounded-lg shadow-md w-full max-w-4xl">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-64 w-full" />
       </div>
     </div>
   );
 }

  return (
    <div className="flex min-h-screen w-full bg-secondary/50">
      <Sidebar side="left" collapsible="icon" variant="sidebar" className="border-r bg-white">
        <SidebarContent className="flex flex-col">
          <SidebarHeader>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center justify-between w-full h-12 px-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.photoURL || "https://picsum.photos/seed/1/40/40"} />
                        <AvatarFallback>{user.email?.charAt(0).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <div className="text-left flex-col items-start hidden group-data-[state=expanded]:flex">
                        <span className="text-sm font-medium">{user.displayName || "Автошкола"}</span>
                      </div>
                    </div>
                    <ChevronsUpDown className="h-4 w-4 text-muted-foreground hidden group-data-[state=expanded]:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Выйти</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
          </SidebarHeader>
          <TooltipProvider>
            <SidebarMenu className="flex-1 p-2">
                {sidebarNav.map((item, index) => (
                  <li key={index} className="group/menu-item relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link
                          href={item.href}
                          className={cn(
                            "peer/menu-button flex h-10 w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:w-10",
                            (pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5 shrink-0" />
                          <span className="truncate group-data-[collapsible=icon]:hidden">{item.tooltip}</span>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" className="bg-primary text-primary-foreground">
                        {item.tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                ))}
            </SidebarMenu>
          </TooltipProvider>
        </SidebarContent>
      </Sidebar>
      <div className="flex flex-col w-full">
        {showHeader && (
          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-white px-4 md:px-6">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="md:hidden" />
              <h1 className="text-xl font-semibold">{pageTitle}</h1>
            </div>
            {/* Additional header content can go here */}
          </header>
        )}
        <main className="flex-1 p-4 md:p-6">
            {children}
        </main>
      </div>
    </div>
  );
}
