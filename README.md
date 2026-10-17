# Excalidraw Collaborative Whiteboard Monorepo

Real-time collaborative whiteboard built with Next.js 15, HTML5 Canvas, WebSockets, Express, and PostgreSQL (Prisma).

## Completed Features

- [x] **Pencil Functionality**: Freehand continuous stroke drawing with points array interpolation and live path previews.
- [x] **Panning & Zooming Functionality**:
  - Zoom in/out with mouse wheel or trackpad pinch (`Ctrl + Wheel`).
  - Pan with mouse drag while holding `Spacebar`, using the middle mouse button, or using the dedicated Hand tool (`H`).
  - Centered zoom with level controls widget (`-`, `+`, and reset `100%`).
  - Infinite dot grid aligned with canvas world coordinates.
- [x] **Extended Whiteboard Tools**:
  - Hand / Pan tool
  - Freehand Pencil
  - Rectangle
  - Circle
  - Straight Line
  - Arrow (with arrowhead)
  - Eraser (interactive shape deletion with proximity hit-testing)
- [x] **History & Collaboration Actions**:
  - Undo (`Ctrl + Z`)
  - Redo (`Ctrl + Y` / `Ctrl + Shift + Z`)
  - Clear whiteboard canvas
- [x] **Styling Controls**:
  - Stroke color palette (White, Red, Green, Blue, Yellow, Purple).
  - Stroke thickness options (Thin 1px, Medium 2px, Bold 4px).
- [x] **Room Sharing & Management**:
  - One-click "Copy Room Link" button on canvas.
  - Interactive "Open Room" input and "Create Random Room" generator on the landing page.
- [x] **Backend Fixes & Hardening**:
  - Chronological shape history ordering (`asc` instead of `desc`).
  - Disconnect cleanup in WebSocket backend (`ws.on('close')`).
  - Safe JSON parsing and room ID normalization.
  - Exception handling in HTTP authentication middleware.