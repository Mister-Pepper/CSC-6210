import { useEffect, useState } from "react";

export default function App() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [randomItem, setRandomItem] = useState(null);
  const [favs, setFavs] = useState([]);
  const [loading, setLoading] = useState(false);

  async function search() {
    try {
      setLoading(true);
      const r = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (!r.ok) throw new Error(`Search failed: ${r.status}`);
      const data = await r.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function getRandom() {
    try {
      setLoading(true);
      const r = await fetch("/api/random");
      if (!r.ok) throw new Error(`Random failed: ${r.status}`);
      const data = await r.json();
      setRandomItem(data || null);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadFavs() {
    try {
      const r = await fetch("/api/favorites");
      if (!r.ok) throw new Error(`Favorites failed: ${r.status}`);
      const data = await r.json();
      setFavs(Array.isArray(data) ? data : []);
    } catch (e) {
      alert(e.message);
    }
  }

  async function save(item) {
    try {
      const payload = {
        id: item.id ?? item.idMeal ?? "",
        title: item.title ?? item.name ?? item.strMeal ?? "",
        thumb: item.thumb ?? item.image ?? item.strMealThumb ?? "",
        source: item.source ?? item.link ?? ""
      };
      const r = await fetch("/api/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) throw new Error(`Save failed: ${r.status}`);
      await loadFavs();
    } catch (e) {
      alert(e.message);
    }
  }

  async function remove(id) {
    try {
      const r = await fetch(`/api/favorites/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error(`Delete failed: ${r.status}`);
      await loadFavs();
    } catch (e) {
      alert(e.message);
    }
  }

  async function updateTitle(id, newTitle) {
    try {
      const r = await fetch(`/api/favorites/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle })
      });
      if (!r.ok) throw new Error(`Update failed: ${r.status}`);
      await loadFavs();
    } catch (e) {
      alert(e.message);
    }
  }

  useEffect(() => { loadFavs(); }, []);

  return (
    <div style={styles.page}>
      <div style={styles.wrap}>
        <h1 style={{ margin: 0 }}>Simple Recipe App</h1>
        <p style={{ opacity: 0.7, marginTop: 6 }}>
          Search or get a random recipe. Save favorites (DuckDB persists to file).
        </p>

        <div style={styles.row}>
          <input
            placeholder="Search recipes (e.g., chicken)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={styles.input}
          />
          <button onClick={search} style={styles.btn} disabled={loading || !q.trim()}>
            {loading ? "…" : "Search"}
          </button>
          <button onClick={getRandom} style={styles.btn} disabled={loading}>
            {loading ? "…" : "Random"}
          </button>
        </div>

        {randomItem && (
          <section style={styles.card}>
            <h3 style={{ marginTop: 0 }}>Random</h3>
            <RecipeCard item={randomItem} onSave={() => save(randomItem)} />
          </section>
        )}

        <h2 style={{ marginTop: 16 }}>Results</h2>
        <section style={styles.grid}>
          {results.map((it) => (
            <RecipeCard key={it.id ?? it.idMeal} item={it} onSave={() => save(it)} />
          ))}
          {!loading && results.length === 0 && (
            <div style={{ opacity: 0.7 }}>No results yet. Try a search.</div>
          )}
        </section>

        <h2 style={{ marginTop: 16 }}>Favorites</h2>
        <section style={styles.grid}>
          {favs.map((f) => {
            const title = f.title ?? f.name ?? f.strMeal ?? "(no title)";
            const thumb = f.thumb ?? f.image ?? f.strMealThumb ?? "";
            const link  = f.source ?? f.link ?? "";
            return (
              <div key={f.id} style={styles.card}>
                <strong style={{ display: "block", marginBottom: 6, color: "#111" }}>
                  {title}
                </strong>
                {thumb ? (
                  <img src={thumb} alt={title} style={styles.img} />
                ) : (
                  <div style={styles.imgPlaceholder}>No image</div>
                )}
                <div style={styles.row}>

                  <button style={styles.smallBtn} onClick={() => remove(f.id)}>
                    Remove
                  </button>

                  {/* Edit (PUT) */}
                  <button
                    style={styles.smallBtn}
                    onClick={async () => {
                      const newTitle = prompt("New title?");
                      if (!newTitle) return;
                      await updateTitle(f.id, newTitle);
                    }}
                  >
                    Edit
                  </button>

                  {link && (
                    <a href={link} target="_blank" rel="noreferrer" style={styles.linkBtn}>
                      Source
                    </a>
                  )}
                </div>
              </div>
            );
          })}
          {favs.length === 0 && <div style={{ opacity: 0.7 }}>No favorites saved.</div>}
        </section>
      </div>
    </div>
  );
}

function RecipeCard({ item, onSave }) {
  const title = item?.title ?? item?.name ?? item?.strMeal ?? "(no title)";
  const thumb = item?.thumb ?? item?.image ?? item?.strMealThumb ?? "";
  const link  = item?.source ?? item?.link ?? "";

  return (
    <div style={styles.card}>
      <strong style={{ display: "block", marginBottom: 6, color: "#111" }}>
        {title}
      </strong>

      {thumb ? (
        <img src={thumb} alt={title} style={styles.img} />
      ) : (
        <div style={styles.imgPlaceholder}>No image</div>
      )}

      <div style={styles.row}>
        <button style={styles.btn} onClick={onSave}>Save</button>
        {link && (
          <a href={link} target="_blank" rel="noreferrer" style={styles.linkBtn}>
            Source
          </a>
        )}
      </div>
    </div>
  );
}

const styles = {
  page: { minHeight: "100vh", background: "#f6f7fb", padding: 16, fontFamily: "system-ui, sans-serif" },
  wrap: { maxWidth: 900, margin: "0 auto", background: "#fff", padding: 20, borderRadius: 14, boxShadow: "0 8px 24px rgba(0,0,0,.06)" },
  row: { display: "flex", gap: 8, alignItems: "center", margin: "12px 0" },

  // Olive UI
  input: {
    flex: 1,
    padding: "12px 14px",
    border: "1px solid #8fa05f",
    borderRadius: 12,
    background: "#e6ecd1",
    color: "#1b1f10"
  },
  btn: {
    padding: "10px 14px",
    border: "1px solid #8fa05f",
    borderRadius: 12,
    background: "#b7c68b",
    color: "#1b1f10",
    cursor: "pointer"
  },
  smallBtn: {
    padding: "8px 12px",
    border: "1px solid #8fa05f",
    borderRadius: 10,
    background: "#b7c68b",
    color: "#1b1f10",
    cursor: "pointer"
  },
  linkBtn: {
    padding: "10px 12px",
    border: "1px solid #8fa05f",
    borderRadius: 12,
    background: "#e6ecd1",
    color: "#1b1f10",
    textDecoration: "none"
  },

  grid: { display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", marginTop: 10 },
  card: { border: "1px solid #eee", borderRadius: 12, padding: 12, background: "#fafbff" },
  img: { width: "100%", display: "block", borderRadius: 8 },
  imgPlaceholder: {
    width: "100%", height: 140, display: "grid", placeItems: "center",
    background: "#eaeef6", color: "#555", borderRadius: 8
  },
};
