-- CreateTable
CREATE TABLE "Movie" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "original_title" TEXT,
    "slug" TEXT NOT NULL,
    "poster" TEXT,
    "backdrop" TEXT,
    "description" TEXT,
    "language" TEXT,
    "release_date" TIMESTAMP(3),
    "year" INTEGER,
    "runtime" INTEGER,
    "rating" DOUBLE PRECISION,
    "status" TEXT,
    "thumbnail" TEXT,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Movie_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Series" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "poster" TEXT,
    "description" TEXT,
    "rating" DOUBLE PRECISION,
    "year" INTEGER,
    "status" TEXT,
    "total_episodes" INTEGER,
    "last_updated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Episode" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "season_number" INTEGER NOT NULL,
    "thumbnail" TEXT,
    "release_date" TIMESTAMP(3),
    "seriesId" TEXT NOT NULL,

    CONSTRAINT "Episode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Genre" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Genre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Studio" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "Studio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_MovieDirectors" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_MovieWriters" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_MovieCast" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_MovieToStudio" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_MovieToTag" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_SeriesToStudio" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_GenreToMovie" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_GenreToSeries" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CountryToMovie" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "_CountryToSeries" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Movie_slug_key" ON "Movie"("slug");

-- CreateIndex
CREATE INDEX "Movie_slug_idx" ON "Movie"("slug");

-- CreateIndex
CREATE INDEX "Movie_year_idx" ON "Movie"("year");

-- CreateIndex
CREATE INDEX "Movie_rating_idx" ON "Movie"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "Series_slug_key" ON "Series"("slug");

-- CreateIndex
CREATE INDEX "Series_slug_idx" ON "Series"("slug");

-- CreateIndex
CREATE INDEX "Series_year_idx" ON "Series"("year");

-- CreateIndex
CREATE UNIQUE INDEX "Episode_slug_key" ON "Episode"("slug");

-- CreateIndex
CREATE INDEX "Episode_seriesId_idx" ON "Episode"("seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_name_key" ON "Genre"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Genre_slug_key" ON "Genre"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Country_name_key" ON "Country"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Country_slug_key" ON "Country"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Person_name_key" ON "Person"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Person_slug_key" ON "Person"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_name_key" ON "Studio"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Studio_slug_key" ON "Studio"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");

-- CreateIndex
CREATE UNIQUE INDEX "_MovieDirectors_AB_unique" ON "_MovieDirectors"("A", "B");

-- CreateIndex
CREATE INDEX "_MovieDirectors_B_index" ON "_MovieDirectors"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MovieWriters_AB_unique" ON "_MovieWriters"("A", "B");

-- CreateIndex
CREATE INDEX "_MovieWriters_B_index" ON "_MovieWriters"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MovieCast_AB_unique" ON "_MovieCast"("A", "B");

-- CreateIndex
CREATE INDEX "_MovieCast_B_index" ON "_MovieCast"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MovieToStudio_AB_unique" ON "_MovieToStudio"("A", "B");

-- CreateIndex
CREATE INDEX "_MovieToStudio_B_index" ON "_MovieToStudio"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_MovieToTag_AB_unique" ON "_MovieToTag"("A", "B");

-- CreateIndex
CREATE INDEX "_MovieToTag_B_index" ON "_MovieToTag"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_SeriesToStudio_AB_unique" ON "_SeriesToStudio"("A", "B");

-- CreateIndex
CREATE INDEX "_SeriesToStudio_B_index" ON "_SeriesToStudio"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_GenreToMovie_AB_unique" ON "_GenreToMovie"("A", "B");

-- CreateIndex
CREATE INDEX "_GenreToMovie_B_index" ON "_GenreToMovie"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_GenreToSeries_AB_unique" ON "_GenreToSeries"("A", "B");

-- CreateIndex
CREATE INDEX "_GenreToSeries_B_index" ON "_GenreToSeries"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CountryToMovie_AB_unique" ON "_CountryToMovie"("A", "B");

-- CreateIndex
CREATE INDEX "_CountryToMovie_B_index" ON "_CountryToMovie"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_CountryToSeries_AB_unique" ON "_CountryToSeries"("A", "B");

-- CreateIndex
CREATE INDEX "_CountryToSeries_B_index" ON "_CountryToSeries"("B");

-- AddForeignKey
ALTER TABLE "Episode" ADD CONSTRAINT "Episode_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "Series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieDirectors" ADD CONSTRAINT "_MovieDirectors_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieDirectors" ADD CONSTRAINT "_MovieDirectors_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieWriters" ADD CONSTRAINT "_MovieWriters_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieWriters" ADD CONSTRAINT "_MovieWriters_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieCast" ADD CONSTRAINT "_MovieCast_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieCast" ADD CONSTRAINT "_MovieCast_B_fkey" FOREIGN KEY ("B") REFERENCES "Person"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToStudio" ADD CONSTRAINT "_MovieToStudio_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToStudio" ADD CONSTRAINT "_MovieToStudio_B_fkey" FOREIGN KEY ("B") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToTag" ADD CONSTRAINT "_MovieToTag_A_fkey" FOREIGN KEY ("A") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MovieToTag" ADD CONSTRAINT "_MovieToTag_B_fkey" FOREIGN KEY ("B") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SeriesToStudio" ADD CONSTRAINT "_SeriesToStudio_A_fkey" FOREIGN KEY ("A") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SeriesToStudio" ADD CONSTRAINT "_SeriesToStudio_B_fkey" FOREIGN KEY ("B") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToMovie" ADD CONSTRAINT "_GenreToMovie_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToMovie" ADD CONSTRAINT "_GenreToMovie_B_fkey" FOREIGN KEY ("B") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToSeries" ADD CONSTRAINT "_GenreToSeries_A_fkey" FOREIGN KEY ("A") REFERENCES "Genre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_GenreToSeries" ADD CONSTRAINT "_GenreToSeries_B_fkey" FOREIGN KEY ("B") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToMovie" ADD CONSTRAINT "_CountryToMovie_A_fkey" FOREIGN KEY ("A") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToMovie" ADD CONSTRAINT "_CountryToMovie_B_fkey" FOREIGN KEY ("B") REFERENCES "Movie"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToSeries" ADD CONSTRAINT "_CountryToSeries_A_fkey" FOREIGN KEY ("A") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CountryToSeries" ADD CONSTRAINT "_CountryToSeries_B_fkey" FOREIGN KEY ("B") REFERENCES "Series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

