// Keep real database writes disabled until the owner approves tested rules/backend.
export const onlineConfig = Object.freeze({
  enabled: false,
  functionsRegion: 'asia-southeast1',
  maxPlayers: 8,
  poseIntervalMs: 100,
  heartbeatMs: 15000,
  leaseMs: 60000
});
