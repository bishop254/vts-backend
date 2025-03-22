const express = require("express");
const connection = require("../connection");
const auth = require("../services/auth");
const axios = require("axios");
require("dotenv").config();

const router = express.Router();

router.post("/add", auth.authenticate, (req, res) => {
  const {
    license_number,
    owner_name,
    owner_phone,
    owner_email,
    vehicle_type,
    manufacturer,
    model,
    year,
    color,
    registration_date,
    insurance_status,
    fuel_type,
    mileage,
    engine_number,
    chassis_number,
    status,
    last_service_date,
  } = req.body;

  if (!license_number || !owner_name || !vehicle_type) {
    return res.status(400).json({
      message: "License number, owner name, and vehicle type are required.",
    });
  }

  const query = `
    INSERT INTO vehicles 
      (license_number, owner_name, owner_phone, owner_email, vehicle_type, manufacturer, model, year, color, 
      registration_date, insurance_status, fuel_type, mileage, engine_number, chassis_number, status, last_service_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    license_number,
    owner_name,
    owner_phone || null,
    owner_email || null,
    vehicle_type,
    manufacturer || null,
    model || null,
    year || null,
    color || null,
    registration_date || null,
    insurance_status || null,
    fuel_type || null,
    mileage || null,
    engine_number || null,
    chassis_number || null,
    status || "active",
    last_service_date || null,
  ];

  connection.query(query, values, (err, results) => {
    if (err) {
      console.error("Error adding vehicle:", err);
      return res.status(500).json({ message: "Database error", error: err });
    }
    return res.status(201).json({
      message: "Vehicle added successfully",
      vehicleId: results.insertId,
    });
  });
});

router.get("/get", (req, res, next) => {
  const limit = parseInt(req.query.limit) || 50;
  const cursor = req.query.cursor ? parseInt(req.query.cursor) : null;

  let query = `
    SELECT * FROM vehicles 
    ${cursor ? "WHERE id < ?" : ""}
    ORDER BY id DESC 
    LIMIT ?;
  `;

  let queryParams = cursor ? [cursor, limit] : [limit];

  connection.query(query, queryParams, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err });
    }

    if (results.length === 0) {
      return res
        .status(200)
        .json({ data: [], nextCursor: null, totalRecords: 0 });
    }

    connection.query(
      "SELECT COUNT(*) AS total FROM vehicles",
      (countErr, countResult) => {
        if (countErr) {
          return res
            .status(500)
            .json({ error: "Count fetch error", details: countErr });
        }

        const totalRecords = countResult[0].total;
        const nextCursor =
          results.length === limit ? results[results.length - 1].id : null;

        return res
          .status(200)
          .json({ data: results, nextCursor, totalRecords });
      }
    );
  });
});

router.post("/update", auth.authenticate, (req, res, next) => {
  let vehicle = req.body;

  let query = `
    UPDATE vehicles 
    SET owner_name=?, owner_phone=?, owner_email=?, vehicle_type=?, 
        manufacturer=?, model=?, year=?, color=?, registration_date=?, 
        insurance_status=?, fuel_type=?, mileage=?, engine_number=?, 
        chassis_number=?, status=?, last_service_date=? 
    WHERE id=?;
  `;

  connection.query(
    query,
    [
      vehicle.owner_name,
      vehicle.owner_phone,
      vehicle.owner_email,
      vehicle.vehicle_type,
      vehicle.manufacturer,
      vehicle.model,
      vehicle.year,
      vehicle.color,
      vehicle.registration_date,
      vehicle.insurance_status,
      vehicle.fuel_type,
      vehicle.mileage,
      vehicle.engine_number,
      vehicle.chassis_number,
      vehicle.status,
      vehicle.last_service_date,
      vehicle.id,
    ],
    (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Database error", details: err });
      }

      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Vehicle ID not found" });
      }

      return res.status(200).json({ message: "Vehicle updated successfully" });
    }
  );
});

router.post("/delete", auth.authenticate, (req, res, next) => {
  const { id } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Vehicle ID is required" });
  }

  let query = "DELETE FROM vehicles WHERE id = ?";

  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error", details: err });
    }

    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Vehicle ID not found" });
    }

    return res.status(200).json({ message: "Vehicle deleted successfully" });
  });
});

router.post("/locations", auth.authenticate, async (req, res) => {
  try {
    const { vehicle1, vehicle2 } = req.body;

    if (!vehicle1 || !vehicle2) {
      return res
        .status(400)
        .json({ message: "Both vehicle license numbers are required" });
    }

    const query = `SELECT id FROM vehicles WHERE license_number IN (?, ?)`;
    const [vehicles] = await connection
      .promise()
      .query(query, [vehicle1, vehicle2]);

    if (vehicles.length < 2) {
      return res
        .status(404)
        .json({ message: "One or both vehicles not found" });
    }

    const vehicleIds = vehicles.map((v) => v.id);

    if (vehicleIds.length !== 2) {
      return res
        .status(400)
        .json({ message: "Exactly two vehicle IDs are required." });
    }

    const placeholders = vehicleIds.map(() => "?").join(", ");
    const locationQuery = `
      SELECT l.vehicle_id, l.latitude, l.longitude, l.last_seen_time
      FROM location_updates l
      INNER JOIN (
          SELECT vehicle_id, MAX(id) AS latest_id
          FROM location_updates
          WHERE vehicle_id IN (${placeholders})
          GROUP BY vehicle_id
      ) latest ON l.vehicle_id = latest.vehicle_id AND l.id = latest.latest_id;
    `;

    const [locations] = await connection
      .promise()
      .query(locationQuery, vehicleIds);

    if (locations.length < 2) {
      return res.status(404).json({
        message: "No recent location updates for one or both vehicles",
      });
    }

    const googleMapsApiKey = process.env.API_KEY;
    const googleApiUrl =
      "https://routes.googleapis.com/directions/v2:computeRoutes";

    const origin = {
      location: {
        latLng: {
          latitude: parseFloat(locations[0].latitude),
          longitude: parseFloat(locations[0].longitude),
        },
      },
    };

    const destination = {
      location: {
        latLng: {
          latitude: parseFloat(locations[1].latitude),
          longitude: parseFloat(locations[1].longitude),
        },
      },
    };

    const googleResponse = await axios.post(
      googleApiUrl,
      {
        origin,
        destination,
        travelMode: "DRIVE",
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": googleMapsApiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs",
        },
      }
    );

    return res.json({
      vehicle1: locations[0],
      vehicle2: locations[1],
      googleDirections: googleResponse.data,
    });
  } catch (error) {
    console.error("Error fetching vehicle locations:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

router.get("/search", auth.authenticate, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Query required" });

    const vehicleQuery = `SELECT id, license_number FROM vehicles WHERE license_number LIKE ? LIMIT 5`;
    const [vehicles] = await connection
      .promise()
      .query(vehicleQuery, [`%${query}%`]);

    res.json(vehicles);
  } catch (error) {
    console.error("Error fetching vehicles:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = router;
