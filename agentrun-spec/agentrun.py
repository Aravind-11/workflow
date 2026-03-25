"""
AgentRun — The package manager for AI coding agent rules.

Install, compose, and manage .cursor/rules/*.mdc files and AGENTS.md
sections across projects. Works with Cursor, VS Code, Windsurf,
Copilot, Claude Code, Devin, and any tool that reads AGENTS.md.
"""

import argparse
import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from pathlib import Path
from typing import Optional

import yaml

__version__ = "0.1.0"

AGENTRUN_DIR = ".agentrun"
INSTALLED_JSON = "installed.json"
CURSOR_RULES_DIR = Path(".cursor") / "rules"
AGENTS_MD_FILE = "AGENTS.md"
FENCE_START = "<!-- agentrun:{name}:start -->"
FENCE_END = "<!-- agentrun:{name}:end -->"
PACKAGE_YAML = "package.yaml"
NAMESPACE_SEP = "--"
REGISTRY_URL = (
    "https://raw.githubusercontent.com/agentrun/registry/main/index.json"
)
GITHUB_RAW = "https://raw.githubusercontent.com/{repo}/main/{path}"
CACHE_DIR = Path.home() / ".agentrun" / "cache"


# ---------------------------------------------------------------------------
# Data model
# ---------------------------------------------------------------------------

@dataclass
class RuleDef:
    """A single rule file inside a package."""
    file: str
    activation: str = "auto"  # always | glob | auto | manual
    globs: list = field(default_factory=list)
    content: str = ""


@dataclass
class PackageMeta:
    """Parsed package.yaml."""
    name: str
    version: str
    description: str
    author: str
    tags: list = field(default_factory=list)
    license: str = "MIT"
    ide_targets: list = field(default_factory=lambda: ["cursor", "agents.md"])
    requires: list = field(default_factory=list)
    min_agentrun_version: str = ""
    rules: list = field(default_factory=list)  # list[RuleDef]
    agents_md_section: str = ""
    agents_md_file: str = ""
    source: str = ""       # registry | github | local | bundled
    source_ref: str = ""   # the ref used to install
    source_dir: str = ""   # resolved absolute directory path


@dataclass
class InstalledPackage:
    """Record of an installed package."""
    name: str
    version: str
    source: str
    source_ref: str
    installed_at: str
    files: list = field(default_factory=list)
    checksum: str = ""


class PackageError(Exception):
    """Raised when a package is invalid or an operation fails."""
    pass


# ---------------------------------------------------------------------------
# Package parsing
# ---------------------------------------------------------------------------

def parse_package(pkg_dir: str | Path) -> PackageMeta:
    """Parse a package.yaml and load rule file contents."""
    pkg_dir = Path(pkg_dir)
    meta_path = pkg_dir / PACKAGE_YAML
    if not meta_path.exists():
        raise PackageError(f"No {PACKAGE_YAML} found in {pkg_dir}")

    with open(meta_path) as f:
        raw = yaml.safe_load(f)

    if not raw or not isinstance(raw, dict):
        raise PackageError(f"Invalid {PACKAGE_YAML}: must be a YAML mapping")

    required = ["name", "version", "description", "author"]
    missing = [k for k in required if k not in raw]
    if missing:
        raise PackageError(f"Missing required fields in {PACKAGE_YAML}: {missing}")

    name = raw["name"]
    if not re.match(r"^[a-z0-9][a-z0-9\-]*$", name):
        raise PackageError(
            f"Invalid package name '{name}': must be kebab-case "
            "(lowercase alphanumeric and hyphens, start with letter/digit)"
        )

    rules_raw = raw.get("rules", [])
    if not rules_raw:
        raise PackageError("Package must declare at least one rule in 'rules'")

    rules = []
    for r in rules_raw:
        if isinstance(r, str):
            r = {"file": r}
        rule_file = r.get("file", "")
        if not rule_file:
            raise PackageError("Each rule must have a 'file' field")
        rule_path = pkg_dir / rule_file
        content = ""
        if rule_path.exists():
            content = rule_path.read_text(encoding="utf-8")
        else:
            raise PackageError(f"Rule file not found: {rule_file}")

        activation = r.get("activation", "auto")
        if activation not in ("always", "glob", "auto", "manual"):
            raise PackageError(
                f"Invalid activation '{activation}' for rule {rule_file}. "
                "Must be: always, glob, auto, manual"
            )
        globs = r.get("globs", [])
        if isinstance(globs, str):
            globs = [globs]
        if activation == "glob" and not globs:
            raise PackageError(
                f"Rule {rule_file} has activation=glob but no globs defined"
            )
        rules.append(RuleDef(file=rule_file, activation=activation,
                             globs=globs, content=content))

    agents_md_raw = raw.get("agents_md", {})
    agents_md_section = ""
    agents_md_file = ""
    agents_md_content = ""
    if isinstance(agents_md_raw, dict):
        agents_md_section = agents_md_raw.get("section", "")
        agents_md_file = agents_md_raw.get("file", "")
    if agents_md_file:
        amd_path = pkg_dir / agents_md_file
        if amd_path.exists():
            agents_md_content = amd_path.read_text(encoding="utf-8")

    return PackageMeta(
        name=name,
        version=raw["version"],
        description=raw["description"],
        author=raw["author"],
        tags=raw.get("tags", []),
        license=raw.get("license", "MIT"),
        ide_targets=raw.get("ide_targets", ["cursor", "agents.md"]),
        requires=raw.get("requires", []),
        min_agentrun_version=raw.get("min_agentrun_version", ""),
        rules=rules,
        agents_md_section=agents_md_section,
        agents_md_file=agents_md_content,  # store content, not filename
        source_dir=str(pkg_dir.resolve()),
    )


def validate_package(pkg_dir: str | Path) -> list[str]:
    """Validate a package directory. Returns list of issues (empty = valid)."""
    issues = []
    pkg_dir = Path(pkg_dir)

    if not (pkg_dir / PACKAGE_YAML).exists():
        issues.append(f"Missing {PACKAGE_YAML}")
        return issues

    try:
        meta = parse_package(pkg_dir)
    except PackageError as e:
        issues.append(str(e))
        return issues

    if not meta.description.strip():
        issues.append("Description is empty")
    for rule in meta.rules:
        if not rule.content.strip():
            issues.append(f"Rule file {rule.file} is empty")
        if "---" not in rule.content:
            issues.append(f"Rule file {rule.file} is missing YAML frontmatter")
    if not (pkg_dir / "rules").is_dir():
        issues.append("Missing rules/ directory")

    return issues


# ---------------------------------------------------------------------------
# .mdc file generation
# ---------------------------------------------------------------------------

def generate_mdc(rule: RuleDef, package_name: str) -> tuple[str, str]:
    """Generate the output filename and content for a .mdc rule.

    If the .mdc already has valid frontmatter we use it as-is.
    Otherwise we generate frontmatter from the RuleDef metadata.

    Returns (output_filename, content).
    """
    rule_basename = Path(rule.file).stem
    output_name = f"{package_name}{NAMESPACE_SEP}{rule_basename}.mdc"

    if rule.content.strip().startswith("---"):
        return output_name, rule.content

    # Build frontmatter from metadata
    fm = {}
    fm["description"] = f"{package_name}: {rule_basename.replace('-', ' ')}"
    if rule.activation == "always":
        fm["alwaysApply"] = True
    else:
        fm["alwaysApply"] = False
    if rule.globs:
        fm["globs"] = rule.globs if len(rule.globs) > 1 else rule.globs[0]

    front = yaml.dump(fm, default_flow_style=False).strip()
    content = f"---\n{front}\n---\n{rule.content}"
    return output_name, content


def install_mdc_files(meta: PackageMeta, project_dir: Path) -> list[str]:
    """Write .mdc files to .cursor/rules/. Returns list of created paths."""
    rules_dir = project_dir / CURSOR_RULES_DIR
    rules_dir.mkdir(parents=True, exist_ok=True)

    created = []
    for rule in meta.rules:
        if "cursor" not in meta.ide_targets:
            continue
        fname, content = generate_mdc(rule, meta.name)
        out_path = rules_dir / fname
        out_path.write_text(content, encoding="utf-8")
        created.append(str(CURSOR_RULES_DIR / fname))
    return created


def remove_mdc_files(files: list[str], project_dir: Path) -> None:
    """Delete installed .mdc files."""
    for f in files:
        p = project_dir / f
        if p.exists():
            p.unlink()


# ---------------------------------------------------------------------------
# AGENTS.md merge / remove
# ---------------------------------------------------------------------------

def merge_agents_md(meta: PackageMeta, project_dir: Path) -> None:
    """Add or update this package's section in AGENTS.md."""
    if "agents.md" not in meta.ide_targets:
        return
    if not meta.agents_md_file:
        return

    agents_path = project_dir / AGENTS_MD_FILE
    existing = ""
    if agents_path.exists():
        existing = agents_path.read_text(encoding="utf-8")

    fence_start = FENCE_START.format(name=meta.name)
    fence_end = FENCE_END.format(name=meta.name)
    section_header = meta.agents_md_section or meta.name.replace("-", " ").title()
    new_block = (
        f"{fence_start}\n"
        f"## {section_header}\n\n"
        f"{meta.agents_md_file.strip()}\n\n"
        f"{fence_end}"
    )

    if fence_start in existing:
        pattern = re.escape(fence_start) + r".*?" + re.escape(fence_end)
        updated = re.sub(pattern, new_block, existing, flags=re.DOTALL)
    else:
        if existing.strip():
            updated = existing.rstrip() + "\n\n" + new_block + "\n"
        else:
            header = f"# {project_dir.resolve().name}\n\n"
            updated = header + new_block + "\n"

    agents_path.write_text(updated, encoding="utf-8")


def remove_agents_md_section(package_name: str, project_dir: Path) -> None:
    """Remove a package's fenced section from AGENTS.md."""
    agents_path = project_dir / AGENTS_MD_FILE
    if not agents_path.exists():
        return
    content = agents_path.read_text(encoding="utf-8")
    fence_start = FENCE_START.format(name=package_name)
    fence_end = FENCE_END.format(name=package_name)
    if fence_start not in content:
        return
    pattern = re.escape(fence_start) + r".*?" + re.escape(fence_end) + r"\n?"
    updated = re.sub(pattern, "", content, flags=re.DOTALL)
    updated = re.sub(r"\n{3,}", "\n\n", updated)
    agents_path.write_text(updated, encoding="utf-8")


# ---------------------------------------------------------------------------
# installed.json management
# ---------------------------------------------------------------------------

def _installed_path(project_dir: Path) -> Path:
    return project_dir / AGENTRUN_DIR / INSTALLED_JSON


def load_installed(project_dir: Path) -> dict:
    p = _installed_path(project_dir)
    if not p.exists():
        return {"packages": {}}
    with open(p) as f:
        return json.load(f)


def save_installed(project_dir: Path, data: dict) -> None:
    d = project_dir / AGENTRUN_DIR
    d.mkdir(parents=True, exist_ok=True)
    with open(d / INSTALLED_JSON, "w") as f:
        json.dump(data, f, indent=2)


def record_install(project_dir: Path, meta: PackageMeta,
                   files: list[str], checksum: str) -> None:
    data = load_installed(project_dir)
    data["packages"][meta.name] = {
        "version": meta.version,
        "source": meta.source,
        "source_ref": meta.source_ref,
        "installed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "files": files,
        "checksum": checksum,
    }
    save_installed(project_dir, data)


def record_uninstall(project_dir: Path, package_name: str) -> None:
    data = load_installed(project_dir)
    data["packages"].pop(package_name, None)
    save_installed(project_dir, data)


def is_installed(project_dir: Path, package_name: str) -> bool:
    data = load_installed(project_dir)
    return package_name in data.get("packages", {})


def get_installed_info(project_dir: Path, package_name: str) -> Optional[dict]:
    data = load_installed(project_dir)
    return data.get("packages", {}).get(package_name)


# ---------------------------------------------------------------------------
# Registry & resolution
# ---------------------------------------------------------------------------

def _bundled_packages_dir() -> Path:
    """Path to bundled packages shipped with agentrun."""
    return Path(__file__).parent / "packages"


def _registry_index_path() -> Path:
    return Path(__file__).parent / "registry" / "index.json"


def load_registry() -> dict:
    """Load the local registry index."""
    idx = _registry_index_path()
    if not idx.exists():
        return {"version": "1", "packages": {}}
    with open(idx) as f:
        return json.load(f)


def search_registry(query: str) -> list[dict]:
    """Search registry by name, description, and tags."""
    reg = load_registry()
    query_lower = query.lower()
    results = []
    for name, info in reg.get("packages", {}).items():
        score = 0
        if query_lower in name:
            score += 10
        if query_lower in info.get("description", "").lower():
            score += 5
        for tag in info.get("tags", []):
            if query_lower in tag.lower():
                score += 3
        if score > 0:
            results.append({"name": name, "score": score, **info})
    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def resolve_package_source(ref: str) -> tuple[str, str, str]:
    """Determine how to fetch a package from a reference string.

    Returns (source_type, source_ref, resolved_path_or_repo).
    source_type: "local" | "bundled" | "registry" | "github"
    """
    # Local path
    if ref.startswith("./") or ref.startswith("/") or Path(ref).is_dir():
        p = Path(ref)
        if p.is_dir() and (p / PACKAGE_YAML).exists():
            return "local", ref, str(p.resolve())
        raise PackageError(f"Local path '{ref}' is not a valid package directory")

    # GitHub ref: contains /
    if "/" in ref and not ref.startswith("."):
        return "github", ref, ref

    # Bundled package
    bundled = _bundled_packages_dir() / ref
    if bundled.is_dir() and (bundled / PACKAGE_YAML).exists():
        return "bundled", ref, str(bundled)

    # Registry lookup
    reg = load_registry()
    if ref in reg.get("packages", {}):
        repo = reg["packages"][ref].get("repo", "")
        if repo:
            return "registry", ref, repo
        raise PackageError(f"Registry entry '{ref}' has no repo URL")

    raise PackageError(
        f"Package '{ref}' not found. Checked: local path, bundled packages, "
        f"registry. Use 'agentrun search' to find available packages."
    )


def fetch_github_package(repo: str) -> Path:
    """Fetch a package from GitHub and cache it locally.

    repo: 'user/repo' or 'user/repo@version'
    Returns path to the cached package directory.
    """
    version = "main"
    if "@" in repo:
        repo, version = repo.rsplit("@", 1)

    cache_key = f"{repo.replace('/', '_')}_{version}"
    cache_path = CACHE_DIR / cache_key
    cache_path.mkdir(parents=True, exist_ok=True)

    files_to_fetch = [PACKAGE_YAML]
    pkg_yaml_url = GITHUB_RAW.format(repo=repo, path=PACKAGE_YAML)
    try:
        req = urllib.request.Request(pkg_yaml_url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            pkg_content = resp.read().decode("utf-8")
        (cache_path / PACKAGE_YAML).write_text(pkg_content, encoding="utf-8")
    except urllib.error.URLError as e:
        raise PackageError(
            f"Could not fetch {PACKAGE_YAML} from github.com/{repo}: {e}"
        )

    raw_meta = yaml.safe_load(pkg_content)
    rules_list = raw_meta.get("rules", [])
    agents_md_info = raw_meta.get("agents_md", {})

    rule_files = []
    for r in rules_list:
        rf = r.get("file", r) if isinstance(r, dict) else r
        rule_files.append(rf)

    if isinstance(agents_md_info, dict) and agents_md_info.get("file"):
        rule_files.append(agents_md_info["file"])

    for rf in rule_files:
        url = GITHUB_RAW.format(repo=repo, path=rf)
        dest = cache_path / rf
        dest.parent.mkdir(parents=True, exist_ok=True)
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=15) as resp:
                dest.write_bytes(resp.read())
        except urllib.error.URLError:
            raise PackageError(f"Could not fetch '{rf}' from github.com/{repo}")

    return cache_path


def resolve_and_load(ref: str) -> PackageMeta:
    """Resolve a package reference and return parsed metadata."""
    source_type, source_ref, resolved = resolve_package_source(ref)

    if source_type in ("local", "bundled"):
        meta = parse_package(resolved)
        meta.source = source_type
        meta.source_ref = source_ref
        return meta

    if source_type == "github":
        cache = fetch_github_package(resolved)
        meta = parse_package(cache)
        meta.source = "github"
        meta.source_ref = source_ref
        return meta

    if source_type == "registry":
        cache = fetch_github_package(resolved)
        meta = parse_package(cache)
        meta.source = "registry"
        meta.source_ref = source_ref
        return meta

    raise PackageError(f"Unknown source type: {source_type}")


# ---------------------------------------------------------------------------
# Dependency resolution
# ---------------------------------------------------------------------------

def resolve_dependencies(ref: str, seen: set | None = None) -> list[PackageMeta]:
    """Resolve a package and all its dependencies (depth-first).

    Returns list ordered so dependencies come before dependents.
    Detects cycles.
    """
    if seen is None:
        seen = set()

    meta = resolve_and_load(ref)

    if meta.name in seen:
        raise PackageError(
            f"Circular dependency detected: '{meta.name}' is already in "
            f"the dependency chain: {seen}"
        )
    seen.add(meta.name)

    result = []
    for dep in meta.requires:
        dep_list = resolve_dependencies(dep, seen.copy())
        for d in dep_list:
            if not any(x.name == d.name for x in result):
                result.append(d)

    result.append(meta)
    return result


# ---------------------------------------------------------------------------
# Install / uninstall / update
# ---------------------------------------------------------------------------

def compute_checksum(meta: PackageMeta) -> str:
    h = hashlib.sha256()
    for rule in meta.rules:
        h.update(rule.content.encode("utf-8"))
    if meta.agents_md_file:
        h.update(meta.agents_md_file.encode("utf-8"))
    return f"sha256:{h.hexdigest()}"


def check_conflicts(meta: PackageMeta, project_dir: Path) -> list[str]:
    """Check if installing this package would overwrite another package's files."""
    conflicts = []
    data = load_installed(project_dir)
    for rule in meta.rules:
        fname, _ = generate_mdc(rule, meta.name)
        out_rel = str(CURSOR_RULES_DIR / fname)
        for pkg_name, pkg_info in data.get("packages", {}).items():
            if pkg_name == meta.name:
                continue
            if out_rel in pkg_info.get("files", []):
                conflicts.append(
                    f"File '{out_rel}' conflicts with package '{pkg_name}'"
                )
    return conflicts


def install_package(ref: str, project_dir: Path | None = None,
                    force: bool = False) -> list[str]:
    """Install a package and its dependencies. Returns list of installed names."""
    if project_dir is None:
        project_dir = Path.cwd()
    project_dir = Path(project_dir)

    packages = resolve_dependencies(ref)
    installed_names = []

    for meta in packages:
        if is_installed(project_dir, meta.name) and not force:
            info = get_installed_info(project_dir, meta.name)
            if info and info.get("version") == meta.version:
                continue

        if not force:
            conflicts = check_conflicts(meta, project_dir)
            if conflicts:
                raise PackageError(
                    f"Conflicts detected for '{meta.name}':\n"
                    + "\n".join(f"  - {c}" for c in conflicts)
                    + "\nUse --force to override."
                )

        # If already installed, uninstall first (upgrade)
        if is_installed(project_dir, meta.name):
            uninstall_package(meta.name, project_dir)

        files = install_mdc_files(meta, project_dir)
        merge_agents_md(meta, project_dir)
        checksum = compute_checksum(meta)
        record_install(project_dir, meta, files, checksum)
        installed_names.append(meta.name)

    return installed_names


def uninstall_package(name: str, project_dir: Path | None = None) -> bool:
    """Uninstall a package. Returns True if it was installed."""
    if project_dir is None:
        project_dir = Path.cwd()
    project_dir = Path(project_dir)

    info = get_installed_info(project_dir, name)
    if not info:
        return False

    remove_mdc_files(info.get("files", []), project_dir)
    remove_agents_md_section(name, project_dir)
    record_uninstall(project_dir, name)
    return True


def update_package(name: str, project_dir: Path | None = None) -> bool:
    """Update a single package to latest. Returns True if updated."""
    if project_dir is None:
        project_dir = Path.cwd()
    project_dir = Path(project_dir)

    info = get_installed_info(project_dir, name)
    if not info:
        raise PackageError(f"Package '{name}' is not installed")

    source_ref = info.get("source_ref", name)
    try:
        meta = resolve_and_load(source_ref)
    except PackageError:
        meta = resolve_and_load(name)

    if meta.version == info.get("version"):
        return False

    uninstall_package(name, project_dir)
    install_package(source_ref, project_dir, force=True)
    return True


def update_all(project_dir: Path | None = None) -> list[str]:
    """Update all installed packages. Returns names that were updated."""
    if project_dir is None:
        project_dir = Path.cwd()
    data = load_installed(project_dir)
    updated = []
    for name in list(data.get("packages", {}).keys()):
        try:
            if update_package(name, project_dir):
                updated.append(name)
        except PackageError:
            pass
    return updated


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def cli():
    parser = argparse.ArgumentParser(
        prog="agentrun",
        description=(
            "AgentRun — The package manager for AI coding agent rules.\n"
            "Install .cursor/rules and AGENTS.md sections from a curated registry."
        ),
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--version", action="version", version=f"agentrun {__version__}")
    sub = parser.add_subparsers(dest="command", help="Available commands")

    # install
    p_install = sub.add_parser("install", help="Install one or more packages")
    p_install.add_argument("packages", nargs="+", help="Package name, user/repo, or ./local/path")
    p_install.add_argument("--force", "-f", action="store_true", help="Force install (overwrite conflicts)")

    # uninstall
    p_uninstall = sub.add_parser("uninstall", help="Remove a package")
    p_uninstall.add_argument("package", help="Package name to uninstall")

    # update
    p_update = sub.add_parser("update", help="Update installed packages")
    p_update.add_argument("package", nargs="?", help="Specific package to update (omit for all)")

    # list
    sub.add_parser("list", help="List installed packages")

    # search
    p_search = sub.add_parser("search", help="Search the registry")
    p_search.add_argument("query", help="Search query")

    # info
    p_info = sub.add_parser("info", help="Show package details")
    p_info.add_argument("package", help="Package name or path")

    # init
    sub.add_parser("init", help="Initialize agentrun in current project")

    # validate
    p_val = sub.add_parser("validate", help="Validate a package")
    p_val.add_argument("path", help="Path to package directory")

    # publish
    p_pub = sub.add_parser("publish", help="Validate and get publish instructions")
    p_pub.add_argument("path", help="Path to package directory")

    args = parser.parse_args()

    try:
        if args.command == "install":
            cmd_install(args)
        elif args.command == "uninstall":
            cmd_uninstall(args)
        elif args.command == "update":
            cmd_update(args)
        elif args.command == "list":
            cmd_list(args)
        elif args.command == "search":
            cmd_search(args)
        elif args.command == "info":
            cmd_info(args)
        elif args.command == "init":
            cmd_init(args)
        elif args.command == "validate":
            cmd_validate(args)
        elif args.command == "publish":
            cmd_publish(args)
        else:
            parser.print_help()
    except PackageError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)


def cmd_install(args):
    project_dir = Path.cwd()
    (project_dir / AGENTRUN_DIR).mkdir(parents=True, exist_ok=True)

    all_installed = []
    for ref in args.packages:
        names = install_package(ref, project_dir, force=args.force)
        all_installed.extend(names)

    if all_installed:
        print(f"Installed {len(all_installed)} package(s):")
        for n in all_installed:
            info = get_installed_info(project_dir, n)
            v = info["version"] if info else "?"
            print(f"  + {n} v{v}")
        print(f"\nFiles written to:")
        print(f"  .cursor/rules/   ({CURSOR_RULES_DIR})")
        if (project_dir / AGENTS_MD_FILE).exists():
            print(f"  {AGENTS_MD_FILE}")
    else:
        print("All packages already up to date.")


def cmd_uninstall(args):
    if uninstall_package(args.package):
        print(f"Uninstalled: {args.package}")
    else:
        print(f"Package '{args.package}' is not installed.")


def cmd_update(args):
    if args.package:
        if update_package(args.package):
            print(f"Updated: {args.package}")
        else:
            print(f"{args.package} is already at latest version.")
    else:
        updated = update_all()
        if updated:
            print(f"Updated {len(updated)} package(s): {', '.join(updated)}")
        else:
            print("All packages up to date.")


def cmd_list(args):
    data = load_installed(Path.cwd())
    pkgs = data.get("packages", {})
    if not pkgs:
        print("No packages installed. Run 'agentrun install <package>' to get started.")
        return
    print(f"Installed packages ({len(pkgs)}):\n")
    for name, info in pkgs.items():
        src = info.get("source", "?")
        ver = info.get("version", "?")
        nfiles = len(info.get("files", []))
        print(f"  {name} v{ver}  ({src}, {nfiles} rules)")


def cmd_search(args):
    results = search_registry(args.query)
    if not results:
        print(f"No packages found for '{args.query}'.")
        print("Tip: try broader terms or check 'agentrun list' for installed packages.")
        return
    print(f"Found {len(results)} package(s) for '{args.query}':\n")
    for r in results:
        tags = ", ".join(r.get("tags", []))
        print(f"  {r['name']}")
        print(f"    {r.get('description', '')}")
        if tags:
            print(f"    tags: {tags}")
        print()


def cmd_info(args):
    ref = args.package

    # Try installed first
    info = get_installed_info(Path.cwd(), ref)
    if info:
        print(f"  {ref} v{info['version']}  [installed]")
        print(f"    Source: {info.get('source', '?')} ({info.get('source_ref', '?')})")
        print(f"    Installed: {info.get('installed_at', '?')}")
        print(f"    Files: {len(info.get('files', []))}")
        for f in info.get("files", []):
            print(f"      {f}")
        return

    # Try to resolve and show metadata
    try:
        meta = resolve_and_load(ref)
    except PackageError:
        # Try registry
        reg = load_registry()
        if ref in reg.get("packages", {}):
            r = reg["packages"][ref]
            print(f"  {ref} v{r.get('latest', '?')}  [registry]")
            print(f"    {r.get('description', '')}")
            print(f"    Author: {r.get('author', '?')}")
            print(f"    Tags: {', '.join(r.get('tags', []))}")
            print(f"    Repo: {r.get('repo', '?')}")
            return
        print(f"Package '{ref}' not found.")
        return

    print(f"  {meta.name} v{meta.version}")
    print(f"    {meta.description}")
    print(f"    Author: {meta.author}")
    print(f"    Tags: {', '.join(meta.tags)}")
    print(f"    Rules: {len(meta.rules)}")
    for rule in meta.rules:
        act = rule.activation
        globs_str = f" [{', '.join(rule.globs)}]" if rule.globs else ""
        print(f"      - {rule.file} ({act}{globs_str})")
    if meta.requires:
        print(f"    Requires: {', '.join(meta.requires)}")


def cmd_init(args):
    project_dir = Path.cwd()
    agentrun_dir = project_dir / AGENTRUN_DIR
    agentrun_dir.mkdir(parents=True, exist_ok=True)
    cursor_dir = project_dir / CURSOR_RULES_DIR
    cursor_dir.mkdir(parents=True, exist_ok=True)

    installed_path = agentrun_dir / INSTALLED_JSON
    if not installed_path.exists():
        save_installed(project_dir, {"packages": {}})

    print("Initialized agentrun in current project.")
    print(f"  Created: {AGENTRUN_DIR}/")
    print(f"  Created: {CURSOR_RULES_DIR}/")
    print()
    print("Next steps:")
    print("  agentrun search python          # find packages")
    print("  agentrun install python-expert   # install a package")
    print("  agentrun list                    # see what's installed")


def cmd_validate(args):
    issues = validate_package(args.path)
    if issues:
        print(f"Validation failed ({len(issues)} issue(s)):")
        for iss in issues:
            print(f"  - {iss}")
        sys.exit(1)
    else:
        meta = parse_package(args.path)
        print(f"Package '{meta.name}' v{meta.version} is valid.")
        print(f"  {len(meta.rules)} rule(s), {len(meta.tags)} tag(s)")
        if meta.requires:
            print(f"  Dependencies: {', '.join(meta.requires)}")


def cmd_publish(args):
    issues = validate_package(args.path)
    if issues:
        print("Package has validation errors — fix these first:")
        for iss in issues:
            print(f"  - {iss}")
        sys.exit(1)

    meta = parse_package(args.path)
    print(f"Package '{meta.name}' v{meta.version} is ready to publish.\n")
    print("To add your package to the agentrun registry:\n")
    print("  1. Push your package to a public GitHub repo")
    print(f"     Repo should contain: {PACKAGE_YAML}, rules/, agents.md")
    print()
    print("  2. Add an entry to the registry index:")
    print(f'     "{meta.name}": {{')
    print(f'       "description": "{meta.description}",')
    print(f'       "author": "{meta.author}",')
    print(f'       "repo": "YOUR_USERNAME/{meta.name}",')
    print(f'       "latest": "{meta.version}",')
    print(f'       "tags": {json.dumps(meta.tags)}')
    print(f"     }}")
    print()
    print("  3. Submit a PR to https://github.com/agentrun/registry")


if __name__ == "__main__":
    cli()
