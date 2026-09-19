import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ActivatedRoute, ParamMap, Router, convertToParamMap } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';

import { BookSearchResult } from '../../books/book.models';
import { OpenLibraryService } from '../../books/open-library.service';
import { BookSearchComponent } from './book-search.component';

const SEARCH_RESULT: BookSearchResult = {
  total: 1,
  books: [
    {
      id: 'OL893415W',
      workKey: '/works/OL893415W',
      title: 'Dune',
      authors: ['Frank Herbert'],
      firstPublishedYear: 1965,
      editionCount: 896,
      languages: ['eng'],
      coverId: 12345,
    },
  ],
};

describe('BookSearchComponent', () => {
  let fixture: ComponentFixture<BookSearchComponent>;
  let component: BookSearchComponent;
  let routeParams: BehaviorSubject<ParamMap>;
  let router: jasmine.SpyObj<Router>;
  let books: jasmine.SpyObj<OpenLibraryService>;

  beforeEach(async () => {
    routeParams = new BehaviorSubject(convertToParamMap({}));
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    books = jasmine.createSpyObj<OpenLibraryService>('OpenLibraryService', ['searchBooks']);

    await TestBed.configureTestingModule({
      imports: [BookSearchComponent],
      providers: [
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: routeParams.asObservable() } as Pick<ActivatedRoute, 'queryParamMap'>,
        },
        { provide: Router, useValue: router },
        { provide: OpenLibraryService, useValue: books },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not navigate for a blank or one-character query', fakeAsync(() => {
    component.searchControl.setValue(' ');
    component.searchControl.setValue('d');
    tick(300);

    expect(router.navigate).not.toHaveBeenCalled();
    expect(books.searchBooks).not.toHaveBeenCalled();
  }));

  it('waits 300 ms before replacing the URL for a valid query', fakeAsync(() => {
    component.searchControl.setValue('dune');
    tick(299);

    expect(router.navigate).not.toHaveBeenCalled();

    tick(1);

    expect(router.navigate).toHaveBeenCalledWith([], {
      relativeTo: jasmine.anything(),
      queryParams: { q: 'dune', book: null },
      replaceUrl: true,
    });
  }));

  it('does not repeat an equivalent normalized query', fakeAsync(() => {
    component.searchControl.setValue(' dune ');
    tick(300);
    component.searchControl.setValue('dune');
    tick(300);

    expect(router.navigate).toHaveBeenCalledTimes(1);
  }));

  it('hydrates the input and results from the route query', () => {
    books.searchBooks.and.returnValue(of(SEARCH_RESULT));

    routeParams.next(convertToParamMap({ q: 'dune' }));
    fixture.detectChanges();

    expect(component.searchControl.value).toBe('dune');
    expect(books.searchBooks).toHaveBeenCalledWith('dune');
    expect(component.searchState()).toEqual({
      status: 'success',
      query: 'dune',
      data: SEARCH_RESULT,
    });
  });

  it('cancels a prior in-flight route query when a newer query arrives', () => {
    let wasCancelled = false;
    books.searchBooks.and.callFake(
      (query: string) =>
        new Observable<BookSearchResult>(() => {
          if (query === 'dune') {
            return () => {
              wasCancelled = true;
            };
          }

          return undefined;
        }),
    );

    routeParams.next(convertToParamMap({ q: 'dune' }));
    routeParams.next(convertToParamMap({ q: 'foundation' }));

    expect(wasCancelled).toBeTrue();
    expect(component.searchState()).toEqual({ status: 'loading', query: 'foundation' });
  });

  it('renders an empty state for a successful search with no books', () => {
    books.searchBooks.and.returnValue(of({ total: 0, books: [] }));

    routeParams.next(convertToParamMap({ q: 'zz' }));
    fixture.detectChanges();

    expect(component.searchState()).toEqual({ status: 'empty', query: 'zz' });
    expect(fixture.nativeElement.textContent).toContain('No books found for "zz"');
  });

  it('retries the active query after an error', () => {
    books.searchBooks.and.returnValues(throwError(() => new Error('Offline')), of(SEARCH_RESULT));

    routeParams.next(convertToParamMap({ q: 'dune' }));
    expect(component.searchState()).toEqual({ status: 'error', query: 'dune' });

    component.retrySearch();

    expect(books.searchBooks).toHaveBeenCalledTimes(2);
    expect(component.searchState()).toEqual({
      status: 'success',
      query: 'dune',
      data: SEARCH_RESULT,
    });
  });
});
