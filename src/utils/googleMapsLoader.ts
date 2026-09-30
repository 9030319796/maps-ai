// Helper for loading Google Maps JavaScript API with places, geometry, and marker libraries

export const DEFAULT_MAPS_KEY =
  import.meta.env.VITE_GOOGLE_MAPS_API_KEY || 'AIzaSyDBAbHpDiX1vrZ6WOQ6z3AweciTFP7ZsA4';

let loadPromise: Promise<typeof google> | null = null;

export function loadGoogleMaps(apiKey: string = DEFAULT_MAPS_KEY): Promise<typeof google> {
  if (typeof window !== 'undefined' && (window as any).google?.maps) {
    return Promise.resolve((window as any).google);
  }

  if (loadPromise) {
    return loadPromise;
  }

  loadPromise = new Promise((resolve, reject) => {
    const existingScript = document.getElementById('google-maps-script');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve((window as any).google));
      existingScript.addEventListener('error', (e) => reject(e));
      return;
    }

    const script = document.createElement('script');
    script.id = 'google-maps-script';
    script.type = 'text/javascript';
    script.async = true;
    script.defer = true;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places,geometry,marker&v=weekly`;

    script.onload = () => {
      if ((window as any).google?.maps) {
        resolve((window as any).google);
      } else {
        reject(new Error('Google Maps script loaded but google.maps is not available.'));
      }
    };

    script.onerror = (err) => {
      loadPromise = null;
      reject(new Error('Failed to load Google Maps script. Please check your API key and network connection.'));
    };

    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Fetch real-time place details using Google Places API (client-side)
 */
export async function enrichPlaceWithGoogleData(
  placesService: google.maps.places.PlacesService,
  placeName: string,
  lat?: number,
  lng?: number
): Promise<Partial<google.maps.places.PlaceResult> | null> {
  return new Promise((resolve) => {
    if (!placesService) {
      resolve(null);
      return;
    }

    const request: google.maps.places.TextSearchRequest = {
      query: placeName,
      ...(lat && lng
        ? {
            location: new google.maps.LatLng(lat, lng),
            radius: 5000,
          }
        : {}),
    };

    placesService.textSearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
        const topResult = results[0];
        // If place_id is available, fetch full details including reviews and hours
        if (topResult.place_id) {
          placesService.getDetails(
            {
              placeId: topResult.place_id,
              fields: [
                'name',
                'place_id',
                'formatted_address',
                'geometry',
                'rating',
                'user_ratings_total',
                'price_level',
                'opening_hours',
                'photos',
                'reviews',
                'website',
                'formatted_phone_number',
                'url',
              ],
            },
            (details, detailStatus) => {
              if (detailStatus === google.maps.places.PlacesServiceStatus.OK && details) {
                resolve(details);
              } else {
                resolve(topResult);
              }
            }
          );
        } else {
          resolve(topResult);
        }
      } else {
        resolve(null);
      }
    });
  });
}
