import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from service.dbmanager import DbManager

db = DbManager()
keywords = [
    "biology", "biological", "biochem", "chemistry", "chemical",
    "chemist", "molecular", "biomedical", "biotech", "genome",
    "protein", "enzyme", "organism",
]
conditions = " OR ".join(
    ["(LOWER(title) LIKE %s OR LOWER(abstract) LIKE %s)" for _ in keywords]
)
params = []
for k in keywords:
    params.extend([f"%{k}%", f"%{k}%"])

sql = f"""
SELECT paper_id, title,
  (SELECT COUNT(*) FROM recommendations r WHERE r.paper_id = p.paper_id) AS reco_count
FROM papers p
WHERE {conditions}
ORDER BY paper_id
"""
rows = db.query_all(sql, tuple(params))
print(f"Matched papers: {len(rows)}")
for r in rows[:40]:
    title = (r["title"] or "")[:90]
    print(f"  id={r['paper_id']} reco={r['reco_count']} | {title}")
if len(rows) > 40:
    print(f"  ... and {len(rows) - 40} more")
