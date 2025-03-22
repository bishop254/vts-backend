# Vehicle Tracking System

This is a Vehicle Tracking System built with Express.js for the backend and Next.js for the frontend. It allows users to register vehicles, track their locations, and visualize movement using charts.

## Features
- JWT authentication (register, login, logout)
- CRUD operations for users and vehicles
- Location tracking and periodic GPS updates
- Distance calculation using Google Maps API
- Efficient pagination for large datasets
- Data visualization using charts

---

## Backend (Express.js)

### Requirements
- **Node.js** v22.12.0
- **npm** v10.9.0
- **MySQL Database**
- **.env** file with API keys and database configurations

### Setup Instructions

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd backend```

2. **Install Dependencies:**
    ```sh
    npm install
    npm install -g nodemon
    ```
    
3. **Configure environment variables:**
    ```sh
    Ensure MySql DB configrations are correct and also add in your GOOGLE_MAPS_API_KEY under API_KEY in the .env file
    ```
    
4. **Set up the database tables:**
    ```sh
    node DB/tables.js
    ```
    
5. **Seed the database with test data:**
    ```sh
    node DB/seed.js
    ```
6. **Start the backend server:**
    ```sh
    npm run start
    ```
  

