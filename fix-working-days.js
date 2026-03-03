const fs = require('fs');

let file = fs.readFileSync('d:/doctour/app/admin/working-days/page.tsx', 'utf8');

file = file.replace(/colorScheme="teal"/g, 'bg="#666139" color="white" _hover={{ bg: "#555230" }}');
file = file.replace(/colorScheme="green"/g, 'bg="#666139" color="white" _hover={{ bg: "#555230" }}');
file = file.replace(/colorPalette="green"/g, 'bg="#666139" color="white"');
file = file.replace(/color="green"/g, 'color="#666139"');
file = file.replace(/color="teal"/g, 'color="#666139"');

file = file.replace(/#2d6a4f/g, '#666139');
file = file.replace(/#4a452a/g, '#4b482a');
file = file.replace(/#615b36/g, '#666139');
file = file.replace(/#c9b97a/g, '#a19965');

// For string literals like "green.500" -> "#666139"
file = file.replace(/"green\.50"/g, '"#f4f3ed"');
file = file.replace(/"green\.100"/g, '"#e0decc"');
file = file.replace(/"green\.400"/g, '"#8a8350"');
file = file.replace(/"green\.500"/g, '"#666139"');
file = file.replace(/"green\.600"/g, '"#555230"');
file = file.replace(/"teal\.500"/g, '"#666139"');
file = file.replace(/"teal\.600"/g, '"#555230"');
file = file.replace(/"teal\.50"/g, '"#f4f3ed"');

fs.writeFileSync('d:/doctour/app/admin/working-days/page.tsx', file, 'utf8');
console.log('done replacing colors!');
