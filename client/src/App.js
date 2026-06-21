import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city.trim()) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);
    setError('');
    setRestaurants([]);

    try {
      const response = await axios.get('/api/restaurants', {
        params: { city }
      });
      setRestaurants(response.data.restaurants);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🍽️ Restaurant Finder</h1>
        <p>Search for restaurants in your city</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <input
          type="text"
          placeholder="Enter city name (e.g., Paris, Tokyo, New York)"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="search-input"
        />
        <button type="submit" className="search-btn" disabled={loading}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {restaurants.length > 0 && (
        <div className="results">
          <h2>Found {restaurants.length} restaurants in {city}</h2>
          <div className="restaurant-grid">
            {restaurants.map((restaurant) => (
              <div key={restaurant.id} className="restaurant-card">
                <h3>{restaurant.name}</h3>
                <p className="cuisine">Cuisine: {restaurant.cuisine}</p>
                {restaurant.lat && restaurant.lon && (
                  <p className="location">📍 {restaurant.lat.toFixed(2)}, {restaurant.lon.toFixed(2)}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && restaurants.length === 0 && !error && city && (
        <div className="no-results">No restaurants found. Try another city!</div>
      )}
    </div>
  );
}

export default App;
