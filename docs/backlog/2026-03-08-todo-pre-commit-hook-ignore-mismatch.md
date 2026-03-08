> **Priority**: pending
> **Date**: 2026-03-08
> **Related files**: `lefthook.yml`, `biome.json`

# TODO: pre-commit hook fails when restoring old snapshot

## Summary

`git commit` failed during `lefthook` because `npx biome check --write {staged_files}` and
`npx biome format --write {staged_files}` received only files under `reference/up-web-legacy/`,
but those paths are excluded by the current `biome.json` includes.

## Current workaround

Create the repository snapshot commit with `--no-verify`.

## Proper fix

Adjust the pre-commit workflow so it does not fail when staged files are outside current Biome
targets, or make the hook skip gracefully when zero files are eligible.
