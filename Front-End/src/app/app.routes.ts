import { Routes } from '@angular/router';
import { Home } from './components/home/home';
import { AboutUs } from './components/about-us/about-us';
import { Services } from './components/services/services';
import { LogIn } from './components/log-in/log-in';
import { Register } from './components/register/register';
import { Calendar } from './components/calendar/calendar';
import { UnServicio } from './components/un-servicio/un-servicio';
import { FormularioInicial } from './components/formulario-inicial/formulario-inicial';
import { HistoClinica } from './components/histo-clinica/histo-clinica';
import { Scheduling } from './components/scheduling/scheduling';
import { ContactUs } from './components/contact-us/contact-us';
import { Help } from './components/help/help';
import { Paciente } from './components/paciente/paciente';
import { AyudandoASonreir } from './components/ayudando-a-sonreir/ayudando-a-sonreir';
import { RegistrarProcedimiento } from './components/registrar-procedimiento/registrar-procedimiento';
import { TipoPaciente } from './components/tipo-paciente/tipo-paciente';
import { ResetPassword } from './components/reset-password/reset-password';

//Importamos el guard
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
    {path: '', component: Home},
    {path: 'about-us', component: AboutUs},
    {path: 'contact-us', component: ContactUs},
    {path: 'help', component: Help},
    //servicio pagina normal
    {path: 'services', component: Services},
    //servicio especifico
    {path : 'servicio/:id', component : UnServicio},
    {path: 'log-in', component: LogIn},
    {path: 'register', component: Register},
    {path: 'reset-password/:token', component: ResetPassword},
    {path: 'calendar', component: Calendar, canActivate: [authGuard]},
    {path: 'formulario', component: FormularioInicial,canActivate: [authGuard]}, //canActivate: [authGuard]},
    {path: 'histo', component: HistoClinica, canActivate: [authGuard]},
    {path: 'scheduling', component: Scheduling, canActivate: [authGuard]},
    {path: 'paciente', component: Paciente, canActivate: [authGuard]},
    {path: 'registrar-procedimiento', component: RegistrarProcedimiento, canActivate: [authGuard]},
    {path: 'tipo-paciente', component: TipoPaciente, canActivate: [authGuard]},
    {path: 'ayudando-a-sonreir', component: AyudandoASonreir}
];
