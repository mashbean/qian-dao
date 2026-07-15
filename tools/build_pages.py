#!/usr/bin/env python3
"""SEO/AEO 產頁器：由 data/qian.json 產生
- q/1.html … q/128.html：每籤靜態頁（全文、canonical、OG、JSON-LD、上下籤導覽）
- all.html：籤庫索引＋FAQ（FAQPage JSON-LD，AEO 入口）
- sitemap.xml
換部署網域時改 BASE_URL 重跑即可。產物入版控（無 build 依賴）。
"""
import json, os, html

BASE_URL = "https://check.mashbean.net/"
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
GUA64 = ["乾","坤","屯","蒙","需","訟","師","比","小畜","履","泰","否","同人","大有","謙","豫","隨","蠱","臨","觀","噬嗑","賁","剝","復","無妄","大畜","頤","大過","坎","離","咸","恆","遯","大壯","晉","明夷","家人","睽","蹇","解","損","益","夬","姤","萃","升","困","井","革","鼎","震","艮","漸","歸妹","豐","旅","巽","兌","渙","節","中孚","小過","既濟","未濟"]
WUXING = ["金","木","水","火","土"]
ANSWER_KEYS = ["事業","功名","財運","感情","健康","出行"]
FAMILY_ORDER = ["花木","本草","鳥獸","山川","時事","東史","西史"]

def num_tc(n):
    d = "一二三四五六七八九"
    if n <= 9: return d[n-1]
    if n == 10: return "十"
    if n < 20: return "十" + d[n%10-1]
    if n < 100: return d[n//10-1] + "十" + (d[n%10-1] if n%10 else "")
    return "一百" + (("零" + num_tc(n%100) if n%100 < 10 else num_tc(n%100)) if n%100 else "")

def gua_of(i):
    gi = (i-1) >> 1
    return chr(0x4DC0+gi), GUA64[gi], "陰" if (i-1)%2 else "陽", WUXING[i%5]

def esc(s): return html.escape(str(s), quote=True)

def spans(text):
    return "".join(f'<span class="col-dot">・</span>' if ch == "・" else f"<span>{esc(ch)}</span>" for ch in text)

def paper_html(e):
    sym, gname, bian, wx = gua_of(e["id"])
    poem_cols = "".join(
        f'<div class="poem-line">{spans(line)}</div>' for line in e["poem"])
    jy_cols = "".join(f'<div class="jy-col">{spans(ph)}</div>' for ph in e["jieyue"])
    return f'''<article class="paper" aria-label="籤詩">
  <div class="paper-frame"><div class="paper-inner">
    <header class="paper-head"><span class="temple-name">籤 到 殿</span></header>
    <div class="level-stamp lv-{esc(e["level"])}">{spans(e["level"])}</div>
    <div class="paper-cols">
      <div class="pcol pcol-l"><span class="gua-symbol">{sym}</span>{spans(gname + "・" + bian + "・屬" + wx)}</div>
      <div class="pcenter">
        <h2 class="paper-title">{esc(e["title"])}</h2>
        <div class="poem" lang="zh-Hant">{poem_cols}</div>
        <div class="jieyue"><span class="jy-label"><span>解</span><span>曰</span></span><div class="jy-cols">{jy_cols}</div></div>
      </div>
      <div class="pcol pcol-r">{spans("第" + num_tc(e["id"]) + "籤")}</div>
    </div>
    <p class="paper-warning">{esc(e["warning"])}</p>
    <div class="seal" aria-hidden="true"><span>之</span><span>籤</span><span>印</span><span>到</span></div>
  </div></div>
</article>'''

def reading_html(e):
    rows = "".join(
        f'<div class="answer-row"><dt>{k}</dt><dd>{esc(e["answers"][k])}</dd></div>' for k in ANSWER_KEYS)
    return f'''<div class="reading">
  <section class="read-block"><h3 class="read-label">卦頭故事</h3><p class="read-story">{esc(e["story"])}</p></section>
  <section class="read-block"><h3 class="read-label">聖意</h3><p class="read-oracle">{esc(e["oracle"])}</p></section>
  <section class="read-block genz-block"><h3 class="read-label">Z世代廟公曰</h3><p class="read-genz">{esc(e.get("genz",""))}</p></section>
  <section class="read-block"><h3 class="read-label">解曰</h3><dl class="answers">{rows}</dl></section>
  <section class="read-block zen-block"><p class="zen">{esc(e["zen"])}</p><p class="charm">{esc(e["charm"])}</p></section>
</div>'''

PAGE = '''<!DOCTYPE html>
<html lang="zh-Hant-TW">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>{title}</title>
<meta name="description" content="{desc}">
<meta name="theme-color" content="#171210">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{desc}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{base}assets/og.png">
<meta property="og:locale" content="zh_TW">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="{rel}assets/favicon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Serif+TC:wght@400;600;900&display=swap">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-tc-webfont@1.2.0/style.css">
<link rel="stylesheet" href="{rel}css/main.css?v=6">
<script type="application/ld+json">{jsonld}</script>
</head>
<body class="static">
<main class="spage">
<div class="sp-top"><a class="sp-brand" href="{rel}index.html">籤到</a><span><a href="{rel}all.html">籤庫</a>　<a href="{rel}about.html">關於</a></span></div>
{body}
</main>
</body>
</html>
'''

def build_qian_page(e, total):
    i = e["id"]
    canonical = f"{BASE_URL}q/{i}.html"
    title = f"第{num_tc(i)}籤 {e['title']}（{e['level']}）｜籤到 線上籤詩"
    desc = f"籤到第{num_tc(i)}籤「{e['title']}」{e['level']}：{'，'.join(e['poem'])}。解曰：{'、'.join(e['jieyue'])}。附卦頭故事、聖意與事業功名財運感情健康出行六項解籤。"
    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": f"第{num_tc(i)}籤 {e['title']}",
        "text": "\n".join(e["poem"]),
        "abstract": e["oracle"],
        "genre": "籤詩",
        "inLanguage": "zh-Hant-TW",
        "isPartOf": {"@type": "WebSite", "name": "籤到", "url": BASE_URL},
        "url": canonical,
    }, ensure_ascii=False)
    prev_id, next_id = (i-1) if i > 1 else total, (i+1) if i < total else 1
    body = f'''<h1 class="sp-h1">第{num_tc(i)}籤・{esc(e["title"])}・{esc(e["level"])}</h1>
{paper_html(e)}
{reading_html(e)}
<a class="btn btn-primary sp-cta" href="../index.html">我也要求一支籤</a>
<nav class="sp-nav"><a href="{prev_id}.html">← 第{num_tc(prev_id)}籤</a><a href="../all.html">籤庫總覽</a><a href="{next_id}.html">第{num_tc(next_id)}籤 →</a></nav>
'''
    return PAGE.format(title=esc(title), desc=esc(desc), canonical=canonical,
                       base=BASE_URL, rel="../", jsonld=jsonld, body=body)

FAQ = [
    ("籤到是什麼？", "籤到是免費的線上求籤服務，128 首籤詩皆為全新創作，意象涵蓋花木、本草、鳥獸、山川、時事與東西方歷史故事。完整保留台灣廟宇求籤儀式：默禱稟告、擲筊請籤、搖籤筒抽籤、連得三聖筊確認，陰筊會退籤重抽。"),
    ("線上求籤怎麼求？", "先在心中默念所問之事（一事一問，越具體越好），選擇問事類別後上香稟告；擲筊獲得聖筊即可搖籤筒抽籤；抽出的籤需連續三個聖筊確認才屬於你，之後展開籤詩、閱讀卦頭故事與解曰。"),
    ("籤到的籤詩準嗎？", "籤到不占卜吉凶禍福。籤詩的作用是提供一面鏡子：透過典故與詩句，陪你把心裡的問題想清楚。解籤內容為生活提示，不提供醫療、法律或投資指示。"),
    ("什麼是聖筊、笑筊、陰筊？", "擲筊的三種結果：一平一凸為聖筊（神明應允）；兩平面朝上為笑筊（神明笑而不答，把問題再說清楚一次）；兩凸面朝上為陰筊（否，若在確認階段出現會退籤重抽）。"),
    ("籤等怎麼分？", "籤到 128 籤依傳統稀有度分六等：大吉 8 首、上吉 20 首、中吉 36 首、中平 36 首、小凶 20 首、下下 8 首。中平最多——人生大多是中等日子。另有機率 1/512 的籤王。"),
]

def build_all_page(entries):
    canonical = f"{BASE_URL}all.html"
    faq_html = "".join(f'<div class="read-block"><h3>{esc(q)}</h3><p>{esc(a)}</p></div>' for q, a in FAQ)
    groups = {}
    for e in entries: groups.setdefault(e["family"], []).append(e)
    list_html = ""
    for fam in FAMILY_ORDER:
        list_html += f'<li class="qlist-family">{fam}</li>'
        for e in groups.get(fam, []):
            list_html += (f'<li><a href="q/{e["id"]}.html"><span class="ql-lv">{esc(e["level"])}</span>'
                          f'第{num_tc(e["id"])}籤・{esc(e["title"])}'
                          f'<span class="ql-zen">{esc(e["zen"])}</span></a></li>')
    jsonld = json.dumps({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [{"@type": "Question", "name": q,
                        "acceptedAnswer": {"@type": "Answer", "text": a}} for q, a in FAQ],
    }, ensure_ascii=False)
    title = "籤庫總覽：128 首籤詩全文＋求籤方法 FAQ｜籤到"
    desc = "籤到 128 首籤詩總覽：花木、本草、鳥獸、山川、時事、東方歷史、西方歷史七大意象體系，各籤附籤等與籤尾語。含線上求籤方法、擲筊規則、籤等分布 FAQ。"
    body = f'''<h1 class="sp-h1">籤 庫 總 覽</h1>
<section class="faq" itemscope>{faq_html}</section>
<a class="btn btn-primary sp-cta" href="index.html">入殿求籤</a>
<ul class="qlist">{list_html}</ul>
<a class="btn btn-ghost sp-cta" href="index.html">上班前，先籤到</a>
'''
    return PAGE.format(title=esc(title), desc=esc(desc), canonical=canonical,
                       base=BASE_URL, rel="", jsonld=jsonld, body=body)

def build_sitemap(total):
    urls = [BASE_URL, f"{BASE_URL}all.html", f"{BASE_URL}about.html"] + [f"{BASE_URL}q/{i}.html" for i in range(1, total+1)]
    items = "".join(f"<url><loc>{u}</loc></url>" for u in urls)
    return f'<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{items}</urlset>\n'

def main():
    entries = json.load(open(os.path.join(ROOT, "data", "qian.json"), encoding="utf-8"))
    total = len(entries)
    qdir = os.path.join(ROOT, "q")
    os.makedirs(qdir, exist_ok=True)
    for e in entries:
        open(os.path.join(qdir, f"{e['id']}.html"), "w", encoding="utf-8").write(build_qian_page(e, total))
    open(os.path.join(ROOT, "all.html"), "w", encoding="utf-8").write(build_all_page(entries))
    open(os.path.join(ROOT, "sitemap.xml"), "w", encoding="utf-8").write(build_sitemap(total))
    print(f"built {total} pages + all.html + sitemap.xml (BASE_URL={BASE_URL})")

if __name__ == "__main__":
    main()
