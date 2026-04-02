#!/usr/bin/env python3
"""Generate Arabic PDF QA Report v2"""
import json
from weasyprint import HTML
from datetime import datetime

# Load test results
with open('/app/docs/qa_test_results_v2.json', 'r', encoding='utf-8') as f:
    results = json.load(f)

total = results['summary']['total_tests']
passed = results['summary']['passed']
failed = results['summary']['failed']
warnings = results['summary']['warnings']
pass_rate = (passed / total * 100) if total > 0 else 0

# Determine pass rate color
if pass_rate >= 80:
    rate_color = "#16a34a"  # Green
    rate_status = "ممتاز"
elif pass_rate >= 60:
    rate_color = "#f59e0b"  # Orange
    rate_status = "جيد"
else:
    rate_color = "#dc2626"  # Red
    rate_status = "يحتاج تحسين"

html_content = f'''
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
    <meta charset="UTF-8">
    <title>تقرير ضمان الجودة v2.0 - صوت الكورة</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        
        * {{ box-sizing: border-box; }}
        
        body {{
            font-family: 'Cairo', Arial, sans-serif;
            direction: rtl;
            text-align: right;
            line-height: 1.8;
            padding: 30px;
            max-width: 850px;
            margin: 0 auto;
            color: #1f2937;
            background: #fff;
        }}
        
        .header {{
            text-align: center;
            background: linear-gradient(135deg, #166534, #22c55e);
            color: white;
            padding: 30px;
            border-radius: 16px;
            margin-bottom: 30px;
        }}
        
        .header h1 {{
            font-size: 28px;
            margin: 0 0 10px 0;
        }}
        
        .header .version {{
            background: rgba(255,255,255,0.2);
            padding: 5px 15px;
            border-radius: 20px;
            display: inline-block;
            margin-top: 10px;
        }}
        
        .summary-card {{
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 16px;
            padding: 25px;
            margin-bottom: 25px;
        }}
        
        .pass-rate {{
            text-align: center;
            margin: 20px 0;
        }}
        
        .pass-rate .number {{
            font-size: 72px;
            font-weight: 700;
            color: {rate_color};
            line-height: 1;
        }}
        
        .pass-rate .status {{
            font-size: 24px;
            color: {rate_color};
            margin-top: 5px;
        }}
        
        .stats-grid {{
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-top: 25px;
        }}
        
        .stat-box {{
            background: white;
            padding: 20px;
            border-radius: 12px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }}
        
        .stat-box .num {{
            font-size: 32px;
            font-weight: 700;
        }}
        
        .stat-box .label {{
            font-size: 14px;
            color: #6b7280;
            margin-top: 5px;
        }}
        
        .stat-passed .num {{ color: #16a34a; }}
        .stat-failed .num {{ color: #dc2626; }}
        .stat-warnings .num {{ color: #f59e0b; }}
        .stat-total .num {{ color: #3b82f6; }}
        
        .section {{
            margin-bottom: 25px;
            border: 1px solid #e5e7eb;
            border-radius: 12px;
            overflow: hidden;
        }}
        
        .section-header {{
            background: #1e293b;
            color: white;
            padding: 15px 20px;
            font-size: 18px;
            font-weight: 600;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        
        .section-stats {{
            font-size: 14px;
            opacity: 0.9;
        }}
        
        .test-list {{
            padding: 0;
            margin: 0;
            list-style: none;
        }}
        
        .test-item {{
            display: flex;
            padding: 12px 20px;
            border-bottom: 1px solid #f3f4f6;
            align-items: flex-start;
            gap: 12px;
        }}
        
        .test-item:last-child {{
            border-bottom: none;
        }}
        
        .test-icon {{
            font-size: 18px;
            min-width: 24px;
        }}
        
        .test-name {{
            font-weight: 600;
            color: #374151;
        }}
        
        .test-desc {{
            color: #6b7280;
            font-size: 14px;
            margin-top: 2px;
        }}
        
        .improvements {{
            background: #f0fdf4;
            border: 2px solid #86efac;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 25px;
        }}
        
        .improvements h3 {{
            color: #166534;
            margin: 0 0 15px 0;
        }}
        
        .improvements ul {{
            margin: 0;
            padding-right: 20px;
        }}
        
        .improvements li {{
            margin-bottom: 8px;
        }}
        
        .footer {{
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 2px solid #e5e7eb;
            color: #9ca3af;
        }}
        
        .badge {{
            display: inline-block;
            padding: 3px 10px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }}
        
        .badge-pass {{ background: #dcfce7; color: #166534; }}
        .badge-fail {{ background: #fef2f2; color: #dc2626; }}
        .badge-warn {{ background: #fffbeb; color: #d97706; }}
        
        @page {{
            size: A4;
            margin: 1.5cm;
        }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 تقرير اختبارات ضمان الجودة</h1>
        <div>تطبيق صوت الكورة - Koora Voice</div>
        <div class="version">الإصدار 2.0 - {datetime.now().strftime('%Y-%m-%d %H:%M')}</div>
    </div>
    
    <div class="summary-card">
        <h2 style="text-align: center; margin: 0 0 10px 0; color: #374151;">📊 ملخص النتائج</h2>
        
        <div class="pass-rate">
            <div class="number">{pass_rate:.0f}%</div>
            <div class="status">{rate_status}</div>
        </div>
        
        <div class="stats-grid">
            <div class="stat-box stat-total">
                <div class="num">{total}</div>
                <div class="label">إجمالي الاختبارات</div>
            </div>
            <div class="stat-box stat-passed">
                <div class="num">{passed}</div>
                <div class="label">✅ ناجح</div>
            </div>
            <div class="stat-box stat-failed">
                <div class="num">{failed}</div>
                <div class="label">❌ فاشل</div>
            </div>
            <div class="stat-box stat-warnings">
                <div class="num">{warnings}</div>
                <div class="label">⚠️ تحذيرات</div>
            </div>
        </div>
    </div>
    
    <div class="improvements">
        <h3>✅ الإصلاحات المُطبّقة</h3>
        <ul>
            <li><strong>Agora Token:</strong> تم إصلاح توليد رمز Agora عند الانضمام للغرفة تلقائياً</li>
            <li><strong>Audio Drop Detection:</strong> تم إضافة نظام اكتشاف انقطاع الصوت</li>
            <li><strong>Audio Quality API:</strong> تم إضافة واجهة مراقبة جودة الصوت</li>
            <li><strong>Tailwind RTL:</strong> تم إضافة فئات RTL المحسّنة في Tailwind</li>
            <li><strong>CSS RTL:</strong> تم تحسين دعم RTL في ملفات CSS</li>
        </ul>
    </div>
'''

# Section names and icons
section_info = {
    'webrtc_agora': ('📡 اختبار تكامل Agora WebRTC', 'اختبار توليد الرموز، جودة الصوت، اكتشاف الانقطاع'),
    'websocket_stress': ('⚡ اختبار ضغط WebSocket', 'اختبار إرسال 50+ رسالة وقياس الأداء'),
    'rbac_logic': ('🔐 اختبار صلاحيات RBAC', 'التحقق من تسلسل الأدوار والصلاحيات'),
    'rtl_responsiveness': ('🔄 اختبار استجابة RTL', 'التحقق من دعم اللغة العربية واتجاه RTL')
}

# Add sections
for section_key, (section_title, section_desc) in section_info.items():
    tests = results['sections'].get(section_key, [])
    
    p = sum(1 for t in tests if t['status'] == 'PASS')
    f = sum(1 for t in tests if t['status'] == 'FAIL')
    w = sum(1 for t in tests if t['status'] == 'WARNING')
    
    html_content += f'''
    <div class="section">
        <div class="section-header">
            <span>{section_title}</span>
            <span class="section-stats">✅ {p} | ❌ {f} | ⚠️ {w}</span>
        </div>
        <p style="padding: 10px 20px; margin: 0; color: #6b7280; font-size: 14px; background: #f9fafb;">{section_desc}</p>
        <ul class="test-list">
'''
    
    for test in tests:
        icon = '✅' if test['status'] == 'PASS' else '❌' if test['status'] == 'FAIL' else '⚠️'
        badge_class = 'badge-pass' if test['status'] == 'PASS' else 'badge-fail' if test['status'] == 'FAIL' else 'badge-warn'
        status_text = 'ناجح' if test['status'] == 'PASS' else 'فاشل' if test['status'] == 'FAIL' else 'تحذير'
        
        html_content += f'''
            <li class="test-item">
                <span class="test-icon">{icon}</span>
                <div>
                    <div class="test-name">{test['test_name']} <span class="badge {badge_class}">{status_text}</span></div>
                    <div class="test-desc">{test['details']}</div>
                </div>
            </li>
'''
    
    html_content += '''
        </ul>
    </div>
'''

# Summary table
html_content += '''
    <div class="section">
        <div class="section-header">📋 جدول ملخص الاختبارات</div>
        <div style="padding: 20px;">
            <table style="width: 100%; border-collapse: collapse;">
                <tr style="background: #f3f4f6;">
                    <th style="padding: 12px; border: 1px solid #e5e7eb; text-align: right;">القسم</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb;">الاختبارات</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb;">✅ ناجح</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb;">❌ فاشل</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb;">⚠️ تحذير</th>
                    <th style="padding: 12px; border: 1px solid #e5e7eb;">النسبة</th>
                </tr>
'''

for section_key, (section_title, _) in section_info.items():
    tests = results['sections'].get(section_key, [])
    p = sum(1 for t in tests if t['status'] == 'PASS')
    f = sum(1 for t in tests if t['status'] == 'FAIL')
    w = sum(1 for t in tests if t['status'] == 'WARNING')
    t = len(tests)
    rate = (p / t * 100) if t > 0 else 0
    
    html_content += f'''
                <tr>
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">{section_title.split(' ', 1)[1]}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">{t}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #16a34a; font-weight: 600;">{p}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #dc2626; font-weight: 600;">{f}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #f59e0b; font-weight: 600;">{w}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; font-weight: 600;">{rate:.0f}%</td>
                </tr>
'''

html_content += f'''
                <tr style="background: #f0fdf4; font-weight: 600;">
                    <td style="padding: 10px; border: 1px solid #e5e7eb;">المجموع</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center;">{total}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #16a34a;">{passed}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #dc2626;">{failed}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #f59e0b;">{warnings}</td>
                    <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: {rate_color};">{pass_rate:.0f}%</td>
                </tr>
            </table>
        </div>
    </div>
    
    <div class="footer">
        <p>🧪 تم إنشاء هذا التقرير تلقائياً بواسطة نظام ضمان الجودة</p>
        <p>Koora Voice QA Suite v2.0 | Emergent AI | {datetime.now().strftime('%Y-%m-%d')}</p>
    </div>
</body>
</html>
'''

# Save HTML
with open('/app/docs/QA_Report_v2_Arabic.html', 'w', encoding='utf-8') as f:
    f.write(html_content)

# Convert to PDF
HTML(string=html_content).write_pdf('/app/docs/QA_Report_v2_Arabic.pdf')

print("✅ تم إنشاء تقرير PDF بنجاح!")
print("📄 المسار: /app/docs/QA_Report_v2_Arabic.pdf")
