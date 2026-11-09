import type { Database } from "./database.types"

export type TableRow<Name extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][Name]["Row"]
