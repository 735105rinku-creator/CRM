import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';

@Component({
  selector: 'app-home',
  imports: [PublicFooterComponent, PublicHeaderComponent, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent {
  heroBannerImage = 'assets/home/hero_banner.jpg';
  heroBannerAlt = 'Opas Bizz CRM and HRMS workspace';
}