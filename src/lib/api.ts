export interface BusinessData {
  id: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  address: string;
  phone?: string;
  website?: string;
  hasWebsite: boolean;
}

type OsmElement = {
  id: number;
  lat?: number;
  lon?: number;
  center?: {
    lat?: number;
    lon?: number;
  };
  tags?: Record<string, string>;
};

type NominatimPlace = {
  lat: string;
  lon: string;
};

type OverpassResponse = {
  elements?: OsmElement[];
};

export async function searchBusinesses(location: string, businessType: string): Promise<BusinessData[]> {
  // 1. Get exact center coordinates using Nominatim API
  const geocodeUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(location)}&format=json&limit=1`;
  
  const geoResponse = await fetch(geocodeUrl, {
    headers: {
      'User-Agent': 'LocalBizFinderApp/1.0'
    }
  });
  
  if (!geoResponse.ok) {
    throw new Error('Failed to fetch location data');
  }

  const geoData = (await geoResponse.json()) as NominatimPlace[];
  if (!geoData || geoData.length === 0) {
    throw new Error('Location not found. Try a different city or area.');
  }

  // Get the exact center point
  const lat = parseFloat(geoData[0].lat);
  const lon = parseFloat(geoData[0].lon);
  
  const radius = 8000;

  // 2. Query Overpass API
  let queryTypes = '';
  
  if (businessType === 'all' || !businessType) {
    queryTypes = `
      nwr["shop"]["name"](around:${radius},${lat},${lon});
      nwr["amenity"]["name"](around:${radius},${lat},${lon});
      nwr["office"]["name"](around:${radius},${lat},${lon});
      nwr["craft"]["name"](around:${radius},${lat},${lon});
      nwr["healthcare"]["name"](around:${radius},${lat},${lon});
      nwr["tourism"]["name"](around:${radius},${lat},${lon});
    `;
  } else if (businessType === 'food') {
    queryTypes = `nwr["amenity"~"restaurant|cafe|fast_food|bar|pub|food_court|ice_cream"](around:${radius},${lat},${lon});`;
  } else if (businessType === 'shop') {
    queryTypes = `nwr["shop"](around:${radius},${lat},${lon});`;
  } else if (businessType === 'health') {
    queryTypes = `
      nwr["amenity"~"hospital|clinic|dentist|pharmacy|doctors|veterinary"](around:${radius},${lat},${lon});
      nwr["healthcare"](around:${radius},${lat},${lon});
    `;
  } else if (businessType === 'office') {
    queryTypes = `nwr["office"](around:${radius},${lat},${lon});`;
  } else {
    queryTypes = `nwr["${businessType}"](around:${radius},${lat},${lon});`;
  }

  const overpassQuery = `
    [out:json][timeout:25];
    (
      ${queryTypes}
    );
    out center 120;
  `;

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
    throw new Error(`OpenStreetMap search failed (${overpassResponse.status}). Please try again in a moment.`);
  }

  const overpassData = (await overpassResponse.json()) as OverpassResponse;

  // 3. Process and format the data
  const businesses: BusinessData[] = [];

  for (const element of overpassData.elements ?? []) {
    const tags = element.tags || {};
    
    // We MUST have a name
    if (!tags.name) continue;

    // Filter out residential buildings and schools if looking for "businesses"
    if (businessType === 'all') {
      if (tags.building === 'residential' || tags.building === 'apartments' || tags.amenity === 'school' || tags.amenity === 'college' || tags.power) {
        continue;
      }
    }

    // Determine coordinate
    const elLat = element.lat || (element.center && element.center.lat);
    const elLon = element.lon || (element.center && element.center.lon);

    if (!elLat || !elLon) continue;

    // Check for website
    const website = tags.website || tags['contact:website'] || tags.url || tags['contact:facebook'] || tags['contact:instagram'];
    
    // Address building
    const street = tags['addr:street'] || '';
    const housenumber = tags['addr:housenumber'] || '';
    const addressCity = tags['addr:city'] || '';
    const addressStr = [housenumber, street, addressCity].filter(Boolean).join(', ');

    // Phone
    const phone = tags.phone || tags['contact:phone'] || tags['contact:mobile'];

    // Determine type string for UI
    let type = 'Local Place';
    if (tags.shop) type = `Shop (${tags.shop})`;
    else if (tags.amenity) type = tags.amenity.charAt(0).toUpperCase() + tags.amenity.slice(1).replace('_', ' ');
    else if (tags.office) type = `Office (${tags.office})`;
    else if (tags.craft) type = `Craft (${tags.craft})`;
    else if (tags.healthcare) type = `Healthcare (${tags.healthcare})`;
    else if (tags.tourism) type = tags.tourism.charAt(0).toUpperCase() + tags.tourism.slice(1);
    else if (tags.building && tags.building !== 'yes') type = `Building (${tags.building})`;

    businesses.push({
      id: element.id,
      name: tags.name,
      type: type,
      lat: elLat,
      lon: elLon,
      address: addressStr || 'Address not listed',
      phone,
      website: website?.startsWith('http') ? website : (website ? `https://${website}` : undefined),
      hasWebsite: !!website
    });
  }

  // Filter out duplicates by name
  const uniqueBusinesses = Array.from(new Map(businesses.map(b => [b.name, b])).values());

  // Sort them alphabetically
  uniqueBusinesses.sort((a, b) => a.name.localeCompare(b.name));

  return uniqueBusinesses;
}
