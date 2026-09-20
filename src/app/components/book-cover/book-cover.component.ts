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
  readonly detailSrcSet = computed(() => {
    if (!this.priority() || this.size() !== 'M') {
      return null;
    }

    const medium = this.books.getCoverUrl(this.coverId(), 'M');
    const large = this.books.getCoverUrl(this.coverId(), 'L');
    return medium !== null && large !== null ? `${medium} 1x, ${large} 2x` : null;
  });

  private readonly books = inject(OpenLibraryService);

  onImageError(): void {
    this.imageFailed.set(true);
  }
}
