#!/usr/bin/env python3
import markdown2
from weasyprint import HTML, CSS

# Read the markdown file
with open('/app/docs/SRS_Arabic.md', 'r', encoding='utf-8') as f:
    md_content = f.read()

# Convert markdown to HTML
html_content = markdown2.markdown(md_content, extras=['tables', 'fenced-code-blocks', 'header-ids'])

# Create full HTML document with Arabic support
full_html = f'''
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>وثيقة متطلبات النظام - صوت الكورة</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        body {{
            font-family: 'Cairo', 'Arial', sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 1.8;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
            color: #333;
        }}
        
        h1 {{
            color: #1a5f2a;
            border-bottom: 3px solid #4ade80;
            padding-bottom: 10px;
            font-size: 28px;
        }}
        
        h2 {{
            color: #166534;
            border-bottom: 2px solid #86efac;
            padding-bottom: 8px;
            margin-top: 30px;
            font-size: 22px;
        }}
        
        h3 {{
            color: #15803d;
            font-size: 18px;
            margin-top: 20px;
        }}
        
        h4 {{
            color: #16a34a;
            font-size: 16px;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 14px;
        }}
        
        th, td {{
            border: 1px solid #d1d5db;
            padding: 12px;
            text-align: right;
        }}
        
        th {{
            background-color: #dcfce7;
            font-weight: 600;
            color: #166534;
        }}
        
        tr:nth-child(even) {{
            background-color: #f0fdf4;
        }}
        
        code {{
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 4px;
            font-family: monospace;
            direction: ltr;
            display: inline-block;
        }}
        
        pre {{
            background-color: #1f2937;
            color: #e5e7eb;
            padding: 20px;
            border-radius: 8px;
            overflow-x: auto;
            direction: ltr;
            text-align: left;
        }}
        
        pre code {{
            background-color: transparent;
            padding: 0;
            color: #e5e7eb;
        }}
        
        hr {{
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 30px 0;
        }}
        
        strong {{
            color: #166534;
        }}
        
        .page-break {{
            page-break-after: always;
        }}
        
        @page {{
            size: A4;
            margin: 2cm;
        }}
    </style>
</head>
<body>
{html_content}
</body>
</html>
'''

# Save HTML file
with open('/app/docs/SRS_Arabic.html', 'w', encoding='utf-8') as f:
    f.write(full_html)

# Convert to PDF
HTML(string=full_html).write_pdf('/app/docs/SRS_Arabic.pdf')

print("PDF created successfully at /app/docs/SRS_Arabic.pdf")
