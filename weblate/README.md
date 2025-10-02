# Weblate integration

This folder contains metadata that allows you to connect the Axioris website repository to a self-hosted or hosted Weblate instance without mixing configuration files into the main application code.

## Key points

- Translation sources live in the repository root under `locales/<lang>/common.json`.
- Weblate should track `locales/en/common.json` as the template file and create/update the other locale JSON files.
- The provided `weblate.yaml` describes a single Weblate component (`frontend-common`) that watches the `main` branch of this repository.
- Keep the Weblate remote separate from your primary development remotes. Create a dedicated bot user or SSH key with push access limited to the `locales` directory if possible.

## Typical workflow

1. **Pull from Weblate**: translators work via Weblate and push changes to a dedicated remote or branch.
2. **Developers merge translations**: pull the Weblate branch into `main` (or via PR) and run `npm run lint` to ensure the JSON remains valid.
3. **Add new keys**: developers add English strings in `locales/en/common.json`, then run `npm run lint` (or `npm run format` if you add one) before pushing. Weblate exposes the new keys to translators automatically.
4. **Avoid direct edits to other locales**: let Weblate manage them to keep translation memory consistent.

## Setting up Weblate

1. In Weblate, create a new project (e.g., "Axioris Website").
2. Add a component using the `weblate.yaml` file or replicate its settings manually.
3. Point the repository URL to the Git remote that Weblate should clone.
4. Configure push settings so Weblate commits to a dedicated branch (for example `weblate/translations`).
5. In GitHub/GitLab, create an automation (or manual process) to merge that branch into `main`.

Adjust the YAML file as needed if you add more translation namespaces or move files. Keeping this configuration outside the app source allows you to iterate on translation pipelines without redeploying the application.
