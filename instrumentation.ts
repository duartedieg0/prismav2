export async function register() {
  if (process.env.NODE_ENV === "production") {
    const { getServerEnv } = await import("@/lib/env");
    getServerEnv();
  }
}
