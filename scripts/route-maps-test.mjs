import { readFile } from 'node:fs/promises';

const source = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const requiredSnippets = [
  "button.dataset.routeMaps = 'true'",
  "window.open('about:blank', '_blank')",
  "String(stop.location).trim().toLowerCase() !== 'address pending'",
  "origin: stops[0].location",
  "destination: stops[stops.length - 1].location",
  "params.set('waypoints'",
  "travelmode: 'driving'",
  "mapWindow.close()"
];

const missing = requiredSnippets.filter((snippet) => !source.includes(snippet));
if (missing.length) throw new Error(`route maps contract missing: ${missing.join(', ')}`);
console.log('Northstar route maps checks passed');
