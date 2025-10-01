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


const sampleRoutes = {
  'College Park Center|Maverick Activities Center': {
    eta: '6 minutes',
    steps: [
      'Exit College Park Center through the west plaza toward Spaniolo Drive.',
      'Follow Spaniolo Drive north for one block.',
      'Turn left on West Nedderman Drive and continue past the College of Business.',
      'The Maverick Activities Center will be on your right—enter through the main glass doors.',
    ],
  },
};


const App = () => {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [feedback, setFeedback] = useState(null);

  const handleFindRoute = (event) => {
    event.preventDefault();

    setFormError(null);

    if (!startLocation || !destination) {
      setFeedback({
        status: 'error',
        message: 'Please select both a starting point and destination to continue.',
      });
      return;
    }

    if (startLocation === destination) {
      setFeedback({
        status: 'error',
        message: 'Choose two different locations to discover a new route.',
      });
      return;
    }

    const routeKey = `${startLocation}|${destination}`;
    const routeDetails = sampleRoutes[routeKey];

    if (routeDetails) {
      setFeedback({
        status: 'success',
        message: `Here is the safest path we recommend from ${startLocation} to ${destination}. Estimated travel time: ${routeDetails.eta}.`,
        steps: routeDetails.steps,
      });
      return;
    }

    setFeedback({
      status: 'info',
      message: `Your curated route from ${startLocation} to ${destination} is on its way!`,
    });
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
            {renderHeader('Please choose your starting location and destination below!')}

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

            {formError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-red-700">
                <p className="text-base font-medium">{formError}</p>
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

            <div
              className={`rounded-2xl border px-5 py-5 text-uta-blue space-y-3 ${
                routeResult.status === 'success'
                  ? 'border-uta-blue/20 bg-uta-blue/5'
                  : 'border-uta-orange/20 bg-uta-orange/10'
              }`}
            >
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
                <Polyline
                  positions={[routeResult.startCoordinates, routeResult.destinationCoordinates]}
                  color="#ff6f3c"
                  weight={4}
                  dashArray="8 12"
                />
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
            {renderHeader('Route Completed! Would you like to brighten someone else’s walk?')}

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

          <button
            type="submit"
            className="w-full rounded-2xl bg-uta-orange px-5 py-3 text-lg font-bold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-orange/50"
          >
            Find My Route
          </button>
        </form>

        {feedback && (
          <div
            className={`rounded-2xl border px-4 py-4 text-uta-blue space-y-3 ${
              feedback.status === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-uta-blue/20 bg-uta-blue/5'
            }`}
          >
            <p className="text-base font-medium">{feedback.message}</p>
            {feedback.steps && (
              <ol className="list-decimal list-inside space-y-1 text-sm text-uta-blue/80">
                {feedback.steps.map((step, index) => (
                  <li key={`route-step-${index}`}>{step}</li>
                ))}
              </ol>
            )}
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
