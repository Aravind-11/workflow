# AgentRun Package Format Specification v0.1.0

AgentRun is a package manager for AI coding agent rules. Packages distribute `.cursor/rules/*.mdc` files (Cursor-native) and `AGENTS.md` sections (cross-IDE standard).

## 1. Package Structure

```
my-package/
  package.yaml          # Required: package metadata
  rules/                # Required: .mdc rule files
    rule-name.mdc
  agents.md             # Optional: AGENTS.md section content
  LICENSE               # Recommended
```

## 2. package.yaml Schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | yes | Kebab-case identifier (e.g. `django-expert`) |
| `version` | string | yes | Semver (e.g. `1.0.0`) |
| `description` | string | yes | One-line summary |
| `author` | string | yes | Author name or GitHub username |
| `tags` | list[string] | no | Searchable tags |
| `license` | string | no | SPDX identifier (default: `MIT`) |
| `ide_targets` | list[string] | no | Output targets: `cursor`, `agents.md` (default: both) |
| `requires` | list[string] | no | Dependency package names |
| `min_agentrun_version` | string | no | Minimum CLI version |
| `rules` | list[RuleDef] | yes | Rule file declarations |
| `agents_md.section` | string | no | Section heading for AGENTS.md |
| `agents_md.file` | string | no | Path to agents.md content file |

### RuleDef

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `file` | string | yes | Relative path to .mdc file |
| `activation` | string | no | `always`, `glob`, `auto`, `manual` (default: `auto`) |
| `globs` | list[string] | no | File patterns (required when activation is `glob`) |

## 3. .mdc Rule File Format

Standard Cursor MDC — YAML frontmatter + markdown body:

```
---
description: Short description for AI matching
globs: "**/*.py"
alwaysApply: false
---
# Rule Title

- Instruction one
- Instruction two
```

Frontmatter fields:
- `description` (string): Used by Cursor to decide when to apply the rule.
- `globs` (string or list): File patterns. Omit for `always` or `auto` activation.
- `alwaysApply` (boolean): `true` for rules that apply to every session.

## 4. agents.md Section Format

Plain markdown. Merged into the project's `AGENTS.md` inside fence markers:

```markdown
<!-- agentrun:package-name:start -->
## Section Title

Content here...

<!-- agentrun:package-name:end -->
```

AgentRun manages these fenced sections — manual edits outside the fences are preserved.

## 5. Installation Layout

When a package is installed, AgentRun writes:

```
project/
  .cursor/rules/
    {package}--{rule}.mdc       # Namespaced rule files
  AGENTS.md                      # Merged sections
  .agentrun/
    installed.json               # Installation manifest
```

### installed.json

```json
{
  "packages": {
    "python-expert": {
      "version": "1.0.0",
      "source": "registry",
      "source_ref": "python-expert",
      "installed_at": "2026-03-10T12:00:00Z",
      "files": [
        ".cursor/rules/python-expert--python-style.mdc",
        ".cursor/rules/python-expert--python-testing.mdc"
      ],
      "checksum": "sha256:abc123..."
    }
  }
}
```

## 6. Registry Format (index.json)

```json
{
  "version": "1",
  "packages": {
    "package-name": {
      "description": "...",
      "author": "...",
      "repo": "user/repo",
      "latest": "1.0.0",
      "tags": ["tag1", "tag2"],
      "downloads": 0
    }
  }
}
```

## 7. Naming Conventions

- Package names: kebab-case, lowercase, alphanumeric + hyphens
- Rule files: kebab-case `.mdc` extension
- Installed files: `{package}--{rule}.mdc` (double-dash separator)

## 8. Conflict Resolution

- Two packages cannot install rules with the same output filename.
- If a conflict is detected, the install aborts with an error listing the conflict.
- `--force` flag overrides conflict detection.

## 9. Versioning

- Packages use semver.
- `agentrun update` fetches the `latest` version from the registry.
- No version pinning in MVP — always installs latest.
