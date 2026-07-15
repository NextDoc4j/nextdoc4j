#!/usr/bin/env python3
"""Assert published nextdoc4j-bom flattened POM is a thin BOM (own modules only)."""
from __future__ import annotations

import sys
import xml.etree.ElementTree as ET

# Third-party / platform groups that must never appear in this BOM's DM
FORBIDDEN_GROUP_PREFIXES = (
    "org.springframework",
    "org.springdoc",
    "io.projectreactor",
    "cn.hutool",
    "cn.dev33",
    "io.swagger",
)


def local(tag: str) -> str:
    return tag.rsplit("}", 1)[-1] if "}" in tag else tag


def text(el: ET.Element | None) -> str:
    return (el.text or "").strip() if el is not None else ""


def children(el: ET.Element, name: str):
    return [c for c in list(el) if local(c.tag) == name]


def find_child(el: ET.Element, name: str) -> ET.Element | None:
    for c in list(el):
        if local(c.tag) == name:
            return c
    return None


def main(path: str) -> int:
    tree = ET.parse(path)
    root = tree.getroot()

    parent = find_child(root, "parent")
    if parent is not None:
        parent_aid = text(find_child(parent, "artifactId"))
        # thin BOM must not re-attach the reactor root parent that carries platform BOMs
        if parent_aid == "nextdoc4j":
            print(f"FAIL: flattened BOM still parents nextdoc4j (would inherit platform DM): {path}")
            return 1

    dm = find_child(root, "dependencyManagement")
    if dm is None:
        print("FAIL: no dependencyManagement")
        return 1
    deps_el = find_child(dm, "dependencies")
    if deps_el is None:
        print("FAIL: empty dependencyManagement")
        return 1

    deps = children(deps_el, "dependency")
    if not deps:
        print("FAIL: no managed dependencies")
        return 1

    bad = []
    for dep in deps:
        gid = text(find_child(dep, "groupId"))
        aid = text(find_child(dep, "artifactId"))
        if gid != "top.nextdoc4j":
            bad.append(f"{gid}:{aid} (groupId must be top.nextdoc4j)")
            continue
        for prefix in FORBIDDEN_GROUP_PREFIXES:
            if gid == prefix or gid.startswith(prefix + "."):
                bad.append(f"{gid}:{aid} (forbidden group prefix {prefix!r})")
                break

    if bad:
        print("FAIL: non-thin managed deps:")
        for line in bad:
            print("  -", line)
        return 1

    print(f"OK: thin BOM {path} manages {len(deps)} top.nextdoc4j artifacts, no parent nextdoc4j")
    return 0


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("usage: assert_thin_bom.py <flattened-pom.xml>")
        sys.exit(2)
    sys.exit(main(sys.argv[1]))
