export function createLatestRequestTracker() {
  let latestRequestId = 0

  return Object.freeze({
    begin() {
      latestRequestId += 1
      return latestRequestId
    },
    invalidate() {
      latestRequestId += 1
    },
    isLatest(requestId) {
      return requestId === latestRequestId
    },
  })
}
