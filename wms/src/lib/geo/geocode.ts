/**
 * Lightweight geocoding for warehouse locations.
 *
 * Maps city/state/country triples to approximate lat/lng coordinates.
 * Covers the top US metro areas and major international hubs. When an
 * exact match isn't found, falls back to the state or country centroid
 * so a marker still appears on the globe.
 */

type Coords = { lat: number; lng: number };

const US_CITIES: Record<string, Coords> = {
  "phoenix,az": { lat: 33.4484, lng: -112.074 },
  "tucson,az": { lat: 32.2226, lng: -110.9747 },
  "los angeles,ca": { lat: 34.0522, lng: -118.2437 },
  "san francisco,ca": { lat: 37.7749, lng: -122.4194 },
  "san diego,ca": { lat: 32.7157, lng: -117.1611 },
  "oakland,ca": { lat: 37.8044, lng: -122.2712 },
  "sacramento,ca": { lat: 38.5816, lng: -121.4944 },
  "san jose,ca": { lat: 37.3382, lng: -121.8863 },
  "dallas,tx": { lat: 32.7767, lng: -96.797 },
  "houston,tx": { lat: 29.7604, lng: -95.3698 },
  "austin,tx": { lat: 30.2672, lng: -97.7431 },
  "san antonio,tx": { lat: 29.4241, lng: -98.4936 },
  "fort worth,tx": { lat: 32.7555, lng: -97.3308 },
  "el paso,tx": { lat: 31.7619, lng: -106.485 },
  "chicago,il": { lat: 41.8781, lng: -87.6298 },
  "atlanta,ga": { lat: 33.749, lng: -84.388 },
  "savannah,ga": { lat: 32.0809, lng: -81.0912 },
  "new york,ny": { lat: 40.7128, lng: -74.006 },
  "brooklyn,ny": { lat: 40.6782, lng: -73.9442 },
  "buffalo,ny": { lat: 42.8864, lng: -78.8784 },
  "miami,fl": { lat: 25.7617, lng: -80.1918 },
  "orlando,fl": { lat: 28.5383, lng: -81.3792 },
  "tampa,fl": { lat: 27.9506, lng: -82.4572 },
  "jacksonville,fl": { lat: 30.3322, lng: -81.6557 },
  "seattle,wa": { lat: 47.6062, lng: -122.3321 },
  "tacoma,wa": { lat: 47.2529, lng: -122.4443 },
  "spokane,wa": { lat: 47.6588, lng: -117.426 },
  "portland,or": { lat: 45.5152, lng: -122.6784 },
  "boston,ma": { lat: 42.3601, lng: -71.0589 },
  "washington,dc": { lat: 38.9072, lng: -77.0369 },
  "philadelphia,pa": { lat: 39.9526, lng: -75.1652 },
  "pittsburgh,pa": { lat: 40.4406, lng: -79.9959 },
  "denver,co": { lat: 39.7392, lng: -104.9903 },
  "colorado springs,co": { lat: 38.8339, lng: -104.8214 },
  "las vegas,nv": { lat: 36.1699, lng: -115.1398 },
  "reno,nv": { lat: 39.5296, lng: -119.8138 },
  "detroit,mi": { lat: 42.3314, lng: -83.0458 },
  "grand rapids,mi": { lat: 42.9634, lng: -85.6681 },
  "minneapolis,mn": { lat: 44.9778, lng: -93.265 },
  "kansas city,mo": { lat: 39.0997, lng: -94.5786 },
  "st louis,mo": { lat: 38.627, lng: -90.1994 },
  "saint louis,mo": { lat: 38.627, lng: -90.1994 },
  "nashville,tn": { lat: 36.1627, lng: -86.7816 },
  "memphis,tn": { lat: 35.1495, lng: -90.049 },
  "charlotte,nc": { lat: 35.2271, lng: -80.8431 },
  "raleigh,nc": { lat: 35.7796, lng: -78.6382 },
  "indianapolis,in": { lat: 39.7684, lng: -86.1581 },
  "columbus,oh": { lat: 39.9612, lng: -82.9988 },
  "cleveland,oh": { lat: 41.4993, lng: -81.6944 },
  "cincinnati,oh": { lat: 39.1031, lng: -84.512 },
  "new orleans,la": { lat: 29.9511, lng: -90.0715 },
  "baton rouge,la": { lat: 30.4515, lng: -91.1871 },
  "louisville,ky": { lat: 38.2527, lng: -85.7585 },
  "salt lake city,ut": { lat: 40.7608, lng: -111.891 },
  "oklahoma city,ok": { lat: 35.4676, lng: -97.5164 },
  "milwaukee,wi": { lat: 43.0389, lng: -87.9065 },
  "newark,nj": { lat: 40.7357, lng: -74.1724 },
  "jersey city,nj": { lat: 40.7178, lng: -74.0431 },
  "birmingham,al": { lat: 33.5186, lng: -86.8104 },
  "honolulu,hi": { lat: 21.3069, lng: -157.8583 },
  "anchorage,ak": { lat: 61.2181, lng: -149.9003 },
};

const US_STATES: Record<string, Coords> = {
  al: { lat: 32.806671, lng: -86.79113 },
  ak: { lat: 61.370716, lng: -152.404419 },
  az: { lat: 33.729759, lng: -111.431221 },
  ar: { lat: 34.969704, lng: -92.373123 },
  ca: { lat: 36.116203, lng: -119.681564 },
  co: { lat: 39.059811, lng: -105.311104 },
  ct: { lat: 41.597782, lng: -72.755371 },
  de: { lat: 39.318523, lng: -75.507141 },
  dc: { lat: 38.897438, lng: -77.026817 },
  fl: { lat: 27.766279, lng: -81.686783 },
  ga: { lat: 33.040619, lng: -83.643074 },
  hi: { lat: 21.094318, lng: -157.498337 },
  id: { lat: 44.240459, lng: -114.478828 },
  il: { lat: 40.349457, lng: -88.986137 },
  in: { lat: 39.849426, lng: -86.258278 },
  ia: { lat: 42.011539, lng: -93.210526 },
  ks: { lat: 38.5266, lng: -96.726486 },
  ky: { lat: 37.66814, lng: -84.670067 },
  la: { lat: 31.169546, lng: -91.867805 },
  me: { lat: 44.693947, lng: -69.381927 },
  md: { lat: 39.063946, lng: -76.802101 },
  ma: { lat: 42.230171, lng: -71.530106 },
  mi: { lat: 43.326618, lng: -84.536095 },
  mn: { lat: 45.694454, lng: -93.900192 },
  ms: { lat: 32.741646, lng: -89.678696 },
  mo: { lat: 38.456085, lng: -92.288368 },
  mt: { lat: 46.921925, lng: -110.454353 },
  ne: { lat: 41.12537, lng: -98.268082 },
  nv: { lat: 38.313515, lng: -117.055374 },
  nh: { lat: 43.452492, lng: -71.563896 },
  nj: { lat: 40.298904, lng: -74.521011 },
  nm: { lat: 34.840515, lng: -106.248482 },
  ny: { lat: 42.165726, lng: -74.948051 },
  nc: { lat: 35.630066, lng: -79.806419 },
  nd: { lat: 47.528912, lng: -99.784012 },
  oh: { lat: 40.388783, lng: -82.764915 },
  ok: { lat: 35.565342, lng: -96.928917 },
  or: { lat: 44.572021, lng: -122.070938 },
  pa: { lat: 40.590752, lng: -77.209755 },
  ri: { lat: 41.680893, lng: -71.51178 },
  sc: { lat: 33.856892, lng: -80.945007 },
  sd: { lat: 44.299782, lng: -99.438828 },
  tn: { lat: 35.747845, lng: -86.692345 },
  tx: { lat: 31.054487, lng: -97.563461 },
  ut: { lat: 40.150032, lng: -111.862434 },
  vt: { lat: 44.045876, lng: -72.710686 },
  va: { lat: 37.769337, lng: -78.169968 },
  wa: { lat: 47.400902, lng: -121.490494 },
  wv: { lat: 38.491226, lng: -80.954453 },
  wi: { lat: 44.268543, lng: -89.616508 },
  wy: { lat: 42.755966, lng: -107.30249 },
};

const INTL_CITIES: Record<string, Coords> = {
  // Europe
  "london,gb": { lat: 51.5074, lng: -0.1278 },
  "manchester,gb": { lat: 53.4808, lng: -2.2426 },
  "birmingham,gb": { lat: 52.4862, lng: -1.8904 },
  "frankfurt,de": { lat: 50.1109, lng: 8.6821 },
  "berlin,de": { lat: 52.52, lng: 13.405 },
  "munich,de": { lat: 48.1351, lng: 11.582 },
  "paris,fr": { lat: 48.8566, lng: 2.3522 },
  "lyon,fr": { lat: 45.764, lng: 4.8357 },
  "marseille,fr": { lat: 43.2965, lng: 5.3698 },
  "madrid,es": { lat: 40.4168, lng: -3.7038 },
  "barcelona,es": { lat: 41.3851, lng: 2.1734 },
  "milan,it": { lat: 45.4642, lng: 9.19 },
  "rome,it": { lat: 41.9028, lng: 12.4964 },
  "amsterdam,nl": { lat: 52.3676, lng: 4.9041 },
  "rotterdam,nl": { lat: 51.9244, lng: 4.4777 },
  // Asia
  "mumbai,in": { lat: 19.076, lng: 72.8777 },
  "bangalore,in": { lat: 12.9716, lng: 77.5946 },
  "bengaluru,in": { lat: 12.9716, lng: 77.5946 },
  "delhi,in": { lat: 28.6139, lng: 77.209 },
  "new delhi,in": { lat: 28.6139, lng: 77.209 },
  "chennai,in": { lat: 13.0827, lng: 80.2707 },
  "hyderabad,in": { lat: 17.385, lng: 78.4867 },
  "kolkata,in": { lat: 22.5726, lng: 88.3639 },
  "singapore,sg": { lat: 1.3521, lng: 103.8198 },
  "tokyo,jp": { lat: 35.6762, lng: 139.6503 },
  "osaka,jp": { lat: 34.6937, lng: 135.5023 },
  "shanghai,cn": { lat: 31.2304, lng: 121.4737 },
  "beijing,cn": { lat: 39.9042, lng: 116.4074 },
  "hong kong,hk": { lat: 22.3193, lng: 114.1694 },
  "seoul,kr": { lat: 37.5665, lng: 126.978 },
  "dubai,ae": { lat: 25.2048, lng: 55.2708 },
  "abu dhabi,ae": { lat: 24.4539, lng: 54.3773 },
  // Americas (non-US)
  "toronto,on": { lat: 43.6532, lng: -79.3832 },
  "vancouver,bc": { lat: 49.2827, lng: -123.1207 },
  "montreal,qc": { lat: 45.5017, lng: -73.5673 },
  "mexico city,mx": { lat: 19.4326, lng: -99.1332 },
  "sao paulo,br": { lat: -23.5505, lng: -46.6333 },
  // Oceania
  "sydney,au": { lat: -33.8688, lng: 151.2093 },
  "melbourne,au": { lat: -37.8136, lng: 144.9631 },
};

const COUNTRIES: Record<string, Coords> = {
  us: { lat: 39.8283, lng: -98.5795 },
  usa: { lat: 39.8283, lng: -98.5795 },
  ca: { lat: 56.1304, lng: -106.3468 },
  mx: { lat: 23.6345, lng: -102.5528 },
  gb: { lat: 55.3781, lng: -3.436 },
  uk: { lat: 55.3781, lng: -3.436 },
  de: { lat: 51.1657, lng: 10.4515 },
  fr: { lat: 46.6034, lng: 1.8883 },
  es: { lat: 40.4637, lng: -3.7492 },
  it: { lat: 41.8719, lng: 12.5674 },
  nl: { lat: 52.1326, lng: 5.2913 },
  jp: { lat: 36.2048, lng: 138.2529 },
  cn: { lat: 35.8617, lng: 104.1954 },
  in: { lat: 20.5937, lng: 78.9629 },
  au: { lat: -25.2744, lng: 133.7751 },
  br: { lat: -14.235, lng: -51.9253 },
  sg: { lat: 1.3521, lng: 103.8198 },
  ae: { lat: 23.4241, lng: 53.8478 },
};

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\./g, "");
}

/**
 * Resolve approximate lat/lng for a warehouse based on city, state, country.
 * Never returns null — always falls back to a reasonable centroid so
 * markers stay visible on the globe.
 */
export function geocodeWarehouse(
  city: string,
  state: string,
  country: string,
): Coords {
  const c = normalize(city);
  const s = normalize(state);
  const co = normalize(country);

  // Try city + state first (covers US metros)
  const cityStateKey = `${c},${s}`;
  if (US_CITIES[cityStateKey]) return US_CITIES[cityStateKey];
  if (INTL_CITIES[cityStateKey]) return INTL_CITIES[cityStateKey];

  // Try city + country (international hubs typically use country as second key)
  const cityCountryKey = `${c},${co}`;
  if (INTL_CITIES[cityCountryKey]) return INTL_CITIES[cityCountryKey];

  // Try city alone in any international map (Singapore, etc.)
  for (const [key, coords] of Object.entries(INTL_CITIES)) {
    if (key.split(",")[0] === c) return coords;
  }

  if (US_STATES[s]) return US_STATES[s];
  if (COUNTRIES[co]) return COUNTRIES[co];

  return { lat: 39.8283, lng: -98.5795 };
}
