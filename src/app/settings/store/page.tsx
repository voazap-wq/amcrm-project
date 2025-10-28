
"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { doc } from "firebase/firestore";

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
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import type { StoreDetails } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPhoneNumber } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";


const storeDetailsSchema = z.object({
  name: z.string().optional(),
  address: z.string().optional(),
  email: z.string().email({ message: "Неверный формат email" }).optional().or(z.literal('')),
  phone1: z.string().optional(),
  telegram: z.string().optional(),
  whatsapp: z.string().optional(),
  vkontakte: z.string().optional(),
  legalName: z.string().optional(),
  generalDirector: z.string().optional(),
  chiefAccountant: z.string().optional(),
  tin: z.string().optional(),
  trrc: z.string().optional(),
  psrn: z.string().optional(),
  okpo: z.string().optional(),
  registrationAddress: z.string().optional(),
  actualAddress: z.string().optional(),
  postalCode: z.string().optional(),
  postalAddress: z.string().optional(),
  bankName: z.string().optional(),
  bankBik: z.string().optional(),
  bankSettlementAccount: z.string().optional(),
  bankCorrespondentAccount: z.string().optional(),
  withNds: z.boolean().optional(),
});

type StoreDetailsFormValues = z.infer<typeof storeDetailsSchema>;

export default function StoreSettingsPage() {
  const { toast } = useToast();
  const firestore = useFirestore();

  const storeDetailsRef = useMemoFirebase(
    () => (firestore ? doc(firestore, "storeDetails", "main") : null),
    [firestore]
  );
  const { data: storeDetails, isLoading } = useDoc<StoreDetails>(storeDetailsRef);

  const form = useForm<StoreDetailsFormValues>({
    resolver: zodResolver(storeDetailsSchema),
    defaultValues: {},
  });

  React.useEffect(() => {
    if (storeDetails) {
      form.reset(storeDetails);
    }
  }, [storeDetails, form]);

  const onSubmit = (data: StoreDetailsFormValues) => {
    if (!storeDetailsRef) {
      toast({ variant: "destructive", title: "Ошибка", description: "База данных не инициализирована." });
      return;
    }
    
    const cleanData = Object.fromEntries(
        Object.entries(data).map(([key, value]) => [key, value === undefined || value === '' ? null : value])
    );

    setDocumentNonBlocking(storeDetailsRef, cleanData, { merge: true });
    toast({ variant: "success", title: "Сохранено", description: "Реквизиты магазина успешно обновлены." });
  };
  
  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>, field: any) => {
    const formatted = formatPhoneNumber(e.target.value);
    field.onChange(formatted);
  };

  if (isLoading || !storeDetails) {
      return (
          <div className="flex min-h-screen w-full flex-col bg-muted/40">
              <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14">
                  <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8">
                      <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
                          <div className="flex items-center gap-4">
                              <Skeleton className="h-7 w-7" />
                              <Skeleton className="h-6 w-1/2" />
                          </div>
                          <Card>
                              <CardHeader>
                                  <Skeleton className="h-6 w-1/4" />
                                  <Skeleton className="h-4 w-1/2" />
                              </CardHeader>
                              <CardContent>
                                  <div className="space-y-4">
                                      <Skeleton className="h-40 w-full" />
                                  </div>
                              </CardContent>
                          </Card>
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
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <div className="mx-auto grid w-full max-w-6xl flex-1 auto-rows-max gap-4">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/settings">
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Назад</span>
                    </Link>
                  </Button>
                  <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0">
                    Реквизиты магазина
                  </h1>
                   <div className="ml-auto flex items-center gap-2">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                      {form.formState.isSubmitting ? "Сохранение..." : "Сохранить"}
                    </Button>
                  </div>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Контакты, соцсети и уведомления</CardTitle>
                            <CardDescription>
                                Эта информация будет отображаться в документах и уведомлениях.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">Основная информация</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField control={form.control} name="name" render={({ field }) => ( <FormItem><FormLabel>Название магазина</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="address" render={({ field }) => ( <FormItem><FormLabel>Адрес</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">Контакты и уведомления</h3>
                                <div className="grid gap-4 md:grid-cols-2">
                                    <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>Основной Email</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="phone1" render={({ field }) => ( <FormItem><FormLabel>Телефон 1</FormLabel><FormControl><Input {...field} value={field.value ?? ''} onChange={(e) => handlePhoneInputChange(e, field)} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">Мессенджеры и социальные сети</h3>
                                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                    <FormField control={form.control} name="telegram" render={({ field }) => ( <FormItem><FormLabel>Telegram</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="whatsapp" render={({ field }) => ( <FormItem><FormLabel>WhatsApp</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                    <FormField control={form.control} name="vkontakte" render={({ field }) => ( <FormItem><FormLabel>VKontakte</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                       <CardHeader>
                           <CardTitle>Юридическая информация</CardTitle>
                            <CardDescription>
                               Указанные на этой странице данные отображаются клиентам в процессе оформления заказа, а также на странице Контакты.
                           </CardDescription>
                       </CardHeader>
                       <CardContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                               <FormField control={form.control} name="legalName" render={({ field }) => ( <FormItem><FormLabel>Юридическое название</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="generalDirector" render={({ field }) => ( <FormItem><FormLabel>Генеральный директор</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="chiefAccountant" render={({ field }) => ( <FormItem><FormLabel>Главный бухгалтер</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="tin" render={({ field }) => ( <FormItem><FormLabel>ИНН</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="trrc" render={({ field }) => ( <FormItem><FormLabel>КПП</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="psrn" render={({ field }) => ( <FormItem><FormLabel>ОГРН/ОГРНИП</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="okpo" render={({ field }) => ( <FormItem><FormLabel>ОКПО</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="registrationAddress" render={({ field }) => ( <FormItem><FormLabel>Адрес регистрации</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="actualAddress" render={({ field }) => ( <FormItem><FormLabel>Фактический адрес</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="postalCode" render={({ field }) => ( <FormItem><FormLabel>Индекс почтового адреса</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="postalAddress" render={({ field }) => ( <FormItem><FormLabel>Почтовый адрес</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                           </div>
                       </CardContent>
                    </Card>

                    <Card>
                       <CardHeader>
                           <CardTitle>Банковские реквизиты</CardTitle>
                       </CardHeader>
                       <CardContent>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                               <FormField control={form.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>Наименование банка</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="bankBik" render={({ field }) => ( <FormItem><FormLabel>БИК банка</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="bankSettlementAccount" render={({ field }) => ( <FormItem><FormLabel>Расчетный счет</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField control={form.control} name="bankCorrespondentAccount" render={({ field }) => ( <FormItem><FormLabel>Корреспондентский счет банка</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                               <FormField
                                   control={form.control}
                                   name="withNds"
                                   render={({ field }) => (
                                       <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 md:col-span-2">
                                       <FormControl>
                                           <Checkbox
                                           checked={field.value}
                                           onCheckedChange={field.onChange}
                                           />
                                       </FormControl>
                                       <div className="space-y-1 leading-none">
                                           <FormLabel>
                                           С НДС
                                           </FormLabel>
                                       </div>
                                       </FormItem>
                                   )}
                                   />
                           </div>
                       </CardContent>
                    </Card>
                </div>
              </div>
            </form>
          </Form>
        </main>
      </div>
    </div>
  );
    


    
