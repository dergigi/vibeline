.PHONY: help install install-dev lint format test clean setup-pre-commit

help: ## Show this help message
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install production dependencies
	pip install -e .

install-dev: ## Install development dependencies
	pip install -e ".[dev]"

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
	@echo "✅ All linting checks passed!"

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
.PHONY: version-patch version-minor version-major version-show
version-patch:
	@python scripts/version.py patch

version-minor:
	@python scripts/version.py minor

version-major:
	@python scripts/version.py major

version-show:
	@python scripts/version.py --help
