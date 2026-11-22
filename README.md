# catalog-doctor-action

Run [catalog-doctor](https://github.com/rajanaggarwal11/catalog-doctor) in CI. Catches the dependency drift a pnpm monorepo accumulates quietly — half-adopted catalogs, two versions of the same library, internal packages that can resolve to the registry, imports nothing declares — and writes a summary table into the workflow run.

```yaml
name: Workspace health
on: [push, pull_request]
permissions:
  contents: read

jobs:
  catalog-doctor:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
        with: { persist-credentials: false }
      - uses: rajanaggarwal11/catalog-doctor-action@v1
```

That's the whole job. The action reads the files `actions/checkout` puts on the runner; it does not check out the repository itself, so keep the checkout step. No pnpm install, no Node setup, no config.

`@v1` follows the latest v1 release. To run exactly the code you reviewed, pin the full commit SHA of a release tag, with the tag in a comment so Dependabot can update it:

```yaml
      - uses: rajanaggarwal11/catalog-doctor-action@<commit-sha> # v1.x.y
```

`git ls-remote https://github.com/rajanaggarwal11/catalog-doctor-action 'refs/tags/v1*'` lists the tags and their SHAs.

## What you get

The human-readable report lands in the job log, and a table lands in the run's **Summary** tab, so a failure is legible without opening logs:

> ## catalog-doctor
>
> **3 findings** — 2 error(s), 1 warning(s), 2 fixable.
>
> | | Rule | Dependency | Problem |
> | --- | --- | --- | --- |
> | 🔴 | `catalog-drift` | `zod` | zod resolves through the catalog in 1 place and directly in 1 |
> | 🔴 | `version-mismatch` | `lodash` | lodash is declared at 2 different versions |
> | 🟡 | `catalog-candidate` | `date-fns` | date-fns is declared as ^3.6.0 in 3 packages but is not in the catalog |

## Inputs

| Input | Default | What it does |
| --- | --- | --- |
| `version` | `0.1.1` | Which catalog-doctor to run: an exact version, or a dist-tag such as `latest`. |
| `working-directory` | `.` | Where to start. The workspace root is found by walking up. |
| `strict` | `false` | Fail on warnings as well as errors. |
| `only` | — | Run only these rules, comma-separated. |
| `ignore` | — | Skip these rules, comma-separated. |
| `exclude` | — | Globs to keep out of source scanning, e.g. `test/fixtures/**`. |
| `fix` | `false` | Apply every fix that needs no human decision, then report what is left. |
| `fail-on-findings` | `true` | Set `false` to report without blocking the build. |

## Outputs

`total`, `errors`, `warnings`, `fixable`, and `report` — the path to the JSON report on the runner, if you want to upload or post-process it.

## Which catalog-doctor runs

Each release of the action runs one exact catalog-doctor version, the one its tests ran against: `0.1.1` for this release. Set `version` to run another (`0.1.2`, or `latest` to follow npm).

## Recipes

The recipes show only the action's step; each goes in a job like the one above, after `actions/checkout`.

**Block the build only on real breakage, report the rest.**

```yaml
- uses: rajanaggarwal11/catalog-doctor-action@v1
  with:
    exclude: "test/fixtures/**"
```

Errors fail; warnings show up in the summary and let the build through. That is the default, and it is the right setting for adopting this on an existing monorepo.

**Tighten once you're clean.**

```yaml
- uses: rajanaggarwal11/catalog-doctor-action@v1
  with:
    strict: true
```

**Report without ever blocking**, while you work through a backlog:

```yaml
- uses: rajanaggarwal11/catalog-doctor-action@v1
  with:
    fail-on-findings: false
```

**Open a pull request with the automatic fixes.** A separate workflow, on a schedule or on demand, that can push a branch and open a PR:

```yaml
name: Tidy the catalog
on:
  schedule: [{ cron: "0 6 * * 1" }]
  workflow_dispatch:
permissions:
  contents: write
  pull-requests: write

jobs:
  fix:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: rajanaggarwal11/catalog-doctor-action@v1
        with:
          fix: true
          fail-on-findings: false
      - uses: peter-evans/create-pull-request@v8
        with:
          title: "chore: tidy the pnpm catalog"
          branch: chore/catalog-doctor
```

With the default `GITHUB_TOKEN`, the repository setting **Allow GitHub Actions to create and approve pull requests** must be on, and checks do not run on a PR the token opens; pass a GitHub App token to `create-pull-request` if you need them.

`--fix` only touches what has exactly one correct answer. It leaves version mismatches alone, because which range wins is a judgement about breaking changes and not a lookup — so the PR is always reviewable.

**Use the outputs.**

```yaml
- uses: rajanaggarwal11/catalog-doctor-action@v1
  id: doctor
  with:
    fail-on-findings: false
- run: echo "${{ steps.doctor.outputs.fixable }} of ${{ steps.doctor.outputs.total }} are fixable"
```

## Notes

It runs `npx --package catalog-doctor@<version> catalog-doctor`, so it needs Node on the runner — every `ubuntu-*`, `macos-*` and `windows-*` image has it. It does not install your dependencies, because it reads manifests rather than `node_modules`; put it before or after your install step, whichever you prefer.

## License

[MIT](./LICENSE) © Rajan Aggarwal
