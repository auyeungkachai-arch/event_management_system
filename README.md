# express-backend

Starter template for **Assignment 1** — a Node.js/Express backend with MongoDB integration and EJS templating.

## Overview

This project provides a minimal Express.js application scaffold to get you started on Assignment 1. It includes:

- **Express** — web server framework
- **EJS** — server-side templating engine
- **MongoDB** — database connectivity via the official `mongodb` driver
- **Morgan** — HTTP request logger
- **Cookie-parser** — middleware for parsing cookies

## Project Structure

```
express-backend/
├── backend/
│   ├── bin/
│   │   └── www              # Server entry point (starts the Express app on a port)
│   ├── public/
│   │   └── stylesheets/
│   │       └── style.css    # Global stylesheet
│   ├── routes/
│   │   ├── index.js         # Routes for the home page (/)
│   │   └── users.js         # Routes for /users (placeholder)
│   ├── views/
│   │   ├── index.ejs        # Home page template
│   │   └── error.ejs        # Error page template
│   ├── utils/
│   │   └── db.js            # MongoDB connection helper
│   ├── app.js               # Express app configuration
│   └── package.json         # Dependencies and scripts
├── .github/workflows/
│   └── test-report.yml      # CI workflow: unit tests, HTTP tests, E2E tests
├── .gitignore
└── README.md                # This file
```

## Prerequisites

- **Node.js** (v22 or above)
- **npm** (comes with Node.js)
- **MongoDB** — reuse the MongoDB connection string from previous lab sessions (it's already configured in `backend/utils/db.js`)

## Setup

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure MongoDB

The MongoDB connection string from previous lab sessions is already configured in `backend/utils/db.js`. If you need to update it, edit the `MONGODB_URI` value there:

```js
process.env.MONGODB_URI = '<your_mongodb_uri>';
```

If the environment variable is not set, it defaults to `mongodb://localhost:27017`.

### 3. Start the server

```bash
cd backend
npm start
```

The server listens on `PORT` (defaults to **3000**) and is started via `bin/www`.

## Available Routes

| Method | Path      | Description          |
|--------|-----------|----------------------|
| GET    | `/`       | Home page            |
| GET    | `/users`  | Users resource (placeholder) |

## Development Tasks

As you work through Assignment 1, you will likely need to:

1. **Add new routes** — create new route handlers in `backend/routes/` and register them in `backend/app.js`.
2. **Create new views** — add `.ejs` files in `backend/views/` and render them with `res.render()`.
3. **Connect to MongoDB** — use `backend/utils/db.js` (`connectToDB()`) to get a database handle, then perform CRUD operations on your collections.
4. **Add static assets** — place CSS, JS, and images in `backend/public/`.

## Useful Commands

| Command               | Description                          |
|-----------------------|--------------------------------------|
| `npm start`           | Start the server                     |
| `npm install`         | Install dependencies                 |
| `node bin/www`        | Start the server directly            |

## Troubleshooting

- **Port already in use**: Another process is using port 3000. Either stop that process or set a different `PORT` environment variable (e.g., `PORT=4000 npm start`).
- **MongoDB connection failed**: Ensure your MongoDB connection string in `backend/utils/db.js` is correct (reused from previous lab sessions). If using MongoDB Atlas, check your firewall/access rules.
- **Missing dependencies**: Run `cd backend && npm install` to install all packages listed in `backend/package.json`.

## License

This template is provided for use in COMP3047 Assignment 1.
