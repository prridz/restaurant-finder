import React, { useState } from 'react';
import './App.css';

// Cuisine -> Unsplash photo id. Stable CDN URLs, no API key needed.
const CUISINE_IMAGES = {
  italian: '1565299624946-b28f40a0ae38',
  pizza: '1513104890138-7c749659a591',
  japanese: '1579871494447-9811cf80d66c',
  sushi: '1579871494447-9811cf80d66c',
  chinese: '1525755662778-989d0524087e',
  indian: '1585937421612-70a008356fbe',
  thai: '1559314809-0d155014e29e',
  french: '1414235077428-338989a2e8c0',
  mexican: '1565299585323-38dd9d4eb6e6',
  american: '1568901346375-23c9450c58cd',
  burger: '1568901346375-23c9450c58cd',
  seafood: '1559339352-11d035aa65de',
  korean: '1583187938680-49f4b8db5a04',
  vietnamese: '1582878826629-29b7ad1cdc43',
  greek: '1544025162-d76694265947',
  spanish: '1515443961218-a51367888e4b',
  vegetarian: '1512621776951-a57141f2eefd',
  vegan: '1512621776951-a57141f2eefd',
  cafe: '1495474472287-4d71bcdd2085',
  coffee_shop: '1495474472287-4d71bcdd2085',
  dessert: '1551024506-0bccd828d307',
  bakery: '1509440159596-0249088772ff',
  barbecue: '1529193591184-b1d58069ecdd',
  steak_house: '1546964124-0cce460f38ef',
};

// Generic food photos, picked by id for variety when cuisine is unknown.
const FOOD_POOL = [
  '1504674900247-0877df9cc836',
  '1517248135467-4c7edcad34c4',
  '1555939594-58d7cb561ad1',
  '1546069901-ba9599a7e63c',
  '1540189549336-e6e99c3679fe',
  '1567620905732-2d1ec7ab7445',
  '1565958011703-44f9829ba187',
  '1484980972926-edee96e0960d',
];

function App() {
  const [city, setCity] = useState('');
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visibleCount, setVisibleCount] = useState(60);
  const [nameFilter, setNameFilter] = useState('');
  const [cuisineFilter, setCuisineFilter] = useState('all');
  const [sortBy, setSortBy] = useState('default');
  const [selected, setSelected] = useState(null);

  const PAGE_SIZE = 60;

  // Build a food-relevant image URL (real OSM photo if present, else a cuisine-matched
  // photo from the Unsplash CDN — stable and key-free)
  const imageFor = (r) => {
    if (r.image) return r.image;
    const key = (r.cuisine || '').split(',')[0].trim().toLowerCase();
    const id = CUISINE_IMAGES[key] || FOOD_POOL[r.id % FOOD_POOL.length];
    return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=500&h=300&q=60`;
  };

  // Guaranteed-to-load fallback if a CDN image ever fails
  const fallbackImg = (r) => `https://picsum.photos/seed/rf${r.id}/500/300`;

  // Build the dropdown list of cuisines actually present in the results
  const cuisineOptions = Array.from(
    new Set(restaurants.map((r) => r.cuisine).filter((c) => c && c !== 'Not specified'))
  ).sort();

  // Apply the active filters
  const filtered = restaurants.filter((r) => {
    const matchesName = r.name.toLowerCase().includes(nameFilter.toLowerCase());
    const matchesCuisine = cuisineFilter === 'all' || r.cuisine === cuisineFilter;
    return matchesName && matchesCuisine;
  });

  // Apply sorting (copy first so we don't mutate state)
  const sorted = [...filtered];
  if (sortBy === 'name-asc') {
    sorted.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy === 'name-desc') {
    sorted.sort((a, b) => b.name.localeCompare(a.name));
  }

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!city.trim()) {
      setError('Please enter a city name');
      return;
    }

    setLoading(true);
    setError('');
    setRestaurants([]);
    setVisibleCount(PAGE_SIZE);
    setNameFilter('');
    setCuisineFilter('all');
    setSortBy('default');

    try {
      // Step 1: Geocode the city name into a bounding box using Nominatim (free, no key)
      const geoUrl = `https://nominatim.openstreetmap.org/search?city=${encodeURIComponent(
        city
      )}&format=json&limit=1`;
      const geoRes = await fetch(geoUrl);
      const geoData = await geoRes.json();

      if (!geoData || geoData.length === 0) {
        setError(`Couldn't find a city called "${city}". Check the spelling and try again.`);
        setLoading(false);
        return;
      }

      // Nominatim boundingbox = [south, north, west, east]
      const [south, north, west, east] = geoData[0].boundingbox;

      // Step 2: Query Overpass for restaurants inside that bounding box (free, no key)
      const overpassQuery = `[out:json][timeout:30];
        (
          node["amenity"="restaurant"](${south},${west},${north},${east});
        );
        out body 5000;`;

      const overpassRes = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        body: overpassQuery,
      });
      const overpassData = await overpassRes.json();

      const nodes = (overpassData.elements || [])
        .filter((el) => el.tags && el.tags.name)
        .map((el) => {
          const t = el.tags;
          const addressParts = [
            [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' '),
            t['addr:city'],
            t['addr:postcode'],
          ].filter(Boolean);
          return {
            id: el.id,
            name: t.name,
            cuisine: t.cuisine
              ? t.cuisine.replace(/_/g, ' ').replace(/;/g, ', ')
              : 'Not specified',
            lat: el.lat,
            lon: el.lon,
            // Use the OSM photo if tagged with a real URL, otherwise null (we fall back to a cuisine image)
            image: t.image && t.image.startsWith('http') ? t.image : null,
            phone: t.phone || t['contact:phone'] || null,
            website: t.website || t['contact:website'] || null,
            openingHours: t.opening_hours || null,
            address: addressParts.length ? addressParts.join(', ') : null,
            vegetarian: t['diet:vegetarian'] || null,
            vegan: t['diet:vegan'] || null,
            takeaway: t.takeaway || null,
          };
        });

      // Group restaurants that share a name (chains with multiple branches)
      const groups = new Map();
      for (const n of nodes) {
        const key = n.name.trim().toLowerCase();
        if (!groups.has(key)) {
          groups.set(key, {
            id: n.id,
            name: n.name,
            cuisine: n.cuisine,
            image: n.image,
            branches: [],
          });
        }
        const g = groups.get(key);
        if (g.cuisine === 'Not specified' && n.cuisine !== 'Not specified') g.cuisine = n.cuisine;
        if (!g.image && n.image) g.image = n.image;
        g.branches.push({
          id: n.id,
          lat: n.lat,
          lon: n.lon,
          address: n.address,
          phone: n.phone,
          website: n.website,
          openingHours: n.openingHours,
          vegetarian: n.vegetarian,
          vegan: n.vegan,
        });
      }
      const results = Array.from(groups.values());

      setRestaurants(results);
      if (results.length === 0) {
        setError(`No restaurants found in "${city}". Try a larger or more specific city name.`);
      }
    } catch (err) {
      setError('Failed to fetch restaurants. The data service may be busy — try again in a moment.');
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
          <div className="filter-bar">
            <input
              type="text"
              placeholder="Filter by name..."
              value={nameFilter}
              onChange={(e) => {
                setNameFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="filter-input"
            />
            <select
              value={cuisineFilter}
              onChange={(e) => {
                setCuisineFilter(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
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
              onChange={(e) => {
                setSortBy(e.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              className="filter-select"
            >
              <option value="default">Sort: Default</option>
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
                  setVisibleCount(PAGE_SIZE);
                }}
              >
                Clear
              </button>
            )}
          </div>

          <h2>
            {filtered.length} restaurants
            {filtered.length !== restaurants.length && ` (of ${restaurants.length})`} in {city}
            <span className="showing-count">
              {' '}— showing {Math.min(visibleCount, filtered.length)}
            </span>
          </h2>

          {sorted.length === 0 ? (
            <div className="no-results">No restaurants match your filters.</div>
          ) : (
            <>
              <div className="restaurant-grid">
                {sorted.slice(0, visibleCount).map((restaurant) => (
                  <div
                    key={restaurant.id}
                    className="restaurant-card"
                    onClick={() => setSelected(restaurant)}
                  >
                    <img
                      className="restaurant-img"
                      src={imageFor(restaurant)}
                      alt={restaurant.name}
                      loading="lazy"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = fallbackImg(restaurant);
                      }}
                    />
                    <h3>{restaurant.name}</h3>
                    <p className="cuisine">Cuisine: {restaurant.cuisine}</p>
                    <span className="details-hint">
                      {restaurant.branches.length > 1
                        ? `${restaurant.branches.length} locations — click to view`
                        : 'Click for details →'}
                    </span>
                  </div>
                ))}
              </div>
              {visibleCount < sorted.length && (
                <button
                  className="load-more-btn"
                  onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                >
                  Load more ({sorted.length - visibleCount} remaining)
                </button>
              )}
            </>
          )}
        </div>
      )}

      {!loading && restaurants.length === 0 && !error && city && (
        <div className="no-results">No restaurants found. Try another city!</div>
      )}

      {selected && (
        <div className="modal-overlay" onClick={() => setSelected(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelected(null)}>
              ✕
            </button>
            <img
              className="modal-img"
              src={imageFor(selected)}
              alt={selected.name}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = fallbackImg(selected);
              }}
            />
            <div className="modal-body">
              <h2>{selected.name}</h2>
              <p className="modal-cuisine">
                {selected.cuisine}
                {selected.branches.length > 1 && ` · ${selected.branches.length} locations`}
              </p>

              <div className="branch-list">
                {selected.branches.map((b, i) => (
                  <div className="branch" key={b.id}>
                    {selected.branches.length > 1 && (
                      <h4 className="branch-title">Location {i + 1}</h4>
                    )}
                    <div className="modal-details">
                      {b.address && (
                        <div className="detail-row">
                          <span className="detail-label">📍 Address</span>
                          <span>{b.address}</span>
                        </div>
                      )}
                      {b.phone && (
                        <div className="detail-row">
                          <span className="detail-label">📞 Phone</span>
                          <a href={`tel:${b.phone}`}>{b.phone}</a>
                        </div>
                      )}
                      {b.website && (
                        <div className="detail-row">
                          <span className="detail-label">🌐 Website</span>
                          <a href={b.website} target="_blank" rel="noopener noreferrer">
                            {b.website}
                          </a>
                        </div>
                      )}
                      {b.openingHours && (
                        <div className="detail-row">
                          <span className="detail-label">🕒 Hours</span>
                          <span>{b.openingHours}</span>
                        </div>
                      )}
                      {(b.vegetarian || b.vegan) && (
                        <div className="detail-row">
                          <span className="detail-label">🥗 Diet</span>
                          <span>
                            {b.vegetarian ? `Vegetarian: ${b.vegetarian}` : ''}
                            {b.vegetarian && b.vegan ? ' · ' : ''}
                            {b.vegan ? `Vegan: ${b.vegan}` : ''}
                          </span>
                        </div>
                      )}
                      {!b.address && !b.phone && !b.website && !b.openingHours && (
                        <p className="detail-empty">No extra details tagged for this location.</p>
                      )}
                    </div>
                    <a
                      className="branch-maps-link"
                      href={`https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lon}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      📍 Open this location in Maps
                    </a>
                  </div>
                ))}
              </div>

              <div className="modal-actions">
                <a
                  className="modal-btn primary"
                  href={`https://www.google.com/search?q=${encodeURIComponent(
                    selected.name + ' ' + city + ' reviews'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  ⭐ Find reviews on Google
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
