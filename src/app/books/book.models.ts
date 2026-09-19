export interface BookSummary {
  id: string;
  workKey: string;
  title: string;
  authors: string[];
  firstPublishedYear: number | null;
  editionCount: number | null;
  languages: string[];
  coverId: number | null;
}

export interface WorkDetails {
  id: string;
  description: string | null;
  subjects: string[];
}

export type DetailState =
  | { status: 'idle' }
  | { status: 'loading'; workId: string }
  | { status: 'success'; work: WorkDetails }
  | { status: 'error'; workId: string };

export interface BookDetails extends BookSummary, WorkDetails {
  openLibraryUrl: string;
}

export interface BookSearchResult {
  total: number;
  books: BookSummary[];
}
