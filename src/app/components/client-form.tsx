
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
import { formatPhoneNumber } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const clientFormSchema = z.object({
  lastName: z.string().min(1, "Фамилия обязательна"),
  firstName: z.string().min(1, "Имя обязательно"),
  patronymic: z.string().optional(),
  email: z.string().email("Неверный формат email").optional().or(z.literal('')),
  phone: z.string().optional(),
  source: z.string().optional(),
  comments: z.string().optional(),
});

export type ClientFormValues = z.infer<typeof clientFormSchema>;

interface ClientFormProps {
    initialValues?: Partial<ClientFormValues>;
    onSubmit: (data: ClientFormValues) => void;
    onCancel?: () => void;
    isSubmitting?: boolean;
}

export function ClientForm({ initialValues, onSubmit, onCancel, isSubmitting }: ClientFormProps) {
  const form = useForm<ClientFormValues>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      firstName: initialValues?.firstName || "",
      lastName: initialValues?.lastName || "",
      patronymic: initialValues?.patronymic || "",
      email: initialValues?.email || "",
      phone: initialValues?.phone || "",
      source: initialValues?.source || "",
      comments: initialValues?.comments || "",
    },
  });

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    form.setValue('phone', formatted, { shouldValidate: true });
  }

  return (
    <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Фамилия</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Имя</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="patronymic"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Отчество</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Телефон</FormLabel>
                    <FormControl><Input {...field} onChange={handlePhoneInputChange} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}
            />
            <FormField
                control={form.control}
                name="source"
                render={({ field }) => (
                <FormItem>
                    <FormLabel>Откуда узнал</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} defaultValue={initialValues?.source}>
                        <FormControl>
                        <SelectTrigger>
                            <SelectValue placeholder="Выберите источник" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="рекомендация">Рекомендация</SelectItem>
                            <SelectItem value="интернет">Интернет</SelectItem>
                            <SelectItem value="реклама">Реклама</SelectItem>
                            <SelectItem value="другое">Другое</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
                )}
            />
        </div>
        <FormField
            control={form.control}
            name="comments"
            render={({ field }) => (
            <FormItem>
                <FormLabel>Комментарии</FormLabel>
                <FormControl>
                <Textarea
                    placeholder="Добавьте любые заметки о клиенте..."
                    className="min-h-[100px]"
                    {...field}
                />
                </FormControl>
                <FormMessage />
            </FormItem>
            )}
        />
        <div className="flex justify-end gap-2 pt-4">
            {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Отмена</Button>}
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Сохранение..." : "Сохранить клиента"}
            </Button>
        </div>
        </form>
    </Form>
  );
}
