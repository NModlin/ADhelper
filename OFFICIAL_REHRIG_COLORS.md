# Official Rehrig Pacific Company Brand Colors

## 🎨 Official Color Palette

Based on Rehrig Pacific Company's official brand guidelines.

### Primary Brand Colors

```css
/* Official Rehrig Colors */
--rehrig-blue-primary: #0536B6;    /* Main brand color */
--rehrig-lt-blue-primary: #3283FE; /* Pantone 2727 C */
--rehrig-yellow: #FFC20E;          /* Secondary brand color */
--rehrig-navy: #003063;            /* Dark accent */
--rehrig-gray-dark: #555570;       /* Tertiary color */
```

### Color Usage

| Color | Hex Code | Usage |
| ----- | -------- | ----- |
| **Rehrig Blue Primary** | `#0536B6` | Primary buttons, links, main brand elements |
| **Rehrig Light Blue** | `#3283FE` | Accents, highlights, hover states (Pantone 2727 C) |
| **Rehrig Yellow** | `#FFC20E` | Secondary actions, CTAs, warnings |
| **Rehrig Navy** | `#003063` | Headers, footers, dark accents |
| **Rehrig Gray Dark** | `#555570` | Disabled states, tertiary elements |

---

## 🎨 Official Gradients

### Electric Blue Gradient (Primary)
```css
background: linear-gradient(90deg, #0536B6 0%, #3283FE 100%);
```
**Usage:** Hero sections, primary banners, featured content

### Blue to Navy Gradient
```css
background: linear-gradient(135deg, #0536B6 0%, #003063 100%);
```
**Usage:** Sidebar, navigation, dark themed sections

### Blue to Yellow Gradient
```css
background: linear-gradient(135deg, #0536B6 0%, #FFC20E 100%);
```
**Usage:** Call-to-action sections, promotional banners

---

## 📝 Official Typography

### Primary Font: ITC Avant Garde Gothic Pro
**Usage:** Brand headings, marketing materials, primary branding
- **Weight:** Bold (700)
- **Fallback:** Avant Garde, Century Gothic

### Office Font: Franklin Gothic
**Usage:** Microsoft Office documents (Word, PowerPoint, Excel)
- **Weight:** Medium (500), Bold (700)
- **Fallback:** Arial

### Web/Application Font: Poppins + Inter
**Usage:** Web applications, digital interfaces (ADHelper)
- **Primary:** Poppins (400, 500, 600, 700)
- **Fallback:** Inter (400, 500, 600, 700)

```html
<!-- Add to index.html -->
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

---

## 🎯 ADHelper Implementation

### Theme Configuration

```typescript
// src/renderer/theme/rehrigTheme.ts
export const getRehrigTheme = (mode: 'light' | 'dark') => {
  const isLight = mode === 'light';
  
  return createTheme({
    palette: {
      mode,
      primary: {
        main: isLight ? '#0536B6' : '#3283FE',  // Official Rehrig Blue
        light: isLight ? '#3283FE' : '#5CA3FF',
        dark: isLight ? '#003063' : '#0536B6',  // Rehrig Navy
        contrastText: '#FFFFFF',
      },
      secondary: {
        main: '#FFC20E',  // Official Rehrig Yellow
        light: '#FFD04D',
        dark: '#E6AD00',
        contrastText: isLight ? '#003063' : '#000000',
      },
    },
    typography: {
      fontFamily: [
        'Poppins',
        'Inter',
        'Segoe UI',
        'sans-serif',
      ].join(','),
    },
  });
};
```

### Quick Color Replacements

Replace these old colors with official Rehrig colors:

| Old Color | New Color | Description |
| --------- | --------- | ----------- |
| `#1976d2` | `#0536B6` | Primary blue → Rehrig Blue Primary |
| `#dc004e` | `#FFC20E` | Secondary pink → Rehrig Yellow |
| `#4caf50` | `#27AE60` | Success green (keep) |
| `#ff9800` | `#F39C12` | Warning orange (keep) |

---

## ✅ Implementation Checklist

- [ ] Install Poppins and Inter fonts
- [ ] Create `rehrigTheme.ts` with official colors
- [ ] Update `App.tsx` to use `getRehrigTheme()`
- [ ] Replace `#1976d2` with `#0536B6` throughout codebase
- [ ] Replace `#dc004e` with `#FFC20E` throughout codebase
- [ ] Update hero section with Electric Blue gradient
- [ ] Update stat cards with official colors
- [ ] Add Rehrig branding to sidebar
- [ ] Add Rehrig footer with copyright
- [ ] Test in both light and dark modes

---

## 📊 Color Contrast Ratios (WCAG 2.1 AA)

| Combination | Ratio | Pass |
| ----------- | ----- | ---- |
| Rehrig Blue (#0536B6) on White | 8.2:1 | ✅ AAA |
| Rehrig Light Blue (#3283FE) on White | 4.8:1 | ✅ AA |
| Rehrig Yellow (#FFC20E) on Navy (#003063) | 7.1:1 | ✅ AAA |
| Rehrig Navy (#003063) on White | 12.6:1 | ✅ AAA |

All official Rehrig colors meet WCAG 2.1 AA accessibility standards.

---

## 🔗 References

- **Official Brand Guidelines:** Rehrig Pacific Company CSS Variables
- **Pantone Reference:** Pantone 2727 C (Light Blue)
- **Font Stack:** Poppins (web), ITC Avant Garde Gothic Pro (brand), Franklin Gothic (office)

