from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import json, math, os

app = Flask(__name__)
CORS(app)

# Resolve paths relative to this file so the app works regardless of CWD
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BASE_DIR, "..", "frontend")
FRONTEND_DIR = os.path.normpath(FRONTEND_DIR)

DATA_FILE = os.path.join(FRONTEND_DIR, "dataset.json")
if not os.path.exists(DATA_FILE):
    raise RuntimeError(f"dataset.json not found at: {DATA_FILE}")

with open(DATA_FILE, "r", encoding="utf-8") as fh:
    data = json.load(fh)

def haversine_km(lat1, lon1, lat2, lon2):
    # Haversine formula (returns kilometers)
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2.0)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2.0)**2
    return 2 * R * math.asin(math.sqrt(a))

@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "x.html")

@app.route("/fishh.html")
def fishh_page():
    return send_from_directory(FRONTEND_DIR, "fishh.html")

@app.route("/main.js")
def js_file():
    return send_from_directory(FRONTEND_DIR, "main.js")

@app.route("/x.css")
def css_file():
    return send_from_directory(FRONTEND_DIR, "x.css")

@app.route("/images/<path:filename>")
def images(filename):
    return send_from_directory(os.path.join(FRONTEND_DIR, "images"), filename)

@app.route("/locations", methods=["GET"])
def locations():
    # Return full dataset (used by "Show All Fish")
    return jsonify(data)

@app.route("/recommend", methods=["GET"])
def recommend():
    """
    Two modes:
    1) manual: ?location=Kerala&season=Monsoon  -> returns species matching both
    2) coords:  ?lat=9.9&lon=76.2[&season=Monsoon] -> returns species (optionally filtered by season) sorted by distance, with distance_km
    """
    lat = request.args.get("lat")
    lon = request.args.get("lon")
    location = request.args.get("location")
    season = request.args.get("season")

    # Mode 2: coordinates provided -> compute distances
    if lat is not None and lon is not None:
        try:
            latf = float(lat)
            lonf = float(lon)
        except ValueError:
            return jsonify({"message": "Invalid coordinates"}), 400

        candidates = data
        if season:
            candidates = [d for d in data if d.get("season","").lower() == season.lower()]

        out = []
        for d in candidates:
            try:
                dist = haversine_km(latf, lonf, float(d["lat"]), float(d["lon"]))
            except Exception:
                dist = None
            entry = dict(d)
            entry["distance_km"] = round(dist, 3) if dist is not None else None
            out.append(entry)
        out_sorted = sorted([e for e in out if e["distance_km"] is not None], key=lambda x: x["distance_km"]) + \
                     [e for e in out if e["distance_km"] is None]
        return jsonify(out_sorted)

    # Mode 1: location + season manual
    if location and season:
        matches = [d for d in data if d["location"].lower() == location.lower() and d["season"].lower() == season.lower()]
        if not matches:
            return jsonify({"message": "No fish found for this location+season"}), 404
        return jsonify(matches)

    return jsonify({"message": "Provide either lat+lon (optional season) OR location+season"}), 400

if __name__ == "__main__":
    # Use 0.0.0.0 if you want other devices on LAN to access
    app.run(debug=True, port=5000)
