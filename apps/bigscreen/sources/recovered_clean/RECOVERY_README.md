# Source Code Recovery Report

## Overview
This project was recovered from sourcemap files using automated extraction tools.

## Recovery Statistics
- **Total files recovered**: 23
- **Recovery date**: 2025-09-22T15:12:35.741Z
- **Source**: webpack sourcemap files

## Project Structure
The recovered files follow a standard Vue.js project structure:

- `src/` - Main application source code
  - `components/` - Vue components
  - `pages/` - Page-level components
  - `layout/` - Layout components
  - `data/` - Data files and mock data
  - `routes/` - Router configuration
  - `store/` - Vuex store
  - `directives/` - Custom Vue directives

## Dependencies
Based on the recovered code, this appears to be a Vue 2 application with:
- Vue Router for routing
- Vuex for state management  
- Vis.js for network visualization
- Bootstrap for styling
- Various other Vue ecosystem packages

## Next Steps
1. Install dependencies: `npm install`
2. Review and fix any import paths
3. Add missing assets (images, fonts, etc.)
4. Test the application: `npm run serve`
5. Fix any runtime errors that may occur

## Notes
- Some files may contain webpack loader artifacts
- Asset files (images, CSS) were not recovered from sourcemaps
- You may need to recreate or find original asset files
- Configuration files (babel.config.js, etc.) may need to be recreated

## Original Application
This appears to be a dashboard application for BLE Mesh topology visualization,
possibly related to IoT device management.
