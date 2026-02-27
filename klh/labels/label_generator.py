"""
Nutrition label PDF generator using ReportLab.
Generates FSSAI-compliant bilingual (English + Hindi) nutrition information labels.
"""
import os
from io import BytesIO
from datetime import datetime
import html as html_module

from django.conf import settings

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, mm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable
)
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont


# ── Register Nirmala UI for Devanagari (Hindi) support in PDF ────────
HINDI_FONT_AVAILABLE = False
_HINDI_FONT_NAME = 'NirmalaUI'

try:
    _NIRMALA_PATH = os.path.join(os.environ.get('SYSTEMROOT', 'C:\\Windows'), 'Fonts', 'Nirmala.ttc')
    if os.path.exists(_NIRMALA_PATH):
        pdfmetrics.registerFont(TTFont('NirmalaUI', _NIRMALA_PATH, subfontIndex=0))
        pdfmetrics.registerFont(TTFont('NirmalaUI-Bold', _NIRMALA_PATH, subfontIndex=1))
        pdfmetrics.registerFontFamily(
            'NirmalaUI', normal='NirmalaUI', bold='NirmalaUI-Bold',
            italic='NirmalaUI', boldItalic='NirmalaUI-Bold',
        )
        HINDI_FONT_AVAILABLE = True
except Exception:
    HINDI_FONT_AVAILABLE = False


# ── Hindi translations for FSSAI-mandated nutrients ──────────────────
HINDI_NUTRIENT_NAMES = {
    'Energy': 'ऊर्जा',
    'Protein': 'प्रोटीन',
    'Total Fat': 'कुल वसा',
    'Saturated Fat': 'संतृप्त वसा',
    'Trans Fat': 'ट्रांस वसा',
    'Monounsaturated Fat': 'मोनोअनसैचुरेटेड वसा',
    'Polyunsaturated Fat': 'पॉलीअनसैचुरेटेड वसा',
    'Total Carbohydrate': 'कुल कार्बोहाइड्रेट',
    'Total Sugars': 'कुल शर्करा',
    'Added Sugars': 'मिलाई गई शर्करा',
    'Dietary Fibre': 'आहार रेशा',
    'Cholesterol': 'कोलेस्ट्रॉल',
    'Sodium': 'सोडियम',
    'Potassium': 'पोटैशियम',
    'Calcium': 'कैल्शियम',
    'Iron': 'लोहा',
    'Vitamin A': 'विटामिन ए',
    'Vitamin C': 'विटामिन सी',
    'Vitamin D': 'विटामिन डी',
    'Vitamin E': 'विटामिन ई',
    'Vitamin B1': 'विटामिन बी1',
    'Vitamin B2': 'विटामिन बी2',
    'Vitamin B3': 'विटामिन बी3',
    'Vitamin B6': 'विटामिन बी6',
    'Vitamin B12': 'विटामिन बी12',
    'Folic Acid': 'फोलिक एसिड',
    'Zinc': 'जस्ता',
    'Phosphorus': 'फॉस्फोरस',
    'Magnesium': 'मैग्नीशियम',
    'Copper': 'तांबा',
    'Manganese': 'मैंगनीज',
    'Selenium': 'सेलेनियम',
    'Iodine': 'आयोडीन',
    'Thiamine': 'थायमिन',
    'Riboflavin': 'राइबोफ्लेविन',
    'Niacin': 'नियासिन',
}

HINDI_LABELS = {
    'nutrition_info': 'पोषण संबंधी जानकारी',
    'serving_size': 'सर्विंग साइज़',
    'servings_per_pack': 'प्रति पैक सर्विंग',
    'amount_per_serving': 'प्रति सर्विंग मात्रा',
    'nutrient': 'पोषक तत्व',
    'per_serve': 'प्रति सर्विंग',
    'per_100g': 'प्रति 100g',
    'percent_dv': '%दैनिक मूल्य',
    'ingredients': 'सामग्री',
    'allergen_info': 'एलर्जी की जानकारी',
    'manufacturer': 'निर्माता',
    'fssai_license': 'FSSAI लाइसेंस',
}


def get_hindi_name(english_name):
    """Get Hindi translation for a nutrient name."""
    return HINDI_NUTRIENT_NAMES.get(english_name, '')


class NutritionLabelPDF:
    """
    Generates FSSAI-compliant nutrition label as PDF.
    """

    def __init__(self, recipe, nutrition_data, compliance_result=None, fop_indicators=None):
        self.recipe = recipe
        self.nutrition_data = nutrition_data
        self.compliance_result = compliance_result
        self.fop_indicators = fop_indicators or []

    def generate(self, output_path=None):
        """
        Generate PDF label.
        Returns: file path of generated PDF.
        """
        if output_path is None:
            media_dir = os.path.join(settings.BASE_DIR, 'media', 'labels')
            os.makedirs(media_dir, exist_ok=True)
            safe_name = "".join(
                c if c.isalnum() or c in '-_ ' else '' for c in self.recipe.name
            ).strip().replace(' ', '_')
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            output_path = os.path.join(media_dir, f"label_{safe_name}_{timestamp}.pdf")

        # Label dimensions (standard nutrition label size ~7cm x 12cm)
        label_width = 85 * mm
        label_height = 160 * mm

        doc = SimpleDocTemplate(
            output_path,
            pagesize=(label_width, label_height),
            leftMargin=3 * mm, rightMargin=3 * mm,
            topMargin=3 * mm, bottomMargin=3 * mm,
        )

        styles = getSampleStyleSheet()
        elements = []

        # Choose font based on Hindi availability
        _font = 'NirmalaUI' if HINDI_FONT_AVAILABLE else 'Helvetica'

        # Custom styles
        title_style = ParagraphStyle(
            'LabelTitle', parent=styles['Heading1'],
            fontName=_font,
            fontSize=11, alignment=TA_CENTER,
            spaceAfter=2 * mm, spaceBefore=0,
            textColor=colors.black,
        )
        subtitle_style = ParagraphStyle(
            'LabelSubtitle', parent=styles['Normal'],
            fontName=_font,
            fontSize=7, alignment=TA_CENTER,
            spaceAfter=1 * mm, textColor=colors.grey,
        )
        section_style = ParagraphStyle(
            'SectionHeader', parent=styles['Heading3'],
            fontName=_font,
            fontSize=8, spaceAfter=1 * mm, spaceBefore=2 * mm,
            textColor=colors.black, borderPadding=1,
        )
        small_style = ParagraphStyle(
            'SmallText', parent=styles['Normal'],
            fontName=_font,
            fontSize=6, spaceAfter=0.5 * mm,
            textColor=colors.HexColor('#333333'),
            leading=8,
        )
        tiny_style = ParagraphStyle(
            'TinyText', parent=styles['Normal'],
            fontName=_font,
            fontSize=5, spaceAfter=0.5 * mm,
            textColor=colors.HexColor('#666666'),
            leading=6.5,
        )

        # === HEADER ===
        if HINDI_FONT_AVAILABLE:
            elements.append(Paragraph("NUTRITION INFORMATION / पोषण संबंधी जानकारी", title_style))
        else:
            elements.append(Paragraph("NUTRITION INFORMATION", title_style))
        if self.recipe.brand_name:
            elements.append(Paragraph(self.recipe.brand_name, subtitle_style))
        elements.append(Paragraph(self.recipe.name, ParagraphStyle(
            'ProductName', parent=styles['Normal'],
            fontName=_font,
            fontSize=8, alignment=TA_CENTER, spaceAfter=1 * mm,
            textColor=colors.HexColor('#222222'),
        )))

        elements.append(HRFlowable(
            width="100%", thickness=1.5, color=colors.black,
            spaceAfter=1 * mm, spaceBefore=1 * mm,
        ))

        # === SERVING INFO ===
        if HINDI_FONT_AVAILABLE:
            serving_text = (
                f"<b>Serving Size / सर्विंग साइज़:</b> {self.recipe.serving_size}{self.recipe.serving_unit} | "
                f"<b>Servings per pack / प्रति पैक सर्विंग:</b> {self.recipe.servings_per_pack}"
            )
        else:
            serving_text = (
                f"<b>Serving Size:</b> {self.recipe.serving_size}{self.recipe.serving_unit} | "
                f"<b>Servings per pack:</b> {self.recipe.servings_per_pack}"
            )
        elements.append(Paragraph(serving_text, small_style))

        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=colors.grey,
            spaceAfter=1 * mm, spaceBefore=1 * mm,
        ))

        # === NUTRITION TABLE ===
        if HINDI_FONT_AVAILABLE:
            elements.append(Paragraph("<b>Amount per serving / प्रति सर्विंग मात्रा</b>", small_style))
            table_data = [
                [
                    Paragraph('<b>Nutrient / पोषक तत्व</b>', small_style),
                    Paragraph('<b>Per Serve / प्रति सर्विंग</b>', small_style),
                    Paragraph('<b>Per 100g</b>', small_style),
                    Paragraph('<b>%DV*</b>', small_style),
                ]
            ]
        else:
            elements.append(Paragraph("<b>Amount per serving</b>", small_style))
            table_data = [
                [
                    Paragraph('<b>Nutrient</b>', small_style),
                    Paragraph('<b>Per Serve</b>', small_style),
                    Paragraph('<b>Per 100g</b>', small_style),
                    Paragraph('<b>%DV*</b>', small_style),
                ]
            ]

        # Sort by nutrient display order
        sorted_nutrients = sorted(
            self.nutrition_data.values(),
            key=lambda x: (x['nutrient'].category.display_order, x['nutrient'].display_order)
        )

        current_category = None
        for data in sorted_nutrients:
            nutrient = data['nutrient']

            # Category header rows
            if nutrient.category != current_category:
                current_category = nutrient.category

            # Indent sub-items
            name = nutrient.name
            hindi = get_hindi_name(name)
            is_sub = name in [
                'Saturated Fat', 'Trans Fat', 'Monounsaturated Fat',
                'Polyunsaturated Fat', 'Total Sugars', 'Added Sugars',
                'Dietary Fibre', 'Cholesterol',
            ]
            prefix = "  " if is_sub else ""
            bold_start = "" if is_sub else "<b>"
            bold_end = "" if is_sub else "</b>"

            # Bilingual nutrient name
            display_name = f"{name}"
            if hindi and HINDI_FONT_AVAILABLE:
                display_name = f"{name} / {hindi}"

            per_serve = f"{data['per_serving']}{nutrient.unit}"
            per_100g = f"{data['per_100g']}{nutrient.unit}"
            pct_dv = f"{data['percent_dv']}%" if data['percent_dv'] is not None else "-"

            table_data.append([
                Paragraph(f'{prefix}{bold_start}{display_name}{bold_end}', small_style),
                Paragraph(per_serve, small_style),
                Paragraph(per_100g, small_style),
                Paragraph(pct_dv, small_style),
            ])

        col_widths = [34 * mm, 15 * mm, 15 * mm, 12 * mm]
        table = Table(table_data, colWidths=col_widths)
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2C3E50')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('FONTSIZE', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 1),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
            ('GRID', (0, 0), (-1, -1), 0.25, colors.HexColor('#CCCCCC')),
            ('LINEBELOW', (0, 0), (-1, 0), 1, colors.black),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1),
             [colors.white, colors.HexColor('#F8F9FA')]),
        ]))
        elements.append(table)

        # DV footnote
        elements.append(Spacer(1, 1 * mm))
        elements.append(Paragraph(
            "*%DV = % Daily Value based on a 2000 kcal diet. "
            "Your daily values may vary based on your calorie needs.",
            tiny_style,
        ))

        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=colors.grey,
            spaceAfter=1 * mm, spaceBefore=1.5 * mm,
        ))

        # === INGREDIENT LIST ===
        _ing_label = "INGREDIENTS / सामग्री" if HINDI_FONT_AVAILABLE else "INGREDIENTS"
        elements.append(Paragraph(f"<b>{_ing_label}:</b>", small_style))
        ing_list = self.recipe.get_ingredient_list_string()
        elements.append(Paragraph(ing_list, tiny_style))

        # === ALLERGEN INFO ===
        if self.recipe.allergen_info:
            elements.append(Spacer(1, 1 * mm))
            _alg_label = "ALLERGEN INFO / एलर्जी की जानकारी" if HINDI_FONT_AVAILABLE else "ALLERGEN INFO"
            elements.append(Paragraph(
                f"<b>{_alg_label}:</b> {self.recipe.allergen_info}",
                small_style,
            ))

        elements.append(HRFlowable(
            width="100%", thickness=0.5, color=colors.grey,
            spaceAfter=1 * mm, spaceBefore=1 * mm,
        ))

        # === FOP INDICATORS ===
        if self.fop_indicators:
            fop_data = []
            for ind in self.fop_indicators:
                color_map = {
                    'red': colors.HexColor('#E74C3C'),
                    'amber': colors.HexColor('#F39C12'),
                    'green': colors.HexColor('#27AE60'),
                }
                bg = color_map.get(ind['color'], colors.grey)
                fop_data.append([
                    Paragraph(f"<font color='white'><b>{ind['nutrient']}</b></font>", tiny_style),
                    Paragraph(f"<font color='white'>{ind['value']}{ind['unit']}/100g</font>", tiny_style),
                    Paragraph(f"<font color='white'><b>{ind['level']}</b></font>", tiny_style),
                ])

            if fop_data:
                fop_table = Table(fop_data, colWidths=[26 * mm, 26 * mm, 18 * mm])
                fop_styles = [
                    ('FONTSIZE', (0, 0), (-1, -1), 5),
                    ('TOPPADDING', (0, 0), (-1, -1), 1),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 1),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.white),
                ]
                for i, ind in enumerate(self.fop_indicators):
                    color_map = {
                        'red': colors.HexColor('#E74C3C'),
                        'amber': colors.HexColor('#F39C12'),
                        'green': colors.HexColor('#27AE60'),
                    }
                    bg = color_map.get(ind['color'], colors.grey)
                    fop_styles.append(('BACKGROUND', (0, i), (-1, i), bg))

                fop_table.setStyle(TableStyle(fop_styles))
                elements.append(fop_table)

        # === FOOTER ===
        elements.append(Spacer(1, 1.5 * mm))
        footer_parts = []
        if self.recipe.manufacturer:
            footer_parts.append(f"<b>Mfg:</b> {self.recipe.manufacturer}")
        if self.recipe.fssai_license:
            footer_parts.append(f"<b>FSSAI Lic:</b> {self.recipe.fssai_license}")

        if footer_parts:
            elements.append(Paragraph(" | ".join(footer_parts), tiny_style))

        elements.append(Paragraph(
            f"Label generated: {datetime.now().strftime('%d-%m-%Y')}",
            ParagraphStyle('Footer', parent=tiny_style, fontName=_font, alignment=TA_CENTER),
        ))

        # Build PDF
        doc.build(elements)
        return output_path


def generate_label_html(recipe, nutrition_data, fop_indicators=None):
    """
    Generate an HTML nutrition label for web display.
    Returns HTML string.
    """
    sorted_nutrients = sorted(
        nutrition_data.values(),
        key=lambda x: (x['nutrient'].category.display_order, x['nutrient'].display_order)
    )

    sub_nutrients = {
        'Saturated Fat', 'Trans Fat', 'Monounsaturated Fat',
        'Polyunsaturated Fat', 'Total Sugars', 'Added Sugars',
        'Dietary Fibre', 'Cholesterol',
    }

    rows_html = ""
    for data in sorted_nutrients:
        n = data['nutrient']
        is_sub = n.name in sub_nutrients
        cls = 'sub-nutrient' if is_sub else 'main-nutrient'
        pct = f"{data['percent_dv']}%" if data['percent_dv'] is not None else "—"
        hindi = get_hindi_name(n.name)
        bilingual_name = f"{n.name}"
        if hindi:
            bilingual_name = f"{n.name} <span class='hindi-name'>/ {hindi}</span>"
        rows_html += f"""
        <tr class="{cls}">
            <td>{'&nbsp;&nbsp;' if is_sub else ''}{bilingual_name}</td>
            <td class="text-right">{data['per_serving']}{n.unit}</td>
            <td class="text-right">{data['per_100g']}{n.unit}</td>
            <td class="text-right">{pct}</td>
        </tr>"""

    fop_html = ""
    if fop_indicators:
        for ind in fop_indicators:
            fop_html += f"""
            <span class="fop-badge fop-{ind['color']}">
                {ind['nutrient']}: {ind['value']}{ind['unit']}/100g ({ind['level']})
            </span>"""

    esc = html_module.escape

    html = f"""
    <div class="nutrition-label">
        <div class="label-header">
            <h2>NUTRITION INFORMATION<br><span class="hindi-title">पोषण संबंधी जानकारी</span></h2>
            {'<p class="brand">' + esc(recipe.brand_name) + '</p>' if recipe.brand_name else ''}
            <p class="product-name">{esc(recipe.name)}</p>
        </div>
        <div class="serving-info">
            Serving Size / सर्विंग साइज़: {recipe.serving_size}{esc(recipe.serving_unit)} |
            Servings per pack / प्रति पैक सर्विंग: {recipe.servings_per_pack}
        </div>
        <table class="nutrition-table">
            <thead>
                <tr>
                    <th>Nutrient / पोषक तत्व</th>
                    <th class="text-right">Per Serve / प्रति सर्विंग</th>
                    <th class="text-right">Per 100g</th>
                    <th class="text-right">%DV*</th>
                </tr>
            </thead>
            <tbody>
                {rows_html}
            </tbody>
        </table>
        <p class="dv-note">*%DV = % Daily Value based on 2000 kcal diet / *%दैनिक मूल्य 2000 किलो कैलोरी आहार पर आधारित</p>
        <div class="ingredients-section">
            <strong>INGREDIENTS / सामग्री:</strong> {esc(recipe.get_ingredient_list_string())}
        </div>
        {'<div class="allergen-section"><strong>ALLERGEN INFO / एलर्जी की जानकारी:</strong> ' + esc(recipe.allergen_info) + '</div>' if recipe.allergen_info else ''}
        {'<div class="fop-section">' + fop_html + '</div>' if fop_html else ''}
        <div class="label-footer">
            {'<span>Mfg / निर्माता: ' + esc(recipe.manufacturer) + '</span>' if recipe.manufacturer else ''}
            {'<span>FSSAI Lic: ' + esc(recipe.fssai_license) + '</span>' if recipe.fssai_license else ''}
        </div>
    </div>
    """
    return html
