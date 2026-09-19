import { Component, computed, inject, input, signal } from '@angular/core';

import { OpenLibraryService } from '../../books/open-library.service';

@Component({
  selector: 'app-book-cover',
  imports: [],
  templateUrl: './book-cover.component.html',
  styleUrl: './book-cover.component.scss',
})
export class BookCoverComponent {
  readonly coverId = input<number | null>(null);
  readonly size = input.required<'S' | 'M'>();
  readonly title = input.required<string>();
  readonly decorative = input(false);
  readonly priority = input(false);
  readonly imageFailed = signal(false);
  readonly imageSrc = computed(() => this.books.getCoverUrl(this.coverId(), this.size()));

  private readonly books = inject(OpenLibraryService);

  onImageError(): void {
    this.imageFailed.set(true);
  }
}
