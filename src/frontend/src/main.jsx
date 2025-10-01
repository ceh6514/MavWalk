import React, { useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { MapContainer, Marker, Polyline, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const campusLocations = [
  'Central Library',
  'College Park Center',
  'Engineering Research Building',
  'Fine Arts Building',
  'Maverick Activities Center',
  'Science Hall',
  'University Center',
];

const locationCoordinates = {
  'Central Library': [32.72991314809259, -97.11290672883602],
  'College Park Center': [32.730652363101214, -97.10803828570232],
  'Engineering Research Building': [32.73344190653296, -97.11322886238746],
  'Fine Arts Building': [32.73050397086501, -97.11513947404578],
  'Maverick Activities Center': [32.73195397555977, -97.11691204643674],
  'Science Hall': [32.73048850678233, -97.11365621515012],
  'University Center': [32.73166137076197, -97.11099924459786],
};

const kindnessMessages = [
  'Hope you have a great day!',
  'You are beautifully unique!',
  'You bring so much light to campus—thanks for being you!',
  "There's a Maverick out there smiling because of you.",
  'Take a deep breath—you are exactly where you need to be.',
];

const predefinedRoutes = {};

const defaultMarkerIcon = new L.Icon({
  iconUrl: new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href,
  iconRetinaUrl: new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href,
  shadowUrl: new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultMarkerIcon;

const getRouteCoordinates = (start, destination) => {
  const routeKey = `${start}|${destination}`;
  if (predefinedRoutes[routeKey]) {
    return predefinedRoutes[routeKey];
  }

  const startCoords = locationCoordinates[start];
  const destinationCoords = locationCoordinates[destination];

  if (!startCoords || !destinationCoords) {
    return [];
  }

  return [startCoords, destinationCoords];
};

const App = () => {
  const [screen, setScreen] = useState('home');
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [feedback, setFeedback] = useState('');
  const [selectedMessage, setSelectedMessage] = useState('');
  const [selectedRoute, setSelectedRoute] = useState(null);

  const handleFindRoute = (event) => {
    event.preventDefault();

    if (!startLocation || !destination) {
      setFeedback('Please select both a starting point and destination to continue.');
      return;
    }

    if (startLocation === destination) {
      setFeedback('Choose two different locations to discover a new route.');
      return;
    }

    const coordinates = getRouteCoordinates(startLocation, destination);

    if (!coordinates.length) {
      setFeedback("We don't have a curated route for that pair just yet, but we're working on it!");
      return;
    }

    const message = kindnessMessages[Math.floor(Math.random() * kindnessMessages.length)];

    setSelectedRoute({
      start: startLocation,
      destination,
      coordinates,
    });
    setSelectedMessage(message);
    setFeedback('');
    setScreen('message');
  };

  const handleContinueToMap = () => {
    setScreen('map');
  };

  const handleResetJourney = () => {
    setScreen('home');
    setStartLocation('');
    setDestination('');
    setSelectedRoute(null);
    setSelectedMessage('');
    setFeedback('');
  };

  const mapCenter = useMemo(() => {
    if (!selectedRoute || !selectedRoute.coordinates.length) {
      return { lat: 32.7312, lng: -97.112 }; // UTA campus center fallback
    }

    const total = selectedRoute.coordinates.reduce(
      (accumulator, [lat, lng]) => {
        return {
          lat: accumulator.lat + lat,
          lng: accumulator.lng + lng,
        };
      },
      { lat: 0, lng: 0 }
    );

    return {
      lat: total.lat / selectedRoute.coordinates.length,
      lng: total.lng / selectedRoute.coordinates.length,
    };
  }, [selectedRoute]);

  const renderHeader = (subtitle) => (
    <header className="text-center space-y-4">
      <div className="mx-auto w-20 h-20 rounded-full bg-uta-blue flex items-center justify-center text-white text-3xl font-bold">
        MW
      </div>

      <div className="space-y-1">
        <h1 className="text-4xl font-extrabold text-uta-blue tracking-tight">MavWalk</h1>
        <p className="text-uta-orange font-semibold uppercase text-sm tracking-[0.4em]">Kind Routes for Mavericks</p>
        {subtitle && <p className="text-gray-600 text-base">{subtitle}</p>}
      </div>
    </header>
  );

  const renderHomeScreen = () => (
    <div className="w-full max-w-xl bg-white shadow-2xl rounded-3xl p-10 space-y-8">
      {renderHeader('Pick your starting point and destination to uncover a campus walk paired with a kind message.')}

      <form className="space-y-6" onSubmit={handleFindRoute}>
        <div className="space-y-2">
          <label htmlFor="startLocation" className="block text-sm font-semibold text-uta-blue uppercase tracking-wider">
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
          <label htmlFor="destination" className="block text-sm font-semibold text-uta-blue uppercase tracking-wider">
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

      {feedback && (
        <div className="rounded-2xl border border-uta-blue/20 bg-uta-blue/5 px-4 py-3 text-center text-uta-blue">{feedback}</div>
      )}

      <footer className="text-center text-sm text-gray-400">
        Routes and kind messages are curated just for Mavericks—more coming soon!
      </footer>
    </div>
  );

  const renderMessageScreen = () => (
    <div className="w-full max-w-xl bg-white shadow-2xl rounded-3xl p-10 space-y-10">
      {renderHeader('Take in a quick moment of kindness before you set out on your walk.')}

      <div className="space-y-6">
        <div className="rounded-3xl border border-uta-orange/20 bg-uta-orange/10 p-8 text-center">
          <p className="text-2xl font-semibold text-uta-blue leading-relaxed">“{selectedMessage}”</p>
        </div>

        {selectedRoute && (
          <div className="rounded-3xl bg-uta-blue/5 p-6 text-center text-uta-blue">
            <p className="text-sm font-semibold uppercase tracking-wider text-uta-orange mb-1">Your Upcoming Walk</p>
            <p className="text-lg font-bold">
              {selectedRoute.start} → {selectedRoute.destination}
            </p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleContinueToMap}
        className="w-full rounded-2xl bg-uta-blue px-5 py-3 text-lg font-bold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-blue/40"
      >
        Continue to Map
      </button>
    </div>
  );

  const renderMapScreen = () => (
    <div className="w-full max-w-3xl bg-white shadow-2xl rounded-3xl p-8 space-y-8">
      {renderHeader('Follow the highlighted path to enjoy your Maverick walk!')}

      {selectedRoute && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl bg-uta-blue/5 p-6 text-uta-blue">
              <p className="text-sm font-semibold uppercase tracking-wider text-uta-orange mb-1">Starting From</p>
              <p className="text-lg font-bold">{selectedRoute.start}</p>
            </div>
            <div className="rounded-3xl bg-uta-blue/5 p-6 text-uta-blue">
              <p className="text-sm font-semibold uppercase tracking-wider text-uta-orange mb-1">Destination</p>
              <p className="text-lg font-bold">{selectedRoute.destination}</p>
            </div>
          </div>

          <div className="h-96 w-full overflow-hidden rounded-3xl">
            <MapContainer
              key={`${selectedRoute.start}-${selectedRoute.destination}`}
              center={mapCenter}
              zoom={17}
              scrollWheelZoom={false}
              className="h-full w-full"
            >
              <TileLayer
                attribution="&copy; <a href='http://www.openstreetmap.org/copyright'>OpenStreetMap</a> contributors"
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <Polyline positions={selectedRoute.coordinates} pathOptions={{ color: '#f97316', weight: 6 }} />
              <Marker position={selectedRoute.coordinates[0]}>
                <span className="hidden">Start</span>
              </Marker>
              <Marker position={selectedRoute.coordinates[selectedRoute.coordinates.length - 1]}>
                <span className="hidden">Destination</span>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}

      <div className="flex flex-col-reverse gap-4 sm:flex-row sm:justify-between">
        <button
          type="button"
          onClick={handleResetJourney}
          className="w-full sm:w-auto rounded-2xl border border-uta-blue/20 px-5 py-3 text-base font-semibold uppercase tracking-wider text-uta-blue transition duration-200 hover:border-uta-blue hover:text-uta-blue"
        >
          Start a New Route
        </button>
        <button
          type="button"
          onClick={handleResetJourney}
          className="w-full sm:w-auto rounded-2xl bg-uta-orange px-5 py-3 text-base font-bold uppercase tracking-wider text-white shadow-lg transition-transform duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-uta-orange/40"
        >
          I've Arrived
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-uta-blue via-white to-uta-orange flex items-center justify-center px-4 py-12">
      {screen === 'home' && renderHomeScreen()}
      {screen === 'message' && renderMessageScreen()}
      {screen === 'map' && renderMapScreen()}
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

