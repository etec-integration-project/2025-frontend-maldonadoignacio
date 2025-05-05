# Full Stack Dockerized Project (Vue + Node.js + MongoDB)

## Table of Contents

- [About](#about)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [How to Install Vue CLI and Create the Frontend](#how-to-install-vue-cli-and-create-the-frontend)
- [Usage](#usage)
- [Environment Variables](#environment-variables)
- [API Endpoints](#api-endpoints)
- [Contributing](#contributing)
- [License](#license)

---

## About

This project is a full-stack web application with a **Vue.js frontend** and a **Node.js/Express backend** using **MongoDB** as the database. The entire stack is containerized using Docker and orchestrated with Docker Compose.

## Features

- User registration and login with hashed passwords
- RESTful API with Express
- Vue.js frontend for user interaction
- MongoDB database for data persistence
- Dockerized for easy deployment and development

## Project Structure

```
.
├── backend/
│   ├── Dockerfile
│   ├── server.js
│   ├── package.json
│   └── ...
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   ├── package.json
│   └── ...
└── backend/docker-compose.yml
```

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) (v20+ recommended)
- [Docker Compose](https://docs.docker.com/compose/) (v2+ recommended)
- [Node.js](https://nodejs.org/) (only if you want to run Vue CLI or backend locally)

## Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo/backend
   ```

2. **Build and start the containers:**
   ```bash
   docker compose up --build
   ```

3. **Access the application:**
   - **Frontend (local):** [http://localhost:8080](http://localhost:8080)
   - **Frontend (network):** [http://YOUR_IP:3001](http://YOUR_IP:3001)
   - **Backend API:** [http://localhost:4000](http://localhost:4000)

---

## How to Install Vue CLI and Create the Frontend

If you want to create or modify the frontend locally (outside Docker):

1. **Install Vue CLI globally (if you haven't already):**
   ```bash
   npm install -g @vue/cli
   ```

2. **Create a new Vue project (if you don't have one):**
   ```bash
   vue create frontend
   ```

   - Choose the features you need (Babel, Router, Linter, etc.)
   - This will create a `frontend` folder with all necessary files.

3. **Run the frontend locally:**
   ```bash
   cd frontend
   npm install
   npm run serve
   ```

   - By default, it will be available at [http://localhost:8080](http://localhost:8080)

---

## Usage

- To stop the containers:
  ```bash
  docker compose down
  ```
- To rebuild after code changes:
  ```bash
  docker compose up --build
  ```

---

## Environment Variables

The backend uses the following environment variables (set in `docker-compose.yml`):

- `NODE_ENV`: Application environment (default: production)
- `MONGODB_URI`: MongoDB connection string (default: `mongodb://mongodb:27017/proyecto`)

The frontend uses:

- `VUE_APP_API_URL`: URL for the backend API (default: `http://localhost:4000`)
- `HOST`: Host for the dev server (default: `0.0.0.0`)

---

## API Endpoints

- `POST /api/auth/register` — Register a new user
- `POST /api/auth/login` — Login with username and password

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Commit your changes (`git commit -am 'Add some fooBar'`)
4. Push to the branch (`git push origin feature/fooBar`)
5. Create a new Pull Request

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
