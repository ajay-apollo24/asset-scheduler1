#!/bin/bash

set -e

PROJECT_ROOT="."
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

echo "Creating project directories..."
mkdir -p "$BACKEND_DIR"/{config,controllers,models,routes,middleware,utils}
mkdir -p "$FRONTEND_DIR"/src/{api,components,contexts,pages,routes,styles}
mkdir -p "$FRONTEND_DIR/public"

echo "Initializing backend..."
cd "$BACKEND_DIR"
npm init -y > /dev/null
npm install express cors dotenv body-parser jsonwebtoken bcrypt pg > /dev/null

cat <<EOF > server.js
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
});
EOF

cat <<EOF > config/db.js
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
module.exports = pool;
EOF

touch .env
echo "PORT=5000" >> .env
echo "DATABASE_URL=postgresql://user:pass@localhost:5432/yourdb" >> .env

cd ../../

echo "Initializing frontend..."
npx create-react-app "$FRONTEND_DIR" --template cra-template > /dev/null
cd "$FRONTEND_DIR"

echo "Installing frontend dependencies..."
npm install axios react-router-dom > /dev/null
npm install -D tailwindcss postcss autoprefixer > /dev/null
npx tailwindcss init -p > /dev/null

echo "Configuring Tailwind..."
cat <<EOF > tailwind.config.js
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
EOF

cat <<EOF > src/styles/globals.css
@tailwind base;
@tailwind components;
@tailwind utilities;
EOF

echo "Setting up frontend entry..."
cat <<EOF > src/index.js
import React from 'react';
import ReactDOM from 'react-dom';
import './styles/globals.css';
import App from './App';

ReactDOM.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
EOF

cat <<EOF > src/App.js
function App() {
  return (
    <div className="p-4 text-xl font-semibold">
      Asset Scheduler Frontend
    </div>
  );
}
export default App;
EOF

echo "✅ Project initialized at $PROJECT_ROOT"
