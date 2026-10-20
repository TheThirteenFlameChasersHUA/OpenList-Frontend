import type { Group } from "~/types"

/**
 * Fork-specific settings group. Keep this value in sync with
 * model.BACKGROUND in the backend. A high value avoids collisions when
 * upstream appends new groups to its own enum.
 */
export const BACKGROUND_GROUP = 100 as Group
