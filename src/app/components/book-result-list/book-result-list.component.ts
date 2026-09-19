import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';

import { BookSearchResult } from '../../books/book.models';

@Component({
  selector: 'app-book-result-list',
  imports: [RouterLink],
  templateUrl: './book-result-list.component.html',
  styleUrl: './book-result-list.component.scss',
})
export class BookResultListComponent {
  readonly result = input.required<BookSearchResult>();
  readonly query = input.required<string>();
  readonly selectedWorkId = input<string | null>(null);
  readonly selected = output<{ workId: string; event: MouseEvent }>();
}
