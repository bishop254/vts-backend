const express = require("express");
const connection = require("../connection");
const auth = require("../services/auth");

const haversine = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const toRad = (angle) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const router = express.Router();

router.get("/total-distance", auth.authenticate, async (req, res) => {
  try {
    const { timeRange } = req.query;
    const referenceDate = new Date(Date.now());

    let daysToSubtract = 90;

    if (timeRange === "30d") {
      daysToSubtract = 30;
    } else if (timeRange === "7d") {
      daysToSubtract = 7;
    }

    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    const formatDateForMySQL = (date) => {
      return date.toISOString().slice(0, 19).replace("T", " ");
    };

    const startDateStr = formatDateForMySQL(startDate);

    const [vehicles] = await connection
      .promise()
      .query("SELECT id, license_number FROM vehicles");

    const result = [];

    for (let vehicle of vehicles) {
      const [locations] = await connection.promise().query(
        `SELECT latitude, longitude, last_seen_time FROM location_updates 
         WHERE vehicle_id = ? AND last_seen_time >= ? 
         ORDER BY last_seen_time ASC`,
        [vehicle.id, startDateStr]
      );

      let totalDistance = 0;
      for (let i = 1; i < locations.length; i++) {
        totalDistance += haversine(
          locations[i - 1].latitude,
          locations[i - 1].longitude,
          locations[i].latitude,
          locations[i].longitude
        );
      }

      result.push({
        vehicle: vehicle.license_number,
        total_distance: parseFloat(totalDistance.toFixed(2)),
      });
    }

    res.json(result);
  } catch (error) {
    console.error("Error fetching total distances:", error);
    res.status(500).json({ message: "Database error", error: error });
  }
});

router.get("/top-vehicles", auth.authenticate, async (req, res) => {
  try {
    const [vehicles] = await connection
      .promise()
      .query(
        "SELECT id, license_number,owner_name,vehicle_type, manufacturer   FROM vehicles"
      );

    let results = [];

    for (let vehicle of vehicles) {
      const [locations] = await connection
        .promise()
        .query(
          "SELECT latitude, longitude FROM location_updates WHERE vehicle_id = ? ORDER BY last_seen_time ASC",
          [vehicle.id]
        );

      let totalDistance = 0;
      for (let i = 1; i < locations.length; i++) {
        totalDistance += haversine(
          locations[i - 1].latitude,
          locations[i - 1].longitude,
          locations[i].latitude,
          locations[i].longitude
        );
      }

      results.push({
        vehicle: vehicle.license_number,
        owner: vehicle.owner_name,
        manufacturer: vehicle.manufacturer,
        type: vehicle.vehicle_type,
        total_distance: parseFloat(totalDistance.toFixed(2)),
      });
    }

    results.sort((a, b) => b.total_distance - a.total_distance);
    results = results.slice(0, 10);

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: "Database error", error: error });
  }
});

module.exports = router;
