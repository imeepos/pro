const fs = require('fs');
const path = require('path');

// Function to extract and analyze sourcemap
function extractSourcemap(sourcemapPath) {
    console.log(`\n=== Analyzing ${sourcemapPath} ===`);
    
    try {
        const content = fs.readFileSync(sourcemapPath, 'utf8');
        const sourcemap = JSON.parse(content);
        
        console.log(`Version: ${sourcemap.version}`);
        console.log(`File: ${sourcemap.file || 'Not specified'}`);
        console.log(`Sources count: ${sourcemap.sources ? sourcemap.sources.length : 0}`);
        console.log(`Has sourcesContent: ${sourcemap.sourcesContent ? 'Yes' : 'No'}`);
        
        if (sourcemap.sources) {
            console.log('\n--- Source Files ---');
            
            // Group sources by type
            const vueFiles = [];
            const jsFiles = [];
            const nodeModules = [];
            const webpackFiles = [];
            
            sourcemap.sources.forEach((source, index) => {
                // Clean up the source path
                const cleanPath = source.replace('webpack:///', '');
                
                if (cleanPath.includes('node_modules')) {
                    nodeModules.push({ index, path: cleanPath });
                } else if (cleanPath.includes('webpack/')) {
                    webpackFiles.push({ index, path: cleanPath });
                } else if (cleanPath.endsWith('.vue')) {
                    vueFiles.push({ index, path: cleanPath });
                } else if (cleanPath.endsWith('.js')) {
                    jsFiles.push({ index, path: cleanPath });
                } else {
                    jsFiles.push({ index, path: cleanPath }); // Default to JS
                }
            });
            
            console.log(`\nVue Components (${vueFiles.length}):`);
            vueFiles.forEach(file => console.log(`  ${file.path}`));
            
            console.log(`\nJavaScript Files (${jsFiles.length}):`);
            jsFiles.forEach(file => console.log(`  ${file.path}`));
            
            console.log(`\nNode Modules (${nodeModules.length}):`);
            if (nodeModules.length > 10) {
                nodeModules.slice(0, 10).forEach(file => console.log(`  ${file.path}`));
                console.log(`  ... and ${nodeModules.length - 10} more`);
            } else {
                nodeModules.forEach(file => console.log(`  ${file.path}`));
            }
            
            console.log(`\nWebpack Files (${webpackFiles.length}):`);
            webpackFiles.forEach(file => console.log(`  ${file.path}`));
            
            // Check for sourcesContent
            if (sourcemap.sourcesContent) {
                console.log(`\n--- Sources with Content Available ---`);
                console.log(`Total sources with content: ${sourcemap.sourcesContent.length}`);
                
                // Count non-null content
                let contentCount = 0;
                sourcemap.sourcesContent.forEach(content => {
                    if (content !== null && content !== undefined) {
                        contentCount++;
                    }
                });
                console.log(`Sources with actual content: ${contentCount}`);
                
                // Show some example content lengths
                console.log('\nContent examples:');
                for (let i = 0; i < Math.min(5, sourcemap.sources.length); i++) {
                    const source = sourcemap.sources[i];
                    const content = sourcemap.sourcesContent[i];
                    if (content) {
                        console.log(`  ${source}: ${content.length} characters`);
                    } else {
                        console.log(`  ${source}: No content`);
                    }
                }
            }
            
            return {
                vueFiles,
                jsFiles,
                nodeModules,
                webpackFiles,
                sourcemap
            };
        }
        
    } catch (error) {
        console.error(`Error processing ${sourcemapPath}:`, error.message);
        return null;
    }
}

// Main execution
const appSourcemapPath = 'C:\\Users\\imeep\\Desktop\\sker\\weibo-v2\\frontend\\sources\\dist\\js\\app.a834446f.js.map';
const vendorsSourcemapPath = 'C:\\Users\\imeep\\Desktop\\sker\\weibo-v2\\frontend\\sources\\dist\\js\\chunk-vendors.b46fc4d3.js.map';

console.log('Vue.js Source Code Recovery from Sourcemap Analysis');
console.log('==================================================');

const appResult = extractSourcemap(appSourcemapPath);
const vendorsResult = extractSourcemap(vendorsSourcemapPath);

// Analysis summary
console.log('\n=== RECOVERY SUMMARY ===');
if (appResult) {
    console.log(`\nApp sourcemap contains ${appResult.vueFiles.length} Vue components and ${appResult.jsFiles.length} JS files`);
    console.log('Vue components found:');
    appResult.vueFiles.forEach(file => console.log(`  - ${file.path}`));
    
    console.log('\nApplication JS files:');
    appResult.jsFiles.forEach(file => console.log(`  - ${file.path}`));
}

if (vendorsResult) {
    console.log(`\nVendors sourcemap contains mostly node_modules (${vendorsResult.nodeModules.length} files)`);
}

console.log('\n=== RECOMMENDED RESTORATION PLAN ===');
console.log('1. Extract Vue components from app sourcemap');
console.log('2. Extract application JS files from app sourcemap');
console.log('3. Recreate directory structure: src/components, src/pages, src/layout, etc.');
console.log('4. Restore individual files using sourcesContent if available');
console.log('5. Vendors sourcemap mainly contains dependencies (node_modules) - less useful for source recovery');