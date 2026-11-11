import * as Contacts from 'expo-contacts/legacy';

export interface AppContact {
  id: string;
  name: string;
  phoneNumber?: string;
}

export class ContactService {
  static async requestPermissions(): Promise<boolean> {
    const { status } = await Contacts.requestPermissionsAsync();
    return status === 'granted';
  }

  static async getContacts(): Promise<AppContact[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      console.warn("Contact permission denied");
      return [];
    }

    const { data } = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
      sort: Contacts.SortTypes.FirstName,
    });

    if (data.length > 0) {
      return data
        .filter(contact => contact.name && contact.phoneNumbers && contact.phoneNumbers.length > 0)
        .map(contact => ({
          id: contact.id,
          name: contact.name,
          phoneNumber: contact.phoneNumbers?.[0]?.number
        }));
    }

    return [];
  }
}
