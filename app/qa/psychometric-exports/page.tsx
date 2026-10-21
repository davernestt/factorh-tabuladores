import PsychometricExportActions, { type PsychometricExportData } from "@/app/protected/psicometrias/export-actions";
import { notFound } from "next/navigation";

// Exclusivamente para comprobación en la rama QA: no incluir en producción.
export default function SyntheticExportCheck() {
  if (process.env.VERCEL_ENV !== "preview") notFound();

  const data: PsychometricExportData = {
    title: "Resultados de prueba QA - FICTICIOS",
    subtitle: "Verificación técnica del archivo PDF y Word - sin datos personales",
    personName: "Participante Ficticio",
    organizationName: "Empresa QA Ficticia",
    jobTitle: "Rol de prueba",
    area: "Pruebas técnicas",
    reportDate: "20/10/2026",
    executiveSummary: [
      "Estos valores son sintéticos. No corresponden a ninguna persona o evaluación real.",
      "El objetivo de esta muestra es validar visualización, codificación y descarga de reportes."
    ],
    keyFindings: ["Texto de prueba de gráficos y hallazgos."],
    cautions: ["No utilizar este material para decisiones laborales."],
    instruments: [{
      name: "Atención y Precisión (simulación)",
      chart: "columns",
      summary: ["Resultados sintéticos para verificar visualizaciones y formatos."],
      dimensions: [
        { name: "Discriminación visual", value: 60 },
        { name: "Atención selectiva", value: 80 },
        { name: "Seguimiento de reglas", value: 40 },
        { name: "Verificación", value: 100 },
        { name: "Control de errores", value: 60 },
      ],
    }],
  };
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-8">
      <h1 className="text-2xl font-bold">QA Reportes FactoRH · DATOS FICTICIOS</h1>
      <p>Comprobación de generación PDF y Word en Preview. Prohibido publicar en producción.</p>
      <PsychometricExportActions data={data} fileName="FACTORH-QA-FICTICIO" integral />
    </main>
  );
}
