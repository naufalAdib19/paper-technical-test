import { Component, OnChanges, input, output, signal } from '@angular/core';

import { BookSummary, DetailState } from '../../books/book.models';
import { BookCoverComponent } from '../book-cover/book-cover.component';

@Component({
  selector: 'app-book-detail',
  imports: [BookCoverComponent],
  templateUrl: './book-detail.component.html',
  styleUrl: './book-detail.component.scss',
})
export class BookDetailComponent implements OnChanges {
  readonly summary = input<BookSummary | null>(null);
  readonly state = input.required<DetailState>();
  readonly workUrl = input<string | null>(null);
  readonly resultCount = input(0);
  readonly resultIndex = input<number | null>(null);
  readonly back = output<void>();
  readonly retry = output<void>();
  readonly allSubjectsVisible = signal(false);

  private previousWorkId: string | null = null;

  ngOnChanges(): void {
    const state = this.state();
    const workId = state.status === 'success'
      ? state.work.id
      : state.status === 'idle'
        ? null
        : state.workId;

    if (workId !== this.previousWorkId) {
      this.previousWorkId = workId;
      this.allSubjectsVisible.set(false);
    }
  }

  get visibleSubjects(): string[] {
    const state = this.state();
    if (state.status !== 'success') {
      return [];
    }

    return this.allSubjectsVisible()
      ? state.work.subjects
      : state.work.subjects.slice(0, 8);
  }

  formatIndex(index: number | null): string {
    return index === null ? '--' : index.toString().padStart(2, '0');
  }

  get workId(): string | null {
    const summary = this.summary();
    if (summary !== null) {
      return summary.id;
    }

    const state = this.state();
    return state.status === 'success'
      ? state.work.id
      : state.status === 'idle'
        ? null
        : state.workId;
  }
}
