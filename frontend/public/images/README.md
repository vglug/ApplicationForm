# Images Directory

This directory contains static images that are publicly accessible.

## Usage

### In React Components:
```jsx
<img src="/images/logo.png" alt="Logo" />
```

### Directory Structure:
```
public/images/
├── logos/          # Organization logos, brand assets
├── icons/          # Icon files
├── backgrounds/    # Background images
└── misc/          # Other miscellaneous images
```

## Best Practices

1. **File Naming**: Use lowercase with hyphens (e.g., `vglug-logo.png`)
2. **Optimization**: Compress images before adding them
3. **Formats**:
   - Use PNG for logos and icons with transparency
   - Use JPG for photographs
   - Use SVG for scalable graphics
4. **Size**: Keep file sizes reasonable (< 500KB for most images)

## Examples

- Logo: `/images/logos/vglug-logo.png`
- Icon: `/images/icons/form-icon.svg`
- Background: `/images/backgrounds/hero-bg.jpg`
