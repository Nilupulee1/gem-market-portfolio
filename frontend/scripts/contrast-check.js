function hexToRgb(hex) {
  hex = hex.replace('#','');
  if (hex.length === 3) hex = hex.split('').map(c=>c+c).join('');
  const num = parseInt(hex,16);
  return [(num>>16)&255, (num>>8)&255, num&255];
}

function rgbaStringToRgb(str) {
  // accepts rgba(r,g,b,a)
  const m = str.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const parts = m[1].split(',').map(s=>s.trim());
  const r = parseFloat(parts[0]);
  const g = parseFloat(parts[1]);
  const b = parseFloat(parts[2]);
  const a = parts[3] ? parseFloat(parts[3]) : 1;
  // blend over white
  const blend = (c) => Math.round((1 - a) * 255 + a * c);
  return [blend(r), blend(g), blend(b)];
}

function sRGBtoLinear(c){
  c = c/255;
  return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055,2.4);
}

function luminance(rgb){
  return 0.2126 * sRGBtoLinear(rgb[0]) + 0.7152 * sRGBtoLinear(rgb[1]) + 0.0722 * sRGBtoLinear(rgb[2]);
}

function contrastRatio(a,b){
  const L1 = luminance(a);
  const L2 = luminance(b);
  const light = Math.max(L1,L2);
  const dark = Math.min(L1,L2);
  return +( (light + 0.05) / (dark + 0.05) ).toFixed(2);
}

const palette = {
  'page-bg': '#f3eefc',
  'page-surface': '#ffffff',
  'text-primary': '#1f2a37',
  'text-inverse': '#f8fbff',
  'color-bright': '#2f6de1',
  'color-primary': '#1f4f82',
  'color-navy': '#0f2340',
  'color-gold': '#d4a574',
  // updated to match CSS token after WCAG adjustment
  //'color-gold': '#d4a574',
  'color-gold': '#d4a574',
  'color-gold-on-light': '#816546',
  'chip-bg': 'rgba(47,109,225,0.12)'
};

function toRgb(input){
  if (input.startsWith('#')) return hexToRgb(input);
  if (input.startsWith('rgba')) return rgbaStringToRgb(input);
  if (input.startsWith('rgb')) return rgbaStringToRgb(input);
  return null;
}

const pairs = [
  ['text-primary','page-bg'],
  ['text-primary','page-surface'],
  ['text-inverse','color-bright'],
  ['text-inverse','color-primary'],
  ['text-inverse','color-navy'],
  ['color-bright','page-surface'],
  ['color-primary','page-surface'],
  // test brand gold on dark background (intended use)
  ['color-gold','color-navy'],
  // test darker gold when used on light surfaces
  ['color-gold-on-light','page-surface'],
  // text contrast when placed on the lighter gold
  ['text-primary','color-gold-on-light'],
  ['text-primary','chip-bg']
];

console.log('Contrast report for selected pairs (WCAG ratios)');
console.log('Pass thresholds: AA normal >=4.5, AA large >=3.0');
console.log('-------------------------------------------------');

pairs.forEach(p=>{
  const a = toRgb(palette[p[0]]);
  const b = toRgb(palette[p[1]]);
  if (!a || !b) return console.log('Skipping',p.join(' on '));
  const ratio = contrastRatio(a,b);
  const passNormal = ratio>=4.5;
  const passLarge = ratio>=3.0;
  console.log(`${p[0]} on ${p[1]}: ${ratio} — AA normal: ${passNormal ? 'PASS' : 'FAIL'}, AA large: ${passLarge ? 'PASS' : 'FAIL'}`);
});

// Suggest darker alternative for color-gold if failing
function darken(hex,amount=0.12){
  const [r,g,b] = hexToRgb(hex);
  const dr = Math.max(0, Math.round(r*(1-amount)));
  const dg = Math.max(0, Math.round(g*(1-amount)));
  const db = Math.max(0, Math.round(b*(1-amount)));
  return '#' + [dr,dg,db].map(x=>x.toString(16).padStart(2,'0')).join('');
}

const goldRatio = contrastRatio(toRgb(palette['color-gold']), toRgb(palette['page-surface']));
if (goldRatio < 4.5){
  const alt = darken(palette['color-gold'], 0.22);
  console.log('\n-- Suggested adjustment:');
  console.log(`Current gold ${palette['color-gold']} on white = ${goldRatio} (fails). Try darker ${alt}`);
}

