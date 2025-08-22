.PHONY: help install install-dev lint format test clean setup-pre-commit lint-markdown

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install production dependencies
	pip install -e .

install-dev: ## Install development dependencies
	pip install -e ".[dev]"
	@echo "Installing Node.js dependencies for markdown linting..."
	npm install

setup-pre-commit: ## Set up pre-commit hooks
	pre-commit install

lint: ## Run all linting checks
	@echo "Running Black (code formatting check)..."
	black --check --diff src/
	@echo "Running isort (import sorting check)..."
	isort --check-only --diff src/
	@echo "Running flake8 (style and error checking)..."
	flake8 src/
	@echo "Running mypy (type checking)..."
	mypy src/
	@echo "Running markdownlint (markdown linting)..."
	npm run lint:markdown
	@echo "✅ All linting checks passed!"

lint-markdown: ## Run markdown linting only
	@echo "Running markdownlint (markdown linting)..."
	npm run lint:markdown

format: ## Format code with Black and isort
	@echo "Formatting code with Black..."
	black src/
	@echo "Sorting imports with isort..."
	isort src/
	@echo "✅ Code formatting complete!"

clean: ## Clean up Python cache files
	find . -type f -name "*.pyc" -delete
	find . -type d -name "__pycache__" -delete
	find . -type d -name "*.egg-info" -exec rm -rf {} +
	find . -type d -name ".pytest_cache" -exec rm -rf {} +
	find . -type d -name ".mypy_cache" -exec rm -rf {} +

check-all: lint ## Run all checks (linting only)

# Version management
.PHONY: version-patch version-minor version-major version-show docker-build docker-push
version-patch:
	@python scripts/version.py patch

version-minor:
	@python scripts/version.py minor

version-major:
	@python scripts/version.py major

version-show:
	@python scripts/version.py --help

# Docker operations
docker-build: ## Build Docker image with current version
	$(eval VERSION := $(shell grep '^version = ' pyproject.toml | cut -d'"' -f2))
	docker build -t ghcr.io/dergigi/vibeline:$(VERSION) .
	docker tag ghcr.io/dergigi/vibeline:$(VERSION) ghcr.io/dergigi/vibeline:latest

docker-push: ## Push Docker image with current version
	$(eval VERSION := $(shell grep '^version = ' pyproject.toml | cut -d'"' -f2))
	docker push ghcr.io/dergigi/vibeline:$(VERSION)
	docker push ghcr.io/dergigi/vibeline:latest
