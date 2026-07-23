# CivicEvents+ API

This repository contains the **backend API** for the CivicEvents+ Project  — a Node.js + Express application powered by PostgreSQL.  
It provides endpoints for managing **events, promos, registrations, and notifications**, with full CRUD and authentication support.


## Features

- User authentication and authorization (JWT-based)
- Event registration and listing
- Promo creation, publishing, and unpublishing
- Notifications for promo publication
- PostgreSQL for persistent data storage
- Image, audio and video upload
- RESTful API ready for frontend or Postman testing


## Prerequisites

Before setting up, make sure you have the following installed:

| Tool | Description | Download Link |
|------|--------------|----------------|
| **Node.js (v18+)** | JavaScript runtime for the backend | [https://nodejs.org/](https://nodejs.org/) |
| **PostgreSQL (v15+)** | Database engine | [https://www.postgresql.org/download/](https://www.postgresql.org/download/) |
| **pgAdmin (optional)** | GUI client for PostgreSQL | [https://www.pgadmin.org/download/](https://www.pgadmin.org/download/) |
| **Postman** | API testing tool | [https://www.postman.com/downloads/](https://www.postman.com/downloads/) |

---

## 1. PostgreSQL Installation & Database Setup
- Download and install PostgreSQL from the official website: `https://www.postgresql.org/download/`

- During installation, note the following:

    - PostgreSQL username (default: postgres)

    - Password (you create this during installation)

    - Port (default: 5432)

- Create the Database
    - After installing PostgreSQL, create the project database: `CREATE DATABASE civic-events-db;`. You can run this in the PostgreSQL terminal (psql) or in pgAdmin.

## 2. Clone the Project
- Open the terminal (Git Bash) in VSCode and complete the tasks below
    - Clone the repository from GitHub classrooms: `git clone <repository-url>`

    - Navigate to the backend directory: `cd backend`

## 3. Postman Installation & Collection Setup
- Install Postman: https://www.postman.com/downloads/

- Create a new Postman collection
    - Import the file `CivicEvents+ API.postman_collection.json` located in the backend directory into postman

## 4. Populate Database With Tables
- Open the terminal (Git Bash) in VSCode and complete the tasks below
    - Paste the below variables in the terminal and run. Replace these with actual db credentials
    ```
    export DB_USER=<db-user>
    export DB_PASSWORD=<db-password>
    export DB_NAME=civic-events-db
    export DB_HOST=<db_host>
    export DB_PORT=<db_port>
    ```

- Run the command `psql -U $DB_USER -d $DB_NAME -h $DB_HOST -p $DB_PORT -f ./migrations/001_create_tables.sql` to create the necessary tables in your database

- Configure the Environment Variables: Change the values in the `.env` file with the approapriate database credentials

## 5. Install Node Dependencies
- To install dependencies, run the command `npm install`

## 6. Start the Server
- To run the project in development mode, run the command `npm run dev`

- The server will run at: `http://localhost:4000`

- You should see a console output similar to the message below, which confirms that the server has started successfully and the database connection is working:
```
CivicEvents+ backend is running on port 4000  
Successfully connected to PostgreSQL
```
