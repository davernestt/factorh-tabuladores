import {NextResponse} from "next/server";
// Compatibility guard: all new invitations must use the atomic batch generator,
// which enforces campaign quotas, department validity and recoverable links.
export async function POST(){
 return NextResponse.json({error:"Esta forma de generar ligas fue reemplazada. Actualiza la página y usa la generación por lote."},
  {status:410,headers:{"Cache-Control":"private, no-store"}});
}
