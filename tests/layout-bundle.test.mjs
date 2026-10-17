import assert from 'node:assert/strict';
import { readProject, encodeSite, decodeSite, projectFiles } from '../scripts/lib/site-bundle.mjs';

const site = readProject();
assert.deepEqual(site.layout, { version: 2, routes: {}, groups: {}, labels: {} }, 'project loads the authoritative responsive layout registry');
const edited = structuredClone(site);
edited.layout.routes['/'] = { 'copy:home.TITLE': { desktop: { x: 20, y: -4 }, phone: { x: 0, width: 320 } } };
edited.layout.groups['/'] = { hero: { members: ['copy:home.TITLE', 'copy:home.INTRO'], label: 'Hero' } };
const decoded = decodeSite(encodeSite(edited));
assert.deepEqual(decoded.layout, edited.layout, 'responsive frames and groups survive the signed site archive');
assert(projectFiles(edited)['js/content/layout-data.js'].includes('"hero"'), 'project writing includes grouped visual layout data');

console.log('PASS: responsive frames and groups round-trip through project files and the site archive.');
