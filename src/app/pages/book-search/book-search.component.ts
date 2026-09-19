import { Component, computed, DestroyRef, ElementRef, inject, signal } from '@angular/core';
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

import { BookSearchResult, DetailState } from '../../books/book.models';
import { isOpenLibraryWorkId, OpenLibraryService } from '../../books/open-library.service';
import { BookDetailComponent } from '../../components/book-detail/book-detail.component';
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
    BookDetailComponent,
  ],
  templateUrl: './book-search.component.html',
  styleUrl: './book-search.component.scss',
})
export class BookSearchComponent {
  readonly searchControl = new FormControl('', { nonNullable: true });
  readonly searchState = signal<SearchState>({ status: 'idle' });
  readonly selectedWorkId = signal<string | null>(null);
  readonly detailState = signal<DetailState>({ status: 'idle' });
  readonly selectedSummary = computed(() => {
    const state = this.searchState();
    const workId = this.selectedWorkId();

    return state.status === 'success' && workId !== null
      ? state.data.books.find((book) => book.id === workId) ?? null
      : null;
  });
  readonly resultCount = computed(() => {
    const state = this.searchState();
    return state.status === 'success' ? state.data.books.length : 0;
  });
  readonly selectedResultIndex = computed(() => {
    const state = this.searchState();
    const workId = this.selectedWorkId();
    if (state.status !== 'success' || workId === null) {
      return null;
    }

    const index = state.data.books.findIndex((book) => book.id === workId);
    return index === -1 ? null : index + 1;
  });
  readonly workUrl = computed(() => {
    const workId = this.selectedWorkId();
    return workId === null ? null : this.books.getWorkUrl(workId);
  });

  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly books = inject(OpenLibraryService);
  private readonly retryRequests = new Subject<void>();
  private readonly detailRetryRequests = new Subject<void>();
  private currentQuery = '';
  private focusDetailAfterSelection = false;
  private resultToFocus: string | null = null;

  constructor() {
    const routeParams = this.route.queryParamMap.pipe(
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    const routeQueries = routeParams.pipe(
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
    const routeBooks = routeParams.pipe(
      map((params) => params.get('book')),
      distinctUntilChanged(),
      map((workId) => (workId !== null && isOpenLibraryWorkId(workId) ? workId : null)),
      tap((workId) => {
        this.selectedWorkId.set(workId);
      }),
      shareReplay({ bufferSize: 1, refCount: true }),
    );

    routeQueries.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    routeParams
      .pipe(
        map((params) => params.get('book')),
        distinctUntilChanged(),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((workId) => {
        if (workId !== null && !isOpenLibraryWorkId(workId)) {
          void this.router.navigate([], {
            relativeTo: this.route,
            queryParams: { book: null },
            queryParamsHandling: 'merge',
            replaceUrl: true,
          });
        }
      });
    routeBooks.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();

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

    merge(routeBooks, this.detailRetryRequests.pipe(map(() => this.selectedWorkId())))
      .pipe(
        switchMap((workId) => {
          if (workId === null) {
            this.detailState.set({ status: 'idle' });
            return EMPTY;
          }

          this.detailState.set({ status: 'loading', workId });
          this.focusDetailIfNeeded();
          return this.books.getWorkDetails(workId).pipe(
            tap((work) => this.detailState.set({ status: 'success', work })),
            catchError(() => {
              this.detailState.set({ status: 'error', workId });
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

  retryDetail(): void {
    this.detailRetryRequests.next();
  }

  recordResultSelection(event: { workId: string; event: MouseEvent }): void {
    const isPrimaryNavigation = event.event.button === 0
      && !event.event.metaKey
      && !event.event.ctrlKey
      && !event.event.shiftKey
      && !event.event.altKey;

    this.focusDetailAfterSelection = isPrimaryNavigation;
    this.resultToFocus = event.workId;
  }

  closeDetail(): void {
    this.resultToFocus = this.selectedWorkId();
    void this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { book: null },
      queryParamsHandling: 'merge',
    }).then(() => this.restoreResultFocus());
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

  private focusDetailIfNeeded(): void {
    if (!this.focusDetailAfterSelection || !isMobileViewport()) {
      return;
    }

    this.focusDetailAfterSelection = false;
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('#book-detail-heading')?.focus());
  }

  private restoreResultFocus(): void {
    if (!isMobileViewport() || this.resultToFocus === null) {
      return;
    }

    const resultId = this.resultToFocus;
    this.resultToFocus = null;
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>(`#book-result-${resultId}`)?.focus());
  }
}

function normalizeQuery(query: string): string {
  return query.trim();
}

function isSearchable(query: string): boolean {
  return query.length >= 3;
}

function isMobileViewport(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}
