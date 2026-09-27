export function isCompletedUserCreation(user) {
  return (
    user?.outcome === 'completed' &&
    user?.internalUserPersisted === true &&
    user?.roleAssignmentCompleted === true &&
    user?.pinProvisioned === true &&
    user?.passwordSetupEmailRequested === true
  )
}

export function canRequestPasswordSetupEmail(user) {
  return (
    user?.passwordSetupEmailRequested === false &&
    user?.internalUserPersisted === true &&
    user?.roleAssignmentCompleted === true &&
    user?.pinProvisioned === true
  )
}
