export interface Place {
  id: string;
  name: string;
  category: 'food' | 'attraction' | 'cafe' | 'culture' | 'park' | 'hotel' | 'transit' | 'shopping' | 'nature' | 'other';
  description: string;
  address: string;
  lat: number;
  lng: number;
  rating?: number;
  priceLevel?: string;
  highlight?: string;
  photoUrl?: string;
  googlePlaceId?: string;
  isOpen?: boolean;
  userRatingsTotal?: number;
  website?: string;
  phoneNumber?: string;
  reviews?: Array<{
    author_name: string;
    rating?: number;
    text: string;
    relative_time_description?: string;
  }>;
}

export interface RouteStop {
  name: string;
  lat: number;
  lng: number;
}

export type TrafficCondition = 'Light' | 'Moderate' | 'Heavy' | 'Severe';

export interface TrafficInfo {
  condition: TrafficCondition;
  delayMinutes?: number;
  delayText?: string;
  currentDuration?: string;
  typicalDuration?: string;
  summary?: string;
  potentialDelays?: string;
  warnings?: string[];
}

export interface RouteInfo {
  origin: RouteStop;
  destination: RouteStop;
  waypoints?: RouteStop[];
  travelMode?: 'WALKING' | 'DRIVING' | 'BICYCLING' | 'TRANSIT';
  distanceText?: string;
  durationText?: string;
  summary?: string;
  traffic?: TrafficInfo;
  steps?: Array<{
    instruction: string;
    distance: string;
    duration: string;
  }>;
}

export interface LocationData {
  places: Place[];
  suggestedAction?: 'show_pins' | 'draw_route' | 'pan_to';
  route?: RouteInfo;
  suggestedFollowUps?: string[];
}

export interface GroundingChunk {
  web?: {
    uri: string;
    title: string;
  };
}

export interface GroundingMetadata {
  webSearchQueries?: string[];
  groundingChunks?: GroundingChunk[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  locationData?: LocationData | null;
  groundingMetadata?: GroundingMetadata | null;
  modelUsed?: string;
  status?: 'sending' | 'complete' | 'error';
  errorMessage?: string;
}

export interface MapState {
  center: { lat: number; lng: number };
  zoom: number;
  cityName?: string;
  userLocation?: { lat: number; lng: number } | null;
}

export type MapType = 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
