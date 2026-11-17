"""Tests for the graph generator. Run: python -m unittest discover tool-discovery"""
import csv
import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from generate_graph import GeneratorError, build_graph

HERE = Path(__file__).resolve().parent

CLUSTERS = {
    "tiers": [
        {"id": "T1", "label": "Upper", "description": "The upper tier."},
        {"id": "T0", "label": "Lower", "description": "The lower tier."},
    ],
    "clusters": [
        {"id": "0A", "label": "Models", "tier": "T0", "operated_by": ["A"], "used_by": ["A", "D"],
         "hosting": "Cloud", "stream": "OS", "gate": "None"},
        {"id": "0B", "label": "Hosts", "tier": "T0", "operated_by": ["A"], "used_by": ["A"],
         "hosting": "Hub", "stream": "OS", "gate": "None"},
        {"id": "1A", "label": "Skills", "tier": "T1", "operated_by": ["D"], "used_by": ["M"],
         "hosting": "Hub", "stream": "Build", "gate": "None"},
    ],
}

NEEDS = [
    {"id": "N01", "label": "Review", "domain": "Engineering roles", "phase": "P1-P2", "verdict": "Adopt",
     "lead_role": "A", "home_cluster": "1A", "approach": "Do it.", "gap": "None.", "source": "S1"},
]


def row(**changes):
    """One CSV row for a tool in cluster 0A; keyword arguments replace columns by header."""
    base = {
        "Tool": "Alpha", "Tier": "T0", "Cluster": "Models", "Decision class": "Core v1", "Needs": "",
        "Used by": "Architect", "Capability": "Does alpha things", "Kind": "Library", "Best fit": "",
        "Hosting": "Hub", "Operated by": "Architect", "Value stream": "Hermes OS and RAG Factory",
        "Gate": "None", "Decision as recorded": "Core v1", "Decision source": "Proposed here",
        "Origin": "Discovery", "Repository": "", "Stars": "", "Last commit": "", "Licence file": "",
        "Verification": "Vendor docs read", "Implements cluster": "", "Note": "", "Cluster ID": "0A",
        "ID": "alpha",
    }
    for header, value in changes.items():
        base[header.replace("_", " ")] = value
    return base


def build(rows, overlaps=None):
    return build_graph(rows, CLUSTERS, NEEDS, overlaps or {}, "2026-01-02")


def node(graph, node_id):
    return next(n for n in graph["nodes"] if n["id"] == node_id)


def edges(graph, edge_type):
    return [e for e in graph["edges"] if e["type"] == edge_type]


class ToolNodes(unittest.TestCase):
    def test_a_csv_row_becomes_a_tool_node(self):
        graph = build([row(
            Used_by="Designer, Analyst", Best_fit="Yes", Value_stream="Go-to-market",
            Repository="acme/alpha", Stars="999", Last_commit="2026-05-01", Licence_file="MIT",
            Note="Moved.", Needs="N01",
        )])
        self.assertEqual(node(graph, "tool:alpha"), {
            "id": "tool:alpha", "type": "tool", "label": "Alpha", "tier": "T0", "cluster": "0A",
            "kind": "Library", "capability": "Does alpha things", "decision_class": "Core v1",
            "decision": "Core v1", "decision_source": "Proposed here", "best_fit": True,
            "operated_by": ["A"], "used_by": ["D", "M"], "hosting": "Hub", "stream": "GTM",
            "gate": "None", "origin": "Discovery", "repo": "acme/alpha",
            "url": "https://github.com/acme/alpha", "stars": 999, "last_commit": "2026-05-01",
            "licence": "MIT", "verification": "Vendor docs read", "note": "Moved.", "size": 4.0,
        })

    def test_a_tool_without_a_repository_has_empty_evidence_and_the_smallest_size(self):
        tool = node(build([row(Needs="N01")]), "tool:alpha")
        for field in ("repo", "url", "stars", "last_commit", "licence", "note"):
            self.assertIsNone(tool[field], field)
        self.assertEqual(tool["size"], 1)
        self.assertIs(tool["best_fit"], False)


class ClusterNodes(unittest.TestCase):
    def test_a_cluster_counts_its_tools_and_knows_its_order_on_the_plate(self):
        graph = build([row(Needs="N01"), row(ID="beta", Cluster="Hosts", Cluster_ID="0B"),
                       row(ID="gamma", Cluster="Hosts", Cluster_ID="0B")])
        hosts = node(graph, "0B")
        self.assertEqual(hosts["tools"], 2)
        self.assertEqual(hosts["layout"], {"z": 0, "sector": 1, "sectors": 2})
        self.assertEqual(node(graph, "1A")["tools"], 0)
        self.assertEqual(node(graph, "1A")["layout"], {"z": 1, "sector": 0, "sectors": 1})


class Edges(unittest.TestCase):
    def test_a_tool_is_contained_by_its_cluster_and_linked_to_its_needs(self):
        graph = build([row(Needs="N01", Best_fit="Yes", Implements_cluster="1A, 0B")])
        self.assertIn({"source": "0A", "target": "tool:alpha", "type": "contains"}, graph["edges"])
        self.assertEqual(edges(graph, "serves"),
                         [{"source": "tool:alpha", "target": "N01", "type": "serves", "best_fit": True}])
        self.assertEqual([e["target"] for e in edges(graph, "implements")], ["1A", "0B"])

    def test_a_cluster_is_linked_to_its_tier_roles_and_stream(self):
        graph = build([row(Needs="N01")])
        about_0a = [e for e in graph["edges"]
                    if "0A" in (e["source"], e["target"]) and not e["target"].startswith("tool:")]
        self.assertEqual(about_0a, [
            {"source": "T0", "target": "0A", "type": "contains"},
            {"source": "role:A", "target": "0A", "type": "operates"},
            {"source": "role:A", "target": "0A", "type": "uses"},
            {"source": "role:D", "target": "0A", "type": "uses"},
            {"source": "0A", "target": "stream:OS", "type": "serves_stream"},
        ])

    def test_a_need_is_scheduled_in_every_phase_of_its_range(self):
        graph = build([row(Needs="N01")])
        self.assertEqual([e["target"] for e in edges(graph, "scheduled_in")], ["phase:P1", "phase:P2"])
        self.assertEqual(edges(graph, "homed_in"), [{"source": "N01", "target": "1A", "type": "homed_in"}])

    def test_every_pair_in_an_overlap_group_is_linked(self):
        rows = [row(Needs="N01"), row(ID="beta"), row(ID="gamma")]
        graph = build(rows, {"alphabet": ["gamma", "alpha", "beta"]})
        self.assertEqual([(e["source"], e["target"], e["group"]) for e in edges(graph, "overlaps")], [
            ("tool:gamma", "tool:alpha", "alphabet"),
            ("tool:gamma", "tool:beta", "alphabet"),
            ("tool:alpha", "tool:beta", "alphabet"),
        ])


class Metadata(unittest.TestCase):
    def test_the_metadata_carries_the_date_and_the_counts(self):
        graph = build([row(Needs="N01"), row(ID="beta")])
        self.assertEqual(graph["meta"]["generated"], "2026-01-02")
        # Edges: 2 root-tier, 3 tier-cluster, 3 operates, 4 uses, 3 streams, 1 home, 2 phases,
        # 2 cluster-tool, 1 serves.
        self.assertEqual(graph["meta"]["counts"],
                         {"tools": 2, "clusters": 3, "tiers": 2, "needs": 1, "edges": 21})


class BadInputs(unittest.TestCase):
    def problems(self, rows, overlaps=None, needs=NEEDS):
        with self.assertRaises(GeneratorError) as raised:
            build_graph(rows, CLUSTERS, needs, overlaps or {}, "2026-01-02")
        return raised.exception.problems

    def test_every_untranslatable_cell_is_reported_with_its_row(self):
        problems = self.problems([
            row(Used_by="Architect, Janitor"),
            row(ID="beta", Value_stream="Leisure"),
            row(ID="gamma", Cluster_ID="9Z"),
            row(ID="delta", Cluster="Hosts"),
            row(ID="epsilon", Best_fit="Maybe"),
            row(ID="zeta", Stars="many"),
            row(ID="alpha"),
        ])
        self.assertEqual(len(problems), 7)
        words = ["Janitor", "Leisure", "9Z", "Hosts", "Maybe", "many", "alpha"]
        for number, (word, problem) in enumerate(zip(words, problems), start=2):
            self.assertIn(f"CSV row {number} ", problem)
            self.assertIn(word, problem)

    def test_an_overlap_member_must_be_a_tool(self):
        self.assertIn("ghost", self.problems([row()], {"pair": ["alpha", "ghost"]})[0])

    def test_a_need_phase_must_parse(self):
        for phase in ("P5", "P3-P1", "soon", ""):
            self.assertIn("N01", self.problems([row()], needs=[{**NEEDS[0], "phase": phase}])[0], phase)


def run_generator(*args):
    return subprocess.run([sys.executable, str(HERE / "generate_graph.py"), *map(str, args)],
                          capture_output=True, text=True, encoding="utf-8")


def load(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


class Command(unittest.TestCase):
    """The command itself, run on the real files in this folder."""

    def setUp(self):
        folder = tempfile.TemporaryDirectory()
        self.addCleanup(folder.cleanup)
        self.folder = Path(folder.name)

    def test_the_committed_graph_is_what_the_command_generates(self):
        committed = HERE / "tool-framework.graph.json"
        out = self.folder / "graph.json"
        result = run_generator("--out", out, "--date", load(committed)["meta"]["generated"])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(load(out), load(committed),
                         "Run python tool-discovery/generate_graph.py and commit the result.")

    def test_changing_one_decision_class_changes_that_tool_and_nothing_else(self):
        with open(HERE / "tool-matrix.csv", encoding="utf-8-sig", newline="") as file:
            reader = csv.DictReader(file)
            rows = list(reader)
        target = next(r for r in rows if r["ID"] == "openevolve")
        self.assertNotEqual(target["Decision class"], "Core later")
        target["Decision class"] = "Core later"
        edited = self.folder / "edited.csv"
        with open(edited, "w", encoding="utf-8", newline="") as file:
            writer = csv.DictWriter(file, fieldnames=reader.fieldnames)
            writer.writeheader()
            writer.writerows(rows)

        before, after = self.folder / "before.json", self.folder / "after.json"
        self.assertEqual(run_generator("--out", before, "--date", "2026-01-02").returncode, 0)
        self.assertEqual(run_generator("--out", after, "--date", "2026-01-02", "--csv", edited).returncode, 0)

        before, after = load(before), load(after)
        changed = node(before, "tool:openevolve")
        self.assertEqual(node(after, "tool:openevolve"), {**changed, "decision_class": "Core later"})
        changed["decision_class"] = "Core later"
        self.assertEqual(before, after)

    def test_a_bad_csv_fails_with_the_problem_and_writes_nothing(self):
        bad = self.folder / "bad.csv"
        text = (HERE / "tool-matrix.csv").read_text(encoding="utf-8-sig")
        bad.write_text(text.replace(",Architect,Hermes OS and RAG Factory,", ",Janitor,Hermes OS and RAG Factory,", 1),
                       encoding="utf-8")
        out = self.folder / "graph.json"
        result = run_generator("--out", out, "--csv", bad)
        self.assertEqual(result.returncode, 1)
        self.assertIn("'Janitor', which is not a role", result.stderr)
        self.assertFalse(out.exists())


if __name__ == "__main__":
    unittest.main()
