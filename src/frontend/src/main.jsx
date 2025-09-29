import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
//Import useMap hook
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import MavwalkIcon from './MavWalk Icon.png';
//Icon fix
//Need to change w/ Saina's logo
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

//Creation of the helper function
//This tiny component gets the map instance and tells it to update its size, fixing the gray tile issue we kept getting
//Still have gray tile issues, but just resize page
function InvalidateSizeComponent() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
  }, [map]);
  return null;
}

//URL
const API_URL = 'http://localhost:3001/api';

//Reusable components
const LoadingSpinner = () => (<div className="flex justify-center items-center p-4"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uta-orange"></div></div>);
const MessageBox = ({ message, type }) => { if (!message) return null; const baseClasses = 'p-4 rounded-md text-center mb-4'; const typeClasses = type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'; return <div className={`${baseClasses} ${typeClasses}`}>{message}</div>;};

//Page componenets
const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('jdoe@uta.edu');
    const [password, setPassword] = useState('password123');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const data = await response.json();
        if (response.ok) {
            onLogin(data.user);
        } else {
            setError(data.message || 'Login failed.');
        }
        } catch (err) {
        setError('Could not connect to the server. Is it running?');
        } finally {
        setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-uta-blue flex flex-col justify-center items-center px-4">
            <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-lg">
            {/* Logo */}
            <div className="flex flex-col items-center mb-6">
            <img
                src={MavwalkIcon}
                alt="MavWalk Logo"
                className="w-28 h-28 mb-4"
            />
            <h1 className="text-3xl font-bold text-uta-blue">MavWalk</h1>
            <p className="text-gray-600 text-sm">Safe Walks. Strong Mavericks.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
            <MessageBox message={error} type="error" />

            {/* Username */}
            <div>
                <label htmlFor="email" className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Username
                </label>
                <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@mavs.uta.edu"
                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-uta-orange"
                required
                />
            </div>

            {/* Password */}
            <div>
                <label htmlFor="password" className="block text-xs font-bold text-gray-600 uppercase mb-1">
                    Password
                </label>
                <div className="relative">
                <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••"
                    className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-uta-orange"
                    required
                />
                <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-3 text-sm font-semibold text-uta-blue"
                >
                    {showPassword ? 'HIDE' : 'SHOW'}
                </button>
                </div>
            </div>

            {/* Forgot password */}
            <div className="text-center">
                <button type="button" className="text-gray-600 text-xs hover:underline">
                    Forgot Password?
                </button>
            </div>

            {/* Submit */}
            <button
                type="submit"
                disabled={loading}
                className="w-full bg-uta-orange hover:opacity-90 text-white font-bold py-3 rounded-lg transition duration-300 disabled:bg-gray-400"
            >
                {loading ? 'Logging In...' : 'Sign Up'}
            </button>
            </form>
        </div>
    </div>
  );
};

const RequestWalkPage = ({ user, setView }) => {
    const [startLocation, setStartLocation] = useState(''); const [destination, setDestination] = useState(''); const [message, setMessage] = useState(''); const [loading, setLoading] = useState(false);
    const handleSubmit = async (e) => { e.preventDefault(); setLoading(true); setMessage(''); try { const response = await fetch(`${API_URL}/walks`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, startLocation, destination }), }); if(response.ok) { alert('Your walk request has been submitted!'); setView({ name: 'home' }); } else { const data = await response.json(); setMessage(data.message || 'Failed to create request.'); } } catch(err) { setMessage('Could not connect to the server.'); } finally { setLoading(false); } };
    return (<div className="min-h-screen bg-gray-100 flex flex-col items-center p-4"><div className="w-full max-w-lg"><button onClick={() => setView({ name: 'home' })} className="text-uta-blue font-medium mb-4">&larr; Back to Home</button><div className="bg-white p-8 rounded-xl shadow-lg"><h2 className="text-2xl font-bold text-center text-uta-blue mb-6">Create a Walk Request</h2><form onSubmit={handleSubmit}><MessageBox message={message} type="error" /><div className="mb-4"><label className="block text-gray-700 font-medium mb-2" htmlFor="start">Start Location</label><input id="start" type="text" value={startLocation} onChange={(e) => setStartLocation(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uta-orange" placeholder="e.g., The Library" required /></div><div className="mb-6"><label className="block text-gray-700 font-medium mb-2" htmlFor="destination">Destination</label><input id="destination" type="text" value={destination} onChange={(e) => setDestination(e.target.value)} className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uta-orange" placeholder="e.g., Arlington Hall" required /></div><button type="submit" disabled={loading} className="w-full bg-uta-orange hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400">{loading ? 'Submitting...' : 'Submit Request'}</button></form></div></div></div>);
};
const HomePage = ({ user, setView }) => {
  const [walks, setWalks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchWalks = async () => {
      try {
        const response = await fetch(`${API_URL}/walks`);
        if (response.ok) {
          const data = await response.json();
          setWalks(data);
        } else {
          setError('Failed to fetch walk requests.');
        }
      } catch (err) {
        setError('Could not connect to the server.');
      } finally {
        setLoading(false);
      }
    };
    fetchWalks();
  }, []);

  const handleJoinWalk = async (walkId) => {
    try {
      const response = await fetch(`${API_URL}/walks/${walkId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buddyId: user.id }),
      });
      const data = await response.json();
      if (response.ok) {
        setView({ name: 'activeWalk', walkId: walkId });
      } else {
        alert(`Error: ${data.message}`);
      }
    } catch (err) {
      alert("Failed to join walk. Please try again.");
    }
  };

  return (
    <div className="min-h-screen bg-uta-blue flex flex-col">
      {/* Header */}
      <header className="bg-uta-blue text-white p-6 shadow-md flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src={MavwalkIcon}
            alt=" MavWalkLogo"
            className="w-10 h-10"
          />
          <h1 className="text-2xl font-bold">MavWalk</h1>
        </div>
        <div className="text-right">
          <p className="font-semibold">{user.name}</p>
          <p className="text-sm opacity-80">{user.email}</p>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-grow p-6">
        {/* Create Request Button */}
        <button
          onClick={() => setView({ name: 'requestWalk' })}
          className="w-full text-lg bg-uta-orange hover:opacity-90 text-white font-bold py-4 px-4 rounded-lg shadow-lg transition duration-300 mb-6"
        >
          Request a Walking Partner
        </button>

        {/* Section: Walk Requests */}
        <h2 className="text-xl font-semibold text-white border-b border-white/30 pb-2 mb-4">
          Available Walk Requests
        </h2>

        {loading && <LoadingSpinner />}
        {error && <MessageBox message={error} type="error" />}
        {!loading && !error && walks.length === 0 && (
          <div className="text-center text-white bg-uta-blue-light p-6 rounded-lg shadow">
            No pending walk requests right now.
          </div>
        )}

        <div className="space-y-4">
          {walks.map((walk) => (
            <div
              key={walk.id}
              className="bg-white p-5 rounded-lg shadow-md flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-lg text-uta-blue">
                  From: <span className="font-normal">{walk.startLocation}</span>
                </p>
                <p className="font-bold text-lg text-uta-blue">
                  To: <span className="font-normal">{walk.destination}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Requested: {new Date(walk.requestTime).toLocaleTimeString()}
                </p>
              </div>
              <button
                onClick={() => handleJoinWalk(walk.id)}
                className="bg-uta-blue hover:bg-uta-blue-light text-white font-bold py-2 px-5 rounded-lg transition duration-300"
              >
                Join
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

const WalkCompletePage = ({ walkId, setView }) => {
    const handleConfirm = async () => { try { await fetch(`${API_URL}/walks/${walkId}/complete`, { method: 'POST' }); } catch (err) { console.error("Failed to mark walk as complete."); } setView({ name: 'home' }); };
    return (<div className="min-h-screen bg-uta-blue flex flex-col justify-center items-center p-4"><div className="text-center"><h1 className="text-4xl font-bold text-white mb-6">You've Arrived Safely!</h1><button onClick={handleConfirm} className="bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-12 text-2xl rounded-lg shadow-2xl">Confirm Arrival</button></div></div>);
};

const ActiveWalkPage = ({ walkId, setView }) => {
    const [walk, setWalk] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchWalkData = async () => {
            try {
                const response = await fetch(`${API_URL}/walks/${walkId}`);
                if (!response.ok) throw new Error('Network response was not ok');
                const data = await response.json();
                setWalk(data);
            } catch (err) {
                setError('Could not load walk details.');
            } finally {
                setLoading(false);
            }
        };
        fetchWalkData();
        const interval = setInterval(fetchWalkData, 5000);
        return () => clearInterval(interval);
    }, [walkId]);

    const handleSOS = async () => {
        if (window.confirm("Are you sure? This will alert campus police immediately.")) {
            try {
                const response = await fetch(`${API_URL}/walks/${walkId}/sos`, { method: 'POST' });
                const data = await response.json();
                alert(data.message);
            } catch(err){
                alert('SOS signal failed to send! Please call 911.');
            }
        }
    };
    
    useEffect(() => {
        if (walk) {
            const [buddyLat, buddyLon] = walk.route.buddyCurrentCoords;
            const [endLat, endLon] = walk.route.endCoords;
            const distance = Math.sqrt(Math.pow(buddyLat - endLat, 2) + Math.pow(buddyLon - endLon, 2));
            if (distance < 0.0001) {
                 setView({ name: 'walkComplete', walkId: walkId });
            }
        }
    }, [walk]);

    if (loading) return <div className="min-h-screen flex justify-center items-center"><LoadingSpinner /></div>;
    if (error) return <div className="min-h-screen flex justify-center items-center"><MessageBox message={error} type="error" /></div>;
    if (!walk) return null;

    return (
        <div className="h-screen bg-gray-50 flex flex-col">
            <header className="bg-white shadow-md p-4 text-center z-10">
                <p className="font-medium text-lg text-gray-700">Estimated Arrival Time</p>
                <h1 className="text-4xl font-bold text-uta-blue">{walk.eta}</h1>
                <p className="text-gray-600 mt-1">From {walk.startLocation} to {walk.destination}</p>
            </header>
            
            <main className="flex-grow">
                <MapContainer center={walk.route.startCoords} zoom={15} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                    {/*Add the component inside the map*/}
                    <InvalidateSizeComponent />
                    <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker position={walk.route.startCoords}><Popup>Start</Popup></Marker>
                    <Marker position={walk.route.endCoords}><Popup>Destination</Popup></Marker>
                    <Marker position={walk.route.buddyCurrentCoords}><Popup>Your Buddy</Popup></Marker>
                    <Polyline positions={[walk.route.startCoords, walk.route.endCoords]} color="blue" />
                </MapContainer>
            </main>

            <footer className="p-4 bg-white border-t z-10">
                <button onClick={handleSOS} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold text-lg py-4 px-4 rounded-lg shadow-lg">
                    S.O.S.
                </button>
            </footer>
        </div>
    );
};


//Main app component
const App = () => {
    const [view, setView] = useState({ name: 'login' }); 
    const [user, setUser] = useState(null); 
    const handleLogin = (loggedInUser) => { setUser(loggedInUser); setView({ name: 'home' }); };
    const renderView = () => {
        switch (view.name) {
            case 'home': return <HomePage user={user} setView={setView} />;
            case 'requestWalk': return <RequestWalkPage user={user} setView={setView} />;
            case 'activeWalk': return <ActiveWalkPage walkId={view.walkId} setView={setView} />;
            case 'walkComplete': return <WalkCompletePage walkId={view.walkId} setView={setView} />;
            default: return <LoginPage onLogin={handleLogin} />;
        }
    };
    return <div className="App h-full">{renderView()}</div>;
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

