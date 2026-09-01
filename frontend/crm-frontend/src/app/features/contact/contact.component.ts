import { Component } from '@angular/core';

import { PublicFooterComponent } from '../../shared/components/public-footer/public-footer.component';
import { PublicHeaderComponent } from '../../shared/components/public-header/public-header.component';

@Component({
  selector: 'app-contact',
  imports: [PublicFooterComponent, PublicHeaderComponent],
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss']
})
export class ContactComponent {
  protected readonly contacts = [
    { label: 'Email', value: 'info@opasbizz.com', href: 'mailto:info@opasbizz.com' },
    { label: 'Phone', value: '(+012) 047-65577', href: 'tel:+01204765577' },
    { label: 'Mobile', value: '+91-9111001049', href: 'tel:+919111001049' }
  ];
}
