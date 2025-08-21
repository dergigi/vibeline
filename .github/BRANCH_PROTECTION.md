# Branch Protection Setup

To ensure that no PRs can be merged without passing linting checks, you need to set up branch protection rules in GitHub.

## Steps to Set Up Branch Protection

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Click **Add rule** or edit the existing rule for your main branch
4. Configure the following settings:

### Branch name pattern
- Set to `main` (or `master` if that's your default branch)

### Protection rules to enable:

#### ✅ Require a pull request before merging
- **Require pull request reviews before merging**: Enabled
- **Required approving reviews**: 1 (or more as needed)
- **Dismiss stale PR approvals when new commits are pushed**: Enabled
- **Require review from code owners**: Enabled (if you have a CODEOWNERS file)

#### ✅ Require status checks to pass before merging
- **Require branches to be up to date before merging**: Enabled
- **Require status checks to pass before merging**: Enabled
- **Status checks that are required**:
  - `lint / lint (3.11)`
  - `lint / format-check`

#### ✅ Require conversation resolution before merging
- **Require conversation resolution before merging**: Enabled

#### ✅ Require signed commits
- **Require signed commits**: Enabled (recommended for security)

#### ✅ Require linear history
- **Require linear history**: Enabled (prevents merge commits)

#### ✅ Include administrators
- **Include administrators**: Enabled (ensures even admins follow the rules)

## Result

With these settings, GitHub will:
- Block any PR from being merged if the linting workflow fails
- Require the branch to be up to date with the main branch
- Require at least one approving review
- Ensure all conversations are resolved before merging

## Local Development

To avoid issues with linting, developers should:

1. Install development dependencies: `make install-dev`
2. Run linting locally before pushing: `make lint`
3. Format code if needed: `make format`
4. Optionally set up pre-commit hooks: `make setup-pre-commit`

## Troubleshooting

If you see linting failures in your PR:

1. Run `make format` to fix formatting issues
2. Run `make lint` to check for other issues
3. Fix any remaining issues manually
4. Commit and push your changes

The GitHub Actions workflow will catch all linting issues, and pre-commit hooks are optional for local development.
