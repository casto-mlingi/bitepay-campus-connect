/** A reply acknowledges only the exact payload sent, never later edits. */
export function canAcknowledgeSnapshot(sentPayload: string, currentPayload: string): boolean {
  return sentPayload === currentPayload;
}

/** Active shift and receipt numbering belong to this device, not remote devices. */
export function retainDeviceState<T>(remote: T, local: T): T {
  if (!remote || typeof remote !== "object" || !local || typeof local !== "object") return remote;
  const result = { ...remote } as Record<string, unknown>;
  const current = local as Record<string, unknown>;
  for (const field of ["activeShiftId", "receiptSeq"]) {
    if (field in current) result[field] = current[field];
  }
  return result as T;
}