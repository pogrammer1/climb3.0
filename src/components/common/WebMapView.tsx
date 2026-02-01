// Web Map Component using vanilla Leaflet - More compatible with Expo/Metro
import React, { useEffect, useRef, useState } from 'react';
import { VisitedLocation } from '../../services/locationMapService';

// Leaflet type declaration for CDN-loaded library
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type LeafletType = any;

interface WebMapViewProps {
  locations: VisitedLocation[];
  center: { latitude: number; longitude: number };
  onLocationSelect: (location: VisitedLocation) => void;
}

export const WebMapView: React.FC<WebMapViewProps> = ({ 
  locations, 
  center, 
  onLocationSelect 
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [leafletReady, setLeafletReady] = useState(typeof window !== 'undefined' && typeof window.L !== 'undefined');
  const [loadError, setLoadError] = useState<string | null>(null);

  // Dynamically load Leaflet if not present
  useEffect(() => {
    if (leafletReady || mapRef.current) return;
    if (typeof window === 'undefined') return;

    function loadLeaflet() {
      // Load CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      // Load JS
      if (!document.querySelector('script[src*="leaflet.js"]')) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => {
          setLeafletReady(true);
        };
        script.onerror = () => {
          setLoadError('Failed to load Leaflet library.');
        };
        document.head.appendChild(script);
      } else {
        // If script already present, poll for L
        const poll = setInterval(() => {
          if (typeof window.L !== 'undefined') {
            setLeafletReady(true);
            clearInterval(poll);
          }
        }, 100);
        setTimeout(() => clearInterval(poll), 5000);
      }
    }

    if (typeof window.L === 'undefined') {
      loadLeaflet();
    } else {
      setLeafletReady(true);
    }
  }, [leafletReady]);

  // Initialize map when Leaflet is ready
  useEffect(() => {
    if (!leafletReady || !mapContainerRef.current || mapRef.current || loadError) return;
    const L = window.L;
    if (typeof L === 'undefined') return;

    const map = L.map(mapContainerRef.current, {
      center: [center.latitude, center.longitude],
      zoom: locations.length === 1 ? 12 : 5,
      scrollWheelZoom: true,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);
    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [leafletReady, loadError, center, locations.length]);

  // Update markers when locations change
  useEffect(() => {
    if (!mapRef.current || !leafletReady || loadError) return;
    const L = window.L;
    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];
    if (locations.length === 0) return;
    
    // Track used coordinates to offset overlapping markers
    const usedCoords = new Map<string, number>();
    
    // Add markers for each location
    locations.forEach(location => {
      const color = location.locationType === 'indoor' ? '#048A81' : '#FF6B35';
      
      // Check for coordinate collision and offset if needed
      const coordKey = `${location.latitude.toFixed(6)},${location.longitude.toFixed(6)}`;
      const overlapCount = usedCoords.get(coordKey) || 0;
      usedCoords.set(coordKey, overlapCount + 1);
      
      // Offset overlapping markers slightly (spiral pattern)
      const offsetAngle = overlapCount * (Math.PI / 3); // 60 degree increments
      const offsetDistance = overlapCount * 0.0005; // ~50m offset
      const lat = location.latitude + Math.sin(offsetAngle) * offsetDistance;
      const lng = location.longitude + Math.cos(offsetAngle) * offsetDistance;
      
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="
          background-color: ${color};
          width: 28px;
          height: 28px;
          border-radius: 50%;
          border: 3px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        ">${location.locationType === 'indoor' ? '🏢' : '⛰️'}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });
      const marker = L.marker([lat, lng], { icon })
        .addTo(mapRef.current);
      
      // Format dates for display
      const lastVisitDate = new Date(location.lastVisit);
      const firstVisitDate = new Date(location.firstVisit);
      const formatDate = (date: Date) => {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
      };
      
      // Build popup content with full location info
      const showFirstVisit = firstVisitDate.getTime() !== lastVisitDate.getTime();
      const popupContent = `
        <div style="min-width: 220px; font-family: system-ui, -apple-system, sans-serif; padding: 8px;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="
              width: 40px;
              height: 40px;
              border-radius: 10px;
              background-color: ${color}20;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 20px;
            ">${location.locationType === 'indoor' ? '🏢' : '⛰️'}</div>
            <div style="flex: 1;">
              <div style="font-size: 16px; font-weight: 600; color: #1a1a1a; margin-bottom: 2px;">${location.name}</div>
              <div style="font-size: 12px; color: #666;">
                ${location.sessionCount} session${location.sessionCount !== 1 ? 's' : ''} • 
                Last visit: ${formatDate(lastVisitDate)}
              </div>
            </div>
          </div>
          ${showFirstVisit ? `
          <div style="font-size: 12px; color: #888; margin-left: 52px;">
            First visit: ${formatDate(firstVisitDate)}
          </div>
          ` : ''}
        </div>
      `;
      
      marker.bindPopup(popupContent, {
        maxWidth: 300,
        className: 'custom-popup',
      });
      
      // Also notify parent when clicked (for any additional handling)
      marker.on('click', () => {
        onLocationSelect(location);
      });
      markersRef.current.push(marker);
    });
    // Fit bounds to show all markers
    if (locations.length > 0) {
      const bounds = locations.map(loc => [loc.latitude, loc.longitude] as [number, number]);
      mapRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
    }
  }, [locations, onLocationSelect, leafletReady, loadError]);

  if (loadError) {
    return <div style={{ color: 'red', padding: 24 }}>Map failed to load: {loadError}</div>;
  }
  if (!leafletReady) {
    return <div style={{ padding: 24, textAlign: 'center' }}>Loading map...</div>;
  }
  return (
    <div 
      ref={mapContainerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 400,
      }} 
    />
  );
};

export default WebMapView;
