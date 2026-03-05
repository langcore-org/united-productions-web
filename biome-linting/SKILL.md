# Biome Linting & Formatting

## Description
Ultra-fast TypeScript/React linting and formatting with Biome.

## When to use
- Setting up linting
- Formatting code
- Replacing ESLint/Prettier
- CI lint checks

## Best Practices

### Configuration
- Use biome.json for configuration
- Extend recommended rules
- Configure for your project needs
- Set up IDE integration

### Linting
- Fix auto-fixable issues
- Review manual fixes carefully
- Run in CI/CD pipeline
- Use lint-staged for pre-commit

### Migration
- Migrate from ESLint gradually
- Test thoroughly after migration
- Update CI/CD pipelines
- Train team on new workflow

## Commands
```bash
# Check lint and format
npx biome check .

# Fix issues
npx biome check --write .

# Format only
npx biome format --write .
```

## References
- https://biomejs.dev
