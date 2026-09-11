import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Kumanyok — альтанки, баня та відпочинок',description:'Оберіть день та забронюйте альтанку або баню в Kumanyok. Гідроцикл і лодка за телефоном +380995175555.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang='uk'><body>{children}</body></html>}
