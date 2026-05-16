 // or native fetch if Node 18+

async function test() {
  try {
    const location = "bhubaneswar";
    const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
    console.log("Fetching geo...");
    const geoResponse = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'LocalBizFinderApp/1.0'
      }
    });
    
    if (!geoResponse.ok) {
      throw new Error('Geo failed');
    }
    const geoData = await geoResponse.json();
    console.log("Geo:", geoData[0].lat, geoData[0].lon);

    const lat = geoData[0].lat;
    const lon = geoData[0].lon;
    const radius = 5000;
    
    const queryTypes = `
      nwr["shop"]["name"](around:${radius},${lat},${lon});
      nwr["amenity"]["name"](around:${radius},${lat},${lon});
      nwr["office"]["name"](around:${radius},${lat},${lon});
      nwr["craft"]["name"](around:${radius},${lat},${lon});
      nwr["healthcare"]["name"](around:${radius},${lat},${lon});
      nwr["tourism"]["name"](around:${radius},${lat},${lon});
    `;

    const overpassQuery = `
      [out:json][timeout:18];
      (
        ${queryTypes}
      );
      out center;
    `;

    console.log("Fetching overpass...");
    const overpassUrl = 'https://overpass-api.de/api/interpreter';
    const overpassResponse = await fetch(overpassUrl, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(overpassQuery),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'BusinessCatch/1.0 (Vercel deployment)'
      }
    });

    if (!overpassResponse.ok) {
        console.error("Overpass Error:", overpassResponse.status, await overpassResponse.text());
        return;
    }

    const overpassData = await overpassResponse.json();
    console.log("Success! Found:", overpassData.elements.length);
  } catch (e) {
    console.error("TEST FAILED:", e);
  }
}

test();
