import { Component, OnInit } from '@angular/core';
import { Product } from '../../../models/Product.interface';
import { ToastrService } from 'ngx-toastr';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService } from '../../../core/services/Product.Service';

@Component({
  selector: 'app-product',
  templateUrl: './product.component.html',
  styleUrls: ['./product.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class ProductComponent implements OnInit {
  products: Product[] = [];
  selectedProduct: Product | null = null;
  loading = false;

  constructor(
    private productService: ProductService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadProducts();
  }

  loadProducts(): void {
    this.loading = true;
    this.productService.getProducts().subscribe({
      next: (data) => {
        this.products = data;
        this.loading = false;
      },
      error: () => {
        this.toastr.error('فشل تحميل المنتجات');
        this.loading = false;
      }
    });
  }

  addProduct(product: Product): void {
    this.productService.addProduct(product).subscribe({
      next: () => {
        this.toastr.success('تم إضافة المنتج بنجاح');
        this.loadProducts();
      },
      error: () => this.toastr.error('فشل إضافة المنتج')
    });
  }

  updateProduct(product: Product): void {
    if (!product.id) return;
    this.productService.updateProduct(product.id, product).subscribe({
      next: () => {
        this.toastr.success('تم تعديل المنتج بنجاح');
        this.loadProducts();
      },
      error: () => this.toastr.error('فشل تعديل المنتج')
    });
  }

  deleteProduct(id: number): void {
    if (!confirm('هل أنت متأكد من حذف المنتج؟')) return;
    this.productService.deleteProduct(id).subscribe({
      next: () => {
        this.toastr.success('تم حذف المنتج');
        this.loadProducts();
      },
      error: () => this.toastr.error('فشل حذف المنتج')
    });
  }

  selectProduct(product: Product): void {
    this.selectedProduct = { ...product };
  }

  clearSelection(): void {
    this.selectedProduct = null;
  }
}