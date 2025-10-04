import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { Branch } from '../../../models/Branch.Interface';
import { Role } from '../../../models/Role.interface';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { EmployeeDTO, EmployeeUpdateDTO } from '../../../models/Employee .interface';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';

@Component({
  selector: 'app-employee-list',
  templateUrl: './employee-list.component.html',
  styleUrls: ['./employee-list.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class EmployeeListComponent implements OnInit {
    employees: EmployeeDTO[] = [];
    allEmployees: EmployeeDTO[] = [];
    loading = false;
    selectedEmployee: EmployeeDTO | null = null;
    editForm!: FormGroup;
    showEditModal = false;
    
    branches: Branch[] = [];
    roles: Role[] = [];
    isLoadingRoles = false;
    isLoadingBranches = false;
    isSubmitting = false;

      role: string = "";
      userPermissions: string[] = [];



    // Pagination properties
    PageNumber: number = 1;
    pageSize: number = 5;
    pages: number[] = [];
    hasNextPage: boolean = false;
    totalItems: number = 0;
    totalPages: number = 1;


    showDeleteConfirmation = false;
    deletingEmployeeId: string | null = null;
    deletingEmployeeName: string = '';

  constructor(
    private fb: FormBuilder,
    private toastr: ToastrService,
    private _unitOfWork: UnitOfWorkServices,
    private auth: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadEmployees();
    this.loadBranches();
    this.loadRoles();
  }

  loadEmployees(): void {
    this.loading = true;
    this._unitOfWork.Employee.getAllEmployees().subscribe({
      next: (res) => {
        this.allEmployees = res;
        this.totalItems = this.allEmployees.length;
        this.calculateTotalPages();
        this.updateEmployeesForCurrentPage();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.toastr.error('فشل في تحميل الموظفين', 'خطأ');
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




  calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }
  
  updateEmployeesForCurrentPage(): void {
    const start = (this.PageNumber - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.employees = this.allEmployees.slice(start, end);
  }
  
  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.PageNumber = 1;
    this.calculateTotalPages();
    this.updateEmployeesForCurrentPage();
  }
  
  nextPage(): void {
    if (this.PageNumber < this.totalPages) {
      this.PageNumber++;
      this.updateEmployeesForCurrentPage();
    }
  }
  
  prevPage(): void {
    if (this.PageNumber > 1) {
      this.PageNumber--;
      this.updateEmployeesForCurrentPage();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.PageNumber) {
      this.PageNumber = page;
      this.updateEmployeesForCurrentPage();
    }
  }

  loadBranches(): void {
    this.isLoadingBranches = true;
    this._unitOfWork.Branch.getAll().subscribe({
      next: (branches) => {
        this.branches = branches;
        this.isLoadingBranches = false;
      },
      error: (err) => {
        this.isLoadingBranches = false;
        console.error('Error loading branches:', err);
      }
    });
  }

  loadRoles(): void {
    this.isLoadingRoles = true;
    this._unitOfWork.Employee.getRoles().subscribe({
      next: (roles) => {
        this.roles = roles;
        this.isLoadingRoles = false;
      },
      error: (err) => {
        this.isLoadingRoles = false;
        console.error('Error loading roles:', err);
      }
    });
  }

  openEditModal(employee: EmployeeDTO): void {
    this.selectedEmployee = employee;
    this.editForm = this.fb.group({
      fullName: [employee.fullName, Validators.required],
      phoneNumber: [employee.phoneNumber, [Validators.required, Validators.pattern(/^01[0125][0-9]{8}$/)]],
      branchId: [employee.branchId, Validators.required],
      roleId: [employee.roleId, Validators.required],
      isDeleted: [employee.isDeleted]
    });
    if (this.isLoadingBranches) {
      this.editForm.get('branchId')?.disable();
    } else {
      this.editForm.get('branchId')?.enable();
    }

    if (this.isLoadingRoles) {
      this.editForm.get('roleId')?.disable();
    } else {
      this.editForm.get('roleId')?.enable();
    }
      this.showEditModal = true;
    }

  closeEditModal(): void {
    this.showEditModal = false;
    this.selectedEmployee = null;
  }

  updateEmployee(): void {
    if (this.editForm.invalid || !this.selectedEmployee) return;  
    this.isSubmitting = true;
    const formValue = this.editForm.value;

     const updateData: EmployeeUpdateDTO = {
        id: this.selectedEmployee.id,
        fullName: formValue.fullName,
        phoneNumber: formValue.phoneNumber,
        branchId: formValue.branchId.toString(),
        roleId: formValue.roleId,
        isDeleted: formValue.isDeleted
      };

    this._unitOfWork.Employee.updateEmployee(updateData).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toastr.success('تم تحديث بيانات الموظف بنجاح', 'نجاح');
        this.closeEditModal();
        this.loadEmployees();
      },
      error: (err) => {
        this.isSubmitting = false;
        this.toastr.error('فشل في تحديث البيانات', 'خطأ');
        console.error('Error:', err);
      }
    });
  }

  openDeleteConfirmation(employee: EmployeeDTO): void {
    this.deletingEmployeeId = employee.id;
    this.deletingEmployeeName = employee.fullName;
    this.showDeleteConfirmation = true;
  }


  cancelDelete(): void {
    this.showDeleteConfirmation = false;
    this.deletingEmployeeId = null;
    this.deletingEmployeeName = '';
  }


  confirmDelete(): void {
    if (!this.deletingEmployeeId) return;
    
    this._unitOfWork.Employee.deleteEmployee(this.deletingEmployeeId).subscribe({
      next: () => {
        this.toastr.success('تم حذف الموظف بنجاح', 'نجاح');
        this.cancelDelete();
        this.loadEmployees();
      },
      error: (err) => {
        this.toastr.error('فشل في حذف الموظف', 'خطأ');
        this.cancelDelete();
      }
    });
  }
}