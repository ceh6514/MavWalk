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

  return (
    <div className="min-h-screen bg-gradient-to-br from-uta-blue via-white to-uta-orange flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl bg-white shadow-2xl rounded-3xl p-10 space-y-8">
        <header className="text-center space-y-4">
          <div className="mx-auto w-20 h-20 rounded-full bg-uta-blue flex items-center justify-center text-white text-3xl font-bold">
            MW
          </div>

          <div className="space-y-1">
            <h1 className="text-4xl font-extrabold text-uta-blue tracking-tight">MavWalk</h1>
            <p className="text-uta-orange font-semibold uppercase text-sm tracking-[0.4em]">
              UPLIFTING ROUTES FOR MAVERICKS
            </p>
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
        Routes and kind messages are coming soon as we build the new MavWalk experience.
      </footer>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
