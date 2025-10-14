// src/main.jsx
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Assets
import utaTile from "./142-1425701_university-of-texas-uta-logo-university-of-texas-at-arlington-logo.png";
import mavLogo from "./MavWalkLogo.png";

// Default marker setup
const defaultMarkerIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [30, 48],
  iconAnchor: [15, 48],
  shadowSize: [48, 48],
});
L.Marker.prototype.options.icon = defaultMarkerIcon;

// Campus data
const campusLocations = [
  "Central Library",
  "College Park Center",
  "Engineering Research Building",
  "Fine Arts Building",
  "Maverick Activities Center",
  "Science Hall",
  "University Center",
];

const sampleRoutes = {
  "Central Library|Maverick Activities Center": {
    startCoordinates: [32.7296, -97.1131],
    destinationCoordinates: [32.7282, -97.1167],
    pathCoordinates: [
      [32.7296, -97.1131],
      [32.7293, -97.1142],
      [32.7289, -97.1154],
      [32.7282, -97.1167],
    ],
  },
};

const defaultCenter = [32.7318, -97.1133];

// TopBar
const TopBar = () => (
  <>
    <div className="w-full bg-[#066AA9] text-white text-lg">
      <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
        <div className="flex items-center gap-3">
          <img src={mavLogo} alt="MavWalk logo" className="w-10 h-10 rounded-md bg-white p-1" />
          <span className="font-semibold text-xl">
            MavWalk{" "}
            <span className="text-sm align-top bg-white/10 px-2 py-0.5 rounded ml-1">BETA</span>
          </span>
        </div>
        <nav className="hidden sm:flex gap-8 text-base">
          <a href="#" className="hover:text-orange-300 transition">Features</a>
          <a href="#" className="hover:text-orange-300 transition">Campus Map</a>
          <a href="#" className="hover:text-orange-300 transition">Community</a>
          <a href="#" className="hover:text-orange-300 transition">Support</a>
        </nav>
      </div>
    </div>
    <div className="w-full bg-[#f5632a] text-white text-center text-base py-2 font-medium tracking-wide">
      <strong>Live Demo:</strong> Experience MavWalk’s campus navigation system
    </div>
  </>
);

// Background
const BgPattern = () => (
  <div className="fixed inset-0 -z-10">
    <div
      className="absolute inset-0"
      style={{
        backgroundImage: `url(${utaTile})`,
        backgroundRepeat: "repeat",
        backgroundSize: "230px 230px",
        backgroundColor: "#0B4D8C",
        backgroundBlendMode: "overlay",
        opacity: 0.35,
      }}
    />
  </div>
);

// Header
const HeroHeader = () => (
  <div className="text-center">
    <img
      src={mavLogo}
      alt="MavWalk logo"
      className="mx-auto mb-6 w-32 h-32 rounded-2xl shadow-xl object-contain bg-white transition-transform duration-300 hover:scale-105"
    />
    <h1 className="text-[34px] font-extrabold text-[#0F6AA8] tracking-tight">MavWalk</h1>
    <p className="text-[#0F6AA8]/80 mt-2 text-lg">
      Navigate UTA campus with uplifting messages
    </p>
    <div className="mt-4 flex items-center justify-center gap-10 text-lg text-[#0F6AA8]/80">
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-green-500 animate-pulse" />
        <span>
          <strong className="text-[#0F6AA8]">2,847</strong> walks today
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="inline-block w-3 h-3 rounded-full bg-[#f5632a]" />
        <span>
          <strong className="text-[#0F6AA8]">1,293</strong> messages shared
        </span>
      </div>
    </div>
  </div>
);

// App
const App = () => {
  const [startLocation, setStartLocation] = useState("");
  const [destination, setDestination] = useState("");
  const [formFeedback, setFormFeedback] = useState(null);
  const [routeResult, setRouteResult] = useState(null);
  const [stage, setStage] = useState("home");

  const handleFindRoute = (e) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!startLocation || !destination) {
      setFormFeedback({ type: "error", message: "Please select both a starting point and a destination." });
      return;
    }
    if (startLocation === destination) {
      setFormFeedback({ type: "error", message: "Pick two different locations to discover a curated walk." });
      return;
    }
    const key = `${startLocation}|${destination}`;
    const route = sampleRoutes[key];
    if (!route) {
      setFormFeedback({
        type: "info",
        message: "We are still curating that path. Please choose another pair of locations.",
      });
      return;
    }
    setRouteResult(route);
    setStage("map");
  };

  return (
    <div className="min-h-screen flex flex-col text-lg">
      <TopBar />
      <BgPattern />

      <main className="flex-1 flex items-start sm:items-center justify-center px-4 py-12">
        <div className="w-full max-w-[32rem] bg-white/95 backdrop-blur shadow-2xl rounded-[32px] p-10 sm:p-12 space-y-8">
          {stage === "home" && (
            <>
              <HeroHeader />
              <p className="text-center text-gray-600 text-base mt-3">
                Choose your starting location and destination to begin.
              </p>

              <div className="mt-5 rounded-3xl border border-[#0F6AA8]/20 bg-white/90 shadow-md p-8">
                <div className="flex items-center gap-3 mb-4">
                  {/* Location arrow icon */}
                  <svg width="26" height="26" viewBox="0 0 24 24" className="text-[#0F6AA8]">
                    <path
                      fill="currentColor"
                      d="M12 2L3 21l9-4 9 4L12 2z"
                    />
                  </svg>
                  <h2 className="text-2xl font-bold text-[#0F6AA8]">Plan Your Journey</h2>
                </div>
                <p className="text-[#0F6AA8]/70 text-base mb-6">
                  Get directions with encouraging messages along the way
                </p>

                <form className="space-y-5" onSubmit={handleFindRoute}>
                  <div>
                    <label className="block text-[#0F6AA8] text-lg font-medium mb-2">
                      Starting From
                    </label>
                    <select
                      value={startLocation}
                      onChange={(e) => setStartLocation(e.target.value)}
                      className="w-full rounded-2xl border border-[#0F6AA8]/20 bg-[#0F6AA8]/5 px-5 py-4 text-[#0F6AA8] text-lg focus:outline-none focus:ring-2 focus:ring-[#f5632a]/40"
                    >
                      <option value="">Enter starting location...</option>
                      {campusLocations.map((loc) => (
                        <option key={`s-${loc}`}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#0F6AA8] text-lg font-medium mb-2">
                      Destination
                    </label>
                    <select
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full rounded-2xl border border-[#0F6AA8]/20 bg-[#0F6AA8]/5 px-5 py-4 text-[#0F6AA8] text-lg focus:outline-none focus:ring-2 focus:ring-[#f5632a]/40"
                    >
                      <option value="">Where are you going?</option>
                      {campusLocations.map((loc) => (
                        <option key={`d-${loc}`}>{loc}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full rounded-2xl bg-gradient-to-r from-[#320A6B] to-[#f5632a] px-6 py-4 text-xl text-white font-semibold shadow-lg hover:opacity-90 transition-transform hover:-translate-y-0.5"
                  >
                    Start My MavWalk
                  </button>
                </form>

                {formFeedback && (
                  <div
                    className={`mt-6 rounded-2xl border px-5 py-4 text-base ${
                      formFeedback.type === "error"
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-[#0F6AA8]/20 bg-[#0F6AA8]/5 text-[#0F6AA8]"
                    }`}
                  >
                    {formFeedback.message}
                  </div>
                )}
              </div>
            </>
          )}

          {stage === "map" && routeResult && (
            <>
              <h2 className="text-center text-[#0F6AA8] font-bold text-2xl mb-4">Map Preview</h2>
              <div className="overflow-hidden rounded-3xl border border-[#0F6AA8]/15 shadow-lg">
                <MapContainer
                  center={defaultCenter}
                  zoom={17}
                  style={{ height: "400px", width: "100%" }}
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={routeResult.startCoordinates}>
                    <Tooltip direction="top" offset={[0, -20]} permanent>
                      Start
                    </Tooltip>
                  </Marker>
                  <Marker position={routeResult.destinationCoordinates}>
                    <Tooltip direction="top" offset={[0, -20]} permanent>
                      Destination
                    </Tooltip>
                  </Marker>
                  <Polyline
                    positions={routeResult.pathCoordinates}
                    color="#f5632a"
                    weight={5}
                    dashArray="8 12"
                  />
                </MapContainer>
              </div>

              <button
                type="button"
                onClick={() => {
                  setStartLocation("");
                  setDestination("");
                  setRouteResult(null);
                  setStage("home");
                }}
                className="w-full mt-6 rounded-2xl border border-[#f5632a]/40 px-6 py-4 text-xl font-semibold uppercase tracking-wider text-[#f5632a] shadow-md hover:-translate-y-0.5 hover:shadow-lg transition"
              >
                New Route
              </button>
            </>
          )}
        </div>
      </main>

    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
