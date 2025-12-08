import { Component, OnInit, inject } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { LocationService, LocationResult } from '../../services/google-places.service';

declare const L: any;

@Component({
  selector: 'app-location-picker',
  templateUrl: './location-picker.component.html',
  styleUrls: ['./location-picker.component.scss'],
  standalone: false
})
export class LocationPickerComponent implements OnInit {
  private readonly modalController: ModalController = inject(ModalController);
  private readonly locationService: LocationService = inject(LocationService);

  private map: any;
  private marker: any;

  selectedLocation: LocationResult | null = null;
  locationText: string = '';
  loading: boolean = false;

  ngOnInit(): void {
    setTimeout(() => {
      this.initMap();
    }, 300);
  }

  private initMap(): void {
    const defaultLat: number = 41.6176;
    const defaultLng: number = 0.62;

    this.map = L.map('map').setView([defaultLat, defaultLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(this.map);

    this.marker = L.marker([defaultLat, defaultLng], {
      draggable: true
    }).addTo(this.map);

    this.map.on('click', (e: any) => {
      const lat: number = e.latlng.lat;
      const lng: number = e.latlng.lng;
      this.marker.setLatLng([lat, lng]);
      void this.updateLocation(lat, lng);
    });

    this.marker.on('dragend', () => {
      const position = this.marker.getLatLng();
      void this.updateLocation(position.lat, position.lng);
    });

    void this.updateLocation(defaultLat, defaultLng);
  }

  private async updateLocation(lat: number, lng: number): Promise<void> {
    this.loading = true;
    this.locationText = await this.locationService.reverseGeocode(lat, lng);
    this.selectedLocation = {
      address: this.locationText,
      latitude: lat,
      longitude: lng
    };
    this.loading = false;
  }

  async confirm(): Promise<void> {
    if (this.selectedLocation) {
      await this.modalController.dismiss(this.selectedLocation, 'confirm');
    }
  }

  async cancel(): Promise<void> {
    await this.modalController.dismiss(null, 'cancel');
  }
}
