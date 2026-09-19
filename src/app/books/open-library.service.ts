import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { BookSearchResult, BookSummary, WorkDetails } from './book.models';
import {
  OpenLibrarySearchDocument,
  OpenLibrarySearchResponse,
  OpenLibraryWorkResponse,
} from './open-library-api.models';

const OPEN_LIBRARY_URL = 'https://openlibrary.org';
const COVERS_URL = 'https://covers.openlibrary.org';
const SEARCH_FIELDS = [
  'key',
  'title',
  'author_name',
  'first_publish_year',
  'edition_count',
  'language',
  'cover_i',
].join(',');
const WORK_ID_PATTERN = /^OL\d+W$/;

@Injectable({ providedIn: 'root' })
export class OpenLibraryService {
  private readonly http = inject(HttpClient);

  searchBooks(query: string): Observable<BookSearchResult> {
    const params = new HttpParams()
      .set('q', query.trim())
      .set('limit', '20')
      .set('fields', SEARCH_FIELDS);

    return this.http
      .get<OpenLibrarySearchResponse>(`${OPEN_LIBRARY_URL}/search.json`, { params })
      .pipe(map((response) => this.mapSearchResponse(response)));
  }

  getWorkDetails(workId: string): Observable<WorkDetails> {
    if (!isOpenLibraryWorkId(workId)) {
      throw new Error('Invalid Open Library work ID.');
    }

    return this.http
      .get<OpenLibraryWorkResponse>(`${OPEN_LIBRARY_URL}/works/${workId}.json`)
      .pipe(map((response) => this.mapWorkResponse(workId, response)));
  }

  getCoverUrl(coverId: number | null, size: 'S' | 'M'): string | null {
    if (coverId === null) {
      return null;
    }

    return `${COVERS_URL}/b/id/${coverId}-${size}.jpg?default=false`;
  }

  getWorkUrl(workId: string): string {
    if (!isOpenLibraryWorkId(workId)) {
      throw new Error('Invalid Open Library work ID.');
    }

    return `${OPEN_LIBRARY_URL}/works/${workId}`;
  }

  private mapSearchResponse(response: OpenLibrarySearchResponse): BookSearchResult {
    return {
      total: response.numFound ?? response.num_found ?? 0,
      books: (response.docs ?? [])
        .map((document) => this.mapSearchDocument(document))
        .filter((book): book is BookSummary => book !== null),
    };
  }

  private mapSearchDocument(document: OpenLibrarySearchDocument): BookSummary | null {
    const id = getWorkId(document.key);
    const title = document.title?.trim();

    if (id === null || title === undefined || title.length === 0) {
      return null;
    }

    return {
      id,
      workKey: `/works/${id}`,
      title,
      authors: document.author_name ?? [],
      firstPublishedYear: document.first_publish_year ?? null,
      editionCount: document.edition_count ?? null,
      languages: document.language ?? [],
      coverId: document.cover_i ?? null,
    };
  }

  private mapWorkResponse(workId: string, response: OpenLibraryWorkResponse): WorkDetails {
    return {
      id: getWorkId(response.key) ?? workId,
      description: getDescription(response.description),
      subjects: response.subjects ?? [],
    };
  }
}

export function isOpenLibraryWorkId(value: string): boolean {
  return WORK_ID_PATTERN.test(value);
}

function getWorkId(key: string | undefined): string | null {
  if (key === undefined) {
    return null;
  }

  const workId = key.replace('/works/', '');
  return isOpenLibraryWorkId(workId) ? workId : null;
}

function getDescription(description: OpenLibraryWorkResponse['description']): string | null {
  if (typeof description === 'string') {
    return description.trim() || null;
  }

  return description?.value?.trim() || null;
}
