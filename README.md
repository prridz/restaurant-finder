# Restaurant Finder

A web app to find restaurants in any city using OpenStreetMap data.

## Features
- Search for restaurants by city name
- View restaurant names and cuisine types
- Uses free OpenStreetMap API (no API keys needed)
- Responsive design for mobile and desktop

## Tech Stack
- **Backend**: Node.js + Express
- **Frontend**: React
- **Data**: OpenStreetMap/Overpass API
- **Deployment**: Vercel

## Setup & Installation

### 1. Install Dependencies
```bash
# Install backend dependencies
npm install

# Install frontend dependencies
cd client
npm install
cd ..
```

### 2. Run Locally
```bash
# Start the server (runs on port 5000)
npm run dev
```

Then open `http://localhost:5000` in your browser.

### 3. Deploy to Vercel

1. Push your code to GitHub:
```bash
git add .
git commit -m "initial: restaurant finder app"
git push origin main
```

2. Go to [vercel.com](https://vercel.com)
3. Click "New Project"
4. Select your GitHub repo
5. Click "Deploy"
6. Done! Vercel will give you a live URL

## How It Works
- User enters a city name
- Backend queries OpenStreetMap for restaurants in that city
- Results are displayed with name, cuisine type, and coordinates
- No API key needed - uses free Overpass API

## Notes
- First search might take a few seconds (API response time)
- Works better with major cities
- Location data comes from OpenStreetMap contributors