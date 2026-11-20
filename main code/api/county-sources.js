const fs = require("fs");
const path = require("path");

module.exports = (req, res) => {
  try {
    const filePath = path.join(__dirname, "..", "data", "county-sources.json");
    const body = fs.readFileSync(filePath, "utf8");
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate");
    res.status(200).end(body);
  } catch (error) {
    console.error("county-sources API error:", error);
    res.status(500).json({
      error: "County permit sources are temporarily unavailable."
    });
  }
};