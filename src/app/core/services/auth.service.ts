import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environment';
import { LoginDTO, LoginResponseDTO } from '../../models/Login.Interface';
import { Router } from '@angular/router';

export enum UserType {
  EMPLOYEE = 'employee',
  MERCHANT = 'merchant'
}

interface UserData {
  id: string;
  email: string;
  fullName: string;
  merchantName?: string;
  type?: UserType;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  constructor(private http: HttpClient, private router: Router) {}

  // دالة تسجيل الدخول المعدلة
  login(payload: LoginDTO): Observable<LoginResponseDTO> {
    return this.http.post<LoginResponseDTO>(`${environment.apiUrl}/api/Auth/login`, payload).pipe(
      tap((response: LoginResponseDTO & { merchantName?: string }) => {
        localStorage.setItem('authToken', response.token);
        localStorage.setItem('authTokenExpiry', (Date.now() + response.expiresIn * 1000).toString());
        
        const userType = response.merchantName ? UserType.MERCHANT : UserType.EMPLOYEE;
        
        const userData: UserData = {
          id: response.id,
          email: response.email,
          fullName: response.fullName,
          merchantName: response.merchantName,
          type: userType
          
        };
     
        
        localStorage.setItem('userData', JSON.stringify(userData));
      })
    );
  }

  logout(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('authTokenExpiry');
    localStorage.removeItem('userData');
    this.router.navigate(['/login']);
  }

  getCurrentUser(): UserData | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  getAuthToken(): string | null {
    return localStorage.getItem('authToken');
  }

  isAuthenticated(): boolean {
    return !!this.getAuthToken() && !this.isTokenExpired();
  }

  private isTokenExpired(): boolean {
    const expiry = localStorage.getItem('authTokenExpiry');
    if (!expiry) return true;
    return Date.now() > parseInt(expiry, 10);
  }

  getCurrentUserId(): string {
    const user = this.getCurrentUser();
    return user?.id || "null";
  }

  getUserType(): UserType {
    const userData = this.getCurrentUser();
    
    if (userData?.type) {
      return userData.type;
    }

    if (userData?.merchantName) {
      return UserType.MERCHANT;
    }
    return UserType.EMPLOYEE;
  }

  isEmployee(): boolean {
    return !this.isMerchant();
  }

 
  isMerchant(): boolean {
    const roles = localStorage.getItem('roles');
    if (roles) {
      const rolesArray = JSON.parse(roles) as string[];
      return rolesArray.includes('Merchant');
    }
    return false;
  }

  updateUserData(updates: Partial<UserData>): void {
    const currentData = this.getCurrentUser() || {};
    const updatedData = { ...currentData, ...updates };
    localStorage.setItem('userData', JSON.stringify(updatedData));
  }

  getPermissions(): string[] {
    const permissions = localStorage.getItem('permissions');
    return permissions ? JSON.parse(permissions) : [];
  }

  setPermissions(permissions: string[]): void {
    localStorage.setItem('permissions', JSON.stringify(permissions));
  }

  getCurrentUserRole(): string | null {
  const userData = this.getCurrentUser();
  const roles = localStorage.getItem('roles');
  
  if (roles) {
    const rolesArray = JSON.parse(roles) as string[];
    
    if (rolesArray.includes('Merchant')) {
      return 'Merchant';
    } else if (rolesArray.includes('Courier')) {
      return 'Courier';
    } else {
      return 'Employee';
    }
  }
  
  return null;
}

}