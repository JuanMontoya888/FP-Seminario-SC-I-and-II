declare var crypto: Crypto;

export class User {

    public readonly _idUser: string;
    private _name: string;
    private _lastname: string;
    private _email: string | null;
    private _phone: string | null;
    private _password!: string;
    private _isAdmin: boolean;

    constructor(
        name: string,
        lastname: string,
        password: string,
        isAdmin: boolean = false,
        email: string | null = null,
        phone: string | null = null,
        idUser?: string
    ) {
        this._name = name;
        this._lastname = lastname;
        this._password = password;
        this._isAdmin = isAdmin;
        this._email = email;
        this._phone = phone;
        this._idUser = idUser ?? crypto.randomUUID();
    }

    // ---------- Getters ----------
    get idUser(): string { return this._idUser; }
    get name(): string { return this._name; }
    get lastname(): string { return this._lastname; }
    get email(): string | null { return this._email; }
    get phone(): string | null { return this._phone; }
    get isAdmin(): boolean { return this._isAdmin; }
    // OJO: Generalmente no queremos exponer el password en el front, pero lo dejo por tu estructura
    get password(): string { return this._password; } 

    // ---------- Setters ----------
    set name(newName: string) {
        if (newName && newName.length > 1) this._name = newName;
    }

    set lastname(newLastname: string) {
        if (newLastname && newLastname.length > 1) this._lastname = newLastname;
    }

    set email(newEmail: string | null) { this._email = newEmail; }
    set phone(newPhone: string | null) { this._phone = newPhone; }
    set isAdmin(newIsAdmin: boolean) { this._isAdmin = newIsAdmin; }

    set password(newPassword: string) {
        if (newPassword && newPassword.length >= 8) {
            this._password = newPassword;
        }
    }

    /**
     * Convierte un JSON (del backend o localStorage) en una instancia real de User.
     */
    static fromJSON(json: any): User {
        if (!json) throw new Error("Invalid JSON for User");

        // 1. DETECCIÓN DE ROL (La parte clave)
        // Si viene del Backend trae "role: 'admin'".
        // Si viene del LocalStorage (ya guardado) trae "_isAdmin: true".
        const isAdminBool = json.role === 'admin' || json._isAdmin === true;

        // 2. Mapeo de campos que pueden variar de nombre
        const nameVal = json.nombre || json._name || 'Usuario';
        const idVal = json.userId || json._idUser || json.id; // Soporta varios formatos de ID
        const emailVal = json.email || json._email;
        const phoneVal = json.numcel || json._phone;

        // 3. Campos que el Login NO devuelve (ponemos valores por defecto para que no falle)
        const lastnameVal = json.apellidos || json._lastname || ''; 
        const passVal = json.password || json._password || '******';

        return new User(
            nameVal,
            lastnameVal,
            passVal,
            isAdminBool, // <--- Aquí pasamos el valor calculado
            emailVal,
            phoneVal,
            idVal
        );
    }

    toJSON() {
        return {
            _name: this._name,
            _lastname: this._lastname,
            _email: this._email,
            _phone: this._phone,
            _password: this._password,
            _isAdmin: this._isAdmin, // Se guarda como booleano para el localStorage
            _idUser: this._idUser
        };
    }
}

// Datos dummy para pruebas si los necesitas
export const USERS_: Array<User> = [];