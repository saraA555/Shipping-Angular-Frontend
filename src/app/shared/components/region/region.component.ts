import { Component, OnInit } from '@angular/core';
import { RegionService } from '../../../core/services/region.service';
import { Region } from '../../../models/Region.Interface ';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { NavbarComponent } from "../navbar/navbar.component";
import { SideNavComponent } from "../side-nav/side-nav.component";
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';



@Component({
  selector: 'app-region',
  templateUrl: './region.component.html',
  styleUrls: ['./region.component.css'],
  imports: [FormsModule, CommonModule],
})
export class RegionComponent implements OnInit {
  regions: Region[] = [];
  allRegions: Region[] = [];
  selectedRegion: Region = this.emptyRegion();
  showModal = false;
  isEditMode = false;
  deletingId: number | null = null;

  role: string = "";
  userPermissions: string[] = [];

   PageNumber: number = 1;
   pageSize: number = 5;
   totalItems: number = 0;
   totalPages: number = 1;

  constructor(
    private toastr: ToastrService,
    private _UnitOfWorkServices: UnitOfWorkServices,
    private auth: AuthService,
    private roleService: RoleService
    
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadRegions();
  }

  loadRegions(): void {
    this._UnitOfWorkServices.Region.getAllWithoutPagination().subscribe({
      next: (regions) => {
        this.allRegions = regions;
        this.totalItems = this.allRegions.length;
        this.calculateTotalPages();
        this.updateRegionsForCurrentPage();
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


  updateRegionsForCurrentPage(): void {
    const start = (this.PageNumber - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.regions = this.allRegions.slice(start, end);
  }

  // Pagination methods
  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  nextPage(): void {
    if (this.PageNumber < this.totalPages) {
      this.PageNumber++;
      this.updateRegionsForCurrentPage();
    }
  }
  
  prevPage(): void {
    if (this.PageNumber > 1) {
      this.PageNumber--;
      this.updateRegionsForCurrentPage();
    }
  }
  
  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.PageNumber = 1;
    this.calculateTotalPages();
    this.updateRegionsForCurrentPage();
  }

  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedRegion = this.emptyRegion();
    this.showModal = true;
  }

  openEditModal(region: Region): void {
    this.isEditMode = true;
    this.selectedRegion = { ...region };
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
  }

  handleSubmit(): void {
    if (this.isEditMode) {
      this._UnitOfWorkServices.Region.update(this.selectedRegion.id, this.selectedRegion)
        .subscribe({
          next: () => {
            this.toastr.success('تم تحديث المنطقة بنجاح', 'نجاح');
            this.loadRegions();
            this.closeModal();
          },
          error: (err) => {
            this.toastr.error('فشل في تحديث المنطقة', 'خطأ');
            console.error('Update error:', err);
          }
        });
    } else {
      this._UnitOfWorkServices.Region.create(this.selectedRegion)
        .subscribe({
          next: () => {
            this.toastr.success('تم إضافة المنطقة بنجاح', 'نجاح');
            this.loadRegions();
            this.closeModal();
          },
          error: (err) => {
            this.toastr.error('فشل في إضافة المنطقة', 'خطأ');
            console.error('Create error:', err);
          }
        });
    }}



  private emptyRegion(): Region {
    return {
      id: 0,
      governorate: '',
      isDeleted: false,
      createdAt: new Date().toISOString()
    };
  }





  updateRegionStatus(region: Region) {
    const originalStatus = region.isDeleted;
    region.isDeleted = !region.isDeleted;  
    this._UnitOfWorkServices.Region.update(region.id, region).subscribe({
      error: (err:any) => {
        region.isDeleted = originalStatus;
        console.error('Failed to update status:', err);
        this.toastr.error('فشل في تحديث الحالة', 'خطأ');
      }
    });
  }

  toggleRegionStatus(region: Region) {
    const updatedRegion = { ...region, isDeleted: !region.isDeleted };

    this._UnitOfWorkServices.Region.update(region.id, updatedRegion).subscribe({
      next: () => {
        region.isDeleted = updatedRegion.isDeleted;
        const statusMessage = updatedRegion.isDeleted ? 'تم تعطيل المنطقة بنجاح' : 'تم تفعيل المنطقة بنجاح';
        this.toastr.success(statusMessage);
      },
      error: (err) => {
        this.toastr.error('فشل في تحديث الحالة', 'خطأ');
      }
    });
  }

  confirmDelete(id: number): void {
    this.deletingId = id;
  }

  cancelDelete(): void {
    this.deletingId = null;
  }

  deleteRegion(id: number): void {
    this._UnitOfWorkServices.Region.delete(id).subscribe({
      next: () => {
        this.toastr.success('تم حذف المنطقة بنجاح');
        this.loadRegions();
        this.deletingId = null;
      },
      error: (err) => {
        if (err.status === 500) {
          this.toastr.error('لا يمكن حذف المنطقة لأنها مرتبطة ببيانات أخرى');
        } else {
          this.toastr.error('فشل في حذف المنطقة');
        }
        this.deletingId = null;
      }
    });
  }

}