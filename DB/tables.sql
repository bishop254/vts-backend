CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(250),
    phone VARCHAR(20),
    email VARCHAR(50) UNIQUE,
    password VARCHAR(250),
    status VARCHAR(20),
    role VARCHAR(20)
);

INSERT IGNORE INTO users (name, phone, email, password, status, role)
VALUES ('Admin', '0722613777', 'admin@admin.com', 'admin', 'true', 'admin');

CREATE TABLE IF NOT EXISTS vehicles (
    id INT PRIMARY KEY AUTO_INCREMENT,
    license_number VARCHAR(50) UNIQUE NOT NULL,
    owner_name VARCHAR(250) NOT NULL,
    owner_phone VARCHAR(50),
    owner_email VARCHAR(50),
    vehicle_type VARCHAR(50) NOT NULL,
    manufacturer VARCHAR(100),
    model VARCHAR(100),
    year INT,
    color VARCHAR(50),
    registration_date DATE,
    insurance_status VARCHAR(50),
    fuel_type VARCHAR(50),
    mileage INT,
    engine_number VARCHAR(100),
    chassis_number VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    last_service_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS location_updates (
    id INT PRIMARY KEY AUTO_INCREMENT,
    vehicle_id INT NOT NULL,
    latitude DECIMAL(10, 6) NOT NULL,
    longitude DECIMAL(10, 6) NOT NULL,
    speed INT DEFAULT 0,
    last_seen_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vehicle_id) REFERENCES vehicles (id) ON DELETE CASCADE
);

INSERT IGNORE INTO vehicles (
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
    last_service_date
)
VALUES (
    'KBA 123A',
    'John Doe',
    '0722001122',
    'john@example.com',
    'Sedan',
    'Toyota',
    'Corolla',
    2021,
    'White',
    '2021-05-10',
    'Active',
    'Petrol',
    30000,
    'ENG12345678',
    'CHAS12345678',
    'active',
    '2023-08-15'
);
