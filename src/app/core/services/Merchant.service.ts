import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GenericCURD } from '../../models/Generic.interface';
import { environment } from '../../environment';
import { Merchant, MerchantResponse } from '../../models/Merchant .Interface';


@Injectable({
  providedIn: 'root'
})
export class MerchantService implements GenericCURD<any> {
  private apiUrl = `${environment.apiUrl}/api/Merchant`;
  private addMerchantiUrl = `${environment.apiUrl}/api/Auth`; 

  constructor(private http: HttpClient) {}

  getAll(): Observable<MerchantResponse[]> {
    return this.http.get<MerchantResponse[]>(`${this.apiUrl}/GetMerchant`);
  }

  getById(id: string): Observable<MerchantResponse> {
    return this.http.get<MerchantResponse>(`${this.apiUrl}/GetMerchant/${id}`);
  }

  update(id: string, merchant: Partial<MerchantResponse>): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/UpdateMerchant`, merchant); 
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/DeleteMerchant/${id}`);
  }

   create(merchant: Merchant): Observable<Merchant> {
    const merchantData = {
      email: merchant.email,
      password: merchant.password,
      fullName: merchant.fullName,
      phoneNumber: merchant.phoneNumber,
      address: merchant.address,
      branchId: merchant.branchId,
      regionId: merchant.regionId,
      cityId: merchant.cityId,
      storeName: merchant.storeName,
      specialCityCosts: merchant.specialCityCosts.map(item => ({
        price: item.price,
        citySettingId: item.citySettingId
      }))
    };
    
    return this.http.post<Merchant>(`${this.addMerchantiUrl}/addMerchant`, merchantData);
  }
}
