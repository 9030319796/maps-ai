import React, { useState } from 'react';
import { ChatMessage, Place, RouteInfo } from '../types';
import {
  Sparkles,
  User,
  MapPin,
  Star,
  Globe,
  ExternalLink,
  Navigation,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Utensils,
  Landmark,
  Coffee,
  Trees,
  ShoppingBag,
  Bed,
  Building,
  Car,
  AlertTriangle,
  Gauge,
  Zap,
} from 'lucide-react';

interface ChatMessageItemProps {
  message: ChatMessage;
  onSelectPlace: (place: Place) => void;
  selectedPlaceId?: string | null;
  onFollowUpClick: (text: string) => void;
  onShowRoute: (route: RouteInfo) => void;
}

const getCategoryIcon = (category?: string) => {
  switch (category?.toLowerCase()) {
    case 'food':
      return <Utensils className="w-3.5 h-3.5 text-orange-600" />;
    case 'cafe':
      return <Coffee className="w-3.5 h-3.5 text-amber-600" />;
    case 'attraction':
    case 'culture':
      return <Landmark className="w-3.5 h-3.5 text-indigo-600" />;
    case 'park':
    case 'nature':
      return <Trees className="w-3.5 h-3.5 text-emerald-600" />;
    case 'shopping':
      return <ShoppingBag className="w-3.5 h-3.5 text-purple-600" />;
    case 'hotel':
      return <Bed className="w-3.5 h-3.5 text-rose-600" />;
    default:
      return <Building className="w-3.5 h-3.5 text-slate-600" />;
  }
};

export const ChatMessageItem: React.FC<ChatMessageItemProps> = ({
  message,
  onSelectPlace,
  selectedPlaceId,
  onFollowUpClick,
  onShowRoute,
}) => {
  const isUser = message.role === 'user';
  const [showSources, setShowSources] = useState(false);

  const places = message.locationData?.places || [];
  const route = message.locationData?.route;
  const followUps = message.locationData?.suggestedFollowUps || [];
  const grounding = message.groundingMetadata;

  // Render markdown-like simple formatting for clean text
  const formatText = (content: string) => {
    // Split lines and render paragraphs/lists
    const lines = content.split('\n');
    return lines.map((line, idx) => {
      // Bold text formatting
      const parts = line.split(/(\*\*.*?\*\*)/g);
      const formattedParts = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-slate-900 dark:text-white">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-xs leading-relaxed text-slate-700 dark:text-slate-300 my-0.5">
            {formattedParts}
          </li>
        );
      }

      if (line.trim().startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-bold text-slate-900 dark:text-white mt-2 mb-1">
            {line.replace('### ', '')}
          </h4>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-1.5" />;
      }

      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
          {formattedParts}
        </p>
      );
    });
  };

  return (
    <div
      id={`message-${message.id}`}
      className={`flex gap-3 text-xs ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 shadow-xs ${
          isUser
            ? 'bg-blue-600 text-white'
            : 'bg-slate-900 dark:bg-blue-600 text-white dark:text-white'
        }`}
      >
        {isUser ? <User className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
      </div>

      {/* Message Body */}
      <div className={`flex flex-col gap-2 max-w-[85%] ${isUser ? 'items-end' : 'items-start'}`}>
        <div
          className={`p-3.5 rounded-2xl shadow-xs leading-relaxed ${
            isUser
              ? 'bg-blue-600 text-white rounded-tr-xs'
              : 'bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="space-y-1">{formatText(message.content)}</div>
          )}

          {/* Error notice if message failed */}
          {message.status === 'error' && (
            <p className="mt-2 text-[11px] text-rose-500 font-medium">
              {message.errorMessage || 'Failed to generate response. Please retry.'}
            </p>
          )}
        </div>

        {/* Search Grounding Sources Accordion */}
        {!isUser && grounding && (
          (grounding.webSearchQueries && grounding.webSearchQueries.length > 0) ||
          (grounding.groundingChunks && grounding.groundingChunks.length > 0)
        ) && (
          <div className="w-full bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSources(!showSources)}
              className="w-full px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Globe className="w-3 h-3 text-blue-500" />
                <span>Google Search Verified Sources</span>
              </div>
              {showSources ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {showSources && (
              <div className="px-3 pb-2.5 pt-1 border-t border-slate-200/60 dark:border-slate-800 space-y-1.5">
                {grounding.webSearchQueries && grounding.webSearchQueries.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1 text-[10px] text-slate-400">
                    <span className="font-semibold">Queries:</span>
                    {grounding.webSearchQueries.map((q, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 bg-slate-200/60 dark:bg-slate-800 rounded text-slate-600 dark:text-slate-300"
                      >
                        "{q}"
                      </span>
                    ))}
                  </div>
                )}

                {grounding.groundingChunks && (
                  <div className="space-y-1 pt-1">
                    {grounding.groundingChunks
                      .filter((c) => c.web?.uri)
                      .slice(0, 4)
                      .map((chunk, idx) => (
                        <a
                          key={idx}
                          href={chunk.web!.uri}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 hover:underline truncate"
                        >
                          <ExternalLink className="w-3 h-3 shrink-0" />
                          <span className="truncate">{chunk.web!.title || chunk.web!.uri}</span>
                        </a>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Structured Places Cards Chips (Sync with Map) */}
        {!isUser && places.length > 0 && (
          <div className="w-full space-y-2 mt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Discovered Locations ({places.length})
              </span>
              <span className="text-[10px] text-slate-400">Click to locate on map</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {places.map((place, idx) => {
                const isSelected = selectedPlaceId === place.id;
                return (
                  <div
                    key={place.id || idx}
                    id={`place-card-${place.id || idx}`}
                    onClick={() => onSelectPlace(place)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-400 dark:border-blue-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {/* Pin Number Badge */}
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5 shadow-xs">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                            {place.name}
                          </h5>
                          {getCategoryIcon(place.category)}
                        </div>

                        {place.address && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {place.address}
                          </p>
                        )}

                        {place.highlight && (
                          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium mt-1 line-clamp-1">
                            ★ {place.highlight}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1">
                      {place.rating && (
                        <div className="flex items-center gap-0.5 text-amber-500 font-semibold text-[11px]">
                          <Star className="w-3 h-3 fill-amber-400 stroke-amber-500" />
                          <span>{place.rating.toFixed(1)}</span>
                        </div>
                      )}
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-medium hover:underline flex items-center gap-0.5">
                        <MapPin className="w-3 h-3" />
                        View
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Route & Real-Time Traffic Card if generated */}
        {!isUser && route && (
          <div className="w-full p-3.5 bg-gradient-to-br from-blue-50/80 to-slate-50/80 dark:from-slate-900 dark:to-blue-950/30 border border-blue-200/80 dark:border-blue-900/60 rounded-2xl space-y-3 shadow-xs">
            {/* Header */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="p-1 rounded-lg bg-blue-600 text-white shrink-0 shadow-xs">
                  {route.travelMode === 'DRIVING' ? (
                    <Car className="w-3.5 h-3.5" />
                  ) : (
                    <Navigation className="w-3.5 h-3.5" />
                  )}
                </span>
                <div className="min-w-0">
                  <h5 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                    {route.travelMode === 'DRIVING' ? 'Driving Route & Traffic' : 'Planned Route'}
                  </h5>
                  <span className="text-[10px] text-slate-400">
                    Mode: {route.travelMode || 'Walking'}
                  </span>
                </div>
              </div>

              <button
                id="plot-route-btn"
                onClick={() => onShowRoute(route)}
                className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-lg transition-colors shadow-xs shrink-0 flex items-center gap-1"
              >
                <Navigation className="w-3 h-3" />
                Plot On Map
              </button>
            </div>

            {/* Origin -> Destination Line */}
            <div className="flex items-center gap-2 p-2 bg-white/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/50 dark:border-slate-700/50 text-xs">
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {route.origin.name}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 dark:text-white truncate">
                {route.destination.name}
              </span>
            </div>

            {/* Real-Time Google Maps Traffic Information Panel */}
            {route.traffic && (
              <div className="p-2.5 bg-white/90 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/70 space-y-2.5">
                {/* Traffic Condition Header Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-blue-500" />
                    Google Maps Real-Time Traffic
                  </span>

                  <span
                    className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      route.traffic.condition === 'Light'
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                        : route.traffic.condition === 'Moderate'
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                        : route.traffic.condition === 'Heavy'
                        ? 'bg-orange-50 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300 border-orange-300 dark:border-orange-800'
                        : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                        route.traffic.condition === 'Light'
                          ? 'bg-emerald-500'
                          : route.traffic.condition === 'Moderate'
                          ? 'bg-amber-500'
                          : route.traffic.condition === 'Heavy'
                          ? 'bg-orange-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    {route.traffic.condition} Traffic
                  </span>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-1.5 text-center">
                  <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Current Duration</span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white">
                      {route.traffic.currentDuration || route.durationText || 'N/A'}
                    </span>
                  </div>

                  <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Typical Time</span>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                      {route.traffic.typicalDuration || 'Normal'}
                    </span>
                  </div>

                  <div className="p-1.5 bg-slate-50 dark:bg-slate-900/60 rounded-lg">
                    <span className="text-[10px] text-slate-400 block">Traffic Delay</span>
                    <span
                      className={`text-xs font-bold ${
                        (route.traffic.delayMinutes || 0) > 5
                          ? 'text-rose-600 dark:text-rose-400'
                          : (route.traffic.delayMinutes || 0) > 0
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      }`}
                    >
                      {route.traffic.delayText || 'On schedule'}
                    </span>
                  </div>
                </div>

                {/* Traffic Summary / Delay Description */}
                {(route.traffic.summary || route.traffic.potentialDelays) && (
                  <div className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300 space-y-0.5">
                    {route.traffic.summary && <p>{route.traffic.summary}</p>}
                    {route.traffic.potentialDelays && (
                      <p className="text-amber-600 dark:text-amber-400 font-medium">
                        ⚠️ {route.traffic.potentialDelays}
                      </p>
                    )}
                  </div>
                )}

                {/* Warnings / Tolls */}
                {route.traffic.warnings && route.traffic.warnings.length > 0 && (
                  <div className="text-[10px] text-slate-400 flex flex-wrap gap-1">
                    {route.traffic.warnings.map((w, idx) => (
                      <span key={idx} className="bg-slate-100 dark:bg-slate-900 px-1.5 py-0.5 rounded">
                        ℹ️ {w}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Standard Metrics if not driving or no traffic */}
            {!route.traffic && (route.distanceText || route.durationText) && (
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                <span>Distance: {route.distanceText || 'N/A'}</span>
                <span>Estimated Time: {route.durationText || 'N/A'}</span>
              </div>
            )}
          </div>
        )}

        {/* Suggested Follow-up Prompt Pills */}
        {!isUser && followUps.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {followUps.map((fu, idx) => (
              <button
                key={idx}
                id={`followup-btn-${idx}`}
                onClick={() => onFollowUpClick(fu)}
                className="px-2.5 py-1 rounded-full text-[11px] bg-slate-100 dark:bg-slate-800 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/50 dark:hover:text-blue-300 text-slate-600 dark:text-slate-300 transition-colors border border-slate-200 dark:border-slate-700"
              >
                💬 {fu}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
