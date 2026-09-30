import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialize Gemini client
function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is required. Please add it in Settings > Secrets.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

interface ChatMessageInput {
  role: 'user' | 'model' | 'assistant';
  content: string;
}

const SYSTEM_INSTRUCTION = `You are MapChat, an intelligent interactive Google Maps & Location AI Assistant.
Your purpose is to answer location-specific questions, find places (restaurants, sights, hotels, cafes, parks, transit, hidden gems), provide real-time recommendations, check live traffic conditions, and plan walking/driving/transit routes.

CRITICAL INSTRUCTIONS FOR LOCATION & TRAFFIC DATA:
1. Always provide an insightful, engaging Markdown response first with clear formatting (bullet points, bold place names, highlights, operating tips, best times to visit).
2. REAL-TIME TRAFFIC & DIRECTIONS:
   When the user asks for directions, driving times, routes, or about current traffic conditions and delays:
   - Provide a clear, real-time traffic assessment, noting if conditions are Light (smooth flow), Moderate (minor slowdowns), Heavy (notable congestion), or Severe (major delays).
   - Inform the user about the expected travel time with current traffic versus typical traffic, and specify expected delay minutes and any bottlenecks.
   - Advise on alternate departure times or transit options if traffic is heavy.
3. Whenever places, venues, landmarks, or routes are mentioned or recommended in your response, YOU MUST ALWAYS append a strict JSON block at the very end of your response inside \`\`\`json and \`\`\`.
The JSON block must follow this exact schema:
\`\`\`json
{
  "places": [
    {
      "id": "place-1",
      "name": "Official Place Name",
      "category": "food" | "attraction" | "cafe" | "culture" | "park" | "hotel" | "transit" | "shopping" | "nature" | "other",
      "description": "Concise 1-2 sentence description of why it's great or what makes it special",
      "address": "Approximate or full address with city/area",
      "lat": 35.6909,
      "lng": 139.7003,
      "rating": 4.7,
      "priceLevel": "$$",
      "highlight": "Signature dish, key artwork, or insider tip"
    }
  ],
  "suggestedAction": "show_pins" | "draw_route" | "pan_to",
  "route": {
    "origin": { "name": "Start Location", "lat": 35.69, "lng": 139.70 },
    "destination": { "name": "End Location", "lat": 35.70, "lng": 139.71 },
    "waypoints": [
      { "name": "Stop 1", "lat": 35.695, "lng": 139.705 }
    ],
    "travelMode": "WALKING" | "DRIVING" | "TRANSIT",
    "traffic": {
      "condition": "Light" | "Moderate" | "Heavy" | "Severe",
      "currentDuration": "25 mins",
      "typicalDuration": "20 mins",
      "delayMinutes": 5,
      "delayText": "+5 mins delay",
      "summary": "Moderate traffic along central corridor",
      "potentialDelays": "Expect 5 min delay due to congestion",
      "warnings": []
    }
  },
  "suggestedFollowUps": [
    "Quick follow-up question 1",
    "Quick follow-up question 2",
    "Quick follow-up question 3"
  ]
}
\`\`\`

IMPORTANT ACCURACY RULES:
- Provide accurate real-world latitude and longitude coordinates for all places whenever possible so they pinpoint correctly on Google Maps.
- If a route, driving directions, or walking tour is requested, include the route object with origin and destination so the interactive map can draw the navigation path and display real-time traffic conditions.
- If no specific places are mentioned (e.g. general chit-chat), return \`"places": []\` in the JSON block.
- Keep the tone helpful, knowledgeable, and localized.`;

// Google Maps Routes API v2 Traffic Helper
async function getGoogleMapsTrafficData(
  origin: string | { lat: number; lng: number; name?: string },
  destination: string | { lat: number; lng: number; name?: string }
) {
  const apiKey =
    process.env.VITE_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY ||
    'AIzaSyDBAbHpDiX1vrZ6WOQ6z3AweciTFP7ZsA4';

  const formatWaypoint = (point: string | { lat: number; lng: number; name?: string }) => {
    if (typeof point === 'string') {
      return { address: point };
    }
    if (point && typeof point.lat === 'number' && typeof point.lng === 'number') {
      return {
        location: {
          latLng: {
            latitude: point.lat,
            longitude: point.lng,
          },
        },
      };
    }
    if (point && point.name) {
      return { address: point.name };
    }
    return null;
  };

  const originPayload = formatWaypoint(origin);
  const destPayload = formatWaypoint(destination);

  if (!originPayload || !destPayload) {
    return null;
  }

  try {
    const res = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.staticDuration,routes.description,routes.warnings',
      },
      body: JSON.stringify({
        origin: originPayload,
        destination: destPayload,
        travelMode: 'DRIVE',
        routingPreference: 'TRAFFIC_AWARE_OPTIMAL',
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.warn('Google Routes API traffic error:', err);
      return null;
    }

    const data = await res.json();
    const route = data.routes?.[0];
    if (!route) return null;

    const currentSeconds = parseInt(route.duration?.replace('s', '')) || 0;
    const staticSeconds = parseInt(route.staticDuration?.replace('s', '')) || currentSeconds;
    const distanceMeters = route.distanceMeters || 0;

    const delaySeconds = Math.max(0, currentSeconds - staticSeconds);
    const delayMinutes = Math.round(delaySeconds / 60);

    const currentMinutes = Math.round(currentSeconds / 60);
    const typicalMinutes = Math.round(staticSeconds / 60);

    let condition: 'Light' | 'Moderate' | 'Heavy' | 'Severe' = 'Light';
    let summary = 'Traffic is flowing smoothly with minimal slowdowns.';
    let potentialDelays = 'No significant delays expected.';

    if (delayMinutes >= 15 || (delaySeconds > 0 && delaySeconds / staticSeconds > 0.4)) {
      condition = 'Severe';
      summary = `Severe traffic congestion detected along ${route.description || 'the main corridor'}.`;
      potentialDelays = `Major delays of around +${delayMinutes} mins compared to normal driving time.`;
    } else if (delayMinutes >= 6 || (delaySeconds > 0 && delaySeconds / staticSeconds > 0.2)) {
      condition = 'Heavy';
      summary = `Heavy traffic slowdowns along ${route.description || 'the route'}.`;
      potentialDelays = `Noticeable delays of approximately +${delayMinutes} mins.`;
    } else if (delayMinutes >= 2 || (delaySeconds > 0 && delaySeconds / staticSeconds > 0.08)) {
      condition = 'Moderate';
      summary = `Moderate traffic with minor slowdowns along ${route.description || 'the route'}.`;
      potentialDelays = `Expect minor delays of about +${delayMinutes} mins.`;
    }

    return {
      condition,
      currentDuration:
        currentMinutes >= 60
          ? `${Math.floor(currentMinutes / 60)}h ${currentMinutes % 60}m`
          : `${currentMinutes} mins`,
      typicalDuration:
        typicalMinutes >= 60
          ? `${Math.floor(typicalMinutes / 60)}h ${typicalMinutes % 60}m`
          : `${typicalMinutes} mins`,
      delayMinutes,
      delayText: delayMinutes > 0 ? `+${delayMinutes} min delay` : 'Normal flow',
      distanceText:
        distanceMeters >= 1000
          ? `${(distanceMeters / 1000).toFixed(1)} km`
          : `${distanceMeters} m`,
      distanceMeters,
      summary,
      potentialDelays,
      routeDescription: route.description || '',
      warnings: route.warnings || [],
    };
  } catch (e: any) {
    console.warn('Failed to fetch Google Maps traffic data:', e?.message);
    return null;
  }
}

// Endpoint to query real-time Google Maps traffic directly
app.post('/api/traffic', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required.' });
    }

    const trafficData = await getGoogleMapsTrafficData(origin, destination);
    if (!trafficData) {
      return res.status(404).json({ error: 'Could not compute traffic data for this route.' });
    }

    res.json(trafficData);
  } catch (err: any) {
    console.error('Error in /api/traffic:', err);
    res.status(500).json({ error: err?.message || 'Failed to fetch traffic.' });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages = [],
      mapContext = null,
      model = 'gemini-3.5-flash',
      enableSearch = true,
    } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required.' });
    }

    const ai = getGeminiClient();

    // Prepare contents array for Gemini
    const contents = messages.map((m: ChatMessageInput, index: number) => {
      let text = m.content;
      // If this is the latest user message and we have mapContext, inject spatial context
      if (index === messages.length - 1 && m.role === 'user' && mapContext) {
        const contextLines = [];
        if (mapContext.cityName) contextLines.push(`Current Focused Area: ${mapContext.cityName}`);
        if (mapContext.center) contextLines.push(`Map Center Coordinates: lat ${mapContext.center.lat.toFixed(5)}, lng ${mapContext.center.lng.toFixed(5)} (Zoom level: ${mapContext.zoom || 13})`);
        if (mapContext.userLocation) contextLines.push(`User's Current GPS Location: lat ${mapContext.userLocation.lat.toFixed(5)}, lng ${mapContext.userLocation.lng.toFixed(5)}`);
        
        if (contextLines.length > 0) {
          text = `[Live Map Context: ${contextLines.join(' | ')}]\n\n${text}`;
        }
      }

      return {
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text }],
      };
    });

    const chosenModel = model || 'gemini-3.5-flash';

    // Configure tools: search grounding
    const tools = enableSearch ? [{ googleSearch: {} }] : [];

    let response;
    let usedModel = chosenModel;

    try {
      response = await ai.models.generateContent({
        model: chosenModel,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          ...(tools.length > 0 ? { tools } : {}),
        },
      });
    } catch (primaryError: any) {
      console.warn(`Primary attempt with ${chosenModel} (search=${enableSearch}) failed:`, primaryError?.message);

      // If search tool caused quota/rate error, retry without search tool first
      if (tools.length > 0) {
        try {
          console.log(`Retrying ${chosenModel} without search grounding...`);
          response = await ai.models.generateContent({
            model: chosenModel,
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
            },
          });
        } catch (noSearchError: any) {
          console.warn(`Retry without search failed:`, noSearchError?.message);
          usedModel = 'gemini-3.8-flash';
          console.log('Falling back to gemini-3.8-flash...');
          response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents,
            config: {
              systemInstruction: SYSTEM_INSTRUCTION,
            },
          });
        }
      } else {
        usedModel = 'gemini-3.8-flash';
        console.log('Falling back to gemini-3.8-flash...');
        response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        });
      }
    }

    const candidate = response.candidates?.[0];
    const rawText = candidate?.content?.parts?.map((p: any) => p.text || '').join('') || '';
    
    // Extract grounding metadata if available (search queries, web sources)
    const groundingMetadata = candidate?.groundingMetadata || null;

    // Parse structured JSON block from the response if present
    let parsedLocationData: any = null;
    let cleanText = rawText;

    const jsonMatch = rawText.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch && jsonMatch[1]) {
      try {
        parsedLocationData = JSON.parse(jsonMatch[1]);
        // Remove the JSON block from visible text for clean rendering
        cleanText = rawText.replace(/```json\s*[\s\S]*?\s*```/, '').trim();

        // If a route was identified, fetch real-time Google Maps Routes API traffic data
        if (parsedLocationData?.route?.origin && parsedLocationData?.route?.destination) {
          try {
            const liveTraffic = await getGoogleMapsTrafficData(
              parsedLocationData.route.origin,
              parsedLocationData.route.destination
            );
            if (liveTraffic) {
              parsedLocationData.route.traffic = liveTraffic;
              if (liveTraffic.distanceText) {
                parsedLocationData.route.distanceText = liveTraffic.distanceText;
              }
              if (liveTraffic.currentDuration) {
                parsedLocationData.route.durationText = liveTraffic.currentDuration;
              }
              if (liveTraffic.routeDescription && !parsedLocationData.route.summary) {
                parsedLocationData.route.summary = liveTraffic.routeDescription;
              }
            }
          } catch (trafficErr) {
            console.warn('Could not enrich route with live traffic:', trafficErr);
          }
        }
      } catch (err) {
        console.warn('Could not parse JSON block from model response:', err);
      }
    }

    res.json({
      text: cleanText,
      rawText,
      locationData: parsedLocationData,
      groundingMetadata,
      modelUsed: usedModel,
    });
  } catch (error: any) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({
      error: error?.message || 'Failed to process chat request.',
    });
  }
});

// Start server with Vite middleware in dev or static files in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
