import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { UnitOfWorkServices } from '../../../core/services/unitOfWork.service';
import { Branch } from '../../../models/Branch.Interface';
import { City } from '../../../models/City.interface'; 
import { Region } from '../../../models/Region.Interface ';
import { Merchant } from '../../../models/Merchant .Interface';
import { NgSelectModule } from '@ng-select/ng-select';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';


@Component({
  selector: 'app-merchant',
  standalone: true,
  imports: [CommonModule, FormsModule, NgSelectModule ],
  templateUrl: './merchant.component.html',
  styleUrl: './merchant.component.css'
})
export class MerchantComponent implements OnInit {
  @ViewChild('merchantForm') merchantForm!: NgForm;
  
  regions: Region[] = [];
  cities: City[] = [];
  branches: Branch[] = [];
  allCities: City[] = []
  filteredCities: City[] = [];

  merchant: Merchant = this.emptyMerchant();
  cityPrices: { [key: number]: number } = {};
  citySelections: { [key: number]: boolean } = {};
  
  isSubmitting = false;
  regionBranches: Branch[] = [];
  loadingCities = false;
  showDiscountsSection = false;
  citySearchTerm = '';

  constructor(
    private toastr: ToastrService,
    private _UnitOfWorkServices: UnitOfWorkServices,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadRegions();
    this.loadAllCities();
  }

  private emptyMerchant(): Merchant {
    return {
      email: '',
      password: '',
      fullName: '',
      phoneNumber: '',
      address: '',
      branchId: 0,
      regionId: 0,
      cityId: 0,
      storeName: '',
      specialCityCosts: []
    };
  }

  loadRegions(): void {
    this._UnitOfWorkServices.Region.getAllWithoutPagination().subscribe({
      next: (data) => { this.regions = data; },
      error: (error) => { this.toastr.error(this.getErrorMessage(error)); }
    });
  }
  loadAllCities(): void {
    this.loadingCities = true;
    this._UnitOfWorkServices.City.getAll().subscribe({
      next: (data) => {
        this.allCities = data;
        this.allCities.forEach(city => {
          this.citySelections[city.id] = false;
          this.cityPrices[city.id] = 0;
        });
        this.loadingCities = false;
      },
      error: (error) => {
        this.toastr.error('فشل في تحميل المدن');
        this.loadingCities = false;
      }
    });
  }

  filterCities(): void {
    if (!this.citySearchTerm) {
      this.filteredCities = [...this.allCities];
      return;
    }
    
    const searchTerm = this.citySearchTerm.toLowerCase().trim();
    this.filteredCities = this.allCities.filter(city => 
      city.name.toLowerCase().includes(searchTerm) || 
      (city.regionName?.toLowerCase().includes(searchTerm) ?? false)
    );
  }

  onRegionChange(): void {
    this.merchant.cityId = 0;
    this.merchant.branchId = 0;
    this.cities = [];
    this.branches = [];
    if (this.merchant.regionId) {
      this._UnitOfWorkServices.City.getByRegionId(this.merchant.regionId).subscribe({
        next: (data) => { this.cities = data; },
        error: (error) => { this.toastr.error(this.getErrorMessage(error)); }
      });
      this._UnitOfWorkServices.Branch.getBranchesByRegionId(this.merchant.regionId).subscribe({
        next: (data) => { this.regionBranches = data; },
        error: (error) => { this.toastr.error(this.getErrorMessage(error)); }
      });
    }
  }

  onCityChange(): void {
    this.merchant.branchId = 0;
    if (this.merchant.cityId) {
      this._UnitOfWorkServices.Branch.getBranchesByCitySettingId(this.merchant.cityId).subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.branches = data;
          } else {
            this.branches = this.regionBranches || [];
          }
        },
        error: (error) => { this.toastr.error(this.getErrorMessage(error)); }
      });
    } else {
      this.branches = this.regionBranches || [];
    }
  }

  toggleDiscountsSection(): void {
    this.showDiscountsSection = !this.showDiscountsSection;
  }
  
  createMerchant(): void {
    if (this.merchantForm.invalid) {
      this.toastr.error('يرجى تعبئة جميع الحقول المطلوبة بشكل صحيح');

      Object.keys(this.merchantForm.controls).forEach(key => {
        this.merchantForm.controls[key].markAsTouched();
      });
      return;
    }
    this.merchant.specialCityCosts = [];
    Object.keys(this.citySelections).forEach(key => {
      const cityId = parseInt(key);
      if (this.citySelections[cityId]) {
        this.merchant.specialCityCosts.push({
          citySettingId: cityId,
          price: this.cityPrices[cityId] || 0
        });
      }
    });

    this.isSubmitting = true;

    this._UnitOfWorkServices.Merchant.create(this.merchant).subscribe({
      next: () => {      
        this.toastr.success('تم تسجيل التاجر بنجاح');
        this.resetForm();
        this.router.navigate(['/merchants']);
      },
      error: (error) => {
        const message = this.getErrorMessage(error);
        this.toastr.error(message);
        this.isSubmitting = false;
      }
    });
  }

  resetForm(): void {
    this.merchant = this.emptyMerchant();
    this.showDiscountsSection = false;
    this.citySearchTerm = '';
   this.allCities.forEach(city => {
      this.citySelections[city.id] = false;
      this.cityPrices[city.id] = 0;
    });
    
    if (this.merchantForm) {
      this.merchantForm.resetForm();
    }
  }

  getErrorMessage(error: any): string {
    return error.message || 'حدث خطأ غير معروف';
  }
  isPriceDisabled(cityId: number): boolean {
    return !this.citySelections[cityId];
  }
}

export class RegionService {
  private apiUrl = 'http://your-api-url/regions'; 

  constructor(private http: HttpClient) {}

  getAllWithoutPagination(): Observable<Region[]> {
    return this.http.get<Region[]>(this.apiUrl);
  }
}