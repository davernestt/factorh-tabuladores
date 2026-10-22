import { notFound } from "next/navigation";
import LayoutQaClient from "./client";
export default function LayoutQaPage() {
  if (process.env.VERCEL_ENV !== "preview") notFound();
  return <LayoutQaClient />;
}
