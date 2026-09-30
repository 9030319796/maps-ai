import React, { useState, useEffect, useCallback } from 'react';
import { Place, RouteInfo, ChatMessage, MapState } from './types';
import { Header } from './components/Header';
import { ChatPanel } from './components/ChatPanel';
import { MapContainer } from './components/MapContainer';
import { PlaceDetailModal } from './components/PlaceDetailModal';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [places, setPlaces] = useState<Place[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [activeRoute, setActiveRoute] = useState<RouteInfo | null>(null);
  const [mobileTab, setMobileTab] = useState<'both' | 'chat' | 'map'>('both');

  // Map state
  const [mapState, setMapState] = useState<MapState>({
    center: { lat: 35.6762, lng: 139.6503 }, // Tokyo by default
    zoom: 13,
    cityName: 'Tokyo',
    userLocation: null,
  });

  const [isLocating, setIsLocating] = useState(false);

  // Auto detect user location on startup or when requested
  const handleLocateUser = useCallback(() => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setMapState((prev) => ({
          ...prev,
          userLocation: coords,
          center: coords,
          cityName: 'Your Location',
        }));
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  }, []);

  // Handle City Teleport preset
  const handleCitySelect = useCallback((cityName: string, coords: { lat: number; lng: number }) => {
    setMapState((prev) => ({
      ...prev,
      center: coords,
      zoom: 13,
      cityName,
    }));
  }, []);

  // Handle Map Center changes from user panning
  const handleMapCenterChange = useCallback((center: { lat: number; lng: number }, zoom: number) => {
    setMapState((prev) => ({
      ...prev,
      center,
      zoom,
    }));
  }, []);

  // Send message to Gemini via server-side /api/chat
  const handleSendMessage = async (
    userText: string,
    model: string = 'gemini-3.8-flash',
    enableSearch: boolean = true
  ) => {
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: userText,
      timestamp: Date.now(),
      status: 'complete',
    };

    // Optimistically add user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          mapContext: {
            center: mapState.center,
            zoom: mapState.zoom,
            cityName: mapState.cityName,
            userLocation: mapState.userLocation,
          },
          model,
          enableSearch,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'model',
        content: data.text || 'Here is what I found for you.',
        timestamp: Date.now(),
        locationData: data.locationData,
        groundingMetadata: data.groundingMetadata,
        modelUsed: data.modelUsed,
        status: 'complete',
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // If places are found in response, update map markers
      if (data.locationData?.places && data.locationData.places.length > 0) {
        const newPlaces: Place[] = data.locationData.places.map((p: any, idx: number) => ({
          id: p.id || `place-${Date.now()}-${idx}`,
          name: p.name,
          category: p.category || 'other',
          description: p.description || '',
          address: p.address || '',
          lat: Number(p.lat),
          lng: Number(p.lng),
          rating: p.rating ? Number(p.rating) : undefined,
          priceLevel: p.priceLevel,
          highlight: p.highlight,
        }));

        setPlaces(newPlaces);

        // If mobile, switch to map momentarily or let user see both
        if (window.innerWidth < 768) {
          // Keep user informed
        }
      }

      // If route is suggested, plot it
      if (data.locationData?.route) {
        setActiveRoute(data.locationData.route);
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: 'model',
        content:
          'Sorry, I encountered an issue retrieving real-time map data. Please check your connection and try again.',
        timestamp: Date.now(),
        status: 'error',
        errorMessage: err?.message,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear chat history
  const handleClearChat = () => {
    setMessages([]);
    setPlaces([]);
    setActiveRoute(null);
    setSelectedPlace(null);
  };

  // Triggered when user wants directions to a specific place
  const handleGetDirectionsToPlace = (destPlace: Place) => {
    const originCoords = mapState.userLocation || mapState.center;
    setActiveRoute({
      origin: {
        name: mapState.userLocation ? 'Your Location' : 'Current Map Center',
        lat: originCoords.lat,
        lng: originCoords.lng,
      },
      destination: {
        name: destPlace.name,
        lat: destPlace.lat,
        lng: destPlace.lng,
      },
      travelMode: 'WALKING',
    });
    // On mobile, switch to map view so they can see the route
    if (window.innerWidth < 768) {
      setMobileTab('map');
    }
  };

  return (
    <div id="app-root-container" className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 font-sans">
      {/* Header with City Presets and Mobile Toggle */}
      <Header
        activeTab={mobileTab}
        onTabChange={setMobileTab}
        onCitySelect={handleCitySelect}
        currentCityName={mapState.cityName}
      />

      {/* Main Workspace Layout */}
      <main className="flex-1 flex overflow-hidden relative">
        {/* Chat Panel (Left on Desktop, conditional on Mobile) */}
        <div
          id="chat-panel-sidebar"
          className={`w-full md:w-[440px] lg:w-[480px] shrink-0 h-full ${
            mobileTab === 'map' ? 'hidden md:flex' : 'flex'
          }`}
        >
          <ChatPanel
            messages={messages}
            isLoading={isLoading}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            onSelectPlace={(place) => {
              setSelectedPlace(place);
              if (window.innerWidth < 768) {
                setMobileTab('map');
              }
            }}
            selectedPlaceId={selectedPlace?.id}
            onShowRoute={(route) => {
              setActiveRoute(route);
              if (window.innerWidth < 768) {
                setMobileTab('map');
              }
            }}
            mapCityName={mapState.cityName}
            userLocation={mapState.userLocation ?? null}
            onLocateUser={handleLocateUser}
          />
        </div>

        {/* Interactive Map (Right on Desktop, conditional on Mobile) */}
        <div
          id="map-stage-area"
          className={`flex-1 h-full relative ${
            mobileTab === 'chat' ? 'hidden md:block' : 'block'
          }`}
        >
          <MapContainer
            places={places}
            selectedPlace={selectedPlace}
            onSelectPlace={setSelectedPlace}
            activeRoute={activeRoute}
            onClearRoute={() => setActiveRoute(null)}
            onMapCenterChange={handleMapCenterChange}
            userLocation={mapState.userLocation ?? null}
            onLocateUser={handleLocateUser}
            isLocating={isLocating}
          />
        </div>
      </main>

      {/* Place Detail Modal */}
      {selectedPlace && (
        <PlaceDetailModal
          place={selectedPlace}
          onClose={() => setSelectedPlace(null)}
          onAskAboutPlace={(question) => {
            handleSendMessage(question);
            if (window.innerWidth < 768) {
              setMobileTab('chat');
            }
          }}
          onGetDirections={handleGetDirectionsToPlace}
        />
      )}
    </div>
  );
}
