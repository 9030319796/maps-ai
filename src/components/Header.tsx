import React from 'react';
import { Compass, Map, MessageSquare, Sparkles, Navigation } from 'lucide-react';

interface HeaderProps {
  activeTab: 'both' | 'chat' | 'map';
  onTabChange: (tab: 'both' | 'chat' | 'map') => void;
  onCitySelect: (cityName: string, coords: { lat: number; lng: number }) => void;
  currentCityName?: string;
}

const POPULAR_CITIES = [
  { name: 'Tokyo', lat: 35.6762, lng: 139.6503 },
  { name: 'Paris', lat: 48.8566, lng: 2.3522 },
  { name: 'New York', lat: 40.7128, lng: -74.006 },
  { name: 'Rome', lat: 41.9028, lng: 12.4964 },
  { name: 'San Francisco', lat: 37.7749, lng: -122.4194 },
  { name: 'London', lat: 51.5074, lng: -0.1278 },
];

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onCitySelect,
  currentCityName,
}) => {
  return (
    <header
      id="app-top-header"
      className="h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-4 flex items-center justify-between gap-3 shrink-0 z-40"
    >
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-xs">
            <Navigation className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-sm sm:text-base tracking-tight text-slate-900 dark:text-white">
            MapChat
          </span>
        </div>

        {/* Live Status Pill */}
        <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 rounded-full text-[10px] font-semibold text-emerald-700 dark:text-emerald-300">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>Google Maps &amp; Search Grounding</span>
        </div>
      </div>

      {/* Quick City Presets */}
      <div className="hidden md:flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">
          Explore:
        </span>
        {POPULAR_CITIES.map((city) => {
          const isActive = currentCityName === city.name;
          return (
            <button
              key={city.name}
              id={`quick-city-${city.name.toLowerCase()}-btn`}
              onClick={() => onCitySelect(city.name, { lat: city.lat, lng: city.lng })}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {city.name}
            </button>
          );
        })}
      </div>

      {/* Mobile/Tablet View Toggle */}
      <div className="flex md:hidden items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
        <button
          id="mobile-view-chat-btn"
          onClick={() => onTabChange('chat')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
            activeTab === 'chat'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Chat</span>
        </button>
        <button
          id="mobile-view-map-btn"
          onClick={() => onTabChange('map')}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-colors ${
            activeTab === 'map'
              ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400'
          }`}
        >
          <Map className="w-3.5 h-3.5" />
          <span>Map</span>
        </button>
      </div>
    </header>
  );
};
