const fs = require('fs');
const path = require('path');

// Function to ensure directory exists
function ensureDirectoryExists(filePath) {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Function to clean and normalize file path
function cleanPath(sourcePath) {
    return sourcePath
        .replace('webpack:///', '')
        .replace(/\?[a-f0-9]+$/, '') // Remove hash suffixes like ?f42b
        .replace(/^\.\//, ''); // Remove leading ./
}

// Function to determine if this is an actual source file (not webpack loader output)
function isActualSource(source, content) {
    const cleaned = cleanPath(source);
    
    // Skip node_modules and webpack internals
    if (cleaned.includes('node_modules') || cleaned.includes('webpack/')) {
        return false;
    }
    
    // Skip if it's a loader reference (contains import with loaders)
    if (content.includes('vue-loader/lib/runtime/componentNormalizer.js') ||
        content.includes('?vue&type=')) {
        return false;
    }
    
    // For Vue files, ensure it's actual Vue template content
    if (cleaned.endsWith('.vue')) {
        return content.includes('<template>') || content.includes('<script>') || content.includes('<style>');
    }
    
    // For JS files, check it's not just loader imports
    if (cleaned.endsWith('.js')) {
        return !content.trim().startsWith('import { render, staticRenderFns }');
    }
    
    return true;
}

// Function to restore sources with better filtering
function restoreSourcesImproved(sourcemapPath, outputDir) {
    console.log(`\n=== Restoring sources from ${path.basename(sourcemapPath)} ===`);
    
    try {
        const content = fs.readFileSync(sourcemapPath, 'utf8');
        const sourcemap = JSON.parse(content);
        
        if (!sourcemap.sources || !sourcemap.sourcesContent) {
            console.log('No sources or sourcesContent found in sourcemap');
            return;
        }
        
        let restoredCount = 0;
        const skippedFiles = [];
        const restoredFiles = [];
        
        // Group similar files to pick the best version
        const fileGroups = {};
        
        for (let i = 0; i < sourcemap.sources.length; i++) {
            const source = sourcemap.sources[i];
            const sourceContent = sourcemap.sourcesContent[i];
            
            if (!sourceContent) {
                continue;
            }
            
            const cleanedPath = cleanPath(source);
            
            if (!fileGroups[cleanedPath]) {
                fileGroups[cleanedPath] = [];
            }
            
            fileGroups[cleanedPath].push({
                originalPath: source,
                content: sourceContent,
                index: i
            });
        }
        
        // Process each file group and pick the best version
        for (const [cleanedPath, versions] of Object.entries(fileGroups)) {
            // Skip node_modules and webpack internals
            if (cleanedPath.includes('node_modules') || cleanedPath.includes('webpack/')) {
                continue;
            }
            
            // Find the best version (actual source, not loader output)
            let bestVersion = null;
            
            for (const version of versions) {
                if (isActualSource(version.originalPath, version.content)) {
                    if (!bestVersion || version.content.length > bestVersion.content.length) {
                        bestVersion = version;
                    }
                }
            }
            
            if (bestVersion) {
                const outputPath = path.join(outputDir, cleanedPath);
                
                try {
                    ensureDirectoryExists(outputPath);
                    fs.writeFileSync(outputPath, bestVersion.content, 'utf8');
                    console.log(`✓ Restored: ${cleanedPath} (${bestVersion.content.length} chars)`);
                    restoredFiles.push({
                        path: cleanedPath,
                        size: bestVersion.content.length
                    });
                    restoredCount++;
                } catch (error) {
                    console.error(`✗ Failed to restore ${cleanedPath}:`, error.message);
                }
            } else {
                skippedFiles.push(cleanedPath);
            }
        }
        
        console.log(`\nRestored ${restoredCount} files`);
        console.log(`Skipped ${skippedFiles.length} files`);
        
        // Show restored files summary
        console.log('\n--- Restored Files Summary ---');
        const vueFiles = restoredFiles.filter(f => f.path.endsWith('.vue'));
        const jsFiles = restoredFiles.filter(f => f.path.endsWith('.js'));
        
        console.log(`Vue Components (${vueFiles.length}):`);
        vueFiles.forEach(file => console.log(`  ${file.path} (${file.size} chars)`));
        
        console.log(`JavaScript Files (${jsFiles.length}):`);
        jsFiles.forEach(file => console.log(`  ${file.path} (${file.size} chars)`));
        
        return restoredCount;
        
    } catch (error) {
        console.error(`Error processing sourcemap: ${error.message}`);
        return 0;
    }
}

// Function to create a README with recovery information
function createRecoveryReadme(outputDir, fileCount) {
    const readmePath = path.join(outputDir, 'RECOVERY_README.md');
    
    const readme = `# Source Code Recovery Report

## Overview
This project was recovered from sourcemap files using automated extraction tools.

## Recovery Statistics
- **Total files recovered**: ${fileCount}
- **Recovery date**: ${new Date().toISOString()}
- **Source**: webpack sourcemap files

## Project Structure
The recovered files follow a standard Vue.js project structure:

- \`src/\` - Main application source code
  - \`components/\` - Vue components
  - \`pages/\` - Page-level components
  - \`layout/\` - Layout components
  - \`data/\` - Data files and mock data
  - \`routes/\` - Router configuration
  - \`store/\` - Vuex store
  - \`directives/\` - Custom Vue directives

## Dependencies
Based on the recovered code, this appears to be a Vue 2 application with:
- Vue Router for routing
- Vuex for state management  
- Vis.js for network visualization
- Bootstrap for styling
- Various other Vue ecosystem packages

## Next Steps
1. Install dependencies: \`npm install\`
2. Review and fix any import paths
3. Add missing assets (images, fonts, etc.)
4. Test the application: \`npm run serve\`
5. Fix any runtime errors that may occur

## Notes
- Some files may contain webpack loader artifacts
- Asset files (images, CSS) were not recovered from sourcemaps
- You may need to recreate or find original asset files
- Configuration files (babel.config.js, etc.) may need to be recreated

## Original Application
This appears to be a dashboard application for BLE Mesh topology visualization,
possibly related to IoT device management.
`;
    
    fs.writeFileSync(readmePath, readme, 'utf8');
    console.log('✓ Created RECOVERY_README.md');
}

// Main execution
const appSourcemapPath = 'C:\\Users\\imeep\\Desktop\\sker\\weibo-v2\\frontend\\sources\\dist\\js\\app.a834446f.js.map';
const outputDir = 'C:\\Users\\imeep\\Desktop\\sker\\weibo-v2\\frontend\\sources\\recovered_clean';

console.log('Vue.js Source Code Recovery (Improved)');
console.log('=======================================');
console.log(`Output directory: ${outputDir}`);

// Create output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('✓ Created output directory');
}

// Restore sources with improved filtering
const restoredCount = restoreSourcesImproved(appSourcemapPath, outputDir);

if (restoredCount > 0) {
    // Create package.json
    const packageJson = {
        "name": "weibo-v2-recovered",
        "version": "1.0.0",
        "description": "Recovered Vue.js BLE Mesh Dashboard",
        "main": "src/main.js",
        "scripts": {
            "serve": "vue-cli-service serve",
            "build": "vue-cli-service build",
            "lint": "vue-cli-service lint"
        },
        "dependencies": {
            "core-js": "^3.6.5",
            "vue": "^2.6.11",
            "vue-router": "^3.2.0",
            "vuex": "^3.4.0",
            "vis": "^4.21.0",
            "v-tooltip": "^2.1.3",
            "vue-resize": "^0.5.0",
            "bootstrap": "^4.5.0"
        },
        "devDependencies": {
            "@vue/cli-plugin-babel": "~4.5.0",
            "@vue/cli-plugin-eslint": "~4.5.0",
            "@vue/cli-plugin-router": "~4.5.0",
            "@vue/cli-plugin-vuex": "~4.5.0",
            "@vue/cli-service": "~4.5.0",
            "babel-eslint": "^10.1.0",
            "eslint": "^6.7.2",
            "eslint-plugin-vue": "^6.2.2",
            "vue-template-compiler": "^2.6.11",
            "sass": "^1.26.5",
            "sass-loader": "^8.0.2"
        },
        "browserslist": [
            "> 1%",
            "last 2 versions",
            "not dead"
        ]
    };
    
    fs.writeFileSync(
        path.join(outputDir, 'package.json'), 
        JSON.stringify(packageJson, null, 2), 
        'utf8'
    );
    console.log('✓ Created package.json');
    
    // Create basic project files
    const vueConfigJs = `module.exports = {
  publicPath: process.env.NODE_ENV === 'production' ? '/' : '/',
  outputDir: 'dist',
  assetsDir: 'static',
  lintOnSave: false,
  productionSourceMap: true,
  devServer: {
    port: 8080,
    open: true,
    overlay: {
      warnings: false,
      errors: true
    }
  }
};`;
    
    fs.writeFileSync(path.join(outputDir, 'vue.config.js'), vueConfigJs, 'utf8');
    console.log('✓ Created vue.config.js');
    
    // Create public/index.html
    const publicDir = path.join(outputDir, 'public');
    ensureDirectoryExists(path.join(publicDir, 'index.html'));
    
    const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <link rel="icon" href="<%= BASE_URL %>favicon.ico">
    <title>BLE Mesh Dashboard - Recovered</title>
    <link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
  </head>
  <body>
    <noscript>
      <strong>We're sorry but this app doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
    </noscript>
    <div id="app"></div>
    <!-- built files will be auto injected -->
  </body>
</html>`;
    
    fs.writeFileSync(path.join(publicDir, 'index.html'), indexHtml, 'utf8');
    console.log('✓ Created public/index.html');
    
    // Create recovery documentation
    createRecoveryReadme(outputDir, restoredCount);
    
    console.log('\n=== RECOVERY COMPLETE ===');
    console.log(`Successfully recovered ${restoredCount} source files`);
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Navigate to the recovered directory:');
    console.log(`   cd "${outputDir}"`);
    console.log('2. Install dependencies:');
    console.log('   npm install');
    console.log('3. Run the development server:');
    console.log('   npm run serve');
    console.log('4. Check RECOVERY_README.md for detailed information');
    
} else {
    console.log('No sources were recovered. Check the sourcemap file.');
}