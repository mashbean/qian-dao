#!/usr/bin/env python3
"""驗證籤詩批次 JSON：schema、七言四句字數、欄位長度、籤等配額。
用法: python3 validate.py batches/batch1.json [期望籤等配額JSON]
      python3 validate.py --all   # 驗證 batches/*.json 合併後的整體分布與唯一性
"""
import json, re, sys, glob, os

LEVELS = ["大吉", "上吉", "中吉", "中平", "小凶", "下下"]
ANSWER_KEYS = ["事業", "功名", "財運", "感情", "健康", "出行"]
FAMILIES = ["花木", "本草", "鳥獸", "山川", "時事", "東史", "西史"]
HERE = os.path.dirname(os.path.abspath(__file__))

def clen(s):
    return len(s)

def check_entry(e, errs):
    eid = e.get("id", "?")
    def err(msg): errs.append(f"籤 {eid}: {msg}")
    for k in ["id", "level", "family", "title", "poem", "story", "oracle", "answers", "jieyue", "warning", "zen", "charm", "genz"]:
        if k not in e: err(f"缺欄位 {k}")
    if e.get("level") not in LEVELS: err(f"籤等不合法: {e.get('level')}")
    fam = e.get("family")
    if fam not in FAMILIES: err(f"family 不合法: {fam}")
    t = e.get("title", "")
    if fam in ("東史", "西史"):
        if clen(t) != 7: err(f"歷史籤題須恰 7 字，實得 {clen(t)}: {t}")
    elif not (2 <= clen(t) <= 8): err(f"籤題長度 {clen(t)} 不在 2–8: {t}")
    jy = e.get("jieyue", [])
    if len(jy) != 4: err(f"解曰非四句 ({len(jy)})")
    for i, ph in enumerate(jy):
        if clen(ph) != 4: err(f"解曰第{i+1}句非四字 ({clen(ph)}): {ph}")
        if re.search(r"[，。、！？,.!?\s]", ph): err(f"解曰第{i+1}句含標點: {ph}")
    if not (6 <= clen(e.get("warning", "")) <= 16): err(f"warning 長度 {clen(e.get('warning',''))} 不在 6–16")
    gz = e.get("genz", "")
    if not (16 <= clen(gz) <= 70): err(f"genz 長度 {clen(gz)} 不在 16–70")
    poem = e.get("poem", [])
    if len(poem) != 4: err(f"詩非四句 ({len(poem)})")
    for i, line in enumerate(poem):
        if clen(line) != 7: err(f"第{i+1}句非七字 ({clen(line)}): {line}")
        if re.search(r"[，。、！？,.!?\s]", line): err(f"第{i+1}句含標點/空白: {line}")
    if not (50 <= clen(e.get("story", "")) <= 120): err(f"story 長度 {clen(e.get('story',''))} 不在 50–120")
    if not (30 <= clen(e.get("oracle", "")) <= 85): err(f"oracle 長度 {clen(e.get('oracle',''))} 不在 30–85")
    ans = e.get("answers", {})
    for k in ANSWER_KEYS:
        if k not in ans: err(f"解曰缺 {k}")
        elif not (8 <= clen(ans[k]) <= 26): err(f"解曰[{k}] 長度 {clen(ans[k])} 不在 8–26: {ans[k]}")
    if clen(e.get("zen", "")) > 22 or clen(e.get("zen", "")) < 6: err(f"zen 長度 {clen(e.get('zen',''))} 不在 6–22")
    if not (3 <= clen(e.get("charm", "")) <= 12): err(f"charm 長度 {clen(e.get('charm',''))} 不在 3–12")

def check_batch(path, quota=None):
    errs = []
    data = json.load(open(path, encoding="utf-8"))
    if not isinstance(data, list): return [f"{path}: 頂層須為 list"]
    for e in data: check_entry(e, errs)
    if quota:
        got = {}
        for e in data: got[e.get("level")] = got.get(e.get("level"), 0) + 1
        for lv, n in quota.items():
            if got.get(lv, 0) != n: errs.append(f"籤等配額不符 {lv}: 期望 {n} 實得 {got.get(lv,0)}")
    return errs

def check_all():
    errs, all_entries = [], []
    for p in sorted(glob.glob(os.path.join(HERE, "batches", "batch*.json"))):
        try:
            all_entries += json.load(open(p, encoding="utf-8"))
        except Exception as ex:
            errs.append(f"{p}: JSON 解析失敗 {ex}")
    if len(all_entries) != 128: errs.append(f"總數 {len(all_entries)} ≠ 128")
    ids = [e.get("id") for e in all_entries]
    if sorted(ids) != list(range(1, 129)): errs.append("id 未涵蓋 1–128 或有重複")
    titles = [e.get("title") for e in all_entries]
    dupt = {t for t in titles if titles.count(t) > 1}
    if dupt: errs.append(f"籤題重複: {dupt}")
    firsts = [e.get("poem", [""])[0][:2] for e in all_entries]
    dupf = {f for f in firsts if firsts.count(f) > 2}
    if dupf: errs.append(f"詩首二字出現 >2 次: {dupf}")
    lv = {}
    for e in all_entries: lv[e.get("level")] = lv.get(e.get("level"), 0) + 1
    expect = {"大吉": 8, "上吉": 20, "中吉": 36, "中平": 36, "小凶": 20, "下下": 8}
    if lv != expect: errs.append(f"整體籤等分布 {lv} ≠ {expect}")
    for e in all_entries: check_entry(e, errs)
    return errs

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--all":
        errs = check_all()
    else:
        quota = json.loads(sys.argv[2]) if len(sys.argv) > 2 else None
        errs = check_batch(sys.argv[1], quota)
    if errs:
        print("\n".join(errs)); sys.exit(1)
    print("OK")
