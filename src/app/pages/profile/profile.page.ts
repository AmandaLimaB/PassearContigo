import { Component } from '@angular/core';
import { ToastController } from '@ionic/angular';

interface Contact {
  id: string;
  name: string;
  avatar: string;
}

/**
 * Page component representing the Profile and Settings tab.
 * Implements real-time location sharing simulation.
 * 
 * @author Antigravity
 */
@Component({
  selector: 'app-profile',
  templateUrl: './profile.page.html',
  styleUrls: ['./profile.page.scss'],
})
export class ProfilePage {
  // Share location simulation state
  showShareSheet = false;
  sharingActive = false;
  shareDetails: { contactsCount: number; duration: string } | null = null;

  // Selected options inside the share sheet
  selectedContacts: string[] = ['1', '2', '3'];
  duration = 'Até ao fim do dia';

  contacts: Contact[] = [
    { id: '1', name: 'Mãe', avatar: '👩' },
    { id: '2', name: 'Pai', avatar: '👨' },
    { id: '3', name: 'Irmã', avatar: '👧' },
    { id: '4', name: 'Tia Maria', avatar: '👵' },
  ];

  durations = [
    '1 hora',
    '3 horas',
    'Até ao fim do dia',
    'Sempre ativo'
  ];

  constructor(private toastController: ToastController) {}

  /**
   * Helper to display Ionic toast notifications.
   */
  async showToast(message: string, color: string = 'success') {
    const toast = await this.toastController.create({
      message,
      duration: 3000,
      position: 'bottom',
      color
    });
    await toast.present();
  }

  /**
   * Selects or deselects contacts inside the share locations bottom sheet.
   */
  toggleContact(contactId: string) {
    if (this.selectedContacts.includes(contactId)) {
      this.selectedContacts = this.selectedContacts.filter(id => id !== contactId);
    } else {
      this.selectedContacts.push(contactId);
    }
  }

  /**
   * Activates live location sharing with the selected contacts.
   */
  async confirmShare() {
    if (this.selectedContacts.length > 0) {
      this.sharingActive = true;
      this.shareDetails = {
        contactsCount: this.selectedContacts.length,
        duration: this.duration
      };
      this.showShareSheet = false;

      const contactsWord = this.selectedContacts.length > 1 ? 'pessoas' : 'pessoa';
      await this.showToast(`Partilha ativa com ${this.selectedContacts.length} ${contactsWord}`);
    }
  }

  /**
   * Disables live location sharing.
   */
  async stopSharing() {
    this.sharingActive = false;
    this.shareDetails = null;
    await this.showToast('Partilha de localização desativada', 'danger');
  }
}
