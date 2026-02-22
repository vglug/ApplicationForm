# Assets Images Directory

This directory contains images that are imported directly into components.

## Usage

### Import in React Components:
```jsx
import logo from '@/assets/images/logo.png'

function MyComponent() {
  return <img src={logo} alt="Logo" />
}
```

### With TypeScript:
Create type declarations if needed in `src/vite-env.d.ts`

## When to Use This Directory vs public/images

### Use `src/assets/images/` when:
- Images are imported in components
- Need webpack/vite processing (optimization, hashing)
- Part of the component bundle

### Use `public/images/` when:
- Referenced in HTML files
- Dynamically loaded via URL
- Need fixed public URL
- Used in meta tags or manifest

## Directory Structure:
```
src/assets/images/
├── components/     # Component-specific images
├── icons/          # Icon files
└── misc/          # Other assets
```

## Best Practices

1. **File Naming**: Use camelCase or kebab-case consistently
2. **Organization**: Group by feature/component
3. **Size**: Keep optimized (Vite will process them)
4. **Formats**: SVG preferred for icons and scalable graphics
