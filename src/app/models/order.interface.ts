import { OrderType } from "../shared/enum/order-types.enum";
import { PaymentType } from "../shared/enum/payment-type.enum";
import { OrderStatus } from "./OrderStatus.Interface";

  export interface Order {
    id?: number;
    orderTypes: OrderType;
    isOutOfCityShipping: boolean;
    shippingId: number;
    paymentType:PaymentType;
    branch: number;
    region: number;
    city: number;
    totalWeight: number;
    merchantName?: string;
    merchantId: string;
    orderCost: number;
    shippingCost?: number;
    customerName: string;
    customerPhone1: string;
    customerPhone2?: string;
    customerAddress: string;
    customerEmail?: string;
    status?: OrderStatus;
    products: OrderProduct[];
    createdAt?: Date;
    employeeId?: string;
    courierId?: string;
  }
  
  export interface OrderProduct {
    id?: number;
    orderId?: number;
    name: string;
    weight: number;
    quantity: number;
    price: number;
  }
  
  export interface OrderWithProductsDto {
    id: number;
    status: OrderStatus;
    courierId?: string;
    customerName: any;
    customerPhone1: any;
    customerPhone2: any;
    customerAddress: any;
    customerEmail: any;
    orderTypes: any;
    paymentType: any;
    createdAt: string;
    CourierName: string | null;
    notes: string | null;
    branch: string;
    region: string;
    city: string;
    customerInfo: string;
    merchantId: string;
    isDeleted: boolean;
    shippingCost: number;
    orderCost: number;
    totalWeight: number;
    isOutOfCityShipping: boolean;
    shippingId: number;
    employeeId?: string;
    products: OrderProduct[];
    selected?: boolean; 
  }
  
  export interface UpdateOrderDto {
    id: number;
    orderTypes: number;
    isOutOfCityShipping: boolean;
    shippingId: number;
    paymentType: number;
    branch: number;
    region: number;
    city: number;
    totalWeight: number;
    merchantId: string;
    orderCost: number;
    customerName: string;
    customerPhone1: string;
    customerPhone2: string;
    customerAddress: string;
    customerEmail: string;
    products: {
      name: string;
      weight: number;
      quantity: number;
       price: number;
    }[];
  }

  export interface CourierAssignment {
    OrderId: number;
    courierId: string;
  }



