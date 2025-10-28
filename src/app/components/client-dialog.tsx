
"use client";

import * as React from "react";
import { collection } from "firebase/firestore";
import { useFirestore, addDocumentNonBlocking } from "@/firebase";
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm, type ClientFormValues } from "./client-form";


interface ClientDialogProps {
  children: React.ReactNode;
  onClientAdded: (clientId: string) => void;
}

export function ClientDialog({ children, onClientAdded }: ClientDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSaveClient = async (data: ClientFormValues) => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "База данных не инициализирована.",
      });
      return;
    }

    setIsSubmitting(true);
    const clientsCollection = collection(firestore, "clients");
    
    try {
        const docRef = await addDocumentNonBlocking(clientsCollection, {
            ...data,
            source: data.source || null,
            comments: data.comments || null,
            active: true,
        });

        if (!docRef?.id) {
            throw new Error("Не удалось получить ID нового клиента.");
        }

        toast({
          variant: "success",
          title: "Клиент создан",
          description: "Новый клиент был успешно добавлен.",
        });

        onClientAdded(docRef.id);
        setIsOpen(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Ошибка создания клиента",
            description: "Не удалось сохранить нового клиента.",
        });
        console.error("Error creating client in dialog:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Добавить нового клиента</DialogTitle>
          <DialogDescription>
            Заполните информацию ниже, чтобы добавить нового клиента. Он будет автоматически выбран для этого заказа.
          </DialogDescription>
        </DialogHeader>
        <ClientForm 
          onSubmit={handleSaveClient} 
          onCancel={() => setIsOpen(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}
