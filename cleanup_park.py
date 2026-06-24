"""
Cleanup script: removes goldList/meet-and-greet entries from rideDetails.json
for a given park, ensuring experienceDetails.json is the single source of truth.

Usage: python cleanup_park.py <parkId> [--dry-run]
"""
import json, re, sys

def norm(s):
    s = s.lower()
    for c in "‘’‚′": s = s.replace(c, "'")
    for c in "“”„″": s = s.replace(c, '"')
    for c in "–—": s = s.replace(c, "-")
    for c in "™®©": s = s.replace(c, "")
    return " ".join(s.split()).strip()

def load_gold_list():
    with open("goldList.js", encoding="utf-8") as f:
        content = f.read()
    return {norm(m) for m in re.findall(r'"([^"]+)"', content)}

def is_meet_greet(name):
    return bool(re.search(r'\bmeet\b', norm(name)))

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python cleanup_park.py <parkId> [--dry-run]")
        sys.exit(1)

    park_id = sys.argv[1]
    dry_run = "--dry-run" in sys.argv

    gold_set = load_gold_list()

    with open("rideDetails.json", encoding="utf-8") as f:
        ride_details = json.load(f)

    with open("experienceDetails.json", encoding="utf-8") as f:
        exp_details = json.load(f)

    park_rides = ride_details.get(park_id, {})
    park_exps = exp_details.get(park_id, {})

    if not park_rides:
        print(f"No entries in rideDetails.json for park {park_id}")
        sys.exit(0)

    to_remove = []
    for name in list(park_rides.keys()):
        n = norm(name)
        if n in gold_set or is_meet_greet(name):
            to_remove.append(name)

    if not to_remove:
        print(f"Park {park_id}: no overlapping experience entries found in rideDetails.json")
        sys.exit(0)

    missing_from_exp = []
    for name in to_remove:
        n = norm(name)
        found = any(norm(k) == n for k in park_exps)
        if not found:
            missing_from_exp.append(name)

    print(f"Park {park_id}: {len(to_remove)} experience(s) found in rideDetails.json\n")

    for name in to_remove:
        status = "MISSING from experienceDetails" if name in missing_from_exp else "covered"
        print(f"  {'[DRY RUN] ' if dry_run else ''}REMOVE: {name}  ({status})")

    if missing_from_exp:
        print(f"\n  WARNING: {len(missing_from_exp)} entries not yet in experienceDetails.json:")
        for name in missing_from_exp:
            rid = park_rides[name].get("id", "?")
            print(f"    - {name} (id: {rid})")

    if not dry_run:
        for name in to_remove:
            del ride_details[park_id][name]

        with open("rideDetails.json", "w", encoding="utf-8") as f:
            json.dump(ride_details, f, indent=2, ensure_ascii=False)
            f.write("\n")

        print(f"\nRemoved {len(to_remove)} entries from rideDetails.json")
    else:
        print(f"\n[DRY RUN] No changes made. Remove --dry-run to apply.")
