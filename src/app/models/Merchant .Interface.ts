export interface Merchant {
    id?: number;
    email: string;
    password: string;
    fullName: string;
    phoneNumber: string;
    address: string;
    branchId: number;
    regionId: number;
    cityId: number;
    storeName: string;
    specialCityCosts: {
      price: number;
      citySettingId: number;
    }[];
  }
  export interface MerchantResponse {
    id: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  email: string;
  branchId: number;
    regionId: number;
    cityId: number;
  branchNmae: string;
  regionName: string;
  cityName: string;
  storeName: string;
  specialCities?: {
    cityName?: string;
    price: number;
    citySettingId?: number;
    merchantId?: string;
  }[];
  }