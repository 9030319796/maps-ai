import React from 'react';
import { Place } from '../types';
import {
  X,
  Star,
  MapPin,
  Clock,
  Phone,
  Globe,
  ExternalLink,
  Navigation,
  MessageSquare,
  Sparkles,
  Utensils,
  Landmark,
  Coffee,
  Trees,
  ShoppingBag,
  Building,
  Bed,
} from 'lucide-react';

interface PlaceDetailModalProps {
  place: Place | null;
  onClose: () => void;
  onAskAboutPlace: (question: string) => void;
  onGetDirections: (place: Place) => void;
}

export const PlaceDetailModal: React.FC<PlaceDetailModalProps> = ({
  place,
  onClose,
  onAskAboutPlace,
  onGetDirections,
}) => {
  if (!place) return null;

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case 'food':
        return <Utensils className="w-4 h-4 text-amber-600" />;
      case 'cafe':
        return <Coffee className="w-4 h-4 text-orange-600" />;
      case 'attraction':
      case 'culture':
        return <Landmark className="w-4 h-4 text-indigo-600" />;
      case 'park':
      case 'nature':
        return <Trees className="w-4 h-4 text-emerald-600" />;
      case 'shopping':
        return <ShoppingBag className="w-4 h-4 text-purple-600" />;
      case 'hotel':
        return <Bed className="w-4 h-4 text-rose-600" />;
      default:
        return <Building className="w-4 h-4 text-slate-600" />;
    }
  };

  const mapsSearchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${place.name} ${place.address || ''}`
  )}`;

  return (
    <div
      id="place-detail-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="place-detail-card"
        className="bg-white dark:bg-slate-900 w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header photo or category banner */}
        <div className="relative h-44 bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
          {place.photoUrl ? (
            <img
              src={place.photoUrl}
              alt={place.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center p-6 text-center">
              <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                <MapPin className="w-10 h-10 stroke-1" />
                <span className="text-xs uppercase tracking-wider font-semibold">
                  {place.category}
                </span>
              </div>
            </div>
          )}

          <button
            id="close-place-detail-btn"
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors backdrop-blur-xs"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {place.priceLevel && (
            <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/60 text-white text-xs font-semibold rounded-md backdrop-blur-xs">
              {place.priceLevel}
            </span>
          )}

          <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-slate-900/90 text-slate-900 dark:text-white rounded-md text-xs font-semibold backdrop-blur-xs shadow-xs">
            {getCategoryIcon(place.category)}
            <span className="capitalize">{place.category || 'Location'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          <div>
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight leading-snug">
                {place.name}
              </h2>
            </div>

            {/* Ratings & Status */}
            <div className="flex items-center flex-wrap gap-2.5 mt-1.5 text-sm">
              {place.rating !== undefined && (
                <div className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star className="w-4 h-4 fill-amber-400 stroke-amber-500" />
                  <span>{place.rating.toFixed(1)}</span>
                  {place.userRatingsTotal !== undefined && (
                    <span className="text-slate-400 text-xs font-normal">
                      ({place.userRatingsTotal.toLocaleString()})
                    </span>
                  )}
                </div>
              )}

              {place.isOpen !== undefined && (
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                    place.isOpen
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300'
                  }`}
                >
                  <Clock className="w-3 h-3 mr-1" />
                  {place.isOpen ? 'Open Now' : 'Closed'}
                </span>
              )}

              <span className="text-xs text-slate-400">
                {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
              </span>
            </div>
          </div>

          {/* Description */}
          {place.description && (
            <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              {place.description}
            </p>
          )}

          {/* Highlight / Special Tip */}
          {place.highlight && (
            <div className="p-3 bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 rounded-xl flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Special Highlight / Insider Tip
                </p>
                <p className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
                  {place.highlight}
                </p>
              </div>
            </div>
          )}

          {/* Address & Meta */}
          <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400">
            {place.address && (
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                <span className="leading-normal">{place.address}</span>
              </div>
            )}

            {place.phoneNumber && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a
                  href={`tel:${place.phoneNumber}`}
                  className="hover:text-blue-600 transition-colors"
                >
                  {place.phoneNumber}
                </a>
              </div>
            )}

            {place.website && (
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <a
                  href={place.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 dark:text-blue-400 hover:underline truncate"
                >
                  Visit Website
                </a>
              </div>
            )}
          </div>

          {/* Reviews snippet if available */}
          {place.reviews && place.reviews.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Verified Visitor Review
              </p>
              <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {place.reviews[0].author_name}
                  </span>
                  <span>{place.reviews[0].relative_time_description}</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 italic line-clamp-3">
                  "{place.reviews[0].text}"
                </p>
              </div>
            </div>
          )}

          {/* Quick AI Prompts */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              Ask AI about this place
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                id="ask-must-try-btn"
                onClick={() => {
                  onAskAboutPlace(`What are the top must-try items, dishes, or sights at ${place.name}?`);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 text-left"
              >
                🍜 Must-try items
              </button>
              <button
                id="ask-best-time-btn"
                onClick={() => {
                  onAskAboutPlace(`What is the best time of day or week to visit ${place.name} to avoid crowds?`);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 text-left"
              >
                ⏱️ Best time to visit
              </button>
              <button
                id="ask-nearby-hidden-gems-btn"
                onClick={() => {
                  onAskAboutPlace(`What are other interesting hidden gems or cafes within a 5-minute walk from ${place.name}?`);
                  onClose();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 text-slate-700 dark:text-slate-300 transition-colors border border-transparent hover:border-blue-200 dark:hover:border-blue-800 text-left"
              >
                🚶 Nearby within 5 mins
              </button>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2.5">
          <a
            id="open-in-google-maps-link"
            href={mapsSearchUrl}
            target="_blank"
            rel="noreferrer"
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in Google Maps</span>
          </a>

          <button
            id="navigate-to-place-btn"
            onClick={() => {
              onGetDirections(place);
              onClose();
            }}
            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Show Route</span>
          </button>
        </div>
      </div>
    </div>
  );
};
