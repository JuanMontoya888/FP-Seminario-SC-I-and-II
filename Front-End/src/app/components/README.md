# Front-End Components

## Overview
Contains all 25 standalone Angular UI components implementing Dental One's public marketing pages, patient onboarding and clinical records, appointment scheduling and Mercado Pago checkout, invoice requests, calendar management, CAD-CAM 3D STL laboratory, and clinic ERP administration dashboard.

## Subdirectories & Boundaries
- [about-us](./about-us/README.md) - Clinic profile page with interactive Mission, Vision, and Values toggle panel (`AboutUs`).
- [ayudando-a-sonreir](./ayudando-a-sonreir/README.md) - Static informational page describing Dental One's social-support campaign (`AyudandoASonreir`).
- [cad-cam](./cad-cam/README.md) - Browser-only 3D STL dental mesh viewer, transform tool, horizontal layer slicer, and binary STL exporter (`CadCam`, `mandible.ts`, `stl.ts`).
- [calendar](./calendar/README.md) - Weekly/monthly appointment schedule UI for patients and admin slot blocking, cancellation, exports, and procedure logging (`Calendar`).
- [contact-us](./contact-us/README.md) - Reactive contact inquiry form gated on authenticated user sessions (`ContactUs`).
- [expediente](./expediente/README.md) - Patient clinical record viewer and editor spanning demographics, medical history, and evolutions (`Expediente`).
- [footer](./footer/README.md) - Global footer with clinic hours, social links, and dynamic copyright year (`Footer`).
- [formulario-inicial](./formulario-inicial/README.md) - Step 1 patient onboarding form capturing demographic `PatientDetails` (`FormularioInicial`).
- [help](./help/README.md) - Help center featuring a 4-step booking guide and single-open FAQ accordion (`Help`).
- [histo-clinica](./histo-clinica/README.md) - Step 2 patient onboarding medical-history questionnaire submitting to `/api/register/histo` (`HistoClinica`).
- [home](./home/README.md) - Landing page rendering clinic highlights and fetching Strapi `inicio` content (`Home`).
- [invoice-request](./invoice-request/README.md) - Patient fiscal invoice request form and uncertified (`SIN_TIMBRAR`) XML/PDF exporter (`InvoiceRequest`).
- [log-in](./log-in/README.md) - Email/password login, verification-email resend, password recovery prompt, and Google Identity Services sign-in (`LogIn`).
- [mapa](./mapa/README.md) - Interactive Leaflet map centered on Aguascalientes using OpenStreetMap tiles (`Mapa`).
- [nav-bar](./nav-bar/README.md) - Responsive navigation header and mobile drawer with role-gated links and logout confirmation (`NavBar`).
- [operations](./operations/README.md) - Admin clinic ERP dashboard for accounts, journal entries, financial reports, bank reconciliation, CFDI archive, inventory, suppliers, orders, and assets (`Operations`).
- [paciente](./paciente/README.md) - Authenticated patient dashboard linking to `/expediente` and `/calendar` and displaying recorded procedures (`Paciente`).
- [pago-exitoso](./pago-exitoso/README.md) - Mercado Pago return page that polls backend payment confirmation, links to invoicing, and downloads PDF receipts (`PagoExitoso`).
- [register](./register/README.md) - Account registration form with password complexity and match validation (`Register`, `passwordsMatchValidator`).
- [registrar-procedimiento](./registrar-procedimiento/README.md) - Admin-only clinical procedure entry screen with per-patient history preview (`RegistrarProcedimiento`).
- [reset-password](./reset-password/README.md) - Token-based password reset form with password complexity and match validation (`ResetPassword`, `passwordsMatchValidator`).
- [scheduling](./scheduling/README.md) - Appointment booking and checkout screen supporting full online, 50% deposit, and eligible in-clinic payments (`Scheduling`, `TreatmentOption`).
- [services](./services/README.md) - Dental specialties catalog listing backed by `ServicioService` (`Services`).
- [tipo-paciente](./tipo-paciente/README.md) - Patient onboarding screen selecting `'new'` or `'returning'` status for payment eligibility (`TipoPaciente`).
- [un-servicio](./un-servicio/README.md) - Single dental service detail view resolved from `:id` route params (`UnServicio`).
