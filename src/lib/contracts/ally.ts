type AllyContractData = {
  allyProfileId: string;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phone: string;
  isCompany: boolean;
  companyName?: string | null;
  rifNumber?: string | null;
  dateOfBirth?: string | null;
  sex?: string | null;
};

function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function buildAllyContractEmail(d: AllyContractData): { subject: string; text: string } {
  const fullName = `${d.firstName} ${d.lastName}`.trim();
  const url = siteUrl();
  const uploadUrl = `${url}/aliado/contrato`;
  const kycUrl = `${url}/aliado/kyc`;

  const header = [
    "CONTRATO DE ALIADO (BORRADOR PRELLENADO) - GODPLACES.",
    "",
    "Importante: Este documento es un borrador de MVP y debe ser revisado/adaptado por un abogado.",
    "Crear el usuario no garantiza aprobaciÃ³n. El acceso completo como aliado se activa solo cuando Godplaces aprueba el proceso.",
    "",
  ].join("\n");

  const datos = [
    "DATOS DEL ALIADO:",
    `- ID de aliado: ${d.allyProfileId}`,
    `- Nombre: ${fullName || "—"}`,
    `- Correo: ${d.email}`,
    `- Usuario: ${d.username}`,
    `- TelÃ©fono: ${d.phone || "—"}`,
    d.dateOfBirth ? `- Fecha de nacimiento: ${d.dateOfBirth}` : null,
    d.sex ? `- Sexo: ${d.sex}` : null,
    d.isCompany ? `- Tipo: Empresa` : "- Tipo: Persona natural",
    d.isCompany && d.companyName ? `- Empresa: ${d.companyName}` : null,
    d.isCompany && d.rifNumber ? `- RIF: ${d.rifNumber}` : null,
    "",
  ]
    .filter(Boolean)
    .join("\n");

  const clausulas = [
    "CLÃUSULAS (RESUMEN MVP):",
    "1. El aliado declara que la informaciÃ³n suministrada y los documentos (KYC) son reales y verificables.",
    "2. Godplaces puede aprobar o rechazar el alta del aliado sin obligaciÃ³n de aceptaciÃ³n.",
    "3. Las propiedades publicadas por el aliado requieren revisiÃ³n y aprobaciÃ³n previa por Godplaces.",
    "4. El aliado se compromete a mantener actualizada su informaciÃ³n y a cumplir los tÃ©rminos de uso.",
    "",
    "FIRMA:",
    "Nombre y apellido: ____________________________",
    "CÃ©dula / RIF: _________________________________",
    "Fecha: ____ / ____ / ______",
    "",
  ].join("\n");

  const pasos = [
    "PASOS PARA COMPLETAR EL PROCESO:",
    `1) Completa tu KYC (documentos) aquÃ­: ${kycUrl}`,
    `2) Firma este contrato y sÃºbelo en tu cuenta: ${uploadUrl}`,
    "3) Luego de subir el contrato firmado, Godplaces revisarÃ¡ y aprobarÃ¡ tu cuenta (si aplica).",
    "",
  ].join("\n");

  return {
    subject: "Godplaces: Contrato de aliado (para firma y carga)",
    text: [header, datos, clausulas, pasos].join("\n"),
  };
}

