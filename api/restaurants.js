import axios from 'axios';

export default async function handler(req, res) {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({ error: 'City name is required' });
  }

  try {
    const query = `[out:json];
      area["name"="${city}"]->.searchArea;
      (
        node["amenity"="restaurant"](area.searchArea);
        way["amenity"="restaurant"](area.searchArea);
      );
      out center limit 100;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', query);

    const restaurants = extractRestaurants(response.data);

    res.json({
      city,
      count: restaurants.length,
      restaurants
    });
  } catch (error) {
    console.error('Error fetching restaurants:', error.message);
    res.status(500).json({ error: 'Failed to fetch restaurants. Try a larger city name.' });
  }
}

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
