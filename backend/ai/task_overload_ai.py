import json
import sys


WEIGHTS = {
    "low": 1,
    "medium": 2,
    "high": 3,
}

DEFAULT_CAPACITY = 10


def analyze_workload(payload):
    active_tasks = payload.get("active_tasks", [])
    new_complexity = (payload.get("new_complexity") or "medium").lower()
    capacity = int(payload.get("capacity") or DEFAULT_CAPACITY)

    current_points = 0
    breakdown = {"low": 0, "medium": 0, "high": 0}

    for task in active_tasks:
        complexity = str(task.get("complexity", "medium")).lower()
        points = WEIGHTS.get(complexity, WEIGHTS["medium"])
        current_points += points
        if complexity in breakdown:
            breakdown[complexity] += 1

    new_task_points = WEIGHTS.get(new_complexity, WEIGHTS["medium"])
    projected_points = current_points + new_task_points
    remaining_capacity = capacity - current_points

    return {
        "capacity": capacity,
        "current_points": current_points,
        "new_task_points": new_task_points,
        "projected_points": projected_points,
        "remaining_capacity": remaining_capacity,
        "active_task_count": len(active_tasks),
        "breakdown": breakdown,
        "new_complexity": new_complexity,
        "overloaded": projected_points > capacity,
    }


def main():
    raw_input = sys.stdin.read().strip()
    if not raw_input:
        print(json.dumps({"error": "No input provided"}))
        return 1

    payload = json.loads(raw_input)
    result = analyze_workload(payload)
    print(json.dumps(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())