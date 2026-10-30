# Vincent Saïsset — editable website recreation

This project is a native, editable HTML/CSS/JavaScript recreation based on the reference video. It does **not** play the reference video as the website.

## What's editable

- `index.html`: sections, text, project titles, project descriptions, contact links, and project URLs.
- `styles.css`: typography, colors, spacing, section heights, position, responsive layout, cursor appearance, and transitions. The project rows now follow a consistent 25vh rhythm, and the preview artwork is sized and aligned as a near-square panel on the right.
- `app.js`: scroll-linked transitions, project state changes, hover behavior, and custom cursor animation. The About copy moves farther into its reference position as the user finishes scrolling through that section.
- `assets/project-*.jpg`: project preview artwork. These five preview images are crops prepared from the user-provided reference recording; they are still replaceable image files, not a video player.

## Run in VS Code

1. Extract the ZIP.
2. Open the `vincent-editable-site` folder with VS Code.
3. Install the **Live Server** extension if needed.
4. Right-click `index.html` and select **Open with Live Server**.
5. The site will open in your browser. No npm install or build step is required.

You can also open `index.html` directly, although Live Server is recommended for predictable local asset loading.

## Edit the website

- Change words and project links in `index.html`.
- Change font sizes, colors, and positions in `styles.css` using the variables near the top and the section-specific rules.
- Change scroll timing and project switching in `app.js`.
- Replace any preview JPG in `assets/` with a new image that uses the same filename, or update its path in `index.html`.

## Important accuracy note

The layout, text, cursor, project list, section transitions, scroll-linked transforms, and responsive behavior are implemented as real HTML/CSS/JavaScript. The project-preview artworks are raster crops from the supplied recording because the original site's source assets were not available to this build. This is a close visual recreation, not the original site's source code.
