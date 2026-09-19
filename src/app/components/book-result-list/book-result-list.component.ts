import { Component, input } from '@angular/core';

import { BookSearchResult } from '../../books/book.models';

@Component({
  selector: 'app-book-result-list',
  imports: [],
  templateUrl: './book-result-list.component.html',
  styleUrl: './book-result-list.component.scss',
})
export class BookResultListComponent {
  readonly result = input.required<BookSearchResult>();
  readonly query = input.required<string>();
}
