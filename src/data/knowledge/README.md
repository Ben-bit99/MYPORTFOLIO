# Knowledge folder

Drop extra `.md` or `.txt` files here (devlogs, a fuller resume, answers to common recruiter questions, game design notes). Then run:

```bash
npm run rag:index
```

The AI assistant can answer only from `src/data/portfolio.ts` and the files in this folder.

Tips:
- Use `#` / `##` headings. Each heading becomes its own chunk, and the heading is shown as the citation badge.
- Write facts in plain sentences ("I used Cinemachine for camera rigs in Game Project 02.").
- Files whose names start with `README` are ignored.
