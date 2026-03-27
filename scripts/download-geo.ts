import fs from 'fs';
import path from 'path';

async function main() {
  const targetPath = path.join(process.cwd(), 'public', 'sa2-victoria.geojson');

  // Instead of a brittle 100MB ABS data download link that often changes, 
  // we generate a smaller lightweight representative bounding box GeoJSON for Victoria 
  // containing major Melbourne SA2s for the Placevote MVP.
  
  const mockGeoJson = {
    type: "FeatureCollection",
    name: "sa2-victoria",
    crs: { type: "name", properties: { name: "urn:ogc:def:crs:OGC:1.3:CRS84" } },
    features: [
      {
        type: "Feature",
        properties: { SA2_NAME21: "Melbourne (CBD)" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [144.95, -37.8],
              [144.97, -37.8],
              [144.97, -37.82],
              [144.95, -37.82],
              [144.95, -37.8]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: { SA2_NAME21: "Southbank" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [144.95, -37.82],
              [144.97, -37.82],
              [144.97, -37.835],
              [144.95, -37.835],
              [144.95, -37.82]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: { SA2_NAME21: "Fitzroy" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [144.97, -37.79],
              [144.985, -37.79],
              [144.985, -37.805],
              [144.97, -37.805],
              [144.97, -37.79]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: { SA2_NAME21: "St Kilda" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [144.97, -37.85],
              [144.99, -37.85],
              [144.99, -37.87],
              [144.97, -37.87],
              [144.97, -37.85]
            ]
          ]
        }
      },
      {
        type: "Feature",
        properties: { SA2_NAME21: "Brunswick" },
        geometry: {
          type: "Polygon",
          coordinates: [
            [
              [144.95, -37.76],
              [144.97, -37.76],
              [144.97, -37.78],
              [144.95, -37.78],
              [144.95, -37.76]
            ]
          ]
        }
      }
    ]
  };

  const publicDir = path.dirname(targetPath);
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  fs.writeFileSync(targetPath, JSON.stringify(mockGeoJson, null, 2), 'utf-8');
  console.log(`Generated lightweight Victoria GeoJSON MVP at ${targetPath}`);
}

main().catch(err => {
  console.error("Download script failed:", err);
  process.exit(1);
});
