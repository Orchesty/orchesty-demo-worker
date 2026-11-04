export interface IOrderRequest {
    client: string;
    subject: string;
    hourlyRate: number;
    effortMd: number;
    description: string;
    currency?: string;
    email?: string;
}

export interface IAresHit {
    ico?: string;
    obchodniJmeno?: string;
    sidlo?: {
        textovaAdresa?: string;
    };
}

export interface ICustomer {
    source: 'ares';
    name: string;
    ico: string;
    address: string;
}

export interface IDriveFolder {
    id: string;
    name: string;
}

export interface IOrderWithAres extends IOrderRequest {
    ares: {
        ekonomickeSubjekty?: IAresHit[];
    };
}

export interface IOrderWithCustomer extends IOrderRequest {
    customer: ICustomer;
}

export interface IOrderWithFolders extends IOrderWithCustomer {
    folders: IDriveFolder[];
}

export interface IOrderWithFolder extends IOrderWithCustomer {
    folder: IDriveFolder;
}

export interface IOrderDraft extends IOrderWithFolder {
    documentName: string;
    replacements: Record<string, string>;
    unfilled: string[];
}

export interface ICopiedOrder extends IOrderDraft {
    documentId: string;
    documentUrl: string;
}

export interface IOrderResult {
    status: 'draft';
    documentUrl: string;
    documentName: string;
    clientName: string;
    ico: string;
    unfilled: string[];
}

export interface INarrativeFields {
    nazevObjednavky?: string;
    technickaSpecifikace?: string;
}
