import * as turf from '@turf/turf';

export function nearestDistanceToLines(point, lineFeatures) {
  let min = Infinity;
  for (const f of lineFeatures) {
    const d = turf.pointToLineDistance(point, f, { units: 'kilometers' });
    if (d < min) min = d;
  }
  return min;
}

export function insidePolygon(point, polygonFeature) {
  return turf.booleanPointInPolygon(point, polygonFeature);
}
