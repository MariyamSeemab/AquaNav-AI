from flask import Flask
import requests

app = Flask(__name__)

@app.route("/")
def home():
    # Example: Mumbai sea coordinates
    lat, lon = 18.96, 72.82

    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m"

    response = requests.get(url)
    data = response.json()

    temperature = data["hourly"]["temperature_2m"][0]
    humidity = data["hourly"]["relative_humidity_2m"][0]
    wind = data["hourly"]["wind_speed_10m"][0]

    return f"""
    <html>
        <head><title>🌊 Sea Weather</title></head>
        <body style="font-family: Arial; text-align: center; background:#eef; padding:40px;">
            <h1>🌊 Sea Weather Report</h1>
            <p><b>Temperature:</b> {temperature} °C</p>
            <p><b>Humidity:</b> {humidity} %</p>
            <p><b>Wind Speed:</b> {wind} m/s</p>
        </body>
    </html>
    """

if __name__ == "__main__":
    app.run(debug=True)

