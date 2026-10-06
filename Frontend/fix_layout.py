import os
import re

filepath = 'src/component/MainLayout.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Remove the empty Cloud button
code = re.sub(
    r'<button className="p-1\.5 text-gray-600 hover:bg-gray-100 rounded-full">\s*<Cloud size=\{20\} />\s*</button>',
    '',
    code
)

# 2. Add fixed inset-0 overlay for user menu to close on click outside
code = re.sub(
    r'(\{showUserMenu && \(\s*)<div className="absolute right-0 mt-2',
    r'\1<>\n                <div className="fixed inset-0 z-30" onClick={() => setShowUserMenu(false)}></div>\n                <div className="absolute right-0 mt-2',
    code
)
code = re.sub(
    r'Log Out</button>\s*</div>\s*\)\}',
    r'Log Out</button>\n                </div>\n              </>\n            )}',
    code
)

# 3. Remove Support button and modal
code = re.sub(
    r'<div className="relative">\s*<button\s*onClick=\{.*?setShowSupportModal\(true\)\}\s*className=\{.*?Support.*?\}\s*>\s*<HelpCircle.*?>\s*\{sidebarOpen && <span>Support</span>\}\s*</button>\s*</div>',
    '',
    code, flags=re.DOTALL
)

code = re.sub(
    r'\{\/\* Support Modal \*\/\}.*?Dashboard Guide & Support.*?</div>\s*</div>\s*\)\}',
    '',
    code, flags=re.DOTALL
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(code)

print("Done")
