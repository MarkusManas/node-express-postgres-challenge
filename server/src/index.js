require('dotenv').config();

// Express App Setup
const express = require('express');
const http = require('http');
const bodyParser = require('body-parser');
const cors = require('cors');
const uuid = require('uuid/v4');
// Config
const config = require('./config');

// Extras
const { validateParams, buildNewTaskQuery, buildUpdateTaskQuery, findPresentKeys } = require('./js/tasks');

// Initialization
const app = express();
app.use(cors());
app.use(bodyParser.json());

// Postgres client
const { Pool } = require('pg');
const pgClient = new Pool({
  user: config.pgUser,
  host: config.pgHost,
  database: config.pgDatabase,
  password: config.pgPassword,
  port: config.pgPort,
});
pgClient.on('error', () => console.log('Lost Postgres connection'));

// TODO: Create initial DB table called task
pgClient
  .query(
    `
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE TABLE IF NOT EXISTS tasks (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      title TEXT NOT NULL,
      details TEXT,
      completed BOOLEAN DEFAULT FALSE
    );
    `
  )
  .catch((err) => console.log(err));

// Express route handlers

// Get all to do list tasks
app.get('/api/v1/tasks', async (req, res) => {
  pgClient
    .query("SELECT * FROM tasks;")
    .then((result) => {
      res.status(200).json(result.rows);
    })
    .catch((err) => console.log(err)
  );
});

// Get a single todo task
app.get('/api/v1/tasks/:id', async (req, res) => {
  pgClient
    .query(`SELECT * FROM tasks WHERE id='${req.params.id}'::uuid;`)
    .then((result) => {
      res.status(200).json(result.rows[0]);
    })
    .catch((err) => console.log(err)
  );
});

// Create a todo task
app.post('/api/v1/tasks', async (req, res) => {
  
  let { errors, isValid } = validateParams(req.body);
  if(!isValid) {
    res.status(400).json(errors);
    return;  
  }
  
  let {isTitlePresent} = findPresentKeys(req.body);
  if( !isTitlePresent ) {
    errors.push("No title found in body parameters");
    res.status(400).json(errors);
    return;
  }

  pgClient
    .query( buildNewTaskQuery(req.body) )
    .then((result) => {
      res.status(200).send("success fully created task");
    })
    .catch((err) => console.log(err));
});

// Update a todo task
app.put('/api/v1/tasks/:id', async (req, res) => {
  
  let { errors, isValid } = validateParams(req.body);
  if(!isValid) {
    res.status(400).json(errors);
    return;  
  }

  pgClient
    .query( buildUpdateTaskQuery(req.body, req.params.id) )
    .then((result) => {
      res.status(200).send("Updated task.");
    })
    .catch((err) => console.log(err)
  );
});

// Delete a todo task route
app.delete('/api/v1/tasks/:id', async (req, res) => {
  pgClient
    .query(`DELETE FROM tasks WHERE id='${req.params.id}'::uuid;`)
    .then((result) => {
      res.status(200).send("Successfully deleted task.");
    })
    .catch((err) => console.log(err)
  );
});

// Server
const port = process.env.PORT || 3001;
const server = http.createServer(app);
server.listen(port, () => console.log(`Server running on port ${port}`));
