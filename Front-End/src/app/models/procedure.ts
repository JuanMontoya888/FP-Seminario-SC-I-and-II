// Procedimiento / tratamiento realizado a un paciente
export interface Procedure {
    _id?: string;
    patient?: string;
    appointment?: string;
    fecha: string | Date;
    dentista: string;
    procedimientos: string[];
    descripcion: string;
    indicaciones?: string;
    costo?: number;
    createdAt?: string;
    updatedAt?: string;
}

// Paciente (opción para el selector del dentista)
export interface PacienteOption {
    _id: string;
    nombre: string;
    apellidos?: string;
    email: string;
}
