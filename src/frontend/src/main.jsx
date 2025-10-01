import React, { useMemo, useState } from 'react';
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
  const [submissionStatus, setSubmissionStatus] = useState(null);

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

    if (!userMessage.trim()) {
      setSubmissionStatus({
        type: 'error',
        message: 'Please share a short note or tap Finish to skip this step.',
      });
      return;
    }

    setSubmissionStatus({
      type: 'success',
      message: 'Thanks! Your message was saved for future Mavericks to enjoy.',
    });
    setUserMessage('');
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
                className="w-full rounded-2xl bg-uta-orange px-5 py-3 text-lg font-bold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-orange/50"
              >
                Find My Route
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
                rows={4}
                placeholder="Share a kind thought for the next Maverick who walks this path..."
                className="w-full rounded-2xl border border-uta-blue/20 bg-uta-blue/5 px-4 py-3 text-base text-uta-blue focus:border-uta-orange focus:outline-none focus:ring-2 focus:ring-uta-orange/40"
              />

              {submissionStatus && (
                <div
                  className={`rounded-2xl px-4 py-3 text-sm font-medium ${
                    submissionStatus.type === 'success'
                      ? 'bg-green-50 text-green-700 border border-green-200'
                      : 'bg-red-50 text-red-700 border border-red-200'
                  }`}
                >
                  {submissionStatus.message}
                </div>
              )}

              <div className="space-y-3">
                <button
                  type="submit"
                  className="w-full rounded-2xl bg-uta-blue px-5 py-3 text-lg font-semibold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-blue/40"
                >
                  Send Message
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
