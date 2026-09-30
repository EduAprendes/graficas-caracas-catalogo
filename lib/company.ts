// Datos del emisor que salen impresos en la orden de entrega (razón social, RIF y domicilio
// fiscal). Se configuran por variables de entorno; deben coincidir EXACTAMENTE con los del
// RIF de la empresa.
export type Company = {
  name: string | null;
  rif: string | null;
  address: string | null;
  phone: string | null;
};

export function getCompany(): Company {
  const value = (key: string) => process.env[key]?.trim() || null;
  return {
    name: value("COMPANY_NAME"),
    rif: value("COMPANY_RIF"),
    address: value("COMPANY_ADDRESS"),
    phone: value("COMPANY_PHONE"),
  };
}

export function missingCompanyFields(company: Company): string[] {
  const missing: string[] = [];
  if (!company.name) missing.push("COMPANY_NAME (razón social)");
  if (!company.rif) missing.push("COMPANY_RIF");
  if (!company.address) missing.push("COMPANY_ADDRESS (domicilio fiscal)");
  return missing;
}
