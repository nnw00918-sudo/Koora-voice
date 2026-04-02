#!/usr/bin/env python3
"""
Generate Arabic PDF QA Report
"""
import json
import markdown2
from weasyprint import HTML
from datetime import datetime

# Load test results
with open('/app/docs/qa_test_results.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

# Generate HTML report
html_content = f'''
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>تقرير ضمان الجودة - صوت الكورة</title>
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
            background: #fff;
        }}
        
        .header {{
            text-align: center;
            border-bottom: 3px solid #4ade80;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }}
        
        .header h1 {{
            color: #166534;
            font-size: 32px;
            margin-bottom: 10px;
        }}
        
        .header .subtitle {{
            color: #666;
            font-size: 18px;
        }}
        
        .summary-box {{
            background: linear-gradient(135deg, #f0fdf4, #dcfce7);
            border: 2px solid #86efac;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .summary-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            text-align: center;
        }}
        
        .summary-item {{
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }}
        
        .summary-item .number {{
            font-size: 36px;
            font-weight: 700;
        }}
        
        .summary-item .label {{
            font-size: 14px;
            color: #666;
        }}
        
        .passed .number {{ color: #16a34a; }}
        .failed .number {{ color: #dc2626; }}
        .warnings .number {{ color: #f59e0b; }}
        .total .number {{ color: #3b82f6; }}
        
        .section {{
            margin: 30px 0;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
        }}
        
        .section-header {{
            background: #1f2937;
            color: white;
            padding: 15px 20px;
            font-size: 18px;
            font-weight: 600;
        }}
        
        .section-content {{
            padding: 20px;
        }}
        
        .test-item {{
            display: flex;
            align-items: flex-start;
            padding: 12px;
            border-bottom: 1px solid #f3f4f6;
            gap: 12px;
        }}
        
        .test-item:last-child {{
            border-bottom: none;
        }}
        
        .test-icon {{
            font-size: 20px;
            min-width: 30px;
        }}
        
        .test-details {{
            flex: 1;
        }}
        
        .test-name {{
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 4px;
        }}
        
        .test-description {{
            color: #6b7280;
            font-size: 14px;
        }}
        
        .status-pass {{ color: #16a34a; }}
        .status-fail {{ color: #dc2626; }}
        .status-warning {{ color: #f59e0b; }}
        
        .failed-tests {{
            background: #fef2f2;
            border: 2px solid #fecaca;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .failed-tests h3 {{
            color: #dc2626;
            margin-bottom: 15px;
        }}
        
        .recommendations {{
            background: #fffbeb;
            border: 2px solid #fde68a;
            border-radius: 12px;
            padding: 20px;
            margin: 20px 0;
        }}
        
        .recommendations h3 {{
            color: #d97706;
            margin-bottom: 15px;
        }}
        
        .recommendations ul {{
            padding-right: 20px;
        }}
        
        .recommendations li {{
            margin-bottom: 8px;
        }}
        
        .footer {{
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #9ca3af;
            font-size: 14px;
        }}
        
        .pass-rate {{
            text-align: center;
            font-size: 48px;
            font-weight: 700;
            color: {'#16a34a' if results['summary']['passed'] / results['summary']['total_tests'] > 0.7 else '#f59e0b' if results['summary']['passed'] / results['summary']['total_tests'] > 0.5 else '#dc2626'};
            margin: 20px 0;
        }}
        
        @page {{
            size: A4;
            margin: 1.5cm;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 تقرير ضمان الجودة</h1>
        <div class="subtitle">تطبيق صوت الكورة - Koora Voice</div>
        <div class="subtitle">{datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
    </div>
    
    <div class="summary-box">
        <h2 style="text-align: center; margin-bottom: 20px; color: #166534;">📊 ملخص النتائج</h2>
        <div class="pass-rate">{results['summary']['passed'] / results['summary']['total_tests'] * 100:.1f}%</div>
        <p style="text-align: center; color: #666;">نسبة النجاح</p>
        <div class="summary-grid">
            <div class="summary-item total">
                <div class="number">{results['summary']['total_tests']}</div>
                <div class="label">إجمالي الاختبارات</div>
            </div>
            <div class="summary-item passed">
                <div class="number">{results['summary']['passed']}</div>
                <div class="label">✅ ناجح</div>
            </div>
            <div class="summary-item failed">
                <div class="number">{results['summary']['failed']}</div>
                <div class="label">❌ فاشل</div>
            </div>
            <div class="summary-item warnings">
                <div class="number">{results['summary']['warnings']}</div>
                <div class="label">⚠️ تحذيرات</div>
            </div>
        </div>
    </div>
'''

# Failed Tests Section
failed_tests = []
for section, tests in results['sections'].items():
    for test in tests:
        if test['status'] == 'FAIL':
            failed_tests.append(test)

if failed_tests:
    html_content += '''
    <div class="failed-tests">
        <h3>❌ الاختبارات الفاشلة</h3>
'''
    for test in failed_tests:
        html_content += f'''
        <div class="test-item">
            <span class="test-icon">❌</span>
            <div class="test-details">
                <div class="test-name">{test['test_name']}</div>
                <div class="test-description">{test['details']}</div>
            </div>
        </div>
'''
    html_content += '</div>'

# Section mappings
section_names = {
    'webrtc_agora': '📡 اختبار تكامل Agora WebRTC',
    'websocket_stress': '⚡ اختبار ضغط WebSocket',
    'rbac_logic': '🔐 اختبار منطق الصلاحيات (RBAC)',
    'rtl_responsiveness': '🔄 اختبار استجابة RTL'
}

section_descriptions = {
    'webrtc_agora': 'اختبار جلسات الصوت والفيديو متعددة المستخدمين واكتشاف انقطاع الصوت',
    'websocket_stress': 'اختبار أداء الدردشة مع 100 رسالة في الثانية',
    'rbac_logic': 'التحقق من صلاحيات الأدوار وأن المشرف لا يستطيع طرد الأدمن',
    'rtl_responsiveness': 'التحقق من دعم اللغة العربية واتجاه RTL في جميع المكونات'
}

# Add each section
for section_key, section_title in section_names.items():
    tests = results['sections'].get(section_key, [])
    
    passed = sum(1 for t in tests if t['status'] == 'PASS')
    failed = sum(1 for t in tests if t['status'] == 'FAIL')
    warnings = sum(1 for t in tests if t['status'] == 'WARNING')
    
    html_content += f'''
    <div class="section">
        <div class="section-header">
            {section_title}
            <span style="float: left; font-size: 14px;">
                ✅ {passed} | ❌ {failed} | ⚠️ {warnings}
            </span>
        </div>
        <div class="section-content">
            <p style="color: #6b7280; margin-bottom: 15px;">{section_descriptions.get(section_key, '')}</p>
'''
    
    for test in tests:
        icon = '✅' if test['status'] == 'PASS' else '❌' if test['status'] == 'FAIL' else '⚠️'
        status_class = 'status-pass' if test['status'] == 'PASS' else 'status-fail' if test['status'] == 'FAIL' else 'status-warning'
        
        html_content += f'''
            <div class="test-item">
                <span class="test-icon {status_class}">{icon}</span>
                <div class="test-details">
                    <div class="test-name">{test['test_name']}</div>
                    <div class="test-description">{test['details']}</div>
                </div>
            </div>
'''
    
    html_content += '''
        </div>
    </div>
'''

# Recommendations
html_content += '''
    <div class="recommendations">
        <h3>💡 التوصيات</h3>
        <ul>
            <li><strong>WebSocket:</strong> يُنصح بمراجعة إعدادات اتصال WebSocket عبر HTTPS/WSS للتأكد من عمل الاتصال بشكل صحيح</li>
            <li><strong>Agora:</strong> اختبار جلسات الصوت الحقيقية يتطلب اتصال Agora SDK فعلي - يُنصح باختبار يدوي مع مستخدمين حقيقيين</li>
            <li><strong>RTL:</strong> إضافة المزيد من فئات Tailwind RTL لتحسين دعم اللغة العربية في بعض المكونات</li>
            <li><strong>RBAC:</strong> منطق الصلاحيات يعمل بشكل صحيح - المشرف لا يستطيع التأثير على الأدمن ✅</li>
        </ul>
    </div>
    
    <div class="section">
        <div class="section-header">📋 تفاصيل الاختبارات</div>
        <div class="section-content">
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f3f4f6;">
                    <th style="padding: 10px; border: 1px solid #e5e7eb;">القسم</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb;">الاختبارات</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb;">ناجح</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb;">فاشل</th>
                    <th style="padding: 10px; border: 1px solid #e5e7eb;">تحذيرات</th>
                </tr>
'''

for section_key, section_title in section_names.items():
    tests = results['sections'].get(section_key, [])
    passed = sum(1 for t in tests if t['status'] == 'PASS')
    failed = sum(1 for t in tests if t['status'] == 'FAIL')
    warnings = sum(1 for t in tests if t['status'] == 'WARNING')
    total = len(tests)
    
    html_content += f'''
                <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">{section_title.split(' ', 1)[1] if ' ' in section_title else section_title}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">{total}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #16a34a;">{passed}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #dc2626;">{failed}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #f59e0b;">{warnings}</td>
                </tr>
'''

html_content += '''
            </table>
        </div>
    </div>
    
    <div class="footer">
        <p>تم إنشاء هذا التقرير تلقائياً بواسطة نظام ضمان الجودة</p>
        <p>Koora Voice QA Suite v1.0 | Emergent AI</p>
    </div>
</body>
</html>
'''

# Save HTML
with open('/app/docs/QA_Report_Arabic.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

# Convert to PDF
HTML(string=html_content).write_pdf('/app/docs/QA_Report_Arabic.pdf')

print("✅ تم إنشاء تقرير PDF بنجاح!")
print("📄 المسار: /app/docs/QA_Report_Arabic.pdf")
