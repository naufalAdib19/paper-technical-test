export interface OpenLibrarySearchResponse {
  numFound?: number;
  num_found?: number;
  docs?: OpenLibrarySearchDocument[];
}

export interface OpenLibrarySearchDocument {
  key?: string;
  title?: string;
  author_name?: string[];
  first_publish_year?: number;
  edition_count?: number;
  language?: string[];
  cover_i?: number;
}

export interface OpenLibraryWorkResponse {
  key?: string;
  description?: string | { value?: string };
  subjects?: string[];
}
