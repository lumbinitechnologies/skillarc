import "server-only"
import { connection } from "next/server"

/** One request-time instant; callers decide the domain timezone explicitly. */
export async function getServerTime() {
  await connection()
  return new Date()
}
