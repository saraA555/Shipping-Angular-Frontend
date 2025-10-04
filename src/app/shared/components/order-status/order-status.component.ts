import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { PageHeaderComponent } from "../page-header/page-header.component";
import { RouterModule } from '@angular/router';
import { OrderStatus } from '../../../models/OrderStatus.Interface';
import { OrderWithProductsDto } from '../../../models/order.interface';
import { catchError, finalize, tap, switchMap } from 'rxjs/operators';
import { of } from 'rxjs';
import { CourierService } from '../../../core/services/Courier.Service';
import { CourierDTO } from '../../../models/Courier.interface';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-order-status',
  templateUrl: './order-status.component.html',
  styleUrls: ['./order-status.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule, RouterModule,]
})
export class OrderStatusComponent implements OnInit {
  orders: OrderWithProductsDto[] = [];
  allOrders: OrderWithProductsDto[] = [];
  loading = false;
  showStatusModal = false;
  currentPage = 1;
  pageSize = 10;
  totalItems = 0;
  totalPages = 0;
  
  selectedOrder: OrderWithProductsDto | null = null;
  newStatus: OrderStatus | null = null;
  currentStatus: OrderStatus | null = null;
  searchTerm = '';
  availableCouriers: CourierDTO[] = [];
  selectedCourierId: string | null = null;
  
  role: string = "";
  userPermissions: string[] = [];

  showDeleteConfirmation = false;
  deletingOrderId: number | null = null;

  OrderStatus = OrderStatus;

  statusOptions = [
    { value: OrderStatus.Pending, label: 'قيد الانتظار' },
    { value: OrderStatus.WaitingForConfirmation, label: 'في انتظار التأكيد' },
    { value: OrderStatus.InProgress, label: 'قيد التنفيذ' },
    { value: OrderStatus.Delivered, label: 'تم التسليم' },
    { value: OrderStatus.DeliveredToCourier, label: 'تم التسليم للمندوب' },
    { value: OrderStatus.Declined, label: 'مرفوض' },
    { value: OrderStatus.UnreachableCustomer, label: 'لا يمكن الوصول' },
    { value: OrderStatus.PartialDelivery, label: 'تم التسليم جزئياً' },
    { value: OrderStatus.CanceledByRecipient, label: 'تم الإلغاء من المستلم' },
    { value: OrderStatus.DeclinedWithPartialPayment, label: 'مرفوض مع دفع جزئي' },
    { value: OrderStatus.DeclinedWithFullPayment, label: 'مرفوض مع دفع كامل' }
  ];
  
  showCourierModal = false;
  isAssigning = false;

  constructor(
    private fb: FormBuilder,
    private _unitOfWork: UnitOfWorkServices,
    private toastr: ToastrService,
    private courierService: CourierService,
    private auth: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadOrders();
  }

  loadUserPermissions(): void {
    this.userPermissions = this.auth.getPermissions();
    if (this.userPermissions.length === 0) {
      this.roleService.getCurrentUserPermissions().subscribe({
        next: (permissions) => {
          this.userPermissions = permissions;
          this.auth.setPermissions(permissions);
        },
        error: (err) => console.error('Failed to load permissions', err)
      });
    }
  }

    hasPermission(permission: string): boolean {
      return this.userPermissions.includes(permission);
    }

loadOrders(): void {
  this.loading = true;
  const userRole = this.auth.getCurrentUserRole();
  const userId = this.auth.getCurrentUserId();

  if (userRole === 'Employee') {
    this._unitOfWork.Order.getAllOrders().subscribe({
      next: (orders) => {
        this.allOrders = orders;
        this.filterByStatus(this.currentStatus, 1);
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(this.getErrorMessage(error));
        this.loading = false;
      }
    });
  } else if (userRole === 'Merchant') {
    this._unitOfWork.Order.getOrdersByMerchantId(userId).subscribe({
      next: (orders) => {
        this.allOrders = orders;
        this.filterByStatus(this.currentStatus, 1);
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(this.getErrorMessage(error));
        this.loading = false;
      }
    });
  } else if (userRole === 'Courier') {
    this._unitOfWork.Order.getOrdersByCourierId(userId).subscribe({
      next: (orders) => {
        this.allOrders = orders;
        this.filterByStatus(this.currentStatus, 1);
        this.loading = false;
      },
      error: (error) => {
        this.toastr.error(this.getErrorMessage(error));
        this.loading = false;
      }
    });
  } else {
    this.loading = false;
    this.toastr.error('نوع المستخدم غير معروف');
  }
}
  updateOrdersForCurrentPage(): void {
    const start = (this.currentPage - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.orders = this.allOrders.slice(start, end);
  }

  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  nextPage(): void {
  if (this.currentPage < this.totalPages) {
    this.filterByStatus(this.currentStatus, this.currentPage + 1);
  }
}

prevPage(): void {
  if (this.currentPage > 1) {
    this.filterByStatus(this.currentStatus, this.currentPage - 1);
  }
}

onPageSizeChange(event: any): void {
  const newSize = parseInt(event.target.value, 10);
  if (newSize !== this.pageSize) {
    this.pageSize = newSize;
    this.filterByStatus(this.currentStatus, 1);
  }
}

  private getErrorMessage(error: any): string {
    if (error.error?.errors) {
      return Object.values(error.error.errors).join(', ');
    }
    return error.message || 'فشل في تحميل الطلبات';
  }

 filterByStatus(status: OrderStatus | null, page?: number): void {
  this.currentStatus = status;
  if (page !== undefined) {
    this.currentPage = page;
  } else {
    this.currentPage = 1;
  }
  let filtered: OrderWithProductsDto[];
  if (status === null) {
    filtered = [...this.allOrders];
  } else {
    filtered = this.allOrders.filter(order => {
      const orderStatus = typeof order.status === 'string' ? this.convertStatusToEnum(order.status) : order.status;
      return orderStatus === status;
    });
  }
  this.totalItems = filtered.length;
  this.calculateTotalPages();
  const start = (this.currentPage - 1) * this.pageSize;
  const end = start + this.pageSize;
  this.orders = filtered.slice(start, end);
}

  onSearch(): void {   
    this.currentPage = 1;
    this.searchTerm = this.searchTerm?.trim();
    this.loadOrders();
  }

  onPageChange(page: number): void {
   
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadOrders();
    }
  }
  
  getStatusLabel(status: string | OrderStatus): string {
    
    let statusValue: OrderStatus;
    
    if (typeof status === 'string') {
     
      statusValue = this.convertStatusToEnum(status);
    } else {
      statusValue = status;
    }
    
    const option = this.statusOptions.find(opt => opt.value === statusValue);
    return option ? option.label : 'غير معروف';
  }
  
  getPages(): number[] {
    const pages: number[] = [];
    const maxVisiblePages = 5;
    
    if (this.totalPages <= maxVisiblePages) {
      return Array.from({ length: this.totalPages }, (_, i) => i + 1);
    }
    
    let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = startPage + maxVisiblePages - 1;
    
    if (endPage > this.totalPages) {
      endPage = this.totalPages;
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    
    return pages;
  }


  getCustomerDetails(order: any): string {
  if (!order.customerInfo) return 'غير محدد';
  const parts = order.customerInfo.trim().split(' ');
  if (parts.length < 2) return order.customerInfo;
  const phone = parts[parts.length - 1];
  const name = parts.slice(0, parts.length - 1).join(' ');
  return `${name}<br>${phone}`;
}



  getDisplayValue(value: any, defaultValue: string = 'غير محدد'): string {
    return value || defaultValue;
  }

  
  private convertStatusToEnum(status: string): OrderStatus {
    switch(status) {
      case 'Pending': return OrderStatus.Pending;
      case 'WaitingForConfirmation': return OrderStatus.WaitingForConfirmation;
      case 'InProgress': return OrderStatus.InProgress;
      case 'Delivered': return OrderStatus.Delivered;
      case 'Declined': return OrderStatus.Declined;
      case 'DeliveredToCourier': return OrderStatus.DeliveredToCourier;
      case 'UnreachableCustomer': return OrderStatus.UnreachableCustomer;
      case 'PartialDelivery': return OrderStatus.PartialDelivery;
      case 'CanceledByRecipient': return OrderStatus.CanceledByRecipient;
      case 'DeclinedWithPartialPayment': return OrderStatus.DeclinedWithPartialPayment;
      case 'DeclinedWithFullPayment': return OrderStatus.DeclinedWithFullPayment;
      default: return OrderStatus.Pending;
    }
  }

    getStatusClass(status: OrderStatus): string {
      switch(status) {
        case OrderStatus.Pending: return 'pending';
        case OrderStatus.WaitingForConfirmation: return 'waiting';
        case OrderStatus.InProgress: return 'inprogress';
        case OrderStatus.Delivered: return 'delivered';
        case OrderStatus.Declined: return 'declined';
        case OrderStatus.DeliveredToCourier: return 'deliveredtocourier';
        case OrderStatus.UnreachableCustomer: return 'unreachable';
        case OrderStatus.PartialDelivery: return 'partial';
        case OrderStatus.CanceledByRecipient: return 'canceled';
        case OrderStatus.DeclinedWithPartialPayment: return 'declinedpartial';
        case OrderStatus.DeclinedWithFullPayment: return 'declinedfull';
        default: return 'pending';
      }
    }

  getStatusButtonClass(status: OrderStatus): string {
    if (this.selectedOrder?.status === status) {
      return 'btn-secondary disabled';
    }
    if (this.newStatus === status) {
      return this.getStatusClass(status);
    }
    return 'btn-outline-secondary';
  }

  selectStatus(status: OrderStatus): void {
   
    if (status !== this.selectedOrder?.status) {
      this.newStatus = status;
    }
  }

  openStatusModal(order: OrderWithProductsDto): void {
    this.selectedOrder = {...order}; 
    this.newStatus = order.status;
    this.showStatusModal = true;
  }

  closeStatusModal(): void {
  this.showStatusModal = false;
  this.selectedOrder = null;
  this.newStatus = null;
  }

  updateOrderStatus(): void {
    if (!this.selectedOrder || this.newStatus === null) {
      this.toastr.error('الرجاء اختيار حالة جديدة');
      return;
    }
  
    if (this.selectedOrder.status === this.newStatus) {
      this.toastr.info('لم يتم تغيير الحالة');
      this.closeStatusModal();
      return;
    }
  
    this.loading = true;
  
    
    const orderId = this.selectedOrder.id;
    const newStatus = this.newStatus;
  
    this._unitOfWork.Order.updateOrderStatus(orderId, newStatus)
      .pipe(
        tap(() => {
          this.toastr.success('تم تحديث حالة الطلب بنجاح');
          
         
          const index = this.orders.findIndex(o => o.id === orderId);
          if (index !== -1) {
            this.orders[index] = {
              ...this.orders[index],
              status: newStatus
            };
          }
          
          this.closeStatusModal();                
          this.loadOrders(); 
        }),
        catchError(error => {
          console.error('Update status error:', error);
          this.toastr.error(this.getErrorMessage(error) || 'فشل في تحديث حالة الطلب');
          return of(null);
        }),
        finalize(() => {
          this.loading = false;
        })
      )
      .subscribe();
  }

  selectAllOrders(event: any): void {
    const checked = event.target.checked;
    this.orders.forEach(order => order.selected = checked);
  }

  openDeleteConfirmation(orderId: number): void {
    this.deletingOrderId = orderId;
    this.showDeleteConfirmation = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.deletingOrderId = null;
  }

  confirmDelete(): void {
    if (this.deletingOrderId === null) return;

    this.loading = true;
    this._unitOfWork.Order.deleteOrder(this.deletingOrderId)
      .pipe(
        tap(() => {
          this.toastr.success('تم حذف الطلب بنجاح');
          this.loadOrders(); 
        }),
        catchError(error => {
          console.error('Failed to delete order:', error);
          this.toastr.error(this.getErrorMessage(error) || 'فشل في حذف الطلب');
          return of(null); 
        }),
        finalize(() => {
          this.loading = false;
          this.cancelDelete(); 
        })
      )
      .subscribe();
  }

  deleteOrder(id: number): void {
    this.openDeleteConfirmation(id);
  }
 
  canAssignCourier(order: OrderWithProductsDto): boolean {
    return Boolean(order) && 
           order.status === OrderStatus.Pending && 
           !order.courierId;
  }

  getCourierStatusText(order: OrderWithProductsDto): string {
    if (order.courierId) {
      return 'تم التعيين';
    }
    if (order.status !== OrderStatus.Pending) {
      return 'غير متاح';
    }
    return 'تعيين مندوب';
  }

  assignCourier(order: OrderWithProductsDto): void {
    if (!this.selectedCourierId || !order) {
      this.toastr.error('الرجاء اختيار مندوب');
      return;
    }
  
    const courierId = this.selectedCourierId;
    
    
    const selectedCourier = this.availableCouriers.find(c => c.Id === courierId);

    this.isAssigning = true;
  
  
    this._unitOfWork.Order.assignOrderToCourier(order.id, courierId)
      .pipe(
        switchMap(() => {
          return this._unitOfWork.Order.updateOrderStatus(order.id, OrderStatus.DeliveredToCourier);
        }),
        tap(() => {
          this.toastr.success('تم تعيين المندوب وتحديث حالة الطلب بنجاح');
          const index = this.orders.findIndex(o => o.id === order.id);
          if (index !== -1) {
            this.orders[index] = {
              ...this.orders[index],
              courierId: courierId,
              CourierName: selectedCourier?.Id || null,
              status: OrderStatus.DeliveredToCourier
            };
          }
          this.closeCourierModal();
          this.loadOrders();
        }),
        catchError(error => {
          console.error('Error assigning courier:', error);
          this.toastr.error('فشل في تعيين المندوب');
          return of(null);
        }),
        finalize(() => {
          this.isAssigning = false;
        })
      )
      .subscribe();
  }

  openCourierModal(order: OrderWithProductsDto): void {
    this.selectedOrder = order;
    this.showCourierModal = true;
    this.showStatusModal = false;
    this.selectedCourierId = null;
    this.loadCouriersByBranch(order.id);
  }

  closeCourierModal(): void {
    this.showCourierModal = false;
    this.selectedOrder = null;
    this.selectedCourierId = null;
    this.availableCouriers = [];
  }

        private loadCouriersByBranch(orderId: number): void {
        this.isAssigning = true;
        
        this.courierService.getCouriersByBranch(orderId).subscribe({
          next: (couriers) => {
            console.log('Couriers by Branch:', couriers);
            
            if (couriers && couriers.length > 0) {
              this.availableCouriers = couriers;
            } else {
             
              this.toastr.info('لا يوجد مناديب متاحين للفرع، سوف يتم تحميل مناديب المحافظة');
              this.loadCouriersByRegion(orderId);
            }
          },
          error: (err) => {
            console.error('Error fetching couriers by branch:', err);
            this.toastr.error('فشل في تحميل قائمة المندوبين للفرع');
            
            
            this.toastr.info('يتم محاولة تحميل مناديب المحافظة');
            this.loadCouriersByRegion(orderId);
          },
          complete: () => {
            this.isAssigning = false;
          }
        });
      }
        private loadCouriersByRegion(orderId: number): void {
        this.isAssigning = true;
        
        this.courierService.getCouriersByRegion(orderId).subscribe({
          next: (couriers) => {
            console.log('Couriers by Region:', couriers);
            
            if (couriers && couriers.length > 0) {
              this.availableCouriers = couriers;
            } else {
              this.toastr.warning('لا يوجد مناديب متاحين للمحافظة أيضاً');
              this.availableCouriers = [];
            }
          },
          error: (err) => {
            console.error('Error fetching couriers by region:', err);
            this.toastr.error('فشل في تحميل قائمة المندوبين للمنطقة');
            this.availableCouriers = [];
          },
          complete: () => {
            this.isAssigning = false;
          }
        });
      }
}