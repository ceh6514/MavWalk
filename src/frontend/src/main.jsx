import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import mavWalkLogo from './MavWalkLogo.png';
import utaLogo from './142-1425701_university-of-texas-uta-logo-university-of-texas-at-arlington-logo.png';
import {
  getRoutes as apiGetRoutes,
  getRandomMessage,
  getStats as apiGetStats,
  postMessage as apiPostMessage,
  postWalkCompletion as apiPostWalkCompletion,
} from './api';

const parseStatCount = (value) => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
};

const formatStat = (value) => (typeof value === 'number' && Number.isFinite(value) ? value.toLocaleString() : '—');

const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

const defaultCenter = [32.7318, -97.1133];

const mapLayerOptions = {
  streets: {
    id: 'streets',
    label: 'Map',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  },
  satellite: {
    id: 'satellite',
    label: 'Satellite',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution:
      'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community',
  },
};
const MESSAGE_MAX_LENGTH = 280;

const App = () => {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [stage, setStage] = useState('home');
  const [routesCatalogue, setRoutesCatalogue] = useState([]);
  const [routesIndex, setRoutesIndex] = useState({});
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [formFeedback, setFormFeedback] = useState(null);
  const [userMessage, setUserMessage] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);
  const [stats, setStats] = useState({ walksToday: null, messagesShared: null });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [completionStatus, setCompletionStatus] = useState(null);
  const [isRecordingCompletion, setIsRecordingCompletion] = useState(false);
  const [activeMapLayer, setActiveMapLayer] = useState(mapLayerOptions.streets.id);

  // Map/location state
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const watchIdRef = useRef(null);
  const isMountedRef = useRef(false);

  // Message-fetching state (new)
  const [encouragement, setEncouragement] = useState(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState(null);
  const lastMessageIdRef = useRef(null);

  useEffect(() => {
    document.body.style.backgroundColor = isDarkMode ? '#020617' : '#e0f2ff';
    document.body.style.color = isDarkMode ? '#f8fafc' : '#0f172a';
    document.body.style.transition = 'background-color 300ms ease, color 300ms ease';
  }, [isDarkMode]);

  useEffect(() => {
    setCompletionStatus(null);
  }, [stage]);

  const refreshStats = useCallback(async () => {
    try {
      const data = await apiGetStats();
      if (!isMountedRef.current) {
        return;
      }

      setStats({
        walksToday: parseStatCount(data?.walksToday),
        messagesShared: parseStatCount(data?.messagesShared),
      });
    } catch (error) {
      if (isMountedRef.current) {
        // eslint-disable-next-line no-console
        console.error('Failed to load stats.', error);
      }
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    refreshStats();
    return () => {
      isMountedRef.current = false;
    };
  }, [refreshStats]);

  useEffect(() => {
    let alive = true;
    setRoutesLoading(true);
    setRoutesError(null);

    (async () => {
      try {
        const routes = await apiGetRoutes();
        if (!alive) {
          return;
        }

        const index = {};
        routes.forEach((route) => {
          if (route?.startLocation && route?.destination) {
            index[`${route.startLocation}|${route.destination}`] = route;
          }
        });

        setRoutesCatalogue(routes);
        setRoutesIndex(index);
      } catch (error) {
        if (alive) {
          setRoutesError(error.message || 'Failed to load curated routes.');
        }
      } finally {
        if (alive) {
          setRoutesLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const startOptions = useMemo(() => {
    const names = new Set();
    routesCatalogue.forEach((route) => {
      if (route?.startLocation) {
        names.add(route.startLocation);
      }
    });
    return Array.from(names).sort();
  }, [routesCatalogue]);

  const destinationOptions = useMemo(() => {
    const names = new Set();
    if (startLocation) {
      routesCatalogue.forEach((route) => {
        if (route?.startLocation === startLocation && route?.destination) {
          names.add(route.destination);
        }
      });
    } else {
      routesCatalogue.forEach((route) => {
        if (route?.destination) {
          names.add(route.destination);
        }
      });
    }

    return Array.from(names).sort();
  }, [routesCatalogue, startLocation]);

  useEffect(() => {
    if (!destination) {
      return;
    }

    if (!destinationOptions.includes(destination)) {
      setDestination('');
    }
  }, [destination, destinationOptions]);

  const popularDestinations = useMemo(() => destinationOptions.slice(0, 4), [destinationOptions]);
  const selectedMapLayer = mapLayerOptions[activeMapLayer] ?? mapLayerOptions.streets;

  // Geolocation watcher lifecycle
  useEffect(() => {
    if (stage !== 'map') {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setUserLocation(null);
      setLocationStatus(null);
      return;
    }

    if (!('geolocation' in navigator)) {
      setLocationStatus({
        type: 'error',
        message: 'Real-time location is unavailable because this browser does not support geolocation.',
      });
      return;
    }

    const hostIsLocal = ['localhost', '127.0.0.1'].includes(window.location.hostname);
    if (!window.isSecureContext && !hostIsLocal) {
      setLocationStatus({
        type: 'error',
        message:
          'Live location is unavailable because this page is being served over an insecure connection. Open the demo using HTTPS or a local tunnel to allow location sharing.',
      });
      return;
    }

    setLocationStatus({
      type: 'info',
      message: 'Requesting your location so the map can follow your walk. Please allow location access if prompted.',
    });

    watchIdRef.current = navigator.geolocation.watchPosition(
      ({ coords }) => {
        setUserLocation([coords.latitude, coords.longitude]);
        setLocationStatus(null);
      },
      (error) => {
        let message = 'We could not determine your current location.';
        if (error.code === error.PERMISSION_DENIED) {
          message = window.isSecureContext || hostIsLocal
            ? 'Location sharing is blocked. Enable it in your browser settings to see your position during the walk.'
            : 'Location sharing was denied because this page is not using HTTPS. Reload the demo with a secure URL or a local tunnel to enable tracking.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location data is temporarily unavailable. We will keep trying to update your position.';
        } else if (error.code === error.TIMEOUT) {
          message = 'The request for your location timed out. Try checking your connection and permissions.';
        }
        setLocationStatus({ type: 'error', message });
      },
      { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [stage]);

  // Fetch one encouragement when entering the message stage (server-side random)
  useEffect(() => {
    if (stage !== 'message') return;

    let alive = true;
    setMsgLoading(true);
    setMsgError(null);
    setEncouragement(null);

    (async () => {
      try {
        const row = await getRandomMessage({
          start: startLocation,
          destination,
          exclude: lastMessageIdRef.current ? [lastMessageIdRef.current] : undefined,
        });
        if (alive) {
          setEncouragement(row?.message ?? null);
          lastMessageIdRef.current = row?.id ?? null;
        }
      } catch (e) {
        if (alive) setMsgError(e.message || 'Failed to load messages');
      } finally {
        if (alive) setMsgLoading(false);
      }
    })();

    return () => { alive = false; };
  }, [stage, startLocation, destination]);


  const mapCenter = useMemo(() => {
    if (!routeResult?.pathCoordinates?.length) return defaultCenter;
    const { pathCoordinates } = routeResult;
    const { totalLat, totalLng } = pathCoordinates.reduce(
      (totals, [lat, lng]) => ({
        totalLat: totals.totalLat + lat,
        totalLng: totals.totalLng + lng,
      }),
      { totalLat: 0, totalLng: 0 }
    );
    return [totalLat / pathCoordinates.length, totalLng / pathCoordinates.length];
  }, [routeResult]);

  const routeDistanceMiles = useMemo(() => {
    const coordinates = routeResult?.pathCoordinates;
    if (!coordinates || coordinates.length < 2) {
      return null;
    }

    const totalMeters = coordinates.reduce((distance, [lat, lng], index) => {
      if (index === 0) {
        return 0;
      }

      const [prevLat, prevLng] = coordinates[index - 1];
      return distance + L.latLng(prevLat, prevLng).distanceTo(L.latLng(lat, lng));
    }, 0);

    const miles = totalMeters / 1609.34;
    return Number.isFinite(miles) ? Number(miles.toFixed(2)) : null;
  }, [routeResult]);

  const stageCardClasses = useMemo(
    () =>
      `rounded-3xl shadow-2xl p-8 space-y-6 transition-colors duration-500 ${
        isDarkMode
          ? 'bg-slate-900/80 border border-slate-800 text-slate-100 backdrop-blur'
          : 'bg-white text-gray-900'
      }`,
    [isDarkMode]
  );

  const resetJourney = () => {
    setStartLocation('');
    setDestination('');
    setStage('home');
    setRouteResult(null);
    setFormFeedback(null);
    setUserMessage('');
    setSubmissionStatus(null);
    setHasSubmittedMessage(false);
  };

  const handleFindRoute = (event) => {
    event.preventDefault();
    setFormFeedback(null);
    setSubmissionStatus(null);

    if (routesLoading) {
      setFormFeedback({
        type: 'info',
        message: 'Hang tight—we are still loading curated Maverick routes.',
      });
      return;
    }

    if (routesError) {
      setFormFeedback({
        type: 'error',
        message: `We could not load campus routes. ${routesError} Please refresh and try again.`,
      });
      return;
    }

    if (!startLocation || !destination) {
      setFormFeedback({ type: 'error', message: 'Please select both a starting point and a destination.' });
      return;
    }

    if (startLocation === destination) {
      setFormFeedback({ type: 'error', message: 'Pick two different locations to discover a curated walk.' });
      return;
    }

    const routeKey = `${startLocation}|${destination}`;
    const routeDetails = routesIndex[routeKey];

    if (!routeDetails) {
      setFormFeedback({
        type: 'info',
        message: 'We are still curating that path. Please choose another pair of locations while we finish mapping it.',
      });
      return;
    }

    setRouteResult({
      ...routeDetails,
      startLocation: routeDetails.startLocation ?? startLocation,
      destination: routeDetails.destination ?? destination,
      summary:
        routeDetails.summary ??
        `Curated walk from ${startLocation} to ${destination}.${
          routeDetails.eta ? ` Estimated travel time: ${routeDetails.eta}.` : ''
        }`,
    });

    setStage('message'); // the effect above will fetch the encouragement
  };

  const handleCompleteWalk = async () => {
    if (isRecordingCompletion) {
      return;
    }

    setCompletionStatus(null);
    setIsRecordingCompletion(true);

    try {
      await apiPostWalkCompletion({
        startLocation,
        destination,
      });

      if (!isMountedRef.current) {
        return;
      }

      await refreshStats();
      if (!isMountedRef.current) {
        return;
      }
      setStage('completion');
    } catch (error) {
      if (!isMountedRef.current) {
        return;
      }
      setCompletionStatus({
        type: 'error',
        message: `Could not record your walk. ${error?.message || 'Please try again.'}`,
      });
    } finally {
      if (isMountedRef.current) {
        setIsRecordingCompletion(false);
      }
    }
  };

  const handleSendMessage = async (event) => {
    event.preventDefault();

    if (hasSubmittedMessage) {
      setSubmissionStatus({
        type: 'info',
        message: 'You already shared a message for this walk. Tap Finish when you are ready to wrap up.',
      });
      return;
    }
  
    const trimmed = userMessage.trim();
    if (!trimmed) {
      setSubmissionStatus({
        type: 'error',
        message: 'Please share a short note or tap Finish to skip this step.',
      });
      return;
    }
  
    setIsSavingMessage(true);
    setSubmissionStatus(null);
    try {
      await apiPostMessage({
        message: trimmed,
        startLocation: startLocation,
        destination: destination,
      });

      if (!isMountedRef.current) {
        return;
      }

      setSubmissionStatus({
        type: 'success',
        message: 'Thanks! Your message was saved for future Mavericks to enjoy. Tap Finish to end your walk.',
      });
      setUserMessage('');
      setHasSubmittedMessage(true);
      await refreshStats();
    } catch (e) {
      if (!isMountedRef.current) {
        return;
      }
      setSubmissionStatus({
        type: 'error',
        message: `Could not save your message. ${e.message || 'Please try again.'}`,
      });
    } finally {
      if (isMountedRef.current) {
        setIsSavingMessage(false);
      }
    }
  };
  const renderHeader = (subtitle) => (
    <header className="text-center space-y-4">
      <div
        className={`mx-auto w-32 h-32 rounded-3xl flex items-center justify-center shadow-[0_25px_60px_rgba(15,23,42,0.25)] ring-4 transition-all duration-500 ${
          isDarkMode ? 'bg-slate-900 ring-slate-700' : 'bg-gradient-to-br from-blue-50 via-white to-orange-50 ring-orange-100'
        }`}
      >
        <img src={mavWalkLogo} alt="MavWalk Logo" className="w-20 h-20 object-contain drop-shadow-xl" />
      </div>

      <div className="space-y-3">
        <h1 className={`text-5xl font-bold ${isDarkMode ? 'text-white' : 'text-purple-600'}`}>MavWalk</h1>
        <p className={`text-base ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
          Navigate UTA campus with uplifting messages
        </p>
        {subtitle && (
          <p className={`text-base mt-2 ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>{subtitle}</p>
        )}
      </div>

      <div
        className={`flex items-center justify-center gap-8 text-base pt-3 ${
          isDarkMode ? 'text-slate-400' : 'text-gray-500'
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <span>{`${formatStat(stats.walksToday)} walks today`}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">❤️</span>
          <span>{`${formatStat(stats.messagesShared)} messages shared`}</span>
        </div>
      </div>
    </header>
  );

  return (
    <div
      className={`min-h-screen relative overflow-hidden transition-colors duration-500 ${
        isDarkMode ? 'bg-slate-950' : 'bg-blue-600'
      }`}
    >
      {/* UTA Logo pattern background */}
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: isDarkMode ? 0.08 : 0.2 }}>
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url(${utaLogo})`,
            backgroundSize: '200px 200px',
            backgroundRepeat: 'repeat',
            backgroundPosition: 'center',
            mixBlendMode: isDarkMode ? 'screen' : 'normal',
          }}
        />
      </div>

      {/* Navigation Bar */}
      <nav
        className={`relative z-10 shadow-lg transition-colors duration-500 ${
          isDarkMode ? 'bg-slate-950/80 backdrop-blur' : 'bg-blue-600'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src={mavWalkLogo} alt="MavWalk" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-3xl font-bold ${isDarkMode ? 'text-white' : 'text-white'}`}>MavWalk</span>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-1 justify-end flex-wrap">
            <button
              type="button"
              onClick={() => setIsDarkMode((prev) => !prev)}
              aria-pressed={isDarkMode}
              className={`px-5 py-2.5 rounded-lg font-semibold text-base flex items-center gap-2 transition-colors shadow-sm w-full sm:w-auto justify-center ${
                isDarkMode
                  ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
                  : 'bg-white/20 text-white hover:bg-white/30'
              }`}
            >
              <span role="img" aria-hidden="true">
                {isDarkMode ? '☀️' : '🌙'}
              </span>
              {isDarkMode ? 'Light Mode' : 'Night Mode'}
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      {stage === 'home' && (
        <div
          className={`relative z-10 text-center py-4 px-6 transition-colors duration-500 ${
            isDarkMode ? 'bg-slate-900/80 text-slate-100' : 'bg-orange-500 text-white'
          }`}
        >
          <p className="text-base font-medium">Live Demo: Experience MavWalk's campus navigation system</p>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {stage === 'home' && (
            <div className={stageCardClasses}>
              {renderHeader()}

              {/* Plan Your Journey Section */}
              <div className="pt-4">
                <div
                  className={`border-2 rounded-2xl p-6 shadow-sm transition-colors duration-500 ${
                    isDarkMode ? 'border-slate-800 bg-slate-950/60' : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-4">
                    <svg
                      className={`w-6 h-6 ${isDarkMode ? 'text-blue-300' : 'text-blue-600'}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <h2 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-800'}`}>Plan Your Journey</h2>
                  </div>
                  <p className={`text-base mb-6 ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                    Get directions with encouraging messages along the way
                  </p>

                  {routesLoading && (
                    <div
                      className={`mb-4 rounded-xl border px-4 py-3 text-base ${
                        isDarkMode
                          ? 'border-blue-900 bg-blue-950/60 text-blue-200'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      Loading curated Maverick routes...
                    </div>
                  )}

                  {routesError && (
                    <div
                      className={`mb-4 rounded-xl border px-4 py-3 text-base ${
                        isDarkMode
                          ? 'border-red-900 bg-red-950/60 text-red-200'
                          : 'border-red-200 bg-red-50 text-red-700'
                      }`}
                    >
                      We hit a snag while loading campus routes. {routesError}
                    </div>
                  )}

                  <form className="space-y-5" onSubmit={handleFindRoute}>
                    {/* Starting From */}
                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-2 text-base font-semibold ${
                          isDarkMode ? 'text-slate-100' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-green-600 text-lg">📍</span>
                        Starting From
                      </label>
                      <select
                        id="startLocation"
                        value={startLocation}
                        onChange={(event) => setStartLocation(event.target.value)}
                        disabled={routesLoading && startOptions.length === 0}
                        className={`w-full appearance-none rounded-xl px-4 py-4 text-base transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? 'border border-slate-700 bg-slate-900 text-slate-100 focus:border-orange-400 focus:ring-orange-400/30'
                            : 'border border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                      >
                        <option value="">
                          {routesLoading ? 'Loading curated routes…' : 'Enter starting location...'}
                        </option>
                        {startOptions.map((location) => (
                          <option key={`start-${location}`} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Swap Button */}
                    <div className="flex justify-center">
                      <button
                        type="button"
                        disabled={routesLoading || (!startLocation && !destination)}
                        className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                          routesLoading || (!startLocation && !destination)
                            ? isDarkMode
                              ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            : isDarkMode
                              ? 'bg-slate-800 hover:bg-slate-700 text-orange-200'
                              : 'bg-blue-100 hover:bg-blue-200 text-blue-600'
                        }`}
                        onClick={() => {
                          const temp = startLocation;
                          setStartLocation(destination);
                          setDestination(temp);
                        }}
                      >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                        </svg>
                      </button>
                    </div>

                    {/* Destination */}
                    <div className="space-y-2">
                      <label
                        className={`flex items-center gap-2 text-base font-semibold ${
                          isDarkMode ? 'text-slate-100' : 'text-gray-700'
                        }`}
                      >
                        <span className="text-orange-600 text-lg">🎯</span>
                        Destination
                      </label>
                      <select
                        id="destination"
                        value={destination}
                        onChange={(event) => setDestination(event.target.value)}
                        disabled={routesLoading && destinationOptions.length === 0}
                        className={`w-full appearance-none rounded-xl px-4 py-4 text-base transition-all focus:outline-none focus:ring-2 ${
                          isDarkMode
                            ? 'border border-slate-700 bg-slate-900 text-slate-100 focus:border-orange-400 focus:ring-orange-400/30'
                            : 'border border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-200'
                        }`}
                      >
                        <option value="">
                          {routesLoading
                            ? 'Loading destinations…'
                            : startLocation
                            ? 'Choose a destination for this start point...'
                            : 'Where are you going?'}
                        </option>
                        {destinationOptions.map((location) => (
                          <option key={`destination-${location}`} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Button */}
                    <button
                      type="submit"
                      disabled={routesLoading || !!routesError}
                      className={`w-full rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 px-6 py-4 text-white text-lg font-bold shadow-lg flex items-center justify-center gap-2 transition-all duration-200 ${
                        routesLoading || routesError
                          ? 'opacity-60 cursor-not-allowed'
                          : 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                      Start My MavWalk
                    </button>
                  </form>

                  {formFeedback && (
                    <div
                      className={`mt-4 rounded-xl border px-4 py-3 text-base font-medium ${
                        formFeedback.type === 'error'
                          ? 'border-red-200 bg-red-50 text-red-700'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                      }`}
                    >
                      {formFeedback.message}
                    </div>
                  )}
                </div>
              </div>

              {/* Popular Destinations */}
              <div className="pt-4 border-t border-gray-200">
                <h3 className="text-base font-bold text-gray-800 mb-3">Popular Destinations</h3>
                <div className="grid grid-cols-2 gap-2">
                  {popularDestinations.length === 0 && (
                    <div className="col-span-2 text-sm text-gray-500">
                      {routesLoading ? 'Loading favorites...' : 'Select a start point to see featured walks.'}
                    </div>
                  )}
                  {popularDestinations.map((location) => (
                    <button
                      key={`popular-${location}`}
                      onClick={() => {
                        const matchingRoute = routesCatalogue.find((route) => route.destination === location);
                        if (matchingRoute) {
                          setStartLocation(matchingRoute.startLocation);
                          setDestination(matchingRoute.destination);
                        } else {
                          setDestination(location);
                        }
                      }}
                      disabled={routesLoading}
                      className={`text-left px-4 py-3 rounded-lg text-sm border transition-all ${
                        routesLoading
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stage === 'message' && routeResult && (
            <div className={stageCardClasses}>
              {renderHeader('A little encouragement before you head out!')}

              <section
                className={`rounded-2xl border-2 px-6 py-8 text-center space-y-4 transition-colors duration-500 ${
                  isDarkMode
                    ? 'border-slate-800 bg-slate-900/70'
                    : 'border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50'
                }`}
              >
                <p
                  className={`text-sm font-semibold uppercase tracking-wider ${
                    isDarkMode ? 'text-amber-200' : 'text-orange-600'
                  }`}
                >
                  Today's Kind Note
                </p>

                {/* Loading / Error / Empty / Success states */}
                {msgLoading && (
                  <p className={`text-2xl font-bold leading-relaxed ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                    Loading a kind note…
                  </p>
                )}
                {msgError && !msgLoading && (
                  <p className={`text-2xl font-bold leading-relaxed ${isDarkMode ? 'text-red-300' : 'text-red-700'}`}>
                    Could not load a note. Please try again.
                  </p>
                )}
                {!msgLoading && !msgError && (
                  <p className={`text-2xl font-bold leading-relaxed ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                    {encouragement ?? 'No notes yet for this route. Be the first to leave one!'}
                  </p>
                )}

                <p className={`text-base ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>
                  Starting from{' '}
                  <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{startLocation}</span> and
                  heading to{' '}
                  <span className={`font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>{destination}</span>.
                </p>
              </section>

              <button
                type="button"
                onClick={() => setStage('map')}
                className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 px-6 py-4 text-white text-lg font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                Continue to Map
              </button>
            </div>
          )}

          {stage === 'map' && routeResult && (
            <div className={stageCardClasses}>
              {renderHeader('Follow the highlighted path to reach your destination!')}

                <div
                  className={`rounded-xl px-5 py-4 space-y-3 transition-colors duration-500 ${
                    isDarkMode ? 'border border-slate-800 bg-slate-900/60' : 'border border-gray-200 bg-gray-50'
                  }`}
                >
                  <p className={`text-base font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-800'}`}>
                    {routeResult.summary}
                  </p>
                  {routeDistanceMiles !== null && (
                    <p className={`text-base ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>
                      <span className="font-semibold">Distance:</span> {routeDistanceMiles} miles
                    </p>
                  )}
                  {routeResult.steps && (
                    <ol
                    className={`list-decimal list-inside space-y-2 text-base ${
                      isDarkMode ? 'text-slate-300' : 'text-gray-600'
                    }`}
                  >
                    {routeResult.steps.map((step, index) => (
                      <li key={`route-step-${index}`}>{step}</li>
                    ))}
                  </ol>
                )}
                {locationStatus && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-base font-medium ${
                      locationStatus.type === 'error'
                        ? isDarkMode
                          ? 'border-red-500/40 bg-red-500/10 text-red-200'
                          : 'border-red-200 bg-red-50 text-red-700'
                        : isDarkMode
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                          : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {locationStatus.message}
                  </div>
                )}
              </div>

              <div
                className={`rounded-2xl px-5 py-4 transition-colors duration-500 ${
                  isDarkMode ? 'border border-slate-800 bg-slate-900/60' : 'border border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-slate-200' : 'text-gray-700'}`}>Map view</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(mapLayerOptions).map((layer) => {
                      const isActiveLayer = selectedMapLayer.id === layer.id;
                      return (
                        <button
                          key={layer.id}
                          type="button"
                          className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                            isActiveLayer
                              ? isDarkMode
                                ? 'border-blue-400 bg-blue-950/40 text-blue-200 shadow-inner'
                                : 'border-blue-500 bg-blue-50 text-blue-700 shadow-sm'
                              : isDarkMode
                                ? 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-blue-400 hover:text-blue-200'
                                : 'border-gray-200 bg-white text-gray-600 hover:border-blue-300 hover:text-blue-600'
                          }`}
                          aria-pressed={isActiveLayer}
                          onClick={() => setActiveMapLayer(layer.id)}
                        >
                          {layer.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className={`overflow-hidden rounded-2xl shadow-lg transition-colors duration-500 ${
                  isDarkMode ? 'border border-slate-800' : 'border border-gray-200'
                }`}
              >
                <MapContainer
                  center={mapCenter}
                  zoom={17}
                  style={{ height: '320px', width: '100%' }}
                  key={`${routeResult.startCoordinates}-${routeResult.destinationCoordinates}`}
                >
                  <TileLayer attribution={selectedMapLayer.attribution} url={selectedMapLayer.url} />
                  <Marker position={routeResult.startCoordinates}>
                    <Tooltip direction="top" offset={[0, -20]} permanent>
                      {startLocation}
                    </Tooltip>
                  </Marker>
                  <Marker position={routeResult.destinationCoordinates}>
                    <Tooltip direction="top" offset={[0, -20]} permanent>
                      {destination}
                    </Tooltip>
                  </Marker>
                  {userLocation && (
                    <Marker position={userLocation}>
                      <Tooltip direction="top" offset={[0, -20]} permanent>
                        You are here
                      </Tooltip>
                    </Marker>
                  )}
                  <Polyline positions={routeResult.pathCoordinates} color="#f97316" weight={4} dashArray="8 12" />
                </MapContainer>
              </div>

              {completionStatus && (
                <div
                  className={`rounded-xl border px-4 py-3 text-base ${
                    isDarkMode
                      ? 'border-red-500/40 bg-red-500/10 text-red-200'
                      : 'border-red-200 bg-red-50 text-red-700'
                  }`}
                >
                  {completionStatus.message}
                </div>
              )}

              <button
                type="button"
                onClick={handleCompleteWalk}
                disabled={isRecordingCompletion}
                className={`w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white text-lg font-bold shadow-lg transition-all duration-200 ${
                  isRecordingCompletion
                    ? 'cursor-not-allowed opacity-70'
                    : 'hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                }`}
              >
                {isRecordingCompletion ? 'Wrapping up…' : "I've Arrived"}
              </button>
            </div>
          )}

          {stage === 'completion' && (
            <div className={stageCardClasses}>
              {renderHeader("Route Completed! Would you like to brighten someone else's walk?")}

              <form className="space-y-4" onSubmit={handleSendMessage}>
                <label
                  htmlFor="kindMessage"
                  className={`block text-base font-semibold ${isDarkMode ? 'text-slate-100' : 'text-gray-700'}`}
                >
                  Leave a Message (optional)
                </label>
                <textarea
                  id="kindMessage"
                  value={userMessage}
                  onChange={(event) => setUserMessage(event.target.value)}
                  disabled={hasSubmittedMessage}
                  rows={4}
                  maxLength={MESSAGE_MAX_LENGTH}
                  placeholder={
                    hasSubmittedMessage
                      ? 'You already left a note for this walk. Tap Finish to head back to the start.'
                      : 'Share a kind thought for the next Maverick who walks this path...'
                  }
                  className={`w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 transition-all ${
                    hasSubmittedMessage
                      ? isDarkMode
                        ? 'border-slate-800 bg-slate-900/40 text-slate-500 cursor-not-allowed'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : isDarkMode
                        ? 'border-slate-700 bg-slate-900/40 text-slate-100 focus:border-blue-400 focus:ring-blue-900/40'
                        : 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />
                {!hasSubmittedMessage && (
                  <p className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-gray-500'}`}>
                    {userMessage.length}/{MESSAGE_MAX_LENGTH} characters (max)
                  </p>
                )}

                {submissionStatus && (
                  <div
                    className={`rounded-xl px-4 py-3 text-base font-medium ${
                      submissionStatus.type === 'success'
                        ? isDarkMode
                          ? 'border border-green-500/40 bg-green-500/10 text-green-200'
                          : 'bg-green-50 text-green-700 border border-green-200'
                      : submissionStatus.type === 'error'
                        ? isDarkMode
                          ? 'border border-red-500/40 bg-red-500/10 text-red-200'
                          : 'bg-red-50 text-red-700 border border-red-200'
                        : isDarkMode
                          ? 'border border-blue-500/40 bg-blue-500/10 text-blue-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {submissionStatus.message}
                  </div>
                )}

                <div
                  className={`rounded-xl border px-4 py-4 text-base transition-colors duration-500 ${
                    isDarkMode
                      ? 'border-blue-500/40 bg-blue-500/10 text-blue-200'
                      : 'border-blue-200 bg-blue-50 text-blue-800'
                  }`}
                >
                  <p className="font-semibold">We'd love your feedback!</p>
                  <p className={`mt-1 text-sm ${isDarkMode ? 'text-blue-100' : 'text-blue-700'}`}>
                    Help us enhance MavWalk by taking a quick survey about your experience.
                  </p>
                  <a
                    href="https://docs.google.com/forms/d/e/1FAIpQLScs3F9rVS34BXsj1uKQu4iI-0681Q3Jljz9cN1182Hbw6CSGg/viewform"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`mt-3 inline-block rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors ${
                      isDarkMode ? 'bg-blue-500 hover:bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    Take the survey
                  </a>
                </div>

                <div className="space-y-3">
                  <button
                    type="submit"
                    className={`w-full rounded-xl px-6 py-4 text-white text-lg font-bold shadow-lg transition-all duration-200 ${
                      hasSubmittedMessage
                        ? isDarkMode
                          ? 'bg-slate-700 cursor-not-allowed'
                          : 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    disabled={isSavingMessage || hasSubmittedMessage}
                  >
                    {isSavingMessage ? 'Saving...' : hasSubmittedMessage ? 'Message Sent' : 'Send Message'}
                  </button>

                  <button
                    type="button"
                    onClick={resetJourney}
                    className={`w-full rounded-xl border-2 px-6 py-4 text-lg font-bold transition-all duration-200 ${
                      isDarkMode
                        ? 'border-orange-400 text-orange-200 hover:bg-orange-500/10'
                        : 'border-orange-500 text-orange-500 hover:bg-orange-50'
                    }`}
                  >
                    Finish
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
