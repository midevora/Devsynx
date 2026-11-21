# GitHub verification setup

1. Create a GitHub fine-grained personal access token owned by the GitHub account that can read the company repository.
2. Give it access to the target repository and set **Contents** to **Read-only**.
3. Copy `backend/.env.example` to `backend/.env` and set:

```env
GITHUB_ORG=your-company-org
GITHUB_REPO=your-repository
GITHUB_TOKEN=github_pat_your_token
PYTHON_EXECUTABLE=C:/Python314/python.exe
```

`GITHUB_REPO` may also be `owner/repository`. Restart the Node server after changing `.env`.

When assigning a task, enter the exact repository path in **GitHub file path**, for example `src/components/Feature.jsx`. Moving a task to `in_progress` or `completed` then checks that file through the GitHub Contents API. Once the company account is configured, a task without a file path cannot be verified and cannot be marked `completed`.