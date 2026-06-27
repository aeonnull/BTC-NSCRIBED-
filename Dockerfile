# --- Stage 1: build the React frontend ---
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/yarn.lock ./
RUN yarn install --network-timeout 600000
COPY frontend/ ./
ENV CI=false
ENV GENERATE_SOURCEMAP=false
ENV DISABLE_ESLINT_PLUGIN=true
ENV NODE_OPTIONS=--max-old-space-size=1024
RUN yarn build

# --- Stage 2: Python backend that also serves the built frontend ---
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/
COPY --from=frontend /app/frontend/build ./frontend/build

ENV PYTHONUNBUFFERED=1
EXPOSE 8001
# Railway provides $PORT at runtime; default to 8001 locally.
CMD ["sh", "-c", "cd backend && uvicorn server:app --host 0.0.0.0 --port ${PORT:-8001}"]
