import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getNavbarCollisionBounds,
  getThemeHangerLeft,
  shouldMeasureThemeControlAtScrollPosition,
  shouldUseCompactThemeControl,
} from '../src/utils/themeControl.js'

const hanger = { left: 1140, right: 1196, top: 0, bottom: 192 }

test('uses the compact control when the hanging switch overlaps a control', () => {
  assert.equal(shouldUseCompactThemeControl({
    hanger,
    obstacles: [{ left: 1170, right: 1250, top: 8, bottom: 48 }],
  }), true)
})

test('uses the compact control when visible text intersects the hanger envelope', () => {
  assert.equal(shouldUseCompactThemeControl({
    hanger,
    obstacles: [{ left: 1152, right: 1188, top: 120, bottom: 142 }],
  }), true)
})

test('keeps the hanging control when nearby content has clear space', () => {
  assert.equal(shouldUseCompactThemeControl({
    hanger,
    obstacles: [{ left: 900, right: 1080, top: 0, bottom: 48 }],
  }), false)
})

test('uses extra separation before restoring the hanging control', () => {
  const near = [{ left: 1208, right: 1228, top: 48, bottom: 70 }]
  const clear = [{ left: 1225, right: 1245, top: 48, bottom: 70 }]
  assert.equal(shouldUseCompactThemeControl({ hanger, obstacles: near }), false)
  assert.equal(shouldUseCompactThemeControl({ hanger, obstacles: near, currentlyCompact: true }), true)
  assert.equal(shouldUseCompactThemeControl({ hanger, obstacles: clear, currentlyCompact: true }), false)
})

test('uses compact mode based on real overlap instead of a narrow-width threshold', () => {
  assert.equal(shouldUseCompactThemeControl({
    hanger: { left: 254, right: 310, top: 0, bottom: 192 },
    obstacles: [{ left: 24, right: 210, top: 60, bottom: 90 }],
  }), false)
})

test('theme control collision mode is measured at the top and after viewport zoom changes', () => {
  assert.equal(shouldMeasureThemeControlAtScrollPosition(0, 1440, 1440), true)
  assert.equal(shouldMeasureThemeControlAtScrollPosition(0.5, 1440, 1440), false)
  assert.equal(shouldMeasureThemeControlAtScrollPosition(320, 1440, 1440), false)
  assert.equal(shouldMeasureThemeControlAtScrollPosition(320, 1920, 1440), true)
})

test('does not request compact mode before the hanger or obstacles exist', () => {
  assert.equal(shouldUseCompactThemeControl({ hanger: null, obstacles: [] }), false)
  assert.equal(shouldUseCompactThemeControl({ hanger, obstacles: [] }), false)
})

test('centers the hanging theme switch in the right outer gutter when it fits', () => {
  assert.equal(getThemeHangerLeft({ navbarLeft: 100, navbarRight: 1800, hangerWidth: 56, viewportWidth: 1920 }), 1826)
  assert.equal(getThemeHangerLeft({ navbarLeft: 0, navbarRight: 176, hangerWidth: 56, viewportWidth: 280 }), 194)
})

test('centers in the left outer gutter when the right side is too narrow', () => {
  assert.equal(getThemeHangerLeft({ navbarLeft: 80, navbarRight: 1816, hangerWidth: 56, viewportWidth: 1880 }), 12)
})

test('requests the compact navbar button when neither outer gutter fits', () => {
  assert.equal(getThemeHangerLeft({ navbarLeft: 24, navbarRight: 1721, hangerWidth: 56, viewportWidth: 1745 }), null)
})

test('returns no horizontal anchor without valid layout measurements', () => {
  assert.equal(getThemeHangerLeft({ navbarLeft: 80, navbarRight: 350, hangerWidth: 56, viewportWidth: NaN }), null)
})

test('treats the full navbar background as an obstacle, including blank space', () => {
  const navbarBounds = { left: 0, right: 1440, top: 60, bottom: 132 }
  assert.equal(getNavbarCollisionBounds(navbarBounds, hanger), navbarBounds)
})

test('does not treat the navbar as an obstacle when the hanger clears it', () => {
  const navbarBounds = { left: 0, right: 1440, top: 220, bottom: 280 }
  assert.equal(getNavbarCollisionBounds(navbarBounds, hanger), null)
})
