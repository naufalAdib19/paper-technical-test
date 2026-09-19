import { Component, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-book-search-field',
  imports: [ReactiveFormsModule],
  templateUrl: './book-search-field.component.html',
  styleUrl: './book-search-field.component.scss',
})
export class BookSearchFieldComponent {
  readonly control = input.required<FormControl<string>>();
  readonly cleared = output<void>();

  get isBelowMinimum(): boolean {
    const queryLength = this.control().value.trim().length;
    return queryLength > 0 && queryLength < 2;
  }
}
