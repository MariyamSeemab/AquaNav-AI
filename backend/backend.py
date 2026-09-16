from flask import Flask, request, send_file, jsonify
import geopandas as gpd
import geodatasets
import networkx as nx
from shapely.geometry import Point, Polygon
from geopy.distance import geodesic
from opencage.geocoder import OpenCageGeocode
import folium
import os

app = Flask(__name__)

# -------------------------
# CONFIG
# -------------------------
API_KEY = "f4462cbfc3f049af9fce182776cfc097"  # <-- your OpenCage API key
geocoder = OpenCageGeocode(API_KEY)

# Load world land polygons (only once)
world = gpd.read_file(geodatasets.get_path("naturalearth.land"))
land_union = world.unary_union

# Hazard storage (in memory)
hazards = []

# -------------------------
# HELPERS
# -------------------------
def is_water(coord):
    lon, lat = coord
    if land_union.contains(Point(lon, lat)):
        return False
    for hz in hazards:
        if hz["mode"] == "circle":
            if geodesic((lat, lon), (hz["center"][1], hz["center"][0])).km <= hz["radius_km"]:
                return False
        elif hz["mode"] == "polygon":
            if Polygon(hz["polygon"]).contains(Point(lon, lat)):
                return False
    return True

def frange(start, stop, step):
    while start < stop:
        yield round(start, 4)
        start += step

def nearest_water(coord, G):
    return min(G.nodes, key=lambda n: geodesic((coord[0], coord[1]), (n[1], n[0])).km)

def build_graph(start_coord, end_coord, step=0.2, buffer_deg=6.0):
    lat_min = min(start_coord[0], end_coord[0]) - buffer_deg
    lat_max = max(start_coord[0], end_coord[0]) + buffer_deg
    lon_min = min(start_coord[1], end_coord[1]) - buffer_deg
    lon_max = max(start_coord[1], end_coord[1]) + buffer_deg

    G = nx.Graph()
    for lat in frange(lat_min, lat_max, step):
        for lon in frange(lon_min, lon_max, step):
            if is_water((lon, lat)):
                G.add_node((lon, lat))

    for (lon, lat) in list(G.nodes):
        for dlon, dlat in [(step,0),(-step,0),(0,step),(0,-step)]:
            neighbor = (round(lon+dlon,4), round(lat+dlat,4))
            if neighbor in G.nodes:
                dist = geodesic((lat, lon), (neighbor[1], neighbor[0])).km
                G.add_edge((lon, lat), neighbor, weight=dist)

    return G

def geocode_location(name):
    if name == "current":
        raise ValueError("Frontend must send coordinates for current location")
    result = geocoder.geocode(name)
    if result and len(result) > 0:
        return (result[0]['geometry']['lat'], result[0]['geometry']['lng'])
    raise ValueError(f"Could not geocode location: {name}")

def parse_location(param):
    """Handles 'Mumbai', 'current', or '72.8,18.9'"""
    if not param:
        raise ValueError("Missing location")
    if param.lower() == "current":
        raise ValueError("Frontend must pass numeric coords for current")
    if "," in param:
        lon, lat = map(float, param.split(","))
        return (lat, lon)
    return geocode_location(param)

def simplify_path(path_coords, tolerance_km=10):
    """Reduce path points to straighter lines, keeping only key turns"""
    if len(path_coords) <= 2:
        return path_coords
    simplified = [path_coords[0]]
    for i in range(1, len(path_coords)-1):
        prev, curr, nxt = path_coords[i-1], path_coords[i], path_coords[i+1]
        # If detour angle is small and distance is short → skip
        d1 = geodesic(prev, curr).km
        d2 = geodesic(curr, nxt).km
        if d1 + d2 < tolerance_km:
            continue
        simplified.append(curr)
    simplified.append(path_coords[-1])
    return simplified

# -------------------------
# ROUTES
# -------------------------
@app.route("/")
def home():
    return send_file("ind.html")

@app.route("/route", methods=["GET"])
def get_route():
    start_name = request.args.get("start")
    end_name = request.args.get("end")
    straight = request.args.get("straight", "false").lower() == "true"

    if not start_name or not end_name:
        return jsonify({"error": "Please provide 'start' and 'end' query parameters."}), 400

    try:
        start_coord = parse_location(start_name)
        end_coord = parse_location(end_name)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400

    # Build graph and find path
    buffer_deg = 6.0
    step = 0.2
    found = False
    path = None
    while not found:
        G = build_graph(start_coord, end_coord, step=step, buffer_deg=buffer_deg)
        start_node = nearest_water(start_coord, G)
        end_node = nearest_water(end_coord, G)
        try:
            path = nx.shortest_path(G, source=start_node, target=end_node, weight="weight")
            found = True
        except nx.NetworkXNoPath:
            buffer_deg += 2.0
            step = max(0.05, step / 2.0)

    # Convert path to (lat, lon) list
    path_coords = [(lat, lon) for (lon, lat) in path]

    # Simplify if requested
    if straight:
        path_coords = simplify_path(path_coords)

    # Compute total distance
    total_dist = sum(geodesic(path_coords[i], path_coords[i+1]).km for i in range(len(path_coords)-1))

    # Create folium map
    m = folium.Map(location=start_coord, zoom_start=7)
    folium.Marker(start_coord, popup=f"Start", icon=folium.Icon(color="green")).add_to(m)
    folium.Marker(end_coord, popup=f"Destination", icon=folium.Icon(color="red")).add_to(m)
    folium.PolyLine(path_coords, color="blue", weight=3).add_to(m)

    # Draw hazards
    for hz in hazards:
        if hz["mode"] == "circle":
            folium.Circle(
                location=[hz["center"][1], hz["center"][0]],
                radius=hz["radius_km"]*1000,
                color="red", fill=True, fill_opacity=0.3,
                popup=hz["type"]
            ).add_to(m)
        elif hz["mode"] == "polygon":
            folium.Polygon(
                locations=[[lat, lon] for lon, lat in hz["polygon"]],
                color="red", fill=True, fill_opacity=0.3,
                popup=hz["type"]
            ).add_to(m)

    # Return JSON
    return jsonify({
        "map_html": m.get_root().render(),
        "start": start_name,
        "end": end_name,
        "waypoints": len(path_coords),
        "distance_km": round(total_dist, 2),
        "hazards_active": len(hazards)
    })

@app.route("/hazards", methods=["POST", "DELETE"])
def manage_hazards():
    global hazards
    if request.method == "POST":
        hz = request.get_json()
        hazards.append(hz)
        return jsonify({"status": "added", "count": len(hazards)})
    elif request.method == "DELETE":
        hazards = []
        return jsonify({"status": "cleared"})

if __name__ == "__main__":
    app.run(debug=True)
