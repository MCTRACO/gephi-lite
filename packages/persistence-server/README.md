# Gephi-lite Persistence Server

A minimal Express server that persists Gephi-lite state (graphs, filters, appearance, preferences, session, layout, file, user) to JSON files.

- Base URL: http://localhost:4000
- Data directory: ./packages/persistence-server/data (overridable via PERSIST_DATA_DIR)

Endpoints:
- GET /api/state?userId=<id>
- POST /api/state?userId=<id>
- PATCH /api/state?userId=<id>
- GET/POST /api/{dataset|filters|appearance|layout|file|preferences|session|user}?userId=<id>

Dev usage:
- npm run start (root) to start the frontend at http://localhost:5173
- npm run start:persist (root) to start the backend at http://localhost:4000
- Or docker-compose up to start both