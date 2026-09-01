import { Directive, effect, input, TemplateRef, ViewContainerRef } from '@angular/core';

import { AuthService } from '../../core/auth/auth.service';

@Directive({
  selector: '[appHasRole]',
  standalone: true
})
export class HasRoleDirective {
  readonly appHasRole = input<string | string[] | null>(null);
  private hasView = false;

  constructor(
    private readonly authService: AuthService,
    private readonly templateRef: TemplateRef<unknown>,
    private readonly viewContainer: ViewContainerRef
  ) {
    effect(() => {
      const roles = this.appHasRole();
      const isAllowed = !roles || this.matchesRole(roles);

      if (isAllowed && !this.hasView) {
        this.viewContainer.createEmbeddedView(this.templateRef);
        this.hasView = true;
      }

      if (!isAllowed && this.hasView) {
        this.viewContainer.clear();
        this.hasView = false;
      }
    });
  }

  private matchesRole(roles: string | string[]): boolean {
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    return requiredRoles.some((role) => this.authService.hasRole(role));
  }
}
