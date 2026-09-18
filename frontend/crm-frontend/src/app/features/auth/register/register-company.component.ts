import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ImageCropperService } from '../../../shared/services/image-cropper.service';

@Component({
  selector: 'app-register-company',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './register-company.component.html',
  styleUrl: './register-company.component.scss'
})
export class RegisterCompanyComponent {
  private readonly authService = inject(AuthService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly imageCropper = inject(ImageCropperService);

  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly logoPreview = signal('');
  protected readonly selectedPlanCode = signal('basic');

  /*
   * Password visibility
   */
  protected readonly showPassword = signal(false);
  protected readonly showConfirmPassword = signal(false);

  /*
   * International country calling codes.
   *
   * `id` is unique because multiple countries can share the same
   * international calling code.
   *
   * The actual form value remains the dial code (+91, +1, etc.),
   * so the existing backend payload does not change.
   */
  protected readonly countryCodes = [
    { id: 'AF', code: '+93', label: 'Afghanistan (+93)' },
    { id: 'AL', code: '+355', label: 'Albania (+355)' },
    { id: 'DZ', code: '+213', label: 'Algeria (+213)' },
    { id: 'AS', code: '+1684', label: 'American Samoa (+1684)' },
    { id: 'AD', code: '+376', label: 'Andorra (+376)' },
    { id: 'AO', code: '+244', label: 'Angola (+244)' },
    { id: 'AI', code: '+1264', label: 'Anguilla (+1264)' },
    { id: 'AG', code: '+1268', label: 'Antigua and Barbuda (+1268)' },
    { id: 'AR', code: '+54', label: 'Argentina (+54)' },
    { id: 'AM', code: '+374', label: 'Armenia (+374)' },
    { id: 'AW', code: '+297', label: 'Aruba (+297)' },
    { id: 'AU', code: '+61', label: 'Australia (+61)' },
    { id: 'AT', code: '+43', label: 'Austria (+43)' },
    { id: 'AZ', code: '+994', label: 'Azerbaijan (+994)' },

    { id: 'BS', code: '+1242', label: 'Bahamas (+1242)' },
    { id: 'BH', code: '+973', label: 'Bahrain (+973)' },
    { id: 'BD', code: '+880', label: 'Bangladesh (+880)' },
    { id: 'BB', code: '+1246', label: 'Barbados (+1246)' },
    { id: 'BY', code: '+375', label: 'Belarus (+375)' },
    { id: 'BE', code: '+32', label: 'Belgium (+32)' },
    { id: 'BZ', code: '+501', label: 'Belize (+501)' },
    { id: 'BJ', code: '+229', label: 'Benin (+229)' },
    { id: 'BM', code: '+1441', label: 'Bermuda (+1441)' },
    { id: 'BT', code: '+975', label: 'Bhutan (+975)' },
    { id: 'BO', code: '+591', label: 'Bolivia (+591)' },
    {
      id: 'BA',
      code: '+387',
      label: 'Bosnia and Herzegovina (+387)'
    },
    { id: 'BW', code: '+267', label: 'Botswana (+267)' },
    { id: 'BR', code: '+55', label: 'Brazil (+55)' },
    {
      id: 'IO',
      code: '+246',
      label: 'British Indian Ocean Territory (+246)'
    },
    { id: 'VG', code: '+1284', label: 'British Virgin Islands (+1284)' },
    { id: 'BN', code: '+673', label: 'Brunei (+673)' },
    { id: 'BG', code: '+359', label: 'Bulgaria (+359)' },
    { id: 'BF', code: '+226', label: 'Burkina Faso (+226)' },
    { id: 'BI', code: '+257', label: 'Burundi (+257)' },

    { id: 'KH', code: '+855', label: 'Cambodia (+855)' },
    { id: 'CM', code: '+237', label: 'Cameroon (+237)' },
    { id: 'CA', code: '+1', label: 'Canada (+1)' },
    { id: 'CV', code: '+238', label: 'Cape Verde (+238)' },
    { id: 'KY', code: '+1345', label: 'Cayman Islands (+1345)' },
    {
      id: 'CF',
      code: '+236',
      label: 'Central African Republic (+236)'
    },
    { id: 'TD', code: '+235', label: 'Chad (+235)' },
    { id: 'CL', code: '+56', label: 'Chile (+56)' },
    { id: 'CN', code: '+86', label: 'China (+86)' },
    { id: 'CX', code: '+61', label: 'Christmas Island (+61)' },
    {
      id: 'CC',
      code: '+61',
      label: 'Cocos (Keeling) Islands (+61)'
    },
    { id: 'CO', code: '+57', label: 'Colombia (+57)' },
    { id: 'KM', code: '+269', label: 'Comoros (+269)' },
    { id: 'CK', code: '+682', label: 'Cook Islands (+682)' },
    { id: 'CR', code: '+506', label: 'Costa Rica (+506)' },
    { id: 'HR', code: '+385', label: 'Croatia (+385)' },
    { id: 'CU', code: '+53', label: 'Cuba (+53)' },
    { id: 'CW', code: '+599', label: 'Curaçao (+599)' },
    { id: 'CY', code: '+357', label: 'Cyprus (+357)' },
    { id: 'CZ', code: '+420', label: 'Czech Republic (+420)' },

    {
      id: 'CD',
      code: '+243',
      label: 'Democratic Republic of the Congo (+243)'
    },
    { id: 'DK', code: '+45', label: 'Denmark (+45)' },
    { id: 'DJ', code: '+253', label: 'Djibouti (+253)' },
    { id: 'DM', code: '+1767', label: 'Dominica (+1767)' },
    {
      id: 'DO',
      code: '+1809',
      label: 'Dominican Republic (+1809)'
    },

    { id: 'TL', code: '+670', label: 'East Timor (+670)' },
    { id: 'EC', code: '+593', label: 'Ecuador (+593)' },
    { id: 'EG', code: '+20', label: 'Egypt (+20)' },
    { id: 'SV', code: '+503', label: 'El Salvador (+503)' },
    { id: 'GQ', code: '+240', label: 'Equatorial Guinea (+240)' },
    { id: 'ER', code: '+291', label: 'Eritrea (+291)' },
    { id: 'EE', code: '+372', label: 'Estonia (+372)' },
    { id: 'SZ', code: '+268', label: 'Eswatini (+268)' },
    { id: 'ET', code: '+251', label: 'Ethiopia (+251)' },

    { id: 'FK', code: '+500', label: 'Falkland Islands (+500)' },
    { id: 'FO', code: '+298', label: 'Faroe Islands (+298)' },
    { id: 'FJ', code: '+679', label: 'Fiji (+679)' },
    { id: 'FI', code: '+358', label: 'Finland (+358)' },
    { id: 'FR', code: '+33', label: 'France (+33)' },
    { id: 'GF', code: '+594', label: 'French Guiana (+594)' },
    { id: 'PF', code: '+689', label: 'French Polynesia (+689)' },

    { id: 'GA', code: '+241', label: 'Gabon (+241)' },
    { id: 'GM', code: '+220', label: 'Gambia (+220)' },
    { id: 'GE', code: '+995', label: 'Georgia (+995)' },
    { id: 'DE', code: '+49', label: 'Germany (+49)' },
    { id: 'GH', code: '+233', label: 'Ghana (+233)' },
    { id: 'GI', code: '+350', label: 'Gibraltar (+350)' },
    { id: 'GR', code: '+30', label: 'Greece (+30)' },
    { id: 'GL', code: '+299', label: 'Greenland (+299)' },
    { id: 'GD', code: '+1473', label: 'Grenada (+1473)' },
    { id: 'GP', code: '+590', label: 'Guadeloupe (+590)' },
    { id: 'GU', code: '+1671', label: 'Guam (+1671)' },
    { id: 'GT', code: '+502', label: 'Guatemala (+502)' },
    { id: 'GG', code: '+44', label: 'Guernsey (+44)' },
    { id: 'GN', code: '+224', label: 'Guinea (+224)' },
    { id: 'GW', code: '+245', label: 'Guinea-Bissau (+245)' },
    { id: 'GY', code: '+592', label: 'Guyana (+592)' },

    { id: 'HT', code: '+509', label: 'Haiti (+509)' },
    { id: 'HN', code: '+504', label: 'Honduras (+504)' },
    { id: 'HK', code: '+852', label: 'Hong Kong (+852)' },
    { id: 'HU', code: '+36', label: 'Hungary (+36)' },

    { id: 'IS', code: '+354', label: 'Iceland (+354)' },
    { id: 'IN', code: '+91', label: 'India (+91)' },
    { id: 'ID', code: '+62', label: 'Indonesia (+62)' },
    { id: 'IR', code: '+98', label: 'Iran (+98)' },
    { id: 'IQ', code: '+964', label: 'Iraq (+964)' },
    { id: 'IE', code: '+353', label: 'Ireland (+353)' },
    { id: 'IM', code: '+44', label: 'Isle of Man (+44)' },
    { id: 'IL', code: '+972', label: 'Israel (+972)' },
    { id: 'IT', code: '+39', label: 'Italy (+39)' },
    { id: 'CI', code: '+225', label: 'Ivory Coast (+225)' },

    { id: 'JM', code: '+1876', label: 'Jamaica (+1876)' },
    { id: 'JP', code: '+81', label: 'Japan (+81)' },
    { id: 'JE', code: '+44', label: 'Jersey (+44)' },
    { id: 'JO', code: '+962', label: 'Jordan (+962)' },

    { id: 'KZ', code: '+7', label: 'Kazakhstan (+7)' },
    { id: 'KE', code: '+254', label: 'Kenya (+254)' },
    { id: 'KI', code: '+686', label: 'Kiribati (+686)' },
    { id: 'XK', code: '+383', label: 'Kosovo (+383)' },
    { id: 'KW', code: '+965', label: 'Kuwait (+965)' },
    { id: 'KG', code: '+996', label: 'Kyrgyzstan (+996)' },

    { id: 'LA', code: '+856', label: 'Laos (+856)' },
    { id: 'LV', code: '+371', label: 'Latvia (+371)' },
    { id: 'LB', code: '+961', label: 'Lebanon (+961)' },
    { id: 'LS', code: '+266', label: 'Lesotho (+266)' },
    { id: 'LR', code: '+231', label: 'Liberia (+231)' },
    { id: 'LY', code: '+218', label: 'Libya (+218)' },
    { id: 'LI', code: '+423', label: 'Liechtenstein (+423)' },
    { id: 'LT', code: '+370', label: 'Lithuania (+370)' },
    { id: 'LU', code: '+352', label: 'Luxembourg (+352)' },

    { id: 'MO', code: '+853', label: 'Macau (+853)' },
    { id: 'MG', code: '+261', label: 'Madagascar (+261)' },
    { id: 'MW', code: '+265', label: 'Malawi (+265)' },
    { id: 'MY', code: '+60', label: 'Malaysia (+60)' },
    { id: 'MV', code: '+960', label: 'Maldives (+960)' },
    { id: 'ML', code: '+223', label: 'Mali (+223)' },
    { id: 'MT', code: '+356', label: 'Malta (+356)' },
    { id: 'MH', code: '+692', label: 'Marshall Islands (+692)' },
    { id: 'MQ', code: '+596', label: 'Martinique (+596)' },
    { id: 'MR', code: '+222', label: 'Mauritania (+222)' },
    { id: 'MU', code: '+230', label: 'Mauritius (+230)' },
    { id: 'YT', code: '+262', label: 'Mayotte (+262)' },
    { id: 'MX', code: '+52', label: 'Mexico (+52)' },
    { id: 'FM', code: '+691', label: 'Micronesia (+691)' },
    { id: 'MD', code: '+373', label: 'Moldova (+373)' },
    { id: 'MC', code: '+377', label: 'Monaco (+377)' },
    { id: 'MN', code: '+976', label: 'Mongolia (+976)' },
    { id: 'ME', code: '+382', label: 'Montenegro (+382)' },
    { id: 'MS', code: '+1664', label: 'Montserrat (+1664)' },
    { id: 'MA', code: '+212', label: 'Morocco (+212)' },
    { id: 'MZ', code: '+258', label: 'Mozambique (+258)' },
    { id: 'MM', code: '+95', label: 'Myanmar (+95)' },

    { id: 'NA', code: '+264', label: 'Namibia (+264)' },
    { id: 'NR', code: '+674', label: 'Nauru (+674)' },
    { id: 'NP', code: '+977', label: 'Nepal (+977)' },
    { id: 'NL', code: '+31', label: 'Netherlands (+31)' },
    { id: 'NC', code: '+687', label: 'New Caledonia (+687)' },
    { id: 'NZ', code: '+64', label: 'New Zealand (+64)' },
    { id: 'NI', code: '+505', label: 'Nicaragua (+505)' },
    { id: 'NE', code: '+227', label: 'Niger (+227)' },
    { id: 'NG', code: '+234', label: 'Nigeria (+234)' },
    { id: 'NU', code: '+683', label: 'Niue (+683)' },
    { id: 'NF', code: '+672', label: 'Norfolk Island (+672)' },
    { id: 'KP', code: '+850', label: 'North Korea (+850)' },
    {
      id: 'MK',
      code: '+389',
      label: 'North Macedonia (+389)'
    },
    {
      id: 'MP',
      code: '+1670',
      label: 'Northern Mariana Islands (+1670)'
    },
    { id: 'NO', code: '+47', label: 'Norway (+47)' },

    { id: 'OM', code: '+968', label: 'Oman (+968)' },

    { id: 'PK', code: '+92', label: 'Pakistan (+92)' },
    { id: 'PW', code: '+680', label: 'Palau (+680)' },
    { id: 'PS', code: '+970', label: 'Palestine (+970)' },
    { id: 'PA', code: '+507', label: 'Panama (+507)' },
    { id: 'PG', code: '+675', label: 'Papua New Guinea (+675)' },
    { id: 'PY', code: '+595', label: 'Paraguay (+595)' },
    { id: 'PE', code: '+51', label: 'Peru (+51)' },
    { id: 'PH', code: '+63', label: 'Philippines (+63)' },
    { id: 'PL', code: '+48', label: 'Poland (+48)' },
    { id: 'PT', code: '+351', label: 'Portugal (+351)' },
    { id: 'PR', code: '+1787', label: 'Puerto Rico (+1787)' },

    { id: 'QA', code: '+974', label: 'Qatar (+974)' },

    {
      id: 'CG',
      code: '+242',
      label: 'Republic of the Congo (+242)'
    },
    { id: 'RE', code: '+262', label: 'Réunion (+262)' },
    { id: 'RO', code: '+40', label: 'Romania (+40)' },
    { id: 'RU', code: '+7', label: 'Russia (+7)' },
    { id: 'RW', code: '+250', label: 'Rwanda (+250)' },

    { id: 'BL', code: '+590', label: 'Saint Barthélemy (+590)' },
    {
      id: 'SH',
      code: '+290',
      label: 'Saint Helena (+290)'
    },
    {
      id: 'KN',
      code: '+1869',
      label: 'Saint Kitts and Nevis (+1869)'
    },
    { id: 'LC', code: '+1758', label: 'Saint Lucia (+1758)' },
    {
      id: 'MF',
      code: '+590',
      label: 'Saint Martin (+590)'
    },
    {
      id: 'PM',
      code: '+508',
      label: 'Saint Pierre and Miquelon (+508)'
    },
    {
      id: 'VC',
      code: '+1784',
      label: 'Saint Vincent and the Grenadines (+1784)'
    },
    { id: 'WS', code: '+685', label: 'Samoa (+685)' },
    { id: 'SM', code: '+378', label: 'San Marino (+378)' },
    {
      id: 'ST',
      code: '+239',
      label: 'São Tomé and Príncipe (+239)'
    },
    { id: 'SA', code: '+966', label: 'Saudi Arabia (+966)' },
    { id: 'SN', code: '+221', label: 'Senegal (+221)' },
    { id: 'RS', code: '+381', label: 'Serbia (+381)' },
    { id: 'SC', code: '+248', label: 'Seychelles (+248)' },
    { id: 'SL', code: '+232', label: 'Sierra Leone (+232)' },
    { id: 'SG', code: '+65', label: 'Singapore (+65)' },
    { id: 'SX', code: '+1721', label: 'Sint Maarten (+1721)' },
    { id: 'SK', code: '+421', label: 'Slovakia (+421)' },
    { id: 'SI', code: '+386', label: 'Slovenia (+386)' },
    { id: 'SB', code: '+677', label: 'Solomon Islands (+677)' },
    { id: 'SO', code: '+252', label: 'Somalia (+252)' },
    { id: 'ZA', code: '+27', label: 'South Africa (+27)' },
    { id: 'KR', code: '+82', label: 'South Korea (+82)' },
    { id: 'SS', code: '+211', label: 'South Sudan (+211)' },
    { id: 'ES', code: '+34', label: 'Spain (+34)' },
    { id: 'LK', code: '+94', label: 'Sri Lanka (+94)' },
    { id: 'SD', code: '+249', label: 'Sudan (+249)' },
    { id: 'SR', code: '+597', label: 'Suriname (+597)' },
    { id: 'SE', code: '+46', label: 'Sweden (+46)' },
    { id: 'CH', code: '+41', label: 'Switzerland (+41)' },
    { id: 'SY', code: '+963', label: 'Syria (+963)' },

    { id: 'TW', code: '+886', label: 'Taiwan (+886)' },
    { id: 'TJ', code: '+992', label: 'Tajikistan (+992)' },
    { id: 'TZ', code: '+255', label: 'Tanzania (+255)' },
    { id: 'TH', code: '+66', label: 'Thailand (+66)' },
    { id: 'TG', code: '+228', label: 'Togo (+228)' },
    { id: 'TK', code: '+690', label: 'Tokelau (+690)' },
    { id: 'TO', code: '+676', label: 'Tonga (+676)' },
    {
      id: 'TT',
      code: '+1868',
      label: 'Trinidad and Tobago (+1868)'
    },
    { id: 'TN', code: '+216', label: 'Tunisia (+216)' },
    { id: 'TR', code: '+90', label: 'Turkey (+90)' },
    { id: 'TM', code: '+993', label: 'Turkmenistan (+993)' },
    {
      id: 'TC',
      code: '+1649',
      label: 'Turks and Caicos Islands (+1649)'
    },
    { id: 'TV', code: '+688', label: 'Tuvalu (+688)' },

    { id: 'UG', code: '+256', label: 'Uganda (+256)' },
    { id: 'UA', code: '+380', label: 'Ukraine (+380)' },
    {
      id: 'AE',
      code: '+971',
      label: 'United Arab Emirates (+971)'
    },
    {
      id: 'GB',
      code: '+44',
      label: 'United Kingdom (+44)'
    },
    {
      id: 'US',
      code: '+1',
      label: 'United States (+1)'
    },
    { id: 'UY', code: '+598', label: 'Uruguay (+598)' },
    {
      id: 'VI',
      code: '+1340',
      label: 'U.S. Virgin Islands (+1340)'
    },
    { id: 'UZ', code: '+998', label: 'Uzbekistan (+998)' },

    { id: 'VU', code: '+678', label: 'Vanuatu (+678)' },
    { id: 'VA', code: '+39', label: 'Vatican City (+39)' },
    { id: 'VE', code: '+58', label: 'Venezuela (+58)' },
    { id: 'VN', code: '+84', label: 'Vietnam (+84)' },

    {
      id: 'WF',
      code: '+681',
      label: 'Wallis and Futuna (+681)'
    },

    { id: 'YE', code: '+967', label: 'Yemen (+967)' },

    { id: 'ZM', code: '+260', label: 'Zambia (+260)' },
    { id: 'ZW', code: '+263', label: 'Zimbabwe (+263)' }
  ];

  private selectedLogoFile: File | undefined;

  protected readonly registerForm = this.formBuilder.nonNullable.group(
    {
      fullName: ['', [Validators.required, Validators.minLength(2)]],

      email: ['', [Validators.required, Validators.email]],

      adminCountryCode: ['+91', [Validators.required]],

      mobileNo: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{7,15}$/)
        ]
      ],

      password: [
        '',
        [
          Validators.required,
          Validators.pattern(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&^#()_\-+=]).{8,32}$/
          )
        ]
      ],

      confirmPassword: ['', [Validators.required]],

      companyName: [
        '',
        [
          Validators.required,
          Validators.minLength(2)
        ]
      ],

      companyCode: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[A-Z0-9_-]{3,20}$/)
        ]
      ],

      companyPan: [
        '',
        [
          Validators.pattern(/^[A-Z]{5}[0-9]{4}[A-Z]$/)
        ]
      ],

      companyGst: [
        '',
        [
          Validators.pattern(
            /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/
          )
        ]
      ],

      industry: ['', [Validators.required]],

      employeeCount: ['', [Validators.required]],

      companyEmail: [
        '',
        [
          Validators.required,
          Validators.email
        ]
      ],

      companyCountryCode: ['+91', [Validators.required]],

      companyPhone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{7,15}$/)
        ]
      ],

      country: ['India', [Validators.required]],

      registeredAddress: ['', [Validators.required]],

      website: [
        '',
        [
          Validators.pattern(
            /^(https?:\/\/)?([\w-]+\.)+[\w-]{2,}(\/.*)?$/
          )
        ]
      ],

      acceptTerms: [
        false,
        [
          Validators.requiredTrue
        ]
      ]
    },
    {
      validators: this.passwordsMatch
    }
  );

  constructor() {
    const plan =
      this.route.snapshot.queryParamMap.get('plan') || 'basic';

    this.selectedPlanCode.set(plan.toLowerCase());

    this.registerForm.controls.companyCode.disable();

    this.registerForm.controls.companyName.valueChanges.subscribe(
      (companyName) => {
        this.registerForm.controls.companyCode.setValue(
          this.generateCompanyCode(companyName),
          {
            emitEvent: false
          }
        );
      }
    );

    /*
     * Extra protection for values changed programmatically.
     * The HTML input handler will stop invalid characters while typing,
     * while these subscriptions keep the FormControls numeric-only.
     */
    this.registerForm.controls.mobileNo.valueChanges.subscribe((value) => {
      const sanitizedValue = this.onlyDigits(value);

      if (value !== sanitizedValue) {
        this.registerForm.controls.mobileNo.setValue(sanitizedValue, {
          emitEvent: false
        });
      }
    });

    this.registerForm.controls.companyPhone.valueChanges.subscribe(
      (value) => {
        const sanitizedValue = this.onlyDigits(value);

        if (value !== sanitizedValue) {
          this.registerForm.controls.companyPhone.setValue(
            sanitizedValue,
            {
              emitEvent: false
            }
          );
        }
      }
    );
  }

  /*
   * Show / hide password
   */
  protected togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  /*
   * Show / hide confirm password
   */
  protected toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword.update((visible) => !visible);
  }

  /*
   * Used by the phone inputs.
   *
   * It sanitizes typing, drag/drop, autofill and pasted values.
   */
  protected onPhoneInput(
    event: Event,
    controlName: 'mobileNo' | 'companyPhone'
  ): void {
    const input = event.target as HTMLInputElement;

    const sanitizedValue = this.onlyDigits(input.value).slice(0, 15);

    if (input.value !== sanitizedValue) {
      input.value = sanitizedValue;
    }

    const control = this.registerForm.controls[controlName];

    if (control.value !== sanitizedValue) {
      control.setValue(sanitizedValue, {
        emitEvent: false
      });

      control.markAsDirty();
    }
  }

  protected submit(): void {
    if (this.registerForm.invalid || this.isLoading()) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');
    this.successMessage.set('');

    const value = this.registerForm.getRawValue();

    const companyCode =
      value.companyCode ||
      this.generateCompanyCode(value.companyName);

    this.authService
      .registerCompany({
        companyName: value.companyName.trim(),

        companyCode,

        companyEmail: value.companyEmail
          .trim()
          .toLowerCase(),

        companyPhone: this.onlyDigits(value.companyPhone),

        companyCountryCode: value.companyCountryCode,

        country: value.country.trim(),

        adminName: value.fullName.trim(),

        adminEmail: value.email
          .trim()
          .toLowerCase(),

        adminMobile: this.onlyDigits(value.mobileNo),

        adminCountryCode: value.adminCountryCode,

        password: value.password,

        confirmPassword: value.confirmPassword,

        acceptTerms: value.acceptTerms,

        companyPan:
          value.companyPan.trim().toUpperCase() || undefined,

        companyGst:
          value.companyGst.trim().toUpperCase() || undefined,

        industry: value.industry.trim(),

        employeeCount: value.employeeCount,

        registeredAddress:
          value.registeredAddress.trim(),

        website: this.normalizeWebsite(value.website),

        logo: this.selectedLogoFile
      })
      .subscribe({
        next: (response) => {
          this.successMessage.set(
            response.message ||
              'Registration successful. Continue to checkout.'
          );

          this.isLoading.set(false);

          void this.router.navigate(['/checkout'], {
            queryParams: {
              plan: this.selectedPlanCode(),
              email: value.email.trim().toLowerCase(),
              registered: '1'
            }
          });
        },

        error: (error: {
          error?: {
            message?: string;
            errors?: Array<{
              message?: string;
            }>;
          };
        }) => {
          this.errorMessage.set(
            error.error?.message ||
              error.error?.errors?.[0]?.message ||
              'Unable to register company right now.'
          );

          this.isLoading.set(false);
        }
      });
  }

  private onlyDigits(value: string): string {
    return String(value || '').replace(/\D/g, '');
  }

  private normalizeWebsite(
    website: string
  ): string | undefined {
    const trimmedWebsite = website.trim();

    if (!trimmedWebsite) {
      return undefined;
    }

    return /^https?:\/\//i.test(trimmedWebsite)
      ? trimmedWebsite
      : `https://${trimmedWebsite}`;
  }

  private generateCompanyCode(
    companyName: string
  ): string {
    const normalizedName = companyName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '');

    if (!normalizedName) {
      return '';
    }

    const prefix = normalizedName
      .slice(0, 4)
      .padEnd(4, 'X');

    const checksum = Array.from(normalizedName).reduce(
      (total, char) =>
        total + char.charCodeAt(0),
      0
    );

    return `${prefix}${String(checksum)
      .slice(-4)
      .padStart(4, '0')}`;
  }

  protected async onLogoSelected(
    event: Event
  ): Promise<void> {
    const input = event.target as HTMLInputElement;

    const file = input.files?.[0];

    this.selectedLogoFile = undefined;
    this.logoPreview.set('');

    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.errorMessage.set(
        'Please select a valid image file for company logo.'
      );

      input.value = '';
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      this.errorMessage.set(
        'Company logo source must be 10 MB or smaller.'
      );

      input.value = '';
      return;
    }

    let croppedFile: File | null = null;

    try {
      croppedFile = await this.imageCropper.cropImage(
        file,
        {
          title: 'Crop company logo',
          outputSize: 512,
          mimeType:
            file.type === 'image/png'
              ? 'image/png'
              : undefined
        }
      );
    } catch {
      this.errorMessage.set(
        'Unable to crop selected company logo.'
      );

      input.value = '';
      return;
    }

    if (!croppedFile) {
      input.value = '';
      return;
    }

    if (croppedFile.size > 2 * 1024 * 1024) {
      this.errorMessage.set(
        'Cropped company logo must be 2 MB or smaller.'
      );

      input.value = '';
      return;
    }

    this.errorMessage.set('');

    this.selectedLogoFile = croppedFile;

    const reader = new FileReader();

    reader.onload = () =>
      this.logoPreview.set(
        String(reader.result || '')
      );

    reader.readAsDataURL(croppedFile);
  }

  private passwordsMatch(
    control: AbstractControl
  ): Record<string, boolean> | null {
    const password =
      control.get('password')?.value;

    const confirmPassword =
      control.get('confirmPassword')?.value;

    return password &&
      confirmPassword &&
      password !== confirmPassword
      ? {
          passwordMismatch: true
        }
      : null;
  }
}