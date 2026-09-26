# Release setup and operation

This monorepo publishes two npm packages from `packages/`:
`jest-environment-webgl-node` and `jest-environment-webgpu-node`. They share a single version
stream: `pnpm release` runs `semantic-release` once at the repo root, which computes one next
version from all commits since the last `v<version>` tag and publishes both packages at that
version together (via `@anolilab/semantic-release-pnpm`, one instance per package). If there are
no releasable changes, nothing publishes.

## npm trusted publisher

On npm, for **each** package open Settings → Trusted publishing, choose GitHub Actions and enter:

| Field                | Value         |
| -------------------- | ------------- |
| Organization or user | `bhouston`    |
| Repository           | `jest-gpu`    |
| Workflow filename    | `release.yml` |
| Environment          | Leave blank   |

The workflow runs on GitHub-hosted Ubuntu with `id-token: write` and uses the Node version in
`.nvmrc`. Do not add `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or `registry-url` to setup-node. The built-in
`GITHUB_TOKEN` creates tags and GitHub Releases. Both packages have already published under their
prior per-package versioning, so trusted publishing is already configured; nothing new to set up
per package for the switch to a shared version.

## GitHub configuration

Keep `main` as the sole integration branch. Enable merge commits and disable squash merges
(PRs are merged with merge commits, never squashed). Protect `main` with required PRs
and the required checks `Quality (macos-latest)`, `Quality (ubuntu-latest)` and `PR policy`.
Repository rules must allow the Actions token to create `v*` tags.

The `Release` workflow runs only through `workflow_dispatch` on `main`:
`gh workflow run release.yml --ref main` (`-f dry_run=true` to validate without publishing).

## Version baseline

Both packages now share one version, seeded from their prior independent versions, which were
identical: `jest-environment-webgl-node@0.1.2` and `jest-environment-webgpu-node@0.1.2`. Every
package.json's `version` field is set to `0.1.2` in source as the baseline; the tag format is
`v<version>` (not the old `<package>-v<version>`). The baseline tag `v0.1.2` was pushed to the
commit where both prior per-package tags met, so semantic-release has a `v*` tag to compute the
next version from.

## Recovery

If npm succeeded but GitHub release creation failed, recover the GitHub release from the existing
tag; never republish the same npm version.
