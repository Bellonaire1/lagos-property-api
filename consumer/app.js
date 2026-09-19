const API_BASE_URL =
  "https://lagos-property-api.vercel.app/api/v1";

const state = {
  cursor: null,
  hasMore: false,
  nextCursor: null,
  lastRequest: null,
};

const elements = {
  area: document.querySelector("#area"),
  propertyType: document.querySelector("#property-type"),
  sort: document.querySelector("#sort"),
  apply: document.querySelector("#apply-filters"),
  next: document.querySelector("#next-page"),
  grid: document.querySelector("#property-grid"),
  status: document.querySelector("#status"),
  count: document.querySelector("#result-count"),
};

function formatMinorNaira(value) {
  try {
    const minor = BigInt(String(value));
    const whole = (minor / 100n).toString();
    const cents = (minor % 100n).toString().padStart(2, "0");
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return `₦${grouped}.${cents}`;
  } catch {
    return "Price unavailable";
  }
}

function humanize(value) {
  return String(value).toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function setStatus(type, message, withRetry = false) {
  elements.status.hidden = false;
  elements.status.className = `status-panel ${type}`;
  elements.status.innerHTML = `<p>${message}</p>${withRetry ? '<button class="retry-button" id="retry" type="button">Retry</button>' : ""}`;
  if (withRetry) document.querySelector("#retry").addEventListener("click", () => loadProperties(false));
}

function collectFilters() {
  const sort = elements.sort.value;
  return {
    area: elements.area.value,
    propertyType: elements.propertyType.value,
    sort: sort === "newest" ? "createdAt" : "price",
    order: sort === "price-asc" ? "asc" : "desc",
  };
}

function buildUrl(filters, cursor = null) {
  const params = new URLSearchParams({ limit: "9", sort: filters.sort, order: filters.order });
  if (filters.area) params.set("area", filters.area);
  if (filters.propertyType) params.set("propertyType", filters.propertyType);
  if (cursor) params.set("cursor", cursor);
  return `${API_BASE_URL}/properties?${params}`;
}

function propertyCard(property) {
  const rooms = property.bedrooms === null
    ? "Land"
    : `${property.bedrooms} bed${property.bedrooms === 1 ? "" : "s"}`;
  const bathrooms = property.bathrooms === null ? "" : `<span><strong>${property.bathrooms}</strong> bath${property.bathrooms === 1 ? "" : "s"}</span>`;
  return `<article class="property-card">
    <div class="card-top"><p class="type-label">${humanize(property.propertyType)}</p><span class="listing-label">${humanize(property.listingType)}</span></div>
    <div class="card-body">
      <h3>${property.title}</h3>
      <p class="area-line">${property.area}</p>
      <p class="price">${formatMinorNaira(property.priceMinor)}</p>
      <div class="details"><span><strong>${rooms}</strong></span>${bathrooms}<span class="status-badge">${humanize(property.status)}</span></div>
      <p class="description">${property.description}</p>
    </div>
  </article>`;
}

async function loadProperties(reset = true) {
  const filters = collectFilters();
  if (reset) state.cursor = null;
  state.lastRequest = { filters, cursor: state.cursor };
  elements.next.hidden = true;
  elements.grid.innerHTML = "";
  setStatus("loading", "Loading properties...");

  try {
    const response = await fetch(buildUrl(filters, state.cursor));
    if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
    const payload = await response.json();
    const properties = payload.data ?? [];
    state.hasMore = payload.meta?.hasMore === true;
    state.nextCursor = payload.meta?.nextCursor ?? null;
    elements.count.textContent = `${payload.meta?.total ?? properties.length} listing${payload.meta?.total === 1 ? "" : "s"}`;

    if (properties.length === 0) {
      setStatus("empty", "No properties match these filters.");
      return;
    }

    elements.status.hidden = true;
    elements.grid.innerHTML = properties.map(propertyCard).join("");
    elements.next.hidden = !state.hasMore || !state.nextCursor;
  } catch (error) {
    elements.count.textContent = "";
    setStatus("error", "We couldn't load the listings. Please try again.", true);
    console.error(error);
  }
}

elements.apply.addEventListener("click", () => loadProperties(true));
elements.next.addEventListener("click", () => {
  if (state.nextCursor) {
    state.cursor = state.nextCursor;
    loadProperties(false);
  }
});

loadProperties();
