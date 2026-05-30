import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LoginComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  readonly loginForm = this.fb.group({
    username: ['', [Validators.required]],
    password: ['', [Validators.required]]
  });

  readonly loginError = signal<string>('');
  readonly isLoading = signal<boolean>(false);
  readonly showPassword = signal<boolean>(false);
  readonly submitted = signal<boolean>(false);

  showFieldError(field: 'username' | 'password'): boolean {
    let control;
    switch (field) {
      case 'username':
        control = this.loginForm.controls.username;
        break;
      case 'password':
        control = this.loginForm.controls.password;
        break;
    }
    return !!(this.submitted() && control && control.errors);
  }

  onSubmit(): void {
    this.submitted.set(true);
    this.loginError.set('');
    if (this.loginForm.invalid) return;

    this.isLoading.set(true);
    const { username, password } = this.loginForm.getRawValue();

    this.authService.login(username, password).subscribe(result => {
      this.isLoading.set(false);
      if (result.success) {
        this.router.navigate(['/dashboard']);
      } else {
        this.loginError.set(result.message);
      }
    });
  }
}

