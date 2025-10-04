import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { RoleService } from '../../../core/services/role.service';
import { RoleResponseDTO, CreateRoleRequestDTO, Permission } from '../../../models/roles.interface';
import Swal from 'sweetalert2';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-role',
  templateUrl: './permission.component.html',
  styleUrls: ['./permission.component.css'],
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class RoleComponent implements OnInit {
  roles: RoleResponseDTO[] = [];
  permissionsList: Permission[] = [
  {
    name: 'الحسابات',
    add: 'Accounts:AddAccounts',
    view: 'Accounts:ViewAccounts',
    update: 'Accounts:UpdateAccounts',
    delete: 'Accounts:DeleteAccounts'
  },
  {
    name: 'اعدادات الوزن',
    add: 'Settings:AddSettings',
    view: 'Settings:ViewSettings',
    update: 'Settings:UpdateSettings',
    delete: 'Settings:DeleteSettings'
  },
  {
    name: 'أنواع الشحن',
    add: 'ShippingTypes:AddShippingTypes',
    view: 'ShippingTypes:ViewShippingTypes',
    update: 'ShippingTypes:UpdateShippingTypes',
    delete: 'ShippingTypes:DeleteShippingTypes'
  },
  {
    name: 'الصلاحيات',
    add: 'Permissions:AddPermissions',
    view: 'Permissions:ViewPermissions',
    update: 'Permissions:UpdatePermissions',
    delete: 'Permissions:DeletePermissions'
  },
  {
    name: 'البنوك',
    add: 'Bank:AddBank',
    view: 'Bank:ViewBank',
    update: 'Bank:UpdateBank',
    delete: 'Bank:DeleteBank'
  },
  {
    name: 'الخزن',
    add: 'MoneySafe:AddMoneySafe',
    view: 'MoneySafe:ViewMoneySafe',
    update: 'MoneySafe:UpdateMoneySafe',
    delete: 'MoneySafe:DeleteMoneySafe'
  },
  {
    name: 'الموظفين',
    add: 'Employees:AddEmployees',
    view: 'Employees:ViewEmployees',
    update: 'Employees:UpdateEmployees',
    delete: 'Employees:DeleteEmployees'
  },
  {
    name: 'التجار',
    add: 'Merchants:AddMerchants',
    view: 'Merchants:ViewMerchants',
    update: 'Merchants:UpdateMerchants',
    delete: 'Merchants:DeleteMerchants'
  },
  {
    name: 'المناديب',
    add: 'Couriers:AddCouriers',
    view: 'Couriers:ViewCouriers',
    update: 'Couriers:UpdateCouriers',
    delete: 'Couriers:DeleteCouriers'
  },
  {
    name: 'المناطق',
    add: 'Regions:AddRegions',
    view: 'Regions:ViewRegions',
    update: 'Regions:UpdateRegions',
    delete: 'Regions:DeleteRegions'
  },
  {
    name: 'المدن',
    add: 'Cities:AddCities',
    view: 'Cities:ViewCities',
    update: 'Cities:UpdateCities',
    delete: 'Cities:DeleteCities'
  },
  {
    name: 'الفروع',
    add: 'Branches:AddBranches',
    view: 'Branches:ViewBranches',
    update: 'Branches:UpdateBranches',
    delete: 'Branches:DeleteBranches'
  },
  {
    name: 'الطلبات',
    add: 'Orders:AddOrders',
    view: 'Orders:ViewOrders',
    update: 'Orders:UpdateOrders',
    delete: 'Orders:DeleteOrders'
  },
  {
    name: 'تقارير الشحنات',
    add: 'OrderReports:AddOrderReports',
    view: 'OrderReports:ViewOrderReports',
    update: 'OrderReports:UpdateOrderReports',
    delete: 'OrderReports:DeleteOrderReports'
  }
];

  paginatedRoles: RoleResponseDTO[] = [];
  roleForm!: FormGroup;
  loading = false;
  error: string | null = null;
  showDeleteConfirmation = false;
  roleToDelete: RoleResponseDTO | null = null;
  currentPage = 1;
  totalPages = 1;
  displayCount = 10;

  editMode = false;
  currentRoleId: string | null = null;

    role: string = "";
    userPermissions: string[] = [];

  constructor(private roleService: RoleService, private fb: FormBuilder , private auth: AuthService) {
    this.initForm();
    
  }

  private initForm(): void {
    this.roleForm = this.fb.group({
      roleName: ['', [Validators.required, Validators.minLength(3)]],
      permissions: [[]]
    });
  }

  resetForm(): void {
    this.editMode = false;
    this.currentRoleId = null;
    this.roleForm.reset({
      roleName: '',
      permissions: []
    });
    this.error = null;
  }

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadRoles();
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


  loadRoles(): void {
    this.loading = true;
    this.roleService.getAllRoles().subscribe(
      (roles) => {
        this.roles = roles;
        this.paginateRoles();
        this.loading = false;
      },
      (error) => {
        this.error = 'فشل تحميل الصلاحيات. يرجى المحاولة مرة أخرى.';
        this.loading = false;
      }
    );
  }

  getPageNumbers(): number[] {
    const totalPages = this.totalPages;
    const currentPage = this.currentPage;
    const pages: number[] = [];
    
    pages.push(1);
    
    const start = Math.max(2, currentPage - 2);
    const end = Math.min(totalPages - 1, currentPage + 2);
    
    if (start > 2) {
      pages.push(-1);
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    if (end < totalPages - 1) {
      pages.push(-1);
    }
    
    if (totalPages > 1) {
      pages.push(totalPages);
    }
    
    return pages;
  }

  onSearch(event: any): void {
    const query = event.target.value.toLowerCase();
    this.roles = this.roles.filter((role) => role.roleName.toLowerCase().includes(query));
  }

  onSubmit(): void {
    if (this.roleForm.valid) {
      const roleData: CreateRoleRequestDTO = {
        roleName: this.roleForm.value.roleName.trim(),
        permissions: this.roleForm.value.permissions || []
      };

      this.loading = true;

      if (this.editMode && this.currentRoleId) {
        this.roleService.updateRole(this.currentRoleId, roleData).subscribe({
          next: (response) => {
            this.loading = false;
            this.resetForm();
            this.loadRoles();
            
            const modalElement = document.getElementById('roleModal');
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement!);
            modal?.hide();
            
            Swal.fire({
              title: 'تم التحديث بنجاح',
              text: 'تم تحديث الصلاحية بنجاح',
              icon: 'success',
              confirmButtonColor: '#0f2a46',
              confirmButtonText: 'حسناً'
            });
          },
          error: (error) => {
            this.loading = false;
            this.error = 'فشل في تحديث الصلاحية: ' + (error.error?.message || error.message);
          }
        });
      } else {
        this.roleService.createRole(roleData).subscribe({
          next: (response) => {
            this.loading = false;
            this.resetForm();
            this.loadRoles();
            
            const modalElement = document.getElementById('roleModal');
            const modal = (window as any).bootstrap.Modal.getInstance(modalElement!);
            modal?.hide();
            
            Swal.fire({
              title: 'تم الإضافة بنجاح',
              text: 'تم إنشاء الصلاحية الجديدة بنجاح',
              icon: 'success',
              confirmButtonColor: '#0f2a46',
              confirmButtonText: 'حسناً'
            });
          },
          error: (error) => {
            this.loading = false;
            this.error = 'فشل في إنشاء الصلاحية: ' + (error.error?.message || error.message);
          }
        });
      }
    } else {
      Object.keys(this.roleForm.controls).forEach(key => {
        const control = this.roleForm.get(key);
        control?.markAsTouched();
      });
      
      this.error = 'الرجاء ملء جميع الحقول المطلوبة بشكل صحيح';
    }
  }

  onPermissionChange(event: Event, permission: string): void {
    const checkbox = event.target as HTMLInputElement;
    let currentPermissions = [...(this.roleForm.get('permissions')?.value || [])];
    
    if (checkbox.checked) {
      if (!currentPermissions.includes(permission)) {
        currentPermissions.push(permission);
      }
    } else {
      currentPermissions = currentPermissions.filter(p => p !== permission);
    }
    
    this.roleForm.patchValue({ permissions: currentPermissions });
  }

  editRole(role: RoleResponseDTO): void {
    this.editMode = true;
    this.currentRoleId = role.roleId;
    
    this.roleService.getRoleById(role.roleId).subscribe({
      next: (roleDetails) => {
        this.roleForm.patchValue({
          roleName: roleDetails.roleName,
          permissions: roleDetails.permissions
        });
      },
      error: (error) => {
        console.error('Error loading role details:', error);
        this.error = 'فشل تحميل تفاصيل الصلاحية';
      }
    });
  }

      openDeleteConfirmation(role: RoleResponseDTO): void {
        this.roleToDelete = role;
        this.showDeleteConfirmation = true;
      }

      closeDeleteConfirmation(): void {
        this.showDeleteConfirmation = false;
        this.roleToDelete = null;
      }

      deleteRoleConfirmed(): void {
        if (!this.roleToDelete) return;
        
        this.roleService.deleteRole(this.roleToDelete.roleId).subscribe(
          () => {
            this.loadRoles();
            this.closeDeleteConfirmation();
            Swal.fire({
              title: 'تم الحذف بنجاح',
              text: 'تم حذف الصلاحية بنجاح',
              icon: 'success',
              confirmButtonColor: '#0f2a46',
              confirmButtonText: 'حسناً'
            });
          },
          (error) => {
            this.error = 'فشل حذف الصلاحية. يرجى المحاولة مرة أخرى.';
            Swal.fire({
              title: 'خطأ',
              text: 'فشل حذف الصلاحية: ' + error.message,
              icon: 'error',
              confirmButtonColor: '#e74c3c',
              confirmButtonText: 'حسناً'
            });
          }
        );
      }

  changePage(page: number): void {
    if (page < 1 || page > this.totalPages) return;
    this.currentPage = page;
    this.paginateRoles();
  }

  paginateRoles(): void {
    this.totalPages = Math.ceil(this.roles.length / this.displayCount);
    this.paginatedRoles = this.roles.slice(
      (this.currentPage - 1) * this.displayCount, 
      this.currentPage * this.displayCount
    );
  }

  setDisplayCount(count: number): void {
    this.displayCount = count;
    this.currentPage = 1;
    this.paginateRoles();
  }
}