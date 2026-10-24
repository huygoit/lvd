export type DataSource = "demo" | "none" | "live";

export function getDataSource(): DataSource {
  const value = process.env.DASHBOARD_DATA_SOURCE;
  if (value === "demo" || value === "live" || value === "none") return value;
  return "none";
}

export function showPlannedModules() {
  return process.env.SHOW_PLANNED_MODULES === "true";
}
