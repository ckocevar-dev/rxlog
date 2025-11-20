# Makefile

.PHONY: up down restart logs ps rebuild clean register gateway print-env

COMPOSE ?= docker compose

# --- DB defaults ---
DB_HOST ?= localhost
DB_PORT ?= 5432
DB_NAME ?= rxlog
DB_USER ?= postgres
DB_PASSWORD ?= postgres

# --- Gateway / service endpoints ---
SERVER_PORT ?= 8080
REGISTER_URL ?= http://localhost:8081
BARCODES_URL ?= http://localhost:8081

# ---- Docker Compose helpers ----
up:            #
	$(COMPOSE) up --build -d

down:          #
	$(COMPOSE) down -v

restart:       #
	$(MAKE) down
	$(MAKE) up

logs:          #
	$(COMPOSE) logs -f --tail=120

ps:            #
	$(COMPOSE) ps

rebuild:       #
	$(COMPOSE) build --no-cache
	$(MAKE) up

clean:         #
	$(COMPOSE) down -v
	docker image prune -f
	docker volume prune -f

# ---- Run services locally (without Compose) ----
register:      #
	SERVER_PORT=8081 \
	SPRING_DATASOURCE_URL=jdbc:postgresql://$(DB_HOST):$(DB_PORT)/$(DB_NAME) \
	SPRING_DATASOURCE_USERNAME=$(DB_USER) \
	SPRING_DATASOURCE_PASSWORD=$(DB_PASSWORD) \
	./gradlew :services:register-java-spring:bootRun -x test

gateway:       #
	SERVER_PORT=$(SERVER_PORT) REGISTER_URL=$(REGISTER_URL) BARCODES_URL=$(BARCODES_URL) \
	./gradlew :gateway-java-spring:bootRun -x test

print-env:     #
	@echo "DB URL = jdbc:postgresql://$(DB_HOST):$(DB_PORT)/$(DB_NAME)"
	@echo "DB USER= $(DB_USER)   PASS=$(DB_PASSWORD)"
	@echo "Gateway=$(SERVER_PORT)  Register=$(REGISTER_URL)  Barcodes=$(BARCODES_URL)"