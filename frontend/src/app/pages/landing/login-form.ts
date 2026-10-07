import { Component, ElementRef, inject, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { toApiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import {
  FieldMessages,
  applyServerErrors,
  errorMessage,
  focusFirstInvalid,
  notBlank,
} from './auth-form-utils';

@Component({
  selector: 'app-login-form',
  imports: [ReactiveFormsModule],
  templateUrl: './login-form.html',
  styleUrl: './auth-form.scss',
})
export class LoginForm {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly switchForm = output<void>();

  protected readonly submitted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly serverError = signal<string | null>(null);
  protected readonly passwordVisible = signal(false);

  protected readonly form = new FormGroup({
    usernameOrEmail: new FormControl('', { nonNullable: true, validators: [notBlank] }),
    password: new FormControl('', { nonNullable: true, validators: [notBlank] }),
  });

  private readonly messages: Record<string, FieldMessages> = {
    usernameOrEmail: { required: 'Obavezno polje.' },
    password: { required: 'Obavezno polje.' },
  };

  protected error(name: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[name];
    return errorMessage(control, this.submitted(), this.messages[name]);
  }

  protected submit(): void {
    this.submitted.set(true);
    if (this.submitting()) {
      return;
    }
    if (this.form.invalid) {
      focusFirstInvalid(this.form, this.host.nativeElement);
      return;
    }
    this.serverError.set(null);
    this.submitting.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
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
