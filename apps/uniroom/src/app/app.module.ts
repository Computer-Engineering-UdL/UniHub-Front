import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';
import { HttpClientModule } from '@angular/common/http';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { TranslateModule, TranslateLoader, TranslateStore } from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';
import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { LocalizationService } from './services/localization.service';
import { SharedModule } from './shared/shared-module';

export function initLocales(loc: LocalizationService): () => Promise<void> {
  return (): Promise<void> => loc.init();
}

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    HttpClientModule,
    IonicModule.forRoot(),
    TranslateModule.forRoot({
      defaultLanguage: 'en',
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
    TranslateStore
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
