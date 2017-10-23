# onetwotrip-test-1

### Usage

#### docker-compose
You can run multiple workers and single instance of redis using docker-compose:
 1. From source folder build worker image: docker build -f Dockerfile -t onetwotrip-test-1-worker:latest .
 2. Run docker-compose up --scale worker=3 -d redis worker
 3. You can see workers logs: docker-compose logs worker
 4. To see errors run docker-compose up worker-get-errors and to requeue lost processing messages docker-compose up worker-requeue
 5. Stop all services: docker-compose down

#### locally