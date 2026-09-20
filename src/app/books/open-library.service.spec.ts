import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { BookSearchResult } from './book.models';
import { OpenLibraryService, isOpenLibraryWorkId } from './open-library.service';

describe('OpenLibraryService', () => {
  let service: OpenLibraryService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });

    service = TestBed.inject(OpenLibraryService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('requests and maps the first 20 search results', () => {
    let resultTitle: string | undefined;
    let resultTotal: number | undefined;

    service.searchBooks('  dune  ').subscribe((result) => {
      resultTitle = result.books[0]?.title;
      resultTotal = result.total;
    });

    const request = httpTesting.expectOne((candidate) => candidate.url === 'https://openlibrary.org/search.json');
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('q')).toBe('dune');
    expect(request.request.params.get('limit')).toBe('20');
    expect(request.request.params.get('fields')).toBe(
      'key,title,author_name,first_publish_year,edition_count,language,cover_i',
    );

    request.flush({
      numFound: 4382,
      docs: [
        {
          key: '/works/OL893415W',
          title: 'Dune',
          author_name: ['Frank Herbert'],
          first_publish_year: 1965,
          edition_count: 896,
          language: ['eng'],
          cover_i: 12345,
        },
      ],
    });

    expect(resultTitle).toBe('Dune');
    expect(resultTotal).toBe(4382);
  });

  it('omits malformed documents and safely maps absent optional fields', () => {
    let result: BookSearchResult | undefined;

    service.searchBooks('test').subscribe((response) => {
      result = response;
    });

    const request = httpTesting.expectOne('https://openlibrary.org/search.json?q=test&limit=20&fields=key,title,author_name,first_publish_year,edition_count,language,cover_i');
    request.flush({
      num_found: 2,
      docs: [{ key: '/works/OL123W', title: 'Complete result' }, { key: '/books/OL1M', title: 'Edition' }],
    });

    expect(result).toEqual({
      total: 2,
      books: [
        {
          id: 'OL123W',
          workKey: '/works/OL123W',
          title: 'Complete result',
          authors: [],
          firstPublishedYear: null,
          editionCount: null,
          languages: [],
          coverId: null,
        },
      ],
    });
  });

  it('maps string and object work descriptions', () => {
    const descriptions: Array<string | null> = [];

    service.getWorkDetails('OL893415W').subscribe((work) => descriptions.push(work.description));
    httpTesting.expectOne('https://openlibrary.org/works/OL893415W.json').flush({
      key: '/works/OL893415W',
      description: ' A desert world ',
      subjects: ['Science fiction'],
    });

    service.getWorkDetails('OL45804W').subscribe((work) => descriptions.push(work.description));
    httpTesting.expectOne('https://openlibrary.org/works/OL45804W.json').flush({
      description: { value: ' A fox story ' },
    });

    expect(descriptions).toEqual(['A desert world', 'A fox story']);
  });

  it('rejects invalid work IDs without making a request', () => {
    expect(() => service.getWorkDetails('../unsafe')).toThrowError('Invalid Open Library work ID.');
  });

  it('builds cover URLs and validates work IDs', () => {
    expect(service.getCoverUrl(12345, 'S')).toBe('https://covers.openlibrary.org/b/id/12345-S.jpg?default=false');
    expect(service.getCoverUrl(12345, 'L')).toBe('https://covers.openlibrary.org/b/id/12345-L.jpg?default=false');
    expect(service.getCoverUrl(null, 'M')).toBeNull();
    expect(isOpenLibraryWorkId('OL893415W')).toBeTrue();
    expect(isOpenLibraryWorkId('/works/OL893415W')).toBeFalse();
    expect(isOpenLibraryWorkId('OL893415M')).toBeFalse();
  });
});
