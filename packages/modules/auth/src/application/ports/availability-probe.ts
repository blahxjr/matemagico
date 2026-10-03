/** Reports whether a required Auth dependency can currently be used. Must not expose internal details. */
export interface AvailabilityProbe {
  isAvailable(): Promise<boolean>;
}
