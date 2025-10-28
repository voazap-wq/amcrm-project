
"use client";

import * as React from "react";
import { AppLayout } from "@/app/components/app-layout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, ShoppingCart, Send, Info, RefreshCw, Star, ChevronsUpDown, Minus, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { searchBrands, getAllBrands, searchOffers, getDeliveries, getPayers, createOrder, type Brand, type Offer, type Delivery, type Payer, type StockItem } from "@/ai/flows/get-part-offers-flow";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipProvider, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

type CartItem = Offer & { quantity: number };


const OfferRow = ({ offer, cartItem, onCartUpdate }: { offer: Offer; cartItem: CartItem | undefined; onCartUpdate: (offer: Offer, newQuantity: number) => void; }) => {
    const quantity = cartItem?.quantity ?? 0;
    const availableAmount = parseInt(offer.amount, 10);

    const handleQuantityChange = (newQuantity: number) => {
        let value = newQuantity;
        if (isNaN(value)) {
            value = 0;
        }
        if (value < 0) {
            value = 0;
        }
        if (!isNaN(availableAmount) && value > availableAmount) {
            value = availableAmount;
        }
        onCartUpdate(offer, value);
    };

    return (
        <TableRow key={offer.key}>
            <TableCell>
                 <div className="flex items-center gap-2">
                    <TooltipProvider>
                         <Tooltip>
                            <TooltipTrigger>
                               <RefreshCw className={cn("h-4 w-4", offer.return === 1 ? 'text-green-600' : 'text-red-600')} />
                            </TooltipTrigger>
                            <TooltipContent><p>{offer.return === 1 ? "Гарантированный возврат" : "Возврат невозможен"}</p></TooltipContent>
                        </Tooltip>
                        <Tooltip>
                            <TooltipTrigger>
                                {offer.stock === "1" && <Star className="h-4 w-4 text-yellow-500 fill-yellow-400" />}
                            </TooltipTrigger>
                            <TooltipContent><p>Наличие на складе</p></TooltipContent>
                        </Tooltip>
                        {(offer.rejects ?? 0) > 0 && (
                            <Tooltip>
                                <TooltipTrigger>
                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-bar-chart-fill text-red-500" viewBox="0 0 16 16">
                                        <path d="M1 11a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1zm5-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1zm5-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1z"/>
                                    </svg>
                                </TooltipTrigger>
                                <TooltipContent><p>Вероятность отказа: {offer.rejects}%</p></TooltipContent>
                            </Tooltip>
                        )}
                        {offer.dealer === 1 && (
                            <Tooltip>
                                <TooltipTrigger>
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-award-fill text-blue-600" viewBox="0 0 16 16">
                                        <path d="m8 0 1.669.864 1.858.282.842 1.687-1.337 1.32L13.4 6l.306 1.854-1.337 1.32.842 1.687-1.858.282L8 12l-1.669-.864-1.858-.282-.842-1.687 1.337-1.32L2.6 6l-.306-1.854 1.337-1.32-.842-1.687 1.858-.282z"/>
                                        <path d="M4 11.794V16l4-1 4 1v-4.206l-2.018.306L8 13.126 6.018 12.1z"/>
                                    </svg>
                                </TooltipTrigger>
                                <TooltipContent><p>Официальный дилер</p></TooltipContent>
                            </Tooltip>
                        )}
                    </TooltipProvider>
                 </div>
            </TableCell>
             <TableCell>
                <div className="font-bold">{offer.brand}</div>
                <div className="text-blue-600 font-medium">{offer.article}</div>
                <div className="text-xs text-muted-foreground">{offer.name}</div>
            </TableCell>
            <TableCell>
                 {offer.delivery_time ? (
                    <div>
                        <div className="font-medium">
                            {format(new Date(offer.delivery_time), "dd MMMM 'до' HH:mm", { locale: ru })}
                        </div>
                        {offer.order_before && (
                            <div className="text-xs text-muted-foreground">
                                При заказе до {format(new Date(offer.order_before), "dd.MM HH:mm", { locale: ru })}
                            </div>
                        )}
                    </div>
                ) : (
                    <span>{offer.delivery_days} дн.</span>
                )}
            </TableCell>
            <TableCell>{offer.amount}</TableCell>
            <TableCell>{offer.packing || '-'}</TableCell>
            <TableCell className="font-bold">{parseFloat(offer.price).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB'})}</TableCell>
            <TableCell>
                <div className="flex items-center justify-center gap-1">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(quantity - 1)}
                        disabled={quantity <= 0}
                    >
                        <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                        type="number"
                        className="w-14 h-7 text-center"
                        value={quantity}
                        onChange={(e) => handleQuantityChange(parseInt(e.target.value, 10))}
                        onFocus={(e) => e.target.select()}
                        min="0"
                        max={!isNaN(availableAmount) ? availableAmount : undefined}
                    />
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleQuantityChange(quantity + 1)}
                        disabled={!isNaN(availableAmount) && quantity >= availableAmount}
                    >
                        <Plus className="h-4 w-4" />
                    </Button>
                </div>
            </TableCell>
        </TableRow>
    );
};

const OfferCard = ({ brandName, offers, cart, onCartUpdate }: { brandName: string; offers: Offer[]; cart: CartItem[]; onCartUpdate: (offer: Offer, newQuantity: number) => void; }) => {
    const [showAll, setShowAll] = React.useState(false);

    const sortedByPrice = React.useMemo(() => [...offers].sort((a, b) => parseFloat(a.price) - parseFloat(b.price)), [offers]);
    const sortedByDelivery = React.useMemo(() => [...offers].sort((a, b) => (a.delivery_days ?? 999) - (b.delivery_days ?? 999)), [offers]);

    const bestPriceOffer = sortedByPrice[0];
    const fastestDeliveryOffer = sortedByDelivery[0];

    const uniqueTopOffers = [bestPriceOffer];
    if (fastestDeliveryOffer && bestPriceOffer.key !== fastestDeliveryOffer.key) {
        uniqueTopOffers.push(fastestDeliveryOffer);
    }
    
    const remainingOffers = offers.filter(offer => !uniqueTopOffers.some(topOffer => topOffer.key === offer.key));

    return (
        <Card>
            <CardHeader>
                <div className="flex justify-between items-center">
                    <span className="font-bold">{brandName}</span>
                </div>
            </CardHeader>
            <CardContent className="pt-0">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-24"></TableHead>
                            <TableHead>Наименование</TableHead>
                            <TableHead>Доставка</TableHead>
                            <TableHead>Наличие</TableHead>
                            <TableHead>Кратность</TableHead>
                            <TableHead>Цена</TableHead>
                            <TableHead className="w-[150px] text-center">В заказ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {uniqueTopOffers.map(offer => (
                            <OfferRow 
                                key={offer.key} 
                                offer={offer} 
                                cartItem={cart.find(item => item.key === offer.key)}
                                onCartUpdate={onCartUpdate}
                            />
                        ))}
                        {showAll && remainingOffers.map(offer => (
                             <OfferRow 
                                key={offer.key} 
                                offer={offer} 
                                cartItem={cart.find(item => item.key === offer.key)}
                                onCartUpdate={onCartUpdate}
                            />
                        ))}
                    </TableBody>
                </Table>
                {remainingOffers.length > 0 && (
                    <div className="pt-4 text-center">
                        <Button variant="link" onClick={() => setShowAll(prev => !prev)}>
                            {showAll ? "Скрыть" : `Показать еще ${remainingOffers.length}`}
                            <ChevronsUpDown className="ml-2 h-4 w-4" />
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};


export default function AutoEuroTestPage() {
    const [article, setArticle] = React.useState("SP1416");
    const [brands, setBrands] = React.useState<Brand[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    const [allManufacturers, setAllManufacturers] = React.useState<string[]>([]);
    const [isManufacturersLoading, setIsManufacturersLoading] = React.useState(false);
    const [manufacturersError, setManufacturersError] = React.useState<string | null>(null);
    
    const [deliveries, setDeliveries] = React.useState<Delivery[]>([]);
    const [isDeliveriesLoading, setIsDeliveriesLoading] = React.useState(false);
    const [deliveriesError, setDeliveriesError] = React.useState<string | null>(null);

    const [payers, setPayers] = React.useState<Payer[]>([]);
    const [isPayersLoading, setIsPayersLoading] = React.useState(false);
    const [payersError, setPayersError] = React.useState<string | null>(null);
    
    const [selectedBrand, setSelectedBrand] = React.useState<Brand | null>(null);
    const [offers, setOffers] = React.useState<Offer[]>([]);
    const [isOffersLoading, setIsOffersLoading] = React.useState(false);
    const [offersError, setOffersError] = React.useState<string | null>(null);

    const [cart, setCart] = React.useState<CartItem[]>([]);
    const [isOrderCreating, setIsOrderCreating] = React.useState(false);
    const [orderResult, setOrderResult] = React.useState<{orderId: number | null, success: boolean, description: string} | null>(null);
    const [selectedDeliveryKey, setSelectedDeliveryKey] = React.useState<string>("");
    const [selectedPayerKey, setSelectedPayerKey] = React.useState<string>("");
    const { toast } = useToast();


    const handleGetDeliveries = React.useCallback(async () => {
        setIsDeliveriesLoading(true);
        setDeliveries([]);
        setDeliveriesError(null);
         try {
            const result = await getDeliveries();
            setDeliveries(result.deliveries);

            const defaultDelivery = result.deliveries.find(d => d.name.toLowerCase().includes("железнодорожный"));

            if (defaultDelivery) {
                setSelectedDeliveryKey(defaultDelivery.key);
            } else if (result.deliveries.length > 0) {
                setSelectedDeliveryKey(result.deliveries[0].key);
            }
        } catch (error: any) {
            console.error("Failed to get deliveries:", error);
            setDeliveriesError(error.message || "Произошла ошибка при загрузке способов доставки.");
        } finally {
            setIsDeliveriesLoading(false);
        }
    }, []);

    const handleGetPayers = React.useCallback(async () => {
        setIsPayersLoading(true);
        setPayers([]);
        setPayersError(null);
         try {
            const result = await getPayers();
            setPayers(result.payers);
             if (result.payers.length > 0) {
                setSelectedPayerKey(result.payers[0].key);
            }
        } catch (error: any) {
            console.error("Failed to get payers:", error);
            setPayersError(error.message || "Произошла ошибка при загрузке плательщиков.");
        } finally {
            setIsPayersLoading(false);
        }
    }, []);


    React.useEffect(() => {
        handleGetDeliveries();
        handleGetPayers();
    }, [handleGetDeliveries, handleGetPayers]);

    const handleSearch = async () => {
        if (!article.trim()) return;
        
        setIsLoading(true);
        setBrands([]);
        setError(null);
        setOffers([]);
        setOffersError(null);
        setSelectedBrand(null);

        try {
            const brandsResult = await searchBrands({ article: article.trim() });

            if (brandsResult.brands.length === 0) {
                setError("По данному артикулу бренды не найдены.");
            } else {
                setBrands(brandsResult.brands);
            }

        } catch (error: any) {
            console.error("Failed to search:", error);
            setError(error.message || "Произошла неизвестная ошибка.");
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleGetOffers = async (brand: Brand) => {
        if (!selectedDeliveryKey) {
            toast({
                title: "Ошибка",
                description: "Способ доставки не выбран. Пожалуйста, подождите загрузки или выберите вручную.",
                variant: "destructive"
            });
            return;
        }
        setSelectedBrand(brand);
        setIsOffersLoading(true);
        setOffers([]);
        setOffersError(null);
        
        try {
            const offersResult = await searchOffers({ brand: brand.name, article: brand.code, deliveryKey: selectedDeliveryKey });
            if (offersResult.offers.length === 0) {
                setOffersError("Предложения для данного бренда не найдены.");
            } else {
                setOffers(offersResult.offers);
            }
        } catch (error: any) {
            console.error("Failed to get offers:", error);
            setOffersError(error.message || "Произошла ошибка при загрузке предложений.");
        } finally {
            setIsOffersLoading(false);
        }
    }
    
    const { originalOffers, crossOffers } = React.useMemo(() => {
        const original: Record<string, Offer[]> = {};
        const cross: Record<string, Offer[]> = {};

        offers.forEach(offer => {
            const targetGroup = (offer.cross === 0 || offer.cross === null) ? original : cross;
            const brand = offer.brand;
            if (!targetGroup[brand]) {
                targetGroup[brand] = [];
            }
            targetGroup[brand].push(offer);
        });

        return { originalOffers: original, crossOffers: cross };
    }, [offers]);

    const handleGetAllBrands = async () => {
        setIsManufacturersLoading(true);
        setAllManufacturers([]);
        setManufacturersError(null);
         try {
            const result = await getAllBrands();
            setAllManufacturers(result.manufacturers);
        } catch (error: any) {
            console.error("Failed to get all manufacturers:", error);
            setManufacturersError(error.message || "Произошла ошибка при загрузке производителей.");
        } finally {
            setIsManufacturersLoading(false);
        }
    };
    
    const handleCartUpdate = (offer: Offer, newQuantity: number) => {
        setCart(prevCart => {
            const itemInCartIndex = prevCart.findIndex(item => item.key === offer.key);

            if (newQuantity <= 0) {
                if (itemInCartIndex > -1) {
                    const newCart = [...prevCart];
                    newCart.splice(itemInCartIndex, 1);
                    return newCart;
                }
                return prevCart;
            }

            if (itemInCartIndex > -1) {
                const newCart = [...prevCart];
                newCart[itemInCartIndex] = { ...newCart[itemInCartIndex], quantity: newQuantity };
                return newCart;
            } else {
                return [...prevCart, { ...offer, quantity: newQuantity }];
            }
        });
    };

    const handleCreateOrder = async () => {
        if (cart.length === 0 || !selectedDeliveryKey || !selectedPayerKey) {
            toast({
                title: "Ошибка",
                description: "Корзина пуста или не выбран способ доставки/плательщик.",
                variant: "destructive"
            });
            return;
        }

        setIsOrderCreating(true);
        setOrderResult(null);

        const stockItems: StockItem[] = cart.map(item => ({
            offer_key: item.key,
            quantity: item.quantity,
            comment: `${item.brand} ${item.article} ${item.name}`,
        }));

        try {
            const result = await createOrder({
                delivery_key: selectedDeliveryKey,
                payer_key: selectedPayerKey,
                stock_items: stockItems,
                wait_all_goods: true,
                comment: "Тестовый заказ из приложения"
            });
            setOrderResult(result);
            if(result.success) {
                setCart([]); // Clear cart on success
            }
        } catch (error: any) {
            console.error("Failed to create order:", error);
            setOrderResult({ orderId: null, success: false, description: error.message || "Произошла неизвестная ошибка при создании заказа."});
        } finally {
            setIsOrderCreating(false);
        }

    }


    return (
        <AppLayout pageTitle="Тестирование API AutoEuro">
           <div className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle>Этап 4: Оформление заказа</CardTitle>
                        <CardDescription>Здесь отображается корзина и можно оформить заказ.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Способ доставки</Label>
                                <Select value={selectedDeliveryKey} onValueChange={setSelectedDeliveryKey}>
                                    <SelectTrigger><SelectValue placeholder="Выберите доставку"/></SelectTrigger>
                                    <SelectContent>{deliveries.map(d => <SelectItem key={d.key} value={d.key}>{d.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label>Плательщик</Label>
                                <Select value={selectedPayerKey} onValueChange={setSelectedPayerKey}>
                                    <SelectTrigger><SelectValue placeholder="Выберите плательщика"/></SelectTrigger>
                                    <SelectContent>{payers.map(p => <SelectItem key={p.key} value={p.key}>{p.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                        </div>
                        {cart.length > 0 ? (
                           <Table>
                               <TableHeader>
                                   <TableRow>
                                       <TableHead>Производитель / Артикул / Наименование</TableHead>
                                       <TableHead>Доставка</TableHead>
                                       <TableHead>Наличие</TableHead>
                                       <TableHead>Кратность</TableHead>
                                       <TableHead>Цена</TableHead>
                                       <TableHead>Кол-во</TableHead>
                                   </TableRow>
                               </TableHeader>
                               <TableBody>
                                {cart.map(item => (
                                    <TableRow key={item.key}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-bold">{item.brand}</span>
                                                <span className="text-blue-600 font-medium">{item.article}</span>
                                            </div>
                                            <div className="text-xs text-muted-foreground">{item.name}</div>
                                        </TableCell>
                                        <TableCell>
                                            {item.delivery_time ? (
                                                <div>
                                                    <div className="font-medium">{format(new Date(item.delivery_time), "dd MMMM 'до' HH:mm", { locale: ru })}</div>
                                                    {item.order_before && (<div className="text-xs text-muted-foreground">При заказе до {format(new Date(item.order_before), "dd.MM HH:mm", { locale: ru })}</div>)}
                                                </div>
                                            ) : (<span>{item.delivery_days} дн.</span>)}
                                        </TableCell>
                                        <TableCell>{item.amount}</TableCell>
                                        <TableCell>{item.packing || '-'}</TableCell>
                                        <TableCell className="font-bold">{parseFloat(item.price).toLocaleString('ru-RU', { style: 'currency', currency: 'RUB'})}</TableCell>
                                        <TableCell>
                                             <div className="flex items-center justify-center gap-1">
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleCartUpdate(item, item.quantity - 1)} disabled={item.quantity <= 0}> <Minus className="h-4 w-4" /> </Button>
                                                <Input type="number" className="w-14 h-7 text-center" value={item.quantity} onChange={(e) => handleCartUpdate(item, parseInt(e.target.value, 10))} min="0" />
                                                <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => handleCartUpdate(item, item.quantity + 1)}> <Plus className="h-4 w-4" /> </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                               </TableBody>
                           </Table>
                        ) : (
                            <p className="text-muted-foreground text-center py-4">Корзина пуста</p>
                        )}
                        <Button onClick={handleCreateOrder} disabled={cart.length === 0 || isOrderCreating}>
                            <Send className="h-4 w-4 mr-2"/>
                            {isOrderCreating ? "Отправка..." : "Оформить заказ"}
                        </Button>
                        {orderResult && (
                            <div className={orderResult.success ? "text-green-600" : "text-red-600"}>
                                <p><strong>{orderResult.success ? "Успех!" : "Ошибка!"}</strong> {orderResult.description}</p>
                                {orderResult.orderId && <p>ID Заказа: {orderResult.orderId}</p>}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Этап 1: Поиск по артикулу</CardTitle>
                        <CardDescription>Введите артикул детали для поиска брендов.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex flex-wrap gap-2 items-end">
                            <div className="relative flex-grow min-w-[200px]">
                                <Label htmlFor="article-search">Артикул</Label>
                                <Input
                                    id="article-search"
                                    placeholder="Введите артикул..."
                                    value={article}
                                    onChange={(e) => setArticle(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                />
                            </div>
                            
                            <Button onClick={handleSearch} disabled={isLoading}>
                                <Search className="h-4 w-4 mr-2"/>
                                {isLoading ? "Поиск..." : 'Найти бренды'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {isLoading && (
                    <Card>
                        <CardHeader><CardTitle>Загрузка брендов...</CardTitle></CardHeader>
                        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                    </Card>
                )}

                {error && !isLoading && (
                    <Card>
                        <CardHeader><CardTitle className="text-destructive">Ошибка</CardTitle></CardHeader>
                        <CardContent><p className="text-red-600">{error}</p></CardContent>
                    </Card>
                )}
                
                {!isLoading && !error && brands.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Этап 2: Найденные бренды</CardTitle>
                            <CardDescription>Нажмите на строку, чтобы получить предложения по конкретному бренду.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Название бренда</TableHead>
                                        <TableHead>Наименование</TableHead>
                                        <TableHead>Нормализованный код</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {brands.map(brand => (
                                        <TableRow 
                                            key={brand.id} 
                                            onClick={() => handleGetOffers(brand)}
                                            className="cursor-pointer hover:bg-muted"
                                        >
                                            <TableCell>{brand.name}</TableCell>
                                            <TableCell>{brand.partName}</TableCell>
                                            <TableCell>{brand.code}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                )}

                {isOffersLoading && (
                    <Card>
                        <CardHeader><CardTitle>Загрузка предложений для {selectedBrand?.name}...</CardTitle></CardHeader>
                        <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                    </Card>
                )}
                
                {offersError && !isOffersLoading && (
                    <Card>
                        <CardHeader><CardTitle className="text-destructive">Ошибка при загрузке предложений</CardTitle></CardHeader>
                        <CardContent><p className="text-red-600">{offersError}</p></CardContent>
                    </Card>
                )}
                
                 {!isOffersLoading && !offersError && offers.length > 0 && (
                    <div className="space-y-6">
                       {Object.keys(originalOffers).length > 0 && (
                            <div className="space-y-4">
                                <h2 className="text-2xl font-bold">Запрошенный артикул</h2>
                                {Object.entries(originalOffers).map(([brandName, brandOffers]) => (
                                    <OfferCard
                                        key={brandName}
                                        brandName={brandName}
                                        offers={brandOffers}
                                        cart={cart}
                                        onCartUpdate={handleCartUpdate}
                                    />
                                ))}
                            </div>
                        )}
                        {Object.keys(crossOffers).length > 0 && (
                             <div className="space-y-4">
                                <h2 className="text-2xl font-bold">Аналоги</h2>
                                {Object.entries(crossOffers).map(([brandName, brandOffers]) => (
                                    <OfferCard
                                        key={brandName}
                                        brandName={brandName}
                                        offers={brandOffers}
                                        cart={cart}
                                        onCartUpdate={handleCartUpdate}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
               
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <Card>
                        <CardHeader>
                            <CardTitle>Справочник: Все производители</CardTitle>
                            <CardDescription>Получение полного списка производителей для кеширования.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={handleGetAllBrands} disabled={isManufacturersLoading}>
                                {isManufacturersLoading ? "Загрузка..." : 'Загрузить всех производителей'}
                            </Button>
                             {(isManufacturersLoading || manufacturersError || allManufacturers.length > 0) && (
                                 <div className="mt-4 max-h-60 overflow-y-auto border rounded-md">
                                    {isManufacturersLoading && <Skeleton className="h-40 w-full" />}
                                    {manufacturersError && <p className="text-red-600 p-4">{manufacturersError}</p>}
                                    {!isManufacturersLoading && !manufacturersError && allManufacturers.length > 0 && (
                                        <Table>
                                            <TableHeader>
                                                <TableRow><TableHead>Название</TableHead></TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {allManufacturers.map((manufacturer, index) => (
                                                    <TableRow key={index}>
                                                        <TableCell>{manufacturer}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
           </div>
        </AppLayout>
    );
}

    



    
