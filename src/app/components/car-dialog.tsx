
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
import { CarForm, type CarFormValues } from "./car-form";

interface CarDialogProps {
  children: React.ReactNode;
  clientId: string;
  onCarAdded: (carId: string) => void;
}

export function CarDialog({ children, clientId, onCarAdded }: CarDialogProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const firestore = useFirestore();
  const { toast } = useToast();

  const handleSaveCar = async (data: CarFormValues) => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "База данных не инициализирована.",
      });
      return;
    }

    setIsSubmitting(true);
    const carsCollection = collection(firestore, "cars");
    
    try {
        const carData = {
            ...data,
            clientId,
            year: data.year || null,
            vin: data.vin || null,
            comments: data.comments || null,
            active: true,
        };

        const docRef = await addDocumentNonBlocking(carsCollection, carData);

        if (!docRef?.id) {
            throw new Error("Не удалось получить ID нового автомобиля.");
        }

        toast({
          variant: "success",
          title: "Автомобиль добавлен",
          description: "Новый автомобиль был успешно добавлен.",
        });

        onCarAdded(docRef.id);
        setIsOpen(false);
    } catch (error) {
         toast({
            variant: "destructive",
            title: "Ошибка добавления автомобиля",
            description: "Не удалось сохранить новый автомобиль.",
        });
        console.error("Error creating car in dialog:", error);
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Добавить новый автомобиль</DialogTitle>
          <DialogDescription>
            Заполните информацию ниже, чтобы добавить новый автомобиль. Он будет автоматически выбран для этого заказа.
          </DialogDescription>
        </DialogHeader>
        <CarForm 
          onSubmit={handleSaveCar} 
          onCancel={() => setIsOpen(false)}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  );
}

    