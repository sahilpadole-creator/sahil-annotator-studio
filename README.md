# Sahil Volleyball Annotator Studio

A professional, high-performance volleyball video annotation application designed specifically for:
1. **Set Style & Direction**: Overhead vs Underhead, Forward vs Backward.
2. **Ball Landing & Final Touch Sequence**: Preceding defensive hand contact (`block` or `dig`) with exact `(x, y)` coordinate, followed by the court ground impact frame and `(x, y)` landing coordinate.
3. **Referee Point Signal & Line Umpires**: Main referee winning team signal (`Team Left` vs `Team Right`), and two-side line umpire flag decisions (`Ball In`, `Ball Out`, `Touch`, `Antenna`).

---

## ⚡ Ergonomic Left-Hand Shortcut Layout (Blindfold Muscle Memory)

Keep your **left hand resting comfortably on the home cluster (`Q W E R / A S D F / Z X C V`)** and your **right hand on the mouse or arrow keys**. You never have to look down at the keyboard!

### 🎮 Global Navigation
- **`Space`**: Play / Pause video
- **`←` / `→`** or **`[` / `]`**: Step backward / forward by 1 frame
- **`Shift + (← / →)`** or **`Shift + ([ / ])`**: Jump backward / forward by 10 frames
- **`Esc`**: Cancel point picking mode or close cheat sheet

---

### 🏐 Step 1: Set Style & Direction
- **`Q`**: **Overhead** Set *(Top row = high/overhead)*
- **`A`**: **Underhead** Set *(Bottom row = low/underhead)*
- **`W`**: **Forward** Direction *(Forward key)*
- **`S`**: **Backward** Direction *(Backward key)*

---

### 🎯 Step 2: Ball Landing
- **`E`**: Landing **In Court** — pick tool turns on, click the ball on the video
- **`D`**: Landing **Out of Court** — pick tool turns on, click the ball on the video

(Dig/block touches come from the XML, so there are no touch keys.)

---

### 🚩 Step 3: Referee Point & Line Umpires
- **`R`**: **Team Left** wins the point — also marks the current frame as the referee signal frame
- **`T`**: **Team Right** wins the point — also marks the current frame as the referee signal frame
- **`1` / `2` / `3`**: Line umpire flag: **Ball In** / **Ball Out** / **Touch + Out** — also starts the box tool (up to 2 boxes)

---

## Running the Application

To start the server:
```bash
npm install   # first time only
npm run start
```
The application will be live at:
```
http://localhost:5174/
```
