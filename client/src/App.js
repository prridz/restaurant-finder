import React, { useState } from 'react';
import './App.css';

// Load the Google Maps JS SDK once and reuse the promise on later searches
let mapsPromise;
function loadGoogleMaps() {
  if (mapsPromise) return mapsPromise;
  mapsPromise = new Promise((resolve, reject) => {
    if (window.google && window.google.maps) return resolve(window.google);
    const key = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
    if (!key) return reject(new Error('Missing Google Maps API key'));
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places&v=weekly&loading=async`;
    script.async = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('Failed to load Google Maps'));
    document.head.appendChild(script);
  });
  return mapsPromise;
}

// "italian_restaurant" -> "Italian"
function deriveCuisine(types = []) {
  const t = types.find((x) => x.endsWith('_restaurant') && x !== 'restaurant');
  if (!t) return 'Restaurant';
  return t
    .replace('_restaurant', '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const POPULAR_CITIES = [
  'Paris',
  'Tokyo',
  'New York',
  'London',
  'Rome',
  'Istanbul',
  'Karachi',
  'Dubai',
];

const PRICE_LABELS = {
  FREE: 'Free',
  INEXPENSIVE: '$',
  MODERATE: '$$',
  EXPENSIVE: '$$$',
  VERY_EXPENSIVE: '$$$$',
};

function Stars({ rating }) {
  if (!rating) return null;
  const full = Math.round(rating);
  return (
    <span className="stars" title={`${rating} / 5`}>
      {'★'.repeat(full)}
      {'☆'.repeat(5 - full)}
    </span>
  );
}

function App() {
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameFilter, setNameFilter] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [selected, setSelected] = useState(null);
  const [reviews, setReviews] = useState(null);
  const [reviewsLoading, setReviewsLoading] = useState(false);

  const cuisineOptions = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter(Boolean))
  ).sort();

  const filtered = restaurants.filter((r) => {
    const matchesName = r.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesCuisine = cuisineFilter === 'all' || r.cuisine === cuisineFilter;
    return matchesName && matchesCuisine;
  });

  const sorted = [...filtered];
  if (sortBy === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
  else if (sortBy === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name));
  else if (sortBy === 'rating-desc') sorted.sort((a, b) => (b.rating || 0) - (a.rating || 0));

  const handleSearch = (e) => {
    e.preventDefault();
    runSearch(city);
  };

  const pickCity = (name) => {
    setCity(name);
    runSearch(name);
  };

  const runSearch = async (searchCity) => {
    if (!searchCity.trim()) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);
    setError('');
    setRestaurants([]);
    setNameFilter('');
    setCuisineFilter('all');
    setSortBy('default');

    try {
      await loadGoogleMaps();
      const { Place } = await window.google.maps.importLibrary('places');

      const fields = [
        'id',
        'displayName',
        'formattedAddress',
        'location',
        'rating',
        'userRatingCount',
        'priceLevel',
        'photos',
        'types',
        'nationalPhoneNumber',
        'websiteURI',
        'regularOpeningHours',
      ];

      // Google caps each text search at 20 results, so we fan out across cuisine
      // types and merge the unique places to get much broader coverage.
      const queries = [
        `restaurants in ${searchCity}`,
        `italian restaurants in ${searchCity}`,
        `chinese restaurants in ${searchCity}`,
        `indian restaurants in ${searchCity}`,
        `japanese restaurants in ${searchCity}`,
        `thai restaurants in ${searchCity}`,
        `mexican restaurants in ${searchCity}`,
        `french restaurants in ${searchCity}`,
        `american restaurants in ${searchCity}`,
        `fast food in ${searchCity}`,
        `cafe in ${searchCity}`,
        `seafood restaurants in ${searchCity}`,
        `vegetarian restaurants in ${searchCity}`,
        `pizza in ${searchCity}`,
      ];

      const batches = await Promise.all(
        queries.map((textQuery) =>
          Place.searchByText({ textQuery, fields, maxResultCount: 20 })
            .then((r) => r.places || [])
            .catch(() => [])
        )
      );

      // Deduplicate by place id
      const byId = new Map();
      for (const batch of batches) {
        for (const p of batch) {
          if (!byId.has(p.id)) byId.set(p.id, p);
        }
      }
      const places = Array.from(byId.values());

      const results = places.map((p) => ({
        id: p.id,
        name: p.displayName,
        address: p.formattedAddress,
        lat: p.location ? p.location.lat() : null,
        lon: p.location ? p.location.lng() : null,
        rating: p.rating || null,
        reviewCount: p.userRatingCount || 0,
        price: PRICE_LABELS[p.priceLevel] || null,
        image: p.photos && p.photos[0] ? p.photos[0].getURI({ maxWidthPx: 500 }) : null,
        cuisine: deriveCuisine(p.types),
        phone: p.nationalPhoneNumber || null,
        website: p.websiteURI || null,
        openingHours: p.regularOpeningHours
          ? p.regularOpeningHours.weekdayDescriptions
          : null,
        placeRef: p,
      }));

      setRestaurants(results);
      if (results.length === 0) {
        setError(`No restaurants found for "${searchCity}". Try a different city name.`);
      }
    } catch (err) {
      console.error(err);
      setError(
        'Could not load restaurants. Check that the Google Maps key is valid and the Places API is enabled.'
      );
    } finally {
      setLoading(false);
    }
  };

  const openDetails = async (r) => {
    setSelected(r);
    setReviews(null);
    setReviewsLoading(true);
    try {
      await r.placeRef.fetchFields({ fields: ['reviews'] });
      setReviews(r.placeRef.reviews || []);
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🍽️ Restaurant Finder</h1>
        <p>Discover great places to eat — anywhere in the world</p>
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

      <div className="quick-cities">
        <span className="quick-label">Popular:</span>
        {POPULAR_CITIES.map((c) => (
          <button
            key={c}
            className="city-chip"
            onClick={() => pickCity(c)}
            disabled={loading}
          >
            {c}
          </button>
        ))}
      </div>

      {error && <div className="error">{error}</div>}

      {loading && (
        <div className="loading-state">
          <div className="spinner" />
          <p>Finding the best restaurants{city ? ` in ${city}` : ''}…</p>
        </div>
      )}

      {!loading && restaurants.length === 0 && !error && (
        <div className="landing">
          <div className="feature-cards">
            <div className="feature-card">
              <span className="feature-icon">🖼️</span>
              <h3>Real Photos</h3>
              <p>See actual photos of every restaurant before you go.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">⭐</span>
              <h3>Ratings &amp; Reviews</h3>
              <p>Real Google ratings and reviews to help you choose.</p>
            </div>
            <div className="feature-card">
              <span className="feature-icon">📍</span>
              <h3>Details &amp; Maps</h3>
              <p>Addresses, hours, phone numbers, and one-tap directions.</p>
            </div>
          </div>
          <p className="landing-hint">
            Type a city above or tap a popular one to get started 🍴
          </p>
        </div>
      )}

      {restaurants.length > 0 && (
        <div className="results">
          <div className="filter-bar">
            <input
              type="text"
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={(e) => setNameFilter(e.target.value)}
              className="filter-input"
            />
            <select
              value={cuisineFilter}
              onChange={(e) => setCuisineFilter(e.target.value)}
              className="filter-select"
            >
              <option value="all">All cuisines</option>
              {cuisineOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="filter-select"
            >
              <option value="default">Sort: Default</option>
              <option value="rating-desc">Rating: High → Low</option>
              <option value="name-asc">Name: A–Z</option>
              <option value="name-desc">Name: Z–A</option>
            </select>
            {(nameFilter || cuisineFilter !== 'all' || sortBy !== 'default') && (
              <button
                className="clear-filter-btn"
                onClick={() => {
                  setNameFilter('');
                  setCuisineFilter('all');
                  setSortBy('default');
                }}
              >
                Clear
              </button>
            )}
          </div>

          <h2>
            {filtered.length} restaurants
            {filtered.length !== restaurants.length && ` (of ${restaurants.length})`} in {city}
          </h2>

          {sorted.length === 0 ? (
            <div className="no-results">No restaurants match your filters.</div>
          ) : (
            <div className="restaurant-grid">
              {sorted.map((restaurant) => (
                <div
                  key={restaurant.id}
                  className="restaurant-card"
                  onClick={() => openDetails(restaurant)}
                >
                  {restaurant.image ? (
                    <img
                      className="restaurant-img"
                      src={restaurant.image}
                      alt={restaurant.name}
                      loading="lazy"
                    />
                  ) : (
                    <div className="restaurant-img placeholder">🍽️</div>
                  )}
                  <h3>{restaurant.name}</h3>
                  <p className="cuisine">{restaurant.cuisine}</p>
                  <p className="rating-row">
                    {restaurant.rating ? (
                      <>
                        <Stars rating={restaurant.rating} />
                        <span className="rating-num">
                          {restaurant.rating} ({restaurant.reviewCount})
                        </span>
                      </>
                    ) : (
                      <span className="rating-num">No rating</span>
                    )}
                    {restaurant.price && <span className="price">{restaurant.price}</span>}
                  </p>
                  <span className="details-hint">Click for details & reviews →</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>
              ✕
            </button>
            {selected.image ? (
              <img className="modal-img" src={selected.image} alt={selected.name} />
            ) : (
              <div className="modal-img placeholder">🍽️</div>
            )}
            <div className="modal-body">
              <h2>{selected.name}</h2>
              <p className="modal-cuisine">
                {selected.cuisine}
                {selected.price && ` · ${selected.price}`}
              </p>
              {selected.rating && (
                <p className="rating-row">
                  <Stars rating={selected.rating} />
                  <span className="rating-num">
                    {selected.rating} · {selected.reviewCount} reviews
                  </span>
                </p>
              )}

              <div className="modal-details">
                {selected.address && (
                  <div className="detail-row">
                    <span className="detail-label">📍 Address</span>
                    <span>{selected.address}</span>
                  </div>
                )}
                {selected.phone && (
                  <div className="detail-row">
                    <span className="detail-label">📞 Phone</span>
                    <a href={`tel:${selected.phone}`}>{selected.phone}</a>
                  </div>
                )}
                {selected.website && (
                  <div className="detail-row">
                    <span className="detail-label">🌐 Website</span>
                    <a href={selected.website} target="_blank" rel="noopener noreferrer">
                      {selected.website}
                    </a>
                  </div>
                )}
                {selected.openingHours && (
                  <div className="detail-row">
                    <span className="detail-label">🕒 Hours</span>
                    <span>
                      {selected.openingHours.map((d, i) => (
                        <span key={i} className="hours-line">
                          {d}
                        </span>
                      ))}
                    </span>
                  </div>
                )}
              </div>

              <div className="reviews">
                <h3>Reviews</h3>
                {reviewsLoading && <p className="detail-empty">Loading reviews…</p>}
                {!reviewsLoading && reviews && reviews.length === 0 && (
                  <p className="detail-empty">No reviews available for this place.</p>
                )}
                {!reviewsLoading &&
                  reviews &&
                  reviews.map((rev, i) => (
                    <div key={i} className="review">
                      <div className="review-head">
                        <span className="review-author">
                          {rev.authorAttribution ? rev.authorAttribution.displayName : 'Anonymous'}
                        </span>
                        <Stars rating={rev.rating} />
                      </div>
                      {rev.relativePublishTimeDescription && (
                        <span className="review-time">{rev.relativePublishTimeDescription}</span>
                      )}
                      <p className="review-text">{rev.text}</p>
                    </div>
                  ))}
              </div>

              <div className="modal-actions">
                <a
                  className="modal-btn primary"
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    selected.name
                  )}&query_place_id=${selected.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  📍 Open in Google Maps
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
