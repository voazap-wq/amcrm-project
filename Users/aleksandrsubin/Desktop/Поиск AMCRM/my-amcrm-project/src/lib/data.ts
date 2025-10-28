import type { CustomerOrder, Customer } from './types';

// This data is now used only for seeding the database.
export const orders: Omit<CustomerOrder, 'clientId' | 'customer'> & { customer: {id: string}}[] = [
];
export const clients: Omit<Customer, 'id_ts'>[] = [
];
