export interface Customer {
  id?: Number;
  phoneNumber?: String;
  email?: String;
  linkedId?: Int;
  linkPrecedence: "primary" | "secondary";
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export interface Contact {
  primaryContactId: Number;
  email: String[];
  phoneNumbers: String[];
  secondaryContactIds: Number[]
}

export interface ApiRes {
  contact: Contact
}



