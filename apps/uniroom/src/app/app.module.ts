import { APP_INITIALIZER, NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule, provideHttpClient, withInterceptors } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { TranslateModule, TranslateLoader, TranslateStore } from '@ngx-translate/core';
import { TRANSLATE_HTTP_LOADER_CONFIG, TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LocalizationService } from './services/localization.service';
import { SharedModule } from './shared/shared-module';
import { authInterceptor } from './interceptors/auth.interceptor';

export function initLocales(loc: LocalizationService): () => Promise<void> {
  return (): Promise<void> => loc.init();
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot({
      navAnimation: undefined
    }),
    TranslateModule.forRoot({
      loader: { provide: TranslateLoader, useClass: TranslateHttpLoader }
    }),
    AppRoutingModule,
    SharedModule
  ],
  providers: [
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: { prefix: './assets/i18n/', suffix: '.json' }
    },
    { provide: APP_INITIALIZER, useFactory: initLocales, deps: [LocalizationService], multi: true },
    TranslateStore,
    provideHttpClient(withInterceptors([authInterceptor]))
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
