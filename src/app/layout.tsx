import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {title:"2D Lade Editor",description:"Ontwerp losse ladebakjes en download STL-bestanden"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="nl"><body>{children}</body></html>}
