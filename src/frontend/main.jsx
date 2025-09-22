import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';

//The base URL for our backend API
const API_URL = 'http://localhost:3001/api';

//The reusable components

const LoadingSpinner = () => (
    <div className="flex justify-center items-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-uta-orange"></div>
    </div>
);

const MessageBox = ({ message, type }) => {
    if (!message) return null;
    const baseClasses = 'p-4 rounded-md text-center mb-4';
    const typeClasses = type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
    return <div className={`${baseClasses} ${typeClasses}`}>{message}</div>;
};

//Page components

const LoginPage = ({ onLogin }) => {
    const [email, setEmail] = useState('student1@uta.edu'); //Pre-filled for testing
    const [password, setPassword] = useState('password123'); //Same ^^^
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
        <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">
                <h1 className="text-4xl font-bold text-center text-uta-blue mb-2">MavWalk</h1>
                <p className="text-center text-gray-600 mb-6">Safe walks, on demand.</p>
                <form onSubmit={handleSubmit}>
                    <MessageBox message={error} type="error" />
                    <div className="mb-4">
                        <label className="block text-gray-700 font-medium mb-2" htmlFor="email">UTA Email</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uta-orange"
                            required
                        />
                    </div>
                    <div className="mb-6">
                        <label className="block text-gray-700 font-medium mb-2" htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uta-orange"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-uta-blue hover:bg-uta-blue-light text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400"
                    >
                        {loading ? 'Logging In...' : 'Log In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

const HomePage = ({ user, setView, setSelectedWalk }) => {
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
        if(!confirm("Are you sure you want to join this walk?")) return;
        
        try {
            const response = await fetch(`${API_URL}/walks/${walkId}/join`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ buddyId: user.id }),
            });
            const data = await response.json();
            if (response.ok) {
                //In the full app, you'd navigate to a "live walk" screen.
                //For now, we'll just show an alert.
                alert("You've joined the walk! (Live tracking screen would be next)");
                setView('home'); //Refresh the home page
            } else {
                alert(`Error: ${data.message}`);
            }
        } catch (err) {
            alert("Failed to join walk. Please try again.");
        }
    };


    return (
        <div className="min-h-screen bg-gray-50">
            <header className="bg-white shadow-md p-4 flex justify-between items-center">
                 <h1 className="text-2xl font-bold text-uta-blue">MavWalk</h1>
                 <div className="text-right">
                    <p className="font-medium">{user.name}</p>
                    <p className="text-sm text-gray-500">{user.email}</p>
                 </div>
            </header>
            <main className="p-6">
                <div className="max-w-4xl mx-auto">
                    <button 
                        onClick={() => setView('requestWalk')}
                        className="w-full text-lg bg-uta-orange hover:opacity-90 text-white font-bold py-4 px-4 rounded-lg shadow-lg transition duration-300 mb-8"
                    >
                        Request a Walking Partner
                    </button>

                    <h2 className="text-xl font-semibold text-gray-800 border-b pb-2 mb-4">Available Walk Requests</h2>
                    {loading && <LoadingSpinner />}
                    {error && <MessageBox message={error} type="error" />}
                    {!loading && !error && walks.length === 0 && (
                        <div className="text-center text-gray-500 bg-white p-6 rounded-lg shadow">
                            No pending walk requests right now. Be the first!
                        </div>
                    )}
                    <div className="space-y-4">
                        {walks.map(walk => (
                            <div key={walk.id} className="bg-white p-4 rounded-lg shadow-md flex justify-between items-center">
                                <div>
                                    <p className="font-bold text-lg">From: <span className="font-normal">{walk.startLocation}</span></p>
                                    <p className="font-bold text-lg">To: <span className="font-normal">{walk.destination}</span></p>
                                    <p className="text-sm text-gray-500">Requested: {new Date(walk.requestTime).toLocaleTimeString()}</p>
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
                </div>
            </main>
        </div>
    );
};

const RequestWalkPage = ({ user, setView }) => {
    const [startLocation, setStartLocation] = useState('');
    const [destination, setDestination] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage('');

        try {
            const response = await fetch(`${API_URL}/walks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: user.id, startLocation, destination }),
            });
            if(response.ok) {
                //In a real app, we would go to a waiting/tracking screen.
                alert('Your walk request has been submitted!');
                setView('home'); //Go back to home to see the updated list
            } else {
                const data = await response.json();
                setMessage(data.message || 'Failed to create request.');
            }
        } catch(err) {
            setMessage('Could not connect to the server.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
             <div className="w-full max-w-lg">
                <button onClick={() => setView('home')} className="text-uta-blue font-medium mb-4">&larr; Back to Home</button>
                <div className="bg-white p-8 rounded-xl shadow-lg">
                    <h2 className="text-2xl font-bold text-center text-uta-blue mb-6">Create a Walk Request</h2>
                    <form onSubmit={handleSubmit}>
                        <MessageBox message={message} type="error" />
                        <div className="mb-4">
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="start">Start Location</label>
                            <input
                                id="start"
                                type="text"
                                value={startLocation}
                                onChange={(e) => setStartLocation(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uta-orange"
                                placeholder="e.g., The Library"
                                required
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2" htmlFor="destination">Destination</label>
                            <input
                                id="destination"
                                type="text"
                                value={destination}
                                onChange={(e) => setDestination(e.target.value)}
                                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-uta-orange"
                                placeholder="e.g., Arlington Hall"
                                required
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-uta-orange hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition duration-300 disabled:bg-gray-400"
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </form>
                </div>
             </div>
        </div>
    );
};

//Main part of the app

const App = () => {
    //'view' determines which page is shown: 'login', 'home', 'requestWalk'
    const [view, setView] = useState('login'); 
    const [user, setUser] = useState(null); //Stores logged-in user data!
    
    const handleLogin = (loggedInUser) => {
        setUser(loggedInUser);
        setView('home');
    };

    //This is a simple router. 
    //It renders a component based on the 'view' state.
    const renderView = () => {
        switch (view) {
            case 'home':
                return <HomePage user={user} setView={setView} />;
            case 'requestWalk':
                return <RequestWalkPage user={user} setView={setView} />;
            case 'login':
            default:
                return <LoginPage onLogin={handleLogin} />;
        }
    };

    return (
        <div className="App">
            {renderView()}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
