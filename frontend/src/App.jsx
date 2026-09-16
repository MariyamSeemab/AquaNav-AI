import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import * as turf from '@turf/turf';
import { getMarine } from './lib/openmeteo';
import { insidePolygon } from './lib/geoutils';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN;

const centerDefault = [85, 12];
const MAP_STYLES = {
  standard: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-v9',
  infrared: 'mapbox://styles/mapbox/dark-v11',
};

export default function App() {
  const mapRef = useRef(null);
  const map = useRef(null);

  const [pos, setPos] = useState({ lat: null, lon: null });
  const [marineData, setMarineData] = useState(null);
  const [marineLoading, setMarineLoading] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [safety, setSafety] = useState({ label: 'Loading location...', cls: 'warn' });
  const [mapStyle, setMapStyle] = useState('standard');
  const [alertMsg, setAlertMsg] = useState(null);
  const [distToCoast, setDistToCoast] = useState(null);
  const [eezData, setEezData] = useState(null);
  const marineDebounceRef = useRef(null);

  useEffect(() => {
    if (map.current) return;

    map.current = new mapboxgl.Map({
      container: mapRef.current,
      style: MAP_STYLES.standard,
      center: centerDefault,
      zoom: 6,
      pitch: 40,
      bearing: -10,
    });

    const addLayers = () => {
      // Ensure EEZ source exists and is populated either from state or URL
      const eezSourceData = eezData || '/data/eez_india.geojson';
      if (!map.current.getSource('eez')) {
        map.current.addSource('eez', { type: 'geojson', data: eezSourceData });
        map.current.addLayer({
          id: 'eez-fill',
          type: 'fill',
          source: 'eez',
          paint: { 'fill-color': '#00FFC8', 'fill-opacity': 0.1 }
        });
        map.current.addLayer({
          id: 'eez-line',
          type: 'line',
          source: 'eez',
          paint: { 'line-color': '#00FFC8', 'line-width': 3 }
        });
      } else if (eezData) {
        map.current.getSource('eez').setData(eezData);
      }
      
      if (!map.current.getSource('boat')) {
        map.current.addSource('boat', { type: 'geojson', data: turf.point([pos.lon || centerDefault[0], pos.lat || centerDefault[1]]) });
        map.current.addLayer({
          id: 'boat',
          type: 'circle',
          source: 'boat',
          paint: {
            'circle-radius': 11,
            'circle-color': '#FFD400',
            'circle-stroke-width': 3,
            'circle-stroke-color': '#3c4a58',
          }
        });
      }
    };

    map.current.on('load', () => {
      addLayers();

      // Cursor movement disabled - location only changes via buttons/inputs
      // map.current.on('mousemove', (e) => {
      //   updatePosition(e.lngLat.lng, e.lngLat.lat);
      // });

      // Ask for location permission first
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (p) => {
            setIsDemoMode(false); // Real location mode
            updatePosition(p.coords.longitude, p.coords.latitude);
            map.current.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 8, speed: 0.6 });
          },
          () => {
            // If location denied, use default ocean center
            setIsDemoMode(true); // Demo mode
            updatePosition(centerDefault[0], centerDefault[1]);
            map.current.flyTo({ center: centerDefault, zoom: 6 });
          },
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        // No geolocation support, use default
        updatePosition(centerDefault[0], centerDefault[1]);
        map.current.flyTo({ center: centerDefault, zoom: 6 });
      }
    });

    map.current.on('style.load', () => {
      addLayers();
      if (map.current.getSource('boat')) {
        map.current.getSource('boat').setData(turf.point([pos.lon || centerDefault[0], pos.lat || centerDefault[1]]));
      }
    });
  }, []);

  // Cursor movement completely disabled - removed useEffect

  // Load EEZ data once and keep in React state
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/data/eez_india.geojson');
        const geojson = await res.json();
        if (!cancelled) {
          setEezData(geojson);
          // If map is ready, update the map source immediately
          if (map.current && map.current.getSource('eez')) {
            map.current.getSource('eez').setData(geojson);
          }
        }
      } catch (_) {
        // ignore; UI already handles not loaded case
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function updatePosition(lon, lat) {
    setPos({ lon, lat });
    if (!map.current) return;
    const boatSource = map.current.getSource('boat');
    if (boatSource) boatSource.setData(turf.point([lon, lat]));
    refreshMarineData(lat, lon);
    updateSafety(lon, lat);
    updateDistanceToEEZ(lon, lat);
  }

  function refreshMarineData(lat, lon) {
    if (marineDebounceRef.current) {
      clearTimeout(marineDebounceRef.current);
    }
    setMarineLoading(true);
    marineDebounceRef.current = setTimeout(async () => {
      try {
        const marine = await getMarine(lat, lon);
        console.log('Marine data received:', marine); // Debug log
        setMarineData(marine);
      } catch (error) {
        console.error('Marine data error:', error); // Debug log
        setMarineData(null);
      } finally {
        setMarineLoading(false);
      }
    }, 600);
  }

  function updateSafety(lon, lat) {
    if (!map.current) return;

    const featureCollection = eezData;
    if (!featureCollection || !featureCollection.features?.length) {
      setSafety({ label: 'EEZ data not loaded', cls: 'warn' });
      return;
    }

    const pt = turf.point([lon, lat]);
    const eezFeature = featureCollection.features[0];

    const inside = insidePolygon(pt, eezFeature);
    console.log('Location:', lon, lat, 'Inside EEZ:', inside); // Debug log
    
    let label = 'Inside Indian EEZ (Safe)';
    let cls = 'safe';

    if (!inside) {
      label = 'Outside Indian EEZ! Alert Coast Guard';
      cls = 'danger';
      if (map.current.getLayer('boat')) {
        map.current.setPaintProperty('boat', 'circle-color', '#FF0000');
      }
      setAlertMsg(label);
    } else {
      if (map.current.getLayer('boat')) {
        map.current.setPaintProperty('boat', 'circle-color', '#FFD400');
      }
      setAlertMsg(null);
    }
    setSafety({ label, cls });
  }

  function updateDistanceToEEZ(lon, lat) {
    if (map.current) {
      const pt = turf.point([lon, lat]);
      const featureCollection = eezData;
      if (!featureCollection || !featureCollection.features?.length) {
        setDistToCoast(null);
        return;
      }
      const eezFeature = featureCollection.features[0];
      
      // Convert polygon to line and find nearest point on boundary
      const boundaryLine = turf.polygonToLine(eezFeature);
      const nearestPoint = turf.nearestPointOnLine(boundaryLine, pt);
      const distKm = turf.distance(pt, nearestPoint, { units: 'kilometers' });
      
      setDistToCoast(distKm.toFixed(2));
    }
  }

  function onMapStyleChange(e) {
    const styleKey = e.target.value;
    setMapStyle(styleKey);
    if (map.current) map.current.setStyle(MAP_STYLES[styleKey]);
  }

  // Return a random demo location in OCEAN ONLY near Indian EEZ boundary
  function getRandomDemoLocation() {
    // Ocean-only coordinates CLOSE to Indian EEZ boundary
    const oceanRegions = [
      // Arabian Sea - very close to west coast EEZ boundary
      { bbox: [68, 10, 75, 22], insideEEZ: true },
      { bbox: [60, 10, 68, 22], insideEEZ: false },
      
      // Bay of Bengal - very close to east coast EEZ boundary
      { bbox: [82, 10, 88, 22], insideEEZ: true },
      { bbox: [88, 10, 95, 22], insideEEZ: false },
      
      // Indian Ocean - very close to south EEZ boundary
      { bbox: [75, 6, 85, 10], insideEEZ: true },
      { bbox: [75, 2, 85, 6], insideEEZ: false },
      
      // Andaman Sea - very close to Andaman EEZ boundary
      { bbox: [92, 8, 98, 14], insideEEZ: true },
      { bbox: [98, 8, 104, 14], insideEEZ: false },
    ];

    // Helper to get random point within bbox
    const randomInBBox = (bbox) => {
      const [minX, minY, maxX, maxY] = bbox;
      return {
        lon: minX + Math.random() * (maxX - minX),
        lat: minY + Math.random() * (maxY - minY),
      };
    };

    // Randomly choose inside or outside EEZ
    const wantInside = Math.random() < 0.5;
    
    // Filter ocean regions based on EEZ status
    const suitableRegions = oceanRegions.filter(region => 
      wantInside ? region.insideEEZ : !region.insideEEZ
    );
    
    if (suitableRegions.length > 0) {
      const selectedRegion = suitableRegions[Math.floor(Math.random() * suitableRegions.length)];
      const p = randomInBBox(selectedRegion.bbox);
      
      // Double-check with actual EEZ data if available
      if (eezData?.features?.length) {
        const poly = eezData.features[0];
        const inside = insidePolygon(turf.point([p.lon, p.lat]), poly);
        
        if (wantInside && inside) {
          console.log('Demo INSIDE EEZ (Ocean):', p.lon, p.lat);
          return p;
        } else if (!wantInside && !inside) {
          console.log('Demo OUTSIDE EEZ (Ocean):', p.lon, p.lat);
          return p;
        }
      } else {
        // Use ocean region without EEZ check
        console.log('Demo Ocean Location:', p.lon, p.lat, 'Region:', wantInside ? 'Inside' : 'Outside');
        return p;
      }
    }

    // Fallback: Arabian Sea ocean coordinates
    return { lon: 70, lat: 15 };
  }

  function sendEmergencyAlert() {
    const lat = pos.lat?.toFixed(4);
    const lon = pos.lon?.toFixed(4);
    const mapsLink = `https://maps.google.com/?q=${lat},${lon}`;
    const subject = encodeURIComponent('EEZ ALERT: Vessel outside Indian EEZ');
    const body = encodeURIComponent(`Emergency: Vessel is outside the Indian EEZ.\nCoordinates: ${lat}, ${lon}\nMap: ${mapsLink}`);

    // Try Web Share API first
    const message = `EEZ ALERT: Outside Indian EEZ\nCoords: ${lat}, ${lon}\n${mapsLink}`;
    if (navigator.share) {
      navigator.share({ title: 'EEZ ALERT', text: message, url: mapsLink }).catch(() => {
        // fallback to mailto
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
      });
      return;
    }
    // Fallback: open email client
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }

  return (
    <div className="app" style={{ display: 'flex', height: '100vh' }}>
      <div ref={mapRef} className="map" style={{ flex: 1, height: '100vh' }} />

      <div
        className="sidebar"
        style={{
          width: '320px',
          padding: '16px',
          background: 'rgba(20,20,30,0.9)',
          color: 'white',
          overflowY: 'auto',
          fontFamily: 'Inter, system-ui',
          boxShadow: '-2px 0 13px rgba(0,255,200,0.3)',
          borderRadius: '12px',
        }}
      >
        <h1>AquaNav AI</h1>
        <div className={`status ${safety.cls}`} style={{ marginBottom: '10px' }}>{safety.label}</div>

        {alertMsg && (
          <div className="status danger" style={{ marginTop: '8px', fontWeight: 'bold' }}>
            {alertMsg}
          </div>
        )}

        {safety.cls === 'danger' && isDemoMode && (
          <button
            className="btn"
            style={{ marginTop: '8px', width: '100%' }}
            onClick={sendEmergencyAlert}
          >
            Emergency: Alert Coast Guard
          </button>
        )}

        <div className="input-group">
          <label htmlFor="latInput">Latitude</label>
          <input
            id="latInput"
            type="number"
            step="0.0001"
            value={pos.lat || ''}
            onChange={(e) => {
              const newLat = parseFloat(e.target.value);
              if (!isNaN(newLat)) updatePosition(pos.lon, newLat);
            }}
          />
        </div>

        <div className="input-group">
          <label htmlFor="lonInput">Longitude</label>
          <input
            id="lonInput"
            type="number"
            step="0.0001"
            value={pos.lon || ''}
            onChange={(e) => {
              const newLon = parseFloat(e.target.value);
              if (!isNaN(newLon)) updatePosition(newLon, pos.lat);
            }}
          />
        </div>

        <div className="row" style={{ marginTop: '12px' }}>
          <div className="card">
            <div className="badge">Waves (m)</div>
            <div className="value">{marineLoading ? 'Loading...' : (marineData?.hourly?.wave_height?.[0]?.toFixed(2) || '—')}</div>
          </div>
          <div className="card">
            <div className="badge">Location Status</div>
            <div className="value">{safety.cls === 'safe' ? 'Safe' : safety.cls === 'danger' ? 'Outside EEZ' : 'Loading...'}</div>
          </div>
          <div className="card">
            <div className="badge">Distance to EEZ</div>
            <div className="value">{distToCoast ? `${distToCoast} km` : '—'}</div>
          </div>
        </div>

        <div style={{ marginTop: '20px' }}>
          <h3>Distance to Indian EEZ boundary:</h3>
          <p>{distToCoast ? `${distToCoast} km` : 'Calculating...'}</p>
        </div>

        <div className="toolbar" style={{ marginTop: '16px' }}>
          <select value={mapStyle} onChange={onMapStyleChange} style={{ width: '100%' }}>
            <option value="standard">Standard Map</option>
            <option value="satellite">Satellite Map</option>
            <option value="infrared">Infrared Map</option>
          </select>

          <button
            className="btn"
            style={{ marginTop: '8px', width: '100%' }}
            onClick={() => {
              if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                  (p) => {
                    setIsDemoMode(false); // Real location mode
                    updatePosition(p.coords.longitude, p.coords.latitude);
                    map.current.flyTo({ center: [p.coords.longitude, p.coords.latitude], zoom: 8, speed: 0.6 });
                  },
                  () => {
                    alert('Unable to get your location. Please check location permissions.');
                  },
                  { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
                );
              } else {
                alert('Geolocation is not supported by this browser.');
              }
            }}
          >
            Use My Location
          </button>

          <button
            className="btn"
            style={{ marginTop: '8px', width: '100%' }}
            onClick={() => {
              updatePosition(centerDefault[0], centerDefault[1]);
              map.current.flyTo({ center: centerDefault, zoom: 5 });
            }}
          >
            Reset View
          </button>

          <button
            className="btn"
            style={{ marginTop: '16px', width: '100%' }}
            onClick={() => {
              setIsDemoMode(true); // Demo mode
              const p = getRandomDemoLocation();
              updatePosition(p.lon, p.lat);
              if (map.current) {
                map.current.flyTo({ center: [p.lon, p.lat], zoom: 6, speed: 0.6 });
              }
            }}
          >
            Random Demo Location
          </button>
        </div>
      </div>
    </div>
  );
}
