
'use server';
/**
 * @fileOverview Серверная функция для поиска предложений по запчастям у поставщика AutoEuro.
 *
 */
import { z } from 'zod';
import fetch from 'node-fetch';

const API_KEY = 'YT0sumvXD2jf2GrVRkcinomGvAvnlnqTTyPNP8dCE21QmHga6NxXlLR0aslk';
const API_BASE_URL = 'https://api.autoeuro.ru/api/v2/json';

// --- Схемы для брендов ---
const BrandSchema = z.object({
  id: z.string().describe('The ID of the brand.'),
  name: z.string().describe('The name of the brand.'),
  code: z.string().describe('The normalized article code for the brand.'),
  partName: z.string().describe('The name of the part.'),
});
export type Brand = z.infer<typeof BrandSchema>;

const SearchBrandsInputSchema = z.object({
  article: z.string().describe('The article number of the part to be priced.'),
});
export type SearchBrandsInput = z.infer<typeof SearchBrandsInputSchema>;

const AutoEuroBrandsApiResponseSchema = z.object({
    META: z.object({ result: z.string() }).passthrough(),
    DATA: z.array(z.object({
        brand: z.string(),
        code: z.string(),
        name: z.string(),
    })).optional(),
    ERROR: z.object({
        error: z.string(),
        description: z.string(),
    }).optional(),
});

const SearchBrandsOutputSchema = z.object({
  brands: z.array(BrandSchema).describe('A list of brands found for the given article.'),
});
export type SearchBrandsOutput = z.infer<typeof SearchBrandsOutputSchema>;


// --- Схемы для предложений (search_items) ---
const OfferSchema = z.object({
    key: z.string(),
    article: z.string(),
    name: z.string(),
    brand: z.string(),
    stock: z.string(),
    amount: z.string(),
    price: z.string(),
    delivery_days: z.number().nullable().optional(),
    cross: z.number().nullable().optional(),
    packing: z.number().nullable().optional(),
    currency: z.string().nullable().optional(),
    return: z.number().nullable().optional(),
    order_before: z.string().nullable().optional(),
    delivery_time: z.string().nullable().optional(),
    delivery_time_max: z.string().nullable().optional(),
    rejects: z.number().nullable().optional(),
    dealer: z.number().nullable().optional(),
    warehouse_name: z.string().nullable().optional(),
    warehouse_key: z.string().nullable().optional(),
    product_id: z.number().nullable().optional(),
});
export type Offer = z.infer<typeof OfferSchema>;

const SearchOffersInputSchema = z.object({
  brand: z.string().describe('The brand of the part.'),
  article: z.string().describe('The article number of the part.'),
  deliveryKey: z.string().describe('The delivery method key.'),
});
export type SearchOffersInput = z.infer<typeof SearchOffersInputSchema>;

const AutoEuroOffersApiResponseSchema = z.object({
    META: z.object({
      result: z.string(),
    }).passthrough(),
    DATA: z.array(z.object({
        offer_key: z.string(),
        code: z.string(),
        name: z.string(),
        brand: z.string(),
        stock: z.string(),
        amount: z.string(),
        price: z.string(),
        delivery_days: z.number().nullable().optional(),
        cross: z.number().nullable().optional(),
        packing: z.number().nullable().optional(),
        currency: z.string().nullable().optional(),
        return: z.number().nullable().optional(),
        order_before: z.string().nullable().optional(),
        delivery_time: z.string().nullable().optional(),
        delivery_time_max: z.string().nullable().optional(),
        rejects: z.number().nullable().optional(),
        dealer: z.number().nullable().optional(),
        warehouse_name: z.string().nullable().optional(),
        warehouse_key: z.string().nullable().optional(),
        product_id: z.number().nullable().optional(),
    })).optional(),
    ERROR: z.object({
        error: z.string(),
        description: z.string(),
    }).optional(),
});

const SearchOffersOutputSchema = z.object({
  offers: z.array(OfferSchema).describe('A list of offers found.'),
});
export type SearchOffersOutput = z.infer<typeof SearchOffersOutputSchema>;


// --- Схемы для всех производителей ---
const AllManufacturersApiResponseSchema = z.object({
    META: z.object({}).passthrough(),
    DATA: z.array(z.object({
        brand: z.string(),
    })),
    ERROR: z.any().optional(),
});

const GetAllManufacturersOutputSchema = z.object({
    manufacturers: z.array(z.string()).describe('A list of all manufacturer names.'),
});
export type GetAllManufacturersOutput = z.infer<typeof GetAllManufacturersOutputSchema>;


// --- Схемы для способов доставки ---
const DeliverySchema = z.object({
    key: z.string(),
    name: z.string(),
});
export type Delivery = z.infer<typeof DeliverySchema>;

const AutoEuroDeliveriesApiResponseSchema = z.object({
    META: z.object({}).passthrough(),
    DATA: z.array(z.object({
        delivery_key: z.string(),
        delivery_name: z.string(),
    })).optional(),
     ERROR: z.any().optional(),
});

const GetDeliveriesOutputSchema = z.object({
    deliveries: z.array(DeliverySchema).describe('A list of available delivery methods.'),
});
export type GetDeliveriesOutput = z.infer<typeof GetDeliveriesOutputSchema>;

// --- Схемы для плательщиков ---
const PayerSchema = z.object({
    key: z.string(),
    name: z.string(),
});
export type Payer = z.infer<typeof PayerSchema>;

const AutoEuroPayersApiResponseSchema = z.object({
    META: z.object({}).passthrough(),
    DATA: z.array(z.object({
        payer_key: z.string(),
        payer_name: z.string(),
    })).optional(),
     ERROR: z.any().optional(),
});

const GetPayersOutputSchema = z.object({
    payers: z.array(PayerSchema).describe('A list of available payers.'),
});
export type GetPayersOutput = z.infer<typeof GetPayersOutputSchema>;

// --- Схемы для создания заказа ---
const StockItemSchema = z.object({
  offer_key: z.string(),
  quantity: z.number(),
  price: z.number().optional(),
  comment: z.string().optional(),
});
export type StockItem = z.infer<typeof StockItemSchema>;

const CreateOrderInputSchema = z.object({
  delivery_key: z.string(),
  payer_key: z.string(),
  stock_items: z.array(StockItemSchema),
  wait_all_goods: z.boolean().optional(),
  comment: z.string().optional(),
  delivery_date: z.string().optional(),
});
export type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

const AutoEuroCreateOrderApiResponseSchema = z.object({
  META: z.object({ result: z.string() }).passthrough(),
  DATA: z.object({
    order_id: z.number().nullable(),
    result: z.boolean(),
    result_description: z.string(),
  }).optional(),
  ERROR: z.object({
        error: z.string(),
        description: z.string(),
    }).optional(),
});

const CreateOrderOutputSchema = z.object({
  orderId: z.number().nullable(),
  success: z.boolean(),
  description: z.string(),
});
export type CreateOrderOutput = z.infer<typeof CreateOrderOutputSchema>;


// --- API Abstraction ---

async function fetchApi<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${API_BASE_URL}/${endpoint}/${API_KEY}/`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.append(key, value));

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        let errorData = {};
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
            // Ignore if body is not JSON
        }
        throw new Error((errorData as any)?.ERROR?.description || (errorData as any)?.ERROR?.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const validatedData = z.object({
        META: z.object({ result: z.string() }).passthrough(),
        ERROR: z.any().optional(),
        DATA: z.any()
    }).safeParse(data);
    
    if (!validatedData.success) {
        console.error(`Invalid JSON structure for ${endpoint}:`, validatedData.error);
        throw new Error(`Неожиданный формат ответа API от ${endpoint}.`);
    }

    if (validatedData.data.META.result === 'ERROR' || validatedData.data.ERROR) {
      throw new Error(validatedData.data.ERROR?.description || validatedData.data.ERROR?.error || `API вернул ошибку для ${endpoint}.`);
    }

    return validatedData.data.DATA;
  } catch (error: any) {
    console.error(`Error fetching from ${endpoint}:`, error);
    throw new Error(error.message || `Произошла неизвестная ошибка при запросе к ${endpoint}.`);
  }
}

async function postApi<T>(endpoint: string, body: Record<string, any>): Promise<T> {
   const url = `${API_BASE_URL}/${endpoint}/${API_KEY}/`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error(`HTTP error! status: ${response.status}, body: ${errorText}`);
        let errorData = {};
        try {
            errorData = JSON.parse(errorText);
        } catch (e) {
             // Ignore if body is not JSON
        }
        throw new Error((errorData as any)?.ERROR?.description || (errorData as any)?.ERROR?.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    const validatedData = z.object({
        META: z.object({ result: z.string() }).passthrough(),
        ERROR: z.any().optional(),
        DATA: z.any()
    }).safeParse(data);

    if (!validatedData.success) {
        console.error(`Invalid JSON structure for ${endpoint}:`, validatedData.error);
        throw new Error(`Неожиданный формат ответа API от ${endpoint}.`);
    }

    if (validatedData.data.META.result === 'ERROR' || validatedData.data.ERROR) {
      throw new Error(validatedData.data.ERROR?.description || validatedData.data.ERROR?.error || `API вернул ошибку для ${endpoint}.`);
    }

    return validatedData.data.DATA;
  } catch (error: any) {
    console.error(`Error posting to ${endpoint}:`, error);
    throw new Error(error.message || `Произошла неизвестная ошибка при запросе к ${endpoint}.`);
  }
}


// --- Exported Server Actions ---

export async function searchBrands(input: SearchBrandsInput): Promise<SearchBrandsOutput> {
    const data = await fetchApi<z.infer<typeof AutoEuroBrandsApiResponseSchema>['DATA']>('search_brands', { code: input.article });
    const brands = (data || []).map(item => ({ id: item.brand, name: item.brand, code: item.code, partName: item.name }));
    const uniqueBrands = Array.from(new Map(brands.map(item => [item.name, item])).values());
    return { brands: uniqueBrands };
}

export async function getAllBrands(): Promise<GetAllManufacturersOutput> {
    const data = await fetchApi<z.infer<typeof AllManufacturersApiResponseSchema>['DATA']>('get_brands', {});
    const manufacturers = (data || []).map(item => item.brand).sort();
    return { manufacturers };
}

export async function searchOffers(input: SearchOffersInput): Promise<SearchOffersOutput> {
    if (!input.deliveryKey) {
        throw new Error('Способ доставки не выбран.');
    }
    const data = await fetchApi<z.infer<typeof AutoEuroOffersApiResponseSchema>['DATA']>('search_items', {
        brand: input.brand,
        code: input.article,
        delivery_key: input.deliveryKey,
        with_crosses: "1",
        with_offers: "1"
    });

    if (!data) return { offers: [] };

    const offers = data.map(item => ({
            key: item.offer_key,
            article: item.code,
            name: item.name,
            brand: item.brand,
            stock: item.stock,
            amount: item.amount,
            price: item.price,
            delivery_days: item.delivery_days,
            cross: item.cross,
            packing: item.packing,
            currency: item.currency,
            return: item.return,
            order_before: item.order_before,
            delivery_time: item.delivery_time,
            delivery_time_max: item.delivery_time_max,
            rejects: item.rejects,
            dealer: item.dealer,
            warehouse_name: item.warehouse_name,
            warehouse_key: item.warehouse_key,
            product_id: item.product_id,
        }));
    return { offers };
}

export async function getDeliveries(): Promise<GetDeliveriesOutput> {
    const data = await fetchApi<z.infer<typeof AutoEuroDeliveriesApiResponseSchema>['DATA']>('get_deliveries', {});
    const deliveries = (data || []).map(item => ({ key: item.delivery_key, name: item.delivery_name }));
    return { deliveries };
}

export async function getPayers(): Promise<GetPayersOutput> {
    const data = await fetchApi<z.infer<typeof AutoEuroPayersApiResponseSchema>['DATA']>('get_payers', {});
    const payers = (data || []).map(item => ({ key: item.payer_key, name: item.payer_name }));
    return { payers };
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderOutput> {
     const data = await postApi<z.infer<typeof AutoEuroCreateOrderApiResponseSchema>['DATA']>('create_order', {
        delivery_key: input.delivery_key,
        payer_key: input.payer_key,
        stock_items: input.stock_items,
        wait_all_goods: input.wait_all_goods,
        comment: input.comment,
        delivery_date: input.delivery_date
     });
     
     if (!data) {
        throw new Error('Не удалось создать заказ, ответ от API пуст.');
     }

     return {
        orderId: data.order_id,
        success: data.result,
        description: data.result_description,
     };
}

    