import { Component, inject, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { FieldMessages, applyServerErrors, errorMessage, matches, notBlank } from './auth-form-utils';

@Component({
  selector: 'app-register-form',
  imports: [ReactiveFormsModule],
  templateUrl: './register-form.html',
  styleUrl: './auth-form.scss',
})
export class RegisterForm {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly switchForm = output<void>();

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);

  protected readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.minLength(3), Validators.maxLength(30)],
    }),
    email: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.email, Validators.maxLength(120)],
    }),
    displayName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(60)] }),
    password: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.minLength(8), Validators.maxLength(72)],
    }),
    confirmPassword: new FormControl('', { nonNullable: true, validators: [notBlank, matches('password')] }),
  });

  private readonly messages: Record<string, FieldMessages> = {
    username: {
      required: 'Obavezno polje.',
      minlength: 'Najmanje 3 znaka.',
      maxlength: 'Najviše 30 znakova.',
    },
    email: {
      required: 'Obavezno polje.',
      email: 'Email nije ispravan.',
      maxlength: 'Najviše 120 znakova.',
    },
    displayName: { maxlength: 'Najviše 60 znakova.' },
    password: {
      required: 'Obavezno polje.',
      minlength: 'Lozinka mora imati najmanje 8 znakova.',
      maxlength: 'Lozinka može imati najviše 72 znaka.',
    },
    confirmPassword: { required: 'Obavezno polje.', mismatch: 'Lozinke se ne poklapaju.' },
  };

  constructor() {
    this.form.controls.password.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.form.controls.confirmPassword.updateValueAndValidity());
  }

  protected error(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    return errorMessage(control, control.touched || this.submitted(), this.messages[name]);
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { username, email, displayName, password } = this.form.getRawValue();
    this.serverError.set(null);
    this.submitting.set(true);
    this.auth.register({ username, email, displayName, password }).subscribe({
      next: () => void this.router.navigateByUrl('/turniri'),
      error: (error: unknown) => {
        const apiError = toApiError(error);
        applyServerErrors(this.form, apiError.fieldErrors);
        this.serverError.set(apiError.message);
        this.submitting.set(false);
      },
    });
  }
}
