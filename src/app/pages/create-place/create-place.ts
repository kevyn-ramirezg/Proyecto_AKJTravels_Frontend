import { Component } from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-create-place',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-place.html',
  styleUrls: ['./create-place.css']
})
export class CreatePlace {
  cities: string[];
  createPlaceForm!: FormGroup;
  constructor(private formBuilder: FormBuilder) {
    this.createForm();
    this.cities=['Bogotá', 'Medellín', 'Cali', 'Armenia', 'Cartagena'];
  }
  private createForm() {



    this.createPlaceForm = this.formBuilder.group({
      title: ['', [Validators.required]],
      description: ['', [Validators.required]],
      city: ['', [Validators.required]],
      address: ['', [Validators.required]],
      location: ['', [Validators.required]], // Luego se puede mejorar con un mapa
      pricePerNight: ['', [Validators.required, Validators.pattern(/^[0-9]+$/),Validators.min(1)]],
      maxGuests: ['', [Validators.required, Validators.pattern(/^[0-9]+$/), Validators.min(1)]],
      images: [[], [Validators.required]]
    });
  }
  public createPlace() {
    console.log(this.createPlaceForm.value);
  }
  public onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const files = Array.from(input.files);
      this.createPlaceForm.patchValue({ images: files });
    }
  }
}
