
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { collection } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useUser } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { ClientForm, type ClientFormValues } from "@/app/components/client-form";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewClientPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);


  const onSubmit = async (data: ClientFormValues) => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "База данных не инициализирована.",
      });
      return;
    }

    const clientsCollection = collection(firestore, "clients");
    
    try {
        const docRef = await addDocumentNonBlocking(clientsCollection, {
            ...data,
            source: data.source || null,
            comments: data.comments || null,
            active: true, // Set client as active by default
        });
        
        toast({
          variant: "success",
          title: "Клиент создан",
          description: "Новый клиент был успешно добавлен.",
        });
        
        // Use the new docRef id if available, otherwise fallback
        if (docRef) {
          router.push(`/clients/${docRef.id}`);
        } else {
          router.push("/clients");
        }

    } catch (error) {
        toast({
            variant: "destructive",
            title: "Ошибка создания клиента",
            description: "Не удалось сохранить нового клиента.",
        });
        console.error("Error creating client:", error);
    }
  };

  if (isUserLoading || !user) {
    return (
       <div className="flex min-h-screen w-full flex-col bg-muted/40">
         <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
           <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
             <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
                <Skeleton className="h-10 w-1/2" />
                <Skeleton className="h-96 w-full" />
             </div>
            </main>
         </div>
       </div>
    )
  }


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/clients">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Назад</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Создать нового клиента
              </h1>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Данные клиента</CardTitle>
                <CardDescription>
                  Заполните информацию ниже, чтобы добавить нового клиента.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ClientForm
                  onSubmit={onSubmit}
                  onCancel={() => router.push('/clients')}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
