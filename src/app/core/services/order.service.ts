import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map, switchMap } from 'rxjs/operators';
import { environment } from '../../environment';
import { Order, OrderWithProductsDto, UpdateOrderDto } from '../../models/order.interface';
import { OrderStatus } from '../../models/OrderStatus.Interface';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private apiUrl = `${environment.apiUrl}/api/Order`;

   constructor(
    private http: HttpClient,
    private auth: AuthService 
  ) { }

  // Create a new order
  createOrder(order: Order): Observable<Order> {
    return this.http.post<Order>(this.apiUrl, order).pipe(
      catchError(this.handleError)
    );
  }

  // Get all orders
  getAllOrders(params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }
    
    return this.http.get<any>(this.apiUrl, { params: httpParams }).pipe(
      catchError(this.handleError)
    );
  }

  // Get order by ID
  getOrderById(id: number): Observable<UpdateOrderDto> {
    return this.http.get<UpdateOrderDto>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Get orders by status
  getOrdersByStatus(status: OrderStatus | null, params?: any): Observable<any> {
    let httpParams = new HttpParams();
    
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    let url = this.apiUrl;
    
    if (status === null) {
      url = this.apiUrl;
    } else if (status === OrderStatus.WaitingForConfirmation) {
      url = `${this.apiUrl}/GetAllWaitingOrders`;
    } else {
      url = `${this.apiUrl}/GetAllOrdersByStatus`;
      httpParams = httpParams.set('status', status.toString());
    }

    return this.http.get<any>(url, { params: httpParams })
      .pipe(
        map(response => {
          // Handle different response formats
          const items = response.items || response || [];
          const totalItems = response.totalItems || items.length || 0;
          const pageSize = parseInt(params?.PageSize || '10', 10);
          const totalPages = response.totalPages || Math.ceil(totalItems / pageSize) || 1;
          
          return {
            items,
            totalItems,
            totalPages
          };
        }),
        catchError(this.handleError)
      );
  }

  // Update order status only
  updateOrderStatus(orderId: number, status: OrderStatus): Observable<any> {
    const statusValue = typeof status === 'string' ? parseInt(status as string, 10) : status;
    const payload = {
      id: orderId,
      status: statusValue
    };
    
    return this.http.post(`${this.apiUrl}/UpdateStatus/${orderId}?status=${statusValue}`, null)
      .pipe(
        tap(response => {
          console.log('Status update successful:', response);
        }),
        catchError(this.handleError)
      );
  }

  // Add new method for courier assignment
  assignOrderToCourier(orderId: number, courierId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/AssignOrderToCourier/${orderId}/${courierId}`, null)
      .pipe(
        tap(response => {
          console.log('Courier assignment successful:', response);
        }),
        catchError(this.handleError)
      );
  }
  getOrderForEdit(id: number): Observable<UpdateOrderDto> {
  return this.http.get<UpdateOrderDto>(`${this.apiUrl}/GetOrderForEdit/${id}`).pipe(
    catchError(this.handleError)
  );
}
  // Update order (full update or partial)
  updateOrder(id: number, order: any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, order)
      .pipe(
        catchError(this.handleError)
      );
  }

  // Delete order
  deleteOrder(id: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`).pipe(
      catchError(this.handleError)
    );
  }

  // Error handling method
  private handleError(error: HttpErrorResponse) {
    console.error('API Error:', error);
    
    let errorMessage = 'حدث خطأ في النظام';
    
    if (error.error instanceof ErrorEvent) {
      errorMessage = `خطأ: ${error.error.message}`;
    } else {
      if (error.status === 400) {
        if (error.error?.errors) {
          const validationErrors = Object.values(error.error.errors)
            .flat()
            .join(', ');
          errorMessage = `خطأ في التحقق: ${validationErrors}`;
        } else if (error.error?.message) {
          errorMessage = error.error.message;
        } else {
          errorMessage = 'خطأ في البيانات المرسلة';
        }
      } else if (error.status === 404) {
        errorMessage = 'الطلب غير موجود';
      } else if (error.status === 500) {
        errorMessage = 'خطأ في الخادم';
      }
    }

    return throwError(() => new Error(errorMessage));
  }

  getOrdersByMerchantId(merchantId: string, params?: any): Observable<any> {
      let httpParams = new HttpParams();
      
      if (params) {
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            httpParams = httpParams.set(key, params[key].toString());
          }
        });
      }
      
      const url = `${this.apiUrl}/GetAllOrdersByMerchantId`;
      return this.http.get<any>(url, { 
        params: httpParams.set('merchantId', merchantId) 
      });
    }
    getOrdersByCourierId(courierId: string, params?: any): Observable<any> {
      let httpParams = new HttpParams();
      
      if (params) {
        Object.keys(params).forEach(key => {
          if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
            httpParams = httpParams.set(key, params[key].toString());
          }
        });
      }
      
      const url = `${this.apiUrl}/GetAllOrdersByCourierId`;
      return this.http.get<any>(url, { 
        params: httpParams.set('courierId', courierId) 
      });
    }

}