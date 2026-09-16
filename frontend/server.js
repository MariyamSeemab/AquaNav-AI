// server.js
const express = require("express");
const { spawn } = require("child_process");
const path = require("path");
const fetch = require("node-fetch"); // CommonJS

const APP_PORT = 5000;
const BACKEND_ORIGIN = "http://127.0.0.1:5500"; // Flask backend
const BACKEND_START_CMD = "python3";            // change to "python" if needed
const BACKEND_SCRIPT = path.join(__dirname, "backend.py");

const app = express();
let backendProcess = null;
let backendStarting = false;

// ------------------- Serve dashboard -------------------
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ------------------- Serve water_route.html -------------------
app.get("/water-route", (req, res) => {
  res.sendFile(path.join(__dirname, "water_route.html"));
});

// ------------------- Check if backend is up -------------------
async function backendIsUp() {
  try {
    const res = await fetch(BACKEND_ORIGIN + "/");
    return res.ok || res.status >= 200;
  } catch (e) {
    return false;
  }
}

// ------------------- Start backend.py if not running -------------------
function startBackend() {
  if (backendProcess && !backendProcess.killed) return backendProcess;
  if (backendStarting) return backendProcess;
  backendStarting = true;

  console.log("Starting backend:", BACKEND_SCRIPT);

  backendProcess = spawn(BACKEND_START_CMD, [BACKEND_SCRIPT], {
    stdio: ["ignore", "pipe", "pipe"],
    detached: false,
  });

  backendProcess.stdout.on("data", (d) => process.stdout.write(`[backend stdout] ${d}`));
  backendProcess.stderr.on("data", (d) => process.stderr.write(`[backend stderr] ${d}`));

  backendProcess.on("exit", (code, sig) => {
    console.log(`Backend exited (code ${code}, sig ${sig})`);
    backendProcess = null;
    backendStarting = false;
  });

  return backendProcess;
}

// ------------------- Proxy /route requests to Flask -------------------
app.get("/route", async (req, res) => {
  try {
    if (!(await backendIsUp())) {
      startBackend();

      // wait up to 10 seconds for backend to start
      const start = Date.now();
      const timeout = 10000;
      let up = false;
      while (Date.now() - start < timeout) {
        await new Promise((r) => setTimeout(r, 300));
        if (await backendIsUp()) {
          up = true;
          break;
        }
      }
      if (!up) return res.status(502).send("Backend failed to start in time.");
    }

    const query = req.url; // includes /route?start=...&end=...
    const backendResp = await fetch(BACKEND_ORIGIN + query);
    const body = await backendResp.text();

    res.status(backendResp.status);
    backendResp.headers.forEach((v, k) => {
      if (!["content-encoding", "transfer-encoding", "content-length"].includes(k.toLowerCase()))
        res.set(k, v);
    });
    res.send(body);
  } catch (err) {
    console.error("Error proxying to backend:", err);
    res.status(500).send("Error contacting backend: " + String(err.message || err));
  }
});

// ------------------- Start Node server -------------------
app.listen(APP_PORT, () => {
  console.log(`✅ Node server running at http://127.0.0.1:${APP_PORT}/`);
  console.log(`➡️  Frontend fetch('/route?...') will auto-start backend.py if needed.`);
});
