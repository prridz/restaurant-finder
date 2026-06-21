const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  // Handle API routes
  if (req.url.startsWith('/api/restaurants')) {
    return handleRestaurants(req, res);
  }

  // Serve static files from public
  let filePath = path.join(__dirname, '..', 'public', req.url === '/' ? 'index.html' : req.url);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.svg': 'image/svg+xml'
    };
    res.setHeader('Content-Type', contentTypes[ext] || 'application/octet-stream');
    res.end(fs.readFileSync(filePath));
  } else {
    // SPA fallback
    res.setHeader('Content-Type', 'text/html');
    res.end(fs.readFileSync(path.join(__dirname, '..', 'public', 'index.html')));
  }
};

function handleRestaurants(req, res) {
  const city = new URL(req.url, 'http://localhost').searchParams.get('city');

  if (!city) {
    return res.status(400).json({ error: 'City name is required' });
  }

  const mockRestaurants = {
    paris: [
      { id: 1, name: 'Le Jules Verne', cuisine: 'French', lat: 48.8584, lon: 2.2945 },
      { id: 2, name: 'L\'Astrance', cuisine: 'French', lat: 48.8525, lon: 2.2834 },
      { id: 3, name: 'Septime', cuisine: 'Modern European', lat: 48.8518, lon: 2.3763 },
      { id: 4, name: 'Frenchie', cuisine: 'French', lat: 48.8647, lon: 2.3522 },
      { id: 5, name: 'Bouchon de la rue de Seine', cuisine: 'Bistro', lat: 48.8565, lon: 2.3357 },
    ],
    london: [
      { id: 6, name: 'The Fat Duck', cuisine: 'Modern British', lat: 51.4566, lon: -0.6289 },
      { id: 7, name: 'Dinner by Heston Blumenthal', cuisine: 'British', lat: 51.4970, lon: -0.1622 },
      { id: 8, name: 'Sketch', cuisine: 'French', lat: 51.5154, lon: -0.1408 },
      { id: 9, name: 'Noma', cuisine: 'Nordic', lat: 51.5050, lon: -0.0754 },
      { id: 10, name: 'Dishoom', cuisine: 'Indian', lat: 51.5191, lon: -0.1216 },
    ],
    berlin: [
      { id: 11, name: 'Rutz', cuisine: 'Modern European', lat: 52.5206, lon: 13.3994 },
      { id: 12, name: 'Prater Garten', cuisine: 'German', lat: 52.5331, lon: 13.4050 },
      { id: 13, name: 'Borchardt', cuisine: 'French', lat: 52.5189, lon: 13.3862 },
      { id: 14, name: 'Horváth', cuisine: 'Austrian', lat: 52.5039, lon: 13.3683 },
      { id: 15, name: 'Cookies Cream', cuisine: 'International', lat: 52.5292, lon: 13.3903 },
    ],
    'new york': [
      { id: 16, name: 'Eleven Madison Park', cuisine: 'French', lat: 40.7353, lon: -73.9834 },
      { id: 17, name: 'Per Se', cuisine: 'French', lat: 40.7734, lon: -73.9825 },
      { id: 18, name: 'Balthazar', cuisine: 'French', lat: 40.7239, lon: -73.9970 },
      { id: 19, name: 'Carbone', cuisine: 'Italian', lat: 40.7289, lon: -73.9984 },
      { id: 20, name: 'Gramercy Tavern', cuisine: 'American', lat: 40.7362, lon: -73.9878 },
    ],
    tokyo: [
      { id: 21, name: 'Sukiyabashi Jiro', cuisine: 'Sushi', lat: 35.6722, lon: 139.7718 },
      { id: 22, name: 'Ippudo', cuisine: 'Ramen', lat: 35.6644, lon: 139.7407 },
      { id: 23, name: 'Nabezo', cuisine: 'Hot Pot', lat: 35.6654, lon: 139.7304 },
      { id: 24, name: 'Tsukiji Outer Market', cuisine: 'Seafood', lat: 35.6654, lon: 139.7703 },
      { id: 25, name: 'Ichiran', cuisine: 'Tonkotsu Ramen', lat: 35.6672, lon: 139.7677 },
    ]
  };

  const cityKey = city.toLowerCase();
  const restaurants = mockRestaurants[cityKey] || [];

  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({
    city,
    count: restaurants.length,
    restaurants
  }));
}
