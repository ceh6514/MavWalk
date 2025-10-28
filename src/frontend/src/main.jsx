import React, { useEffect, useMemo, useRef, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import mavWalkLogo from './MavWalkLogo.png';
import utaLogo from './142-1425701_university-of-texas-uta-logo-university-of-texas-at-arlington-logo.png';

const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

const campusLocations = [
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

const sampleRoutes = {
  'Central Library|Maverick Activities Center': {
    startCoordinates: [32.7296, -97.1131],
    destinationCoordinates: [32.7282, -97.1167],
    pathCoordinates: [
      [32.7296, -97.1131],
      [32.7293, -97.1142],
      [32.7289, -97.1154],
      [32.7282, -97.1167],
    ],
    eta: '7 minutes',
    steps: [
      'Exit the Central Library toward the west plaza.',
      'Go straight until you get on the bridge connecting to the Fine Arts Building.',
      'Continue past the building and take a right',
      'The Maverick Activities Center is on your left with giant glass windows.',
    ],
  },
  'College Park Center|Science Hall': {
    startCoordinates: [32.7323, -97.1056],
    destinationCoordinates: [32.7297, -97.1124],
    pathCoordinates: [
      [32.7323, -97.1056],
      [32.7315, -97.1078],
      [32.7306, -97.1102],
      [32.7297, -97.1124],
    ],
    eta: '6 minutes',
    steps: [
      'Leave College Park Center and head northwest toward Spaniolo Drive.',
      'Turn left on Spaniolo Drive and continue straight.',
      'Cross UTA Boulevard and keep following Spaniolo Drive.',
      'Science Hall is on the right—enter through the south entrance.',
    ],
  },
  'Engineering Research Building|Fine Arts Building': {
    startCoordinates: [32.732, -97.1114],
    destinationCoordinates: [32.731, -97.1171],
    pathCoordinates: [
      [32.732, -97.1114],
      [32.7316, -97.1128],
      [32.7314, -97.1147],
      [32.731, -97.1171],
    ],
    eta: '8 minutes',
    steps: [
      'Exit the Engineering Research Building toward the courtyard.',
      'Follow the path west along West Mitchell Street.',
      'Continue straight past the Architecture Building.',
      'The Fine Arts Building is ahead on the left—enter through the main lobby.',
    ],
  },
  'University Center|Central Library': {
    startCoordinates: [32.7312, -97.1109],
    destinationCoordinates: [32.7296, -97.1131],
    pathCoordinates: [
      [32.7312, -97.1109],
      [32.7308, -97.1118],
      [32.7302, -97.1126],
      [32.7296, -97.1131],
    ],
    eta: '4 minutes',
    steps: [
      'Leave the University Center heading west toward Cooper Street.',
      'Turn slightly right and follow the path toward the Central Library mall.',
      'Continue straight until you reach the library plaza.',
      'Enter the Central Library through the front doors.',
    ],
  },
};

const defaultCenter = [32.7318, -97.1133];

const App = () => {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [stage, setStage] = useState('home');
  const [routeResult, setRouteResult] = useState(null);
  const [formFeedback, setFormFeedback] = useState(null);
  const [userMessage, setUserMessage] = useState('');
  const [isSavingMessage, setIsSavingMessage] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState(null);
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

  const handleFindRoute = (event) => {
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

    const routeKey = `${startLocation}|${destination}`;
    const routeDetails = sampleRoutes[routeKey];

    if (!routeDetails) {
      setFormFeedback({
        type: 'info',
        message:
          'We are still curating that path. Please choose another pair of locations while we finish mapping it.',
      });
      return;
    }

    const encouragement = kindnessMessages[Math.floor(Math.random() * kindnessMessages.length)];

    setRouteResult({
      ...routeDetails,
      startLocation,
      destination,
      encouragement,
      summary: `Curated walk from ${startLocation} to ${destination}.\n Estimated travel time: ${routeDetails.eta}.`,
    });

    setStage('message');
  };

  const handleSendMessage = (event) => {
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

    setSubmissionStatus({
      type: 'success',
      message: 'Thanks! Your message was saved for future Mavericks to enjoy. Tap Finish to end your walk.',
    });
    setUserMessage('');
    setHasSubmittedMessage(true);
  };

  const renderHeader = (subtitle) => (
    <header className="text-center space-y-4">
      <div className="mx-auto w-32 h-32 rounded-2xl bg-white flex items-center justify-center shadow-lg p-3">
        <img src={mavWalkLogo} alt="MavWalk Logo" className="w-full h-full object-contain" />
      </div>

      <div className="space-y-3">
        <h1 className="text-5xl font-bold text-purple-600">MavWalk</h1>
        <p className="text-gray-600 text-base">
          Navigate UTA campus with uplifting messages
        </p>
        {subtitle && <p className="text-gray-500 text-base mt-2">{subtitle}</p>}
      </div>
      
      <div className="flex items-center justify-center gap-8 text-base text-gray-500 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">👥</span>
          <span>2,847 walks today</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg">❤️</span>
          <span>1,293 messages shared</span>
        </div>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-blue-600 relative overflow-hidden">
      {/* UTA Logo pattern background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0" style={{
          backgroundImage: `url(${utaLogo})`,
          backgroundSize: '200px 200px',
          backgroundRepeat: 'repeat',
          backgroundPosition: 'center'
        }}></div>
      </div>

      {/* Navigation Bar */}
      <nav className="relative z-10 bg-blue-600 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src={mavWalkLogo} alt="MavWalk" className="w-full h-full object-contain" />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-bold text-white">MavWalk</span>
              <span className="bg-orange-500 text-white text-sm font-semibold px-2.5 py-1 rounded">BETA</span>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#" className="text-white hover:text-gray-200 font-medium text-base">Features</a>
            <a href="#" className="text-white hover:text-gray-200 font-medium text-base">Campus Map</a>
            <a href="#" className="text-white hover:text-gray-200 font-medium text-base">Community</a>
            <a href="#" className="text-white hover:text-gray-200 font-medium text-base">Support</a>
          </div>
          
          <div className="flex items-center gap-3">
            <button className="bg-green-500 text-white px-5 py-2.5 rounded-lg font-semibold text-base flex items-center gap-2 hover:bg-green-600 transition-colors">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              Live
            </button>
            <button className="border border-white/30 px-5 py-2.5 rounded-lg font-semibold text-base text-white hover:bg-white/10 transition-colors">
              Sign In
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Banner */}
      {stage === 'home' && (
        <div className="relative z-10 bg-orange-500 text-white text-center py-4 px-6">
          <p className="text-base font-medium">
            Live Demo: Experience MavWalk's campus navigation system
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          {stage === 'home' && (
            <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              {renderHeader()}

              {/* Plan Your Journey Section */}
              <div className="pt-4">
                <div className="border-2 border-gray-200 rounded-2xl p-6 bg-white shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                    </svg>
                    <h2 className="text-xl font-bold text-gray-800">Plan Your Journey</h2>
                  </div>
                  <p className="text-base text-gray-600 mb-6">
                    Get directions with encouraging messages along the way
                  </p>

                  <form className="space-y-5" onSubmit={handleFindRoute}>
                    {/* Starting From */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-base font-semibold text-gray-700">
                        <span className="text-green-600 text-lg">📍</span>
                        Starting From
                      </label>
                      <select
                        id="startLocation"
                        value={startLocation}
                        onChange={(event) => setStartLocation(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-4 text-base text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        <option value="">Enter starting location...</option>
                        {campusLocations.map((location) => (
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
                        className="w-12 h-12 bg-blue-100 hover:bg-blue-200 rounded-full flex items-center justify-center text-blue-600 transition-colors"
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
                      <label className="flex items-center gap-2 text-base font-semibold text-gray-700">
                        <span className="text-orange-600 text-lg">🎯</span>
                        Destination
                      </label>
                      <select
                        id="destination"
                        value={destination}
                        onChange={(event) => setDestination(event.target.value)}
                        className="w-full appearance-none rounded-xl border border-gray-300 bg-white px-4 py-4 text-base text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        <option value="">Where are you going?</option>
                        {campusLocations.map((location) => (
                          <option key={`destination-${location}`} value={location}>
                            {location}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Start Button */}
                    <button
                      type="submit"
                      className="w-full rounded-xl bg-gradient-to-r from-purple-500 to-orange-500 px-6 py-4 text-white text-lg font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2"
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
                  {campusLocations.slice(0, 4).map((location) => (
                    <button
                      key={`popular-${location}`}
                      onClick={() => setDestination(location)}
                      className="text-left px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm text-gray-700 border border-gray-200 hover:border-gray-300 transition-all"
                    >
                      {location}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {stage === 'message' && routeResult && (
            <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              {renderHeader('A little encouragement before you head out!')}

              <section className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-orange-50 to-yellow-50 px-6 py-8 text-center space-y-4">
                <p className="text-sm font-semibold uppercase tracking-wider text-orange-600">Today's Kind Note</p>
                <p className="text-2xl font-bold text-gray-800 leading-relaxed">{routeResult.encouragement}</p>
                <p className="text-base text-gray-600">
                  Starting from <span className="font-semibold text-gray-800">{startLocation}</span> and heading to{' '}
                  <span className="font-semibold text-gray-800">{destination}</span>.
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
            <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              {renderHeader('Follow the highlighted path to reach your destination!')}

              <div className="rounded-xl border border-gray-200 bg-gray-50 px-5 py-4 space-y-3">
                <p className="text-base font-semibold text-gray-800">{routeResult.summary}</p>
                {routeResult.steps && (
                  <ol className="list-decimal list-inside space-y-2 text-base text-gray-600">
                    {routeResult.steps.map((step, index) => (
                      <li key={`route-step-${index}`}>{step}</li>
                    ))}
                  </ol>
                )}
                {locationStatus && (
                  <div
                    className={`rounded-lg border px-3 py-2 text-base font-medium ${
                      locationStatus.type === 'error'
                        ? 'border-red-200 bg-red-50 text-red-700'
                        : 'border-blue-200 bg-blue-50 text-blue-700'
                    }`}
                  >
                    {locationStatus.message}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-lg">
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
                  <Polyline positions={routeResult.pathCoordinates} color="#f97316" weight={4} dashArray="8 12" />
                </MapContainer>
              </div>

              <button
                type="button"
                onClick={() => setStage('completion')}
                className="w-full rounded-xl bg-gradient-to-r from-orange-500 to-red-500 px-6 py-4 text-white text-lg font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              >
                I've Arrived
              </button>
            </div>
          )}

          {stage === 'completion' && (
            <div className="bg-white rounded-3xl shadow-2xl p-8 space-y-6">
              {renderHeader('Route Completed! Would you like to brighten someone else\'s walk?')}

              <form className="space-y-4" onSubmit={handleSendMessage}>
                <label htmlFor="kindMessage" className="block text-base font-semibold text-gray-700">
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
                  className={`w-full rounded-xl border px-4 py-3 text-base focus:outline-none focus:ring-2 transition-all ${
                    hasSubmittedMessage
                      ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'border-gray-300 bg-white text-gray-700 focus:border-blue-500 focus:ring-blue-200'
                  }`}
                />

                {submissionStatus && (
                  <div
                    className={`rounded-xl px-4 py-3 text-base font-medium ${
                      submissionStatus.type === 'success'
                        ? 'bg-green-50 text-green-700 border border-green-200'
                        : submissionStatus.type === 'error'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {submissionStatus.message}
                  </div>
                )}

                <div className="space-y-3">
                  <button
                    type="submit"
                    className={`w-full rounded-xl px-6 py-4 text-white text-lg font-bold shadow-lg transition-all duration-200 ${
                      hasSubmittedMessage
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]'
                    }`}
                    disabled={isSavingMessage || hasSubmittedMessage}
                  >
                    {isSavingMessage ? 'Saving...' : hasSubmittedMessage ? 'Message Sent' : 'Send Message'}
                  </button>

                  <button
                    type="button"
                    onClick={resetJourney}
                    className="w-full rounded-xl border-2 border-orange-500 px-6 py-4 text-orange-500 text-lg font-bold hover:bg-orange-50 transition-all duration-200"
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
