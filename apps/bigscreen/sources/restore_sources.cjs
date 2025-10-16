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

// Function to determine if source should be restored
function shouldRestore(source) {
    const cleaned = cleanPath(source);
    
    // Skip node_modules and webpack internals
    if (cleaned.includes('node_modules') || cleaned.includes('webpack/')) {
        return false;
    }
    
    // Skip Vue loader generated files (they contain hashes)
    if (source.includes('?') && !cleaned.endsWith('.js')) {
        return false;
    }
    
    // Restore Vue components and JS files
    return cleaned.endsWith('.vue') || cleaned.endsWith('.js');
}

// Function to restore sources from sourcemap
function restoreSources(sourcemapPath, outputDir) {
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
        
        for (let i = 0; i < sourcemap.sources.length; i++) {
            const source = sourcemap.sources[i];
            const sourceContent = sourcemap.sourcesContent[i];
            
            if (!shouldRestore(source) || !sourceContent) {
                skippedFiles.push(source);
                continue;
            }
            
            const cleanedPath = cleanPath(source);
            const outputPath = path.join(outputDir, cleanedPath);
            
            try {
                ensureDirectoryExists(outputPath);
                fs.writeFileSync(outputPath, sourceContent, 'utf8');
                console.log(`✓ Restored: ${cleanedPath}`);
                restoredCount++;
            } catch (error) {
                console.error(`✗ Failed to restore ${cleanedPath}:`, error.message);
            }
        }
        
        console.log(`\nRestored ${restoredCount} files`);
        console.log(`Skipped ${skippedFiles.length} files (node_modules, webpack internals, etc.)`);
        
        return restoredCount;
        
    } catch (error) {
        console.error(`Error processing sourcemap: ${error.message}`);
        return 0;
    }
}

// Function to create package.json if it doesn't exist
function createPackageJson(outputDir) {
    const packagePath = path.join(outputDir, 'package.json');
    
    if (!fs.existsSync(packagePath)) {
        const packageJson = {
            "name": "weibo-v2-recovered",
            "version": "1.0.0",
            "description": "Recovered Vue.js application from sourcemap",
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
                "vue-resize": "^0.5.0"
            },
            "devDependencies": {
                "@vue/cli-plugin-babel": "~4.5.0",
                "@vue/cli-plugin-eslint": "~4.5.0",
                "@vue/cli-plugin-router": "~4.5.0",
                "@vue/cli-plugin-vuex": "~4.5.0",
                "@vue/cli-service": "~4.5.0",
                "babel-eslint": "^10.1.0",
                "eslint": "^9.17.0",
                "eslint-plugin-vue": "^6.2.2",
                "vue-template-compiler": "^2.6.11"
            }
        };
        
        fs.writeFileSync(packagePath, JSON.stringify(packageJson, null, 2), 'utf8');
        console.log('✓ Created package.json');
    }
}

// Function to create basic Vue configuration
function createVueConfig(outputDir) {
    const vueConfigPath = path.join(outputDir, 'vue.config.js');
    
    if (!fs.existsSync(vueConfigPath)) {
        const vueConfig = `module.exports = {
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
        
        fs.writeFileSync(vueConfigPath, vueConfig, 'utf8');
        console.log('✓ Created vue.config.js');
    }
}

// Function to create index.html template
function createIndexHtml(outputDir) {
    const publicDir = path.join(outputDir, 'public');
    const indexPath = path.join(publicDir, 'index.html');
    
    if (!fs.existsSync(indexPath)) {
        ensureDirectoryExists(indexPath);
        
        const indexHtml = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width,initial-scale=1.0">
    <link rel="icon" href="<%= BASE_URL %>favicon.ico">
    <title>Weibo V2 - Recovered</title>
  </head>
  <body>
    <noscript>
      <strong>We're sorry but this app doesn't work properly without JavaScript enabled. Please enable it to continue.</strong>
    </noscript>
    <div id="app"></div>
    <!-- built files will be auto injected -->
  </body>
</html>`;
        
        fs.writeFileSync(indexPath, indexHtml, 'utf8');
        console.log('✓ Created public/index.html');
    }
}

// Main execution
const appSourcemapPath = 'C:\\Users\\imeep\\Desktop\\sker\\weibo-v2\\frontend\\sources\\dist\\js\\app.a834446f.js.map';
const outputDir = 'C:\\Users\\imeep\\Desktop\\sker\\weibo-v2\\frontend\\sources\\recovered';

console.log('Vue.js Source Code Recovery');
console.log('============================');
console.log(`Output directory: ${outputDir}`);

// Create output directory
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
    console.log('✓ Created output directory');
}

// Restore sources from app sourcemap
const restoredCount = restoreSources(appSourcemapPath, outputDir);

if (restoredCount > 0) {
    // Create additional project files
    createPackageJson(outputDir);
    createVueConfig(outputDir);
    createIndexHtml(outputDir);
    
    console.log('\n=== RECOVERY COMPLETE ===');
    console.log(`Successfully recovered ${restoredCount} source files`);
    console.log('\nRecovered file structure:');
    
    // List the recovered structure
    function listDirectory(dir, prefix = '') {
        try {
            const items = fs.readdirSync(dir).sort();
            items.forEach((item, index) => {
                const fullPath = path.join(dir, item);
                const isLast = index === items.length - 1;
                const connector = isLast ? '└── ' : '├── ';
                console.log(prefix + connector + item);
                
                if (fs.statSync(fullPath).isDirectory() && item !== 'node_modules') {
                    const nextPrefix = prefix + (isLast ? '    ' : '│   ');
                    listDirectory(fullPath, nextPrefix);
                }
            });
        } catch (error) {
            console.error(`Error listing directory ${dir}:`, error.message);
        }
    }
    
    listDirectory(outputDir);
    
    console.log('\n=== NEXT STEPS ===');
    console.log('1. Navigate to the recovered directory:');
    console.log(`   cd "${outputDir}"`);
    console.log('2. Install dependencies:');
    console.log('   npm install');
    console.log('3. Run the development server:');
    console.log('   npm run serve');
    console.log('4. Review and fix any import paths or missing dependencies');
    
} else {
    console.log('No sources were recovered. Check the sourcemap file.');
}