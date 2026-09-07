import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map, forkJoin } from 'rxjs';

import {
    getDaysInMonth,
    getDay,
    startOfMonth,
    format, 
    startOfWeek,
    endOfWeek,
    isSameDay,
    isWithinInterval,
    endOfMonth,
} from 'date-fns';

import { Day_Cl, Month_Cl } from '../models/calendar';
import { Appointment } from '../models/appointment';

@Injectable({
    providedIn: 'root'
})
export class CalendarService {
    
    // --- URLs del API ---
    // (descomenta las de producción al desplegar)
    //private userUrl = 'https://dental-one-final.onrender.com/api/user/appointment';
    //private adminUrl = 'https://dental-one-final.onrender.com/api/admin/appointments';
    private userUrl = 'http://localhost:3000/api/user/appointment';
    private adminUrl = 'http://localhost:3000/api/admin/appointments';
    private availabilityUrl = 'http://localhost:3000/api/availability';
    private blockUrl = 'http://localhost:3000/api/admin/block-slot';
    private apiBase = 'http://localhost:3000/api';

    // Horas bloqueadas por el admin (date 'YYYY-MM-DD' + hour 'HH:MM')
    public blockedSlots: Array<{ date: string, hour: string, reason?: string }> = [];

    // Valores estáticos para Calendar
    public DAYS_OF_WEEK: Array<string> = [
        'D', 'L', 'M', 'M', 'J', 'V', 'S'
    ];

    public FULL_DAYS_OF_WEEK: Array<string> = [
        'Domingo', 'Lunes', 'Martes', 'Miercoles',
        'Jueves', 'Viernes', 'Sabado'
    ];

    public MONTHS_OF_YEAR: Array<string> = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    public TOTAL_DAYS_OF_MONTH!: number;

    // Valores del día actual
    private currentDay!: number;
    private currentMonth!: number;
    private currentYear!: number;

    // Valores seleccionados
    selectedDay!: number;
    selectedMonth!: number;
    selectedYear!: number;
    startDayOfPeriodSelected!: number;
    endDayOfPeriodSelected!: number;

    // Array de citas en memoria
    public appointmentsUser: Array<Appointment> = []; 


    constructor(
        private http: HttpClient 
    ) {
        const date = new Date();

        this.currentDay = date.getDate();
        this.currentMonth = date.getMonth();
        this.currentYear = date.getFullYear();

        this.selectedDay = this.currentDay;
        this.selectedMonth = this.currentMonth;
        this.selectedYear = this.currentYear;
    }

    /**
     * Reconstruye la fecha usando componentes UTC + la hora explícita,
     * para evitar que la zona horaria cambie el día.
     */
    private corregirFecha(rawDateTime: any, hourStr?: string): Date {
        const rawDate = new Date(rawDateTime);
        const year = rawDate.getUTCFullYear();
        const month = rawDate.getUTCMonth();
        const day = rawDate.getUTCDate();
        let hours = rawDate.getUTCHours();
        let minutes = rawDate.getUTCMinutes();

        if (hourStr && typeof hourStr === 'string') {
            const parts = hourStr.split(':');
            if (parts.length === 2) {
                hours = parseInt(parts[0], 10);
                minutes = parseInt(parts[1], 10);
            }
        }
        return new Date(year, month, day, hours, minutes);
    }

    /**
     * Carga las citas y las horas bloqueadas.
     * - Admin: trae TODAS las citas con nombre del paciente.
     * - Paciente: trae la disponibilidad ANÓNIMA (solo "Ocupado"/"Tu cita").
     * En ambos casos carga las horas bloqueadas por el admin.
     */
    fetchAppointments(isAdmin: boolean): Observable<any> {
        const availability$ = this.http.get<any>(this.availabilityUrl);

        if (isAdmin) {
            return forkJoin([this.http.get<any[]>(this.adminUrl), availability$]).pipe(
                map(([appts, avail]) => {
                    this.appointmentsUser = appts.map(appt => ({
                        ...appt,
                        dateTime: this.corregirFecha(appt.dateTime, appt.hour)
                    }));
                    this.blockedSlots = avail?.blocked || [];
                    return this.appointmentsUser;
                })
            );
        }

        // Paciente: disponibilidad anónima
        return availability$.pipe(
            map((avail) => {
                const occupied = avail?.occupied || [];
                this.appointmentsUser = occupied.map((o: any) => ({
                    dateTime: this.corregirFecha(o.dateTime, o.hour),
                    hour: o.hour,
                    durationMinutes: o.durationMinutes,
                    status: 'Scheduled',
                    // Sin nombres: solo "Tu cita" (la suya) u "Ocupado" (de otros)
                    patientName: o.mine ? 'Tu cita' : 'Ocupado'
                }));
                this.blockedSlots = avail?.blocked || [];
                return this.appointmentsUser;
            })
        );
    }

    /** ¿Está bloqueada esa fecha + hora? */
    isBlocked(date: string, hour: string): boolean {
        return this.blockedSlots.some(b => b.date === date && b.hour === hour);
    }

    /** Bloquear una hora (admin). */
    blockSlot(date: string, hour: string, reason: string = ''): Observable<any> {
        return this.http.post(this.blockUrl, { date, hour, reason });
    }

    /** Desbloquear una hora (admin). */
    unblockSlot(date: string, hour: string): Observable<any> {
        return this.http.request('delete', this.blockUrl, { body: { date, hour } });
    }

    /** Bloquear un rango de horas en una fecha (admin). */
    blockRange(date: string, startHour: string, endHour: string, reason: string = ''): Observable<any> {
        return this.http.post(`${this.apiBase}/admin/block-range`, { date, startHour, endHour, reason });
    }

    /** Desbloquear un rango de horas en una fecha (admin). */
    unblockRange(date: string, startHour: string, endHour: string): Observable<any> {
        return this.http.request('delete', `${this.apiBase}/admin/block-range`, { body: { date, startHour, endHour } });
    }

    /** Cancelar una cita (admin). */
    cancelAppointment(appointmentId: string): Observable<any> {
        return this.http.patch(`${this.apiBase}/admin/appointments/${appointmentId}/cancel`, {});
    }


    // --- GETTERS ESTATICOS ---
    getDaysOfWeek(): Array<string> {
        return this.DAYS_OF_WEEK;
    }

    getFullDaysOfWeek(): Array<string> {
        return this.FULL_DAYS_OF_WEEK;
    }

    getMonthsOfYear(): Array<string> {
        return this.MONTHS_OF_YEAR;
    }

    getTotalDaysOfMonth(): number {
        return this.TOTAL_DAYS_OF_MONTH;
    }

    getCurrentDayNumber(): number {
        return this.currentDay;
    }

    getCurrentMonthNumber(): number {
        return this.currentMonth;
    }

    getCurrentYearNumber(): number {
        return this.currentYear;
    }


    // Método para crear la estructura del mes
    getNewMonth(month: number, year: number): Month_Cl {

        let newMonth = new Month_Cl();
        const baseDate = new Date(year, month, 1);

        newMonth.daysInMonth = [];
        newMonth.startOfMonth = getDay(baseDate);
        newMonth.totalDaysOfMonth = getDaysInMonth(baseDate);
        newMonth.monthNumber = month;
        newMonth.yearNumber = year;

        newMonth.monthString = this.MONTHS_OF_YEAR[baseDate.getMonth()];
        newMonth.yearString = format(baseDate, 'yyyy');

        // Rellenar días vacíos al inicio
        for (let i = 0; i < newMonth.startOfMonth; i++) {
            newMonth.daysInMonth.push(new Day_Cl());
        }

        // Insertar días reales
        for (let i = 1; i <= newMonth.totalDaysOfMonth; i++) {

            const dtDaily = new Date(year, month, i);

            const isCurrentDay = (this.currentDay === i && this.currentMonth === month && this.currentYear === year);
            const dayOfWeekNumber = getDay(dtDaily); 
            const isWeekend = (dayOfWeekNumber === 0 || dayOfWeekNumber === 6); 
            
            let app: Array<Appointment> = []; 

            // Filtramos las citas para este día específico
            if (this.appointmentsUser && this.appointmentsUser.length > 0) {
                // isSameDay compara año, mes y día. Como ya corregimos dateTime arriba,
                // ahora coincidirá correctamente.
                app = this.appointmentsUser.filter(a => isSameDay(a.dateTime, dtDaily));
            }

            let day = new Day_Cl(
                i,                  // 1. dayNumber (número)
                month,              // 2. monthNumber (número)
                year,               // 3. yearNumber (número)
                dayOfWeekNumber,    // 4. dayOfWeek (número)
                isCurrentDay,       // 5. isToday (booleano) - ¡Usa la variable que ya tenías!
                isWeekend,          // 6. isWeekend (booleano)
                []                  // 7. appointments (arreglo vacío por defecto)
            );

            newMonth.daysInMonth.push(day);
        }

        // Rellenar final del calendario
        const remainingSlots = 42 - newMonth.daysInMonth.length; 
        for (let i = 0; i < remainingSlots; i++) {
            newMonth.daysInMonth.push(new Day_Cl());
        }

        return newMonth;
    }


    // Método para obtener inicio y fin de semana
    getWeek(day: Day_Cl): any {
        if(!day.dayNumber) return { startDay: '01', endDay: '01'};

        const date = new Date(day.yearNumber, day.monthNumber, Number(day.dayNumber));

        const startPeriodDate = startOfWeek(date);
        const endPeriodDate = endOfWeek(date);

        let startDay = format(startPeriodDate, 'dd');
        let endDay = format(endPeriodDate, 'dd');

        // Ajuste cuando la semana cruza entre meses
        if (Number(startDay) >= Number(endDay)) {
            if (date.getMonth() != startPeriodDate.getMonth()) {
                startDay = format(startOfMonth(endPeriodDate), 'dd');
            } else {
                endDay = format(endOfMonth(startPeriodDate), 'dd');
            }
        }

        this.selectedDay = Number(day.dayNumber);
        this.startDayOfPeriodSelected = Number(startDay);
        this.endDayOfPeriodSelected = Number(endDay);

        return { startDay, endDay };
    }


    // Filtrar citas para el periodo seleccionado
    getApptBetweenPeriod(): Array<Appointment> {
        if (!this.appointmentsUser || this.appointmentsUser.length === 0) return [];

        let appSel: Array<Appointment> = [];

        const startDate = new Date(this.selectedYear, this.selectedMonth, this.startDayOfPeriodSelected);
        
        // Ajustamos el endDate para que cubra todo el último día (23:59:59)
        const endDate = new Date(this.selectedYear, this.selectedMonth, this.endDayOfPeriodSelected);
        endDate.setHours(23, 59, 59); 

        const interval = { start: startDate, end: endDate };
        
        appSel = this.appointmentsUser
            .filter(appointment => isWithinInterval(appointment.dateTime, interval))
            .sort((a, b) => a.dateTime.getTime() - b.dateTime.getTime());

        return appSel;
    }

}