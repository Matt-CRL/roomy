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

### 2026-10-04 - Planner rotation and boundary calculations

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for planner objects to rotate using an interaction similar to the person guide, and for rotated objects to remain movable near walls without incorrectly reporting that they were outside the room.
- **What it gave back:** It implemented rotation controls and geometry helpers for translating cursor movement into room coordinates, calculating rotated footprints, and constraining movement and resizing to the room dimensions.
- **What I kept, what I changed, and why:** I kept the geometry-based approach because the planner needs to check the whole rotated shape, not just its unrotated width and depth. I requested corrections when moving a rotated object near a wall caused an outside-room error, and requested smaller resize handles and contrasting controls so they remain visible on light-colored objects. These refinements made the interaction better match the intended planner behavior.
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)

### 2026-10-04 to 2026-10-05 - Planner autosave and conflicting saves

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for the planner to save automatically using a debounce pattern, keep Save now available even when there are no changes, and show when the layout was last saved. During QA, I also asked for verification of layout persistence and conflicting saves.
- **What it gave back:** It added delayed autosaving after a pause in editing, manual saving, last-saved feedback, and failure handling. The planner used revision-based saves to detect stale or simultaneous updates, while the backend saved layout changes and related room/item dimensions in a transaction. QA checked persistence, stale revisions, and concurrent save conflicts.
- **What I kept, what I changed, and why:** I kept debounced saving to avoid sending a request for every pointer movement. I requested that Save now remain enabled even when there are no unsaved changes, along with clearer last-saved wording so users can control and understand saving. The button can still be disabled while saving or loading, or when the room dimensions are not valid. I kept conflict detection and draft preservation because a failed or outdated save should not silently overwrite another saved version. API conflict checks passed in the separate test project; detailed browser autosave interactions still need recorded testing.
- **Commits:** [Planner workspace and save interactions](https://github.com/Matt-CRL/roomy/commit/483579c), [Security remediation and additional verification](https://github.com/Matt-CRL/roomy/commit/7f9da8e)

### 2026-10-05 - Backend security and account isolation

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked for predeployment QA and implementation of its remediation plan, including checking that private room, item, layout, and photo data cannot be accessed by another account. I clarified that Supabase was already configured and set up a separate test project before trying the database security changes.
- **What it gave back:** It implemented restricted runtime and photo-maintenance database roles, an owner-scoped row-level security migration, transaction-local user identity, and preflight checks for database permissions and the private photo bucket. It added automated configuration, policy, and transaction tests and checked actual database/API behavior with two temporary accounts in the isolated project.
- **What I kept, what I changed, and why:** I kept the layered access checks because ownership filters in application queries alone are not enough when the API connects with an RLS-bypassing admin role. I followed the separate-test-project approach to protect existing data and worked through login-password and trusted-certificate configuration issues. The isolated role preflight, cross-account isolation, private photo cleanup, and planner API checks passed. I kept the original database cutover pending a separate reviewed plan rather than treating test-project results as proof that production is secure.
- **Commit:** [Harden app configuration and enforce owner-scoped database access](https://github.com/Matt-CRL/roomy/commit/7f9da8e)

### 2026-10-05 - Visual assets, planner loading animation, and cursor effects

- **Tool:** Canva for drawing the logo and mascot; GPT for improving my Canva logo and generating stickers; Google Flow for animation; ChatGPT/Codex for implementing the effects.
- **What I asked for:** I drew the Roomy logo and mascot in Canva and used GPT to improve the logo I had made. I then used Google Flow to animate the artwork for the loading screen in planner mode. I also used GPT to generate sticker assets in a consistent style and asked Codex to implement different cursor effects for Light mode and Night mode.
- **What it gave back:** GPT provided improvements to my Canva logo and generated the sticker images, Google Flow produced the loading animation, and Codex implemented a sticker image trail in Light mode and a warm light/glow effect following the cursor in Night mode. The implementation used the prepared assets rather than requiring users to generate them at runtime.
- **What I kept, what I changed, and why:** I kept my Canva artwork as the visual foundation and used the animation and stickers to give Roomy a more playful identity. I directed Codex to keep both cursor effects behind page content so they would not cover cards, inputs, or buttons, and to limit the authentication-page effects to the left panel. I also requested a warmer, brighter Night-mode glow and disabled the sticker trail in planner mode so it would not interfere with arranging objects. The artwork, generated assets, animation, and coded interactions were separate parts of the workflow, with me choosing the style and directing how they were used.
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)

### 2026-10-09 - Vercel deployment preparation

- **Tool:** ChatGPT/Codex
- **What I asked for:** I asked Codex to implement the approved plan to prepare Roomy for public deployment on the Vercel Hobby plan.
- **What it gave back:** It prepared the Express Function startup path with the existing fail-closed database and private-Storage checks, added Vercel pool lifecycle handling and a secret-protected daily photo-cleanup endpoint, kept the five-minute retry only in local development, and made cleanup batches use row locks so overlapping workers do not process the same jobs. It aligned the upload limit to 4 MiB, added Vercel SPA routing and browser security headers, made the Pages workflow manual-only, updated the deployment documentation, and fixed a critical dependency advisory. It also added tests for the cleanup worker, cron authorization/configuration, SPA settings, and photo size boundary.
- **What I kept, what I changed, and why:** I kept the existing React/Vite, Express, and Supabase architecture and its restricted database roles. The 4 MiB limit and daily retry match the approved Hobby plan constraints. I reviewed the generated work and ran the tests and builds. The Vercel projects, SMTP provider, Auth redirects, backup setup, and hosted checks still need account-side configuration, so I have not described Roomy as deployed or production-ready.
- **Commit:** [Add Vercel deployment configuration and safeguards](https://github.com/Matt-CRL/roomy/commit/ad5e7644897e4046471f39f06569513f76f187f6)

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


### Case 4 - Rotated objects incorrectly rejected near walls

- **What it gave me:** AI added rotation controls to planner objects based on the interaction used by the person guide. However, after I rotated an object and moved it close to a wall, the planner could report that a shape was outside the room dimensions. The rotation feature worked on its own, but combining rotation with movement exposed a boundary-handling problem.
- **What was wrong with it:** The planner already accounted for rotation, but rounding a clamped position to two decimal places could push the rotated bounds slightly outside a wall. The recorded investigation found overflow of up to 0.005 cm, while the server allowed only 0.0001 cm. That small rounding difference made positions that looked valid in the preview fail the stricter save validation, interrupting the move-and-save workflow.
- **What I did instead:** I identified the sequence that caused the problem—rotate an object, move it close to a wall, then encounter the outside-room error—and gave that reproduction case to the AI. I directed it to investigate and correct the boundary logic while preserving object rotation and the requirement that shapes stay inside the room. The AI traced the issue to position rounding and changed the clamping to use safe, inward-rounded hundredth-centimeter limits rather than loosening server validation. The recorded regression check passed 14,400 rotated-placement cases across all four walls. My role was to identify the failing interaction and direct the correction toward valid placement rather than removing the safety check.
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)

### Case 5 - Room preview did not match the saved planner layout

- **What it gave me:** I asked AI to update the Your Rooms previews so they displayed the objects saved in planner mode. The resulting preview showed the contents, but objects could overlap the room walls instead of appearing correctly contained within the room. This meant that adding saved objects to the preview was not enough to make it accurately represent the planner.
- **What was wrong with it:** The room card is a smaller representation of the planner, so its object coordinates, dimensions, and rotation need to be mapped into the preview's room interior consistently. Incorrect positioning or scaling made the arrangement look different from the saved layout and could suggest that objects were outside the room even when the preview was supposed to reflect their saved placement.
- **What I did instead:** I checked the room-card result and pointed out the specific defect: the saved objects overlapped the walls. I then directed the AI to correct the preview rather than change the underlying saved arrangement. My follow-up prompts established that the card should use the saved planner contents, preserve their relative placement, and display them within the room interior. The AI adjusted the preview positioning and scaling in response to those requirements. I acted as the reviewer and orchestrator by identifying the mismatch and steering the implementation toward a preview that matched the planner.
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)

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

- **File:** `client/src/components/layout/AppNavbar.jsx`, `client/src/App.jsx`
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)
- **What it does and why it is built this way:** I redesigned the navigation so users can see their current location in the top navbar instead of a separate page-header card. I specified a location-pin icon and breadcrumbs such as Rooms / Matt's Room, with the pin and current location highlighted in orange. I also requested larger breadcrumbs to improve their visibility. This keeps the location information in a consistent place, reduces repeated page-header content, and makes it easier to understand which room or page is open. My contribution was the navigation design and direction; the implementation was AI-assisted.

- **File:** `client/src/pages/ItemFormPage.jsx`
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)
- **What it does and why it is built this way:** I redesigned the Add/Edit Item form to reduce friction by minimizing unnecessary scrolling and keeping the main fields visible together. I directed the layout changes to place Item name and Category side by side, group storage-related controls, and separate item details from planner adjustments for a clearer flow. I requested that the planner preview and settings share one card so users can see how their changes affect the object. I also specified limited-height, scrollable dropdowns so long option lists would not unnecessarily extend the page. My contribution was the form design, layout decisions, and iterative direction; the implementation was AI-assisted.

- **File:** `client/src/pages/RoomInventoryPage.jsx`, `client/src/components/items/InventoryItemCard.jsx`
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)
- **What it does and why it is built this way:** I designed additional inventory storage actions so users can store and unstore items directly instead of opening the Edit Item form each time. I specified the Store in, Unstore from, and View storage actions, along with a way to add available unstored items from an open storage inventory or remove its contents directly. I requested square thumbnails beside item names and storage choices to help users identify the correct belongings and containers. I refined action placement, thumbnail spacing, and empty-state wording to keep the workflow clear. My contribution was the interaction design and direction; the implementation was AI-assisted.

### The AI-written part I understand best

- **File:** `client/src/pages/ItemFormPage.jsx`
- **Commit:** [Initial frontend progress commit](https://github.com/Matt-CRL/roomy/commit/afbef80544aad3c0eb4e64c1eba4336acd2a34f7)
- **What it does and why we kept it:** This file contains the Add/Edit Item form. I understand how its React state stores the item values, how the dropdowns and inputs update the state, how storage settings affect the form, and how Width and Depth update the planner preview.

- **File:** `server/app.js`, `server/validation.js`, `server/roomyRepo.js`
- **Commit:** [Connect Supabase backend and polish Roomy frontend](https://github.com/Matt-CRL/roomy/commit/9c4b453e0df859359465bcfa1de448db9f999e72)
- **What it does and why we kept it:** These files define the protected API flow. I understand how the routes validate incoming data, how the verified Supabase user ID scopes database queries to one owner, and how the repository uses parameterized SQL for rooms and items. I also understand how storage-unit move and delete operations check the current contents version before deciding whether child items move with the storage unit or become unstored.

- **File:** `client/src/utils/plannerGeometry.js`, `client/src/pages/PlannerWorkspace.jsx`
- **Commit:** [Add planner workspace and improve inventory and account flows](https://github.com/Matt-CRL/roomy/commit/483579c)
- **What it does and why we kept it:** These files handle the planner's object geometry and pointer interactions. I understand that cursor movement is measured in screen pixels, while the saved layout uses room coordinates in centimeters, so the planner must account for its scale, pan, and zoom when translating movement. Rotating a rectangle changes the horizontal and vertical space it occupies: the geometry helpers use its width, depth, and rotation angle to calculate its outer bounds around its center. Movement is then clamped to valid coordinates so those bounds stay within the room. We kept this approach because checking only the unrotated dimensions would give incorrect results near walls, and separating geometry helpers from the interface makes the calculations easier to inspect and reuse.

- **File:** `client/src/pages/PlannerWorkspace.jsx`, `client/src/App.jsx`, `server/roomyRepo.js`
- **Commits:** [Planner workspace and save interactions](https://github.com/Matt-CRL/roomy/commit/483579c), [Security remediation and transaction-context improvements](https://github.com/Matt-CRL/roomy/commit/7f9da8e)
- **What it does and why we kept it:** These files connect the planner draft to automatic and manual saving. I understand that debounce means restarting a timer when edits occur, so saving waits until the user pauses instead of sending a request for every movement. The planner tracks the last saved state, prevents overlapping save requests, and retains changes made while a request is in progress for a later save. Save now lets the user request an immediate save. Each request includes the layout revision it was based on; the backend locks the relevant records and compares that revision with the current one before updating the layout. A stale revision returns a conflict instead of silently overwriting newer changes. The layout, room dimensions, and placed-item dimensions are updated in one database transaction so a failure does not leave a partial save. We kept this design to reduce unnecessary requests, protect newer saved versions, and preserve the local draft and error feedback when saving fails.
