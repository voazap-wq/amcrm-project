
"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const carFormSchema = z.object({
  make: z.string().min(1, "Марка обязательна"),
  model: z.string().min(1, "Модель обязательна"),
  year: z.coerce.number().optional(),
  vin: z.string().optional(),
  comments: z.string().optional(),
});

export type CarFormValues = z.infer<typeof carFormSchema>;

interface CarFormProps {
    initialValues?: Partial<CarFormValues>;
    onSubmit: (data: CarFormValues) => void;
    onCancel?: () => void;
    isSubmitting?: boolean;
}

export function CarForm({ initialValues, onSubmit, onCancel, isSubmitting }: CarFormProps) {
  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues: initialValues || {
      make: "",
      model: "",
      year: undefined,
      vin: "",
      comments: "",
    },
  });

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField control={form.control} name="make" render={({ field }) => (<FormItem><FormLabel>Марка</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="model" render={({ field }) => (<FormItem><FormLabel>Модель</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="year" render={({ field }) => (<FormItem><FormLabel>Год выпуска</FormLabel><FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber || undefined)} /></FormControl><FormMessage /></FormItem>)} />
            <FormField control={form.control} name="vin" render={({ field }) => (<FormItem><FormLabel>VIN</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>)} />
            <FormField
                control={form.control}
                name="comments"
                render={({ field }) => (
                <FormItem className="sm:col-span-2">
                    <FormLabel>Комментарии</FormLabel>
                    <FormControl>
                    <Textarea
                        placeholder="Добавьте любые заметки об автомобиле..."
                        className="min-h-[100px]"
                        {...field}
                        value={field.value ?? ''}
                    />
                    </FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        
        <div className="flex justify-end gap-2 pt-4">
            {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>}
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Сохранение..." : "Сохранить автомобиль"}
            </Button>
        </div>
        </form>
    </Form>
  );
}

    
