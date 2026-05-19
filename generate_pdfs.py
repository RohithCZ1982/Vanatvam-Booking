"""
Generate professional PDFs from Vanatvam markdown manuals.
Usage: py generate_pdfs.py
"""

import os
import re
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, PageBreak, Preformatted, KeepTogether
)
from reportlab.platypus.flowables import Flowable
from reportlab.pdfgen import canvas

# ── Brand colours ──────────────────────────────────────────────────────────
DARK    = colors.HexColor("#1a2332")
GREEN   = colors.HexColor("#2d7a4f")
ACCENT  = colors.HexColor("#3d9970")
LIGHT   = colors.HexColor("#f0f7f4")
YELLOW  = colors.HexColor("#f0a500")
CODE_BG = colors.HexColor("#f4f4f4")
BORDER  = colors.HexColor("#d0d0d0")
WHITE   = colors.white
GREY    = colors.HexColor("#666666")
LGREY   = colors.HexColor("#999999")

PAGE_W, PAGE_H = A4
MARGIN = 2.2 * cm

# ── Page template with header/footer ───────────────────────────────────────
class VanatvamPage:
    def __init__(self, title):
        self.title = title

    def __call__(self, canv, doc):
        canv.saveState()
        w, h = A4

        # Top bar
        canv.setFillColor(DARK)
        canv.rect(0, h - 1.2*cm, w, 1.2*cm, fill=1, stroke=0)
        canv.setFillColor(WHITE)
        canv.setFont("Helvetica-Bold", 9)
        canv.drawString(MARGIN, h - 0.78*cm, "VANATVAM")
        canv.setFont("Helvetica", 8)
        canv.drawRightString(w - MARGIN, h - 0.78*cm, self.title)

        # Bottom bar
        canv.setFillColor(DARK)
        canv.rect(0, 0, w, 0.9*cm, fill=1, stroke=0)
        canv.setFillColor(WHITE)
        canv.setFont("Helvetica", 7.5)
        canv.drawString(MARGIN, 0.28*cm, "Vanatvam Booking System  |  Confidential")
        canv.drawRightString(w - MARGIN, 0.28*cm, f"Page {doc.page}")

        # Thin accent line under header
        canv.setStrokeColor(ACCENT)
        canv.setLineWidth(2)
        canv.line(0, h - 1.2*cm, w, h - 1.2*cm)

        canv.restoreState()


# ── Style definitions ───────────────────────────────────────────────────────
def make_styles():
    base = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, **kw)

    return {
        "h1": S("h1", fontSize=22, textColor=DARK, fontName="Helvetica-Bold",
                 spaceAfter=8, spaceBefore=18, leading=28),
        "h2": S("h2", fontSize=15, textColor=GREEN, fontName="Helvetica-Bold",
                 spaceAfter=6, spaceBefore=14, leading=20,
                 borderPad=4, borderColor=GREEN),
        "h3": S("h3", fontSize=12, textColor=DARK, fontName="Helvetica-Bold",
                 spaceAfter=4, spaceBefore=10, leading=16),
        "h4": S("h4", fontSize=10.5, textColor=ACCENT, fontName="Helvetica-Bold",
                 spaceAfter=3, spaceBefore=8, leading=14),
        "body": S("body", fontSize=9.5, textColor=colors.HexColor("#222222"),
                  fontName="Helvetica", spaceAfter=5, leading=14,
                  alignment=TA_JUSTIFY),
        "bullet": S("bullet", fontSize=9.5, textColor=colors.HexColor("#222222"),
                    fontName="Helvetica", spaceAfter=3, leading=13,
                    leftIndent=16, bulletIndent=4),
        "code": S("code", fontSize=8, textColor=DARK, fontName="Courier",
                  spaceAfter=4, leading=11, leftIndent=8),
        "toc": S("toc", fontSize=9.5, textColor=DARK, fontName="Helvetica",
                 spaceAfter=3, leading=13),
        "caption": S("caption", fontSize=8, textColor=LGREY, fontName="Helvetica-Oblique",
                     spaceAfter=3, leading=11, alignment=TA_CENTER),
    }


# ── Cover page ──────────────────────────────────────────────────────────────
def make_cover(canv, doc, title, subtitle, version="May 2026"):
    canv.saveState()
    w, h = A4

    # Full dark background
    canv.setFillColor(DARK)
    canv.rect(0, 0, w, h, fill=1, stroke=0)

    # Green accent band
    canv.setFillColor(GREEN)
    canv.rect(0, h * 0.38, w, 0.5*cm, fill=1, stroke=0)
    canv.setFillColor(ACCENT)
    canv.rect(0, h * 0.38 + 0.5*cm, w, 0.15*cm, fill=1, stroke=0)

    # Logo text
    canv.setFillColor(ACCENT)
    canv.setFont("Helvetica-Bold", 38)
    canv.drawCentredString(w/2, h * 0.72, "VANATVAM")
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica", 13)
    canv.drawCentredString(w/2, h * 0.67, "Booking Management System")

    # Title
    canv.setFillColor(WHITE)
    canv.setFont("Helvetica-Bold", 22)
    # Handle long titles
    words = title.split()
    if len(title) > 35:
        mid = len(words)//2
        line1 = " ".join(words[:mid])
        line2 = " ".join(words[mid:])
        canv.drawCentredString(w/2, h * 0.50, line1)
        canv.drawCentredString(w/2, h * 0.45, line2)
        sub_y = h * 0.39
    else:
        canv.drawCentredString(w/2, h * 0.48, title)
        sub_y = h * 0.42

    canv.setFillColor(colors.HexColor("#aaccbb"))
    canv.setFont("Helvetica", 12)
    canv.drawCentredString(w/2, sub_y, subtitle)

    # Footer
    canv.setFillColor(LGREY)
    canv.setFont("Helvetica", 9)
    canv.drawCentredString(w/2, 1.8*cm, f"Version: {version}  |  Confidential & Internal Use Only")
    canv.drawCentredString(w/2, 1.2*cm, "vanatvam-booking-app.web.app")

    canv.restoreState()


# ── Markdown parser → ReportLab flowables ──────────────────────────────────
def md_to_flowables(md_text, styles):
    flowables = []
    lines = md_text.splitlines()
    i = 0
    in_code = False
    code_lines = []
    in_table = False
    table_rows = []

    def flush_code():
        if code_lines:
            block = "\n".join(code_lines).strip()
            # Wrap in a light grey box
            tdata = [[Preformatted(block, styles["code"])]]
            t = Table(tdata, colWidths=[PAGE_W - 2*MARGIN - 0.4*cm])
            t.setStyle(TableStyle([
                ("BACKGROUND", (0,0), (-1,-1), CODE_BG),
                ("BOX",        (0,0), (-1,-1), 0.5, BORDER),
                ("TOPPADDING",    (0,0), (-1,-1), 6),
                ("BOTTOMPADDING", (0,0), (-1,-1), 6),
                ("LEFTPADDING",   (0,0), (-1,-1), 8),
                ("RIGHTPADDING",  (0,0), (-1,-1), 8),
            ]))
            flowables.append(t)
            flowables.append(Spacer(1, 4))
            code_lines.clear()

    def flush_table():
        if not table_rows:
            return
        # First row is header
        header = table_rows[0]
        data_rows = [r for r in table_rows[1:] if not all(c.strip("-: ") == "" for c in r)]
        if not data_rows:
            table_rows.clear()
            return
        col_count = max(len(header), max(len(r) for r in data_rows))
        col_w = (PAGE_W - 2*MARGIN - 0.4*cm) / max(col_count, 1)
        col_widths = [col_w] * col_count

        def cell(txt):
            return Paragraph(txt.strip(), ParagraphStyle("tc", fontSize=8.5,
                             fontName="Helvetica", leading=12, textColor=DARK))

        tdata = [[cell(c) for c in header[:col_count]]]
        for row in data_rows:
            padded = row + [""] * (col_count - len(row))
            tdata.append([cell(c) for c in padded[:col_count]])

        t = Table(tdata, colWidths=col_widths, repeatRows=1)
        t.setStyle(TableStyle([
            ("BACKGROUND",    (0,0), (-1,0), DARK),
            ("TEXTCOLOR",     (0,0), (-1,0), WHITE),
            ("FONTNAME",      (0,0), (-1,0), "Helvetica-Bold"),
            ("FONTSIZE",      (0,0), (-1,0), 8.5),
            ("ROWBACKGROUNDS",(0,1), (-1,-1), [WHITE, LIGHT]),
            ("GRID",          (0,0), (-1,-1), 0.4, BORDER),
            ("VALIGN",        (0,0), (-1,-1), "TOP"),
            ("TOPPADDING",    (0,0), (-1,-1), 5),
            ("BOTTOMPADDING", (0,0), (-1,-1), 5),
            ("LEFTPADDING",   (0,0), (-1,-1), 6),
            ("RIGHTPADDING",  (0,0), (-1,-1), 6),
        ]))
        flowables.append(t)
        flowables.append(Spacer(1, 6))
        table_rows.clear()

    def clean(text):
        # Bold/italic → plain (ReportLab doesn't parse markdown inline)
        text = re.sub(r'\*\*(.+?)\*\*', r'<b>\1</b>', text)
        text = re.sub(r'`([^`]+)`', r'<font name="Courier" size="8.5">\1</font>', text)
        text = re.sub(r'\*(.+?)\*', r'<i>\1</i>', text)
        text = re.sub(r'__(.+?)__', r'<b>\1</b>', text)
        return text

    while i < len(lines):
        line = lines[i]

        # Code fence
        if line.startswith("```"):
            if in_code:
                flush_code()
                in_code = False
            else:
                flush_table()
                in_code = True
            i += 1
            continue

        if in_code:
            code_lines.append(line)
            i += 1
            continue

        # Table row
        if line.startswith("|"):
            cols = [c.strip() for c in line.strip("|").split("|")]
            table_rows.append(cols)
            i += 1
            continue
        else:
            if table_rows:
                flush_table()

        # Blank line
        if not line.strip():
            flowables.append(Spacer(1, 4))
            i += 1
            continue

        # Headings
        if line.startswith("#### "):
            flush_code()
            flowables.append(Paragraph(clean(line[5:]), styles["h4"]))
        elif line.startswith("### "):
            flush_code()
            flowables.append(Paragraph(clean(line[4:]), styles["h3"]))
        elif line.startswith("## "):
            flush_code()
            flowables.append(HRFlowable(width="100%", thickness=0.5, color=BORDER, spaceAfter=2))
            flowables.append(Paragraph(clean(line[3:]), styles["h2"]))
        elif line.startswith("# "):
            flush_code()
            flowables.append(PageBreak())
            flowables.append(Paragraph(clean(line[2:]), styles["h1"]))
            flowables.append(HRFlowable(width="100%", thickness=2, color=GREEN, spaceAfter=4))

        # Horizontal rule
        elif re.match(r'^-{3,}$', line.strip()):
            flowables.append(HRFlowable(width="100%", thickness=0.5, color=BORDER,
                                        spaceBefore=4, spaceAfter=4))

        # Bullet
        elif line.startswith("- ") or line.startswith("* "):
            text = clean(line[2:])
            flowables.append(Paragraph(f"• &nbsp;{text}", styles["bullet"]))
        elif re.match(r'^\d+\.\s', line):
            text = clean(re.sub(r'^\d+\.\s', '', line))
            num = re.match(r'^(\d+)\.', line).group(1)
            flowables.append(Paragraph(f"{num}.&nbsp;&nbsp;{text}", styles["bullet"]))

        # Blockquote / note
        elif line.startswith("> "):
            text = clean(line[2:])
            tdata = [[Paragraph(text, ParagraphStyle("bq", fontSize=9,
                       fontName="Helvetica-Oblique", textColor=GREY, leading=13))]]
            t = Table(tdata, colWidths=[PAGE_W - 2*MARGIN - 1*cm])
            t.setStyle(TableStyle([
                ("LEFTPADDING",   (0,0), (-1,-1), 10),
                ("RIGHTPADDING",  (0,0), (-1,-1), 8),
                ("TOPPADDING",    (0,0), (-1,-1), 4),
                ("BOTTOMPADDING", (0,0), (-1,-1), 4),
                ("LINEBEFORE",    (0,0), (0,-1), 3, ACCENT),
                ("BACKGROUND",    (0,0), (-1,-1), LIGHT),
            ]))
            flowables.append(t)
            flowables.append(Spacer(1, 3))

        # Normal paragraph
        else:
            flowables.append(Paragraph(clean(line), styles["body"]))

        i += 1

    flush_code()
    flush_table()
    return flowables


# ── Build a single PDF ──────────────────────────────────────────────────────
def build_pdf(md_path, pdf_path, title, subtitle):
    print(f"  Generating: {os.path.basename(pdf_path)} ...")

    with open(md_path, encoding="utf-8") as f:
        md_text = f.read()

    styles = make_styles()
    doc = SimpleDocTemplate(
        pdf_path,
        pagesize=A4,
        leftMargin=MARGIN, rightMargin=MARGIN,
        topMargin=2.0*cm, bottomMargin=1.8*cm,
        title=title, author="Vanatvam System"
    )

    page_cb = VanatvamPage(title)

    # Cover page (on first page only)
    story = []

    # We'll add the cover via onFirstPage
    def first_page(canv, doc):
        make_cover(canv, doc, title, subtitle)

    def later_pages(canv, doc):
        page_cb(canv, doc)

    # Body content
    story += md_to_flowables(md_text, styles)

    doc.build(story, onFirstPage=first_page, onLaterPages=later_pages)
    print(f"  OK Saved -> {pdf_path}")


# ── Main ────────────────────────────────────────────────────────────────────
BASE = r"c:\Users\Rohith\Documents\GitHub\Vanatvam-Booking"

docs = [
    (
        os.path.join(BASE, "APPLICATION_MANUAL.md"),
        os.path.join(BASE, "Vanatvam_Application_Manual.pdf"),
        "Application Manual",
        "System Guide, Flow Diagrams & API Reference",
    ),
    (
        os.path.join(BASE, "HOSTING_AND_DATABASE.md"),
        os.path.join(BASE, "Vanatvam_Hosting_and_Database.pdf"),
        "Hosting & Database Manual",
        "Infrastructure, Deployment & Operations Guide",
    ),
    (
        os.path.join(BASE, "GCP_DEPLOYMENT_GUIDE.md"),
        os.path.join(BASE, "Vanatvam_GCP_Deployment_Guide.pdf"),
        "GCP Deployment Guide",
        "Step-by-Step Google Cloud Platform Setup",
    ),
]

print("\nVanatvam PDF Generator")
print("=" * 40)
for md, pdf, title, subtitle in docs:
    if os.path.exists(md):
        build_pdf(md, pdf, title, subtitle)
    else:
        print(f"  SKIP (not found): {md}")

print("\nAll PDFs generated successfully.\n")
