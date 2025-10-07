import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

const defaultCampusLocations = [
  'Central Library',
  'College Park Center',
  'Engineering Research Building',
  'Fine Arts Building',
  'Maverick Activities Center',
  'Science Hall',
  'University Center',
];

const kindnessMessages = [
  'You are exactly where you need to be today. Take a deep breath and enjoy the walk.',
  'Another Maverick left this note for you: “You are stronger than this week’s deadlines.”',
  'Someone believes in you. Keep your head up and keep moving forward.',
  'Your smile might be the highlight of someone’s day. Share it generously!',
  'You deserve to feel proud of yourself. This small walk is part of a big journey.',
  'There is so much goodness waiting for you today. Thanks for being part of MavWalk!',
];

const defaultCenter = [32.7318, -97.1133];

const App = () => {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [stage, setStage] = useState('home');
  const [routeResult, setRouteResult] = useState(null);
  const [formFeedback, setFormFeedback] = useState(null);
  const [userMessage, setUserMessage] = useState('');
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [campusLocations, setCampusLocations] = useState(defaultCampusLocations);
  const [locationNotice, setLocationNotice] = useState(null);
  const [isLoadingRoute, setIsLoadingRoute] = useState(false);
  const [isSavingMessage, setIsSavingMessage] = useState(false);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/locations');
        if (!response.ok) {
          throw new Error('Failed to load locations');
        }

        const data = await response.json();
        const locationNames = data.map((location) => location.name).sort();
        if (locationNames.length) {
          setCampusLocations(locationNames);
        }
      } catch (error) {
        console.error('Unable to load locations from the backend.', error);
        setLocationNotice('Using the built-in campus locations because the live list could not be loaded.');
      }
    };

    fetchLocations();
  }, []);
  const [hasSubmittedMessage, setHasSubmittedMessage] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [locationStatus, setLocationStatus] = useState(null);
  const watchIdRef = useRef(null);

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
          message = 'Location sharing is blocked. Enable it in your browser to see your position during the walk.';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          message = 'Location data is temporarily unavailable. We will keep trying to update your position.';
        } else if (error.code === error.TIMEOUT) {
          message = 'The request for your location timed out. Try checking your connection and permissions.';
        }

        setLocationStatus({
          type: 'error',
          message,
        });
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 20000,
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [stage]);


  const mapCenter = useMemo(() => {
    if (!routeResult?.pathCoordinates?.length) {
      return defaultCenter;
    }

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

  const handleFindRoute = async (event) => {
    event.preventDefault();
    setFormFeedback(null);
    setSubmissionStatus(null);

    if (!startLocation || !destination) {
      setFormFeedback({
        type: 'error',
        message: 'Please select both a starting point and a destination.',
      });
      return;
    }

    if (startLocation === destination) {
      setFormFeedback({
        type: 'error',
        message: 'Pick two different locations to discover a curated walk.',
      });
      return;
    }

    try {
      setIsLoadingRoute(true);
      const response = await fetch(
        `http://localhost:3001/api/routes?start=${encodeURIComponent(startLocation)}&destination=${encodeURIComponent(destination)}`
      );

      if (response.status === 404) {
        setFormFeedback({
          type: 'info',
          message:
            'We are still curating that path. Please choose another pair of locations while we finish mapping it.',
        });
        return;
      }

      if (!response.ok) {
        throw new Error('Unable to load route');
      }

      const routeDetails = await response.json();
      const encouragement = kindnessMessages[Math.floor(Math.random() * kindnessMessages.length)];

      setRouteResult({
        ...routeDetails,
        startLocation,
        destination,
        encouragement,
        summary:
          routeDetails.summary ||
          `Curated walk from ${startLocation} to ${destination}.\n Estimated travel time: ${routeDetails.eta}.`,
      });

      setStage('message');
    } catch (error) {
      console.error('Unable to load curated route from backend.', error);
      setFormFeedback({
        type: 'error',
        message: 'We had trouble retrieving that path. Please try again or pick a different pair of locations.',
      });
    } finally {
      setIsLoadingRoute(false);
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


    if (!userMessage.trim()) {
      setSubmissionStatus({
        type: 'error',
        message: 'Please share a short note or tap Finish to skip this step.',
      });
      return;
    }

    try {
      setIsSavingMessage(true);
      setSubmissionStatus(null);
      const response = await fetch('http://localhost:3001/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          startLocation,
          destination,
        }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ message: 'Unable to save message.' }));
        throw new Error(errorBody.message);
      }

      setSubmissionStatus({
        type: 'success',
        message: 'Thanks! Your message was saved for future Mavericks to enjoy.',
      });
      setUserMessage('');
    } catch (error) {
      console.error('Unable to save message to backend.', error);
      setSubmissionStatus({
        type: 'error',
        message: error.message || 'We could not save your message right now. Please try again.',
      });
    } finally {
      setIsSavingMessage(false);
    }
    setSubmissionStatus({
      type: 'success',
      message: 'Thanks! Your message was saved for future Mavericks to enjoy. Tap Finish to end your walk.',
    });
    setUserMessage('');
    setHasSubmittedMessage(true);
  };

  const renderHeader = (subtitle) => (
    <header className="text-center space-y-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-uta-blue flex items-center justify-center text-white text-3xl font-bold">
        MW
      </div>

      <div className="space-y-1">
        <h1 className="text-4xl font-extrabold text-uta-blue tracking-tight">MavWalk</h1>
        <p className="text-uta-orange font-semibold uppercase text-sm tracking-[0.4em]">
          UPLIFTING ROUTES FOR MAVERICKS
        </p>
        {subtitle && <p className="text-gray-600 text-base">{subtitle}</p>}
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-uta-blue via-white to-uta-orange flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white shadow-2xl rounded-3xl p-10 space-y-8">
        {stage === 'home' && (
          <>
            {renderHeader('Choose your starting location and destination to begin.')}

            <form className="space-y-6" onSubmit={handleFindRoute}>
              <div className="space-y-2">
                <label
                  htmlFor="startLocation"
                  className="block text-sm font-semibold text-uta-blue uppercase tracking-wider"
                >
                  Starting From
                </label>
                <select
                  id="startLocation"
                  value={startLocation}
                  onChange={(event) => setStartLocation(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-uta-blue/20 bg-uta-blue/5 px-4 py-3 text-base text-uta-blue focus:border-uta-orange focus:outline-none focus:ring-2 focus:ring-uta-orange/40"
                >
                  <option value="">Select a location</option>
                  {campusLocations.map((location) => (
                    <option key={`start-${location}`} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="destination"
                  className="block text-sm font-semibold text-uta-blue uppercase tracking-wider"
                >
                  Destination
                </label>
                <select
                  id="destination"
                  value={destination}
                  onChange={(event) => setDestination(event.target.value)}
                  className="w-full appearance-none rounded-2xl border border-uta-blue/20 bg-uta-blue/5 px-4 py-3 text-base text-uta-blue focus:border-uta-orange focus:outline-none focus:ring-2 focus:ring-uta-orange/40"
                >
                  <option value="">Select a location</option>
                  {campusLocations.map((location) => (
                    <option key={`destination-${location}`} value={location}>
                      {location}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-uta-orange px-5 py-3 text-lg font-bold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-orange/50 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isLoadingRoute}
              >
                {isLoadingRoute ? 'Finding Route...' : 'Find My Route'}
              </button>
            </form>

            {formFeedback && (
              <div
                className={`rounded-2xl border px-4 py-4 text-base font-medium ${
                  formFeedback.type === 'error'
                    ? 'border-red-200 bg-red-50 text-red-700'
                    : 'border-uta-blue/20 bg-uta-blue/5 text-uta-blue'
                }`}
              >
                {formFeedback.message}
              </div>
            )}

            {locationNotice && (
              <div className="rounded-2xl border border-uta-blue/10 bg-uta-blue/5 px-4 py-3 text-sm text-uta-blue/70">
                {locationNotice}
              </div>
            )}
          </>
        )}

        {stage === 'message' && routeResult && (
          <div className="space-y-8">
            {renderHeader('A little encouragement before you head out!')}

            <section className="rounded-3xl border border-uta-orange/30 bg-uta-orange/10 px-6 py-8 text-center space-y-4">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-uta-orange">Today's Kind Note</p>
              <p className="text-2xl font-bold text-uta-blue">{routeResult.encouragement}</p>
              <p className="text-sm text-uta-blue/70">
                Starting from <span className="font-semibold">{startLocation}</span> and heading to{' '}
                <span className="font-semibold">{destination}</span>.
              </p>
            </section>

            <button
              type="button"
              onClick={() => setStage('map')}
              className="w-full rounded-2xl bg-uta-blue px-5 py-3 text-lg font-semibold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-blue/40"
            >
              Continue to Map
            </button>
          </div>
        )}

        {stage === 'map' && routeResult && (
          <div className="space-y-6">
            {renderHeader('Follow the highlighted path to reach your destination!')}

            <div className="rounded-2xl border border-uta-blue/20 bg-uta-blue/5 px-5 py-5 text-uta-blue space-y-3">
              <p className="text-base font-medium">{routeResult.summary}</p>
              {routeResult.steps && (
                <ol className="list-decimal list-inside space-y-1 text-sm text-uta-blue/80">
                  {routeResult.steps.map((step, index) => (
                    <li key={`route-step-${index}`}>{step}</li>
                  ))}
                </ol>
              )}
              {locationStatus && (
                <div
                  className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                    locationStatus.type === 'error'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-uta-blue/30 bg-white text-uta-blue'
                  }`}
                >
                  {locationStatus.message}
                </div>
              )}
            </div>

            <div className="overflow-hidden rounded-2xl border border-uta-blue/10 shadow-inner">
              <MapContainer
                center={mapCenter}
                zoom={17}
                style={{ height: '320px', width: '100%' }}
                key={`${routeResult.startCoordinates}-${routeResult.destinationCoordinates}`}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
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
                <Polyline positions={routeResult.pathCoordinates} color="#ff6f3c" weight={4} dashArray="8 12" />
              </MapContainer>
            </div>

            <button
              type="button"
              onClick={() => setStage('completion')}
              className="w-full rounded-2xl bg-uta-orange px-5 py-3 text-lg font-semibold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-orange/50"
            >
              I've Arrived
            </button>
          </div>
        )}

        {stage === 'completion' && (
          <div className="space-y-6">
            {renderHeader('Route Completed! Would you like to brighten someone else\'s walk?')}

            <form className="space-y-4" onSubmit={handleSendMessage}>
              <label htmlFor="kindMessage" className="block text-sm font-semibold text-uta-blue uppercase tracking-wider">
                Leave a Message (optional)
              </label>
              <textarea
                id="kindMessage"
                value={userMessage}
                onChange={(event) => setUserMessage(event.target.value)}
                disabled={hasSubmittedMessage}
                rows={4}
                placeholder={
                  hasSubmittedMessage
                    ? 'You already left a note for this walk. Tap Finish to head back to the start.'
                    : 'Share a kind thought for the next Maverick who walks this path...'
                }
                className={`w-full rounded-2xl border px-4 py-3 text-base focus:border-uta-orange focus:outline-none focus:ring-2 focus:ring-uta-orange/40 ${
                  hasSubmittedMessage
                    ? 'border-uta-blue/10 bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'border-uta-blue/20 bg-uta-blue/5 text-uta-blue'
                }`}
              />

              {submissionStatus && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    submissionStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : submissionStatus.type === 'error'
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-uta-blue/10 text-uta-blue border border-uta-blue/20'
                  }`}
                >
                  {submissionStatus.message}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                className="w-full rounded-2xl bg-uta-blue px-5 py-3 text-lg font-semibold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-blue/40 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={isSavingMessage}
              >
                {isSavingMessage ? 'Saving...' : 'Send Message'}
              </button>
                  disabled={hasSubmittedMessage}
                  className={`w-full rounded-2xl px-5 py-3 text-lg font-semibold uppercase tracking-wider shadow-lg transition-transform duration-200 focus:outline-none focus:ring-4 focus:ring-uta-blue/40 ${
                    hasSubmittedMessage
                      ? 'bg-uta-blue/30 text-white cursor-not-allowed shadow-none'
                      : 'bg-uta-blue text-white hover:-translate-y-1 hover:shadow-xl'
                  }`}
                >
                  {hasSubmittedMessage ? 'Message Sent' : 'Send Message'}
                </button>
                <button
                  type="button"
                  onClick={resetJourney}
                  className="w-full rounded-2xl border border-uta-orange/40 px-5 py-3 text-lg font-semibold uppercase tracking-wider text-uta-orange shadow-sm transition-transform duration-200 hover:-translate-y-1 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-uta-orange/30"
                >
                  Finish
                </button>
              </div>
            </form>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-sm text-gray-500">
        Early build, so features are not fully representative of final product.
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
