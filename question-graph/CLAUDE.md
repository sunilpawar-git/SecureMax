# CLAUDE.md — `question-graph/`

Questionnaire flowchart YAML: HNI and Enterprise tracks. Single source of truth; DB schema is derived.

## Rules

- **SSOT is the YAML** — never edit `question_nodes` DB table directly; always edit YAML then reseed
- **Run `python question-graph/validate.py` before every seed** — catches orphans, dead ends, unreachable terminals
- **Every node requires**: `id`, `domain` (CPP-01–07), `question_type`, `options`, `edges`
- **Every node must have reachable path to terminal** — `validate.py` confirms via DFS
- **HNI entry node**: `hni_q1_property_type`; **Enterprise entry**: `ent_q1_facility_type`
- **`condition: any`** → deterministic branch; no condition → Gemini-assisted branch
- **New questions grounded in CPP domain** before being added (Rule 13)

## CPP Domains

- **CPP-01**: Physical Security (ESRM, 4Ds: Deter/Detect/Delay/Deny, access control, perimeter)
- **CPP-02**: Business Principles (risk categories, leadership, decision-making)
- **CPP-03**: Crisis Management (BIA, BCM, emergency response, CMT)
- **CPP-04**: Investigations (objectivity, thoroughness, accuracy, timeliness)
- **CPP-05**: Information Security (IAP, threat categories, layered defence, OPSEC)
- **CPP-06**: Personnel Security (officer ops, patrol, access control, weapons policy)
- **CPP-07**: Security Management (ESRM cycle, stakeholders, operating environment)

## Workflow

1. **Edit YAML** (`hni.yaml` or `enterprise.yaml`)
2. **Validate locally**: `python question-graph/validate.py`
3. **Seed to DB**: `cd ai-service && python scripts/seed_question_graph.py`
4. **Test questionnaire** flow manually or via E2E tests

## Common Pitfalls

1. Editing `question_nodes` table directly → next reseed overwrites changes
2. Skipping `validate.py` → dead ends, orphan nodes, unreachable terminals in prod
3. Adding questions without CPP grounding → violates Rule 13
4. Missing entry node or duplicate entry node → questionnaire can't start
5. Terminal node not reachable from entry → questionnaire gets stuck
