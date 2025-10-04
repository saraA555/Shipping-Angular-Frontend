import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShippingType } from '../../../models/ShippingType.Interface';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-shipping-type',
  imports: [FormsModule, CommonModule],
  templateUrl: './shipping-type.component.html',
  styleUrl: './shipping-type.component.css',
  standalone: true
})
export class ShippingTypeComponent implements OnInit {
  shippingTypes: ShippingType[] = [];
  selectedShippingType: ShippingType = this.emptyShippingType();
  showModal = false;
  isEditMode = false;
  deletingId: number | null = null;
  currentPage: number = 1;
  pageSize: number = 5;
  totalItems: number = 0;
  totalPages: number = 1;

   role: string = "";
   userPermissions: string[] = [];


  constructor(
    private toastr: ToastrService,
    private _UnitOfWorkServices: UnitOfWorkServices,
    private auth: AuthService,
    private roleService: RoleService
  ) { }

  ngOnInit() {
    this.loadUserPermissions();
    this.loadShippingTypes();
  }

  loadShippingTypes(): void {
    this._UnitOfWorkServices.ShippingType.getAllWithPagination(this.currentPage, this.pageSize).subscribe({
      next: (response: any) => {
        this.shippingTypes = response || [];
        this.totalItems = (this.shippingTypes.length < this.pageSize && this.currentPage === 1)
          ? this.shippingTypes.length
          : this.currentPage * this.pageSize;
        this.totalPages = (this.shippingTypes.length < this.pageSize)
          ? this.currentPage
          : this.currentPage + 1;
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
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




  
  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadShippingTypes();
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadShippingTypes();
    }
  }

  onPageSizeChange(event: any): void {
    const newSize = parseInt(event.target.value, 10) || this.pageSize;
    if (newSize !== this.pageSize) {
      this.pageSize = newSize;
      this.currentPage = 1;
      this.loadShippingTypes();
    }
  }
  
  getErrorMessage(error: any): string {
    return error.message || 'حدث خطأ غير معروف';
  }
  
  private emptyShippingType(): ShippingType {
    return {
      id: 0,
      name: '',
      baseCost: 0,
      duration: 0,
      createdAt: new Date().toISOString()
    };
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedShippingType = this.emptyShippingType();
    this.showModal = true;
  }
  openEditModal(shippingType: ShippingType): void {
    this.isEditMode = true;
    this.selectedShippingType = { ...shippingType };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  saveShippingType(): void {
    if (this.isEditMode) {
      this.updateShippingType();
    } else {
      this.createShippingType();
    }
  }

  createShippingType(): void {
    this._UnitOfWorkServices.ShippingType.create(this.selectedShippingType).subscribe({
      next: () => {
        this.toastr.success('تم إضافة نوع الشحن بنجاح');
        this.loadShippingTypes();
        this.closeModal();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
  }

  updateShippingType(): void {
    this._UnitOfWorkServices.ShippingType.update(this.selectedShippingType.id, this.selectedShippingType).subscribe({
      next: () => {
        this.toastr.success('تم تحديث نوع الشحن بنجاح');
        this.loadShippingTypes();
        this.closeModal();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
  }

  confirmDelete(id: number): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  deleteShippingType(id: number): void {
    this._UnitOfWorkServices.ShippingType.delete(id).subscribe({
      next: () => {
        this.toastr.success('تم حذف نوع الشحن بنجاح');
        this.loadShippingTypes();
        this.deletingId = null;
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
        this.deletingId = null;
      }
    });
  }
}