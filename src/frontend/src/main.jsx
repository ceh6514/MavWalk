import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';

const campusLocations = [
  'Central Library',
  'College Park Center',
  'Engineering Research Building',
  'Fine Arts Building',
  'Maverick Activities Center',
  'Science Hall',
  'University Center',
];

const App = () => {
  const [startLocation, setStartLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [feedback, setFeedback] = useState('');

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

    setFeedback(`Your curated route from ${startLocation} to ${destination} is on its way!`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-uta-blue via-white to-uta-orange flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white shadow-2xl rounded-3xl p-10 space-y-8">
        <header className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-uta-blue flex items-center justify-center text-white text-3xl font-bold">
            MW
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-uta-blue tracking-tight">MavWalk</h1>
            <p className="text-uta-orange font-semibold uppercase text-sm tracking-[0.4em]">UPLIFTING ROUTES FOR MAVERICKS</p>
            <p className="text-gray-600 text-base">
              Please choose your starting location and destination below!
            </p>
          </div>
        </header>

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

        {feedback && (
          <div className="rounded-2xl border border-uta-blue/20 bg-uta-blue/5 px-4 py-3 text-center text-uta-blue">
            {feedback}
          </div>
        )}

        <footer className="text-center text-sm text-gray-400">
          Routes and kind messages are coming soon as we build the new MavWalk experience.
        </footer>
      </div>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

