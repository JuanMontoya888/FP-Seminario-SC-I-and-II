import 'zone.js'; // 🚨 Volvemos a la importación estándar

import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptors } from '@angular/common/http'; 
import { App } from './app/app';
import { tokenInterceptor } from './app/interceptors/token.interceptor';
import { appConfig } from './app/app.config';

bootstrapApplication(App, appConfig).catch((err) => console.error(err));