import fs from 'fs';
import path from 'path';

function upgradeCssFile(filePath) {
  const fullPath = path.resolve(filePath);
  let content = fs.readFileSync(fullPath, 'utf8');

  // Replace sub-13px font sizes across the file
  content = content.replace(/font-size:\s*(7|8|8\.5|9|9\.5|10)px(\s*!important)?;?/g, 'font-size: 12.5px$2;');
  content = content.replace(/font-size:\s*(10\.5|11)px(\s*!important)?;?/g, 'font-size: 13.5px$2;');
  content = content.replace(/font-size:\s*(11\.5|12)px(\s*!important)?;?/g, 'font-size: 14px$2;');
  content = content.replace(/font-size:\s*(12\.5|13)px(\s*!important)?;?/g, 'font-size: 14.5px$2;');

  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(filePath + ' fully upgraded.');
}

// 1. Upgrade all admin CSS files
upgradeCssFile('admin/src/styles.css');
upgradeCssFile('admin/src/commerce.css');
upgradeCssFile('admin/src/orders-manager.css');
upgradeCssFile('admin/src/types-manager.css');

console.log('All admin CSS files successfully updated!');
