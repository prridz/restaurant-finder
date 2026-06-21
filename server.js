const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Serve React frontend
app.use(express.static(path.join(__dirname, 'client/build')));

// API endpoint to get restaurants by city
app.get('/api/restaurants', async (req, res) => {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'City name is required' });
  }

  try {
    // Query OpenStreetMap/Overpass API for restaurants
    const query = `
      [bbox];
      (
        node["amenity"="restaurant"](${city});
        way["amenity"="restaurant"](${city});
        relation["amenity"="restaurant"](${city});
      );
      out geom;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', query, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const restaurants = extractRestaurants(response.data);

    res.json({
      city,
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error.message);
    res.status(500).json({ error: 'Failed to fetch restaurants' });
  }
});

function extractRestaurants(data) {
  const restaurants = [];

  if (data.elements) {
    data.elements.forEach((element) => {
      if (element.tags && element.tags.name) {
        restaurants.push({
          id: element.id,
          name: element.tags.name,
          cuisine: element.tags.cuisine || 'Not specified',
          lat: element.lat || (element.center && element.center.lat),
          lon: element.lon || (element.center && element.center.lon)
        });
      }
    });
  }

  return restaurants;
}

// Fallback to React for any route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/build/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
