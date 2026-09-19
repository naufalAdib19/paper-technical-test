import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OpenLibraryService } from '../../books/open-library.service';
import { BookDetailComponent } from './book-detail.component';

describe('BookDetailComponent', () => {
  let fixture: ComponentFixture<BookDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BookDetailComponent],
      providers: [
        {
          provide: OpenLibraryService,
          useValue: jasmine.createSpyObj<OpenLibraryService>('OpenLibraryService', ['getCoverUrl']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(BookDetailComponent);
    fixture.componentRef.setInput('summary', {
      id: 'OL893415W',
      workKey: '/works/OL893415W',
      title: 'Dune',
      authors: ['Frank Herbert'],
      firstPublishedYear: 1965,
      editionCount: 896,
      languages: ['eng'],
      coverId: null,
    });
  });

  it('retains summary metadata while work details are loading', () => {
    fixture.componentRef.setInput('state', { status: 'loading', workId: 'OL893415W' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Dune');
    expect(fixture.nativeElement.textContent).toContain('Loading details for Dune.');
  });

  it('renders missing-description copy and an accessible subject disclosure', () => {
    fixture.componentRef.setInput('state', {
      status: 'success',
      work: {
        id: 'OL893415W',
        description: null,
        subjects: Array.from({ length: 9 }, (_, index) => `Subject ${index + 1}`),
      },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No description is available for this work.');
    const button = fixture.nativeElement.querySelector('[aria-controls="book-subjects"]') as HTMLButtonElement;
    expect(button.textContent).toContain('Show all subjects');
    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
