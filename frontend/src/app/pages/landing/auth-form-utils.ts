import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

export type FieldMessages = Record<string, string>;

export const notBlank: ValidatorFn = (control: AbstractControl): ValidationErrors | null =>
  typeof control.value !== 'string' || control.value.trim().length === 0 ? { required: true } : null;

export function matches(otherControl: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const other = control.parent?.get(otherControl);
    return other && control.value && control.value !== other.value ? { mismatch: true } : null;
  };
}

export function errorMessage(
  control: AbstractControl,
  submitted: boolean,
  messages: FieldMessages,
): string | null {
  const errors = control.errors;
  if (!errors) {
    return null;
  }
  if (typeof errors['server'] === 'string') {
    return errors['server'];
  }
  if (isEmpty(control.value)) {
    return submitted && errors['required'] ? (messages['required'] ?? null) : null;
  }
  if (!submitted && !control.touched) {
    return null;
  }
  const key = Object.keys(messages).find((name) => name !== 'required' && errors[name]);
  return key ? messages[key] : null;
}

export function focusFirstInvalid(form: FormGroup, host: HTMLElement): void {
  const name = Object.keys(form.controls).find((key) => form.controls[key].invalid);
  if (name) {
    host.querySelector<HTMLElement>(`[formcontrolname="${name}"]`)?.focus();
  }
}

function isEmpty(value: unknown): boolean {
  return typeof value !== 'string' || value.trim().length === 0;
}

export function applyServerErrors(form: FormGroup, fieldErrors: Record<string, string>): void {
  for (const [field, message] of Object.entries(fieldErrors)) {
    const control = form.get(field);
    if (control) {
      control.setErrors({ ...control.errors, server: message });
      control.markAsTouched();
    }
  }
}
