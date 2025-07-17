# CSS Module Architecture

This project uses a modular CSS architecture for better organization and maintainability.

## Structure

```
css/
├── main.css              # Main entry point that imports all modules
└── modules/
    ├── variables.css     # CSS custom properties (colors, spacing, etc.)
    ├── utilities.css     # Single-purpose utility classes
    ├── components.css    # Reusable UI components
    └── pages.css        # Page-specific styles
```

## Module Descriptions

### variables.css
Contains all CSS custom properties including:
- Color palette (blacks, reds, neutrals)
- Typography (font families, sizes, weights)
- Spacing scale
- Transitions and animations
- Z-index scale
- Common patterns (shadows, borders, overlays)

### utilities.css
Single-purpose utility classes for:
- Spacing (margin, padding)
- Typography (font size, weight, alignment)
- Display and positioning
- Backgrounds and borders
- Responsive utilities

### components.css
Reusable UI components:
- Buttons and CTAs
- Navigation and header
- Cards and modals
- Forms and inputs
- Product cards
- Footer
- Notifications

### pages.css
Page-specific styles for:
- Homepage sections
- Contact page
- Shop page
- Events page
- About page
- Authentication pages
- Admin pages

## Usage

All HTML files should link to `css/main.css`:

```html
<link rel="stylesheet" href="css/main.css">
```

For files in subdirectories, use the appropriate relative path:
```html
<link rel="stylesheet" href="../css/main.css">
```

## Benefits

1. **Maintainability**: Each module has a single responsibility
2. **Reusability**: Components and utilities can be used across pages
3. **Scalability**: Easy to add new modules or extend existing ones
4. **Performance**: Modules can be optimized individually
5. **Team Collaboration**: Clear separation of concerns

## Adding New Styles

- Variables: Add to `variables.css`
- Utility classes: Add to `utilities.css`
- Reusable components: Add to `components.css`
- Page-specific styles: Add to `pages.css`

## Custom Overrides

Any project-specific overrides that don't fit the modular structure can be added at the bottom of `main.css`.