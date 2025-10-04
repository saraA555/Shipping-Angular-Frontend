import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environment';
import { Courier, CourierDTO } from '../../models/Courier.interface';

@Injectable({
  providedIn: 'root'
})
export class CourierService {
  private authApiUrl = `${environment.apiUrl}/api/Auth/addCourier`;
  private apiUrl = `${environment.apiUrl}/api/Courier`;

  constructor(private http: HttpClient) {}
  
  create(courier: Courier): Observable<any> {
    const courierData = {
      email: courier.email,
      password: courier.password,
      fullName: courier.fullName,
      phoneNumber: courier.phoneNumber,
      address: courier.address,
      branchId: courier.branchId,
      deductionType: courier.deductionType,
      deductionCompanyFromOrder: courier.deductionCompanyFromOrder,
      specialCourierRegions: courier.specialCourierRegions.length > 0 ? courier.specialCourierRegions : null,
      roleName: "Courier" 
    };
    
    console.log('Sending data to API:', courierData);
    
   
    return this.http.post<any>(this.authApiUrl, courierData);
  }
  
  getCouriersByBranch(orderId: number): Observable<CourierDTO[]> {
    return this.http.get<CourierDTO[]>(`${this.apiUrl}/GetCouriersByBranch?branchId=${orderId}`);
  }

  getCouriersByRegion(orderId: number): Observable<CourierDTO[]> {
    return this.http.get<CourierDTO[]>(`${this.apiUrl}/GetCouriersByRegion?RegionId=${orderId}`);
  }
}