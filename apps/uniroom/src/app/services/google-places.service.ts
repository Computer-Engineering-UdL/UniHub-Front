import { Injectable } from '@angular/core';

export interface LocationResult {
  address: string;
  latitude: number;
  longitude: number;
}

@Injectable({
  providedIn: 'root'
})
export class LocationService {
  async reverseGeocode(lat: number, lng: number): Promise<string> {
    try {
      const response: Response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          headers: {
            'User-Agent': 'UniHub-App'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding failed');
      }

      const data: any = await response.json();

      const city: string = data.address?.city || data.address?.town || data.address?.village || '';
      const country: string = data.address?.country || '';

      return city && country ? `${city}, ${country}` : data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    } catch {
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }
}
