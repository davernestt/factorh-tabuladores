import CopyAssessmentLink from "./copy-assessment-link";
import {buildPdlPublicUrl} from "@/lib/pdl-public-url";

type Props={
  path:string;
  personName:string;
  templateName:string;
  organizationName:string;
  email?:string|null;
  phone?:string|null;
  evaluatedPersonName?:string|null;
  relationshipLabel?:string|null;
};
export default function ResendAssessmentLink(props:Props){
  const url=buildPdlPublicUrl(props.path);
  return <details className="w-full rounded-xl border border-orange-200 bg-orange-50 p-3">
    <summary className="cursor-pointer text-sm font-black text-orange-800">Reenviar liga · sin generar otra evaluación</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs leading-5 text-neutral-600">
        Esta es la liga original en la versión actualizada. Al compartirla se conserva el avance
        registrado; no se crean asignaciones ni se consumen aplicaciones nuevas.
      </p>
      <div className="break-all rounded-lg bg-white p-3 text-xs font-medium text-neutral-700">{url}</div>
      <CopyAssessmentLink {...props}/>
      <a href={url} target="_blank" rel="noopener noreferrer"
         className="inline-flex rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-bold text-neutral-700">
        Verificar liga ↗
      </a>
      <p className="text-[11px] text-neutral-500">
        WhatsApp y Correo abren la aplicación para revisar y enviar el mensaje; no se envía automáticamente.
      </p>
    </div>
  </details>;
}
