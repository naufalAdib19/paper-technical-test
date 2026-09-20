import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenLibraryService } from '../../books/open-library.service';
import { BookCoverComponent } from './book-cover.component';

describe('BookCoverComponent', () => {
  let fixture: ComponentFixture<BookCoverComponent>;
  let books: jasmine.SpyObj<OpenLibraryService>;

  beforeEach(async () => {
    books = jasmine.createSpyObj<OpenLibraryService>('OpenLibraryService', ['getCoverUrl']);

    await TestBed.configureTestingModule({
      imports: [BookCoverComponent],
      providers: [{ provide: OpenLibraryService, useValue: books }],
    }).compileComponents();

    fixture = TestBed.createComponent(BookCoverComponent);
    fixture.componentRef.setInput('size', 'M');
    fixture.componentRef.setInput('title', 'Dune');
  });

  it('renders a descriptive cover image from the service URL', () => {
    books.getCoverUrl.and.callFake(
      (coverId: number | null, size: 'S' | 'M' | 'L') =>
        coverId === null ? null : `https://covers.openlibrary.org/b/id/${coverId}-${size}.jpg?default=false`,
    );
    fixture.componentRef.setInput('coverId', 12345);
    fixture.componentRef.setInput('priority', true);
    fixture.detectChanges();

    const image = fixture.nativeElement.querySelector('img') as HTMLImageElement;
    expect(image.src).toContain('12345-M.jpg');
    expect(image.alt).toBe('Cover of Dune');
    expect(image.getAttribute('srcset')).toContain('12345-M.jpg?default=false 1x');
    expect(image.getAttribute('srcset')).toContain('12345-L.jpg?default=false 2x');
    expect(image.decoding).toBe('async');
  });

  it('does not request a high-density source set for lazy result covers', () => {
    books.getCoverUrl.and.returnValue('https://covers.openlibrary.org/b/id/12345-S.jpg?default=false');
    fixture.componentRef.setInput('coverId', 12345);
    fixture.componentRef.setInput('size', 'S');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img').getAttribute('srcset')).toBeNull();
  });

  it('renders a placeholder when a cover is unavailable or fails to load', () => {
    books.getCoverUrl.and.returnValue(null);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Cover unavailable');

    books.getCoverUrl.and.returnValue('https://covers.openlibrary.org/b/id/12345-M.jpg?default=false');
    fixture.componentRef.setInput('coverId', 12345);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('img') as HTMLImageElement).dispatchEvent(new Event('error'));
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('img')).toBeNull();
    expect(fixture.nativeElement.textContent).toContain('Cover unavailable');
  });
});
