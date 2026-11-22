# Security

## Reporting a vulnerability

Please report it privately: on this repository, open **Security → Report a vulnerability**. Do not open a public issue.

Include the workflow that shows the problem (or a minimal one), what you expected, and what happened.

## Scope

This repository: the `catalog-doctor-action` GitHub Action — `action.yml`, the files it runs, and its own workflows. Problems in the catalog-doctor CLI itself belong in [rajanaggarwal11/catalog-doctor](https://github.com/rajanaggarwal11/catalog-doctor).

Examples that are in scope: the action running a different catalog-doctor than the one it pins, output or summary injection, `fix: true` writing outside the workspace.

## Supported versions

The latest major version (`v1`). Fixes ship as a new v1 release; older tags are not patched.
