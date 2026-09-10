/* ==========================================================
   Nazarene Missions Ministry — shop.html inventory loader
   Reads a published Google Sheet (as CSV) and renders items.

   >>> SETUP: replace SHEET_CSV_URL below with your own
   published-to-web CSV link. See README.md for how to get it.
   ========================================================== */

const SHEET_CSV_URL = "PASTE_YOUR_PUBLISHED_SHEET_CSV_LINK_HERE";

// Expected columns in the sheet (any order, matched by header name):
// name, price, category, featured, photo, dateAdded
// "featured" should contain TRUE/YES/1 for pieces you want to highlight.

let allItems = [];

async function loadInventory() {
  const statusEl = document.getElementById("shopStatus");
  const gridEl = document.getElementById("tagGrid");
  const featuredEl = document.getElementById("featuredGrid");

  if (!SHEET_CSV_URL || SHEET_CSV_URL.startsWith("PASTE_")) {
    statusEl.textContent = "Inventory sheet not connected yet — see README.md.";
    gridEl.innerHTML = sampleItemsHTML();
    if (featuredEl) featuredEl.innerHTML = sampleFeaturedHTML();
    return;
  }

  try {
    const res = await fetch(SHEET_CSV_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("Sheet fetch failed: " + res.status);
    const csvText = await res.text();
    allItems = parseCSV(csvText);

    statusEl.textContent =
      allItems.length + " item" + (allItems.length === 1 ? "" : "s") + " available";

    populateCategoryFilter(allItems);

    // Optional: render featured items separately
    if (featuredEl) {
      const featured = allItems.filter(i => i.featured);
      if (featured.length === 0) {
        featuredEl.innerHTML =
          "<p style='color:var(--ink-soft)'>No featured items right now — check back soon.</p>";
      } else {
        featuredEl.innerHTML = featured.map(itemCardHTML).join("");
      }
    }

    renderItems();
  } catch (err) {
    console.error(err);
    statusEl.textContent = "Couldn't load live inventory right now.";
    gridEl.innerHTML = sampleItemsHTML();
    if (featuredEl) featuredEl.innerHTML = sampleFeaturedHTML();
  }
}

/* Small, dependency-free CSV parser (handles quoted commas) */
function parseCSV(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') { inQuotes = false; }
      else { field += c; }
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { row.push(field); field = ""; }
      else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ""; }
      else if (c === '\r') { /* skip */ }
      else { field += c; }
    }
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }

  const headers = rows.shift().map(h => h.trim().toLowerCase());
  return rows
    .filter(r => r.some(cell => cell.trim() !== ""))
    .map(r => {
      const obj = {};
      headers.forEach((h, idx) => obj[h] = (r[idx] || "").trim());
      return {
        name: obj.name || "Unnamed item",
        price: parseFloat(obj.price) || 0,
        category: obj.category || "General",
        featured: /^(true|yes|1)$/i.test(obj.featured || ""),
        photo: obj.photo || "",
        dateAdded: obj.dateadded || ""
      };
    });
}

function populateCategoryFilter(items) {
  const select = document.getElementById("categorySelect");
  if (!select) return;
  const cats = [...new Set(items.map(i => i.category))].sort();
  cats.forEach(cat => {
    const opt = document.createElement("option");
    opt.value = cat;
    opt.textContent = cat;
    select.appendChild(opt);
  });
}

function renderItems() {
  const grid = document.getElementById("tagGrid");
  const sortBy = document.getElementById("sortSelect")?.value || "featured";
  const category = document.getElementById("categorySelect")?.value || "";

  let items = [...allItems];
  if (category) items = items.filter(i => i.category === category);

  items.sort((a, b) => {
    if (sortBy === "price-desc") return b.price - a.price;
    if (sortBy === "price-asc") return a.price - b.price;
    if (sortBy === "newest") return (b.dateAdded || "").localeCompare(a.dateAdded || "");
    // "featured" default: featured items first, then by price desc
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return b.price - a.price;
  });

  if (items.length === 0) {
    grid.innerHTML =
      "<p style='color:var(--ink-soft)'>No items in this category right now — check back soon.</p>";
    return;
  }

  grid.innerHTML = '<div class="card-grid">' + items.map(itemCardHTML).join("") + "</div>";
}

function itemCardHTML(item) {
  const photoInner = item.photo
    ? `<img src="${escapeHTML(item.photo)}" alt="${escapeHTML(item.name)}">`
    : `<div class="photo-placeholder">photo coming soon</div>`;

  return `
    <article class="card">
      <div class="item-photo">${photoInner}</div>
      <div class="card-body">
        <h3>${escapeHTML(item.name)}</h3>
        <div class="item-cat">${escapeHTML(item.category)}</div>
        <div class="item-price">$${item.price.toFixed(2)}</div>
        ${item.featured ? '<span class="featured-flag">Featured find</span>' : ""}
      </div>
    </article>
  `;
}

function escapeHTML(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/* Shown only before the sheet is connected, so the page never looks broken */
function sampleItemsHTML() {
  const demo = [
    { name: "Oak side table", price: 45, category: "Furniture", featured: true },
    { name: "Cast iron skillet", price: 18, category: "Kitchen", featured: false },
    { name: "Denim jacket, men's M", price: 12, category: "Clothing", featured: false }
  ];
  return '<div class="card-grid">' + demo.map(itemCardHTML).join("") + "</div>";
}

function sampleFeaturedHTML() {
  const demo = [
    { name: "Vintage lamp", price: 28, category: "Home", featured: true },
    { name: "Hardcover book set", price: 15, category: "Books", featured: true }
  ];
  return '<div class="card-grid">' + demo.map(itemCardHTML).join("") + "</div>";
}

const sortSelect = document.getElementById("sortSelect");
const categorySelect = document.getElementById("categorySelect");

if (sortSelect) sortSelect.addEventListener("change", renderItems);
if (categorySelect) categorySelect.addEventListener("change", renderItems);

loadInventory();