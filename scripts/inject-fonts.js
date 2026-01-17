// scripts/inject-fonts.js
// Post-build script to inject icon font CSS into the built index.html
const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');
const assetsDir = path.join(distDir, 'assets', 'node_modules', '@expo', 'vector-icons', 'build', 'vendor', 'react-native-vector-icons', 'Fonts');

// Find the font files with their hashes
function findFontFile(baseName) {
  if (!fs.existsSync(assetsDir)) {
    console.warn(`Assets directory not found: ${assetsDir}`);
    return null;
  }
  
  const files = fs.readdirSync(assetsDir);
  const fontFile = files.find(f => f.startsWith(baseName) && f.endsWith('.ttf'));
  return fontFile || null;
}

// Main function
function injectFonts() {
  console.log('Injecting icon fonts into index.html...');
  
  if (!fs.existsSync(indexPath)) {
    console.error('index.html not found in dist folder');
    process.exit(1);
  }
  
  // Find font files
  const materialCommunityIcons = findFontFile('MaterialCommunityIcons');
  const materialIcons = findFontFile('MaterialIcons');
  const ionicons = findFontFile('Ionicons');
  const fontAwesome = findFontFile('FontAwesome');
  
  if (!materialCommunityIcons) {
    console.warn('MaterialCommunityIcons font not found');
  }
  
  const fontBasePath = '/assets/node_modules/@expo/vector-icons/build/vendor/react-native-vector-icons/Fonts';
  
  // Build the font-face CSS with multiple font-family aliases
  // React-native-vector-icons on web uses these specific font family names
  const fontFaces = [];
  
  if (materialCommunityIcons) {
    fontFaces.push(`
      @font-face {
        font-family: 'MaterialCommunityIcons';
        src: url('${fontBasePath}/${materialCommunityIcons}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }
      @font-face {
        font-family: 'material-community-icons';
        src: url('${fontBasePath}/${materialCommunityIcons}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }`);
  }
  
  if (materialIcons) {
    fontFaces.push(`
      @font-face {
        font-family: 'MaterialIcons';
        src: url('${fontBasePath}/${materialIcons}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }
      @font-face {
        font-family: 'Material Icons';
        src: url('${fontBasePath}/${materialIcons}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }`);
  }
  
  if (ionicons) {
    fontFaces.push(`
      @font-face {
        font-family: 'Ionicons';
        src: url('${fontBasePath}/${ionicons}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }
      @font-face {
        font-family: 'ionicons';
        src: url('${fontBasePath}/${ionicons}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }`);
  }
  
  if (fontAwesome) {
    fontFaces.push(`
      @font-face {
        font-family: 'FontAwesome';
        src: url('${fontBasePath}/${fontAwesome}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }
      @font-face {
        font-family: 'fontawesome';
        src: url('${fontBasePath}/${fontAwesome}') format('truetype');
        font-weight: normal;
        font-style: normal;
        font-display: block;
      }`);
  }
  
  const fontCSS = `<style id="icon-fonts">${fontFaces.join('\n')}</style>`;
  
  // Build preload links for better mobile performance
  const preloadLinks = [];
  if (materialCommunityIcons) {
    preloadLinks.push(`<link rel="preload" href="${fontBasePath}/${materialCommunityIcons}" as="font" type="font/ttf" crossorigin="anonymous">`);
  }
  if (materialIcons) {
    preloadLinks.push(`<link rel="preload" href="${fontBasePath}/${materialIcons}" as="font" type="font/ttf" crossorigin="anonymous">`);
  }
  if (ionicons) {
    preloadLinks.push(`<link rel="preload" href="${fontBasePath}/${ionicons}" as="font" type="font/ttf" crossorigin="anonymous">`);
  }
  if (fontAwesome) {
    preloadLinks.push(`<link rel="preload" href="${fontBasePath}/${fontAwesome}" as="font" type="font/ttf" crossorigin="anonymous">`);
  }
  
  const preloadHTML = preloadLinks.join('\n    ');
  
  // Read index.html
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Remove old icon-fonts style if exists
  html = html.replace(/<style id="icon-fonts">[\s\S]*?<\/style>/g, '');
  
  // Remove old preload links if exists
  html = html.replace(/<!-- Icon Font Preloads -->[\s\S]*?<!-- End Icon Font Preloads -->/g, '');
  
  // Inject preload links after <meta charset>
  html = html.replace('<meta charset="utf-8">', `<meta charset="utf-8">\n    <!-- Icon Font Preloads -->\n    ${preloadHTML}\n    <!-- End Icon Font Preloads -->`);
  
  // Inject CSS before </head>
  html = html.replace('</head>', `${fontCSS}\n</head>`);
  fs.writeFileSync(indexPath, html);
  console.log('✓ Icon fonts injected successfully');
  console.log(`  - MaterialCommunityIcons: ${materialCommunityIcons || 'NOT FOUND'}`);
  console.log(`  - MaterialIcons: ${materialIcons || 'NOT FOUND'}`);
  console.log(`  - Ionicons: ${ionicons || 'NOT FOUND'}`);
  console.log(`  - FontAwesome: ${fontAwesome || 'NOT FOUND'}`);
  console.log(`  - Preload links: ${preloadLinks.length} added for faster mobile loading`);
}

injectFonts();
