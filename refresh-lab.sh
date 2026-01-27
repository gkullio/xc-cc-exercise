#!/usr/bin/env bash
set -e

echo "Pulling latest lab container images..."
docker compose -f docker-compose.lab.yml pull

echo "Stopping lab containers..."
docker compose -f docker-compose.lab.yml down

echo "Starting lab containers..."
docker compose -f docker-compose.lab.yml up -d

echo "Lab containers refreshed."
