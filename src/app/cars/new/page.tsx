
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { ChevronLeft, ChevronsUpDown, Check } from "lucide-react";
import { collection } from "firebase/firestore";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { addDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { Customer } from "@/lib/types";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";

const carFormSchema = z.object({
  make: z.string().min(1, "Марка обязательна"),
  model: z.string().min(1, "Модель обязательна"),
  year: z.coerce.number().optional(),
  vin: z.string().optional(),
  clientId: z.string().min(1, "Необходимо выбрать владельца"),
  comments: z.string().optional(),
});

type CarFormValues = z.infer<typeof carFormSchema>;

export default function NewCarPage() {
  const router = useRouter();
  const { toast } = useToast();
  const firestore = useFirestore();

  const clientsRef = useMemoFirebase(() => (firestore ? collection(firestore, "clients") : null), [firestore]);
  const { data: clients, isLoading: areClientsLoading } = useCollection<Customer>(clientsRef);

  const form = useForm<CarFormValues>({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: undefined,
      vin: "",
      clientId: "",
      comments: "",
    },
  });

  const onSubmit = (data: CarFormValues) => {
    if (!firestore) {
      toast({
        variant: "destructive",
        title: "Ошибка",
        description: "База данных не инициализирована.",
      });
      return;
    }

    const carsCollection = collection(firestore, "cars");
    
    const carData = {
        ...data,
        year: data.year || null,
        vin: data.vin || null,
        comments: data.comments || null,
        active: true, // Set car as active by default
    };
    
    addDocumentNonBlocking(carsCollection, carData);

    toast({
      variant: "success",
      title: "Автомобиль добавлен",
      description: "Новый автомобиль был успешно добавлен.",
    });
    router.push("/cars");
  };

  const getClientDisplayName = (client: Customer | undefined) => {
    if (!client) return "";
    return `${client.lastName} ${client.firstName} ${client.patronymic || ''}`.trim();
  }

  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
      <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
        <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
          <div className="mx-auto grid w-full max-w-2xl flex-1 auto-rows-max gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                <Link href="/cars">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Назад</span>
                </Link>
              </Button>
              <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                Добавить новый автомобиль
              </h1>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Данные автомобиля</CardTitle>
                <CardDescription>
                  Заполните информацию ниже, чтобы добавить новый автомобиль.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                       <FormField
                          control={form.control}
                          name="make"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Марка</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="model"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Модель</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                         <FormField
                          control={form.control}
                          name="year"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Год выпуска</FormLabel>
                              <FormControl><Input type="number" {...field} value={field.value ?? ''} onChange={e => field.onChange(e.target.valueAsNumber || undefined)} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="vin"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>VIN</FormLabel>
                              <FormControl><Input {...field} value={field.value ?? ''} /></FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem className="sm:col-span-2 flex flex-col">
                              <FormLabel>Владелец</FormLabel>
                               <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "w-full justify-between",
                                        !field.value && "text-muted-foreground"
                                      )}
                                    >
                                      {field.value
                                        ? getClientDisplayName(clients?.find(
                                            (client) => client.id === field.value
                                          ))
                                        : "Выберите владельца"}
                                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-full p-0">
                                  <Command>
                                    <CommandInput placeholder="Поиск клиента..." />
                                    <CommandEmpty>Клиент не найден.</CommandEmpty>
                                    <CommandGroup>
                                      {clients?.map((client) => (
                                        <CommandItem
                                          value={getClientDisplayName(client)}
                                          key={client.id}
                                          onSelect={() => {
                                            form.setValue("clientId", client.id)
                                          }}
                                        >
                                          <Check
                                            className={cn(
                                              "mr-2 h-4 w-4",
                                              client.id === field.value
                                                ? "opacity-100"
                                                : "opacity-0"
                                            )}
                                          />
                                          {getClientDisplayName(client)}
                                        </CommandItem>
                                      ))}
                                    </CommandGroup>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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
                        <Button type="button" variant="ghost" onClick={() => router.push('/cars')}>Отмена</Button>
                        <Button type="submit" disabled={form.formState.isSubmitting || areClientsLoading}>
                            {form.formState.isSubmitting ? "Сохранение..." : "Сохранить автомобиль"}
                        </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
