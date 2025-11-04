# Run codebase checks and auto-fix

Run all codebase checks and automatically fix any issues that can be auto-fixed.

## Instructions

Run the following checks and fixes in order:

1. **Formatting**: Run `pnpm format:fix` to automatically fix code formatting issues with Prettier
2. **Linting**: Run `pnpm lint:fix` to automatically fix linting errors that can be auto-fixed
3. **Workspace linting**: Run `pnpm lint:ws` to check workspace dependencies with sherif (no auto-fix available)
4. **Type checking**: Run `pnpm typecheck` to check TypeScript types across all packages (no auto-fix available)

## Output

Report the results of each check:
- Summarize what was fixed automatically (formatting, linting)
- List any remaining issues that require manual fixes (usually type errors or workspace issues)
- Be concise but informative about what changed and what still needs attention

## Notes

- Formatting and linting issues will be automatically fixed in your files
- Type errors and workspace dependency issues cannot be auto-fixed and will need manual intervention
- Review the changes before committing to ensure they look correct

