# Run codebase checks

Run all codebase checks to ensure code quality and consistency.

## Instructions

Run the following checks in order:

1. **Linting**: Run `pnpm lint` to check for linting errors across all packages
2. **Workspace linting**: Run `pnpm lint:ws` to check workspace dependencies with sherif
3. **Formatting**: Run `pnpm format` to check code formatting with Prettier
4. **Type checking**: Run `pnpm typecheck` to check TypeScript types across all packages

## Output

Report the results of each check:
- If all checks pass, provide a brief summary confirming everything is good
- If any check fails, summarize the errors found and which packages/files are affected
- Be concise but informative about what needs to be fixed

## Notes

- These checks match what runs in CI, so fixing issues here will prevent CI failures
- Use `lint:fix` and `format:fix` scripts if you want to auto-fix issues (but don't run them automatically unless explicitly asked)

