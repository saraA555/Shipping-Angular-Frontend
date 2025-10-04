import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Branch } from '../../../models/Branch.Interface';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { ToastrService } from 'ngx-toastr';
import { Region } from '../../../models/Region.Interface ';
import { City } from '../../../models/City.interface';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
@Component({
  selector: 'app-branch',
  imports: [FormsModule, CommonModule, NgSelectModule],
  templateUrl: './branch.component.html',
  styleUrl: './branch.component.css',
  standalone: true
})
export class BranchComponent implements OnInit {
  branches: Branch[] = [];
  regions: Region[] = [];
  cities: City[] = [];
  allCities: City[] = [];
  selectedBranch: Branch = this.emptyBranch();
  showModal = false;
  isEditMode = false;
  deletingId: number | null = null;
  role: string = "";     
  userPermissions: string[] = [];


 // Pagination properties
   PageNumber: number = 1;
   pageSize: number = 5;
   pages: number[] = [];
   hasNextPage: boolean = false;
   totalItems: number = 0;
   totalPages: number = 1;
   allBranches: Branch[] = [];
  constructor(
    private toastr: ToastrService,
    private _UnitOfWorkServices: UnitOfWorkServices,
    private auth: AuthService,
    private roleService: RoleService
  ) { }

  ngOnInit() {
    this.loadUserPermissions();
    this.loadBranches();
    this.loadRegions();
    this.loadAllCities();
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



  loadAllCities(): void {
      this._UnitOfWorkServices.City.getAll().subscribe({
        next: (data) => {
          this.allCities = data;
        },
        error: (error) => {
          const message = this.getErrorMessage(error);
          this.toastr.error(message);
        }
      });
    }
     onRegionChange(regionId: number): void {
    this.cities = this.allCities.filter(city => city.regionId === regionId);   
    this.selectedBranch.citySettingId = undefined;
  }
  loadBranches(): void {
    this._UnitOfWorkServices.Branch.getAll().subscribe({
      next: (branches) => {
        this.allBranches = branches;
        this.totalItems = this.allBranches.length;
        this.calculateTotalPages();
        this.updateBranchesForCurrentPage();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
  }
  
  loadRegions(): void {
    this._UnitOfWorkServices.Region.getAllWithoutPagination().subscribe({
      next: (data) => {
        this.regions = data;
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
  }

  searchRegion: string = '';

  get filteredRegions() {
    if (!this.searchRegion) return this.regions;
    return this.regions.filter(region =>
      region.governorate.toLowerCase().includes(this.searchRegion.toLowerCase())
    );
  }



  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }
  
 updatePageNumbers(): void {
    this.pages = [];
    
    const maxVisiblePages = 5; 
    let start = Math.max(1, this.PageNumber - Math.floor(maxVisiblePages / 2));
    let end = start + maxVisiblePages - 1;
  
    if (this.hasNextPage && end < this.PageNumber + 2) {
      end = this.PageNumber + 2;
    }
  
    start = Math.max(1, start);
    
    for (let i = start; i <= end; i++) {
      this.pages.push(i);
    }
  }
  nextPage(): void {
    if (this.PageNumber < this.totalPages) {
      this.PageNumber++;
      this.updateBranchesForCurrentPage();
    }
  }
  
  prevPage(): void {
    if (this.PageNumber > 1) {
      this.PageNumber--;
      this.updateBranchesForCurrentPage();
    }
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages && page !== this.PageNumber) {
      this.PageNumber = page;
      this.loadBranches();
    }
  }
  
  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.PageNumber = 1;
    this.calculateTotalPages();
    this.updateBranchesForCurrentPage();
  }
  
  getErrorMessage(error: any): string {
    return error.message || 'حدث خطأ غير معروف';
  }
  
  private emptyBranch(): Branch {
    return {
      id: 0,
      name: '',
      location: '',
      isDeleted: false,
      branchDate: new Date().toISOString(),
      regionName: '',
      regionId: 0,
    };
  }

  // Open modal for creating a new branch
  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedBranch = this.emptyBranch();
    this.cities = [];
    this.showModal = true;
  }

  // Open modal for editing an existing branch
 openEditModal(branch: Branch): void {
  this.isEditMode = true;
  this.selectedBranch = { ...branch };
  this.onRegionChange(this.selectedBranch.regionId); 
  this.showModal = true;
}

  // Close the modal
  closeModal(): void {
    this.showModal = false;
  }

  // Save branch (create or update)
  saveBranch(): void {
    if (this.isEditMode) {
      this.updateBranch();
    } else {
      this.createBranch();
    }
  }

  // Create a new branch
  createBranch(): void {
   
    if (this.selectedBranch.regionId) {
      const selectedRegion = this.regions.find(r => r.id === this.selectedBranch.regionId);
      if (selectedRegion) {
        this.selectedBranch.regionName = selectedRegion.governorate;
      }
      console.log('citySettingId:', this.selectedBranch.citySettingId);
    }
    
    this._UnitOfWorkServices.Branch.create(this.selectedBranch).subscribe({
      next: () => {
        this.toastr.success('تم إضافة الفرع بنجاح');
        this.loadBranches();
        this.closeModal();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
  }

  // Update an existing branch
  updateBranch(): void {
    
    if (this.selectedBranch.regionId) {
      const selectedRegion = this.regions.find(r => r.id === this.selectedBranch.regionId);
      if (selectedRegion) {
        this.selectedBranch.regionName = selectedRegion.governorate;
      }
      console.log('citySettingId:', this.selectedBranch.citySettingId);
    }
    
    this._UnitOfWorkServices.Branch.update(this.selectedBranch.id, this.selectedBranch).subscribe({
      next: () => {
        this.toastr.success('تم تحديث الفرع بنجاح');
        this.loadBranches();
        this.closeModal();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
  }

  // Confirm branch deletion
  confirmDelete(id: number): void {
    this.deletingId = id;
  }

  // Cancel branch deletion
  cancelDelete(): void {
    this.deletingId = null;
  }

  // Delete a branch
  deleteBranch(id: number): void {
    this._UnitOfWorkServices.Branch.delete(id).subscribe({
      next: () => {
        this.toastr.success('تم حذف الفرع بنجاح');
        this.loadBranches();
        this.deletingId = null;
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
        this.deletingId = null;
      }
    });
  }

  toggleBranchStatus(branch: Branch): void {
    const updatedBranch = { ...branch, isDeleted: !branch.isDeleted };
    
    this._UnitOfWorkServices.Branch.update(branch.id, updatedBranch).subscribe({
      next: () => {
        const statusMessage = updatedBranch.isDeleted ? 'تم تعطيل الفرع بنجاح' : 'تم تفعيل الفرع بنجاح';
        this.toastr.success(statusMessage);
        this.loadBranches();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      }
    });
  }

  updateBranchesForCurrentPage(): void {
    const start = (this.PageNumber - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.branches = this.allBranches.slice(start, end);
  }
}