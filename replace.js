const fs = require('fs');
const files = [
  'Frontend/src/page/dashboard/RoleDashboard.jsx',
  'Frontend/src/page/tests/RoleTestList.jsx',
  'Frontend/src/page/tests/TestDetailModal.jsx',
  'Frontend/src/page/tests/TestManagementHub.jsx'
];

files.forEach(f => {
   if(fs.existsSync(f)) {
      let content = fs.readFileSync(f, 'utf8');
      content = content.replace(/role === 'TA'/g, "(role === 'TA' || role === 'AI')");
      fs.writeFileSync(f, content);
      console.log('Updated', f);
   } else {
      console.log('Not found:', f);
   }
});
