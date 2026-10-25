export const capabilities = [
  "customers.view",
  "customers.view.assigned",
  "customers.create",
  "customers.update",
  "customers.archive",
  "customers.contacts",
  "projects.view",
  "projects.view.assigned",
  "projects.create",
  "projects.update",
  "costs.shared.create",
  "costs.shared.update",
  "costs.shared.delete",
  "quotations.view",
  "quotations.view.assigned",
  "quotations.create",
  "quotations.update",
  "quotations.submit",
  "quotations.withdraw",
  "quotations.approve",
  "quotations.request_change",
  "quotations.deliver",
  "quotations.respond",
  "quotations.version",
  "quotations.copy",
  "contracts.view",
  "contracts.view.assigned",
  "contracts.create",
  "contracts.update",
  "contracts.submit",
  "contracts.approve",
  "contracts.sign",
  "contracts.effect",
  "contracts.prices.admin",
  "engineering.view",
  "procurement.view",
  "partners.view",
  "partners.create",
  "partners.update",
  "partners.archive",
  "inventory.view",
  "inventory.create",
  "inventory.update",
  "orders.confirm",
  "receive.site",
  "receive.warehouse",
  "receive.workshop",
  "fabrication.view",
  "installation.view",
  "quality.view",
  "finance.cashflow.view",
  "finance.receivables.view",
  "reports.view",
  "system.view",
  "settings.manage",
] as const;

export type Capability = (typeof capabilities)[number];

export type User = {
  id: string;
  name: string;
  givenName: string;
  roleLabel: string;
  capabilities: Capability[];
};

export function hasCapability(user: User, capability: Capability) {
  return user.capabilities.includes(capability);
}

export function hasAnyCapability(user: User, list: Capability[]) {
  return list.some((capability) => user.capabilities.includes(capability));
}
