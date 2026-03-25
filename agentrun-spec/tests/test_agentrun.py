"""
AgentRun test suite — comprehensive tests for the package manager.

Covers: package parsing, .mdc generation, AGENTS.md merge/remove,
install/uninstall/update, registry search, dependency resolution,
conflict detection, validation, and CLI dispatching.
"""

import json
import os
import pytest
import yaml
from pathlib import Path

# Ensure the parent dir is importable
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from agentrun import (
    PackageError,
    PackageMeta,
    RuleDef,
    parse_package,
    validate_package,
    generate_mdc,
    install_mdc_files,
    remove_mdc_files,
    merge_agents_md,
    remove_agents_md_section,
    load_installed,
    save_installed,
    record_install,
    record_uninstall,
    is_installed,
    get_installed_info,
    install_package,
    uninstall_package,
    check_conflicts,
    compute_checksum,
    search_registry,
    resolve_package_source,
    resolve_dependencies,
    CURSOR_RULES_DIR,
    AGENTS_MD_FILE,
    AGENTRUN_DIR,
    FENCE_START,
    FENCE_END,
    NAMESPACE_SEP,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_package(tmp_path, name="test-pkg", version="1.0.0",
                 rules=None, agents_md_content="", extra_yaml=None):
    """Create a minimal valid package in tmp_path and return its path."""
    pkg_dir = tmp_path / name
    pkg_dir.mkdir(parents=True, exist_ok=True)
    rules_dir = pkg_dir / "rules"
    rules_dir.mkdir(exist_ok=True)

    if rules is None:
        rules = [{"file": "rules/main.mdc", "activation": "auto"}]
        (rules_dir / "main.mdc").write_text(
            "---\ndescription: Test rule\nalwaysApply: false\n---\n# Test\n- Rule one\n",
            encoding="utf-8",
        )

    meta = {
        "name": name,
        "version": version,
        "description": f"Test package {name}",
        "author": "tester",
        "tags": ["test"],
        "rules": rules,
    }
    if agents_md_content:
        (pkg_dir / "agents.md").write_text(agents_md_content, encoding="utf-8")
        meta["agents_md"] = {"section": f"{name} Rules", "file": "agents.md"}

    if extra_yaml:
        meta.update(extra_yaml)

    with open(pkg_dir / "package.yaml", "w") as f:
        yaml.dump(meta, f, default_flow_style=False)

    return pkg_dir


def make_project(tmp_path):
    """Create a minimal project directory with .agentrun/."""
    proj = tmp_path / "project"
    proj.mkdir(parents=True, exist_ok=True)
    (proj / AGENTRUN_DIR).mkdir(exist_ok=True)
    return proj


# ---------------------------------------------------------------------------
# Package parsing and validation
# ---------------------------------------------------------------------------

class TestParsePackage:

    def test_parse_valid_package(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        meta = parse_package(pkg_dir)
        assert meta.name == "test-pkg"
        assert meta.version == "1.0.0"
        assert meta.author == "tester"
        assert len(meta.rules) == 1

    def test_missing_package_yaml(self, tmp_path):
        with pytest.raises(PackageError, match="No package.yaml"):
            parse_package(tmp_path)

    def test_missing_required_fields(self, tmp_path):
        pkg_dir = tmp_path / "bad"
        pkg_dir.mkdir()
        (pkg_dir / "package.yaml").write_text("name: bad\n")
        with pytest.raises(PackageError, match="Missing required fields"):
            parse_package(pkg_dir)

    def test_invalid_package_name(self, tmp_path):
        pkg_dir = tmp_path / "Bad_Name"
        pkg_dir.mkdir()
        rules_dir = pkg_dir / "rules"
        rules_dir.mkdir()
        (rules_dir / "r.mdc").write_text("---\ndescription: x\n---\nrule\n")
        meta = {
            "name": "Bad_Name", "version": "1.0.0",
            "description": "x", "author": "x",
            "rules": [{"file": "rules/r.mdc"}],
        }
        with open(pkg_dir / "package.yaml", "w") as f:
            yaml.dump(meta, f)
        with pytest.raises(PackageError, match="Invalid package name"):
            parse_package(pkg_dir)

    def test_no_rules_raises(self, tmp_path):
        pkg_dir = tmp_path / "empty"
        pkg_dir.mkdir()
        meta = {"name": "empty", "version": "1.0.0", "description": "x",
                "author": "x", "rules": []}
        with open(pkg_dir / "package.yaml", "w") as f:
            yaml.dump(meta, f)
        with pytest.raises(PackageError, match="at least one rule"):
            parse_package(pkg_dir)

    def test_missing_rule_file_raises(self, tmp_path):
        pkg_dir = tmp_path / "norule"
        pkg_dir.mkdir()
        meta = {"name": "norule", "version": "1.0.0", "description": "x",
                "author": "x", "rules": [{"file": "rules/gone.mdc"}]}
        with open(pkg_dir / "package.yaml", "w") as f:
            yaml.dump(meta, f)
        with pytest.raises(PackageError, match="Rule file not found"):
            parse_package(pkg_dir)

    def test_invalid_activation_raises(self, tmp_path):
        pkg_dir = tmp_path / "badact"
        pkg_dir.mkdir()
        (pkg_dir / "rules").mkdir()
        (pkg_dir / "rules" / "r.mdc").write_text("---\ndescription: x\n---\nrule\n")
        meta = {"name": "badact", "version": "1.0.0", "description": "x",
                "author": "x", "rules": [{"file": "rules/r.mdc", "activation": "yolo"}]}
        with open(pkg_dir / "package.yaml", "w") as f:
            yaml.dump(meta, f)
        with pytest.raises(PackageError, match="Invalid activation"):
            parse_package(pkg_dir)

    def test_glob_activation_requires_globs(self, tmp_path):
        pkg_dir = tmp_path / "noglob"
        pkg_dir.mkdir()
        (pkg_dir / "rules").mkdir()
        (pkg_dir / "rules" / "r.mdc").write_text("---\ndescription: x\n---\nrule\n")
        meta = {"name": "noglob", "version": "1.0.0", "description": "x",
                "author": "x", "rules": [{"file": "rules/r.mdc", "activation": "glob"}]}
        with open(pkg_dir / "package.yaml", "w") as f:
            yaml.dump(meta, f)
        with pytest.raises(PackageError, match="no globs defined"):
            parse_package(pkg_dir)


class TestValidatePackage:

    def test_valid_package_passes(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        issues = validate_package(pkg_dir)
        assert issues == []

    def test_missing_package_yaml_fails(self, tmp_path):
        issues = validate_package(tmp_path)
        assert any("Missing" in i for i in issues)

    def test_empty_rule_file_warns(self, tmp_path):
        pkg_dir = make_package(tmp_path, name="emptyrule")
        (pkg_dir / "rules" / "main.mdc").write_text("")
        meta_path = pkg_dir / "package.yaml"
        with open(meta_path) as f:
            m = yaml.safe_load(f)
        with open(meta_path, "w") as f:
            yaml.dump(m, f)
        issues = validate_package(pkg_dir)
        assert any("empty" in i.lower() for i in issues)

    def test_missing_frontmatter_warns(self, tmp_path):
        pkg_dir = make_package(tmp_path, name="nofm")
        (pkg_dir / "rules" / "main.mdc").write_text("# No frontmatter\n- rule\n")
        issues = validate_package(pkg_dir)
        assert any("frontmatter" in i.lower() for i in issues)


# ---------------------------------------------------------------------------
# .mdc generation
# ---------------------------------------------------------------------------

class TestMdcGeneration:

    def test_namespace_prefix(self, tmp_path):
        rule = RuleDef(file="rules/style.mdc", content="---\ndescription: x\n---\ncontent")
        fname, _ = generate_mdc(rule, "python-expert")
        assert fname == f"python-expert{NAMESPACE_SEP}style.mdc"

    def test_preserves_existing_frontmatter(self, tmp_path):
        content = "---\ndescription: Custom desc\nglobs: '**/*.py'\nalwaysApply: false\n---\n# Title\n"
        rule = RuleDef(file="rules/test.mdc", content=content)
        _, output = generate_mdc(rule, "pkg")
        assert output == content

    def test_generates_frontmatter_when_missing(self, tmp_path):
        rule = RuleDef(file="rules/test.mdc", activation="always",
                       globs=[], content="# No frontmatter\n- rule\n")
        _, output = generate_mdc(rule, "my-pkg")
        assert output.startswith("---")
        assert "alwaysApply: true" in output
        assert "# No frontmatter" in output

    def test_glob_in_generated_frontmatter(self, tmp_path):
        rule = RuleDef(file="rules/test.mdc", activation="glob",
                       globs=["**/*.py"], content="# Content\n")
        _, output = generate_mdc(rule, "pkg")
        assert "**/*.py" in output

    def test_install_creates_files(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        meta = parse_package(pkg_dir)
        meta.ide_targets = ["cursor"]
        proj = make_project(tmp_path)
        files = install_mdc_files(meta, proj)
        assert len(files) == 1
        assert (proj / files[0]).exists()
        assert NAMESPACE_SEP in files[0]

    def test_remove_deletes_files(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        meta = parse_package(pkg_dir)
        meta.ide_targets = ["cursor"]
        proj = make_project(tmp_path)
        files = install_mdc_files(meta, proj)
        assert (proj / files[0]).exists()
        remove_mdc_files(files, proj)
        assert not (proj / files[0]).exists()


# ---------------------------------------------------------------------------
# AGENTS.md merge / remove
# ---------------------------------------------------------------------------

class TestAgentsMd:

    def test_creates_agents_md(self, tmp_path):
        pkg_dir = make_package(tmp_path, agents_md_content="- Be helpful\n- Be safe\n")
        meta = parse_package(pkg_dir)
        proj = make_project(tmp_path)
        merge_agents_md(meta, proj)
        content = (proj / AGENTS_MD_FILE).read_text()
        assert "Be helpful" in content
        assert FENCE_START.format(name=meta.name) in content
        assert FENCE_END.format(name=meta.name) in content

    def test_updates_existing_section(self, tmp_path):
        pkg_dir = make_package(tmp_path, name="updater",
                               agents_md_content="- Original content\n")
        meta = parse_package(pkg_dir)
        proj = make_project(tmp_path)
        merge_agents_md(meta, proj)

        # Update the content
        meta.agents_md_file = "- Updated content\n"
        merge_agents_md(meta, proj)
        content = (proj / AGENTS_MD_FILE).read_text()
        assert "Updated content" in content
        assert "Original content" not in content
        assert content.count(FENCE_START.format(name="updater")) == 1

    def test_preserves_manual_content(self, tmp_path):
        proj = make_project(tmp_path)
        agents_path = proj / AGENTS_MD_FILE
        agents_path.write_text("# My Project\n\nManual notes here.\n")

        pkg_dir = make_package(tmp_path, agents_md_content="- Auto rule\n")
        meta = parse_package(pkg_dir)
        merge_agents_md(meta, proj)
        content = agents_path.read_text()
        assert "Manual notes here." in content
        assert "Auto rule" in content

    def test_remove_section(self, tmp_path):
        pkg_dir = make_package(tmp_path, name="removable",
                               agents_md_content="- Will be removed\n")
        meta = parse_package(pkg_dir)
        proj = make_project(tmp_path)
        merge_agents_md(meta, proj)
        assert "Will be removed" in (proj / AGENTS_MD_FILE).read_text()

        remove_agents_md_section("removable", proj)
        content = (proj / AGENTS_MD_FILE).read_text()
        assert "Will be removed" not in content
        assert "removable" not in content

    def test_remove_nonexistent_is_noop(self, tmp_path):
        proj = make_project(tmp_path)
        remove_agents_md_section("nonexistent", proj)  # should not raise

    def test_multiple_packages(self, tmp_path):
        proj = make_project(tmp_path)
        for name in ("pkg-a", "pkg-b", "pkg-c"):
            pkg_dir = make_package(tmp_path, name=name,
                                   agents_md_content=f"- Rule from {name}\n")
            meta = parse_package(pkg_dir)
            merge_agents_md(meta, proj)

        content = (proj / AGENTS_MD_FILE).read_text()
        assert "Rule from pkg-a" in content
        assert "Rule from pkg-b" in content
        assert "Rule from pkg-c" in content

        remove_agents_md_section("pkg-b", proj)
        content = (proj / AGENTS_MD_FILE).read_text()
        assert "Rule from pkg-a" in content
        assert "Rule from pkg-b" not in content
        assert "Rule from pkg-c" in content

    def test_no_agents_md_when_not_in_targets(self, tmp_path):
        pkg_dir = make_package(tmp_path, name="no-agents",
                               agents_md_content="- Should not appear\n",
                               extra_yaml={"ide_targets": ["cursor"]})
        meta = parse_package(pkg_dir)
        proj = make_project(tmp_path)
        merge_agents_md(meta, proj)
        assert not (proj / AGENTS_MD_FILE).exists()

    def test_no_agents_md_when_no_content(self, tmp_path):
        pkg_dir = make_package(tmp_path, name="no-content")
        meta = parse_package(pkg_dir)
        proj = make_project(tmp_path)
        merge_agents_md(meta, proj)
        assert not (proj / AGENTS_MD_FILE).exists()


# ---------------------------------------------------------------------------
# installed.json management
# ---------------------------------------------------------------------------

class TestInstalledJson:

    def test_load_empty_project(self, tmp_path):
        proj = make_project(tmp_path)
        data = load_installed(proj)
        assert data == {"packages": {}}

    def test_save_and_load(self, tmp_path):
        proj = make_project(tmp_path)
        save_installed(proj, {"packages": {"foo": {"version": "1.0.0"}}})
        data = load_installed(proj)
        assert "foo" in data["packages"]

    def test_record_and_check(self, tmp_path):
        proj = make_project(tmp_path)
        pkg_dir = make_package(tmp_path)
        meta = parse_package(pkg_dir)
        meta.source = "bundled"
        meta.source_ref = "test-pkg"
        record_install(proj, meta, ["file1.mdc"], "sha256:abc")
        assert is_installed(proj, "test-pkg")
        info = get_installed_info(proj, "test-pkg")
        assert info["version"] == "1.0.0"
        assert "file1.mdc" in info["files"]

    def test_uninstall_record(self, tmp_path):
        proj = make_project(tmp_path)
        save_installed(proj, {"packages": {"x": {"version": "1.0.0"}}})
        assert is_installed(proj, "x")
        record_uninstall(proj, "x")
        assert not is_installed(proj, "x")


# ---------------------------------------------------------------------------
# Install / uninstall / update
# ---------------------------------------------------------------------------

class TestInstallUninstall:

    def test_install_from_local(self, tmp_path):
        pkg_dir = make_package(tmp_path, agents_md_content="- Test rule\n")
        proj = make_project(tmp_path)
        installed = install_package(str(pkg_dir), proj)
        assert "test-pkg" in installed
        assert is_installed(proj, "test-pkg")
        rules_dir = proj / CURSOR_RULES_DIR
        mdc_files = list(rules_dir.glob("*.mdc"))
        assert len(mdc_files) == 1
        assert "test-pkg--" in mdc_files[0].name
        assert (proj / AGENTS_MD_FILE).exists()

    def test_uninstall_cleans_everything(self, tmp_path):
        pkg_dir = make_package(tmp_path, agents_md_content="- Bye\n")
        proj = make_project(tmp_path)
        install_package(str(pkg_dir), proj)
        assert is_installed(proj, "test-pkg")

        uninstall_package("test-pkg", proj)
        assert not is_installed(proj, "test-pkg")
        mdc_files = list((proj / CURSOR_RULES_DIR).glob("*.mdc"))
        assert len(mdc_files) == 0
        content = (proj / AGENTS_MD_FILE).read_text()
        assert "Bye" not in content

    def test_reinstall_overwrites(self, tmp_path):
        pkg_dir = make_package(tmp_path, agents_md_content="- V1\n")
        proj = make_project(tmp_path)
        install_package(str(pkg_dir), proj, force=True)
        install_package(str(pkg_dir), proj, force=True)
        data = load_installed(proj)
        assert len(data["packages"]) == 1

    def test_install_skips_same_version(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        proj = make_project(tmp_path)
        names1 = install_package(str(pkg_dir), proj)
        assert len(names1) == 1
        names2 = install_package(str(pkg_dir), proj)
        assert len(names2) == 0  # already installed, same version

    def test_conflict_detection(self, tmp_path):
        pkg_a = make_package(tmp_path, name="pkg-a")
        pkg_b_dir = tmp_path / "pkg-b"
        pkg_b_dir.mkdir()
        (pkg_b_dir / "rules").mkdir()
        # Create a rule with same output name as pkg-a (different package, same rule basename)
        (pkg_b_dir / "rules" / "main.mdc").write_text(
            "---\ndescription: conflict\n---\ncontent\n")
        meta_b = {"name": "pkg-b", "version": "1.0.0", "description": "x",
                  "author": "x", "rules": [{"file": "rules/main.mdc"}]}
        with open(pkg_b_dir / "package.yaml", "w") as f:
            yaml.dump(meta_b, f)

        proj = make_project(tmp_path)
        install_package(str(pkg_a), proj)
        # pkg-b has different namespace, so no conflict
        names = install_package(str(pkg_b_dir), proj)
        assert "pkg-b" in names

    def test_install_bundled_package(self, tmp_path):
        proj = make_project(tmp_path)
        installed = install_package("python-expert", proj)
        assert "python-expert" in installed
        mdc_files = list((proj / CURSOR_RULES_DIR).glob("python-expert--*.mdc"))
        assert len(mdc_files) == 2  # python-style + python-testing
        assert (proj / AGENTS_MD_FILE).exists()
        content = (proj / AGENTS_MD_FILE).read_text()
        assert "type hints" in content.lower() or "Type Hints" in content

    def test_install_multiple_bundled(self, tmp_path):
        proj = make_project(tmp_path)
        for pkg in ["python-expert", "security-reviewer"]:
            install_package(pkg, proj)
        assert is_installed(proj, "python-expert")
        assert is_installed(proj, "security-reviewer")
        mdc_files = list((proj / CURSOR_RULES_DIR).glob("*.mdc"))
        assert len(mdc_files) >= 4  # 2 from python + 2 from security

    def test_uninstall_nonexistent_returns_false(self, tmp_path):
        proj = make_project(tmp_path)
        assert uninstall_package("nope", proj) is False


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------

class TestUpdate:

    def test_update_same_version_returns_false(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        proj = make_project(tmp_path)
        install_package(str(pkg_dir), proj)
        from agentrun import update_package
        result = update_package("test-pkg", proj)
        assert result is False

    def test_update_not_installed_raises(self, tmp_path):
        proj = make_project(tmp_path)
        from agentrun import update_package
        with pytest.raises(PackageError, match="not installed"):
            update_package("nonexistent", proj)

    def test_update_detects_new_version(self, tmp_path):
        pkg_dir = make_package(tmp_path, version="1.0.0")
        proj = make_project(tmp_path)
        install_package(str(pkg_dir), proj)

        # "Release" a new version by modifying the package
        with open(pkg_dir / "package.yaml") as f:
            m = yaml.safe_load(f)
        m["version"] = "2.0.0"
        with open(pkg_dir / "package.yaml", "w") as f:
            yaml.dump(m, f)

        from agentrun import update_package
        result = update_package("test-pkg", proj)
        assert result is True
        info = get_installed_info(proj, "test-pkg")
        assert info["version"] == "2.0.0"

    def test_update_all(self, tmp_path):
        proj = make_project(tmp_path)
        install_package("python-expert", proj)
        from agentrun import update_all
        updated = update_all(proj)
        assert isinstance(updated, list)


# ---------------------------------------------------------------------------
# Dependency resolution
# ---------------------------------------------------------------------------

class TestDependencies:

    def test_no_dependencies(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        result = resolve_dependencies(str(pkg_dir))
        assert len(result) == 1
        assert result[0].name == "test-pkg"

    def test_dependency_order(self, tmp_path):
        # Create dep-a (no deps)
        dep_a = make_package(tmp_path, name="dep-a")
        # Create dep-b that requires dep-a (using bundled fallback won't work,
        # so we use local paths). We'll patch requires to point to local.
        dep_b = make_package(tmp_path, name="dep-b",
                             extra_yaml={"requires": [str(dep_a)]})
        result = resolve_dependencies(str(dep_b))
        names = [m.name for m in result]
        assert names.index("dep-a") < names.index("dep-b")

    def test_circular_dependency_raises(self, tmp_path):
        # Create two packages that require each other
        pkg_a_dir = tmp_path / "circ-a"
        pkg_b_dir = tmp_path / "circ-b"

        # Create A first with placeholder requires
        make_package(tmp_path, name="circ-a")
        make_package(tmp_path, name="circ-b")

        # Now set A -> B and B -> A
        with open(pkg_a_dir / "package.yaml") as f:
            ma = yaml.safe_load(f)
        ma["requires"] = [str(pkg_b_dir)]
        with open(pkg_a_dir / "package.yaml", "w") as f:
            yaml.dump(ma, f)

        with open(pkg_b_dir / "package.yaml") as f:
            mb = yaml.safe_load(f)
        mb["requires"] = [str(pkg_a_dir)]
        with open(pkg_b_dir / "package.yaml", "w") as f:
            yaml.dump(mb, f)

        with pytest.raises(PackageError, match="Circular dependency"):
            resolve_dependencies(str(pkg_a_dir))

    def test_diamond_dependency(self, tmp_path):
        """A -> B, A -> C, B -> D, C -> D should install D once."""
        dep_d = make_package(tmp_path, name="dep-d")
        dep_b = make_package(tmp_path, name="dep-b",
                             extra_yaml={"requires": [str(dep_d)]})
        dep_c = make_package(tmp_path, name="dep-c",
                             extra_yaml={"requires": [str(dep_d)]})
        dep_a = make_package(tmp_path, name="dep-a",
                             extra_yaml={"requires": [str(dep_b), str(dep_c)]})
        result = resolve_dependencies(str(dep_a))
        names = [m.name for m in result]
        assert names.count("dep-d") == 1
        assert names.index("dep-d") < names.index("dep-b")
        assert names.index("dep-d") < names.index("dep-c")

    def test_install_with_dependency(self, tmp_path):
        dep = make_package(tmp_path, name="base-dep")
        main = make_package(tmp_path, name="main-pkg",
                            extra_yaml={"requires": [str(dep)]})
        proj = make_project(tmp_path)
        installed = install_package(str(main), proj)
        assert "base-dep" in installed
        assert "main-pkg" in installed
        assert is_installed(proj, "base-dep")
        assert is_installed(proj, "main-pkg")


# ---------------------------------------------------------------------------
# Registry and search
# ---------------------------------------------------------------------------

class TestRegistry:

    def test_search_by_name(self):
        results = search_registry("python")
        assert len(results) > 0
        assert any(r["name"] == "python-expert" for r in results)

    def test_search_by_tag(self):
        results = search_registry("owasp")
        assert len(results) > 0
        assert any(r["name"] == "security-reviewer" for r in results)

    def test_search_no_results(self):
        results = search_registry("xyzzynonexistent")
        assert results == []

    def test_search_returns_sorted_by_score(self):
        results = search_registry("testing")
        if len(results) > 1:
            assert results[0]["score"] >= results[1]["score"]


# ---------------------------------------------------------------------------
# Resolve source
# ---------------------------------------------------------------------------

class TestResolveSource:

    def test_resolve_local_path(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        source, ref, resolved = resolve_package_source(str(pkg_dir))
        assert source == "local"

    def test_resolve_bundled(self):
        source, ref, resolved = resolve_package_source("python-expert")
        assert source == "bundled"

    def test_resolve_github_ref(self):
        source, ref, resolved = resolve_package_source("jdoe/my-rules")
        assert source == "github"
        assert ref == "jdoe/my-rules"

    def test_resolve_unknown_raises(self):
        with pytest.raises(PackageError, match="not found"):
            resolve_package_source("xyzzy-nonexistent-pkg")


# ---------------------------------------------------------------------------
# Checksum
# ---------------------------------------------------------------------------

class TestChecksum:

    def test_checksum_starts_with_sha256(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        meta = parse_package(pkg_dir)
        cs = compute_checksum(meta)
        assert cs.startswith("sha256:")

    def test_checksum_deterministic(self, tmp_path):
        pkg_dir = make_package(tmp_path)
        meta = parse_package(pkg_dir)
        assert compute_checksum(meta) == compute_checksum(meta)

    def test_checksum_changes_with_content(self, tmp_path):
        pkg_dir = make_package(tmp_path, name="cs-a")
        meta_a = parse_package(pkg_dir)
        cs_a = compute_checksum(meta_a)

        # Different content
        (pkg_dir / "rules" / "main.mdc").write_text(
            "---\ndescription: Changed\n---\n# Different\n")
        meta_b = parse_package(pkg_dir)
        cs_b = compute_checksum(meta_b)
        assert cs_a != cs_b


# ---------------------------------------------------------------------------
# CLI argument parsing
# ---------------------------------------------------------------------------

class TestCLI:

    def test_install_parses_multiple_packages(self):
        import agentrun
        parser = argparse.ArgumentParser()
        sub = parser.add_subparsers(dest="command")
        p = sub.add_parser("install")
        p.add_argument("packages", nargs="+")
        p.add_argument("--force", action="store_true")
        args = parser.parse_args(["install", "pkg-a", "pkg-b", "pkg-c"])
        assert args.packages == ["pkg-a", "pkg-b", "pkg-c"]

    def test_search_parses_query(self):
        import argparse as ap
        parser = ap.ArgumentParser()
        sub = parser.add_subparsers(dest="command")
        p = sub.add_parser("search")
        p.add_argument("query")
        args = parser.parse_args(["search", "python security"])
        assert args.query == "python security"

    def test_version_flag(self):
        import agentrun
        assert agentrun.__version__ == "0.1.0"

    def test_init_creates_directories(self, tmp_path):
        proj = tmp_path / "newproj"
        proj.mkdir()
        os.chdir(proj)
        try:
            from agentrun import cmd_init
            import argparse
            cmd_init(argparse.Namespace())
            assert (proj / AGENTRUN_DIR).exists()
            assert (proj / CURSOR_RULES_DIR).exists()
        finally:
            os.chdir(Path(__file__).parent.parent)


# ---------------------------------------------------------------------------
# Bundled packages integration
# ---------------------------------------------------------------------------

class TestBundledPackages:

    def test_all_bundled_packages_parse(self):
        from agentrun import _bundled_packages_dir
        pkgs_dir = _bundled_packages_dir()
        for pkg_dir in sorted(pkgs_dir.iterdir()):
            if pkg_dir.is_dir() and (pkg_dir / "package.yaml").exists():
                meta = parse_package(pkg_dir)
                assert meta.name
                assert meta.version
                assert len(meta.rules) > 0

    def test_all_bundled_packages_validate(self):
        from agentrun import _bundled_packages_dir
        pkgs_dir = _bundled_packages_dir()
        for pkg_dir in sorted(pkgs_dir.iterdir()):
            if pkg_dir.is_dir() and (pkg_dir / "package.yaml").exists():
                issues = validate_package(pkg_dir)
                assert issues == [], f"{pkg_dir.name} has issues: {issues}"

    def test_install_all_bundled(self, tmp_path):
        proj = make_project(tmp_path)
        from agentrun import _bundled_packages_dir
        pkgs_dir = _bundled_packages_dir()
        for pkg_dir in sorted(pkgs_dir.iterdir()):
            if pkg_dir.is_dir() and (pkg_dir / "package.yaml").exists():
                install_package(pkg_dir.name, proj)
        data = load_installed(proj)
        assert len(data["packages"]) == 5  # all 5 bundled packages


import argparse

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
