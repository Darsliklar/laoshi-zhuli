#!/usr/bin/env python3
"""apps-script/Code.gs ni yaratadi: Code.template.gs + laoshi/grade.js (baholash bir xil bo'lishi uchun)."""
import os
d = os.path.join(os.path.dirname(__file__), '..')
tpl = open(os.path.join(d, 'apps-script', 'Code.template.gs'), encoding='utf-8').read()
grade = open(os.path.join(d, 'laoshi', 'grade.js'), encoding='utf-8').read()
grade = grade.replace("if(typeof module !== 'undefined') module.exports = LZGrade;", '')
out = tpl.replace('/*@@GRADE@@*/', '/* ---- laoshi/grade.js dan avtomatik ko\'chirildi ---- */\n' + grade.strip() + '\n/* ---- grade.js tugadi ---- */')
open(os.path.join(d, 'apps-script', 'Code.gs'), 'w', encoding='utf-8').write(out)
print('OK → apps-script/Code.gs')
