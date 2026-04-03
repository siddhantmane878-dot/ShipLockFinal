const fs = require('fs');

const lines = [
  " ###  #   #  ###  ###   #      ###   ###  #   #",
  "#     #   #   #   #  #  #     #   # #   # #  # ",
  " ###  #####   #   ###   #     #   # #     ###  ",
  "    # #   #   #   #     #     #   # #   # #  # ",
  " ###  #   #  ###  #     #####  ###   ###  #   #"
];

let path = "";
const size = 1;

for (let y = 0; y < lines.length; y++) {
  for (let x = 0; x < lines[y].length; x++) {
    if (lines[y][x] !== " ") {
      path += `M${x * size},${y * size} h${size} v${size} h-${size} Z `;
    }
  }
}

const svg = `<svg viewBox="0 0 ${lines[0].length * size} ${lines.length * size}" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
  <path d="${path}" />
</svg>`;

console.log(svg);
