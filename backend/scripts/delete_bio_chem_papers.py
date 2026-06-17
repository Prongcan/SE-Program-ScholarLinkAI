import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from service.dbmanager import DbManager

KEYWORDS = [
    "biology", "biological", "biochem", "chemistry", "chemical",
    "chemist", "molecular", "biomedical", "biotech", "genome",
    "protein", "enzyme", "organism",
]


def find_paper_ids(db: DbManager) -> list[int]:
    conditions = " OR ".join(
        ["(LOWER(title) LIKE %s OR LOWER(abstract) LIKE %s)" for _ in KEYWORDS]
    )
    params: list[str] = []
    for k in KEYWORDS:
        params.extend([f"%{k}%", f"%{k}%"])

    rows = db.query_all(
        f"SELECT paper_id, title FROM papers WHERE {conditions} ORDER BY paper_id",
        tuple(params),
    )
    return rows


def main() -> None:
    db = DbManager()
    rows = find_paper_ids(db)
    if not rows:
        print("未找到匹配的 biology/chemistry 论文，无需删除。")
        return

    paper_ids = [int(r["paper_id"]) for r in rows]
    placeholders = ", ".join(["%s"] * len(paper_ids))

    reco = db.query_one(
        f"SELECT COUNT(*) AS count FROM recommendations WHERE paper_id IN ({placeholders})",
        tuple(paper_ids),
    )
    reco_count = int(reco["count"]) if reco else 0

    print(f"即将删除 {len(paper_ids)} 篇论文，关联推荐记录 {reco_count} 条：")
    for r in rows:
        title = (r["title"] or "")[:90]
        print(f"  id={r['paper_id']} | {title}")

    result = db.execute(
        f"DELETE FROM papers WHERE paper_id IN ({placeholders})",
        tuple(paper_ids),
    )
    deleted = int(result.get("rowcount", 0))
    print(f"\n已删除论文 {deleted} 篇（recommendations / embeddings / 收藏 会级联删除）。")


if __name__ == "__main__":
    main()
