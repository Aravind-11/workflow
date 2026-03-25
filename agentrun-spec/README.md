# AgentRun

The package manager for AI coding agent rules.

Install, compose, and manage `.cursor/rules/*.mdc` files and `AGENTS.md` sections across your projects. Works with **Cursor, VS Code, Windsurf, Copilot, Claude Code, Devin**, and any tool that reads AGENTS.md.

## Quick Start

```bash
pip install agentrun

# Initialize in your project
agentrun init

# Install rule packages
agentrun install python-expert
agentrun install security-reviewer testing-guru

# See what's installed
agentrun list

# Search for more
agentrun search "react typescript"
```

After running `agentrun install python-expert`, your project gets:

```
your-project/
  .cursor/rules/
    python-expert--python-style.mdc       # Cursor reads this automatically
    python-expert--python-testing.mdc
  AGENTS.md                                # Every IDE agent reads this
  .agentrun/
    installed.json                         # Tracks what's installed
```

## Available Packages

| Package | Description | Rules |
|---------|-------------|-------|
| `python-expert` | Type hints, PEP 8, pytest patterns | 2 |
| `react-pro` | Functional components, hooks, TypeScript | 2 |
| `security-reviewer` | OWASP top 10, secrets prevention | 2 |
| `testing-guru` | Test structure, mocking, TDD | 2 |
| `git-conventional` | Conventional commits, PR standards | 2 |

## Commands

```bash
agentrun install <pkg> [pkg2...]    # Install packages
agentrun install user/repo          # Install from GitHub
agentrun install ./local/path       # Install from local directory
agentrun uninstall <pkg>            # Remove a package
agentrun update [pkg]               # Update one or all packages
agentrun list                       # Show installed packages
agentrun search <query>             # Search the registry
agentrun info <pkg>                 # Show package details
agentrun init                       # Set up agentrun in your project
agentrun validate ./path            # Validate a package
agentrun publish ./path             # Get publish instructions
```

## Composability

Install multiple rule sets and they work together:

```bash
agentrun install python-expert security-reviewer testing-guru git-conventional
```

Each package's rules are namespaced (e.g., `python-expert--python-style.mdc`) so they never conflict.

## Creating a Package

```
my-rules/
  package.yaml      # Metadata
  rules/
    my-rule.mdc     # Cursor MDC rule file
  agents.md         # Cross-IDE instructions
```

```yaml
# package.yaml
name: my-rules
version: 1.0.0
description: "My custom coding rules"
author: your-name
tags: [custom]
rules:
  - file: rules/my-rule.mdc
    activation: auto
agents_md:
  section: "My Rules"
  file: agents.md
```

See [SPEC.md](SPEC.md) for the full package format specification.

## How It Works

AgentRun outputs two formats that every major IDE agent already reads:

1. **`.cursor/rules/*.mdc`** — Cursor's native rule format with YAML frontmatter controlling activation (always, glob pattern, AI-decides, or manual)
2. **`AGENTS.md`** — The cross-IDE standard (Linux Foundation / Agentic AI Foundation) read by 20+ tools including Copilot, Claude Code, Windsurf, and Devin

You don't need a new runtime or framework. You just need the right rules installed in the right format.

## License

MIT
