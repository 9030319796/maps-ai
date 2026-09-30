import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Place, RouteInfo, MapType } from '../types';
import { loadGoogleMaps, enrichPlaceWithGoogleData } from '../utils/googleMapsLoader';
import {
  Layers,
  Locate,
  Car,
  Train,
  Bike,
  Compass,
  Search,
  Route,
  Navigation,
  X,
  Plus,
  Minus,
  Sparkles,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  Gauge,
  ArrowRight,
} from 'lucide-react';

interface MapContainerProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place | null) => void;
  activeRoute: RouteInfo | null;
  onClearRoute?: () => void;
  onMapCenterChange?: (center: { lat: number; lng: number }, zoom: number) => void;
  userLocation: { lat: number; lng: number } | null;
  onLocateUser: () => void;
  isLocating: boolean;
}

// Marker pin color by category
const getCategoryColor = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'food':
      return '#ea580c'; // orange
    case 'cafe':
      return '#d97706'; // amber
    case 'attraction':
    case 'culture':
      return '#4f46e5'; // indigo
    case 'park':
    case 'nature':
      return '#059669'; // emerald
    case 'shopping':
      return '#9333ea'; // purple
    case 'hotel':
      return '#e11d48'; // rose
    case 'transit':
      return '#2563eb'; // blue
    default:
      return '#2563eb'; // blue
  }
};

// Create a custom SVG marker pin
const createMarkerIcon = (color: string, label: string | number, isSelected: boolean) => {
  const size = isSelected ? 42 : 34;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 42" width="${size}" height="${size}">
      <defs>
        <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.35"/>
        </filter>
      </defs>
      <path d="M16 0C7.163 0 0 7.163 0 16c0 11.2 14.4 24.8 15.1 25.5.5.5 1.3.5 1.8 0 .7-.7 15.1-14.3 15.1-25.5C32 7.163 24.837 0 16 0z" 
        fill="${color}" 
        stroke="${isSelected ? '#FFFFFF' : '#FFFFFF'}" 
        stroke-width="${isSelected ? '2.5' : '1.5'}"
        filter="url(#shadow)"
      />
      <circle cx="16" cy="15" r="9.5" fill="#FFFFFF"/>
      <text x="16" y="19" font-size="11" font-family="system-ui, -apple-system, sans-serif" font-weight="bold" fill="${color}" text-anchor="middle">
        ${label}
      </text>
    </svg>
  `;

  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size),
  };
};

export const MapContainer: React.FC<MapContainerProps> = ({
  places,
  selectedPlace,
  onSelectPlace,
  activeRoute,
  onClearRoute,
  onMapCenterChange,
  userLocation,
  onLocateUser,
  isLocating,
}) => {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const userMarkerRef = useRef<google.maps.Marker | null>(null);
  const directionsRendererRef = useRef<google.maps.DirectionsRenderer | null>(null);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  // Layers
  const trafficLayerRef = useRef<google.maps.TrafficLayer | null>(null);
  const transitLayerRef = useRef<google.maps.TransitLayer | null>(null);
  const bicyclingLayerRef = useRef<google.maps.BicyclingLayer | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [currentMapType, setCurrentMapType] = useState<MapType>('roadmap');
  const [showTraffic, setShowTraffic] = useState(false);
  const [showTransit, setShowTransit] = useState(false);
  const [showBicycling, setShowBicycling] = useState(false);
  const [showLayersMenu, setShowLayersMenu] = useState(false);

  // Search input on map
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Route stats with real-time traffic details
  const [routeSummary, setRouteSummary] = useState<{
    distance: string;
    duration: string;
    typicalDuration?: string;
    mode: string;
    originName?: string;
    destName?: string;
    delayMinutes?: number;
    trafficCondition?: 'Light' | 'Moderate' | 'Heavy' | 'Severe';
    summary?: string;
    potentialDelays?: string;
  } | null>(null);

  // Initialize Google Maps
  useEffect(() => {
    let isMounted = true;

    loadGoogleMaps()
      .then((googleObj) => {
        if (!isMounted || !mapRef.current) return;

        // Default to Tokyo if no previous location
        const defaultCenter = { lat: 35.6762, lng: 139.6503 };

        const map = new googleObj.maps.Map(mapRef.current, {
          center: defaultCenter,
          zoom: 13,
          mapTypeId: googleObj.maps.MapTypeId.ROADMAP,
          fullscreenControl: false,
          streetViewControl: true,
          mapTypeControl: false,
          zoomControl: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'on' }],
            },
          ],
        });

        mapInstanceRef.current = map;
        placesServiceRef.current = new googleObj.maps.places.PlacesService(map);
        directionsServiceRef.current = new googleObj.maps.DirectionsService();
        infoWindowRef.current = new googleObj.maps.InfoWindow();

        const renderer = new googleObj.maps.DirectionsRenderer({
          map,
          suppressMarkers: false,
          polylineOptions: {
            strokeColor: '#2563EB',
            strokeWeight: 5,
            strokeOpacity: 0.85,
          },
        });
        directionsRendererRef.current = renderer;

        // Listen to map center change
        map.addListener('idle', () => {
          const center = map.getCenter();
          const zoom = map.getZoom();
          if (center && zoom !== undefined && onMapCenterChange) {
            onMapCenterChange({ lat: center.lat(), lng: center.lng() }, zoom);
          }
        });

        setMapLoaded(true);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Google Maps loading error:', err);
        setMapError(err.message || 'Failed to initialize Google Maps.');
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Handle ResizeObserver on map container
  useEffect(() => {
    if (!mapRef.current || !mapInstanceRef.current) return;
    const observer = new ResizeObserver(() => {
      if (mapInstanceRef.current && (window as any).google?.maps) {
        google.maps.event.trigger(mapInstanceRef.current, 'resize');
      }
    });
    observer.observe(mapRef.current);
    return () => observer.disconnect();
  }, [mapLoaded]);

  // Update Markers when `places` change
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !(window as any).google?.maps) return;
    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    if (places.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    places.forEach((place, index) => {
      if (typeof place.lat !== 'number' || typeof place.lng !== 'number') return;
      const position = { lat: place.lat, lng: place.lng };
      bounds.extend(position);

      const isSelected = selectedPlace?.id === place.id;
      const color = getCategoryColor(place.category);

      const marker = new google.maps.Marker({
        position,
        map,
        title: place.name,
        icon: createMarkerIcon(color, index + 1, isSelected),
        animation: google.maps.Animation.DROP,
        zIndex: isSelected ? 999 : 100 + index,
      });

      marker.addListener('click', async () => {
        onSelectPlace(place);

        // Enrich with real-time Google Places data if missing
        if (placesServiceRef.current && !place.googlePlaceId && !place.photoUrl) {
          try {
            const enriched = await enrichPlaceWithGoogleData(
              placesServiceRef.current,
              place.name,
              place.lat,
              place.lng
            );
            if (enriched) {
              const photo = enriched.photos?.[0]?.getUrl?.({ maxWidth: 600, maxHeight: 400 });
              onSelectPlace({
                ...place,
                googlePlaceId: enriched.place_id || place.googlePlaceId,
                address: enriched.formatted_address || place.address,
                rating: enriched.rating ?? place.rating,
                userRatingsTotal: enriched.user_ratings_total ?? place.userRatingsTotal,
                isOpen: enriched.opening_hours?.isOpen?.() ?? place.isOpen,
                photoUrl: photo || place.photoUrl,
                website: enriched.website || place.website,
                phoneNumber: enriched.formatted_phone_number || place.phoneNumber,
                reviews: enriched.reviews?.map((r) => ({
                  author_name: r.author_name,
                  rating: r.rating,
                  text: r.text,
                  relative_time_description: r.relative_time_description,
                })),
              });
            }
          } catch (e) {
            console.warn('Could not enrich place data:', e);
          }
        }
      });

      markersRef.current.push(marker);
    });

    // Auto fit bounds to show all markers with smooth animation
    if (places.length > 1) {
      map.fitBounds(bounds, { top: 70, right: 70, bottom: 70, left: 70 });
    } else if (places.length === 1) {
      map.panTo({ lat: places[0].lat, lng: places[0].lng });
      map.setZoom(15);
    }
  }, [places, mapLoaded]);

  // Highlight selected place marker
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current) return;
    places.forEach((place, idx) => {
      const marker = markersRef.current[idx];
      if (marker) {
        const isSelected = selectedPlace?.id === place.id;
        const color = getCategoryColor(place.category);
        marker.setIcon(createMarkerIcon(color, idx + 1, isSelected));
        marker.setZIndex(isSelected ? 999 : 100 + idx);
        if (isSelected) {
          mapInstanceRef.current?.panTo({ lat: place.lat, lng: place.lng });
        }
      }
    });
  }, [selectedPlace, mapLoaded, places]);

  // Update user location marker
  useEffect(() => {
    if (!mapLoaded || !mapInstanceRef.current || !(window as any).google?.maps) return;
    const map = mapInstanceRef.current;

    if (userLocation) {
      if (!userMarkerRef.current) {
        userMarkerRef.current = new google.maps.Marker({
          position: userLocation,
          map,
          title: 'You are here',
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 8,
            fillColor: '#3B82F6',
            fillOpacity: 1,
            strokeColor: '#FFFFFF',
            strokeWeight: 3,
          },
          zIndex: 1000,
        });
      } else {
        userMarkerRef.current.setPosition(userLocation);
      }
      map.panTo(userLocation);
    } else if (userMarkerRef.current) {
      userMarkerRef.current.setMap(null);
      userMarkerRef.current = null;
    }
  }, [userLocation, mapLoaded]);

  // Render active route
  useEffect(() => {
    if (!mapLoaded || !directionsRendererRef.current || !directionsServiceRef.current) return;
    const renderer = directionsRendererRef.current;
    const service = directionsServiceRef.current;

    if (!activeRoute) {
      renderer.set('directions', null);
      setRouteSummary(null);
      return;
    }

    const travelMode =
      activeRoute.travelMode === 'DRIVING'
        ? google.maps.TravelMode.DRIVING
        : activeRoute.travelMode === 'TRANSIT'
        ? google.maps.TravelMode.TRANSIT
        : google.maps.TravelMode.WALKING;

    // Automatically enable Google Maps traffic overlay when driving route is loaded
    if (travelMode === google.maps.TravelMode.DRIVING && mapInstanceRef.current) {
      if (!trafficLayerRef.current) {
        trafficLayerRef.current = new google.maps.TrafficLayer();
      }
      trafficLayerRef.current.setMap(mapInstanceRef.current);
      setShowTraffic(true);
    }

    const request: google.maps.DirectionsRequest = {
      origin: new google.maps.LatLng(activeRoute.origin.lat, activeRoute.origin.lng),
      destination: new google.maps.LatLng(activeRoute.destination.lat, activeRoute.destination.lng),
      waypoints: activeRoute.waypoints?.map((wp) => ({
        location: new google.maps.LatLng(wp.lat, wp.lng),
        stopover: true,
      })),
      travelMode,
      ...(travelMode === google.maps.TravelMode.DRIVING
        ? {
            drivingOptions: {
              departureTime: new Date(),
              trafficModel: google.maps.TrafficModel.BEST_GUESS,
            },
          }
        : {}),
    };

    service.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        renderer.setDirections(result);
        const leg = result.routes[0]?.legs[0];
        if (leg) {
          const legWithTraffic = leg as any;
          const liveDuration =
            legWithTraffic.duration_in_traffic?.text ||
            activeRoute.traffic?.currentDuration ||
            leg.duration?.text ||
            '';
          const typicalDuration =
            leg.duration?.text || activeRoute.traffic?.typicalDuration || '';

          let delayMinutes = activeRoute.traffic?.delayMinutes || 0;
          if (legWithTraffic.duration_in_traffic?.value && leg.duration?.value) {
            delayMinutes = Math.max(
              0,
              Math.round((legWithTraffic.duration_in_traffic.value - leg.duration.value) / 60)
            );
          }

          let trafficCondition = activeRoute.traffic?.condition || 'Light';
          if (!activeRoute.traffic?.condition && travelMode === google.maps.TravelMode.DRIVING) {
            if (delayMinutes >= 15) trafficCondition = 'Severe';
            else if (delayMinutes >= 6) trafficCondition = 'Heavy';
            else if (delayMinutes >= 2) trafficCondition = 'Moderate';
            else trafficCondition = 'Light';
          }

          setRouteSummary({
            distance: leg.distance?.text || activeRoute.distanceText || '',
            duration: liveDuration,
            typicalDuration,
            mode: activeRoute.travelMode || 'WALKING',
            originName: activeRoute.origin.name,
            destName: activeRoute.destination.name,
            delayMinutes,
            trafficCondition,
            summary:
              activeRoute.traffic?.summary ||
              activeRoute.summary ||
              (result.routes[0]?.summary ? `via ${result.routes[0].summary}` : ''),
            potentialDelays: activeRoute.traffic?.potentialDelays,
          });
        }
      } else {
        console.warn('Directions request failed:', status);
      }
    });
  }, [activeRoute, mapLoaded]);

  // Toggle Traffic Layer
  const toggleTraffic = () => {
    if (!mapInstanceRef.current || !(window as any).google?.maps) return;
    if (!trafficLayerRef.current) {
      trafficLayerRef.current = new google.maps.TrafficLayer();
    }
    const nextState = !showTraffic;
    trafficLayerRef.current.setMap(nextState ? mapInstanceRef.current : null);
    setShowTraffic(nextState);
  };

  // Toggle Transit Layer
  const toggleTransit = () => {
    if (!mapInstanceRef.current || !(window as any).google?.maps) return;
    if (!transitLayerRef.current) {
      transitLayerRef.current = new google.maps.TransitLayer();
    }
    const nextState = !showTransit;
    transitLayerRef.current.setMap(nextState ? mapInstanceRef.current : null);
    setShowTransit(nextState);
  };

  // Toggle Bicycling Layer
  const toggleBicycling = () => {
    if (!mapInstanceRef.current || !(window as any).google?.maps) return;
    if (!bicyclingLayerRef.current) {
      bicyclingLayerRef.current = new google.maps.BicyclingLayer();
    }
    const nextState = !showBicycling;
    bicyclingLayerRef.current.setMap(nextState ? mapInstanceRef.current : null);
    setShowBicycling(nextState);
  };

  // Switch Map Type
  const switchMapType = (type: MapType) => {
    if (!mapInstanceRef.current || !(window as any).google?.maps) return;
    setCurrentMapType(type);
    mapInstanceRef.current.setMapTypeId(type);
  };

  // Handle Search Input directly on the map
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim() || !placesServiceRef.current || !mapInstanceRef.current) return;

    setIsSearching(true);
    placesServiceRef.current.textSearch(
      {
        query: searchQuery,
        location: mapInstanceRef.current.getCenter() || undefined,
        radius: 10000,
      },
      (results, status) => {
        setIsSearching(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && results && results.length > 0) {
          const first = results[0];
          if (first.geometry?.location) {
            mapInstanceRef.current?.panTo(first.geometry.location);
            mapInstanceRef.current?.setZoom(15);
          }
        }
      }
    );
  };

  return (
    <div id="interactive-map-wrapper" className="relative w-full h-full flex flex-col overflow-hidden bg-slate-100 dark:bg-slate-950">
      {/* Map Canvas */}
      <div id="google-map-canvas" ref={mapRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {!mapLoaded && !mapError && (
        <div id="map-loading-indicator" className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 z-30">
          <div className="w-9 h-9 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Initializing Real-Time Google Maps...
          </p>
        </div>
      )}

      {/* Error Overlay */}
      {mapError && (
        <div id="map-error-notice" className="absolute inset-0 bg-white dark:bg-slate-900 p-6 flex flex-col items-center justify-center text-center z-30">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/40 text-rose-600 rounded-full mb-3">
            <Compass className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">
            Google Maps Notice
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1 mb-4">
            {mapError}
          </p>
          <button
            id="retry-map-load-btn"
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white text-xs font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-xs"
          >
            Retry Loading Map
          </button>
        </div>
      )}

      {/* Top Search & Place Finder Bar */}
      <div className="absolute top-3 left-3 right-16 sm:right-auto sm:w-80 z-20">
        <form
          id="map-places-search-form"
          onSubmit={handleSearchSubmit}
          className="flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800/80 overflow-hidden px-3 py-1.5 focus-within:ring-2 focus-within:ring-blue-500/40"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            id="map-search-input"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Google Maps..."
            className="w-full bg-transparent px-2.5 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {isSearching && (
            <RefreshCw className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
          )}
        </form>
      </div>

      {/* Active Route & Live Traffic Floating HUD */}
      {routeSummary && (
        <div
          id="route-summary-badge"
          className="absolute top-16 left-3 right-3 sm:right-auto sm:w-96 z-20 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-blue-200/80 dark:border-blue-900/60 space-y-2 animate-in fade-in slide-in-from-top-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs shrink-0">
                {routeSummary.mode === 'DRIVING' ? (
                  <Car className="w-4 h-4" />
                ) : (
                  <Navigation className="w-4 h-4" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-xs font-bold text-slate-900 dark:text-white">
                    {routeSummary.duration}
                  </span>
                  <span className="text-xs text-slate-400">({routeSummary.distance})</span>

                  {/* Traffic condition badge if driving */}
                  {routeSummary.mode === 'DRIVING' && routeSummary.trafficCondition && (
                    <span
                      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold border ${
                        routeSummary.trafficCondition === 'Light'
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300'
                          : routeSummary.trafficCondition === 'Moderate'
                          ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300'
                          : routeSummary.trafficCondition === 'Heavy'
                          ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300 border-orange-300'
                          : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300'
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          routeSummary.trafficCondition === 'Light'
                            ? 'bg-emerald-500'
                            : routeSummary.trafficCondition === 'Moderate'
                            ? 'bg-amber-500'
                            : routeSummary.trafficCondition === 'Heavy'
                            ? 'bg-orange-500'
                            : 'bg-rose-500'
                        }`}
                      />
                      {routeSummary.trafficCondition} Traffic
                    </span>
                  )}
                </div>

                {/* Delay indicator or typical duration */}
                {routeSummary.mode === 'DRIVING' ? (
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    {routeSummary.delayMinutes && routeSummary.delayMinutes > 0 ? (
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ +{routeSummary.delayMinutes} min delay vs normal ({routeSummary.typicalDuration})
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        🟢 Traffic flowing smoothly
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500 capitalize">
                    {routeSummary.mode.toLowerCase()} directions plotted
                  </p>
                )}
              </div>
            </div>

            {onClearRoute && (
              <button
                id="clear-route-btn"
                onClick={onClearRoute}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                title="Clear Route"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Route path summary & Traffic layer quick toggle */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
            {routeSummary.originName && routeSummary.destName ? (
              <div className="flex items-center gap-1.5 truncate max-w-[200px] text-slate-600 dark:text-slate-300">
                <span className="truncate">{routeSummary.originName}</span>
                <ArrowRight className="w-3 h-3 shrink-0 text-slate-400" />
                <span className="truncate">{routeSummary.destName}</span>
              </div>
            ) : (
              <span className="text-slate-400 truncate max-w-[200px]">
                {routeSummary.summary || 'Live route active'}
              </span>
            )}

            <button
              id="hud-toggle-traffic-btn"
              onClick={toggleTraffic}
              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shrink-0 ${
                showTraffic
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              <Car className="w-3 h-3" />
              Traffic {showTraffic ? 'ON' : 'OFF'}
            </button>
          </div>
        </div>
      )}

      {/* Top-Right Control Buttons */}
      <div className="absolute top-3 right-3 z-20 flex flex-col gap-2">
        {/* Layer control toggle */}
        <div className="relative">
          <button
            id="map-layers-toggle-btn"
            onClick={() => setShowLayersMenu(!showLayersMenu)}
            className="p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-slate-700 dark:text-slate-200 rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Map Layers & Views"
          >
            <Layers className="w-4 h-4" />
          </button>

          {showLayersMenu && (
            <div
              id="map-layers-dropdown"
              className="absolute right-0 top-12 w-52 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 text-xs space-y-1 z-30"
            >
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Map View
              </p>
              <button
                id="map-type-roadmap-btn"
                onClick={() => switchMapType('roadmap')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-medium transition-colors ${
                  currentMapType === 'roadmap'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Roadmap</span>
                {currentMapType === 'roadmap' && <span className="text-xs">✓</span>}
              </button>
              <button
                id="map-type-satellite-btn"
                onClick={() => switchMapType('satellite')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-medium transition-colors ${
                  currentMapType === 'satellite'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Satellite</span>
                {currentMapType === 'satellite' && <span className="text-xs">✓</span>}
              </button>
              <button
                id="map-type-terrain-btn"
                onClick={() => switchMapType('terrain')}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left font-medium transition-colors ${
                  currentMapType === 'terrain'
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>Terrain</span>
                {currentMapType === 'terrain' && <span className="text-xs">✓</span>}
              </button>

              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                Real-Time Overlays
              </p>

              <button
                id="toggle-traffic-layer-btn"
                onClick={toggleTraffic}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                  showTraffic
                    ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Car className="w-3.5 h-3.5" />
                  <span>Live Traffic</span>
                </div>
                {showTraffic && <span>ON</span>}
              </button>

              <button
                id="toggle-transit-layer-btn"
                onClick={toggleTransit}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                  showTransit
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Train className="w-3.5 h-3.5" />
                  <span>Public Transit</span>
                </div>
                {showTransit && <span>ON</span>}
              </button>

              <button
                id="toggle-bicycling-layer-btn"
                onClick={toggleBicycling}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-colors ${
                  showBicycling
                    ? 'bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-400 font-semibold'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bike className="w-3.5 h-3.5" />
                  <span>Bicycle Routes</span>
                </div>
                {showBicycling && <span>ON</span>}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom-Right Map Controls: Zoom & Location */}
      <div className="absolute bottom-6 right-3 z-20 flex flex-col gap-2">
        <button
          id="locate-me-btn"
          onClick={onLocateUser}
          disabled={isLocating}
          className={`p-2.5 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800/80 transition-colors ${
            userLocation
              ? 'text-blue-600 dark:text-blue-400'
              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
          }`}
          title="Find My Location (GPS)"
        >
          <Locate className={`w-4 h-4 ${isLocating ? 'animate-pulse text-blue-500' : ''}`} />
        </button>

        <div className="flex flex-col bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl shadow-lg border border-slate-200/80 dark:border-slate-800/80 overflow-hidden">
          <button
            id="map-zoom-in-btn"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 13) + 1);
              }
            }}
            className="p-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-b border-slate-100 dark:border-slate-800 transition-colors"
            title="Zoom In"
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            id="map-zoom-out-btn"
            onClick={() => {
              if (mapInstanceRef.current) {
                mapInstanceRef.current.setZoom((mapInstanceRef.current.getZoom() || 13) - 1);
              }
            }}
            className="p-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            title="Zoom Out"
          >
            <Minus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Markers Count Indicator pill (when places are plotted) */}
      {places.length > 0 && (
        <div className="absolute bottom-6 left-3 z-20 pointer-events-none">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900/85 text-white backdrop-blur-md rounded-xl text-xs font-semibold shadow-lg">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>{places.length} places marked on map</span>
          </div>
        </div>
      )}
    </div>
  );
};
