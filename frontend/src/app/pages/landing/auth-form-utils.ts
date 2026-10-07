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
  visible: boolean,
  messages: FieldMessages,
): string | null {
  const errors = control.errors;
  if (!visible || !errors) {
    return null;
  }
  if (typeof errors['server'] === 'string') {
    return errors['server'];
  }
  const key = Object.keys(messages).find((name) => errors[name]);
  return key ? messages[key] : null;
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
