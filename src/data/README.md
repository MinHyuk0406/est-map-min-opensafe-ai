Place the source CSV and Shapefile data in this directory.

Run `npm run preprocess` after updating a source file. Browser-facing output is
generated in `public/data` with deployment-safe English filenames; runtime code
must not fetch files directly from `src/data`.
