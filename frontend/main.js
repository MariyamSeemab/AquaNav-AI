// main.js
const map = L.map('map').setView([20.5937, 78.9629], 5); // center of India

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const resultsDiv = document.getElementById("results");

// Custom function to create fish icon from image
function createFishIcon(imageFile) {
  return L.icon({
    iconUrl: `images/${imageFile}`,
    iconSize: [40, 40], 
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
}

// Function to show fish on map
function showFishOnMap(fishArray) {
  map.eachLayer(layer => {
    if(layer.options && layer.options.pane === "markerPane") {
      map.removeLayer(layer); // remove existing fish markers
    }
  });

  fishArray.forEach(fish => {
    const lat = parseFloat(fish.lat);
    const lon = parseFloat(fish.lon);
    const icon = createFishIcon(fish.image || "default.png"); 

    const marker = L.marker([lat, lon], {icon}).addTo(map);

    // Popup content with location, season, techniques
    const popupContent = `
      <strong>${fish.species}</strong><br>
      Location: ${fish.location}<br>
      Season: ${fish.season}<br>
      Technique: ${fish.technique || "N/A"}${fish.distance_km ? `<br>Distance: ${fish.distance_km} km` : ""}
    `;
    marker.bindPopup(popupContent);
  });
}

// Fetch all fish
document.getElementById("allBtn").addEventListener("click", async () => {
  const res = await fetch("/locations");
  const data = await res.json();
  resultsDiv.innerHTML = data.map(f => `
    <div class="fish-card">
      <strong>${f.species}</strong> - ${f.location} (${f.season})<br>
      Technique: ${f.technique || "N/A"}
    </div>
  `).join("");
  showFishOnMap(data);
});

// Recommend button
document.getElementById("recommendBtn").addEventListener("click", async () => {
  const location = document.getElementById("locationInput").value;
  const season = document.getElementById("seasonSelect").value;
  if (!location || !season) return alert("Please enter location and select season");

  const res = await fetch(`/recommend?location=${location}&season=${season}`);
  if(res.status !== 200) {
    const msg = await res.json();
    resultsDiv.innerHTML = `<p>${msg.message}</p>`;
    return;
  }
  const data = await res.json();
  resultsDiv.innerHTML = data.map(f => `
    <div class="fish-card">
      <strong>${f.species}</strong> - ${f.location} (${f.season})<br>
      Technique: ${f.technique || "N/A"}
    </div>
  `).join("");
  showFishOnMap(data);
});

// Use my location - only nearest fish
document.getElementById("locBtn").addEventListener("click", () => {
  if(navigator.geolocation) {
    navigator.geolocation.watchPosition(async pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const season = document.getElementById("seasonSelect").value;

      const url = `/recommend?lat=${lat}&lon=${lon}` + (season ? `&season=${season}` : "");
      const res = await fetch(url);
      if(res.status !== 200) {
        const msg = await res.json();
        resultsDiv.innerHTML = `<p>${msg.message}</p>`;
        return;
      }
      const data = await res.json();

      // Select only nearest fish
      const nearestFish = data[0] ? [data[0]] : [];

      resultsDiv.innerHTML = nearestFish.map(f => `
        <div class="fish-card">
          <strong>${f.species}</strong> - ${f.location} (${f.season})<br>
          Technique: ${f.technique || "N/A"} - ${f.distance_km} km
        </div>
      `).join("");

      showFishOnMap(nearestFish);
    }, err => alert("Could not get your location"));
  } else {
    alert("Geolocation is not supported by this browser");
  }
});

// Added part: navigate to fishh.html when Fish Species Index button is clicked
document.getElementById('fishIndexBtn').addEventListener('click', function() {
  window.location.href = 'fishh.html';
});
