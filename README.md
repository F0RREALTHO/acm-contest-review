# ACM Contest Review Portal

An internal and public platform for managing, reviewing, and tracking ACM coding contests. 

This portal provides internal tools for chairpersons and problem setters to review participant code, manage HackerRank syncs, and flag submissions for plagiarism or manual review. It also exposes a **Public API** and **Public Leaderboard** so participants can safely view the standings without accessing sensitive code or internal review notes.

## Public API

The portal exposes a REST API for developers who want to integrate the contest leaderboard into their own websites (e.g., the main ACM website). 

All public API routes are fully CORS-enabled (`Access-Control-Allow-Origin: *`).

### `GET /api/public/leaderboard`

Fetches the leaderboard for a specific contest, securely stripping out all internal notes and the identities of reviewers who flagged users.

**Query Parameters:**
- `contest` (Required): The slug of the contest (e.g., `acm-week-1`).
- `search` (Optional): A search term to filter participants by username.

**Example Request:**
```bash
curl "https://acm-contest-review.vercel.app/api/public/leaderboard?contest=acm-week-1"
```

**Example Response:**
```json
{
  "data": [
    {
      "hrRank": 1,
      "officialRank": 1,
      "username": "clean_hacker",
      "score": 1600,
      "timeTaken": 3600,
      "problemsSolved": 16,
      "avatar": "https://avatar.url",
      "country": "India",
      "isFlagged": false
    },
    {
      "hrRank": 2,
      "officialRank": 0,
      "username": "flagged_hacker",
      "score": 1500,
      "timeTaken": 4000,
      "problemsSolved": 15,
      "avatar": null,
      "country": "India",
      "isFlagged": true
    }
  ],
  "contestTotalProblems": 16
}
```

*Note: For participants where `isFlagged` is `true`, their `officialRank` is set to `0` indicating they are removed from the official standings, but they retain their original `hrRank` for reference.*

## Public Leaderboard UI

A built-in public read-only leaderboard is available at:
`https://acm-contest-review.vercel.app/public/leaderboard/[contest-slug]`

This page consumes the Public API and provides a clean UI where flagged users are highlighted, but no internal links or review actions are exposed.

## Development Setup

First, run the development server:

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the internal portal.
