import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  catchError,
  distinctUntilChanged,
  EMPTY,
  map,
  merge,
  of,
  shareReplay,
  Subject,
  switchMap,
  tap,
  timer,
} from 'rxjs';

import { BookSearchResult } from '../../books/book.models';
import { OpenLibraryService } from '../../books/open-library.service';
import { BookResultListComponent } from '../../components/book-result-list/book-result-list.component';
import { BookSearchFieldComponent } from '../../components/book-search-field/book-search-field.component';

type SearchState =
  | { status: 'idle' }
  | { status: 'loading'; query: string }
  | { status: 'success'; query: string; data: BookSearchResult }
  | { status: 'empty'; query: string }
  | { status: 'error'; query: string };

@Component({
  selector: 'app-book-search',
  imports: [
    ReactiveFormsModule,
    BookSearchFieldComponent,
    BookResultListComponent,
  ],
  templateUrl: './book-search.component.html',
  styleUrl: './book-search.component.scss',
})
export class BookSearchComponent {
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchState = signal<SearchState>({ status: 'idle' });

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly books = inject(OpenLibraryService);
  private readonly retryRequests = new Subject<void>();
  private currentQuery = '';

  constructor() {
    const routeQueries = this.route.queryParamMap.pipe(
      map((params) => normalizeQuery(params.get('q') ?? '')),
      distinctUntilChanged(),
      tap((query) => {
        this.currentQuery = query;

        if (this.searchControl.value !== query) {
          this.searchControl.setValue(query, { emitEvent: false });
        }
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    routeQueries.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

    merge(routeQueries, this.retryRequests.pipe(map(() => this.currentQuery)))
      .pipe(
        switchMap((query) => {
          if (!isSearchable(query)) {
            this.searchState.set({ status: 'idle' });
            return EMPTY;
          }

          this.searchState.set({ status: 'loading', query });
          return this.books.searchBooks(query).pipe(
            tap((data) => {
              this.searchState.set(
                data.books.length > 0
                  ? { status: 'success', query, data }
                  : { status: 'empty', query },
              );
            }),
            catchError(() => {
              this.searchState.set({ status: 'error', query });
              return EMPTY;
            }),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe();

    this.searchControl.valueChanges
      .pipe(
        map(normalizeQuery),
        distinctUntilChanged(),
        switchMap((query) =>
          isSearchable(query) ? timer(300).pipe(map(() => query)) : of(query),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((query) => this.updateQuery(query));
  }

  clearSearch(): void {
    this.searchControl.setValue('');
  }

  retrySearch(): void {
    this.retryRequests.next();
  }

  private updateQuery(query: string): void {
    if (query === this.currentQuery) {
      return;
    }

    if (!isSearchable(query) && this.currentQuery.length === 0) {
      return;
    }

    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { q: query || null, book: null },
      replaceUrl: true,
    });
  }
}

function normalizeQuery(query: string): string {
  return query.trim();
}

function isSearchable(query: string): boolean {
  return query.length >= 3;
}
