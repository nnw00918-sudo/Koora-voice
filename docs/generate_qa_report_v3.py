#!/usr/bin/env python3
"""
Koora Voice - QA Report Generator v3.0
Generates Arabic PDF report from test results
"""

import json
from datetime import datetime

# Read test results
with open('/app/docs/qa_test_results_v3.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Generate HTML report
html_content = f'''<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>تقرير ضمان الجودة v3.0 - صوت الكورة</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Cairo', sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            color: #fff;
            padding: 40px;
            direction: rtl;
        }}
        
        .container {{
            max-width: 900px;
            margin: 0 auto;
        }}
        
        .header {{
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, #0f3460 0%, #1a1a2e 100%);
            border-radius: 20px;
            margin-bottom: 30px;
            border: 2px solid #e94560;
        }}
        
        .header h1 {{
            font-size: 2.5em;
            color: #e94560;
            margin-bottom: 10px;
        }}
        
        .header .version {{
            font-size: 1.2em;
            color: #00d9ff;
        }}
        
        .header .date {{
            color: #888;
            margin-top: 10px;
        }}
        
        .summary {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 20px;
            margin-bottom: 30px;
        }}
        
        .summary-card {{
            background: rgba(255, 255, 255, 0.05);
            padding: 25px;
            border-radius: 15px;
            text-align: center;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }}
        
        .summary-card.total {{
            border-color: #00d9ff;
        }}
        
        .summary-card.passed {{
            border-color: #00ff88;
        }}
        
        .summary-card.failed {{
            border-color: #ff4757;
        }}
        
        .summary-card.warnings {{
            border-color: #ffa502;
        }}
        
        .summary-card h3 {{
            font-size: 2.5em;
            margin-bottom: 10px;
        }}
        
        .summary-card.total h3 {{ color: #00d9ff; }}
        .summary-card.passed h3 {{ color: #00ff88; }}
        .summary-card.failed h3 {{ color: #ff4757; }}
        .summary-card.warnings h3 {{ color: #ffa502; }}
        
        .pass-rate {{
            text-align: center;
            padding: 30px;
            background: linear-gradient(135deg, rgba(0, 255, 136, 0.1) 0%, rgba(0, 217, 255, 0.1) 100%);
            border-radius: 20px;
            margin-bottom: 30px;
            border: 2px solid #00ff88;
        }}
        
        .pass-rate h2 {{
            font-size: 3em;
            color: #00ff88;
        }}
        
        .section {{
            background: rgba(255, 255, 255, 0.03);
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 25px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }}
        
        .section h2 {{
            color: #00d9ff;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 2px solid rgba(0, 217, 255, 0.3);
        }}
        
        .test-item {{
            display: flex;
            align-items: center;
            padding: 15px;
            background: rgba(255, 255, 255, 0.02);
            border-radius: 10px;
            margin-bottom: 10px;
        }}
        
        .test-item:hover {{
            background: rgba(255, 255, 255, 0.05);
        }}
        
        .status {{
            width: 30px;
            height: 30px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-left: 15px;
            font-size: 1.2em;
        }}
        
        .status.pass {{ background: rgba(0, 255, 136, 0.2); }}
        .status.fail {{ background: rgba(255, 71, 87, 0.2); }}
        .status.warning {{ background: rgba(255, 165, 2, 0.2); }}
        
        .test-name {{
            flex: 1;
            font-weight: 600;
        }}
        
        .test-details {{
            color: #888;
            font-size: 0.9em;
        }}
        
        .metrics {{
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin-top: 15px;
        }}
        
        .metric {{
            background: rgba(0, 217, 255, 0.1);
            padding: 15px;
            border-radius: 10px;
            text-align: center;
        }}
        
        .metric-value {{
            font-size: 1.5em;
            color: #00d9ff;
            font-weight: 700;
        }}
        
        .metric-label {{
            color: #888;
            font-size: 0.85em;
        }}
        
        .footer {{
            text-align: center;
            padding: 30px;
            color: #666;
            margin-top: 30px;
        }}
        
        @media print {{
            body {{
                background: #1a1a2e;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }}
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚽ تقرير ضمان الجودة</h1>
            <div class="version">صوت الكورة - الإصدار 3.0</div>
            <div class="date">📅 {datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
        </div>
        
        <div class="summary">
            <div class="summary-card total">
                <h3>{results['summary']['total_tests']}</h3>
                <p>إجمالي الاختبارات</p>
            </div>
            <div class="summary-card passed">
                <h3>{results['summary']['passed']}</h3>
                <p>✅ ناجح</p>
            </div>
            <div class="summary-card failed">
                <h3>{results['summary']['failed']}</h3>
                <p>❌ فاشل</p>
            </div>
            <div class="summary-card warnings">
                <h3>{results['summary']['warnings']}</h3>
                <p>⚠️ تحذيرات</p>
            </div>
        </div>
        
        <div class="pass-rate">
            <h2>📈 نسبة النجاح: {(results['summary']['passed'] / results['summary']['total_tests'] * 100):.1f}%</h2>
        </div>
'''

# Section titles in Arabic
section_titles = {
    'webrtc_agora': '📡 اختبارات Agora WebRTC',
    'websocket_stress': '⚡ اختبارات السرعة والضغط',
    'rbac_logic': '🔐 اختبارات الصلاحيات (RBAC)',
    'rtl_responsiveness': '🔄 اختبارات RTL والاستجابة'
}

# Add sections
for section_key, section_title in section_titles.items():
    tests = results['sections'].get(section_key, [])
    if not tests:
        continue
    
    html_content += f'''
        <div class="section">
            <h2>{section_title}</h2>
    '''
    
    for test in tests:
        status_class = 'pass' if test['status'] == 'PASS' else ('fail' if test['status'] == 'FAIL' else 'warning')
        status_icon = '✅' if test['status'] == 'PASS' else ('❌' if test['status'] == 'FAIL' else '⚠️')
        
        html_content += f'''
            <div class="test-item">
                <div class="status {status_class}">{status_icon}</div>
                <div class="test-name">{test['test_name']}</div>
                <div class="test-details">{test['details']}</div>
            </div>
        '''
        
        # Add metrics for latency test
        if test.get('data') and isinstance(test['data'], dict) and 'avg_ms' in test['data']:
            data = test['data']
            html_content += f'''
            <div class="metrics">
                <div class="metric">
                    <div class="metric-value">{data.get('avg_ms', 'N/A')}ms</div>
                    <div class="metric-label">متوسط التأخير</div>
                </div>
                <div class="metric">
                    <div class="metric-value">{data.get('min_ms', 'N/A')}ms</div>
                    <div class="metric-label">أقل تأخير</div>
                </div>
                <div class="metric">
                    <div class="metric-value">{data.get('max_ms', 'N/A')}ms</div>
                    <div class="metric-label">أعلى تأخير</div>
                </div>
            </div>
            '''
    
    html_content += '''
        </div>
    '''

# Footer
html_content += f'''
        <div class="footer">
            <p>🏟️ صوت الكورة - منصة التواصل الرياضي</p>
            <p>تم إنشاء هذا التقرير تلقائياً بتاريخ {datetime.now().strftime('%Y-%m-%d')}</p>
        </div>
    </div>
</body>
</html>
'''

# Save HTML
html_path = '/app/docs/QA_Report_v3_Arabic.html'
with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html_content)

print(f"✅ تم إنشاء تقرير HTML: {html_path}")

# Convert to PDF using weasyprint
try:
    from weasyprint import HTML
    pdf_path = '/app/docs/QA_Report_v3_Arabic.pdf'
    HTML(html_path).write_pdf(pdf_path)
    print(f"✅ تم إنشاء تقرير PDF: {pdf_path}")
except ImportError:
    print("⚠️ weasyprint غير متوفر، جاري التثبيت...")
    import subprocess
    subprocess.run(['pip', 'install', 'weasyprint'], check=True)
    from weasyprint import HTML
    pdf_path = '/app/docs/QA_Report_v3_Arabic.pdf'
    HTML(html_path).write_pdf(pdf_path)
    print(f"✅ تم إنشاء تقرير PDF: {pdf_path}")

# Copy to public folder for download
import shutil
public_pdf = '/app/frontend/public/QA_Report_v3_Arabic.pdf'
shutil.copy(pdf_path, public_pdf)
print(f"✅ تم نسخ PDF إلى: {public_pdf}")
print(f"\n🔗 رابط التحميل: https://pitch-chat.preview.emergentagent.com/QA_Report_v3_Arabic.pdf")
