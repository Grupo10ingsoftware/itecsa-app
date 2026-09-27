import assert from 'node:assert/strict'
import { test } from 'node:test'

import { nextModalFocusTarget } from '../src/modules/users/hooks/useModalDialog.js'
import { createLatestRequestTracker } from '../src/modules/users/utils/latestRequestTracker.js'

test('modal focus wraps at both boundaries and recovers focus entering from outside', () => {
  const first = { id: 'first' }
  const middle = { id: 'middle' }
  const last = { id: 'last' }
  const elements = [first, middle, last]

  assert.equal(nextModalFocusTarget({ activeElement: last, focusableElements: elements, shiftKey: false }), first)
  assert.equal(nextModalFocusTarget({ activeElement: first, focusableElements: elements, shiftKey: true }), last)
  assert.equal(nextModalFocusTarget({ activeElement: {}, focusableElements: elements, shiftKey: false }), first)
  assert.equal(nextModalFocusTarget({ activeElement: {}, focusableElements: elements, shiftKey: true }), last)
  assert.equal(nextModalFocusTarget({ activeElement: middle, focusableElements: elements, shiftKey: false }), null)
  assert.equal(nextModalFocusTarget({ activeElement: middle, focusableElements: elements, shiftKey: true }), null)
  assert.equal(nextModalFocusTarget({ activeElement: null, focusableElements: [], shiftKey: false }), null)
})

test('summary request tracker accepts only the newest response and supports unmount invalidation', () => {
  const tracker = createLatestRequestTracker()
  const first = tracker.begin()
  const second = tracker.begin()

  assert.equal(tracker.isLatest(first), false)
  assert.equal(tracker.isLatest(second), true)

  tracker.invalidate()
  assert.equal(tracker.isLatest(second), false)

  const retry = tracker.begin()
  assert.equal(tracker.isLatest(retry), true)
})
