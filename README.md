# Untitled app

Untitled app (from now on referred to as "app" or "the app") is a web app where users can read the Bible. The features are as follows:

- Read the Bible book by book
- Query the Bible for specific books, chapters, verses or matching text (fuzzy find)
    - Querying should be very fast, and the app itself should feel snappy and low latency
    - The user can query with many search terms simultaniously, and all the results will be listed
- The user can access and index of all the books in the Bible, and all the chapters in each book and verses in each chapter
- The Bible is downloaded and stored locally in the web browser's Indexed DB for quick access
    - This allows for the user to read and query the Bible without an internet connection (in case the connection is lost, or the user opens the cached page)
- When any slice (segment of the Bible) is selected (by querying or selection from the index) the URL of the page should change
    - The URL should maintain the state of the current selection
    - This way Bible verses can be shared easily
    - It should be possible to open a URL and have it open to the selection mentioned in the URL's query parameters

The app is supposed have a very modern and simplistic visual design. Simple colors (black, white, gray) can be used. Bible content should include verse numbers at the start of each verse and a line break when a new chapter or new book begins.

Initially there will only be one Bible translation: the New King James Version.

## App flow

1. User enters the web page at path /
2. The user is shown Genesis 1 (the entire chapter) with a text search input at the top of the page
3. Writing into the search input immediately (disregarding some debounce time) begins to look for matching Bible verses
4. Deleting characters from the search input likewise looks for matching Bible verses
5. If the search input is cleared entirely, the user is shown Genesis 1 again
6. The user can also open the index by clicking a button and be displayed a list of Bible books
7. Hovering over a book reveals the chapters in the book (chapter number and context/subtitle)
9. Hovering over a chapter reveals the verses the chapter (verse number and the first few words of the verse)
8. The user can navigate as follows:
    - If the user clicks the book name, the book contents is shown to them
    - If the user clicks on a chapter, the chapter contents is shown to them
    - If the user clicks on a verse, the verse contents is shown to them
