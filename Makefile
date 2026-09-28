.PHONY: build run test vet lint docker up down clean

BIN := tableforge
PKG := ./...

build:
	go build -o bin/$(BIN) ./cmd/server

run: build
	./bin/$(BIN) -config config/config.yaml

test:
	go test ./... -v -race -coverprofile=coverage.out
	go tool cover -func=coverage.out | tail -n 20

vet:
	go vet ./...

lint:
	golangci-lint run ./... || true

docker:
	docker build -t tableforge:latest .

# Full stack: builds the SPA inside Docker, Go serves it at /app.
# Open http://localhost:8080/app/login (login: postgres / postgres).
up:
	docker compose up --build -d
	docker compose ps

down:
	docker compose down

logs:
	docker compose logs -f app

clean:
	rm -rf bin/ coverage.out /tmp/tableforge

# Integration against ephemeral PG (requires Docker)
integration:
	docker compose -f docker-compose.test.yml up --abort-on-container-exit --exit-code-from tests

# Generate mocks / update deps
tidy:
	go mod tidy
