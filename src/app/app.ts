import { Component, signal } from '@angular/core';
import {RouterLink, RouterOutlet} from '@angular/router';
import { CommonModule } from '@angular/common';
import {Header} from './pages/header/header';
import {Footer} from './pages/footer/footer';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet,  Header, Footer],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})
export class App {
}
