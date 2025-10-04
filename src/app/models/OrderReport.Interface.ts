import { OrderStatus } from "./OrderStatus.Interface";

export interface OrderReport {
  id: number;
  OrderId: number;
  orderStatus: OrderStatus;
  merchantName: string;
  courierName?: string;
  customerName: string;
  customerPhone1: string;
  regionName: string;
  cityName: string;
  orderCost: number;
  amountReceived: number;
  shippingCost: number;
  shippingCostPaid: number;
  companyValue: number;
  reportDate: string;
  PaymentType: string; 
}

