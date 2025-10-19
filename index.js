// server/index.js
const express = require("express");
const fetch = require("node-fetch");
const path = require("path");
const fs = require("fs");
const duckdb = require("duckdb");

const app = express();
app.use(express.json());

// --- DB setup (data/recipes.db) ---
const dataDir = path.resolve(__dirname, "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "recipes.db");

const db = new duckdb.Database(dbPath);
const con = db.connect();

// create table if missing
con.run(
  `CREATE TABLE IF NOT EXISTS favorites (
     id TEXT PRIMARY KEY,
     title TEXT NOT NULL,
     thumb TEXT,
     source TEXT,
     saved_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   )`
);

// helper to normalize TheMealDB objects
function mapMeal(m) {
  return {
    id: m.idMeal,
    title: m.strMeal,
    thumb: m.strMealThumb || "",
    source: m.strSource || m.strYoutube || "",
  };
}

// --- External proxy endpoints (READ) ---
app.get("/api/search", async (req, res) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) return res.json([]);
    const r = await fetch(`https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(q)}`);
    const j = await r.json();
    const items = Array.isArray(j.meals) ? j.meals.map(mapMeal) : [];
    res.json(items);
  } catch (e) {
    console.error("SEARCH error:", e);
    res.status(500).json({ error: "search failed" });
  }
});

app.get("/api/random", async (_req, res) => {
  try {
    const r = await fetch("https://www.themealdb.com/api/json/v1/1/random.php");
    const j = await r.json();
    const m = Array.isArray(j.meals) && j.meals[0] ? mapMeal(j.meals[0]) : null;
    res.json(m);
  } catch (e) {
    console.error("RANDOM error:", e);
    res.status(500).json({ error: "random failed" });
  }
});

// --- Favorites (CRUD) ---
app.get("/api/favorites", (_req, res) => {
  con.all("SELECT id, title, thumb, source, saved_at FROM favorites ORDER BY saved_at DESC", (err, rows) => {
    if (err) return res.status(500).json({ error: "read failed" });
    res.json(rows);
  });
});

// CREATE (with UPSERT to avoid duplicate PK errors)
app.post("/api/favorites", (req, res) => {
  const { id, title, thumb = "", source = "" } = req.body || {};
  if (!id || !title) return res.status(400).json({ error: "id and title required" });

  const sql = `
    INSERT INTO favorites (id, title, thumb, source)
    VALUES (?, ?, ?, ?)
    ON CONFLICT (id) DO UPDATE SET
      title = excluded.title,
      thumb  = excluded.thumb,
      source = excluded.source
  `;
  const stmt = con.prepare(sql);
  stmt.run(id, title, thumb, source, (err) => {
    if (err) {
      console.error("DB UPSERT error:", err);
      return res.status(500).json({ error: "save failed" });
    }
    res.json({ ok: true });
  });
  stmt.finalize();
});

// UPDATE (title only — simplest useful Update)
app.put("/api/favorites/:id", (req, res) => {
  const { title } = req.body || {};
  if (!title) return res.status(400).json({ error: "title required" });

  const stmt = con.prepare("UPDATE favorites SET title = ? WHERE id = ?");
  stmt.run(title, req.params.id, (err) => {
    if (err) {
      console.error("DB UPDATE error:", err);
      return res.status(500).json({ error: "update failed" });
    }
    res.json({ ok: true });
  });
  stmt.finalize();
});

// DELETE
app.delete("/api/favorites/:id", (req, res) => {
  const stmt = con.prepare("DELETE FROM favorites WHERE id = ?");
  stmt.run(req.params.id, (err) => {
    if (err) return res.status(500).json({ error: "delete failed" });
    res.json({ ok: true });
  });
  stmt.finalize();
});

// --- Start server ---
const PORT = 5000;
app.listen(PORT, () => {
  console.log(`# API on http://localhost:${PORT}`);
});
