import { Component, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { DataService, VisitedLocation } from '../../services/data.service';

type FlowStep = 'map' | 'confirm' | 'feedback' | 'addRecord' | 'photo' | 'cost';

/**
 * Page component representing the main Map flow.
 * Manages checking into locations, submitting feedback, 
 * adding photos, and registering costs.
 * 
 * @author Antigravity
 */
@Component({
  selector: 'app-map',
  templateUrl: './map.page.html',
  styleUrls: ['./map.page.scss'],
})
export class MapPage implements OnInit {
  // Navigation flow state machine
  currentStep: FlowStep = 'map';
  
  // Current active location for interaction
  currentLocationName = 'Santuário de Santa Luzia';
  
  // Map markers and visited locations status
  visitedLocations: VisitedLocation[] = [];
  
  // Active states for map indicators
  gpsActive = true;
  sharingLocation = false;

  // Local state for modals/forms
  rating = 0;
  comment = '';
  capturedPhoto: string | null = null;
  costAmount = '';
  costCategory = 'Entradas/Cultura';

  // Available expense categories
  categories = [
    'Entradas/Cultura',
    'Alimentação',
    'Transporte',
    'Alojamento',
    'Compras',
    'Outro'
  ];

  constructor(
    private dataService: DataService,
    private toastController: ToastController
  ) {}

  async ngOnInit() {
    await this.loadLocations();
  }

  async ionViewWillEnter() {
    await this.loadLocations();
  }

  /**
   * Loads locations list from DataService.
   */
  async loadLocations() {
    this.visitedLocations = await this.dataService.getLocations();
  }

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

  // State transitions

  /**
   * Triggered by FAB click. Opens the confirmation dialog.
   */
  handleFABClick() {
    this.currentStep = 'confirm';
  }

  /**
   * Resets all modal values and returns to map view.
   */
  cancelFlow() {
    this.currentStep = 'map';
    this.rating = 0;
    this.comment = '';
    this.capturedPhoto = null;
    this.costAmount = '';
    this.costCategory = 'Entradas/Cultura';
  }

  /**
   * Confirms user's current location and advances to feedback.
   */
  confirmLocation() {
    this.currentStep = 'feedback';
  }

  /**
   * Submits feedback (rating + comment) to storage.
   */
  async submitFeedback() {
    if (this.rating > 0) {
      await this.dataService.updateLocationRecord(this.currentLocationName, {
        rating: this.rating,
        comment: this.comment
      });
      await this.loadLocations();
      this.currentStep = 'addRecord';
    }
  }

  /**
   * Closes the additional records sheet and completes the flow.
   */
  async finishRecord() {
    await this.showToast('Visita registada com sucesso!');
    this.cancelFlow();
    await this.loadLocations();
  }

  /**
   * Navigates to Photo Capture step.
   */
  goToPhoto() {
    this.currentStep = 'photo';
  }

  /**
   * Captures picture from file input interface.
   */
  handleFileSelect(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        this.capturedPhoto = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  /**
   * Saves mock photo and returns to adding records.
   */
  async savePhoto() {
    if (this.capturedPhoto) {
      await this.dataService.updateLocationRecord(this.currentLocationName, {
        photoUrl: this.capturedPhoto
      });
      await this.showToast('Foto guardada!');
      await this.loadLocations();
      this.currentStep = 'addRecord';
    }
  }

  /**
   * Navigates to Cost Entry step.
   */
  goToCost() {
    this.currentStep = 'cost';
  }

  /**
   * Registers a cost for the location and returns to adding records.
   */
  async saveCost() {
    const numericAmount = parseFloat(this.costAmount.replace(',', '.'));
    if (!isNaN(numericAmount) && numericAmount > 0) {
      // 1. Save cost inside the location record
      await this.dataService.updateLocationRecord(this.currentLocationName, {
        costAmount: numericAmount,
        costCategory: this.costCategory
      });

      // 2. Add expense record globally for finances
      await this.dataService.addExpense({
        category: this.costCategory,
        amount: numericAmount,
        location: this.currentLocationName
      });

      await this.showToast(`Custo de ${numericAmount.toFixed(2)}€ registado!`);
      await this.loadLocations();
      this.currentStep = 'addRecord';
    }
  }

  /**
   * Helper to parse floats in the HTML template safely.
   */
  parseFloat(val: string): number {
    if (!val) return 0;
    return parseFloat(val.replace(',', '.'));
  }
}
