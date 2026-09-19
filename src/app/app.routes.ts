import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/book-search/book-search.component').then(
        (m) => m.BookSearchComponent,
      ),
  },
];
