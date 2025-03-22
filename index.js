const express = require("express");
const cors = require("cors");
const userRoute = require("./routes/user");
const vehicleRoute = require("./routes/vehicle");
const dashboardRoute = require("./routes/dashboard");

const app = express();

app.use(cors());

app.use(
  express.urlencoded({
    extended: true,
    limit: "200mb",
  })
);

app.use(express.json());

app.use("/user", userRoute);
app.use("/vehicle", vehicleRoute);

app.use("/dashboard", dashboardRoute);

module.exports = app;
