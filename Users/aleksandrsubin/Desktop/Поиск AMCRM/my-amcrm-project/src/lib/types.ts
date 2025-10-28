
import { Timestamp } from "firebase/firestore";

export type OrderStatus =
  | 'Ожидается'
  | 'На складе'
  | 'Отправлено'
  | 'Оплачено'
  | 'ДОЛГ'
  | 'Переплата';

export type Product = {
  id: string;
  name: string;
  article: string | null;
  manufacturer: string | null;
  supplier: string | null;
  price: number;
  quantity: number;
  total: number;
  purchase: number | null;
  markup: number | null;
  term: number | null;
  status: string; // Now a string to hold the name of the ItemStatus
  warehouseCell?: string; // The warehouse cell where the item is stored
  categoryId?: string;
  receivedAt?: Timestamp; // Date the item was received into stock
};

export type Car = {
  id: string;
  clientId: string;
  make: string;
  model: string;
  year?: number;
  vin?: string;
  active: boolean;
  comments?: string;
};

export type Customer = {
  id: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  email?: string;
  phone?: string;
  source?: string;
  comments?: string;
  active: boolean;
  balance?: number;
  orderCount?: number;
};

export type Supplier = {
  id: string;
  name: string;
  login?: string;
  password?: string;
  url?: string;
  apiEmail?: string;
  orderDeadline?: string;
  minOrderAmount?: number;
  notes?: string;
  manager?: string;
};

export type Payment = {
  amount: number;
  date: Timestamp;
};

export type CustomerOrder = {
  id: string; // Firestore document ID
  orderNumber: string; // Human-readable order number
  customer: Customer; // This will be populated after fetching from DB
  clientId: string; // This is stored in the DB
  carId?: string; // Optional reference to the car
  channel?: 'Сайт' | 'Витрина';
  supplier?: Supplier;
  itemCount: number;
  status: string;
  statusAmount?: number;
  total: number;
  amountPaid: number;
  amountRemaining: number;
  paymentHistory?: Payment[];
  items: Product[];
  comments?: string;
  createdAt: Timestamp; // Order creation date
  active?: boolean;
};

export type OrderStatusDefinition = {
  id: string;
  name: string;
  color: string;
  triggerStatusId?: string;
  order?: number;
};

export type PaymentStatusDefinition = {
  id: string;
  name: string;
  color: string;
  order?: number;
}

export type ItemStatus = {
  id: string;
  name: string;
  color: string;
  order?: number;
}

export type StoreDetails = {
    id: string;
    name?: string;
    address?: string;
    email?: string;
    phone1?: string;
    telegram?: string;
    whatsapp?: string;
    vkontakte?: string;
    legalName?: string;
    generalDirector?: string;
    chiefAccountant?: string;
    tin?: string;
    trrc?: string;
    psrn?: string;
    okpo?: string;
    registrationAddress?: string;
    actualAddress?: string;
    postalCode?: string;
    postalAddress?: string;
    bankName?: string;
    bankBik?: string;
    bankSettlementAccount?: string;
    bankCorrespondentAccount?: string;
    withNds?: boolean;
    docBasis?: string;
    docSellerSignature?: string;
    docBuyerSignature?: string;
    docPromoText?: string;
}

export type CustomDocument = {
    id: string;
    name: string;
    template: string;
}

export type Transaction = {
    id: string;
    date: Timestamp;
    description: string;
    amount: number;
    type: 'income' | 'expense' | 'return' | 'transfer';
    categoryId: string;
    paymentMethodId: string;
    orderId?: string;
    clientId?: string;
    supplierId?: string;
};

export type TransactionCategory = {
    id: string;
    name: string;
    type: 'income' | 'expense';
    isDefault?: boolean;
};

export type PaymentMethod = {
    id: string;
    name: string;
    commission?: number;
    isDefault?: boolean;
};

export type KanbanColumn = {
    id: string;
    title: string;
    color: string;
    order: number;
};

export type KanbanTask = {
    id: string;
    columnId: string;
    content: string;
    order: number;
};

export type WarehouseCell = {
  id: string;
  name: string;
  notes?: string;
  isDefault?: boolean;
};

export type Deal = {
  id: string;
  title: string;
  status?: "someday" | "logbook";
  when?: Timestamp;
  completed: boolean;
  notes?: string;
  checklist?: { id: string; text: string; completed: boolean }[];
  tags?: string[];
  listId?: string;
  order?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type DealList = {
  id: string;
  name: string;
  notes?: string;
  order?: number;
  icon?: string;
}

export type DealTag = {
  id: string;
  name: string;
  color: string;
}

export type MarkupRule = {
    id: string;
    from: number;
    to: number;
    markup: number;
}

export type ProductCategory = {
  id: string;
  name: string;
  parent?: string;
}
