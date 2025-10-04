import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { City } from '../../../models/City.interface';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { ToastrService } from 'ngx-toastr';
import { NgSelectModule } from '@ng-select/ng-select';
import { AuthService } from '../../../core/services/auth.service';
import { RoleService } from '../../../core/services/role.service';
@Component({
  selector: 'app-city',
  imports: [FormsModule, CommonModule, NgSelectModule],
  templateUrl: './city.component.html',
  styleUrls: ['./city.component.css'],
  standalone: true,
})
export class CityComponent implements OnInit {
  cities: City[] = [];
  allCities: City[] = [];
  selectedCity: Partial<City> = this.emptyCity();
  regions: { id: number; governorate: string }[] = [];
  showModal = false;
  isEditMode = false;
  deletingId: number | null = null;
  PageNumber: number = 1;
  pageSize: number = 5;
  totalItems: number = 0;
  totalPages: number = 1;

  role: string = "";
  userPermissions: string[] = [];

  constructor(
    private toastr: ToastrService,
    private unitOfWork: UnitOfWorkServices ,
    private auth: AuthService,
    private roleService: RoleService
  ) {}

  ngOnInit(): void {
    this.loadUserPermissions();
    this.loadCities();
    this.loadRegions();
  }

  // Load all cities
  loadCities(): void {
    this.unitOfWork.City.getAll().subscribe({
      next: (data) => {
        this.allCities = data;
        this.totalItems = this.allCities.length;
        this.calculateTotalPages();
        this.updateCitiesForCurrentPage();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      },
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

  // Load all regions
  loadRegions(): void {
    this.unitOfWork.Region.getAllWithoutPagination().subscribe({
      next: (data) => {
        this.regions = data.map((region) => ({
          id: region.id,
          governorate: region.governorate,
        }));
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      },
    });
  }

  // Open modal for creating a new city
  openCreateModal(): void {
    this.isEditMode = false;
    this.selectedCity = this.emptyCity();
    this.showModal = true;
  }

  // Open modal for editing an existing city
  openEditModal(city: City): void {
    this.isEditMode = true;
    this.selectedCity = { ...city };
    this.showModal = true;
  }

  // Close the modal
  closeModal(): void {
    this.showModal = false;
  }

  // Save city (create or update)
  saveCity(): void {
    if (this.isEditMode) {
      this.updateCity();
    } else {
      this.createCity();
    }
  }

  // Create a new city
  createCity(): void {
    this.unitOfWork.City.create(this.selectedCity).subscribe({
      next: () => {
        this.toastr.success('تم إضافة المدينة بنجاح');
        this.loadCities();
        this.closeModal();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      },
    });
  }

  // Update an existing city
  updateCity(): void {
    this.unitOfWork.City.update(this.selectedCity.id!, this.selectedCity).subscribe({
      next: () => {
        this.toastr.success('تم تحديث المدينة بنجاح');
        this.loadCities();
        this.closeModal();
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
      },
    });
  }

  // Confirm city deletion
  confirmDelete(id: number): void {
    this.deletingId = id;
  }

  // Cancel city deletion
  cancelDelete(): void {
    this.deletingId = null;
  }

  // Delete a city
  deleteCity(id: number): void {
    this.unitOfWork.City.delete(id).subscribe({
      next: () => {
        this.toastr.success('تم حذف المدينة بنجاح');
        this.loadCities();
        this.deletingId = null;
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
        this.deletingId = null;
      },
    });
  }

  // Display cities for the current page only
  updateCitiesForCurrentPage(): void {
    const start = (this.PageNumber - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.cities = this.allCities.slice(start, end);
  }

  private calculateTotalPages(): void {
    this.totalPages = Math.ceil(this.totalItems / this.pageSize);
    if (this.totalPages === 0) this.totalPages = 1;
  }

  nextPage(): void {
    if (this.PageNumber < this.totalPages) {
      this.PageNumber++;
      this.updateCitiesForCurrentPage();
    }
  }

  prevPage(): void {
    if (this.PageNumber > 1) {
      this.PageNumber--;
      this.updateCitiesForCurrentPage();
    }
  }

  onPageSizeChange(newSize: number): void {
    this.pageSize = newSize;
    this.PageNumber = 1;
    this.calculateTotalPages();
    this.updateCitiesForCurrentPage();
  }

  private getErrorMessage(error: any): string {
    return error.message || 'حدث خطأ غير معروف';
  }

  private emptyCity(): Partial<City> {
    return {
      id: 0,
      name: '',
      standardShippingCost: 0,
      pickupShippingCost: 0,
      createdAt: new Date().toISOString(),
      regionId: undefined,
      regionName: '',
    };
  }
  searchRegion: string = '';

get filteredRegions() {
  if (!this.searchRegion) return this.regions;
  return this.regions.filter(region =>
    region.governorate.toLowerCase().includes(this.searchRegion.toLowerCase())
  );
}
}