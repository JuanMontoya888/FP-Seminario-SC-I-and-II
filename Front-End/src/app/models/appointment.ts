import { USERS_ } from "./user";
export class Appointment {
    public readonly _idUser: string;

    // Values for knowing day of appointment
    private _dateTime!: Date;
    private _hour!: number

    private _durationMinutes!: number;
    private _patientName!: string;
    private _patientId!: string;
    private _contactNumber!: string | null; // maybe null
    private _reason!: string;
    private _status!: 'Scheduled' | 'Confirmed' | 'Canceled' | 'Completed';
    private _notes!: string;
    private _providerName!: string;
    private _roomId!: string;

    constructor(
        dateTime?: Date,
        durationMinutes?: number,
        patientName?: string,
        reason?: string,
        patientId?: string,
        contactNumber?: string | null,
        providerName?: string,
        roomId?: string,
        status?: 'Scheduled' | 'Confirmed' | 'Canceled' | 'Completed',
        notes?: string,
        idUser?: string
    ) {
        this.dateTime = dateTime ?? new Date();
        this.durationMinutes = durationMinutes ?? 0;
        this.patientName = patientName ?? '';
        this.reason = reason ?? '';
        this.patientId = patientId ?? '';
        this.contactNumber = contactNumber ?? null;
        this.providerName = providerName ?? 'Dr. Asignado';
        this.roomId = roomId ?? '';
        this.status = status ?? 'Scheduled';
        this.notes = notes ?? '';
        this._idUser = idUser ?? '3b4623dd-91c9-4637-9a3f-a7e5a2177b78';
    }

    // --- Getters ---
    get dateTime(): Date { return this._dateTime; }
    get hour(): number { return this._hour; }
    get durationMinutes(): number { return this._durationMinutes; }
    get patientName(): string { return this._patientName; }
    get patientId(): string { return this._patientId; }
    get contactNumber(): string | null { return this._contactNumber; }
    get providerName(): string { return this._providerName; }
    get roomId(): string { return this._roomId; }
    get reason(): string { return this._reason; }
    get status(): 'Scheduled' | 'Confirmed' | 'Canceled' | 'Completed' { return this._status; }
    get notes(): string { return this._notes; }

    // --- Setters ---
    set dateTime(value: Date) {
        // Validación: Solo permitir fechas válidas
        if (value && value instanceof Date && !isNaN(value.getTime())) {
            this._dateTime = value;
        } else {
            console.error('Fecha de cita inválida.');
        }
    }

    set hour(hour: number) { this._hour = hour; }

    set durationMinutes(value: number) {
        if (value > 0) {
            this._durationMinutes = value;
        } else {
            this._durationMinutes = 30;
        }
    }

    set patientName(value: string) {
        if (value && value.trim().length > 1) {
            this._patientName = value.trim();
        } else if (!value) {
            this._patientName = '';
        }
    }

    set patientId(value: string) { this._patientId = value; }
    set contactNumber(value: string | null) { this._contactNumber = value; }
    set providerName(value: string) { this._providerName = value.trim(); }
    set roomId(value: string) { this._roomId = value.trim(); }
    set reason(value: string) { this._reason = value.trim(); }
    set status(value: 'Scheduled' | 'Confirmed' | 'Canceled' | 'Completed') { this._status = value; }
    set notes(value: string) { this._notes = value; }



    static fromJSON(json: any): Appointment {

        const appointment = new Appointment(
            new Date(json._dateTime),
            json._durationMinutes,
            json._patientName,
            json._reason,
            json._patientId,
            json._contactNumber,
            json._providerName,
            json._roomId,
            json._status,
            json._notes,
            json._idUser
        );

        return appointment;
    }

    toJSON() {
        return {
            _dateTime: this._dateTime.toISOString(),
            _durationMinutes: this._durationMinutes,
            _patientName: this._patientName,
            _patientId: this._patientId,
            _contactNumber: this._contactNumber,
            _reason: this._reason,
            _status: this._status,
            _notes: this._notes,
            _providerName: this._providerName,
            _roomId: this._roomId,
            _idUser: this._idUser
        };
    }
}





export const APPOINTMENTS_: Array<Appointment> = [
    new Appointment(
        new Date(2025, 10, 16, 10, 0), // 16 de Nov, 10:00 AM
        45,
        'Tomas Alberto',
        'Limpieza dental',
        'SP-4567',
        '555-1001',
        'Dra. López',
        'Sala A',
        'Confirmed',
        'Paciente nuevo, historial limpio.',
        '4e2eae81-4997-4b9e-9079-73adb73c8d4f'
    ),

    new Appointment(
        new Date(2025, 11, 15, 15, 30), // 15 de Dic, 3:30 PM
        90,
        'Juan Mauricio',
        'Extracción de muela del juicio',
        'HM-1234',
        '555-2002',
        'Dr. Fernández',
        'Quirófano 1',
        'Scheduled',
        'Requiere anestesia general.',
        '8e5c58d0-ab28-4f67-b8e9-e7d56bbdd276'
    ),

    new Appointment(
        new Date(2025, 10, 19, 9, 30), // 25 de Nov, 11:30 AM
        170,
        'Juan Mauricio',
        'Revisión de rutina',
        'AB-9988',
        '555-3003',
        'Dra. Soto',
        'Unidad 2',
        'Completed',
        'Todo bien, citar en 6 meses.',
        '8e5c58d0-ab28-4f67-b8e9-e7d56bbdd276'
    ),

    new Appointment(
        new Date(2025, 11, 1, 11, 0), // 1 de Dic, 11:00 AM
        60,
        'Tomas Alberto',
        'Dolor de muela (Urgencia)',
        'RC-4455',
        '555-4004',
        'Dr. Pérez',
        'Sala B',
        'Canceled',
        'Paciente canceló 1 dia antes.',
        '4e2eae81-4997-4b9e-9079-73adb73c8d4f'
    ),

    new Appointment(
        new Date(2026, 0, 5, 14, 0), // 5 de Enero, 2:00 PM
        45,
        'Tomas Alberto',
        'Primer consulta',
        'VN-2026',
        '555-5005',
        'Dra. López',
        'Sala A',
        'Scheduled',
        'Verificar seguro dental.',
        '4e2eae81-4997-4b9e-9079-73adb73c8d4f'
    ),

    new Appointment(
        new Date(2025, 11, 13, 16, 0), // 13 de Dic, 4:00 PM
        30,
        'Tomas Alberto',
        'Chequeo rápido',
        '', // patientId vacío
        '555-6006',
        'Dr. Pérez',
        'Unidad 1',
        'Confirmed',
        '',
        '4e2eae81-4997-4b9e-9079-73adb73c8d4f'
    ),

    new Appointment(
        new Date(2025, 11, 16, 8, 30), // 16 de Dic, 8:30 AM
        120,
        "Tomas Alberto",
        'Instalación de implante',
        'LD-3322',
        '555-7007',
        'Dr. Fernández',
        'Quirófano 2',
        'Confirmed',
        'Requiere asistencia de enfermería.',
        "4e2eae81-4997-4b9e-9079-73adb73c8d4f"
    ),

    new Appointment(
        new Date(2025, 11, 15, 11, 30), // 14 de Dic, 11:30 AM (Sábado)
        30,
        "Tomas Alberto",
        'Seguimiento de cirugía',
        'CL-8765',
        '555-8008',
        'Dra. Soto',
        'Unidad 2',
        'Scheduled',
        '',
        "4e2eae81-4997-4b9e-9079-73adb73c8d4f"
    ),

    new Appointment(
        new Date(2025, 11, 12, 11, 30), // 12 de Dic, 11:30 AM
        45,
        'María Solís',
        'Limpieza de ortodoncia',
        'MS-9090',
        '555-9009',
        'Dra. López',
        'Sala C',
        'Scheduled',
        '',
        "8e5c58d0-ab28-4f67-b8e9-e7d56bbdd278"
    ),

    new Appointment(
        new Date(2025, 11, 19, 17, 0), // 19 de Dic, 5:00 PM
        60,
        'María Solís',
        'Tratamiento de conducto',
        'ER-1122',
        '555-1111',
        'Dr. Fernández',
        'Sala B',
        'Scheduled',
        'Llamar para confirmar.',
        "8e5c58d0-ab28-4f67-b8e9-e7d56bbdd278"
    ),
];