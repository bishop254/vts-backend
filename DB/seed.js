const mysql = require("mysql2");
require("dotenv").config();
const { faker } = require("@faker-js/faker");

const db = mysql.createConnection({
  port: process.env.DB_PORT,
  host: process.env.DB_HOST,
  user: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to MySQL");
});

const getRandomGPS = () => ({
  latitude: (Math.random() * (-0.3 - (-1.3)) + (-1.3)).toFixed(6),
  longitude: (Math.random() * (37.0 - 36.0) + 36.0).toFixed(6),
});

const getRandomDateInRange = () => {
  const now = new Date();
  const rand = Math.random();
  if (rand < 0.3) {
    now.setDate(now.getDate() - faker.number.int({ min: 1, max: 7 }));
  } else if (rand < 0.7) {
    now.setDate(now.getDate() - faker.number.int({ min: 8, max: 30 }));
  } else {
    now.setDate(now.getDate() - faker.number.int({ min: 31, max: 90 }));
  }
  return now.toISOString().split("T")[0];
};

const generateVehicles = async () => {
  console.log("Generating 1000 vehicle records...");

  const manufacturers = ["Toyota", "Honda", "Ford", "Nissan", "BMW"];
  const models = ["Corolla", "Civic", "Focus", "Altima", "X5"];
  const colors = ["Red", "Blue", "White", "Black", "Grey"];
  const vehicleTypes = ["Sedan", "SUV", "Truck", "Motorcycle"];
  const fuelTypes = ["Petrol", "Diesel", "Electric"];

  for (let i = 1; i <= 1000; i++) {
    const licenseNumber = `KBA ${faker.number.int({ min: 100, max: 999 })}${faker.string.alpha().toUpperCase()}`;
    const ownerName = faker.person.fullName();
    const ownerPhone = faker.phone.number("07########");
    const ownerEmail = faker.internet.email();
    const vehicleType = faker.helpers.arrayElement(vehicleTypes);
    const manufacturer = faker.helpers.arrayElement(manufacturers);
    const model = faker.helpers.arrayElement(models);
    const year = faker.number.int({ min: 2000, max: 2024 });
    const color = faker.helpers.arrayElement(colors);
    const registrationDate = getRandomDateInRange();
    const insuranceStatus = faker.helpers.arrayElement(["Active", "Expired"]);
    const fuelType = faker.helpers.arrayElement(fuelTypes);
    const mileage = faker.number.int({ min: 10000, max: 200000 });
    const engineNumber = `ENG${faker.number.int({ min: 190, max: 202400 })}`;
    const chassisNumber = `CHAS${faker.number.int({ min: 9000, max: 20000024 })}`;
    const status = "active";
    const lastServiceDate = faker.date.past({ years: 2 }).toISOString().split("T")[0];

    const vehicleQuery = `
      INSERT IGNORE INTO vehicles 
      (license_number, owner_name, owner_phone, owner_email, vehicle_type, manufacturer, model, year, color, 
      registration_date, insurance_status, fuel_type, mileage, engine_number, chassis_number, status, last_service_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const vehicleValues = [
      licenseNumber, ownerName, ownerPhone, ownerEmail, vehicleType, manufacturer, model, year, color,
      registrationDate, insuranceStatus, fuelType, mileage, engineNumber, chassisNumber, status, lastServiceDate,
    ];

    let vehicleId;

    try {
      const result = await new Promise((resolve, reject) => {
        db.query(vehicleQuery, vehicleValues, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      if (result.insertId) {
        vehicleId = result.insertId;
      } else {
        const existingVehicleQuery = `SELECT id FROM vehicles WHERE license_number = ?`;
        const existingVehicleResult = await new Promise((resolve, reject) => {
          db.query(existingVehicleQuery, [licenseNumber], (err, results) => {
            if (err) reject(err);
            else resolve(results);
          });
        });

        if (existingVehicleResult.length > 0) {
          vehicleId = existingVehicleResult[0].id;
        } else {
          continue;
        }
      }

      for (let j = 0; j < faker.number.int({ min: 5, max: 20 }); j++) {
        const { latitude, longitude } = getRandomGPS();
        const speed = faker.number.int({ min: 0, max: 120 });
        const lastSeenTime = getRandomDateInRange();

        const locationQuery = `
          INSERT INTO location_updates (vehicle_id, latitude, longitude, speed, last_seen_time) 
          VALUES (?, ?, ?, ?, ?)
        `;

        const locationValues = [vehicleId, latitude, longitude, speed, lastSeenTime];

        try {
          await new Promise((resolve, reject) => {
            db.query(locationQuery, locationValues, (err) => {
              if (err) reject(err);
              else resolve();
            });
          });
        } catch (err) {
          if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            console.error(`Skipping location update: Vehicle ID ${vehicleId} not found in vehicles table.`);
          } else {
            console.error("Error inserting location update:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error inserting vehicle:", err);
    }

    if (i % 100 === 0) console.log(`Inserted ${i} records...`);
  }

  console.log("Data generation completed.");
  db.end();
};

generateVehicles().catch((err) => {
  console.error("Error generating data:", err);
  db.end();
});