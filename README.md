# Curated Furniture Catalog

A premium, interactive, and responsive web catalog designed to present a handpicked collection of formal living room furniture. Built entirely with vanilla web technologies to eliminate build-step friction while maintaining a luxurious aesthetic.

## High-Level Concepts

### 1. Zero-Dependency Vanilla Architecture
The application runs directly in the browser using raw HTML, CSS, and JavaScript. There is no bundler (like Webpack or Vite) and no heavy frontend framework (like React or Vue). This guarantees that the project can be opened instantly by anyone, customized easily, and deployed to static hosts seamlessly. 

The only external resource is the `js-yaml` library loaded via a CDN to parse the catalog data.

### 2. Data-Driven UI (`data.yaml`)
To separate content from presentation, the entire catalog is driven by `data.yaml`. This acts as a highly readable, human-editable database. 
- **Easy Updates**: Adding a new piece of furniture requires zero coding knowledge. You simply add a new YAML block.
- **Dynamic Rendering**: `app.js` fetches this file on load, parses it into JavaScript objects, and dynamically generates the HTML cards.

### 3. Luxurious Design System (`styles.css`)
A primary goal was visual excellence. The CSS relies heavily on modern web capabilities to achieve a premium feel:
- **Responsive Grid System**: CSS Grid (`repeat(auto-fill, ...)` creates a fluid layout that adapts effortlessly to desktop, tablet, and mobile screens.
- **Micro-Animations & Transitions**: CSS `@keyframes` create staggered staggered entrance animations for the cards, giving a sense of depth. Hover attributes naturally lift and shadow the cards.
- **Dark Elegance**: We utilize a custom dark mode palette (`#0f1115` background) paired with a gold/beige accent (`#cba87c`) and the `Outfit` sans-serif font for a high-end editorial look.

### 4. Interactive State Management (`app.js`)
Even without a framework, the app handles sophisticated user interactivity using standard DOM events and local variables.
- **Category Filtering**: A set of pill buttons filter the array of loaded items instantly.
- **Cascading State Navigation**: The entire state-management engine maps purely to array indices instead of hardcoded IDs. This mathematical linking ensures reliable UI state references across complex category and array mutations.
- **Comparison Engine**: Users can check boxes to hold up to 3 items in a `compareIndices` array state. This triggers a floating action bar that passes the selected data into a responsive modal containing a side-by-side comparison matrix.

### 5. Configurable Aesthetics
The application gives end-users the ability to completely alter the visual style via a floating dropdown. Selecting a different style dynamically updates CSS variables attached to the `:root` and saves the user preference to `localStorage`.
- **Themes**: Luxurious Dark, Minimalist Light, Mid-Century Modern, Neon Cyberpunk, Raw Brutalism.

## How to Run Locally

Because the application needs to dynamically fetch `data.yaml`, modern browser security policies (CORS) will block it if you just double-click `index.html`. It must be served over HTTP.

1. Ensure you have Node.js installed.
2. Open your terminal in this directory.
3. Start a local server by running:
   ```bash
   npx http-server -p 8080 -c-1
   ```
4. Open your browser and navigate to `http://localhost:8080`.

## Adding New Furniture

To add new pieces, simply edit `data.yaml` and append a new block following this structure:

```yaml
- product_name: 'Name of the Piece'
  category: 'sofa' # 'sofa', 'chair', or 'coffee-table'
  price: '$1,000.00'
  dimensions:
    width: '10"'
    depth_length: '10"'
    height: '10"'
  main_image_url: 'https://example.com/image.jpg'
  url: 'https://example.com/product'
```

Refresh the page, and the new item will automatically be compiled into the gallery and the filter logic!

## Live Deployment

This project is configured to automatically deploy to GitHub Pages.
- **Link**: [https://architrathore.github.io/furniture-catalog/](https://architrathore.github.io/furniture-catalog/) *(Note: replace `architrathore` with your username if you forked this)*

To deploy changes to the live site, simply commit and push your updates to the `main` or `master` branch. The included GitHub Actions workflow (`.github/workflows/pages.yml`) will automatically build and publish the changes.
