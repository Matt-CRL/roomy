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

### 2026-09-21 - Frontend components and theme

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for reusable buttons and room components using React and Tailwind CSS, then asked for a dark mode based on the Roomy design system.
- **What it gave back:** It provided component templates with reusable props, variants, hover states, and click handlers, along with Night mode colors, theme transitions, dark form controls, and a light-switch control.
- **What I kept, what I changed, and why:** I kept the reusable component and theme approach, but changed the spacing, colors, dimensions, icons, behavior, and contrast to match my designs.
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

### 2026-09-27 - Room planner interactions and backend foundation

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for help with the technically difficult parts of the Add Room planner preview, including live width and depth resizing, dimension lines, zooming around the cursor, pan behavior, selectable and draggable walls, minimum room-size constraints, and a moveable 50 cm by 30 cm preview object that stays inside the room while rotating. I also asked for help setting up the Supabase and Express backend needed for authentication, PostgreSQL data, private photos, room layouts, and storage-unit move/delete decisions.
- **What it gave back:** It connected the preview to the room dimensions, translated pointer movement between screen pixels and centimeters, constrained walls and preview objects to valid room bounds, and added zoom/pan state. For the backend, it provided Supabase session verification, PostgreSQL migrations, ownership-scoped repository queries, transactional storage-unit operations with contents-version checks, private photo routes, and revision-controlled room layouts.
- **What I kept, what I changed, and why:** I kept the coordinate and validation logic because these parts prevent invalid room layouts and data from being saved. I tested the behavior locally and changed the visual dimensions, colors, constraints, and interaction details to match my Roomy designs. I also kept the backend structure because it separates authentication, validation, database access, photo storage, and HTTP routes, making the real mode easier to test and maintain.
- **Commit:** [Connect Supabase backend and polish Roomy frontend](https://github.com/Matt-CRL/roomy/commit/9c4b453e0df859359465bcfa1de448db9f999e72)

## 2. Where the AI got it wrong

### Case 1 - Initial UI direction and scope

- **What it gave me:** AI initially used orange and then white for the active Grid/List button in dark mode, and it added Square, Portrait, Landscape, Wide, and Circle shape options to the planner.
- **What was wrong with it:** The colors did not match the contrast and visual direction I wanted for Night mode, and the planner became more complex than the simple square/rectangle preview I wanted at that stage.
- **What I did instead:** I changed the active and hover states to neutral gray colors, reverted the extra shape selector, and kept the simple square/rectangle preview.
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)

### Case 2 - Storage sidebar layout and closing animation

- **What it gave me:** AI initially placed the storage sidebar inside the main item card and moved the card while the sidebar was still closing.
- **What was wrong with it:** The main card expanded, the sidebar overlapped it, and the card briefly shifted or replayed its entrance animation when the sidebar disappeared.
- **What I did instead:** I separated the sidebar from the item card and staged the closing animation so the sidebar collapses first and the item card recenters afterward.
- **Commit:** [Room management and inventory previews](https://github.com/Matt-CRL/roomy/commit/10a2ad2d800a9289c141d7475a9a332736082062)

### Case 3 - Add Room planner first-pass behavior

- **What it gave me:** AI produced an initial interactive Add Room planner with live dimension changes, zooming, panning, draggable walls, and a moveable 50 cm by 30 cm preview object.
- **What was wrong with it:** It did not work correctly in one pass. Zooming could clip the room against an invisible boundary, resizing walls could leave gaps between the floor and walls, dimension labels and arrows became unreliable at very small sizes, and rotating the preview object could produce small measurement errors such as 50.1 cm by 30.1 cm. The rotation guide also needed repeated corrections to its direction, size, and position.
- **What I did instead:** I repeatedly configured and prompted the implementation to reset the preview when reopened, zoom around the cursor, keep wall thickness visually consistent, clamp room dimensions to the preview object, keep the object inside the room, round rotated bounds, correct the dimension-line geometry, and refine the rotation guide until the interactions matched the intended design.
- **Commit:** [Connect Supabase backend and polish Roomy frontend](https://github.com/Matt-CRL/roomy/commit/9c4b453e0df859359465bcfa1de448db9f999e72)


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

- **File:** `client/src/pages/RoomInventoryPage.jsx`, `client/src/components/common/TiltEffect.jsx`
- **Commit:** [Connect Supabase backend and polish Roomy frontend](https://github.com/Matt-CRL/roomy/commit/9c4b453e0df859359465bcfa1de448db9f999e72)
- **What it does and why it is built this way:** I made the item-details card open as the main focus and added the tilt interaction when the card is hovered. The card responds to the cursor as a whole, with subtle perspective and glare, giving users the feeling of inspecting an item from different angles, similar to examining something in real life.

- **File:** `client/src/pages/ItemFormPage.jsx`, `client/src/data/photoDisplay.js`
- **Commit:** [Connect Supabase backend and polish Roomy frontend](https://github.com/Matt-CRL/roomy/commit/9c4b453e0df859359465bcfa1de448db9f999e72)
- **What it does and why it is built this way:** In earlier versions, the uploaded image did not always show the exact part of the object I wanted in the inventory card. I updated the Add/Edit Item form so users can drag the photo, adjust its zoom, reset the adjustment, and preview the exact card treatment before saving. This lets users choose precisely which part of the item appears in the inventory card.

- **File:** `client/src/pages/AuthPage.jsx`
- **Commit:** [Connect Supabase backend and polish Roomy frontend](https://github.com/Matt-CRL/roomy/commit/9c4b453e0df859359465bcfa1de448db9f999e72)
- **What it does and why it is built this way:** I made the Roomy login and Create Account page, including the display-name field, email validation, password requirements, confirm-password checking, dark mode, and the responsive two-panel layout. I built it this way so authentication has the same visual language as the rest of Roomy while still giving users clear feedback before creating an account.

### The AI-written part I understand best

- **File:** `client/src/pages/ItemFormPage.jsx`
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)
- **What it does and why we kept it:** This file contains the Add/Edit Item form. I understand how its React state stores the item values, how the dropdowns and inputs update the state, how storage settings affect the form, and how Width and Depth update the planner preview.

- **File:** `server/app.js`, `server/validation.js`, `server/roomyRepo.js`
- **Commit:** [Connect Supabase backend and polish Roomy frontend](https://github.com/Matt-CRL/roomy/commit/9c4b453e0df859359465bcfa1de448db9f999e72)
- **What it does and why we kept it:** These files define the protected API flow. I understand how the routes validate incoming data, how the verified Supabase user ID scopes database queries to one owner, and how the repository uses parameterized SQL for rooms and items. I also understand how storage-unit move and delete operations check the current contents version before deciding whether child items move with the storage unit or become unstored.
