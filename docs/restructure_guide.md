# Persimmon File Restructuring Guide

## 🎯 Implementation Steps

### Step 1: Create Directory Structure

```bash
mkdir -p persimmon-intelligence/{public/{assets/{css,js,images}},src/{pages,styles,scripts},docs}
```

### Step 2: File Organization

#### Move Current Artifacts to New Structure:

| Current File | New Location | Notes |
|-------------|--------------|-------|
| `Persimmon Data Processor.html` | `public/processor.html` | Remove inline CSS/JS |
| `Integrated Intelligence Feed.html` | `public/feed.html` | Remove inline CSS/JS |
| `Weekly Report Template.html` | `public/reports.html` | Remove inline CSS/JS |
| `Setup Guide.md` | `docs/setup-guide.md` | Documentation |

#### Create New Shared Files:

| New File | Location | Purpose |
|----------|----------|---------|
| `main.css` | `public/assets/css/main.css` | Shared Persimmon styles |
| `shared.js` | `public/assets/js/shared.js` | Common utilities |
| `feed.js` | `public/assets/js/feed.js` | Feed-specific logic |
| `processor.js` | `public/assets/js/processor.js` | Processor logic |

## 🔧 Step 3: Extract Common HTML Structure

### Create Shared Header Component

**In each HTML file, replace the header section with:**

```html
<!-- Shared Persimmon Header -->
<header class="persimmon-header">
    <div class="persimmon-header__content">
        <a href="./index.html" class="persimmon-logo">
            <div class="persimmon-logo__icon">
                <svg width="40" height="40" viewBox="0 0 50 50">
                    <circle cx="25" cy="25" r="22" fill="none" stroke="#EC5800" stroke-width="2"/>
                    <circle cx="25" cy="25" r="8" fill="#EC5800"/>
                    <circle cx="25" cy="25" r="3" fill="white"/>
                    <circle cx="35" cy="15" r="4" fill="#4F7942"/>
                    <circle cx="35" cy="15" r="2" fill="#6B8E58"/>
                </svg>
            </div>
            <div class="persimmon-logo__text">
                <div class="persimmon-logo__primary">persimmon</div>
                <div class="persimmon-logo__secondary">INTELLIGENCE</div>
            </div>
        </a>
        
        <nav class="header-actions">
            <a href="./feed.html" class="btn">Intelligence Feed</a>
            <a href="./processor.html" class="btn">Data Processor</a>
            <a href="./reports.html" class="btn">Reports</a>
        </nav>
    </div>
</header>
```

## 🎨 Step 4: Update HTML Templates

### Feed Page Template (`public/feed.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Intelligence Feed - Persimmon Intelligence</title>
    <link rel="stylesheet" href="./assets/css/main.css">
</head>
<body>
    <!-- Shared header component -->
    <header class="persimmon-header">
        <!-- Header content from above -->
    </header>
    
    <main class="container">
        <!-- Feed-specific content here -->
        <!-- Remove all inline <style> tags -->
    </main>
    
    <!-- Shared scripts -->
    <script src="./assets/js/shared.js"></script>
    <script src="./assets/js/feed.js"></script>
</body>
</html>
```

### Processor Page Template (`public/processor.html`):

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Data Processor - Persimmon Intelligence</title>
    <link rel="stylesheet" href="./assets/css/main.css">
</head>
<body>
    <!-- Shared header component -->
    <header class="persimmon-header">
        <!-- Header content from above -->
    </header>
    
    <main class="container">
        <!-- Processor-specific content here -->
        <!-- Remove all inline <style> tags -->
    </main>
    
    <!-- Shared scripts -->
    <script src="./assets/js/shared.js"></script>
    <script src="./assets/js/processor.js"></script>
</body>
</html>
```

## 📄 Step 5: Extract JavaScript to Separate Files

### Feed JavaScript (`public/assets/js/feed.js`):

```javascript
/**
 * Intelligence Feed Page Logic
 * Uses Persimmon shared utilities
 */

// Feed-specific variables
let feedItems = [];
let selectedItems = [];
let currentFilters = {
    category: 'all',
    priority: '',
    time: '',
    source: ''
};

// Feed-specific functions
function renderFeed() {
    // Move your renderFeed function here
    // Use Persimmon.utils.sanitizeHtml() for safety
    // Use Persimmon.storage for persistence
}

function toggleSelection(itemId) {
    // Move selection logic here
}

// Initialize feed when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeFeed();
});

function initializeFeed() {
    loadFeedItems();
    renderFeed();
    renderSelectedItems();
    checkForImportedItems();
}

// Export functions for global access
window.handleSearch = (query) => {
    // Handle search functionality
    renderFeed();
};

window.updateFilters = () => {
    // Update filters and re-render
    renderFeed();
};
```

### Processor JavaScript (`public/assets/js/processor.js`):

```javascript
/**
 * Data Processor Page Logic
 * Uses Persimmon shared utilities
 */

// Processor-specific variables
let uploadedFiles = [];
let processingQueue = [];
let reviewItems = [];
let approvedItems = [];
let rejectedItems = [];

// Processor-specific functions
async function processFiles() {
    if (uploadedFiles.length === 0) {
        Persimmon.notifications.warning('Please upload files first');
        return;
    }
    
    for (const file of uploadedFiles) {
        await processFile(file);
    }
}

async function processFile(file) {
    try {
        const content = await readFileContent(file.file);
        const items = Persimmon.csv.parse(content, file.name);
        
        for (const item of items) {
            const analysis = await Persimmon.api.processWithClaude(item.content, file.name);
            
            if (analysis.relevant) {
                reviewItems.push({
                    id: Persimmon.utils.generateId(),
                    ...analysis,
                    originalData: item,
                    source: file.name
                });
            }
        }
        
        renderReviewItems();
        Persimmon.notifications.success(`Processed ${items.length} items from ${file.name}`);
        
    } catch (error) {
        console.error('Error processing file:', error);
        Persimmon.notifications.error(`Error processing ${file.name}: ${error.message}`);
    }
}

function publishToFeed() {
    if (approvedItems.length === 0) {
        Persimmon.notifications.warning('No approved items to publish');
        return;
    }
    
    // Convert to feed format
    const feedItems = approvedItems.map(item => ({
        id: Persimmon.utils.generateId(),
        title: item.title,
        category: item.category,
        priority: item.priority,
        source: `Processed from ${item.source}`,
        originalSource: item.source,
        date: new Date().toISOString().split('T')[0],
        time: 'Just now',
        summary: item.summary,
        quote: item.quote,
        link: item.link || '',
        analystComment: `AI-processed with ${item.confidence}% confidence`,
        aiProcessed: true,
        confidence: item.confidence,
        selected: false
    }));
    
    // Store for feed import
    Persimmon.storage.set('newFeedItems', feedItems);
    
    Persimmon.notifications.success(`Published ${feedItems.length} items to intelligence feed!`);
    
    // Clear approved items
    approvedItems = [];
    updateReviewStats();
}

// File reading utility
async function readFileContent(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
    });
}

// Initialize processor when page loads
document.addEventListener('DOMContentLoaded', () => {
    initializeProcessor();
});

function initializeProcessor() {
    renderProcessingQueue();
    renderReviewItems();
    updateReviewStats();
}

// Export functions for global access
window.handleFiles = (files) => {
    Array.from(files).forEach(file => {
        const fileObj = {
            id: Persimmon.utils.generateId(),
            name: file.name,
            size: file.size,
            type: file.type,
            file: file
        };
        uploadedFiles.push(fileObj);
    });
    
    renderFileList();
};
```

## 🔄 Step 6: Migration Process

### Phase 1: Setup Structure (Day 1)
1. **Create directory structure**
2. **Copy current artifacts to new locations**
3. **Create shared CSS and JS files**
4. **Test that pages still load**

### Phase 2: Extract Styles (Day 2)
1. **Move all CSS from `<style>` tags to `main.css`**
2. **Update HTML files to link to shared CSS**
3. **Test visual consistency across pages**

### Phase 3: Extract JavaScript (Day 3)
1. **Move JavaScript from `<script>` tags to separate files**
2. **Update functions to use `Persimmon.utils`**
3. **Test all functionality works**

### Phase 4: Polish & Deploy (Day 4)
1. **Add navigation between pages**
2. **Test complete workflow**
3. **Deploy to GitHub Pages**

## 🧪 Step 7: Testing Checklist

### Before Migration:
- [ ] Current feed loads and functions properly
- [ ] Current processor handles file uploads
- [ ] Current integration between processor and feed works

### After Migration:
- [ ] All pages load with consistent styling
- [ ] Navigation between pages works
- [ ] File upload still functions
- [ ] Claude API integration still works
- [ ] Data flow between processor and feed intact
- [ ] No JavaScript errors in console
- [ ] Responsive design works on mobile

## 🚀 Step 8: Benefits After Migration

### Code Organization:
- ✅ **No duplication** - Single source of truth for styles and utilities
- ✅ **Maintainable** - Update styles in one place, affects all pages
- ✅ **Scalable** - Easy to add new pages using shared components
- ✅ **Professional** - Clean separation of concerns

### Performance:
- ✅ **Faster loading** - Shared CSS/JS files cached by browser
- ✅ **Smaller files** - No repeated code in each HTML file
- ✅ **Better caching** - Static assets can be cached separately

### Development:
- ✅ **Easier debugging** - Logic separated by concern
- ✅ **Reusable components** - Header, buttons, forms used everywhere
- ✅ **Team collaboration** - Multiple people can work on different files

## 📁 Final Directory Structure

```
persimmon-intelligence/
├── public/                          # Production files
│   ├── index.html                   # Landing page
│   ├── feed.html                    # Intelligence feed
│   ├── processor.html               # Data processor
│   ├── reports.html                 # Report generator
│   ├── assets/
│   │   ├── css/
│   │   │   └── main.css            # Shared styles (4KB)
│   │   ├── js/
│   │   │   ├── shared.js           # Utilities (8KB)
│   │   │   ├── feed.js             # Feed logic (6KB)
│   │   │   └── processor.js        # Processor logic (5KB)
│   │   └── images/
│   │       └── persimmon-logo.svg
├── docs/
│   ├── setup-guide.md
│   └── user-manual.md
├── README.md
└── .gitignore
```

## 🎯 Next Steps

1. **Create the directory structure** using the commands above
2. **Copy your current HTML files** to the new locations
3. **Create the shared CSS file** using the provided `main.css`
4. **Create the shared JS file** using the provided `shared.js`
5. **Update HTML files** to remove inline styles and link to shared files
6. **Test everything works** before proceeding
7. **Extract page-specific JavaScript** to separate files

This structure will make your Persimmon platform much more maintainable and professional while keeping all your current functionality intact.

Would you like me to help you with any specific part of this migration process?