/**
 * Furniture Catalog Application Core
 *
 * Architecture Decisions:
 * 1. Self-Executing Anonymous Function (IIFE): Encapsulates internal state
 *    so it doesn't pollute the global window object. Prevents variable collisions.
 * 2. Event Delegation: Rather than attaching click listeners to hundreds of individual
 *    buttons or checkboxes, we attach top-level listeners to container elements.
 * 3. Single Source of Truth: All UI rendering is derived from the `state` object.
 */
(() => {
  // --- Constants & Configuration ---
  // Centralizing these prevents "magic numbers" scattered throughout the codebase
  const CONFIG = {
    DATA_SOURCE: "data.yaml",
    MAX_COMPARE_ITEMS: 3,
    ANIMATION_DELAY_MS: 100,
  };

  // --- Application State ---
  // Isolating state from the DOM avoids complex querySelector lookups out-of-sync with raw data.
  const state = {
    catalogItems: [],
    // Using a Set for selected indices gives us O(1) constant time lookups during the render loop
    compareIndices: new Set(),
    cartIndices: new Set(),
    activeFilter: "all",
  };

  // Bootstrap application when the browser finishes building the initial HTML tree
  document.addEventListener("DOMContentLoaded", initializeApplication);

  async function initializeApplication() {
    try {
      setupThemeSelector();
      await fetchCatalogData();
      attachGlobalEventBindings();
      renderGalleryGrid();
    } catch (error) {
      displayFatalError(error);
    }
  }

  /**
   * Initializes the theme selector UI and restores any previously saved user preference.
   */
  function setupThemeSelector() {
    const themeSelect = document.getElementById("theme-select");
    if (!themeSelect) return;

    // Restore saved theme or default to 'dark'
    const savedTheme = localStorage.getItem("catalog-theme") || "dark";
    document.body.dataset.theme = savedTheme;
    themeSelect.value = savedTheme;

    // Listen for user changes
    themeSelect.addEventListener("change", (event) => {
      const newTheme = event.target.value;
      document.body.dataset.theme = newTheme;
      localStorage.setItem("catalog-theme", newTheme);
    });
  }

  /**
   * Fetches the raw YAML configuration and parses it into JavaScript objects.
   * WHY YAML? YAML is used instead of JSON because it is significantly more readable
   * for non-technical stakeholders (e.g., designers adding new furniture).
   */
  async function fetchCatalogData() {
    const response = await fetch(CONFIG.DATA_SOURCE);
    if (!response.ok) {
      throw new Error(
        "Failed to load local data.yaml. Requires an HTTP server due to CORS.",
      );
    }

    const yamlString = await response.text();
    state.catalogItems = jsyaml.load(yamlString) || [];

    // Restore cart from local storage if it exists
    const savedCart = localStorage.getItem("catalog-cart");
    if (savedCart) {
      try {
        const parsed = JSON.parse(savedCart);
        if (Array.isArray(parsed)) {
          state.cartIndices = new Set(parsed);
        }
      } catch (e) {
        console.warn("Could not parse saved cart data");
      }
    }
    updateCartBadge();
  }

  /**
   * Centralizes all static DOM event listeners.
   * Attaching listeners here prevents memory leaks that can occur when listeners
   * are repeatedly bound inside loop iterations.
   */
  function attachGlobalEventBindings() {
    // Top-Level Event Delegation for dynamic gallery content (checkboxes)
    const galleryContainer = document.getElementById("gallery");
    if (galleryContainer) {
      galleryContainer.addEventListener("change", handleGalleryInteractions);
      galleryContainer.addEventListener("click", handleGalleryClicks);
    }

    // Top-Level Event Delegation for filtering
    const filterContainer = document.querySelector(".filters");
    if (filterContainer) {
      filterContainer.addEventListener("click", handleCategoryFilterClick);
    }

    // Modal UI Actions
    document
      .getElementById("btn-compare")
      ?.addEventListener("click", openComparisonModal);
    document
      .getElementById("btn-clear")
      ?.addEventListener("click", clearComparisons);
    document
      .getElementById("btn-close-modal")
      ?.addEventListener("click", closeComparisonModal);

    // Cart UI Actions
    document
      .getElementById("btn-open-cart")
      ?.addEventListener("click", openCartModal);
    document
      .getElementById("btn-close-cart")
      ?.addEventListener("click", closeCartModal);
    document
      .getElementById("btn-clear-cart")
      ?.addEventListener("click", clearCart);

    // Global Mouse Tracking for CSS Parallax Image Effects
    document.addEventListener("mousemove", (e) => {
      // Normalize mouse position relative to the viewport: range [-0.5, 0.5]
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      document.documentElement.style.setProperty("--mouse-x", x);
      document.documentElement.style.setProperty("--mouse-y", y);
    });
  }

  // ==========================================
  // Event Handlers
  // ==========================================

  function handleGalleryInteractions(event) {
    if (event.target.classList.contains("compare-cb")) {
      toggleComparisonItem(event.target);
    }
  }

  function handleGalleryClicks(event) {
    if (event.target.classList.contains("btn-add-cart")) {
      toggleCartItem(event.target);
    }
  }

  function handleCategoryFilterClick(event) {
    // Only act if a filter button was clicked (ignoring clicks on the container itself)
    const button = event.target.closest(".filter-btn");
    if (!button) return;

    // Visual UI update for the active pill
    document
      .querySelectorAll(".filter-btn")
      .forEach((btn) => btn.classList.remove("active"));
    button.classList.add("active");

    // Update derived state and trigger a UI repaint
    state.activeFilter = button.dataset.filter;
    renderGalleryGrid();
  }

  function toggleComparisonItem(checkboxElement) {
    // We use the intrinsic array index from the raw data as our unique identifier
    const itemIndex = parseInt(checkboxElement.dataset.index, 10);
    const cardElement = checkboxElement.closest(".card");

    if (checkboxElement.checked) {
      // Business constraint: The comparison UI only supports a limited visual capacity
      if (state.compareIndices.size >= CONFIG.MAX_COMPARE_ITEMS) {
        checkboxElement.checked = false;
        alert(
          `You can compare a maximum of ${CONFIG.MAX_COMPARE_ITEMS} items at once.`,
        );
        return;
      }
      state.compareIndices.add(itemIndex);
      if (cardElement) cardElement.classList.add("selected");
    } else {
      state.compareIndices.delete(itemIndex);
      if (cardElement) cardElement.classList.remove("selected");
    }

    updateFloatingCompareBar();
  }

  function clearComparisons() {
    state.compareIndices.clear();
    updateFloatingCompareBar();

    // Update DOM states efficiently without triggering a full repaint/reanimation
    document
      .querySelectorAll(".card.selected")
      .forEach((card) => card.classList.remove("selected"));
    document
      .querySelectorAll(".compare-cb")
      .forEach((cb) => (cb.checked = false));
  }

  // ==========================================
  // Cart Logic
  // ==========================================

  function toggleCartItem(buttonElement) {
    const itemIndex = parseInt(buttonElement.dataset.index, 10);

    if (state.cartIndices.has(itemIndex)) {
      state.cartIndices.delete(itemIndex);
      buttonElement.textContent = "Add to Cart";
      buttonElement.classList.remove("in-cart");
    } else {
      state.cartIndices.add(itemIndex);
      buttonElement.textContent = "Remove from Cart";
      buttonElement.classList.add("in-cart");
    }

    localStorage.setItem(
      "catalog-cart",
      JSON.stringify(Array.from(state.cartIndices)),
    );
    updateCartBadge();
  }

  function clearCart() {
    state.cartIndices.clear();
    localStorage.removeItem("catalog-cart");
    updateCartBadge();

    // Update UI buttons
    document.querySelectorAll(".btn-add-cart").forEach((btn) => {
      btn.textContent = "Add to Cart";
      btn.classList.remove("in-cart");
    });

    closeCartModal();
  }

  function updateCartBadge() {
    const badge = document.getElementById("cart-badge");
    if (!badge) return;

    const count = state.cartIndices.size;
    badge.textContent = count;

    if (count > 0) {
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }

  function openCartModal() {
    const modal = document.getElementById("cart-modal");
    const container = document.getElementById("cart-container");
    const totalEl = document.getElementById("cart-total-price");

    if (state.cartIndices.size === 0) {
      container.innerHTML =
        '<p style="text-align: center; color: var(--text-muted); padding: 2rem;">Your cart is empty.</p>';
      totalEl.textContent = "$0.00";
    } else {
      const selectedObjects = Array.from(state.cartIndices).map(
        (idx) => state.catalogItems[idx],
      );
      container.innerHTML = generateCartHTML(selectedObjects);
      totalEl.textContent = calculateCartTotal(selectedObjects);
    }

    modal.classList.remove("hidden");
  }

  function closeCartModal() {
    document.getElementById("cart-modal").classList.add("hidden");
  }

  function generateCartHTML(items) {
    return items
      .map(
        (item) => `
      <div class="cart-item">
        <img src="${item.main_image_url}" alt="${item.product_name}" class="cart-img">
        <div class="cart-details">
          <h3 class="cart-title">${item.product_name}</h3>
          <div class="cart-item-price">${item.price}</div>
        </div>
        <a href="${item.url}" target="_blank" class="btn-primary small" style="margin-left: auto;">View Link</a>
      </div>
    `,
      )
      .join("");
  }

  function calculateCartTotal(items) {
    const total = items.reduce((sum, item) => {
      // Clean string like "$1,399.00" or "$2,299 - $3,099" to a base float
      // For ranges, we'll just take the lowest/first price found for the subtotal
      const cleanPriceStr = item.price.replace(/[^0-9.]/g, "");
      // Handle edge case if multiple prices are mashed together by grabbing only up to the first decimal
      const parsedFloat = parseFloat(cleanPriceStr);
      return sum + (isNaN(parsedFloat) ? 0 : parsedFloat);
    }, 0);

    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(total);
  }

  // ==========================================
  // Render Logic
  // ==========================================

  /**
   * Rebuilds the entire furniture grid.
   * WHY FULL RE-RENDER? Given the dataset is small (<100 items), standard DOM replacement
   * is highly performant. It prevents hidden state bugs common in granular DOM manipulation.
   */
  function renderGalleryGrid() {
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    // Filter down to the requested category
    const visibleData =
      state.activeFilter === "all"
        ? state.catalogItems
        : state.catalogItems.filter(
          (item) => item.category === state.activeFilter,
        );

    // Using a DocumentFragment minimizes browser reflows by assembling
    // all the DOM nodes in memory before injecting them into the document once.
    const fragment = document.createDocumentFragment();

    visibleData.forEach((item, displayIndex) => {
      fragment.appendChild(buildCardElement(item, displayIndex));
    });

    // Clear existing children and inject the new set
    gallery.innerHTML = "";
    gallery.appendChild(fragment);
  }

  /**
   * Constructs an individual furniture HTML card node.
   * Modularized into a factory function for testability and cleaner code structure.
   */
  function buildCardElement(item, displayIndex) {
    // Find the stable, original index of the item to use as a unique identifier
    // across filter state changes without needing a hardcoded ID in the YAML
    const originalIndex = state.catalogItems.indexOf(item);
    const isSelected = state.compareIndices.has(originalIndex);

    // Staggered entrance animation delay creates a sophisticated cascading visual effect
    const animationDelayObj = `${(displayIndex * CONFIG.ANIMATION_DELAY_MS) / 1000}s`;

    const card = document.createElement("article");
    card.className = `card ${isSelected ? "selected" : ""}`;
    card.style.animationDelay = animationDelayObj;

    // We bind the checkbox to the internal index using `data-index` for event delegation
    card.innerHTML = `
      <div class="card-image-wrapper">
        <a href="${item.url}" target="_blank" rel="noopener noreferrer" class="card-link" aria-label="View ${item.product_name}"></a>
        <img src="${item.main_image_url}" alt="${item.product_name}" class="card-img" loading="lazy" />
        <div class="checkbox-wrapper">
          <input type="checkbox" id="cb-${originalIndex}" class="compare-cb" data-index="${originalIndex}" ${isSelected ? "checked" : ""}>
          <label for="cb-${originalIndex}" class="compare-label">Compare</label>
        </div>
      </div>
      <div class="card-content">
        <h2 class="card-title">${item.product_name}</h2>
        <div class="card-price">${item.price}</div>
        <div class="card-specs">
          ${buildSpecBlock("Width", item.dimensions.width)}
          ${buildSpecBlock("Depth", item.dimensions.depth_length)}
          ${buildSpecBlock("Height", item.dimensions.height)}
        </div>
        <button class="btn-add-cart ${state.cartIndices.has(originalIndex) ? "in-cart" : ""}" data-index="${originalIndex}">
          ${state.cartIndices.has(originalIndex) ? "Remove from Cart" : "Add to Cart"}
        </button>
      </div>
    `;

    return card;
  }

  function buildSpecBlock(label, value) {
    return `
      <div class="spec-item">
        <span class="spec-label">${label}</span>
        <span class="spec-value">${value}</span>
      </div>
    `;
  }

  // ==========================================
  // Comparison Modal Interaction
  // ==========================================

  function updateFloatingCompareBar() {
    const bar = document.getElementById("compare-bar");
    const countLabel = document.getElementById("compare-count");
    const compareBtn = document.getElementById("btn-compare");

    const count = state.compareIndices.size;

    if (count > 0) {
      bar.classList.remove("hidden");
      countLabel.textContent = `${count} of ${CONFIG.MAX_COMPARE_ITEMS} selected`;
      // Comparing requires a baseline of at least 2 items to be logically meaningful
      compareBtn.disabled = count < 2;
    } else {
      bar.classList.add("hidden");
    }
  }

  function openComparisonModal() {
    const modal = document.getElementById("compare-modal");
    const container = document.getElementById("compare-table-container");

    // Map the selected indices back to the actual data objects
    const selectedObjects = Array.from(state.compareIndices).map(
      (idx) => state.catalogItems[idx],
    );

    container.innerHTML = generateComparisonTableHTML(selectedObjects);
    modal.classList.remove("hidden");
  }

  function closeComparisonModal() {
    document.getElementById("compare-modal").classList.add("hidden");
  }

  /**
   * Generates a side-by-side comparison matrix.
   * WHY TRANSPOSED? Standard tables use rows for items and columns for properties.
   * A side-by-side setup (columns = items, rows = properties) is vastly superior
   * for product comparison UX.
   */
  function generateComparisonTableHTML(itemsToCompare) {
    if (!itemsToCompare.length) return "";

    return `
      <table class="compare-table">
        <tr>
          <th>Feature</th>
          ${itemsToCompare
        .map(
          (i) => `
            <td class="compare-item-header">
              <img src="${i.main_image_url}" alt="${i.product_name}" class="compare-img">
              <h3>${i.product_name}</h3>
            </td>
          `,
        )
        .join("")}
        </tr>
        <tr>
          <th>Price</th>
          ${itemsToCompare.map((i) => `<td class="price-val">${i.price}</td>`).join("")}
        </tr>
        <tr>
          <th>Width</th>
          ${itemsToCompare.map((i) => `<td>${i.dimensions.width}</td>`).join("")}
        </tr>
        <tr>
          <th>Depth</th>
          ${itemsToCompare.map((i) => `<td>${i.dimensions.depth_length}</td>`).join("")}
        </tr>
        <tr>
          <th>Height</th>
          ${itemsToCompare.map((i) => `<td>${i.dimensions.height}</td>`).join("")}
        </tr>
        <tr>
          <th>Link</th>
          ${itemsToCompare
        .map(
          (i) => `
            <td>
              <a href="${i.url}" target="_blank" class="btn-primary small">View Item</a>
            </td>
          `,
        )
        .join("")}
        </tr>
      </table>
    `;
  }

  // ==========================================
  // Error Management
  // ==========================================

  function displayFatalError(error) {
    console.error("Core Architecture Failure:", error);
    const gallery = document.getElementById("gallery");
    if (!gallery) return;

    gallery.innerHTML = `
      <div style="grid-column: 1/-1; padding: 2rem; background: #2a1111; color: #ff8888; border-radius: 12px; font-size: 1.1rem; border: 1px solid #ff4444;">
        <strong>Error Displaying Catalog:</strong><br><br>
        Security protocols block direct fetching of local YAML configuration files via the <code>file://</code> protocol.<br><br>
        <strong>Fix:</strong> Please operate this via a local development server. <br>
        Terminal command: <code>npx http-server -p 8080 -c-1</code>
      </div>
    `;
  }
})();
