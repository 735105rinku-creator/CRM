import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ImageCropperService } from '../../../shared/services/image-cropper.service';

@Component({
  selector: 'app-register-company',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-company.component.html',
  styleUrl: './register-company.component.scss'
})
export class RegisterCompanyComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly imageCropper = inject(ImageCropperService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly logoPreview = signal('');
  protected readonly selectedPlanCode = signal('basic');
  protected readonly countryCodes = [
    { code: '+91', label: 'India (+91)' },
    { code: '+1', label: 'USA/Canada (+1)' },
    { code: '+44', label: 'UK (+44)' },
    { code: '+971', label: 'UAE (+971)' },
    { code: '+61', label: 'Australia (+61)' }
  ];
  private selectedLogoFile: File | undefined;

  protected readonly registerForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    adminCountryCode: ['+91', [Validators.required]],
    mobileNo: ['', [Validators.required, Validators.pattern(/^[0-9\s-]{7,15}$/)]],
    password: ['', [Validators.required, Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=]).{8,32}$/)]],
    confirmPassword: ['', [Validators.required]],
    companyName: ['', [Validators.required, Validators.minLength(2)]],
    companyCode: ['', [Validators.required, Validators.pattern(/^[A-Z0-9_-]{3,20}$/)]],
    companyPan: ['', [Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)]],
    companyGst: ['', [Validators.pattern(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/)]],
    industry: ['', [Validators.required]],
    employeeCount: ['', [Validators.required]],
    companyEmail: ['', [Validators.required, Validators.email]],
    companyCountryCode: ['+91', [Validators.required]],
    companyPhone: ['', [Validators.required, Validators.pattern(/^[0-9\s-]{7,15}$/)]],
    country: ['India', [Validators.required]],
    registeredAddress: ['', [Validators.required]],
    website: ['', [Validators.pattern(/^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/)]],
    acceptTerms: [false, [Validators.requiredTrue]]
  }, { validators: this.passwordsMatch });

  constructor() {
    const plan = this.route.snapshot.queryParamMap.get('plan') || 'basic';
    this.selectedPlanCode.set(plan.toLowerCase());
    this.registerForm.controls.companyCode.disable();
    this.registerForm.controls.companyName.valueChanges.subscribe((companyName) => {
      this.registerForm.controls.companyCode.setValue(this.generateCompanyCode(companyName), {
        emitEvent: false
      });
    });
  }

  protected submit(): void {
    if (this.registerForm.invalid || this.isLoading()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');
    const value = this.registerForm.getRawValue();
    const companyCode = value.companyCode || this.generateCompanyCode(value.companyName);

    this.authService.registerCompany({
      companyName: value.companyName.trim(),
      companyCode,
      companyEmail: value.companyEmail.trim().toLowerCase(),
      companyPhone: value.companyPhone.trim(),
      companyCountryCode: value.companyCountryCode,
      country: value.country.trim(),
      adminName: value.fullName.trim(),
      adminEmail: value.email.trim().toLowerCase(),
      adminMobile: value.mobileNo.trim(),
      adminCountryCode: value.adminCountryCode,
      password: value.password,
      confirmPassword: value.confirmPassword,
      acceptTerms: value.acceptTerms,
      companyPan: value.companyPan.trim().toUpperCase() || undefined,
      companyGst: value.companyGst.trim().toUpperCase() || undefined,
      industry: value.industry.trim(),
      employeeCount: value.employeeCount,
      registeredAddress: value.registeredAddress.trim(),
      website: this.normalizeWebsite(value.website),
      logo: this.selectedLogoFile
    }).subscribe({
      next: (response) => {
        this.successMessage.set(response.message || 'Registration successful. Continue to checkout.');
        this.isLoading.set(false);
        void this.router.navigate(['/checkout'], {
          queryParams: {
            plan: this.selectedPlanCode(),
            email: value.email.trim().toLowerCase(),
            registered: '1'
          }
        });
      },
      error: (error: { error?: { message?: string; errors?: Array<{ message?: string }> } }) => {
        this.errorMessage.set(
          error.error?.message ||
            error.error?.errors?.[0]?.message ||
            'Unable to register company right now.'
        );
        this.isLoading.set(false);
      }
    });
  }

  private normalizeWebsite(website: string): string | undefined {
    const trimmedWebsite = website.trim();

    if (!trimmedWebsite) {
      return undefined;
    }

    return /^https?:\/\//i.test(trimmedWebsite) ? trimmedWebsite : `https://${trimmedWebsite}`;
  }

  private generateCompanyCode(companyName: string): string {
    const normalizedName = companyName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!normalizedName) {
      return '';
    }

    const prefix = normalizedName.slice(0, 4).padEnd(4, 'X');
    const checksum = Array.from(normalizedName).reduce((total, char) => total + char.charCodeAt(0), 0);
    return `${prefix}${String(checksum).slice(-4).padStart(4, '0')}`;
  }

  protected async onLogoSelected(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];

    this.selectedLogoFile = undefined;
    this.logoPreview.set('');

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Please select a valid image file for company logo.');
      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage.set('Company logo source must be 10 MB or smaller.');
      input.value = '';
      return;
    }

    let croppedFile: File | null = null;

    try {
      croppedFile = await this.imageCropper.cropImage(file, {
        title: 'Crop company logo',
        outputSize: 512,
        mimeType: file.type === 'image/png' ? 'image/png' : undefined
      });
    } catch {
      this.errorMessage.set('Unable to crop selected company logo.');
      input.value = '';
      return;
    }

    if (!croppedFile) {
      input.value = '';
      return;
    }

    if (croppedFile.size > 2 * 1024 * 1024) {
      this.errorMessage.set('Cropped company logo must be 2 MB or smaller.');
      input.value = '';
      return;
    }

    this.errorMessage.set('');
    this.selectedLogoFile = croppedFile;

    const reader = new FileReader();
    reader.onload = () => this.logoPreview.set(String(reader.result || ''));
    reader.readAsDataURL(croppedFile);
  }

  private passwordsMatch(control: AbstractControl): Record<string, boolean> | null {
    const password = control.get('password')?.value;
    const confirmPassword = control.get('confirmPassword')?.value;
    return password && confirmPassword && password !== confirmPassword ? { passwordMismatch: true } : null;
  }
}


