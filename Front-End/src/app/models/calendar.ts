import { Appointment } from "./appointment";

export class Day_Cl {
    public dayNumber: number | string;
    public monthNumber: number;
    public yearNumber: number;
    public dayOfWeek: number;
    public isToday: boolean;
    public isWeekend: boolean;
    public startDay: number = 8;
    public endDay: number = 16;
    public appointments: Array<Appointment>;

    constructor(
        dayNumber: number | string = '',
        monthNumber: number = 0,
        yearNumber: number = 0,
        dayOfWeek: number = 0,
        isToday: boolean = false,
        isWeekend: boolean = false,
        appointments: Array<Appointment> = []
    ) {
        this.dayNumber = dayNumber;
        this.monthNumber = monthNumber;
        this.yearNumber = yearNumber;
        this.dayOfWeek = dayOfWeek;
        this.isToday = isToday;
        this.isWeekend = isWeekend;
        this.appointments = appointments;
    }

    get formattedDate(): string | null {
        if (this.dayNumber === '') return null;
        const m = (this.monthNumber + 1).toString().padStart(2, '0');
        const d = this.dayNumber.toString().padStart(2, '0');
        return `${this.yearNumber}-${m}-${d}`;
    }

    get dayString(): string {
        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        return dias[this.dayOfWeek] || '';
    }
}

export class Month_Cl {
    monthNumber!: number;
    yearNumber!: number;
    totalDaysOfMonth!: number;
    startOfMonth!: number;
    daysInMonthArray!: Array<String>;
    daysInMonth!: Array<Day_Cl>;
    monthString!: string;
    yearString!: string;
}