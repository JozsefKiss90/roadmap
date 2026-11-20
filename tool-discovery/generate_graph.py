"""Generates the graph JSON from the tool matrix CSV.

Usage: python tool-discovery/generate_graph.py [--date YYYY-MM-DD] [--out PATH]

Reads tool-matrix.csv, clusters.json, needs.json and overlaps.json from this
folder and writes tool-framework.graph.json beside them. README.md in this
folder says which of these files are edited by hand. Standard library only.
"""
import argparse
import csv
import datetime
import itertools
import json
import math
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

TITLE = "Hermes OS tool discovery: meta framework"
NOTE = (
    "Repository facts (existence, stars, last commit, licence file) were read on 2026-11-17. "
    'Decisions marked "Proposed here" are recommendations, not accepted ADRs.'
)
ROOT = {"id": "root", "type": "root", "label": "Agentic OS tool framework"}

# Code and the name the CSV uses, in the order the nodes are written.
ROLES = [("A", "Architect"), ("D", "Designer"), ("M", "Analyst")]
STREAMS = [
    ("OS", "Hermes OS and RAG Factory"),
    ("Build", "Product build and ship"),
    ("Deliver", "Client delivery"),
    ("GTM", "Go-to-market"),
    ("Enable", "Enablement and training"),
    ("Resilience", "Personal resilience"),
]
PHASES = ["P0", "P1", "P2", "P3", "P4"]

COLUMNS = [
    "Tool", "Tier", "Cluster", "Decision class", "Needs", "Used by", "Capability", "Kind",
    "Best fit", "Hosting", "Operated by", "Value stream", "Gate", "Decision as recorded",
    "Decision source", "Origin", "Repository", "Stars", "Last commit", "Licence file",
    "Verification", "Implements cluster", "Note", "Cluster ID", "ID",
]


class GeneratorError(Exception):
    """The inputs cannot be turned into a graph. `problems` lists every reason found."""

    def __init__(self, problems):
        super().__init__("\n".join(problems))
        self.problems = problems


def split_list(cell):
    """A comma-separated cell as a list of trimmed, non-empty items."""
    return [item.strip() for item in cell.split(",") if item.strip()]


def repeated(items):
    """The items that appear more than once, each named once, in order."""
    return [item for index, item in enumerate(items) if item in items[:index] and item not in items[index + 1:]]


def parse_phases(text):
    """'P2', 'P2-P3' or 'P1, P3' as a sorted list of phases; None if the text is not one of those.

    Accepts what parsePhases in framework-map/src/validate.ts accepts.
    """
    numbers = set()
    for part in split_list(text):
        match = re.fullmatch(r"P([0-4])(?:-P([0-4]))?", part)
        if not match:
            return None
        first = int(match.group(1))
        last = first
        if match.group(2):
            last = int(match.group(2))
            if last <= first:
                return None
        numbers.update(range(first, last + 1))
    return [f"P{number}" for number in sorted(numbers)] or None


def axes(cluster_count, needs):
    need_ids = f"{needs[0]['id']} to {needs[-1]['id']}" if needs else "None"
    rows = [
        ("Tier", "T7 to T0", "Abstraction level, from autonomous optimisation down to substrate",
         "Height (z): one horizontal plane per tier"),
        ("Cluster", f"{cluster_count} clusters", "Capability family inside a tier",
         "Sector on the plane; cluster node is the hub of its tools"),
        ("Kind",
         "Skill, plug-in, subagent, hook, MCP server, library, framework, app, model, standard, internal build",
         "What sort of thing it is", "Node shape"),
        ("Decision class",
         "Core v1, Core later, Adapter, Skill / rule, Build, Optional / benchmark, Delay / guarded, "
         "Reference / concept, Out of scope, Unverified",
         "Commitment, in the status vocabulary of the Hermes catalogue",
         "Opacity and outline: committed solid, optional faint, guarded dashed"),
        ("Used by", ", ".join(name for _, name in ROLES), "Which partners work with it",
         "Colour; shared tools take a blended ring"),
        ("Operated by", ", ".join(name for _, name in ROLES), "Who installs, hosts and maintains it",
         "Filter"),
        ("Hosting", "Hub, Spoke, Cloud, Client",
         "Where it runs: József's workstation, a partner machine, a managed service, a client environment",
         "Radial ring within the sector"),
        ("Value stream", ", ".join(name for _, name in STREAMS), "Which part of the business it serves",
         "Filter and optional sector grouping"),
        ("Needs", need_ids, "Roadmap capability needs the tool helps with",
         "Edges to need nodes on a side panel"),
        ("Phase", f"{PHASES[0]} to {PHASES[-1]}", "Roadmap phase, inherited from the need",
         "Time slider that lights up needs and their tools"),
        ("Gate", "None, admission review, licence check, guarded, operator approval",
         "What must happen before the tool is switched on", "Warning badge"),
        ("Evidence", "Verification, repository, stars, last commit, licence file",
         "What was read on 2026-11-17; licence is keyword-detected from the licence file",
         "Node size from log(stars); stale repos desaturated"),
    ]
    return [dict(zip(("axis", "values", "meaning", "encoding"), row)) for row in rows]


def tool_node(row, where, cluster_labels, problems):
    """One CSV row as a tool node. Anything that cannot be translated is added to `problems`."""
    role_codes = {name: code for code, name in ROLES}
    stream_codes = {name: code for code, name in STREAMS}

    def roles(column):
        codes = []
        for name in split_list(row[column]):
            if name in role_codes:
                codes.append(role_codes[name])
            else:
                problems.append(f"{where}: {column} names {name!r}, which is not a role.")
        return codes

    cluster = row["Cluster ID"]
    if cluster not in cluster_labels:
        problems.append(f"{where}: Cluster ID {cluster!r} is not in the clusters file.")
    elif row["Cluster"] != cluster_labels[cluster]:
        problems.append(
            f"{where}: Cluster is {row['Cluster']!r}, but the clusters file names "
            f"{cluster} {cluster_labels[cluster]!r}."
        )

    if row["Best fit"] not in ("", "Yes"):
        problems.append(f"{where}: Best fit is {row['Best fit']!r}; it must be 'Yes' or empty.")

    stream = stream_codes.get(row["Value stream"])
    if stream is None:
        problems.append(f"{where}: Value stream {row['Value stream']!r} is not a value stream.")

    for column in ("Needs", "Implements cluster"):
        for item in repeated(split_list(row[column])):
            problems.append(f"{where}: {column} lists {item!r} more than once.")

    stars = None
    if row["Stars"]:
        if re.fullmatch(r"[0-9]+", row["Stars"]):
            stars = int(row["Stars"])
        else:
            problems.append(f"{where}: Stars is {row['Stars']!r}; it must be a whole number or empty.")

    repo = row["Repository"] or None
    return {
        "id": f"tool:{row['ID']}",
        "type": "tool",
        "label": row["Tool"],
        "tier": row["Tier"],
        "cluster": cluster,
        "kind": row["Kind"],
        "capability": row["Capability"],
        "decision_class": row["Decision class"],
        "decision": row["Decision as recorded"],
        "decision_source": row["Decision source"],
        "best_fit": row["Best fit"] == "Yes",
        "operated_by": roles("Operated by"),
        "used_by": roles("Used by"),
        "hosting": row["Hosting"],
        "stream": stream,
        "gate": row["Gate"],
        "origin": row["Origin"],
        "repo": repo,
        "url": f"https://github.com/{repo}" if repo else None,
        "stars": stars,
        "last_commit": row["Last commit"] or None,
        "licence": row["Licence file"] or None,
        "verification": row["Verification"],
        "note": row["Note"] or None,
        # Mark size on the map: 1 with no repository, then one step per power of ten.
        "size": 1 if stars is None else round(1 + math.log10(stars + 1), 2),
    }


def build_graph(rows, clusters, needs, overlaps, generated):
    """Builds the graph from the parsed inputs.

    rows: the CSV rows as dicts keyed by header. clusters: the clusters file.
    needs: the list in the needs file. overlaps: group name -> tool IDs.
    generated: the date for the metadata. Raises GeneratorError listing every
    input that cannot be translated. The graph validator checks the result.
    """
    problems = []
    tiers = clusters["tiers"]
    cluster_list = clusters["clusters"]
    cluster_labels = {cluster["id"]: cluster["label"] for cluster in cluster_list}

    tools = []
    seen = set()
    for number, row in enumerate(rows, start=2):  # row 1 is the header
        where = f"CSV row {number} ({row['ID'] or row['Tool']!r})"
        if None in row or None in row.values():
            problems.append(f"{where}: the row does not have {len(COLUMNS)} cells, one per column.")
            continue
        if not re.fullmatch(r"[a-z0-9][a-z0-9._-]*", row["ID"]):
            problems.append(
                f"{where}: ID is {row['ID']!r}; it must be lower-case letters, digits, '.', '_' or '-'."
            )
        elif row["ID"] in seen:
            problems.append(f"{where}: ID {row['ID']!r} is used by an earlier row.")
        seen.add(row["ID"])
        tools.append(tool_node(row, where, cluster_labels, problems))

    need_phases = {}
    for need in needs:
        phases = parse_phases(need["phase"])
        if phases is None:
            problems.append(f"Need {need['id']}: phase {need['phase']!r} is not a list of phases P0 to P4.")
        need_phases[need["id"]] = phases or []

    for group, members in overlaps.items():
        for member in members:
            if member not in seen:
                problems.append(f"Overlap group {group!r}: {member!r} is not a tool ID in the CSV.")
        for member in repeated(members):
            problems.append(f"Overlap group {group!r}: {member!r} is listed more than once.")

    tier_ids = {tier["id"] for tier in tiers}
    for cluster in cluster_list:
        if cluster["tier"] not in tier_ids:
            problems.append(f"Cluster {cluster['id']}: tier {cluster['tier']!r} is not in the clusters file.")

    if problems:
        raise GeneratorError(problems)

    tool_counts = {}
    for tool in tools:
        tool_counts[tool["cluster"]] = tool_counts.get(tool["cluster"], 0) + 1
    by_tier = {}
    for cluster in cluster_list:
        by_tier.setdefault(cluster["tier"], []).append(cluster["id"])

    nodes = [dict(ROOT)]
    nodes += [{"id": f"role:{code}", "type": "role", "label": name} for code, name in ROLES]
    nodes += [{"id": f"stream:{code}", "type": "stream", "label": name} for code, name in STREAMS]
    nodes += [{"id": f"phase:{phase}", "type": "phase", "label": phase} for phase in PHASES]
    for tier in tiers:
        nodes.append({
            "id": tier["id"], "type": "tier", "label": tier["label"],
            "description": tier["description"], "layout": {"z": int(tier["id"][1:])},
        })
    for cluster in cluster_list:
        siblings = by_tier[cluster["tier"]]
        nodes.append({
            "id": cluster["id"], "type": "cluster", "label": cluster["label"], "tier": cluster["tier"],
            "operated_by": cluster["operated_by"], "used_by": cluster["used_by"],
            "hosting": cluster["hosting"], "stream": cluster["stream"], "gate": cluster["gate"],
            "tools": tool_counts.get(cluster["id"], 0),
            # Order only, not coordinates (ADR 0002): the cluster's place among its tier's clusters.
            "layout": {
                "z": int(cluster["tier"][1:]),
                "sector": siblings.index(cluster["id"]),
                "sectors": len(siblings),
            },
        })
    for need in needs:
        nodes.append({"id": need["id"], "type": "need", **{k: v for k, v in need.items() if k != "id"}})
    nodes += tools

    def edge(source, target, edge_type, **extra):
        return {"source": source, "target": target, "type": edge_type, **extra}

    edges = [edge("root", tier["id"], "contains") for tier in tiers]
    for cluster in cluster_list:
        edges.append(edge(cluster["tier"], cluster["id"], "contains"))
        edges += [edge(f"role:{code}", cluster["id"], "operates") for code in cluster["operated_by"]]
        edges += [edge(f"role:{code}", cluster["id"], "uses") for code in cluster["used_by"]]
        edges.append(edge(cluster["id"], f"stream:{cluster['stream']}", "serves_stream"))
    for need in needs:
        edges.append(edge(need["id"], need["home_cluster"], "homed_in"))
        edges += [edge(need["id"], f"phase:{phase}", "scheduled_in") for phase in need_phases[need["id"]]]
    for row, tool in zip(rows, tools):
        edges.append(edge(tool["cluster"], tool["id"], "contains"))
        edges += [
            edge(tool["id"], need_id, "serves", best_fit=tool["best_fit"])
            for need_id in split_list(row["Needs"])
        ]
        edges += [
            edge(tool["id"], cluster_id, "implements")
            for cluster_id in split_list(row["Implements cluster"])
        ]
    for group, members in overlaps.items():
        edges += [
            edge(f"tool:{first}", f"tool:{second}", "overlaps", group=group)
            for first, second in itertools.combinations(members, 2)
        ]

    return {
        "meta": {
            "title": TITLE,
            "generated": generated,
            "note": NOTE,
            "counts": {
                "tools": len(tools),
                "clusters": len(cluster_list),
                "tiers": len(tiers),
                "needs": len(needs),
                "edges": len(edges),
            },
            "edge_types": sorted({e["type"] for e in edges}),
            "node_types": sorted({n["type"] for n in nodes}),
        },
        "axes": axes(len(cluster_list), needs),
        "nodes": nodes,
        "edges": edges,
    }


def read_rows(path):
    try:
        with open(path, encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            rows = list(reader)
    except (OSError, ValueError, csv.Error) as error:
        raise GeneratorError([f"{path}: cannot be read: {error}"]) from error
    missing = [column for column in COLUMNS if column not in (reader.fieldnames or [])]
    if missing:
        raise GeneratorError([f"{path}: missing column(s): {', '.join(missing)}."])
    return rows


def read_json(path, *keys):
    """The JSON file at `path`, which must be an object holding each of `keys`."""
    try:
        with open(path, encoding="utf-8") as file:
            content = json.load(file)
    except (OSError, ValueError) as error:
        raise GeneratorError([f"{path}: cannot be read: {error}"]) from error
    missing = [key for key in keys if not isinstance(content, dict) or key not in content]
    if missing:
        raise GeneratorError([f"{path}: missing {', '.join(repr(key) for key in missing)}."])
    return content


def iso_date(text):
    return datetime.date.fromisoformat(text).isoformat()


def main(argv=None):
    parser = argparse.ArgumentParser(description="Generate the graph JSON from the tool matrix CSV.")
    parser.add_argument("--csv", type=Path, default=HERE / "tool-matrix.csv")
    parser.add_argument("--clusters", type=Path, default=HERE / "clusters.json")
    parser.add_argument("--needs", type=Path, default=HERE / "needs.json")
    parser.add_argument("--overlaps", type=Path, default=HERE / "overlaps.json")
    parser.add_argument("--out", type=Path, default=HERE / "tool-framework.graph.json")
    parser.add_argument("--date", type=iso_date, default=datetime.date.today().isoformat(),
                        help="generation date for the metadata (default: today)")
    args = parser.parse_args(argv)

    try:
        graph = build_graph(
            read_rows(args.csv),
            read_json(args.clusters, "tiers", "clusters"),
            read_json(args.needs, "needs")["needs"],
            read_json(args.overlaps, "groups")["groups"],
            args.date,
        )
    except KeyError as error:
        print(f"Cannot generate the graph: an entry in an input file lacks the field {error}.", file=sys.stderr)
        return 1
    except GeneratorError as error:
        print(f"Cannot generate the graph: {len(error.problems)} problem(s).", file=sys.stderr)
        for problem in error.problems:
            print(f"  - {problem}", file=sys.stderr)
        return 1

    with open(args.out, "w", encoding="utf-8", newline="\n") as file:
        json.dump(graph, file, ensure_ascii=False, indent=1)
    counts = graph["meta"]["counts"]
    print(f"Wrote {args.out}: {counts['tools']} tools, {counts['clusters']} clusters, "
          f"{counts['needs']} needs, {counts['edges']} edges.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
