# AI usage

This project was built with AI assistance. This file is the record of it. It is
graded as the finals badge, and it is worth 100 points.

I started documenting my AI usage during the first week and will continue
updating this file as the project develops.

## 1. How I used AI

### 2026-09-21 - Frontend folder structure

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for a folder structure for the Roomy frontend.
- **What it gave back:** It suggested organizing the project into pages, reusable components, layout components, room components, item components, and shared UI components.
- **What I kept, what I changed, and why:** I kept the structure because it separates page-level code from reusable components and makes the project easier to maintain.
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)

### 2026-09-21 - Reusable components

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for templates for reusable buttons and room components using React and Tailwind CSS.
- **What it gave back:** It provided component templates with reusable props, variants, hover states, and click handlers.
- **What I kept, what I changed, and why:** I kept the reusable component approach but changed the spacing, colors, dimensions, icons, and behavior to match my designs.
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)

### 2026-09-21 - Dark-mode interface

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for a dark mode based on the Roomy design system.
- **What it gave back:** It added Night mode colors, theme transitions, dark form controls, and a light-switch control.
- **What I kept, what I changed, and why:** I kept the dark-mode structure but adjusted the colors and contrast to better match my design preferences.
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)

### 2026-09-21 - Planner preview dimensions

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for the planner preview to resize when the Width and Depth values change.
- **What it gave back:** It connected the form values to the preview dimensions, but initially allowed the values to be set to 0.
- **What I kept, what I changed, and why:** I kept the resizing behavior because it gives immediate visual feedback when editing an item's dimensions. I changed the minimum value to 1 cm because an item cannot have a width or depth of 0.
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)

### 2026-09-23 - Item focus preview

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for an inventory item to open in an animated centered preview when clicked.
- **What it gave back:** It added an item detail popup with a card-to-center animation, item preview, name, category, storage status, dimensions, and notes.
- **What I kept, what I changed, and why:** I kept the popup and detail layout. I adjusted the size, animation origin, long-note wrapping, and close behavior to match the intended design.
- **Commit:** [Room management and inventory previews](https://github.com/Matt-CRL/roomy/commit/10a2ad2d800a9289c141d7475a9a332736082062)

### 2026-09-23 - Storage sidebar scrolling

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for an Open inventory action on storage units that reveals a separate sidebar for stored items.
- **What it gave back:** It added a fixed-height, scrollable sidebar with item cards, hidden scrollbars, and one-card scroll snapping.
- **What I kept, what I changed, and why:** I kept the separate sidebar layout. I changed its size, opening and closing animations, card spacing, and top/bottom edge behavior to make the scrolling feel more controlled.
- **Commit:** [Room management and inventory previews](https://github.com/Matt-CRL/roomy/commit/10a2ad2d800a9289c141d7475a9a332736082062)

## 2. Where the AI got it wrong

### Case 1 - Dark-mode toggle colors

- **What it gave me:** AI initially used orange and then white for the active Grid/List button in dark mode.
- **What was wrong with it:** Those colors did not match the contrast and visual direction I wanted for Night mode.
- **What I did instead:** I changed the active and hover states to neutral gray colors.
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)

### Case 2 - Planner shape selector

- **What it gave me:** AI added Square, Portrait, Landscape, Wide, and Circle shape options.
- **What was wrong with it:** I only wanted a simple square/rectangle shape for now.
- **What I did instead:** I reverted the extra shape selector and kept the simple square/rectangle preview.
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)

### Case 3 - Storage sidebar layout and closing animation

- **What it gave me:** AI initially placed the storage sidebar inside the main item card and moved the card while the sidebar was still closing.
- **What was wrong with it:** The main card expanded, the sidebar overlapped it, and the card briefly shifted or replayed its entrance animation when the sidebar disappeared.
- **What I did instead:** I separated the sidebar from the item card and staged the closing animation so the sidebar collapses first and the item card recenters afterward.
- **Commit:** [Room management and inventory previews](https://github.com/Matt-CRL/roomy/commit/10a2ad2d800a9289c141d7475a9a332736082062)


## 3. Who wrote what

### Written by me

- **File:** `client/src/pages/RoomsPage.jsx`
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)
- **What it does and why it is built this way:** I wrote the Rooms page to display the room summary, room cards, add-room card, and room navigation. I built it this way so users can see all their rooms and enter a specific room from one organized page.

- **File:** `client/src/pages/ItemFormPage.jsx`
- **Commit:** [Room management and inventory previews](https://github.com/Matt-CRL/roomy/commit/10a2ad2d800a9289c141d7475a9a332736082062)
- **What it does and why it is built this way:** I added the maximum character limits for item names and notes. Item names are limited to 80 characters and notes are limited to 500 characters, with a counter shown for notes so users know how much space remains.

- **File:** `client/src/pages/RoomsPage.jsx`, `client/src/components/rooms/RoomCard.jsx`
- **Commit:** [Room management and inventory previews](https://github.com/Matt-CRL/roomy/commit/10a2ad2d800a9289c141d7475a9a332736082062)
- **What it does and why it is built this way:** I added room management actions for renaming and deleting rooms. Rename validates the new name, while delete asks for confirmation before removing the room and its items. I built these actions into the room menu so they stay close to the room they affect.

### The AI-written part I understand best

- **File:** `client/src/pages/ItemFormPage.jsx`
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)
- **What it does and why we kept it:** This file contains the Add/Edit Item form. I understand how its React state stores the item values, how the dropdowns and inputs update the state, how storage settings affect the form, and how Width and Depth update the planner preview.
