import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';

import { IMAGE_CONFIG } from '@angular/common';

import {
  provideHttpClient,
  withFetch,
  withInterceptors,
} from '@angular/common/http';

import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { routes } from './app.routes';

import { tokenInterceptor } from './core/auth/token.interceptor';
import { AuthService } from './core/auth/auth.service';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideHttpClient(
      withInterceptors([tokenInterceptor]),
      withFetch(),
    ),

    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'top',
        anchorScrolling: 'enabled',
      }),
    ),

    {
      provide: IMAGE_CONFIG,
      useValue: {
        disableImageSizeWarning: true,
      },
    },
    provideClientHydration(withEventReplay()),
    provideAppInitializer(() => inject(AuthService).restoreSession()),
  ],
};
