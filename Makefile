DC=docker compose
DCW=$(DC) exec -T worker
PACKAGE_MANAGER := $(shell command -v pnpm >/dev/null 2>&1 && echo pnpm || echo npm)
IMAGE=EDIT_ME:$(TAG)

.env:
	sed -e "s/{DEV_UID}/$(shell if [ "$(shell uname)" = "Linux" ]; then echo $(shell id -u); else echo '1001'; fi)/g" \
		-e "s/{DEV_GID}/$(shell if [ "$(shell uname)" = "Linux" ]; then echo $(shell id -g); else echo '1001'; fi)/g" \
		.env.dist > .env;

init-dev: install start

init-dev-docker: docker-up-force install-docker start-docker

# Build
build: .env
	docker buildx build --platform=linux/amd64 -f Dockerfile -t $(IMAGE) --pull --push .

docker-up-force: .env
	$(DC) pull --ignore-pull-failures
	$(DC) up -d --force-recreate --remove-orphans

docker-down-clean: .env
	$(DC) down -v

install:
	$(PACKAGE_MANAGER) install

update:
	$(PACKAGE_MANAGER) update

outdated:
	$(PACKAGE_MANAGER) outdated

start: .env
	set -a; . ./.env; TENANT_ID=$${TENANT_ID:-local}; set +a; \
	APP_ENV=debug \
	$(PACKAGE_MANAGER) run start

lint:
	$(PACKAGE_MANAGER) run lint

unit:
	$(PACKAGE_MANAGER) run test

install-docker:
	$(DCW) pnpm install

update-docker:
	$(DCW) pnpm update

outdated-docker:
	$(DCW) pnpm outdated

start-docker:
	$(DCW) pnpm run start

lint-docker:
	$(DCW) pnpm run lint

unit-docker:
	$(DCW) pnpm run test

fasttest: lint unit

fasttest-docker: lint-docker unit-docker

test: fasttest

test-docker: docker-up-force install-docker fasttest-docker docker-down-clean
