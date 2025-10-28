
"use client";

import * as React from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import type { CustomerOrder, Car, Product, StoreDetails } from "@/lib/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableFooter,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";

interface SalesReceiptProps {
  order: CustomerOrder;
  car?: Car | null;
  storeDetails: Partial<StoreDetails>;
}

// Function to convert number to words
function numberToWords(num: number): string {
    if (num === 0) return "Ноль рублей";

    const toWords = (n: number): string => {
        if (n < 0) return `минус ${toWords(Math.abs(n))}`;
        
        const single = ["", "один", "два", "три", "четыре", "пять", "шесть", "семь", "восемь", "девять"];
        const teen = ["десять", "одиннадцать", "двенадцать", "тринадцать", "четырнадцать", "пятнадцать", "шестнадцать", "семнадцать", "восемнадцать", "девятнадцать"];
        const tens = ["", "десять", "двадцать", "тридцать", "сорок", "пятьдесят", "шестьдесят", "семьдесят", "восемьдесят", "девяносто"];
        const hundreds = ["", "сто", "двести", "триста", "четыреста", "пятьсот", "шестьсот", "семьсот", "восемьсот", "девятьсот"];
        const thousands = ["", "тысяча", "тысячи", "тысяч"];
        
        const numToStr = (n: number, feminine: boolean = false): string => {
            if (n === 0) return "";
            if (n < 10) {
                if (feminine) {
                    if (n === 1) return "одна";
                    if (n === 2) return "две";
                }
                return single[n];
            }
            if (n < 20) return teen[n - 10];
            if (n < 100) return `${tens[Math.floor(n / 10)]} ${numToStr(n % 10, feminine)}`;
            return `${hundreds[Math.floor(n / 100)]} ${numToStr(n % 100, feminine)}`;
        };
        
        const getThousandWord = (n: number): string => {
            const lastDigit = n % 10;
            const lastTwoDigits = n % 100;
            if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return thousands[3];
            if (lastDigit === 1) return thousands[1];
            if (lastDigit >= 2 && lastDigit <= 4) return thousands[2];
            return thousands[3];
        };

        if (n === 0) return "ноль";
        
        const thousand = Math.floor(n / 1000);
        const rest = n % 1000;
        
        let result = "";
        if (thousand > 0) {
            result += `${numToStr(thousand, true)} ${getThousandWord(thousand)} `;
        }
        if (rest > 0) {
            result += `${numToStr(rest)}`;
        }
        
        return result.trim();
    };

    const rub = Math.floor(num);
    
    if (rub === 0) return "Ноль рублей";

    const rubleWord = (n: number): string => {
        const lastDigit = n % 10;
        const lastTwoDigits = n % 100;
        if (lastTwoDigits >= 11 && lastTwoDigits <= 19) return "рублей";
        if (lastDigit === 1) return "рубль";
        if (lastDigit >= 2 && lastDigit <= 4) return "рубля";
        return "рублей";
    };

    const rubInWords = toWords(rub);
    const result = `${rubInWords.charAt(0).toUpperCase() + rubInWords.slice(1)} ${rubleWord(rub)}`;
    
    return result;
}


export const SalesReceipt = React.forwardRef<HTMLDivElement, SalesReceiptProps>(
  ({ order, car, storeDetails }, ref) => {

    const activeItems = (order.items || []).filter(item => item.status !== 'Отказ');
    const totalAmount = activeItems.reduce((sum, item) => sum + item.total, 0);

    const sellerName = storeDetails?.legalName || storeDetails?.name || "";
    const basis = storeDetails?.docBasis || "";
    const sellerSignatureText = storeDetails?.docSellerSignature || "";
    const buyerSignatureText = storeDetails?.docBuyerSignature || "";
    const promoText = storeDetails?.docPromoText || "";

    return (
      <div ref={ref} className="p-8 bg-white text-black font-sans text-xs w-full max-w-4xl mx-auto">
        <h1 className="text-lg font-bold mb-4">
          Товарный чек № {order.orderNumber} от{" "}
          {order.createdAt ? format(order.createdAt.toDate(), "d MMMM yyyy 'г.'", { locale: ru }) : ''}
        </h1>
        <Separator className="my-4 bg-black" />

        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-4">
            <div>
                <p className="font-bold">Продавец (Исполнитель):</p>
                <p>{sellerName}</p>
            </div>
            <div>
                <p className="font-bold">Покупатель (Заказчик):</p>
                <p>{order.customer.lastName} {order.customer.firstName} {order.customer.patronymic || ''}</p>
            </div>
             <div className="col-span-2">
                <span className="font-bold">Основание:</span> {basis}
            </div>
            <div className="col-span-2 grid grid-cols-2 gap-x-8">
                 <div><span className="font-bold">Автомобиль:</span> {car ? `${car.make} ${car.model} (${car.year})` : ''}</div>
                 {car?.vin && <div><span className="font-bold">VIN:</span> {car.vin}</div>}
            </div>
        </div>


        <Table>
          <TableHeader>
            <TableRow className="border-black">
              <TableHead className="border border-black text-black font-bold p-1 text-xs">№</TableHead>
              <TableHead className="border border-black text-black font-bold w-2/3 p-1 text-xs">Товары (работы, услуги)</TableHead>
              <TableHead className="border border-black text-black font-bold p-1 text-xs">Кол-во</TableHead>
              <TableHead className="border border-black text-black font-bold p-1 text-xs">Ед.</TableHead>
              <TableHead className="border border-black text-black font-bold p-1 text-xs">Цена</TableHead>
              <TableHead className="border border-black text-black font-bold p-1 text-xs">Сумма</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activeItems.map((item, index) => (
              <TableRow key={item.id} className="border-black">
                <TableCell className="border border-black p-1 text-xs">{index + 1}</TableCell>
                <TableCell className="border border-black p-1 text-xs">{item.name} {item.manufacturer && `(${item.manufacturer})`} {item.article && `[${item.article}]`}</TableCell>
                <TableCell className="border border-black text-center p-1 text-xs">{item.quantity}</TableCell>
                <TableCell className="border border-black text-center p-1 text-xs">шт</TableCell>
                <TableCell className="border border-black text-right p-1 text-xs">{item.price.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
                <TableCell className="border border-black text-right p-1 text-xs">{item.total.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        <div className="flex justify-end mt-2">
            <div className="w-1/3 space-y-1 text-xs">
                <div className="flex justify-between font-bold">
                    <span>Итого:</span>
                    <span>{totalAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                </div>
                <div className="flex justify-between">
                    <span>Без налога (НДС)</span>
                    <span>-</span>
                </div>
                <div className="flex justify-between font-bold">
                    <span>Всего к оплате:</span>
                    <span>{totalAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</span>
                </div>
            </div>
        </div>

        <div className="mt-4 text-xs">
            <p>Всего наименований {activeItems.length}, на сумму {totalAmount.toLocaleString('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })}</p>
            <p className="font-bold">{numberToWords(totalAmount)}</p>
        </div>

        <Separator className="my-8 bg-black" />
        
        <div className="mt-8 space-y-8">
            <div className="flex items-end">
                <span className="font-bold w-32">Продавец</span>
                <div className="flex-1 border-b border-black"></div>
            </div>
             <p className="text-xs">{sellerSignatureText}</p>
             <div className="flex items-end">
                <span className="font-bold w-32">Покупатель</span>
                <div className="flex-1 border-b border-black"></div>
            </div>
             <p className="text-xs">{buyerSignatureText}</p>
             {promoText && (
                <div className="text-xs">
                    <span className="font-bold">Информация:</span>
                    <span>{promoText}</span>
                </div>
            )}
        </div>

      </div>
    );
  }
);

SalesReceipt.displayName = "SalesReceipt";
